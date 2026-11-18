import { SENTENCES_BY_ID } from '../data/sentences';
import {
  DailyActivityLog,
  LearnerSettings,
  PersistedAppState,
  ReviewGrade,
  SentenceReviewRecord,
} from '../types/curriculum';

const STORAGE_KEY = 'bunsho_app_state_v1';

export const DEFAULT_SETTINGS: LearnerSettings = {
  furiganaMode: 'always_on',
  autoPlayAudio: false,
  audioSpeed: 1.0,
  preferredVoiceURI: '',
  theme: 'light',
  seasonalTheme: 'classic',
  dailyNewTarget: 10,
  dailyReviewCap: 50,
  weeklyDaysTarget: 5,
  autoExpandBreakdown: true,
  selectedLevel: 'A1.1',
  soundEffectsEnabled: true,
  emaWishText:
    '毎日少しずつ、日本語の文章を楽しく学びます！ (Step by step every day, I will master Japanese sentences!)',
};

export function createInitialAppState(): PersistedAppState {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    records: {},
    favorites: [],
    dailyLogs: {},
    completedDialogues: [],
  };
}

export function loadPersistedState(): PersistedAppState {
  if (typeof window === 'undefined') {
    return createInitialAppState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialAppState();
    }
    const parsed = JSON.parse(raw);
    const validated = validateAndNormalizeStateObject(parsed);
    return validated.valid && validated.state ? validated.state : createInitialAppState();
  } catch {
    return createInitialAppState();
  }
}

export function savePersistedState(state: PersistedAppState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save learning state to localStorage:', err);
  }
}

export function clearPersistedState(): PersistedAppState {
  const fresh = createInitialAppState();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // ignore
    }
  }
  return fresh;
}

const VALID_GRADES = new Set<ReviewGrade>(['again', 'hard', 'good', 'easy']);

export function validateAndNormalizeStateObject(input: unknown): {
  valid: boolean;
  state?: PersistedAppState;
  error?: string;
  importedRecordCount?: number;
  importedFavoriteCount?: number;
} {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, error: 'Backup file must be a valid JSON object.' };
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.version !== 'number' || obj.version < 1) {
    return { valid: false, error: 'Missing or unsupported backup version number.' };
  }

  if (!obj.records || typeof obj.records !== 'object' || Array.isArray(obj.records)) {
    return { valid: false, error: 'Backup is missing a valid "records" dictionary.' };
  }

  const normalizedSettings: LearnerSettings = { ...DEFAULT_SETTINGS };
  if (obj.settings && typeof obj.settings === 'object' && !Array.isArray(obj.settings)) {
    const s = obj.settings as Record<string, unknown>;
    if (
      s.furiganaMode === 'always_on' ||
      s.furiganaMode === 'always_off' ||
      s.furiganaMode === 'reveal_on_demand'
    ) {
      normalizedSettings.furiganaMode = s.furiganaMode;
    }
    if (typeof s.autoPlayAudio === 'boolean') {
      normalizedSettings.autoPlayAudio = s.autoPlayAudio;
    }
    if (typeof s.audioSpeed === 'number' && s.audioSpeed >= 0.5 && s.audioSpeed <= 1.5) {
      normalizedSettings.audioSpeed = s.audioSpeed;
    }
    if (typeof s.preferredVoiceURI === 'string') {
      normalizedSettings.preferredVoiceURI = s.preferredVoiceURI;
    }
    if (s.theme === 'light' || s.theme === 'dark') {
      normalizedSettings.theme = s.theme;
    }
    if (
      s.seasonalTheme === 'classic' ||
      s.seasonalTheme === 'sakura' ||
      s.seasonalTheme === 'momiji' ||
      s.seasonalTheme === 'yuki'
    ) {
      normalizedSettings.seasonalTheme = s.seasonalTheme;
    }
    if (typeof s.dailyNewTarget === 'number' && s.dailyNewTarget >= 1 && s.dailyNewTarget <= 100) {
      normalizedSettings.dailyNewTarget = Math.round(s.dailyNewTarget);
    }
    if (typeof s.dailyReviewCap === 'number' && s.dailyReviewCap >= 5 && s.dailyReviewCap <= 999) {
      normalizedSettings.dailyReviewCap = Math.round(s.dailyReviewCap);
    }
    if (typeof s.weeklyDaysTarget === 'number' && s.weeklyDaysTarget >= 1 && s.weeklyDaysTarget <= 7) {
      normalizedSettings.weeklyDaysTarget = Math.round(s.weeklyDaysTarget);
    }
    if (typeof s.autoExpandBreakdown === 'boolean') {
      normalizedSettings.autoExpandBreakdown = s.autoExpandBreakdown;
    }
    if (s.selectedLevel === 'A1.1' || s.selectedLevel === 'A1.2') {
      normalizedSettings.selectedLevel = s.selectedLevel;
    }
    if (typeof s.soundEffectsEnabled === 'boolean') {
      normalizedSettings.soundEffectsEnabled = s.soundEffectsEnabled;
    }
    if (typeof s.emaWishText === 'string' && s.emaWishText.trim().length > 0) {
      normalizedSettings.emaWishText = s.emaWishText.slice(0, 220);
    }
  }

  const normalizedRecords: Record<string, SentenceReviewRecord> = {};
  const rawRecords = obj.records as Record<string, unknown>;
  let importedRecordCount = 0;

  for (const [sentenceId, recVal] of Object.entries(rawRecords)) {
    if (!SENTENCES_BY_ID[sentenceId]) {
      continue;
    }
    if (!recVal || typeof recVal !== 'object' || Array.isArray(recVal)) {
      return { valid: false, error: `Invalid review record format for ${sentenceId}.` };
    }
    const r = recVal as Record<string, unknown>;
    if (
      typeof r.repetitions !== 'number' ||
      typeof r.intervalDays !== 'number' ||
      typeof r.easeFactor !== 'number' ||
      typeof r.dueDate !== 'string' ||
      typeof r.lastReviewedDate !== 'string' ||
      typeof r.firstStudiedDate !== 'string' ||
      typeof r.totalReviews !== 'number' ||
      typeof r.lapses !== 'number' ||
      typeof r.lastGrade !== 'string' ||
      !VALID_GRADES.has(r.lastGrade as ReviewGrade)
    ) {
      return { valid: false, error: `Corrupted fields in review record ${sentenceId}.` };
    }

    normalizedRecords[sentenceId] = {
      sentenceId,
      repetitions: Math.max(0, Math.floor(r.repetitions)),
      intervalDays: Math.max(0, Math.floor(r.intervalDays)),
      easeFactor: Math.max(1.3, Math.min(3.5, Number(r.easeFactor))),
      dueDate: r.dueDate,
      lastReviewedDate: r.lastReviewedDate,
      firstStudiedDate: r.firstStudiedDate,
      totalReviews: Math.max(1, Math.floor(r.totalReviews)),
      lapses: Math.max(0, Math.floor(r.lapses)),
      lastGrade: r.lastGrade as ReviewGrade,
      gradeHistory: Array.isArray(r.gradeHistory) ? (r.gradeHistory as SentenceReviewRecord['gradeHistory']) : [],
    };
    importedRecordCount++;
  }

  const normalizedFavorites: string[] = [];
  if (Array.isArray(obj.favorites)) {
    for (const favId of obj.favorites) {
      if (typeof favId === 'string' && SENTENCES_BY_ID[favId] && !normalizedFavorites.includes(favId)) {
        normalizedFavorites.push(favId);
      }
    }
  }

  const normalizedCompletedDialogues: string[] = [];
  if (Array.isArray(obj.completedDialogues)) {
    for (const unitId of obj.completedDialogues) {
      if (typeof unitId === 'string' && !normalizedCompletedDialogues.includes(unitId)) {
        normalizedCompletedDialogues.push(unitId);
      }
    }
  }

  const normalizedLogs: Record<string, DailyActivityLog> = {};
  if (obj.dailyLogs && typeof obj.dailyLogs === 'object' && !Array.isArray(obj.dailyLogs)) {
    for (const [dateKey, logVal] of Object.entries(obj.dailyLogs as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !logVal || typeof logVal !== 'object') {
        continue;
      }
      const l = logVal as Record<string, unknown>;
      const g = (l.grades && typeof l.grades === 'object' ? l.grades : {}) as Record<string, unknown>;
      normalizedLogs[dateKey] = {
        date: dateKey,
        newStudiedCount: typeof l.newStudiedCount === 'number' ? Math.max(0, l.newStudiedCount) : 0,
        reviewsCompletedCount:
          typeof l.reviewsCompletedCount === 'number' ? Math.max(0, l.reviewsCompletedCount) : 0,
        practiceCount: typeof l.practiceCount === 'number' ? Math.max(0, l.practiceCount) : 0,
        grades: {
          again: typeof g.again === 'number' ? Math.max(0, g.again) : 0,
          hard: typeof g.hard === 'number' ? Math.max(0, g.hard) : 0,
          good: typeof g.good === 'number' ? Math.max(0, g.good) : 0,
          easy: typeof g.easy === 'number' ? Math.max(0, g.easy) : 0,
        },
      };
    }
  }

  return {
    valid: true,
    state: {
      version: 1,
      settings: normalizedSettings,
      records: normalizedRecords,
      favorites: normalizedFavorites,
      dailyLogs: normalizedLogs,
      completedDialogues: normalizedCompletedDialogues,
      lastOmikujiDate:
        typeof obj.lastOmikujiDate === 'string' ? obj.lastOmikujiDate : undefined,
      lastOmikujiId:
        typeof obj.lastOmikujiId === 'string' ? obj.lastOmikujiId : undefined,
    },
    importedRecordCount,
    importedFavoriteCount: normalizedFavorites.length,
  };
}

export function validateAndParseBackupJson(rawText: string) {
  try {
    const parsed = JSON.parse(rawText);
    return validateAndNormalizeStateObject(parsed);
  } catch {
    return {
      valid: false,
      error: 'Invalid JSON syntax. Please select a valid Bunshō progress backup file.',
    };
  }
}

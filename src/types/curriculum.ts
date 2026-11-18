export type LevelId = 'A1.1' | 'A1.2';

export type DifficultyTier = 'foundational' | 'developing' | 'confident';

export type FuriganaMode = 'always_on' | 'always_off' | 'reveal_on_demand';

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

export type PracticeFormat = 'flashcard' | 'listening_first' | 'particle_cloze' | 'sentence_scramble';

export type CurriculumSubTab = 'units' | 'dialogues' | 'grammar' | 'kana_kanji';

export type CardLearningState =
  | 'unseen'
  | 'new_today'
  | 'learning'
  | 'due'
  | 'progressing'
  | 'difficult'
  | 'mastered';

export interface RubySegment {
  text: string;
  reading?: string;
}

export interface SentenceItem {
  id: string;
  level: LevelId;
  unitId: string;
  order: number;
  annotatedJapanese: string; // e.g., "{私|わたし}は{学生|がくせい}です。"
  japanese: string;          // e.g., "私は学生です。"
  readingKana: string;       // e.g., "わたしはがくせいです。"
  segments: RubySegment[];
  english: string;
  difficulty: DifficultyTier;
  grammarTags: string[];
  vocabTags: string[];
  topic: string;
}

export interface CurriculumUnit {
  id: string;
  level: LevelId;
  unitNumber: number;
  title: string;
  japaneseSubtitle: string;
  description: string;
  grammarFocus: string[];
  topic: string;
}

export interface SentenceReviewRecord {
  sentenceId: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string;           // YYYY-MM-DD local date
  lastReviewedDate: string;  // YYYY-MM-DD local date
  firstStudiedDate: string;  // YYYY-MM-DD local date
  totalReviews: number;
  lapses: number;
  lastGrade: ReviewGrade;
  gradeHistory: Array<{
    date: string;
    grade: ReviewGrade;
    intervalDays: number;
  }>;
}

export interface DailyActivityLog {
  date: string; // YYYY-MM-DD
  newStudiedCount: number;
  reviewsCompletedCount: number;
  practiceCount: number;
  grades: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
}

export type SeasonalTheme = 'classic' | 'sakura' | 'momiji' | 'yuki';

export interface LearnerSettings {
  furiganaMode: FuriganaMode;
  autoPlayAudio: boolean;
  audioSpeed: number; // 0.75, 0.9, 1.0, 1.15
  preferredVoiceURI: string; // '' for automatic best ja-JP voice
  theme: 'light' | 'dark';
  seasonalTheme: SeasonalTheme; // Japanese Four-Seasons (四季) atmosphere
  dailyNewTarget: number; // 5, 10, 20, 30, or custom (1-100)
  dailyReviewCap: number; // 20, 50, 100, or 999 (unlimited)
  weeklyDaysTarget: number; // 3, 5, or 7 days/week
  autoExpandBreakdown: boolean;
  selectedLevel: LevelId;
  soundEffectsEnabled: boolean; // Traditional Web Audio chimes (Furin, Suzuribako, Taiko)
  emaWishText: string; // Personal study vow on the wooden Ema plaque
}

export interface PersistedAppState {
  version: number;
  settings: LearnerSettings;
  records: Record<string, SentenceReviewRecord>;
  favorites: string[];
  dailyLogs: Record<string, DailyActivityLog>;
  completedDialogues?: string[];
  lastOmikujiDate?: string;
  lastOmikujiId?: string;
}

export type StudyModeType = 'learn_new' | 'daily_review' | 'free_practice';

export interface FreePracticeFilters {
  level: LevelId | 'ALL';
  unitId: string | 'ALL';
  difficulty: DifficultyTier | 'ALL';
  topic: string | 'ALL';
  favoritesOnly: boolean;
  studyStatus: 'ALL' | 'UNSEEN' | 'STUDIED' | 'DIFFICULT' | 'LEECH';
}

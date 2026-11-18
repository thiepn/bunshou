import {
  CardLearningState,
  PersistedAppState,
  ReviewGrade,
  SentenceItem,
  SentenceReviewRecord,
} from '../types/curriculum';

/**
 * Returns local calendar date in YYYY-MM-DD format without UTC timezone shift.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds a whole number of calendar days to a YYYY-MM-DD string safely in local time.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  dt.setDate(dt.getDate() + days);
  return getLocalDateString(dt);
}

/**
 * Calculates the next SM-2 based spaced repetition state for a sentence given a ReviewGrade.
 */
export function scheduleSentenceReview(
  existing: SentenceReviewRecord | undefined,
  sentenceId: string,
  grade: ReviewGrade,
  todayStr: string = getLocalDateString()
): SentenceReviewRecord {
  const prevReps = existing ? existing.repetitions : 0;
  const prevInterval = existing ? existing.intervalDays : 0;
  const prevEase = existing ? existing.easeFactor : 2.5;
  const prevLapses = existing ? existing.lapses : 0;
  const prevTotal = existing ? existing.totalReviews : 0;
  const firstStudied = existing ? existing.firstStudiedDate : todayStr;
  const history = existing ? [...existing.gradeHistory] : [];

  let repetitions = prevReps;
  let intervalDays = prevInterval;
  let easeFactor = prevEase;
  let lapses = prevLapses;

  if (grade === 'again') {
    repetitions = 0;
    intervalDays = 0; // Due again today
    easeFactor = Math.max(1.3, Number((prevEase - 0.2).toFixed(2)));
    if (existing) {
      lapses = prevLapses + 1;
    }
  } else if (grade === 'hard') {
    if (prevReps === 0) {
      repetitions = 1;
      intervalDays = 1;
    } else {
      repetitions = prevReps + 1;
      intervalDays = Math.max(1, Math.round(Math.max(1, prevInterval) * 1.2));
    }
    easeFactor = Math.max(1.3, Number((prevEase - 0.15).toFixed(2)));
  } else if (grade === 'good') {
    if (prevReps === 0) {
      repetitions = 1;
      intervalDays = 1;
    } else if (prevReps === 1) {
      repetitions = 2;
      intervalDays = 3;
    } else {
      repetitions = prevReps + 1;
      intervalDays = Math.max(prevInterval + 1, Math.round(prevInterval * prevEase));
    }
    easeFactor = Math.max(1.3, Number(prevEase.toFixed(2)));
  } else if (grade === 'easy') {
    if (prevReps === 0) {
      repetitions = 1;
      intervalDays = 4;
    } else if (prevReps === 1) {
      repetitions = 2;
      intervalDays = 7;
    } else {
      repetitions = prevReps + 1;
      intervalDays = Math.max(prevInterval + 2, Math.round(prevInterval * prevEase * 1.3));
    }
    easeFactor = Math.min(3.2, Number((prevEase + 0.15).toFixed(2)));
  }

  const dueDate = addDaysToDateString(todayStr, intervalDays);

  history.push({
    date: todayStr,
    grade,
    intervalDays,
  });

  return {
    sentenceId,
    repetitions,
    intervalDays,
    easeFactor,
    dueDate,
    lastReviewedDate: todayStr,
    firstStudiedDate: firstStudied,
    totalReviews: prevTotal + 1,
    lapses,
    lastGrade: grade,
    gradeHistory: history.slice(-30), // keep last 30 review events per sentence
  };
}

/**
 * Returns human-friendly interval labels for the 4 grading buttons.
 */
export function getGradeIntervalPreview(
  existing: SentenceReviewRecord | undefined,
  todayStr: string = getLocalDateString()
): Record<ReviewGrade, string> {
  const grades: ReviewGrade[] = ['again', 'hard', 'good', 'easy'];
  const result = {} as Record<ReviewGrade, string>;

  for (const g of grades) {
    const simulated = scheduleSentenceReview(existing, 'preview', g, todayStr);
    if (simulated.intervalDays === 0) {
      result[g] = 'Today';
    } else if (simulated.intervalDays === 1) {
      result[g] = '1 day';
    } else {
      result[g] = `${simulated.intervalDays} days`;
    }
  }

  return result;
}

/**
 * Checks if a card is a "Leech" (repeated lapses or persistently low ease).
 */
export function isLeechRecord(record: SentenceReviewRecord | undefined): boolean {
  if (!record) return false;
  if (record.lapses >= 2) return true;
  if (record.totalReviews >= 3 && record.easeFactor <= 1.75) return true;
  const recentAgainCount = record.gradeHistory.slice(-4).filter((h) => h.grade === 'again').length;
  return recentAgainCount >= 2;
}

/**
 * Distinguishes card learning states:
 * - 'unseen': Never studied
 * - 'due': Due for review on or before todayStr
 * - 'difficult': Repeated lapses (>= 2), low ease (< 1.65), or last graded 'again'
 * - 'new_today': Introduced today and scheduled for a future date
 * - 'mastered': Strong retention (repetitions >= 3 and interval >= 14 days)
 * - 'progressing': Developing retention (repetitions >= 2 and interval >= 3 days)
 * - 'learning': Early stage of learning
 */
export function classifyCardState(
  record: SentenceReviewRecord | undefined,
  todayStr: string = getLocalDateString()
): CardLearningState {
  if (!record) {
    return 'unseen';
  }
  if (record.dueDate <= todayStr) {
    return 'due';
  }
  if (record.lapses >= 2 || record.easeFactor < 1.65 || record.lastGrade === 'again') {
    return 'difficult';
  }
  if (record.repetitions >= 3 && record.intervalDays >= 14) {
    return 'mastered';
  }
  if (record.firstStudiedDate === todayStr && record.totalReviews === 1) {
    return 'new_today';
  }
  if (record.repetitions >= 2 && record.intervalDays >= 3) {
    return 'progressing';
  }
  return 'learning';
}

/**
 * Checks whether a sentence is currently due for spaced-repetition review.
 */
export function isSentenceDue(
  record: SentenceReviewRecord | undefined,
  todayStr: string = getLocalDateString()
): boolean {
  if (!record) return false;
  return record.dueDate <= todayStr;
}

/**
 * Builds the queue of new unseen sentences in curriculum progression order.
 */
export function getNewSentenceQueue(
  allSentences: SentenceItem[],
  records: Record<string, SentenceReviewRecord>,
  limit: number,
  preferredLevel?: 'A1.1' | 'A1.2',
  preferredUnitId?: string
): SentenceItem[] {
  const unseen = allSentences.filter((s) => !records[s.id]);

  let filtered = unseen;
  if (preferredUnitId) {
    filtered = unseen.filter((s) => s.unitId === preferredUnitId);
  } else if (preferredLevel) {
    filtered = unseen.filter((s) => s.level === preferredLevel);
    if (filtered.length === 0) {
      filtered = unseen;
    }
  }

  return filtered
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, Math.max(1, limit));
}

/**
 * Builds the queue of sentences currently due for spaced-repetition review,
 * prioritizing overdue & fragile items first and optionally applying a daily review cap.
 */
export function getDueReviewQueue(
  allSentences: SentenceItem[],
  records: Record<string, SentenceReviewRecord>,
  todayStr: string = getLocalDateString(),
  cap?: number
): SentenceItem[] {
  const sorted = allSentences
    .filter((s) => isSentenceDue(records[s.id], todayStr))
    .sort((a, b) => {
      const recA = records[a.id]!;
      const recB = records[b.id]!;
      if (recA.dueDate !== recB.dueDate) {
        return recA.dueDate.localeCompare(recB.dueDate);
      }
      if (recA.intervalDays !== recB.intervalDays) {
        return recA.intervalDays - recB.intervalDays;
      }
      return a.order - b.order;
    });

  if (typeof cap === 'number' && cap > 0 && cap < 999) {
    return sorted.slice(0, cap);
  }
  return sorted;
}

/**
 * Returns all sentences currently flagged as Leeches or Difficult for remedial clinics.
 */
export function getLeechAndDifficultSentences(
  allSentences: SentenceItem[],
  records: Record<string, SentenceReviewRecord>,
  todayStr: string = getLocalDateString()
): SentenceItem[] {
  return allSentences
    .filter((s) => {
      const r = records[s.id];
      if (!r) return false;
      return isLeechRecord(r) || classifyCardState(r, todayStr) === 'difficult';
    })
    .sort((a, b) => {
      const rA = records[a.id]!;
      const rB = records[b.id]!;
      if (rB.lapses !== rA.lapses) return rB.lapses - rA.lapses;
      return rA.easeFactor - rB.easeFactor;
    });
}

export interface ForecastDayItem {
  date: string;
  shortDate: string;
  dayOffset: number;
  dueCount: number;
  overdueIncluded: number;
}

/**
 * Builds a 30-day SRS review forecast starting from todayStr.
 */
export function getThirtyDayForecast(
  records: Record<string, SentenceReviewRecord>,
  todayStr: string = getLocalDateString()
): ForecastDayItem[] {
  const days: ForecastDayItem[] = [];
  const allRecs = Object.values(records);

  for (let offset = 0; offset < 30; offset++) {
    const targetDate = addDaysToDateString(todayStr, offset);
    let dueCount = 0;
    let overdueIncluded = 0;

    for (const rec of allRecs) {
      if (offset === 0) {
        if (rec.dueDate <= todayStr) {
          dueCount++;
          if (rec.dueDate < todayStr) {
            overdueIncluded++;
          }
        }
      } else if (rec.dueDate === targetDate) {
        dueCount++;
      }
    }

    days.push({
      date: targetDate,
      shortDate: targetDate.slice(5), // MM-DD
      dayOffset: offset,
      dueCount,
      overdueIncluded,
    });
  }

  return days;
}

/**
 * Calculates current consecutive study streak (in days) from dailyLogs.
 */
export function calculateStudyStreak(
  dailyLogs: PersistedAppState['dailyLogs'],
  todayStr: string = getLocalDateString()
): number {
  let streak = 0;
  let cursor = todayStr;

  const hasActivity = (dateKey: string) => {
    const log = dailyLogs[dateKey];
    if (!log) return false;
    return log.newStudiedCount + log.reviewsCompletedCount + log.practiceCount > 0;
  };

  if (!hasActivity(cursor)) {
    const yesterday = addDaysToDateString(todayStr, -1);
    if (!hasActivity(yesterday)) {
      return 0;
    }
    cursor = yesterday;
  }

  while (hasActivity(cursor)) {
    streak += 1;
    cursor = addDaysToDateString(cursor, -1);
  }

  return streak;
}

export interface WeeklyGoalDaySlot {
  date: string;
  shortLabel: string;
  active: boolean;
  totalActions: number;
}

export interface WeeklyGoalStats {
  activeDaysCount: number;
  weeklyDaysTarget: number;
  weeklyNewCount: number;
  weeklyReviewsCount: number;
  weeklyPracticeCount: number;
  days: WeeklyGoalDaySlot[];
  goalMet: boolean;
}

/**
 * Calculates rolling 7-day study consistency and volume metrics for the Weekly Goal Tracker.
 */
export function getWeeklyGoalStats(
  dailyLogs: PersistedAppState['dailyLogs'],
  weeklyDaysTarget: number = 5,
  todayStr: string = getLocalDateString()
): WeeklyGoalStats {
  const days: WeeklyGoalDaySlot[] = [];
  let activeDaysCount = 0;
  let weeklyNewCount = 0;
  let weeklyReviewsCount = 0;
  let weeklyPracticeCount = 0;

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const dateKey = addDaysToDateString(todayStr, -i);
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    const shortLabel = i === 0 ? 'Today' : weekdayLabels[dt.getDay()];

    const log = dailyLogs[dateKey];
    const newC = log ? log.newStudiedCount : 0;
    const revC = log ? log.reviewsCompletedCount : 0;
    const pracC = log ? log.practiceCount : 0;
    const totalActions = newC + revC + pracC;
    const active = totalActions > 0;

    if (active) activeDaysCount++;
    weeklyNewCount += newC;
    weeklyReviewsCount += revC;
    weeklyPracticeCount += pracC;

    days.push({
      date: dateKey,
      shortLabel,
      active,
      totalActions,
    });
  }

  const normalizedTarget = Math.max(1, Math.min(7, weeklyDaysTarget || 5));

  return {
    activeDaysCount,
    weeklyDaysTarget: normalizedTarget,
    weeklyNewCount,
    weeklyReviewsCount,
    weeklyPracticeCount,
    days,
    goalMet: activeDaysCount >= normalizedTarget,
  };
}

export interface MilestoneBadge {
  id: string;
  title: string;
  japaneseStamp: string;
  description: string;
  unlocked: boolean;
  progressText: string;
  category: 'streak' | 'curriculum' | 'dialogue' | 'mastery';
}

/**
 * Evaluates learner achievements and unit mastery seals (Hanko stamps) from real persisted state.
 */
export function getMilestoneBadges(
  appState: PersistedAppState,
  allSentences: SentenceItem[],
  todayStr: string = getLocalDateString()
): MilestoneBadge[] {
  const studiedIds = Object.keys(appState.records);
  const studiedCount = studiedIds.length;
  const streakDays = calculateStudyStreak(appState.dailyLogs, todayStr);
  const completedDialoguesCount = (appState.completedDialogues || []).length;

  const a11All = allSentences.filter((s) => s.level === 'A1.1');
  const a12All = allSentences.filter((s) => s.level === 'A1.2');
  const a11Studied = a11All.filter((s) => Boolean(appState.records[s.id])).length;
  const a12Studied = a12All.filter((s) => Boolean(appState.records[s.id])).length;

  const masteredCount = allSentences.filter(
    (s) => classifyCardState(appState.records[s.id], todayStr) === 'mastered'
  ).length;

  // Count how many full curriculum units have 100% studied sentences
  const unitBuckets = new Map<string, { total: number; studied: number }>();
  for (const s of allSentences) {
    const cur = unitBuckets.get(s.unitId) || { total: 0, studied: 0 };
    cur.total += 1;
    if (appState.records[s.id]) cur.studied += 1;
    unitBuckets.set(s.unitId, cur);
  }
  let completedUnitsCount = 0;
  for (const u of unitBuckets.values()) {
    if (u.total > 0 && u.studied >= u.total) {
      completedUnitsCount++;
    }
  }

  return [
    {
      id: 'first-step',
      title: 'First Sentence',
      japaneseStamp: '一歩',
      description: 'Study and grade your very first Japanese sentence.',
      unlocked: studiedCount >= 1,
      progressText: `${Math.min(1, studiedCount)} / 1 sentence`,
      category: 'curriculum',
    },
    {
      id: 'first-unit',
      title: 'Unit Pioneer',
      japaneseStamp: '単元',
      description: 'Complete 100% of the sentences in any curriculum unit.',
      unlocked: completedUnitsCount >= 1,
      progressText: `${completedUnitsCount} / 20 units completed`,
      category: 'curriculum',
    },
    {
      id: 'streak-3',
      title: '3-Day Consistency',
      japaneseStamp: '継続',
      description: 'Maintain a consecutive daily study streak of 3 days.',
      unlocked: streakDays >= 3,
      progressText: `${streakDays} / 3 day streak`,
      category: 'streak',
    },
    {
      id: 'streak-7',
      title: '7-Day Weekly Rhythm',
      japaneseStamp: '習慣',
      description: 'Maintain a full 7-day consecutive Japanese study streak.',
      unlocked: streakDays >= 7,
      progressText: `${streakDays} / 7 day streak`,
      category: 'streak',
    },
    {
      id: 'dialogue-reader-1',
      title: 'Conversation Starter',
      japaneseStamp: '対話',
      description: 'Read a Unit Mini-Dialogue and pass its comprehension check.',
      unlocked: completedDialoguesCount >= 1,
      progressText: `${completedDialoguesCount} / 1 dialogue`,
      category: 'dialogue',
    },
    {
      id: 'dialogue-reader-10',
      title: 'Story Explorer',
      japaneseStamp: '物語',
      description: 'Complete 10 Unit Mini-Dialogue comprehension stories.',
      unlocked: completedDialoguesCount >= 10,
      progressText: `${completedDialoguesCount} / 10 dialogues`,
      category: 'dialogue',
    },
    {
      id: 'dialogue-reader-20',
      title: 'All 20 Stories Mastered',
      japaneseStamp: '完読',
      description: 'Complete all 20 A1.1 and A1.2 situational mini-dialogues.',
      unlocked: completedDialoguesCount >= 20,
      progressText: `${completedDialoguesCount} / 20 dialogues`,
      category: 'dialogue',
    },
    {
      id: 'sentences-50',
      title: '50 Sentences Studied',
      japaneseStamp: '五十',
      description: 'Study 50 unique Japanese sentences in the corpus.',
      unlocked: studiedCount >= 50,
      progressText: `${Math.min(50, studiedCount)} / 50 sentences`,
      category: 'curriculum',
    },
    {
      id: 'sentences-150',
      title: '150 Sentences Studied',
      japaneseStamp: '百五',
      description: 'Study 150 unique Japanese sentences across A1.',
      unlocked: studiedCount >= 150,
      progressText: `${Math.min(150, studiedCount)} / 150 sentences`,
      category: 'curriculum',
    },
    {
      id: 'a11-complete',
      title: 'A1.1 Foundation Seal',
      japaneseStamp: '基礎',
      description: 'Study all 310 sentences across the 10 A1.1 units.',
      unlocked: a11All.length > 0 && a11Studied >= a11All.length,
      progressText: `${a11Studied} / ${a11All.length} A1.1`,
      category: 'curriculum',
    },
    {
      id: 'a12-complete',
      title: 'A1.2 Immersion Seal',
      japaneseStamp: '発展',
      description: 'Study all 310 sentences across the 10 A1.2 units.',
      unlocked: a12All.length > 0 && a12Studied >= a12All.length,
      progressText: `${a12Studied} / ${a12All.length} A1.2`,
      category: 'curriculum',
    },
    {
      id: 'mastered-25',
      title: 'Long-Term Retention',
      japaneseStamp: '熟達',
      description: 'Reach Mastered status (14+ day interval) on 25 sentences.',
      unlocked: masteredCount >= 25,
      progressText: `${Math.min(25, masteredCount)} / 25 mastered`,
      category: 'mastery',
    },
  ];
}


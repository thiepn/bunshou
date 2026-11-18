import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_SENTENCES, validateSentenceCorpus } from './sentences';
import { CURRICULUM_UNITS } from './units';
import {
  addDaysToDateString,
  calculateStudyStreak,
  classifyCardState,
  getDueReviewQueue,
  getLeechAndDifficultSentences,
  getNewSentenceQueue,
  getThirtyDayForecast,
  isLeechRecord,
  scheduleSentenceReview,
} from '../utils/srs';
import { parseAnnotatedJapanese, validateFuriganaSegments } from '../utils/furigana';
import {
  analyzeSentenceBreakdown,
  generateParticleCloze,
  generateScrambleTiles,
  inspectTokenOrCharacter,
} from '../utils/linguistics';
import { createInitialAppState, validateAndParseBackupJson } from '../utils/storage';

test('Sentence corpus meets minimum 600 total, 300 A1.1, 300 A1.2, unique IDs, unique Japanese, and valid furigana', () => {
  const report = validateSentenceCorpus();
  if (!report.valid) {
    console.error('Corpus validation errors:', report.errors);
  }
  assert.equal(report.valid, true, `Corpus validation failed: ${report.errors.join('; ')}`);
  assert.equal(report.totalCount >= 600, true, `Expected >= 600 sentences, got ${report.totalCount}`);
  assert.equal(report.a11Count >= 300, true, `Expected >= 300 A1.1 sentences, got ${report.a11Count}`);
  assert.equal(report.a12Count >= 300, true, `Expected >= 300 A1.2 sentences, got ${report.a12Count}`);
  assert.equal(CURRICULUM_UNITS.length, 20);
  for (const unit of CURRICULUM_UNITS) {
    assert.equal(
      (report.unitCounts[unit.id] ?? 0) >= 25,
      true,
      `Unit ${unit.id} should have at least 25 sentences`
    );
  }
});

test('Furigana parser accurately separates kanji ruby segments from hiragana okurigana', () => {
  const parsed = parseAnnotatedJapanese('{日本語|にほんご}を{勉強|べんきょう}します。');
  assert.equal(parsed.japanese, '日本語を勉強します。');
  assert.equal(parsed.readingKana, 'にほんごをべんきょうします。');
  assert.equal(parsed.segments.length, 4);
  assert.deepEqual(parsed.segments[0], { text: '日本語', reading: 'にほんご' });
  assert.deepEqual(parsed.segments[1], { text: 'を' });
  assert.deepEqual(parsed.segments[2], { text: '勉強', reading: 'べんきょう' });
  assert.deepEqual(parsed.segments[3], { text: 'します。' });

  const validation = validateFuriganaSegments(parsed.segments);
  assert.equal(validation.valid, true);
});

test('SRS scheduler produces distinct intervals for Again, Hard, Good, and Easy grades', () => {
  const today = '2026-11-16';
  const rAgain = scheduleSentenceReview(undefined, 'a11-u01-01', 'again', today);
  const rHard = scheduleSentenceReview(undefined, 'a11-u01-01', 'hard', today);
  const rGood = scheduleSentenceReview(undefined, 'a11-u01-01', 'good', today);
  const rEasy = scheduleSentenceReview(undefined, 'a11-u01-01', 'easy', today);

  assert.equal(rAgain.intervalDays, 0);
  assert.equal(rAgain.dueDate, '2026-11-16');
  assert.equal(rHard.intervalDays, 1);
  assert.equal(rGood.intervalDays, 1);
  assert.equal(rEasy.intervalDays, 4);
  assert.equal(rEasy.dueDate, '2026-11-20');

  // Second review after Good
  const nextDay = addDaysToDateString(today, 1);
  const rGood2 = scheduleSentenceReview(rGood, 'a11-u01-01', 'good', nextDay);
  assert.equal(rGood2.repetitions, 2);
  assert.equal(rGood2.intervalDays, 3);
  assert.equal(classifyCardState(rGood2, nextDay), 'progressing');
});

test('New sentence queue and due review queue respect curriculum order, due dates, and dailyReviewCap', () => {
  const today = '2026-11-16';
  const firstRecord = scheduleSentenceReview(undefined, ALL_SENTENCES[0].id, 'good', today);
  const dueRecord1 = scheduleSentenceReview(undefined, ALL_SENTENCES[1].id, 'again', today);
  const dueRecord2 = scheduleSentenceReview(undefined, ALL_SENTENCES[2].id, 'again', today);

  const records = {
    [ALL_SENTENCES[0].id]: firstRecord,
    [ALL_SENTENCES[1].id]: dueRecord1,
    [ALL_SENTENCES[2].id]: dueRecord2,
  };

  const newQueue = getNewSentenceQueue(ALL_SENTENCES, records, 5, 'A1.1');
  assert.equal(newQueue.length, 5);
  assert.equal(newQueue[0].id, ALL_SENTENCES[3].id);

  const dueQueueUncapped = getDueReviewQueue(ALL_SENTENCES, records, today);
  assert.equal(dueQueueUncapped.length, 2);

  const dueQueueCapped = getDueReviewQueue(ALL_SENTENCES, records, today, 1);
  assert.equal(dueQueueCapped.length, 1);
  assert.equal(dueQueueCapped[0].id, ALL_SENTENCES[1].id);
});

test('30-day SRS forecast and Leech detection accurately classify due workload and repeated lapses', () => {
  const today = '2026-11-16';
  let rec = scheduleSentenceReview(undefined, 'a11-u01-01', 'good', today); // due in 1 day (2026-11-17)
  let leechRec = scheduleSentenceReview(undefined, 'a11-u01-02', 'good', today);
  leechRec = scheduleSentenceReview(leechRec, 'a11-u01-02', 'again', today);
  leechRec = scheduleSentenceReview(leechRec, 'a11-u01-02', 'again', today);

  assert.equal(isLeechRecord(leechRec), true);

  const records = {
    'a11-u01-01': rec,
    'a11-u01-02': leechRec,
  };

  const forecast = getThirtyDayForecast(records, today);
  assert.equal(forecast.length, 30);
  assert.equal(forecast[0].dueCount, 1); // leechRec is due today
  assert.equal(forecast[1].dueCount, 1); // rec is due tomorrow

  const leeches = getLeechAndDifficultSentences(ALL_SENTENCES, records, today);
  assert.equal(leeches.length, 1);
  assert.equal(leeches[0].id, 'a11-u01-02');
});

test('Linguistic breakdown, particle cloze, scramble tiles, and character inspector work across corpus', () => {
  const sample = ALL_SENTENCES.find((s) => s.japanese.includes('学生')) || ALL_SENTENCES[0];
  const breakdown = analyzeSentenceBreakdown(sample);
  assert.equal(breakdown.tokens.length > 0, true);

  const cloze = generateParticleCloze(sample);
  assert.equal(cloze.options.length, 4);
  assert.equal(cloze.options.includes(cloze.targetParticle), true);

  const scramble = generateScrambleTiles(sample);
  assert.equal(scramble.correctTiles.length >= 2, true);
  assert.equal(scramble.shuffledTiles.length, scramble.correctTiles.length);

  const charRef = inspectTokenOrCharacter('学生', 'がくせい', sample.id);
  assert.equal(charRef.kanjiDetails.length, 2);
  assert.equal(charRef.matchingSentences.length > 0, true);
});

test('Study streak calculation counts consecutive active days accurately', () => {
  const logs = {
    '2026-11-14': {
      date: '2026-11-14',
      newStudiedCount: 5,
      reviewsCompletedCount: 0,
      practiceCount: 0,
      grades: { again: 0, hard: 0, good: 5, easy: 0 },
    },
    '2026-11-15': {
      date: '2026-11-15',
      newStudiedCount: 5,
      reviewsCompletedCount: 5,
      practiceCount: 0,
      grades: { again: 0, hard: 1, good: 8, easy: 1 },
    },
    '2026-11-16': {
      date: '2026-11-16',
      newStudiedCount: 3,
      reviewsCompletedCount: 4,
      practiceCount: 0,
      grades: { again: 0, hard: 0, good: 7, easy: 0 },
    },
  };
  assert.equal(calculateStudyStreak(logs, '2026-11-16'), 3);
});

import { UNIT_DIALOGUES } from './dialogues';
import {
  GRAMMAR_COMPARISONS,
  GRAMMAR_HANDBOOK,
  HIRAGANA_GOJUON,
  KATAKANA_GOJUON,
} from './referenceData';
import { getMilestoneBadges, getWeeklyGoalStats } from '../utils/srs';

test('Backup export and import validation preserves valid state and rejects invalid JSON', () => {
  const state = createInitialAppState();
  state.favorites = ['a11-u01-01', 'a12-u01-01'];
  state.completedDialogues = ['a11-u01'];
  state.settings.dailyReviewCap = 100;
  state.settings.weeklyDaysTarget = 7;
  state.settings.autoExpandBreakdown = true;
  state.records['a11-u01-01'] = scheduleSentenceReview(undefined, 'a11-u01-01', 'good', '2026-11-16');

  const serialized = JSON.stringify(state);
  const parsed = validateAndParseBackupJson(serialized);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.importedRecordCount, 1);
  assert.equal(parsed.importedFavoriteCount, 2);
  assert.equal(parsed.state?.settings.dailyReviewCap, 100);
  assert.equal(parsed.state?.settings.weeklyDaysTarget, 7);
  assert.equal(parsed.state?.completedDialogues?.includes('a11-u01'), true);
  assert.equal(parsed.state?.settings.autoExpandBreakdown, true);

  const invalid = validateAndParseBackupJson('{"not_valid": true}');
  assert.equal(invalid.valid, false);
});

test('All 20 Unit Mini-Dialogues, Grammar Handbook lessons, and Kana grids are complete and valid', () => {
  assert.equal(UNIT_DIALOGUES.length, 20);
  for (const dlg of UNIT_DIALOGUES) {
    assert.equal(dlg.lines.length >= 4, true, `Dialogue ${dlg.unitId} should have at least 4 lines`);
    assert.equal(dlg.comprehensionQuestion.options.length, 3);
    for (const line of dlg.lines) {
      const v = validateFuriganaSegments(line.segments);
      assert.equal(v.valid, true, `Invalid furigana in dialogue ${dlg.unitId}: ${line.japanese}`);
    }
  }

  assert.equal(GRAMMAR_HANDBOOK.length, 20);
  assert.equal(GRAMMAR_COMPARISONS.length, 8);
  for (const comp of GRAMMAR_COMPARISONS) {
    assert.equal(comp.relatedUnitIds.length > 0, true);
  }
  assert.equal(HIRAGANA_GOJUON.length, 46);
  assert.equal(KATAKANA_GOJUON.length, 46);
});

test('Weekly Goal Tracker and Milestone Badges evaluate learner state accurately', () => {
  const state = createInitialAppState();
  state.records['a11-u01-01'] = scheduleSentenceReview(undefined, 'a11-u01-01', 'good', '2026-11-16');
  state.completedDialogues = ['a11-u01'];
  state.dailyLogs['2026-11-16'] = {
    date: '2026-11-16',
    newStudiedCount: 5,
    reviewsCompletedCount: 2,
    practiceCount: 1,
    grades: { again: 0, hard: 0, good: 7, easy: 0 },
  };

  const weekly = getWeeklyGoalStats(state.dailyLogs, 5, '2026-11-16');
  assert.equal(weekly.activeDaysCount, 1);
  assert.equal(weekly.weeklyNewCount, 5);
  assert.equal(weekly.weeklyReviewsCount, 2);
  assert.equal(weekly.days.length, 7);

  const badges = getMilestoneBadges(state, ALL_SENTENCES, '2026-11-16');
  assert.equal(badges.length, 12);
  const firstStep = badges.find((b) => b.id === 'first-step');
  const firstDialogue = badges.find((b) => b.id === 'dialogue-reader-1');
  assert.equal(firstStep?.unlocked, true);
  assert.equal(firstDialogue?.unlocked, true);
});


import { SentenceItem } from '../types/curriculum';
import { parseAnnotatedJapanese, validateFuriganaSegments } from '../utils/furigana';
import { SENTENCES_A11_PART1 } from './sentencesA11Part1';
import { SENTENCES_A11_PART2 } from './sentencesA11Part2';
import { SENTENCES_A12_PART1 } from './sentencesA12Part1';
import { SENTENCES_A12_PART2 } from './sentencesA12Part2';
import { CURRICULUM_UNITS, RawSentenceSeed } from './units';

const RAW_SEEDS: RawSentenceSeed[] = [
  ...SENTENCES_A11_PART1,
  ...SENTENCES_A11_PART2,
  ...SENTENCES_A12_PART1,
  ...SENTENCES_A12_PART2,
];

export const ALL_SENTENCES: SentenceItem[] = RAW_SEEDS.map((seed, index) => {
  const { japanese, readingKana, segments } = parseAnnotatedJapanese(seed.annotatedJapanese);
  return {
    id: seed.id,
    level: seed.level,
    unitId: seed.unitId,
    order: index + 1,
    annotatedJapanese: seed.annotatedJapanese,
    japanese,
    readingKana,
    segments,
    english: seed.english,
    difficulty: seed.difficulty,
    grammarTags: seed.grammarTags,
    vocabTags: seed.vocabTags,
    topic: seed.topic,
  };
});

export const SENTENCES_BY_ID: Record<string, SentenceItem> = Object.fromEntries(
  ALL_SENTENCES.map((s) => [s.id, s])
);

export const SENTENCES_BY_UNIT: Record<string, SentenceItem[]> = CURRICULUM_UNITS.reduce(
  (acc, unit) => {
    acc[unit.id] = ALL_SENTENCES.filter((s) => s.unitId === unit.id);
    return acc;
  },
  {} as Record<string, SentenceItem[]>
);

export const ALL_TOPICS: string[] = Array.from(
  new Set(ALL_SENTENCES.map((s) => s.topic))
);

export interface CorpusValidationReport {
  valid: boolean;
  totalCount: number;
  a11Count: number;
  a12Count: number;
  unitCounts: Record<string, number>;
  errors: string[];
}

export function validateSentenceCorpus(): CorpusValidationReport {
  const errors: string[] = [];
  const unitIds = new Set(CURRICULUM_UNITS.map((u) => u.id));
  const seenIds = new Set<string>();
  const seenJapanese = new Map<string, string>();
  const unitCounts: Record<string, number> = {};

  for (const u of CURRICULUM_UNITS) {
    unitCounts[u.id] = 0;
  }

  let a11Count = 0;
  let a12Count = 0;

  for (const item of ALL_SENTENCES) {
    if (item.level === 'A1.1') a11Count++;
    else if (item.level === 'A1.2') a12Count++;
    else errors.push(`Invalid level for ${item.id}: ${item.level}`);

    if (seenIds.has(item.id)) {
      errors.push(`Duplicate sentence ID: ${item.id}`);
    }
    seenIds.add(item.id);

    if (!unitIds.has(item.unitId)) {
      errors.push(`Invalid unitId "${item.unitId}" on sentence ${item.id}`);
    } else {
      unitCounts[item.unitId] = (unitCounts[item.unitId] || 0) + 1;
    }

    if (!item.japanese || !item.japanese.trim()) {
      errors.push(`Empty Japanese text on ${item.id}`);
    }

    if (!item.english || !item.english.trim()) {
      errors.push(`Empty English translation on ${item.id}`);
    }

    const prevId = seenJapanese.get(item.japanese);
    if (prevId) {
      errors.push(`Duplicate Japanese sentence "${item.japanese}" in ${item.id} and ${prevId}`);
    } else {
      seenJapanese.set(item.japanese, item.id);
    }

    const furiganaCheck = validateFuriganaSegments(item.segments);
    if (!furiganaCheck.valid) {
      for (const err of furiganaCheck.errors) {
        errors.push(`[${item.id}] ${err}`);
      }
    }

    if (!item.grammarTags || item.grammarTags.length === 0) {
      errors.push(`Missing grammarTags on ${item.id}`);
    }
    if (!item.vocabTags || item.vocabTags.length === 0) {
      errors.push(`Missing vocabTags on ${item.id}`);
    }
  }

  if (ALL_SENTENCES.length < 600) {
    errors.push(`Total sentences (${ALL_SENTENCES.length}) is below minimum 600`);
  }
  if (a11Count < 300) {
    errors.push(`A1.1 sentences (${a11Count}) is below minimum 300`);
  }
  if (a12Count < 300) {
    errors.push(`A1.2 sentences (${a12Count}) is below minimum 300`);
  }

  return {
    valid: errors.length === 0,
    totalCount: ALL_SENTENCES.length,
    a11Count,
    a12Count,
    unitCounts,
    errors,
  };
}

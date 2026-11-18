import { RubySegment } from '../types/curriculum';

const KANJI_REGEX = /[\u4E00-\u9FAF\u3400-\u4DBF々]/;
const HIRAGANA_KATAKANA_ONLY_REGEX = /^[\u3040-\u309F\u30A0-\u30FFー]+$/;

/**
 * Parses an annotated Japanese sentence using `{Kanji|reading}` syntax
 * into plain Japanese text, full kana reading, and structured ruby segments.
 *
 * Example:
 *   "{日本語|にほんご}を{勉強|べんきょう}します。"
 * ->
 *   japanese: "日本語を勉強します。"
 *   readingKana: "にほんごをべんきょうします。"
 *   segments: [
 *     { text: "日本語", reading: "にほんご" },
 *     { text: "を" },
 *     { text: "勉強", reading: "べんきょう" },
 *     { text: "します。" }
 *   ]
 */
export function parseAnnotatedJapanese(annotated: string): {
  japanese: string;
  readingKana: string;
  segments: RubySegment[];
} {
  const segments: RubySegment[] = [];
  let japanese = '';
  let readingKana = '';

  const tokenRegex = /\{([^|{}]+)\|([^|{}]+)\}|([^{}]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(annotated)) !== null) {
    if (match[1] !== undefined && match[2] !== undefined) {
      const surface = match[1];
      const reading = match[2];
      segments.push({ text: surface, reading });
      japanese += surface;
      readingKana += reading;
    } else if (match[3] !== undefined) {
      const plain = match[3];
      segments.push({ text: plain });
      japanese += plain;
      readingKana += plain;
    }
  }

  return { japanese, readingKana, segments };
}

/**
 * Validates that a parsed RubySegment array adheres to strict Japanese reading rules:
 * 1. Every segment with a `reading` must contain at least one Kanji character (never pure kana).
 * 2. Every segment without a `reading` must NOT contain any unannotated Kanji character.
 * 3. Every `reading` must be valid non-empty kana.
 */
export function validateFuriganaSegments(segments: RubySegment[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (segments.length === 0) {
    errors.push('Segments array is empty');
    return { valid: false, errors };
  }

  for (const seg of segments) {
    if (!seg.text || seg.text.length === 0) {
      errors.push('Segment has empty text');
      continue;
    }

    if (seg.reading !== undefined) {
      if (!seg.reading.trim()) {
        errors.push(`Empty reading for "${seg.text}"`);
      }
      if (!KANJI_REGEX.test(seg.text)) {
        errors.push(`Furigana attached to text without kanji: "${seg.text}" (${seg.reading})`);
      }
      if (HIRAGANA_KATAKANA_ONLY_REGEX.test(seg.text)) {
        errors.push(`Furigana placed over pure kana: "${seg.text}"`);
      }
      if (KANJI_REGEX.test(seg.reading)) {
        errors.push(`Reading contains kanji: "${seg.reading}" for "${seg.text}"`);
      }
    } else {
      if (KANJI_REGEX.test(seg.text)) {
        errors.push(`Unannotated kanji found in plain text segment: "${seg.text}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

import { ALL_SENTENCES } from '../data/sentences';
import { CURRICULUM_UNITS } from '../data/units';
import { RubySegment, SentenceItem } from '../types/curriculum';

export interface ParticleGuideItem {
  particle: string;
  roleTitle: string;
  explanation: string;
}

export const PARTICLE_REFERENCE: Record<string, ParticleGuideItem> = {
  は: {
    particle: 'は',
    roleTitle: 'Topic Marker (pronounced "wa")',
    explanation: 'Introduces the main topic of the sentence ("As for X...").',
  },
  が: {
    particle: 'が',
    roleTitle: 'Subject / Existence / Preference Marker',
    explanation: 'Marks the grammatical subject, things that exist (あります/います), or liked items (好き).',
  },
  を: {
    particle: 'を',
    roleTitle: 'Direct Object Marker (pronounced "o")',
    explanation: 'Marks the direct object receiving an action (e.g., ご飯を食べます).',
  },
  に: {
    particle: 'に',
    roleTitle: 'Time / Destination / Location of Existence',
    explanation: 'Marks specific clock times (七時に), destinations (学校に行きます), or where things exist.',
  },
  で: {
    particle: 'で',
    roleTitle: 'Location of Action / Means & Transport',
    explanation: 'Marks where an active event happens (家で勉強します) or the tool/transport used (電車で行きます).',
  },
  も: {
    particle: 'も',
    roleTitle: 'Inclusion Marker ("also / too")',
    explanation: 'Replaces は, が, or を to mean "also" or "too" (私も学生です).',
  },
  の: {
    particle: 'の',
    roleTitle: 'Possession & Noun Modification ("of / \'s")',
    explanation: 'Connects two nouns to show possession or category (私の本, 日本語の先生).',
  },
  と: {
    particle: 'と',
    roleTitle: 'Companion ("with") & Exhaustive "and"',
    explanation: 'Connects nouns ("A and B") or marks who you do an action with (友達と行きます).',
  },
  か: {
    particle: 'か',
    roleTitle: 'Question Particle',
    explanation: 'Placed at the end of a polite statement to turn it into a question.',
  },
  から: {
    particle: 'から',
    roleTitle: 'Starting Point ("from") & Reason ("because")',
    explanation: 'Marks a starting time/place (九時から) or follows a clause to state a reason ("because / so").',
  },
  へ: {
    particle: 'へ',
    roleTitle: 'Direction Marker (pronounced "e")',
    explanation: 'Highlights the direction of movement toward a destination.',
  },
};

export interface KanjiCharacterMeta {
  kanji: string;
  strokes: number;
  onyomi: string;
  kunyomi: string;
  coreMeaning: string;
}

export const A1_KANJI_DICTIONARY: Record<string, KanjiCharacterMeta> = {
  私: { kanji: '私', strokes: 7, onyomi: 'シ', kunyomi: 'わたし', coreMeaning: 'I, private, self' },
  学: { kanji: '学', strokes: 8, onyomi: 'ガク', kunyomi: 'まな(ぶ)', coreMeaning: 'study, learning, school' },
  生: { kanji: '生', strokes: 5, onyomi: 'セイ・ショウ', kunyomi: 'い(きる)・う(まれる)', coreMeaning: 'life, birth, student' },
  先: { kanji: '先', strokes: 6, onyomi: 'セン', kunyomi: 'さき', coreMeaning: 'ahead, previous, teacher' },
  日: { kanji: '日', strokes: 4, onyomi: 'ニチ・ジツ', kunyomi: 'ひ・び・か', coreMeaning: 'day, sun, Japan' },
  本: { kanji: '本', strokes: 5, onyomi: 'ホン', kunyomi: 'もと', coreMeaning: 'book, origin, main' },
  人: { kanji: '人', strokes: 2, onyomi: 'ジン・ニン', kunyomi: 'ひと', coreMeaning: 'person, human' },
  語: { kanji: '語', strokes: 14, onyomi: 'ゴ', kunyomi: 'かた(る)', coreMeaning: 'language, word' },
  友: { kanji: '友', strokes: 4, onyomi: 'ユウ', kunyomi: 'とも', coreMeaning: 'friend, companion' },
  達: { kanji: '達', strokes: 12, onyomi: 'タツ', kunyomi: 'たち', coreMeaning: 'plural suffix, reach' },
  今: { kanji: '今', strokes: 4, onyomi: 'コン・キン', kunyomi: 'いま', coreMeaning: 'now, present' },
  朝: { kanji: '朝', strokes: 12, onyomi: 'チョウ', kunyomi: 'あさ', coreMeaning: 'morning' },
  昼: { kanji: '昼', strokes: 9, onyomi: 'チュウ', kunyomi: 'ひる', coreMeaning: 'daytime, noon' },
  夜: { kanji: '夜', strokes: 8, onyomi: 'ヤ', kunyomi: 'よる・よ', coreMeaning: 'night, evening' },
  毎: { kanji: '毎', strokes: 6, onyomi: 'マイ', kunyomi: 'ごと', coreMeaning: 'every, each' },
  時: { kanji: '時', strokes: 10, onyomi: 'ジ', kunyomi: 'とき', coreMeaning: 'time, hour, o\'clock' },
  分: { kanji: '分', strokes: 4, onyomi: 'ふん・ぷん・ブン', kunyomi: 'わ(かる)', coreMeaning: 'minute, part, understand' },
  行: { kanji: '行', strokes: 6, onyomi: 'コウ・ギョウ', kunyomi: 'い(く)・おこな(う)', coreMeaning: 'go, travel, line' },
  来: { kanji: '来', strokes: 7, onyomi: 'ライ', kunyomi: 'く(る)・き', coreMeaning: 'come, next' },
  帰: { kanji: '帰', strokes: 10, onyomi: 'キ', kunyomi: 'かえ(る)', coreMeaning: 'return home' },
  食: { kanji: '食', strokes: 9, onyomi: 'ショク', kunyomi: 'た(べる)', coreMeaning: 'eat, food, meal' },
  飲: { kanji: '飲', strokes: 12, onyomi: 'イン', kunyomi: 'の(む)', coreMeaning: 'drink' },
  見: { kanji: '見', strokes: 7, onyomi: 'ケン', kunyomi: 'み(る)', coreMeaning: 'see, look, watch' },
  聞: { kanji: '聞', strokes: 14, onyomi: 'ブン・モン', kunyomi: 'き(く)', coreMeaning: 'hear, listen, ask' },
  読: { kanji: '読', strokes: 14, onyomi: 'ドク', kunyomi: 'よ(む)', coreMeaning: 'read' },
  書: { kanji: '書', strokes: 10, onyomi: 'ショ', kunyomi: 'か(く)', coreMeaning: 'write' },
  話: { kanji: '話', strokes: 13, onyomi: 'ワ', kunyomi: 'はな(す)・はなし', coreMeaning: 'speak, talk, story' },
  買: { kanji: '買', strokes: 12, onyomi: 'バイ', kunyomi: 'か(う)', coreMeaning: 'buy, purchase' },
  起: { kanji: '起', strokes: 10, onyomi: 'キ', kunyomi: 'お(きる)', coreMeaning: 'wake up, get up' },
  寝: { kanji: '寝', strokes: 13, onyomi: 'シン', kunyomi: 'ね(る)', coreMeaning: 'sleep, lie down' },
  電: { kanji: '電', strokes: 13, onyomi: 'デン', kunyomi: 'いなずま', coreMeaning: 'electricity, train/phone' },
  車: { kanji: '車', strokes: 7, onyomi: 'シャ', kunyomi: 'くるま', coreMeaning: 'car, vehicle, wheel' },
  駅: { kanji: '駅', strokes: 14, onyomi: 'エキ', kunyomi: '—', coreMeaning: 'train station' },
  家: { kanji: '家', strokes: 10, onyomi: 'カ・ケ', kunyomi: 'いえ・うち', coreMeaning: 'house, home, family' },
  校: { kanji: '校', strokes: 10, onyomi: 'コウ', kunyomi: '—', coreMeaning: 'school' },
  店: { kanji: '店', strokes: 8, onyomi: 'テン', kunyomi: 'みせ', coreMeaning: 'shop, store, restaurant' },
  水: { kanji: '水', strokes: 4, onyomi: 'スイ', kunyomi: 'みず', coreMeaning: 'water' },
  茶: { kanji: '茶', strokes: 9, onyomi: 'チャ・サ', kunyomi: '—', coreMeaning: 'tea' },
  好: { kanji: '好', strokes: 6, onyomi: 'コウ', kunyomi: 'す(き)・この(む)', coreMeaning: 'like, fond of' },
  大: { kanji: '大', strokes: 3, onyomi: 'ダイ・タイ', kunyomi: 'おお(きい)', coreMeaning: 'big, large, university' },
  小: { kanji: '小', strokes: 3, onyomi: 'ショウ', kunyomi: 'ちい(さい)・こ', coreMeaning: 'small, little' },
  新: { kanji: '新', strokes: 13, onyomi: 'シン', kunyomi: 'あたら(しい)', coreMeaning: 'new, fresh' },
  古: { kanji: '古', strokes: 5, onyomi: 'コ', kunyomi: 'ふる(い)', coreMeaning: 'old (things)' },
  高: { kanji: '高', strokes: 10, onyomi: 'コウ', kunyomi: 'たか(い)', coreMeaning: 'high, tall, expensive' },
  安: { kanji: '安', strokes: 6, onyomi: 'アン', kunyomi: 'やす(い)', coreMeaning: 'cheap, peaceful, safe' },
  暑: { kanji: '暑', strokes: 12, onyomi: 'ショ', kunyomi: 'あつ(い)', coreMeaning: 'hot (weather)' },
  寒: { kanji: '寒', strokes: 12, onyomi: 'カン', kunyomi: 'さむ(い)', coreMeaning: 'cold (weather)' },
  父: { kanji: '父', strokes: 4, onyomi: 'フ', kunyomi: 'ちち・とう', coreMeaning: 'father' },
  母: { kanji: '母', strokes: 5, onyomi: 'ボ', kunyomi: 'はは・かあ', coreMeaning: 'mother' },
  兄: { kanji: '兄', strokes: 5, onyomi: 'ケイ・キョウ', kunyomi: 'あに・にい', coreMeaning: 'older brother' },
  姉: { kanji: '姉', strokes: 8, onyomi: 'シ', kunyomi: 'あね・ねえ', coreMeaning: 'older sister' },
  犬: { kanji: '犬', strokes: 4, onyomi: 'ケン', kunyomi: 'いぬ', coreMeaning: 'dog' },
  猫: { kanji: '猫', strokes: 11, onyomi: 'ビョウ', kunyomi: 'ねこ', coreMeaning: 'cat' },
  映: { kanji: '映', strokes: 9, onyomi: 'エイ', kunyomi: 'うつ(る)', coreMeaning: 'project, reflect, movie' },
  画: { kanji: '画', strokes: 8, onyomi: 'ガ・カク', kunyomi: '—', coreMeaning: 'picture, stroke' },
  勉: { kanji: '勉', strokes: 10, onyomi: 'ベン', kunyomi: 'つと(める)', coreMeaning: 'exertion, study' },
  強: { kanji: '強', strokes: 11, onyomi: 'キョウ・ゴウ', kunyomi: 'つよ(い)', coreMeaning: 'strong, study' },
  仕: { kanji: '仕', strokes: 5, onyomi: 'シ', kunyomi: 'つか(える)', coreMeaning: 'serve, work' },
  事: { kanji: '事', strokes: 8, onyomi: 'ジ', kunyomi: 'こと', coreMeaning: 'matter, thing, work' },
  休: { kanji: '休', strokes: 6, onyomi: 'キュウ', kunyomi: 'やす(む)', coreMeaning: 'rest, holiday' },
  待: { kanji: '待', strokes: 9, onyomi: 'タイ', kunyomi: 'ま(つ)', coreMeaning: 'wait' },
  立: { kanji: '立', strokes: 5, onyomi: 'リツ', kunyomi: 'た(つ)', coreMeaning: 'stand' },
  座: { kanji: '座', strokes: 10, onyomi: 'ザ', kunyomi: 'すわ(る)', coreMeaning: 'sit, seat' },
  使: { kanji: '使', strokes: 8, onyomi: 'シ', kunyomi: 'つか(う)', coreMeaning: 'use' },
  作: { kanji: '作', strokes: 7, onyomi: 'サク・サ', kunyomi: 'つく(る)', coreMeaning: 'make, prepare' },
  雨: { kanji: '雨', strokes: 8, onyomi: 'ウ', kunyomi: 'あめ', coreMeaning: 'rain' },
  天: { kanji: '天', strokes: 4, onyomi: 'テン', kunyomi: 'あめ・あま', coreMeaning: 'heaven, sky, weather' },
  気: { kanji: '気', strokes: 6, onyomi: 'キ・ケ', kunyomi: '—', coreMeaning: 'spirit, mood, weather' },
};

const KANA_STEM_PRONOUNS = [
  'これ',
  'それ',
  'あれ',
  'どれ',
  'ここ',
  'そこ',
  'あそこ',
  'どこ',
  'だれ',
  'なに',
  'いつ',
  'わたし',
  'あなた',
];

const FIXED_GREETING_PREFIXES = [
  'おはよう',
  'こんにちは',
  'こんばんは',
  'ありがとう',
  'すみません',
  'ごめんなさい',
  'はじめまして',
  'よろしく',
  'さようなら',
  'いただきます',
  'ごちそうさま',
];

export interface BreakdownToken {
  surface: string;
  reading?: string;
  kind: 'word' | 'particle' | 'grammar';
  note?: string;
}

export interface SentenceBreakdownAnalysis {
  tokens: BreakdownToken[];
  particlesFound: ParticleGuideItem[];
  unitGrammarSummary: string[];
  vocabHighlights: string[];
}

/**
 * Splits a SentenceItem into interactive tokens and extracts particle & grammar explanations.
 */
export function analyzeSentenceBreakdown(sentence: SentenceItem): SentenceBreakdownAnalysis {
  const unit = CURRICULUM_UNITS.find((u) => u.id === sentence.unitId);
  const tokens: BreakdownToken[] = [];
  const particleSet = new Set<string>();

  sentence.segments.forEach((seg, segIdx) => {
    const prevWasKanji = segIdx > 0 && Boolean(sentence.segments[segIdx - 1]?.reading);

    if (seg.reading) {
      const matchingVocab = sentence.vocabTags.find((v) => v.includes(seg.text));
      tokens.push({
        surface: seg.text,
        reading: seg.reading,
        kind: 'word',
        note: matchingVocab || `${seg.text} (${seg.reading})`,
      });
    } else {
      const cleaned = seg.text.replace(/[。、！？]/g, ' ').trim();
      if (!cleaned) return;

      // If this kana segment immediately follows a Kanji segment and starts with a grammatical particle
      if (prevWasKanji) {
        if (cleaned.startsWith('から') && PARTICLE_REFERENCE['から']) {
          particleSet.add('から');
          tokens.push({
            surface: 'から',
            kind: 'particle',
            note: PARTICLE_REFERENCE['から'].roleTitle,
          });
          const rest = cleaned.slice(2).trim();
          if (rest) {
            tokens.push({ surface: rest, kind: 'grammar' });
          }
          return;
        }
        const firstCh = cleaned[0];
        if (['は', 'が', 'を', 'に', 'で', 'も', 'と', 'の', 'へ', 'か'].includes(firstCh)) {
          particleSet.add(firstCh);
          tokens.push({
            surface: firstCh,
            kind: 'particle',
            note: PARTICLE_REFERENCE[firstCh].roleTitle,
          });
          const rest = cleaned.slice(1).trim();
          if (rest) {
            tokens.push({ surface: rest, kind: 'grammar' });
          }
          return;
        }
      }

      // Check if it starts with a pronoun/demonstrative followed by a particle (e.g., これは, ここが)
      const matchedPronoun = KANA_STEM_PRONOUNS.find((p) => cleaned.startsWith(p));
      if (matchedPronoun && cleaned.length > matchedPronoun.length) {
        const afterPronoun = cleaned.slice(matchedPronoun.length);
        const pChar = afterPronoun[0];
        tokens.push({
          surface: matchedPronoun,
          kind: 'word',
          note: sentence.vocabTags.find((v) => v.includes(matchedPronoun)),
        });
        if (['は', 'が', 'を', 'に', 'で', 'も', 'と', 'の'].includes(pChar)) {
          particleSet.add(pChar);
          tokens.push({
            surface: pChar,
            kind: 'particle',
            note: PARTICLE_REFERENCE[pChar].roleTitle,
          });
          const remainder = afterPronoun.slice(1).trim();
          if (remainder) {
            tokens.push({ surface: remainder, kind: 'grammar' });
          }
          return;
        }
      }

      tokens.push({
        surface: cleaned,
        kind: 'grammar',
        note: sentence.vocabTags.find((v) => v.includes(cleaned)),
      });
    }
  });

  const particlesFound = Array.from(particleSet)
    .map((p) => PARTICLE_REFERENCE[p])
    .filter(Boolean)
    .slice(0, 4);

  return {
    tokens,
    particlesFound,
    unitGrammarSummary: unit ? unit.grammarFocus : sentence.grammarTags,
    vocabHighlights: sentence.vocabTags,
  };
}

export interface ParticleClozeChallenge {
  beforeSegments: RubySegment[];
  targetParticle: string;
  afterSegments: RubySegment[];
  options: string[];
  explanation: string;
}

const CLOZE_PARTICLE_POOL = ['は', 'が', 'を', 'に', 'で', 'も', 'と', 'の', 'か', 'から'];

/**
 * Generates a deterministic 4-choice particle fill-in-the-blank challenge for any sentence.
 * Only targets genuine grammatical particles (after kanji nouns, pronouns, or sentence-final か),
 * never splitting inside fixed greeting roots like おはよう.
 */
export function generateParticleCloze(sentence: SentenceItem): ParticleClozeChallenge {
  const candidates: Array<{
    segIndex: number;
    charIndex: number;
    particle: string;
    priority: number;
  }> = [];

  sentence.segments.forEach((seg, segIdx) => {
    if (seg.reading) return; // Only look inside kana segments for particles
    const text = seg.text;
    const prevWasKanji = segIdx > 0 && Boolean(sentence.segments[segIdx - 1]?.reading);

    // Case 1: Immediately follows a kanji segment (e.g., {私|わたし}は, {水|みず}を, {学校|がっこう}に)
    if (prevWasKanji) {
      if (text.startsWith('から')) {
        candidates.push({ segIndex: segIdx, charIndex: 0, particle: 'から', priority: 1 });
      } else if (
        text.length > 0 &&
        ['を', 'に', 'で', 'が', 'は', 'も', 'と', 'の', 'へ'].includes(text[0]) &&
        !text.startsWith('では') // keep では together as copula negative
      ) {
        const p = text[0];
        const priority = ['を', 'に', 'で', 'が', 'と', 'の', 'も'].includes(p) ? 1 : 2;
        candidates.push({ segIndex: segIdx, charIndex: 0, particle: p, priority });
      }
    }

    // Case 2: Follows a kana demonstrative/pronoun (e.g., これは, ここには, どこに, だれの)
    for (const pron of KANA_STEM_PRONOUNS) {
      const idx = text.indexOf(pron);
      if (idx !== -1 && text.length > idx + pron.length) {
        const nextChar = text[idx + pron.length];
        if (['は', 'が', 'を', 'に', 'で', 'も', 'と', 'の'].includes(nextChar)) {
          candidates.push({
            segIndex: segIdx,
            charIndex: idx + pron.length,
            particle: nextChar,
            priority: 1,
          });
        }
      }
    }

    // Case 3: Reason particle から after polite verb/adjective (e.g. ますから、ですから、ありませんから)
    const karaMatch = text.match(/(ます|です|せん|した|かった)から/);
    if (karaMatch && typeof karaMatch.index === 'number') {
      candidates.push({
        segIndex: segIdx,
        charIndex: karaMatch.index + karaMatch[1].length,
        particle: 'から',
        priority: 1,
      });
    }

    // Case 4: Sentence-ending question particle か (e.g., ですから / ですか。 / ますか。)
    if (text.endsWith('か。') || text.endsWith('か')) {
      const kaIdx = text.lastIndexOf('か');
      if (kaIdx > 0) {
        candidates.push({
          segIndex: segIdx,
          charIndex: kaIdx,
          particle: 'か',
          priority: 3,
        });
      }
    }
  });

  candidates.sort((a, b) => a.priority - b.priority);
  const chosen = candidates[0];

  if (!chosen) {
    // Fallback for fixed single-phrase greetings (e.g. "おはようございます。", "ありがとうございます。")
    // Mask the polite ending or final expression cleanly
    if (sentence.japanese.endsWith('ございます。')) {
      const idx = sentence.segments.findIndex((s) => s.text.includes('ございます'));
      if (idx !== -1) {
        const seg = sentence.segments[idx];
        const gIdx = seg.text.indexOf('ございます');
        const beforeSegments = [
          ...sentence.segments.slice(0, idx),
          ...(gIdx > 0 ? [{ text: seg.text.slice(0, gIdx) }] : []),
        ];
        return {
          beforeSegments,
          targetParticle: 'ございます',
          afterSegments: [{ text: '。' }],
          options: ['ございます', 'です', 'ます', 'ません'],
          explanation: 'ございます is the polite expression used in formal greetings like おはようございます and ありがとうございます.',
        };
      }
    }

    return {
      beforeSegments: sentence.segments.slice(0, -1),
      targetParticle: sentence.segments[sentence.segments.length - 1]?.text.replace('。', '') || 'です',
      afterSegments: [{ text: '。' }],
      options: ['です', 'ます', 'か', 'ね'],
      explanation: 'Polite sentence ending completing this expression.',
    };
  }

  const beforeSegments: RubySegment[] = [];
  const afterSegments: RubySegment[] = [];

  sentence.segments.forEach((seg, idx) => {
    if (idx < chosen.segIndex) {
      beforeSegments.push(seg);
    } else if (idx > chosen.segIndex) {
      afterSegments.push(seg);
    } else {
      const beforeText = seg.text.slice(0, chosen.charIndex);
      const afterText = seg.text.slice(chosen.charIndex + chosen.particle.length);
      if (beforeText) {
        beforeSegments.push({ text: beforeText });
      }
      if (afterText) {
        afterSegments.push({ text: afterText });
      }
    }
  });

  const distractors = CLOZE_PARTICLE_POOL.filter((p) => p !== chosen.particle);
  const seed = sentence.order;
  const pickedDistractors: string[] = [];
  for (let i = 0; i < distractors.length && pickedDistractors.length < 3; i++) {
    const d = distractors[(seed + i * 3) % distractors.length];
    if (!pickedDistractors.includes(d)) {
      pickedDistractors.push(d);
    }
  }

  const allOptions = [chosen.particle, ...pickedDistractors];
  const shuffledOptions = allOptions
    .map((opt, idx) => ({ opt, sortKey: (seed * 7 + idx * 13) % 19 }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((x) => x.opt);

  const guide = PARTICLE_REFERENCE[chosen.particle];
  const explanation = guide
    ? `${chosen.particle} — ${guide.roleTitle}: ${guide.explanation}`
    : `The particle "${chosen.particle}" completes this grammatical structure.`;

  return {
    beforeSegments,
    targetParticle: chosen.particle,
    afterSegments,
    options: shuffledOptions,
    explanation,
  };
}

export interface ScrambleTile {
  id: string;
  text: string;
}

/**
 * Generates natural bunsetsu/phrase scramble tiles for active sentence construction practice.
 */
export function generateScrambleTiles(sentence: SentenceItem): {
  correctTiles: ScrambleTile[];
  shuffledTiles: ScrambleTile[];
} {
  const rawChunks: string[] = [];
  let currentChunk = '';

  const isGreetingSentence = FIXED_GREETING_PREFIXES.some((g) => sentence.japanese.startsWith(g));

  if (isGreetingSentence) {
    const clean = sentence.japanese.replace(/[。]/g, '');
    if (clean.includes('、')) {
      const parts = clean.split('、').map((p, idx, arr) => (idx < arr.length - 1 ? `${p}、View`.replace('View', '') : p));
      rawChunks.push(...parts);
    } else if (clean.endsWith('ございます')) {
      rawChunks.push(clean.slice(0, clean.indexOf('ございます')), 'ございます');
    } else {
      const mid = Math.ceil(clean.length / 2);
      rawChunks.push(clean.slice(0, mid), clean.slice(mid));
    }
  } else {
    sentence.segments.forEach((seg, segIdx) => {
      const cleanText = seg.text.replace(/[。]/g, '');
      if (!cleanText) return;
      const prevWasKanji = segIdx > 0 && Boolean(sentence.segments[segIdx - 1]?.reading);

      if (seg.reading) {
        if (currentChunk.length >= 3) {
          rawChunks.push(currentChunk);
          currentChunk = cleanText;
        } else {
          currentChunk += cleanText;
        }
      } else if (prevWasKanji && ['は', 'が', 'を', 'に', 'で', 'も', 'と', 'の', 'へ'].includes(cleanText[0])) {
        // Attach the particle to the preceding kanji noun to form a natural bunsetsu tile (e.g., 私は, 学校に, 水を)
        currentChunk += cleanText[0];
        rawChunks.push(currentChunk);
        currentChunk = '';
        const remainder = cleanText.slice(1);
        if (remainder) {
          if (remainder.includes('、')) {
            const sub = remainder.split('、');
            sub.forEach((part, idx) => {
              if (!part) return;
              rawChunks.push(idx < sub.length - 1 ? `${part}、` : part);
            });
          } else {
            currentChunk = remainder;
          }
        }
      } else {
        if (cleanText.includes('、')) {
          const parts = cleanText.split('、');
          parts.forEach((p, idx) => {
            if (!p) return;
            const piece = idx < parts.length - 1 ? `${p}、` : p;
            rawChunks.push(currentChunk + piece);
            currentChunk = '';
          });
        } else {
          currentChunk += cleanText;
          if (currentChunk.length >= 4) {
            rawChunks.push(currentChunk);
            currentChunk = '';
          }
        }
      }
    });

    if (currentChunk) {
      rawChunks.push(currentChunk);
    }
  }

  const finalStrings =
    rawChunks.filter(Boolean).length >= 2
      ? rawChunks.filter(Boolean)
      : [
          sentence.japanese.replace(/[。]/g, '').slice(0, Math.ceil(sentence.japanese.length / 2)),
          sentence.japanese
            .replace(/[。]/g, '')
            .slice(Math.ceil(sentence.japanese.length / 2)),
        ].filter(Boolean);

  const correctTiles: ScrambleTile[] = finalStrings.map((text, idx) => ({
    id: `${sentence.id}-tile-${idx}`,
    text,
  }));

  const seed = sentence.order + 11;
  const shuffledTiles = [...correctTiles]
    .map((tile, idx) => ({
      tile,
      weight: ((seed * 17 + idx * 23) % 31) + (idx === 0 ? 19 : 0),
    }))
    .sort((a, b) => a.weight - b.weight)
    .map((x) => x.tile);

  return {
    correctTiles,
    shuffledTiles,
  };
}

export interface CharacterInspectorResult {
  query: string;
  reading?: string;
  particleInfo?: ParticleGuideItem;
  kanjiDetails: KanjiCharacterMeta[];
  matchingSentences: SentenceItem[];
}

/**
 * Looks up kanji metadata, particle notes, and corpus concordance sentences for a clicked token.
 */
export function inspectTokenOrCharacter(
  surface: string,
  reading?: string,
  currentSentenceId?: string
): CharacterInspectorResult {
  const cleanSurface = surface.replace(/[。、！？\s]/g, '');
  const particleInfo = PARTICLE_REFERENCE[cleanSurface];

  const kanjiChars = Array.from(cleanSurface).filter((ch) => /[\u4E00-\u9FAF\u3400-\u4DBF]/.test(ch));
  const kanjiDetails: KanjiCharacterMeta[] = kanjiChars.map(
    (k) =>
      A1_KANJI_DICTIONARY[k] || {
        kanji: k,
        strokes: 8,
        onyomi: '—',
        kunyomi: reading || '—',
        coreMeaning: 'Common A1 Kanji character',
      }
  );

  const matchingSentences = ALL_SENTENCES.filter(
    (s) => s.id !== currentSentenceId && s.japanese.includes(cleanSurface)
  ).slice(0, 4);

  return {
    query: cleanSurface,
    reading,
    particleInfo,
    kanjiDetails,
    matchingSentences,
  };
}

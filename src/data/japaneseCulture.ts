import { RubySegment } from '../types/curriculum';

export interface OmikujiProverbItem {
  id: string;
  blessing: '大吉' | '中吉' | '吉' | '末吉';
  blessingRomaji: string;
  blessingEnglish: string;
  japanese: string;
  segments: RubySegment[];
  romaji: string;
  literalEnglish: string;
  meaning: string;
  culturalNote: string;
  studyTip: string;
}

export const OMIKUJI_PROVERBS: OmikujiProverbItem[] = [
  {
    id: 'nanakorobi-yaoki',
    blessing: '大吉',
    blessingRomaji: 'Daikichi',
    blessingEnglish: 'Great Blessing',
    japanese: '七転び八起き',
    segments: [
      { text: '七転', reading: 'ななころ' },
      { text: 'び' },
      { text: '八起', reading: 'やお' },
      { text: 'き' },
    ],
    romaji: 'Nanakorobi yaoki',
    literalEnglish: 'Fall down seven times, stand up eight.',
    meaning: 'Perseverance through every mistake leads to true mastery.',
    culturalNote:
      'Associated with round red Daruma dolls from Takasaki that always tilt back upright when pushed over.',
    studyTip: 'Don’t fear pressing "Again" on a flashcard—every lapse strengthens your recall!',
  },
  {
    id: 'keizoku-wa-chikara',
    blessing: '大吉',
    blessingRomaji: 'Daikichi',
    blessingEnglish: 'Great Blessing',
    japanese: '継続は力なり',
    segments: [
      { text: '継続', reading: 'けいぞく' },
      { text: 'は' },
      { text: '力', reading: 'ちから' },
      { text: 'なり' },
    ],
    romaji: 'Keizoku wa chikara nari',
    literalEnglish: 'Continuation is power.',
    meaning: 'Consistent daily effort compounds into extraordinary ability.',
    culturalNote:
      'Inscribed in calligraphy scrolls across Japanese budō dojos and study halls.',
    studyTip: 'Even 10 sentences a day builds an unbreakable foundation across 20 units.',
  },
  {
    id: 'ichigo-ichie',
    blessing: '大吉',
    blessingRomaji: 'Daikichi',
    blessingEnglish: 'Great Blessing',
    japanese: '一期一会',
    segments: [
      { text: '一期', reading: 'いちご' },
      { text: '一会', reading: 'いちえ' },
    ],
    romaji: 'Ichigo ichie',
    literalEnglish: 'One time, one meeting.',
    meaning: 'Treasure every moment and encounter, for it will never recur in the exact same way.',
    culturalNote:
      'Rooted in the Kyoto tea ceremony philosophy of Sen no Rikyū—approaching each bowl of tea with full presence.',
    studyTip: 'Read each Japanese sentence aloud once with full attention to its rhythm.',
  },
  {
    id: 'chiri-mo-tsumoreba',
    blessing: '中吉',
    blessingRomaji: 'Chūkichi',
    blessingEnglish: 'Middle Blessing',
    japanese: '塵も積もれば山となる',
    segments: [
      { text: '塵', reading: 'ちり' },
      { text: 'も' },
      { text: '積', reading: 'つ' },
      { text: 'もれば' },
      { text: '山', reading: 'やま' },
      { text: 'となる' },
    ],
    romaji: 'Chiri mo tsumoreba yama to naru',
    literalEnglish: 'Even dust, when piled up, becomes a mountain.',
    meaning: 'Small daily sentences accumulate into fluent comprehension.',
    culturalNote:
      'Notice the particles も (even) and と (into/becomes) working together in this classic proverb.',
    studyTip: 'Master one particle contrast today in the Grammar Handbook.',
  },
  {
    id: 'nichinichi-kore-kojitsu',
    blessing: '大吉',
    blessingRomaji: 'Daikichi',
    blessingEnglish: 'Great Blessing',
    japanese: '日日是好日',
    segments: [
      { text: '日日', reading: 'にちにち' },
      { text: '是', reading: 'これ' },
      { text: '好日', reading: 'こうじつ' },
    ],
    romaji: 'Nichinichi kore kōjitsu',
    literalEnglish: 'Every single day is a good day.',
    meaning: 'Whether sunny or rainy, each day offers a fresh opportunity to learn and grow.',
    culturalNote:
      'A beloved Zen calligraphy phrase hanging in Kyoto temple alcoves (tokonoma).',
    studyTip: 'Try Listening-First mode today to tune your ear to natural Japanese cadence.',
  },
  {
    id: 'ishi-no-ue-ni-mo-sannen',
    blessing: '中吉',
    blessingRomaji: 'Chūkichi',
    blessingEnglish: 'Middle Blessing',
    japanese: '石の上にも三年',
    segments: [
      { text: '石', reading: 'いし' },
      { text: 'の' },
      { text: '上', reading: 'うえ' },
      { text: 'にも' },
      { text: '三年', reading: 'さんねん' },
    ],
    romaji: 'Ishi no ue ni mo sannen',
    literalEnglish: 'Three years even on a cold stone.',
    meaning: 'Patience and steady sitting eventually warm even the coldest rock.',
    culturalNote:
      'Uses the exact A1 location pattern [Noun] の 上 に (on top of [Noun]) taught in Unit 4!',
    studyTip: 'Review Unit 4 spatial words (上, 下, 中, 隣) if you spot them today.',
  },
  {
    id: 'senri-no-michi',
    blessing: '吉',
    blessingRomaji: 'Kichi',
    blessingEnglish: 'Blessing',
    japanese: '千里の道も一歩から',
    segments: [
      { text: '千里', reading: 'せんり' },
      { text: 'の' },
      { text: '道', reading: 'みち' },
      { text: 'も' },
      { text: '一歩', reading: 'いっぽ' },
      { text: 'から' },
    ],
    romaji: 'Senri no michi mo ippo kara',
    literalEnglish: 'Even a journey of a thousand ri begins from a single step.',
    meaning: 'Every grand achievement starts with today’s first step.',
    culturalNote:
      'Uses the A1 particle から (from / starting point) that you practice across Units 6 and 20.',
    studyTip: 'Complete Step 1, Step 2, and Step 3 for your current unit today.',
  },
  {
    id: 'narau-yori-narero',
    blessing: '中吉',
    blessingRomaji: 'Chūkichi',
    blessingEnglish: 'Middle Blessing',
    japanese: '習うより慣れろ',
    segments: [
      { text: '習', reading: 'なら' },
      { text: 'うより' },
      { text: '慣', reading: 'な' },
      { text: 'れろ' },
    ],
    romaji: 'Narau yori narero',
    literalEnglish: 'Rather than just being taught, get used to it by doing.',
    meaning: 'Active immersion and hands-on practice beat passive memorization.',
    culturalNote:
      'Captures the heart of Bunshō: reading real sentences in context rather than isolated word lists.',
    studyTip: 'Use Sentence Scramble mode to actively build Japanese syntax with your hands.',
  },
  {
    id: 'ashita-wa-ashita-no-kaze',
    blessing: '吉',
    blessingRomaji: 'Kichi',
    blessingEnglish: 'Blessing',
    japanese: '明日は明日の風が吹く',
    segments: [
      { text: '明日', reading: 'あした' },
      { text: 'は' },
      { text: '明日', reading: 'あした' },
      { text: 'の' },
      { text: '風', reading: 'かぜ' },
      { text: 'が' },
      { text: '吹', reading: 'ふ' },
      { text: 'く' },
    ],
    romaji: 'Ashita wa ashita no kaze ga fuku',
    literalEnglish: 'Tomorrow, tomorrow’s wind will blow.',
    meaning: 'Do your best today and greet tomorrow with a calm, refreshed mind.',
    culturalNote:
      'Notice the textbook contrast between は (topic: As for tomorrow) and が (subject: tomorrow’s wind blows)!',
    studyTip: 'Notice how は sets the topic while が marks the active subject on card backs.',
  },
  {
    id: 'warau-kado-ni-wa-fuku',
    blessing: '大吉',
    blessingRomaji: 'Daikichi',
    blessingEnglish: 'Great Blessing',
    japanese: '笑う門には福来る',
    segments: [
      { text: '笑', reading: 'わら' },
      { text: 'う' },
      { text: '門', reading: 'かど' },
      { text: 'には' },
      { text: '福', reading: 'ふく' },
      { text: '来', reading: 'きた' },
      { text: 'る' },
    ],
    romaji: 'Warau kado ni wa fuku kitaru',
    literalEnglish: 'Good fortune comes to the gate of those who smile.',
    meaning: 'A joyful, curious attitude invites good luck and effortless learning.',
    culturalNote:
      'Traditionally recited during Japanese New Year (Oshōgatsu) and painted on festive karuta cards.',
    studyTip: 'Read a Unit Mini-Dialogue story aloud and enjoy the characters’ conversation!',
  },
];

export interface UnitGoshuinMeta {
  unitId: string;
  ordinalKanji: string;
  calligraphyKanji: string;
  shrineTitle: string;
  sealStamp: string;
}

export const UNIT_GOSHUIN_STAMPS: Record<string, UnitGoshuinMeta> = {
  'a11-u01': {
    unitId: 'a11-u01',
    ordinalKanji: '第一番',
    calligraphyKanji: '礼節',
    shrineTitle: '初対面・挨拶之印',
    sealStamp: '挨拶達成',
  },
  'a11-u02': {
    unitId: 'a11-u02',
    ordinalKanji: '第二番',
    calligraphyKanji: '名乗',
    shrineTitle: '自己紹介・所属之印',
    sealStamp: '自己達成',
  },
  'a11-u03': {
    unitId: 'a11-u03',
    ordinalKanji: '第三番',
    calligraphyKanji: '指示',
    shrineTitle: 'これ・それ・所有之印',
    sealStamp: '指示達成',
  },
  'a11-u04': {
    unitId: 'a11-u04',
    ordinalKanji: '第四番',
    calligraphyKanji: '方位',
    shrineTitle: '場所・道案内之印',
    sealStamp: '場所達成',
  },
  'a11-u05': {
    unitId: 'a11-u05',
    ordinalKanji: '第五番',
    calligraphyKanji: '数理',
    shrineTitle: '数字・買物勘定之印',
    sealStamp: '数理達成',
  },
  'a11-u06': {
    unitId: 'a11-u06',
    ordinalKanji: '第六番',
    calligraphyKanji: '刻限',
    shrineTitle: '時間・曜日予定之印',
    sealStamp: '時間達成',
  },
  'a11-u07': {
    unitId: 'a11-u07',
    ordinalKanji: '第七番',
    calligraphyKanji: '存在',
    shrineTitle: '有情・無情存在之印',
    sealStamp: '存在達成',
  },
  'a11-u08': {
    unitId: 'a11-u08',
    ordinalKanji: '第八番',
    calligraphyKanji: '言動',
    shrineTitle: '日常動詞・行動之印',
    sealStamp: '動詞達成',
  },
  'a11-u09': {
    unitId: 'a11-u09',
    ordinalKanji: '第九番',
    calligraphyKanji: '風雅',
    shrineTitle: '形容詞・描写之印',
    sealStamp: '描写達成',
  },
  'a11-u10': {
    unitId: 'a11-u10',
    ordinalKanji: '第十番',
    calligraphyKanji: '好悪',
    shrineTitle: '嗜好・家族紹介之印',
    sealStamp: '嗜好達成',
  },
  'a12-u11': {
    unitId: 'a12-u11',
    ordinalKanji: '第十一番',
    calligraphyKanji: '追憶',
    shrineTitle: '過去形・旅の記憶之印',
    sealStamp: '過去達成',
  },
  'a12-u12': {
    unitId: 'a12-u12',
    ordinalKanji: '第十二番',
    calligraphyKanji: '感想',
    shrineTitle: '過去形容・天候之印',
    sealStamp: '感想達成',
  },
  'a12-u13': {
    unitId: 'a12-u13',
    ordinalKanji: '第十三番',
    calligraphyKanji: '連繋',
    shrineTitle: 'て形・日常順序之印',
    sealStamp: '順序達成',
  },
  'a12-u14': {
    unitId: 'a12-u14',
    ordinalKanji: '第十四番',
    calligraphyKanji: '懇願',
    shrineTitle: '依頼・許可礼儀之印',
    sealStamp: '礼儀達成',
  },
  'a12-u15': {
    unitId: 'a12-u15',
    ordinalKanji: '第十五番',
    calligraphyKanji: '勧誘',
    shrineTitle: '誘い・週末計画之印',
    sealStamp: '勧誘達成',
  },
  'a12-u16': {
    unitId: 'a12-u16',
    ordinalKanji: '第十六番',
    calligraphyKanji: '饗宴',
    shrineTitle: '茶屋・料理注文之印',
    sealStamp: '注文達成',
  },
  'a12-u17': {
    unitId: 'a12-u17',
    ordinalKanji: '第十七番',
    calligraphyKanji: '旅路',
    shrineTitle: '鉄道・乗換案内之印',
    sealStamp: '旅路達成',
  },
  'a12-u18': {
    unitId: 'a12-u18',
    ordinalKanji: '第十八番',
    calligraphyKanji: '躍動',
    shrineTitle: '進行・習慣状態之印',
    sealStamp: '進行達成',
  },
  'a12-u19': {
    unitId: 'a12-u19',
    ordinalKanji: '第十九番',
    calligraphyKanji: '志望',
    shrineTitle: '願望・将来計画之印',
    sealStamp: '願望達成',
  },
  'a12-u20': {
    unitId: 'a12-u20',
    ordinalKanji: '第二十番',
    calligraphyKanji: '結実',
    shrineTitle: '理由・意見表明之印',
    sealStamp: '大願成就',
  },
};

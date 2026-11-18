import { LevelId } from '../types/curriculum';

export interface GrammarHandbookEntry {
  unitId: string;
  unitNumber: number;
  level: LevelId;
  title: string;
  patternFormula: string;
  coreExplanation: string;
  keyTip: string;
  examples: Array<{
    japanese: string;
    reading: string;
    english: string;
  }>;
}

export interface GrammarComparisonCard {
  id: string;
  title: string;
  leftPattern: string;
  rightPattern: string;
  summary: string;
  leftRule: string;
  rightRule: string;
  leftExample: { jp: string; en: string };
  rightExample: { jp: string; en: string };
  relatedUnitIds: string[];
}

export const GRAMMAR_COMPARISONS: GrammarComparisonCard[] = [
  {
    id: 'wa-vs-ga',
    title: 'は (Topic) vs. が (Subject / Focus)',
    leftPattern: 'Noun + は',
    rightPattern: 'Noun + が',
    summary:
      'Both mark the subject/topic, but は sets the broad topic while が spotlights specific or new information, existence, and preferences.',
    leftRule:
      'Use は to introduce the main topic of conversation ("As for X...") or to contrast two known topics.',
    rightRule:
      'Use が with あります/います (existence), 好き/嫌い/上手 (likes/skills), and question words like だれが or なにが.',
    leftExample: { jp: '私は学生です。', en: 'As for me, I am a student.' },
    rightExample: { jp: '部屋に猫がいます。', en: 'There is a cat in the room.' },
    relatedUnitIds: ['a11-u01', 'a11-u05', 'a11-u10'],
  },
  {
    id: 'ni-vs-de',
    title: 'に (Static / Destination) vs. で (Active Location / Means)',
    leftPattern: 'Place + に',
    rightPattern: 'Place / Tool + で',
    summary:
      'Choose に for static existence or movement toward a target; choose で for where an active event takes place or the means used.',
    leftRule:
      'Use に for time points (七時に), destinations (学校に行きます), and static existence (机の上に本があります).',
    rightRule:
      'Use で for the venue of an action verb (図書館で勉強します) and transportation/tools (電車で行きます).',
    leftExample: { jp: '公園にベンチがあります。', en: 'There is a bench in the park (static).' },
    rightExample: { jp: '公園で写真を撮ります。', en: 'I take photos in the park (action).' },
    relatedUnitIds: ['a11-u07', 'a11-u08'],
  },
  {
    id: 'wo-vs-ga',
    title: 'を (Direct Object) vs. が (Preferences & Desires)',
    leftPattern: 'Noun + を + Action Verb',
    rightPattern: 'Noun + が + 好き / 欲しい',
    summary:
      'English uses transitive verbs for "like" or "want", whereas Japanese marks liked or desired things with が instead of を.',
    leftRule:
      'Use を (pronounced "o") strictly for the direct object of an active verb such as 食べます, 飲みます, 見ます, or 買います.',
    rightRule:
      'Use が before 好きです (like), 嫌いです (dislike), 上手です (good at), and 欲しいです (want an object).',
    leftExample: { jp: '毎朝コーヒーを飲みます。', en: 'I drink coffee every morning.' },
    rightExample: { jp: '私はコーヒーが好きです。', en: 'I like coffee.' },
    relatedUnitIds: ['a11-u06', 'a11-u10', 'a12-u08'],
  },
  {
    id: 'ni-vs-he',
    title: 'に (Specific Target & Time) vs. へ (Direction of Travel)',
    leftPattern: 'Target / Time + に',
    rightPattern: 'Destination + へ',
    summary:
      'Both can mark destinations with 行きます, 来ます, and 帰ります, but に emphasizes arrival at a point while へ emphasizes the direction.',
    leftRule:
      'Use に for destinations AND for specific clock times (七時に) or static locations (部屋にいます).',
    rightRule:
      'Use へ (pronounced "e") only with movement verbs (行きます・来ます・帰ります) to highlight heading toward a place.',
    leftExample: { jp: '七時に駅に着きます。', en: 'I arrive at the station at 7:00.' },
    rightExample: { jp: '来週、京都へ行きます。', en: 'Next week, I will head to Kyoto.' },
    relatedUnitIds: ['a11-u04', 'a11-u07'],
  },
  {
    id: 'arimasu-vs-imasu',
    title: 'あります (Inanimate) vs. います (Living Beings)',
    leftPattern: 'Thing + が あります',
    rightPattern: 'Person / Animal + が います',
    summary:
      'Japanese distinguishes existence verbs based on whether the subject can move on its own volition.',
    leftRule:
      'Use あります for non-living objects, plants, buildings, events, and abstract things like time (時間があります).',
    rightRule:
      'Use います for people, family members, friends, dogs, cats, birds, and fish.',
    leftExample: { jp: '駅の前に銀行があります。', en: 'There is a bank in front of the station.' },
    rightExample: { jp: '庭に白い犬がいます。', en: 'There is a white dog in the garden.' },
    relatedUnitIds: ['a11-u05'],
  },
  {
    id: 'masenka-vs-mashou',
    title: '〜ませんか (Polite Invitation) vs. 〜ましょう (Let’s...)',
    leftPattern: 'Verb stem + ませんか',
    rightPattern: 'Verb stem + ましょう',
    summary:
      'Both are used when making social plans, differing in how much initiative the speaker takes.',
    leftRule:
      'Use 〜ませんか ("Won’t you...?") to politely invite someone while giving them an easy way to accept or decline.',
    rightRule:
      'Use 〜ましょう ("Let’s...") to enthusiastically accept an invitation or propose a shared action right away.',
    leftExample: { jp: '一緒にお茶を飲みませんか。', en: 'Won’t you drink tea together?' },
    rightExample: { jp: 'ええ、飲みましょう！', en: 'Yes, let’s drink!' },
    relatedUnitIds: ['a12-u05'],
  },
  {
    id: 'i-adj-vs-na-adj',
    title: 'い-Adjectives vs. な-Adjectives',
    leftPattern: '〜い (高い・おいしい)',
    rightPattern: '〜な (静かな・有名な)',
    summary:
      'The two Japanese adjective classes conjugate differently in the negative and past tenses.',
    leftRule:
      'Drop final い and add くないです (negative), かったです (past), or くなかったです (past negative). Never add な before a noun.',
    rightRule:
      'Place な before a modified noun (静かな町), and conjugate like Nouns + です / ではありません / でした.',
    leftExample: { jp: '昨日は寒かったです。', en: 'Yesterday was cold.' },
    rightExample: { jp: 'この町は静かでした。', en: 'This town was quiet.' },
    relatedUnitIds: ['a11-u09', 'a11-u10', 'a12-u02'],
  },
  {
    id: 'kore-vs-kono',
    title: 'これ・それ・あれ (Standalone) vs. この・その・あの (+ Noun)',
    leftPattern: 'これ / それ / あれ',
    rightPattern: 'この / その / あの + Noun',
    summary:
      'Demonstratives change ending depending on whether they stand alone as a pronoun or directly precede a noun.',
    leftRule:
      'Use これ (this thing), それ (that thing near listener), あれ (that thing over there) alone followed by a particle.',
    rightRule:
      'Use この + Noun (this N), その + Noun (that N), あの + Noun (that N over there) directly attached to a noun.',
    leftExample: { jp: 'これは私の傘です。', en: 'This is my umbrella.' },
    rightExample: { jp: 'この傘は私のです。', en: 'This umbrella is mine.' },
    relatedUnitIds: ['a11-u02'],
  },
];

export const GRAMMAR_HANDBOOK: GrammarHandbookEntry[] = [
  {
    unitId: 'a11-u01',
    unitNumber: 1,
    level: 'A1.1',
    title: 'Identity, Topic は & Polite Copula です',
    patternFormula: '[Topic] は [Noun] です / ではありません',
    coreExplanation: 'Introduces the topic with は (pronounced "wa") and concludes politely with です ("is/am/are") or ではありません ("is not"). Add か at the end to form a yes/no question.',
    keyTip: 'Remember that the topic particle is written with the hiragana は (ha) but always pronounced "wa".',
    examples: [
      { japanese: '私は学生です。', reading: 'わたしはがくせいです。', english: 'I am a student.' },
      { japanese: '田中さんは先生ではありません。', reading: 'たなかさんはせんせいではありません。', english: 'Mr. Tanaka is not a teacher.' },
    ],
  },
  {
    unitId: 'a11-u02',
    unitNumber: 2,
    level: 'A1.1',
    title: 'Demonstratives (これ・それ・あれ) & Particle の',
    patternFormula: 'これ/それ/あれ は [Owner] の [Noun] です',
    coreExplanation: 'これ refers to items near the speaker, それ near the listener, and あれ away from both. The particle の links two nouns to show possession or category.',
    keyTip: 'Use この/その/あの when placing a noun immediately after the demonstrative (e.g., この本).',
    examples: [
      { japanese: 'これは日本語の本です。', reading: 'これはにほんごのほんです。', english: 'This is a Japanese book.' },
      { japanese: 'そのかばんは私のです。', reading: 'そのかばんはわたしのです。', english: 'That bag is mine.' },
    ],
  },
  {
    unitId: 'a11-u03',
    unitNumber: 3,
    level: 'A1.1',
    title: 'Place Words (ここ・そこ・あそこ・どこ)',
    patternFormula: '[Place / Facility] は ここ/そこ/あそこ です',
    coreExplanation: 'Points out locations relative to speaker and listener and asks where things are using どこですか.',
    keyTip: 'To ask where a specific facility is, put the facility first as the topic: お手洗いはどこですか。',
    examples: [
      { japanese: '駅はあそこです。', reading: 'えきはあそこです。', english: 'The station is over there.' },
      { japanese: '受付はどこですか。', reading: 'うけつけはどこですか。', english: 'Where is the reception desk?' },
    ],
  },
  {
    unitId: 'a11-u04',
    unitNumber: 4,
    level: 'A1.1',
    title: 'Clock Time, Ages & Ranges (から・まで)',
    patternFormula: '[Start] から [End] まで です',
    coreExplanation: 'Combines numbers with 〜時 (o’clock), 〜分 (minutes), and 〜歳 (years old). から marks the starting point ("from") and まで marks the ending limit ("until/to").',
    keyTip: 'Watch out for irregular sound readings: 四時 (よじ), 七時 (しちじ), 九時 (くじ).',
    examples: [
      { japanese: '今は午前九時半です。', reading: 'いまはごぜんくじはんです。', english: 'It is 9:30 AM now.' },
      { japanese: '銀行は九時から三時までです。', reading: 'ぎんこうはくじからさんじまでです。', english: 'The bank is open from 9:00 to 3:00.' },
    ],
  },
  {
    unitId: 'a11-u05',
    unitNumber: 5,
    level: 'A1.1',
    title: 'Existence (あります & います) & Spatial Nouns',
    patternFormula: '[Place] に [Thing/Person] が あります / います',
    coreExplanation: 'Uses に to mark where something exists and が to introduce the item or person. Use あります for inanimate objects and います for people and animals.',
    keyTip: 'Spatial words like 上 (on), 下 (under), 中 (inside), 隣 (next to) attach via の: 机の上 (on the desk).',
    examples: [
      { japanese: '机の上にノートがあります。', reading: 'つくえのうえにノートがあります。', english: 'There is a notebook on the desk.' },
      { japanese: '公園に子供がいます。', reading: 'こうえんにこどもがいます。', english: 'There are children in the park.' },
    ],
  },
  {
    unitId: 'a11-u06',
    unitNumber: 6,
    level: 'A1.1',
    title: 'Polite Present Verbs & Direct Object を',
    patternFormula: '[Direct Object] を [Verb 〜ます / 〜ません]',
    coreExplanation: 'The particle を (pronounced "o") marks the direct object of transitive verbs like 食べます (eat), 飲みます (drink), 見ます (watch), and 読みます (read).',
    keyTip: 'In Japanese, 〜ます covers both habitual present ("I drink") and definite future ("I will drink").',
    examples: [
      { japanese: '毎朝、水を飲みます。', reading: 'まいあさ、みずをのみます。', english: 'Every morning, I drink water.' },
      { japanese: '夜はコーヒーを飲みません。', reading: 'よるはコーヒーをのみません。', english: 'I do not drink coffee at night.' },
    ],
  },
  {
    unitId: 'a11-u07',
    unitNumber: 7,
    level: 'A1.1',
    title: 'Destinations (に/へ), Transport (で) & Companions (と)',
    patternFormula: '[Person] と [Transport] で [Destination] へ/に 行きます',
    coreExplanation: 'Marks the destination with に or へ, the vehicle/means with で, and the person accompanying you with と.',
    keyTip: 'When walking on foot, use the fixed expression 歩いて (aruite) without で: 歩いて行きます.',
    examples: [
      { japanese: '電車で会社に行きます。', reading: 'でんしゃでかいしゃにいきます。', english: 'I go to the office by train.' },
      { japanese: '友達と京都へ行きます。', reading: 'ともだちときょうとへいきます。', english: 'I go to Kyoto with my friend.' },
    ],
  },
  {
    unitId: 'a11-u08',
    unitNumber: 8,
    level: 'A1.1',
    title: 'Action Locations (で) & Frequency Adverbs',
    patternFormula: '[Frequency] + [Place] で [Object] を [Verb 〜ます]',
    coreExplanation: 'Marks the location where an activity takes place with で, paired with adverbs like 毎日 (every day), よく (often), ときどき (sometimes), and あまり〜ません (not very much).',
    keyTip: 'あまり must always be paired with a negative verb or adjective at the end of the sentence.',
    examples: [
      { japanese: '図書館で日本語を勉強します。', reading: 'としょかんでにほんごをべんきょうします。', english: 'I study Japanese at the library.' },
      { japanese: 'あまりテレビを見ません。', reading: 'あまりテレビをみません。', english: 'I do not watch TV very much.' },
    ],
  },
  {
    unitId: 'a11-u09',
    unitNumber: 9,
    level: 'A1.1',
    title: 'Present い-Adjectives (Affirmative & Negative)',
    patternFormula: '[Noun] は [い-Adj] です / [Stem] + くないです',
    coreExplanation: 'い-adjectives end in い and can directly modify nouns (新しい本) or stand before です. To make them negative, replace the final い with くないです.',
    keyTip: 'いい (good) is irregular: its negative form uses the stem よ -> よくないです.',
    examples: [
      { japanese: '今日はとても暑いです。', reading: 'きょうはとてもあついです。', english: 'It is very hot today.' },
      { japanese: 'この店は高くないです。', reading: 'このみせはたかくないです。', english: 'This shop is not expensive.' },
    ],
  },
  {
    unitId: 'a11-u10',
    unitNumber: 10,
    level: 'A1.1',
    title: 'な-Adjectives & Likes / Dislikes (好き・嫌い)',
    patternFormula: '[Item] が 好きです / [な-Adj] な + Noun',
    coreExplanation: 'な-adjectives take な when placed directly before a noun (静かな部屋) and conjugate with です / ではありません. Likes (好き) and skills (上手) mark their target with が.',
    keyTip: 'きれい (pretty/clean) and 有名 (famous) end in an "i" sound in romaji, but they are な-adjectives!',
    examples: [
      { japanese: '私は日本料理が好きです。', reading: 'わたしは日本りょうりがすきです。', english: 'I like Japanese food.' },
      { japanese: 'ここは静かな公園です。', reading: 'ここはしずかなこうえんです。', english: 'This is a quiet park.' },
    ],
  },
  {
    unitId: 'a12-u01',
    unitNumber: 11,
    level: 'A1.2',
    title: 'Polite Past Verbs (〜ました & 〜ませんでした)',
    patternFormula: '[Time] + [Object] を [Verb 〜ました / 〜ませんでした]',
    coreExplanation: 'Describes completed past events by changing 〜ます to 〜ました (affirmative past) and 〜ません to 〜ませんでした (negative past).',
    keyTip: 'Relative time words like 昨日 (yesterday) and 先週 (last week) do not need the particle に.',
    examples: [
      { japanese: '昨日、友達と映画を見ました。', reading: 'きのう、ともだちとえいがをみました。', english: 'Yesterday, I watched a movie with my friend.' },
      { japanese: '今朝は何も食べませんでした。', reading: 'けさはなにもたべませんでした。', english: 'I did not eat anything this morning.' },
    ],
  },
  {
    unitId: 'a12-u02',
    unitNumber: 12,
    level: 'A1.2',
    title: 'Past Adjectives & Nouns (〜かったです & 〜でした)',
    patternFormula: '[い-Adj stem] + かったです / [な-Adj / Noun] + でした',
    coreExplanation: 'For い-adjectives, drop い and add かったです (or くなかったです for past negative). For な-adjectives and nouns, use でした and ではありませんでした.',
    keyTip: 'Use どうでしたか ("How was it?") when asking someone for their impression of a past trip or meal.',
    examples: [
      { japanese: '旅行はとても楽しかったです。', reading: 'りょこうはとてもたのしかったです。', english: 'The trip was very fun.' },
      { japanese: '昨日は雨でした。', reading: 'きのうはあめでした。', english: 'Yesterday was rainy.' },
    ],
  },
  {
    unitId: 'a12-u03',
    unitNumber: 13,
    level: 'A1.2',
    title: 'Connecting Sequential Actions with て-Form',
    patternFormula: '[Action 1 て-form]、[Action 2 〜ます]',
    coreExplanation: 'Links two or more actions in chronological order ("do A, and then do B"). The final verb at the end of the sentence determines the overall tense.',
    keyTip: 'You can also use 〜てから after the first verb to emphasize "after finishing Action 1, I do Action 2".',
    examples: [
      { japanese: '毎朝、七時に起きて、学校に行きます。', reading: 'まいあさ、しちじにおきて、がっこうにいきます。', english: 'Every morning, I wake up at 7:00 and go to school.' },
      { japanese: '手を洗ってから、ご飯を食べます。', reading: 'てをあらってから、ごはんをたべます。', english: 'After washing my hands, I eat a meal.' },
    ],
  },
  {
    unitId: 'a12-u04',
    unitNumber: 14,
    level: 'A1.2',
    title: 'Polite Requests with 〜てください',
    patternFormula: '[Verb て-form] + ください',
    coreExplanation: 'Combines a verb’s て-form with ください to make a polite request ("Please do..."). Frequently paired with ちょっと (a little) or ゆっくり (slowly).',
    keyTip: 'In classroom or travel settings, もう一{度|ど}言ってください ("Please say it one more time") is indispensable.',
    examples: [
      { japanese: 'ここに名前を書いてください。', reading: 'ここになまえをかいてください。', english: 'Please write your name here.' },
      { japanese: 'ゆっくり話してください。', reading: 'ゆっくりはなしてください。', english: 'Please speak slowly.' },
    ],
  },
  {
    unitId: 'a12-u05',
    unitNumber: 15,
    level: 'A1.2',
    title: 'Invitations (〜ませんか) & Suggestions (〜ましょう)',
    patternFormula: '[Verb stem] + ませんか / ましょう',
    coreExplanation: 'Uses the negative question 〜ませんか to politely invite someone, and 〜ましょう to say "Let’s do it together".',
    keyTip: 'Add 一緒に (issho ni — "together") before the verb to make invitations sound natural and warm.',
    examples: [
      { japanese: '土曜日に一緒に映画を見ませんか。', reading: 'どようびにいっしょにえいがをみませんか。', english: 'Won’t you watch a movie together on Saturday?' },
      { japanese: '駅の前で会いましょう。', reading: 'えきのまえであいましょう。', english: 'Let’s meet in front of the station.' },
    ],
  },
  {
    unitId: 'a12-u06',
    unitNumber: 16,
    level: 'A1.2',
    title: 'Ordering with 〜をください & Common Counters',
    patternFormula: '[Noun] を [Counter] ください',
    coreExplanation: 'Requests specific items in shops or restaurants. Notice that the counter (一つ, 二枚, 三杯) usually appears after the particle を without an extra particle.',
    keyTip: 'General counter 〜つ (一つ, 二つ, 三つ...) works for most 3D objects up to ten!',
    examples: [
      { japanese: 'コーヒーを二杯ください。', reading: 'コーヒーをにはいください。', english: 'Two cups of coffee, please.' },
      { japanese: 'りんごを三つ買いました。', reading: 'りんごをみっつかいました。', english: 'I bought three apples.' },
    ],
  },
  {
    unitId: 'a12-u07',
    unitNumber: 17,
    level: 'A1.2',
    title: 'Ongoing Actions & Present Status (〜ています)',
    patternFormula: '[Verb て-form] + います',
    coreExplanation: 'Expresses an action happening right now ("is doing") or a continuing state resulting from a past action, such as 住んでいます (live in) or 持っています (have/carry).',
    keyTip: 'To say where you currently live, always use に住んでいます (never 住みます).',
    examples: [
      { japanese: '今、雨が降っています。', reading: 'いま、あめがふっています。', english: 'It is raining right now.' },
      { japanese: '私は東京に住んでいます。', reading: 'わたしはとうきょうにすんでいます。', english: 'I live in Tokyo.' },
    ],
  },
  {
    unitId: 'a12-u08',
    unitNumber: 18,
    level: 'A1.2',
    title: 'Expressing Desires (〜たいです & 〜が欲しいです)',
    patternFormula: '[Verb stem] + たいです / [Noun] が 欲しいです',
    coreExplanation: 'Attach たいです to a verb stem (Removing ます) to express what you want to do, and use [Noun] が 欲しいです for an object you want to have.',
    keyTip: '〜たいです conjugates just like an い-adjective: 行きたいです -> 行きたくないです.',
    examples: [
      { japanese: '日本へ行きたいです。', reading: 'にほんへいきたいです。', english: 'I want to go to Japan.' },
      { japanese: '新しい自転車が欲しいです。', reading: 'あたらしいじてんしゃがほしいです。', english: 'I want a new bicycle.' },
    ],
  },
  {
    unitId: 'a12-u09',
    unitNumber: 19,
    level: 'A1.2',
    title: 'Stating Reasons with から & Contrast with が',
    patternFormula: '[Reason Clause] から、[Result Clause]',
    coreExplanation: 'Places the reason clause first followed by から ("because / so"), then states the result or action. Uses が between two polite clauses to mean "but".',
    keyTip: 'In Japanese, the "because" clause (〜から) normally comes BEFORE the main conclusion.',
    examples: [
      { japanese: '時間がありませんから、タクシーで行きます。', reading: 'じかんがありませんから、タクシーでいきます。', english: 'Because I don’t have time, I will go by taxi.' },
      { japanese: 'この部屋は小さいですが、きれいです。', reading: 'このへやはちいさいですが、きれいです。', english: 'This room is small, but it is clean.' },
    ],
  },
  {
    unitId: 'a12-u10',
    unitNumber: 20,
    level: 'A1.2',
    title: 'Elementary Comparisons (どちら・のほうが・一番)',
    patternFormula: 'A と B と どちらが [Adj] ですか → A のほうが [Adj] です',
    coreExplanation: 'Compares two items using AとBとどちらが〜ですか ("Between A and B, which is more...?") and answers with 〜のほうが〜です. Uses 一番 (ichiban) for "the most / #1".',
    keyTip: 'Use どちら (dochira) whenever choosing between two options.',
    examples: [
      { japanese: '電車とバスとどちらが速いですか。', reading: 'でんしゃとバスとどちらがはやいですか。', english: 'Between the train and the bus, which is faster?' },
      { japanese: '果物の中でいちごが一番好きです。', reading: 'くだもののなかでいちごがいちばんすきです。', english: 'Among fruits, I like strawberries the best.' },
    ],
  },
];

export interface KanaCell {
  kana: string;
  romaji: string;
  exampleWord: string;
  exampleMeaning: string;
}

export const HIRAGANA_GOJUON: KanaCell[] = [
  { kana: 'あ', romaji: 'a', exampleWord: '朝 (あさ)', exampleMeaning: 'morning' },
  { kana: 'い', romaji: 'i', exampleWord: '犬 (いぬ)', exampleMeaning: 'dog' },
  { kana: 'う', romaji: 'u', exampleWord: '上 (うえ)', exampleMeaning: 'up / above' },
  { kana: 'え', romaji: 'e', exampleWord: '駅 (えき)', exampleMeaning: 'station' },
  { kana: 'お', romaji: 'o', exampleWord: 'お茶 (おちゃ)', exampleMeaning: 'tea' },

  { kana: 'か', romaji: 'ka', exampleWord: '傘 (かさ)', exampleMeaning: 'umbrella' },
  { kana: 'き', romaji: 'ki', exampleWord: '木 (き)', exampleMeaning: 'tree' },
  { kana: 'く', romaji: 'ku', exampleWord: '車 (くるま)', exampleMeaning: 'car' },
  { kana: 'け', romaji: 'ke', exampleWord: '今朝 (けさ)', exampleMeaning: 'this morning' },
  { kana: 'こ', romaji: 'ko', exampleWord: 'ここ', exampleMeaning: 'here' },

  { kana: 'さ', romaji: 'sa', exampleWord: '魚 (さかな)', exampleMeaning: 'fish' },
  { kana: 'し', romaji: 'shi', exampleWord: '仕事 (しごと)', exampleMeaning: 'work' },
  { kana: 'す', romaji: 'su', exampleWord: '好き (すき)', exampleMeaning: 'like' },
  { kana: 'せ', romaji: 'se', exampleWord: '先生 (せんせい)', exampleMeaning: 'teacher' },
  { kana: 'そ', romaji: 'so', exampleWord: '外 (そと)', exampleMeaning: 'outside' },

  { kana: 'た', romaji: 'ta', exampleWord: '高い (たかい)', exampleMeaning: 'tall / expensive' },
  { kana: 'ち', romaji: 'chi', exampleWord: '父 (ちち)', exampleMeaning: 'father' },
  { kana: 'つ', romaji: 'tsu', exampleWord: '机 (つくえ)', exampleMeaning: 'desk' },
  { kana: 'て', romaji: 'te', exampleWord: '手 (て)', exampleMeaning: 'hand' },
  { kana: 'と', romaji: 'to', exampleWord: '友達 (ともだち)', exampleMeaning: 'friend' },

  { kana: 'な', romaji: 'na', exampleWord: '夏 (なつ)', exampleMeaning: 'summer' },
  { kana: 'に', romaji: 'ni', exampleWord: '日本 (にほん)', exampleMeaning: 'Japan' },
  { kana: 'ぬ', romaji: 'nu', exampleWord: '犬 (いぬ)', exampleMeaning: 'dog' },
  { kana: 'ね', romaji: 'ne', exampleWord: '猫 (ねこ)', exampleMeaning: 'cat' },
  { kana: 'の', romaji: 'no', exampleWord: '飲みます (のみます)', exampleMeaning: 'drink' },

  { kana: 'は', romaji: 'ha', exampleWord: '母 (はは)', exampleMeaning: 'mother' },
  { kana: 'ひ', romaji: 'hi', exampleWord: '人 (ひと)', exampleMeaning: 'person' },
  { kana: 'ふ', romaji: 'fu', exampleWord: '冬 (ふゆ)', exampleMeaning: 'winter' },
  { kana: 'へ', romaji: 'he', exampleWord: '部屋 (へや)', exampleMeaning: 'room' },
  { kana: 'ほ', romaji: 'ho', exampleWord: '本 (ほん)', exampleMeaning: 'book' },

  { kana: 'ま', romaji: 'ma', exampleWord: '町 (まち)', exampleMeaning: 'town' },
  { kana: 'み', romaji: 'mi', exampleWord: '水 (みず)', exampleMeaning: 'water' },
  { kana: 'む', romaji: 'mu', exampleWord: '六つ (むっつ)', exampleMeaning: 'six items' },
  { kana: 'め', romaji: 'me', exampleWord: '雨 (あめ)', exampleMeaning: 'rain' },
  { kana: 'も', romaji: 'mo', exampleWord: 'もっと', exampleMeaning: 'more' },

  { kana: 'や', romaji: 'ya', exampleWord: '休み (やすみ)', exampleMeaning: 'holiday / rest' },
  { kana: 'ゆ', romaji: 'yu', exampleWord: '雪 (ゆき)', exampleMeaning: 'snow' },
  { kana: 'よ', romaji: 'yo', exampleWord: '夜 (よる)', exampleMeaning: 'night' },

  { kana: 'ら', romaji: 'ra', exampleWord: '来週 (らいしゅう)', exampleMeaning: 'next week' },
  { kana: 'り', romaji: 'ri', exampleWord: 'りんご', exampleMeaning: 'apple' },
  { kana: 'る', romaji: 'ru', exampleWord: '昼 (ひる)', exampleMeaning: 'noon / daytime' },
  { kana: 'れ', romaji: 're', exampleWord: 'これ', exampleMeaning: 'this' },
  { kana: 'ろ', romaji: 'ro', exampleWord: '六時 (ろくじ)', exampleMeaning: '6 o’clock' },

  { kana: 'わ', romaji: 'wa', exampleWord: '私 (わたし)', exampleMeaning: 'I / me' },
  { kana: 'を', romaji: 'wo (o)', exampleWord: '水を (みずを)', exampleMeaning: 'object particle' },
  { kana: 'ん', romaji: 'n', exampleWord: '本 (ほん)', exampleMeaning: 'book' },
];

export const KATAKANA_GOJUON: KanaCell[] = [
  { kana: 'ア', romaji: 'a', exampleWord: 'アメリカ', exampleMeaning: 'America' },
  { kana: 'イ', romaji: 'i', exampleWord: 'イギリス', exampleMeaning: 'UK' },
  { kana: 'ウ', romaji: 'u', exampleWord: 'ウール', exampleMeaning: 'wool' },
  { kana: 'エ', romaji: 'e', exampleWord: 'エレベーター', exampleMeaning: 'elevator' },
  { kana: 'オ', romaji: 'o', exampleWord: 'オレンジ', exampleMeaning: 'orange' },

  { kana: 'カ', romaji: 'ka', exampleWord: 'カメラ', exampleMeaning: 'camera' },
  { kana: 'キ', romaji: 'ki', exampleWord: 'キッチン', exampleMeaning: 'kitchen' },
  { kana: 'ク', romaji: 'ku', exampleWord: 'クラス', exampleMeaning: 'class' },
  { kana: 'ケ', romaji: 'ke', exampleWord: 'ケーキ', exampleMeaning: 'cake' },
  { kana: 'コ', romaji: 'ko', exampleWord: 'コーヒー', exampleMeaning: 'coffee' },

  { kana: 'サ', romaji: 'sa', exampleWord: 'サッカー', exampleMeaning: 'soccer' },
  { kana: 'シ', romaji: 'shi', exampleWord: 'シャツ', exampleMeaning: 'shirt' },
  { kana: 'ス', romaji: 'su', exampleWord: 'スマホ', exampleMeaning: 'smartphone' },
  { kana: 'セ', romaji: 'se', exampleWord: 'セーター', exampleMeaning: 'sweater' },
  { kana: 'ソ', romaji: 'so', exampleWord: 'ソファ', exampleMeaning: 'sofa' },

  { kana: 'タ', romaji: 'ta', exampleWord: 'タクシー', exampleMeaning: 'taxi' },
  { kana: 'チ', romaji: 'chi', exampleWord: 'チーズ', exampleMeaning: 'cheese' },
  { kana: 'ツ', romaji: 'tsu', exampleWord: 'ツアー', exampleMeaning: 'tour' },
  { kana: 'テ', romaji: 'te', exampleWord: 'テレビ', exampleMeaning: 'television' },
  { kana: 'ト', romaji: 'to', exampleWord: 'トイレ', exampleMeaning: 'restroom' },

  { kana: 'ナ', romaji: 'na', exampleWord: 'ナイフ', exampleMeaning: 'knife' },
  { kana: 'ニ', romaji: 'ni', exampleWord: 'ニュース', exampleMeaning: 'news' },
  { kana: 'ヌ', romaji: 'nu', exampleWord: 'カヌー', exampleMeaning: 'canoe' },
  { kana: 'ネ', romaji: 'ne', exampleWord: 'ネクタイ', exampleMeaning: 'necktie' },
  { kana: 'ノ', romaji: 'no', exampleWord: 'ノート', exampleMeaning: 'notebook' },

  { kana: 'ハ', romaji: 'ha', exampleWord: 'ハンバーガー', exampleMeaning: 'hamburger' },
  { kana: 'ヒ', romaji: 'hi', exampleWord: 'ヒーター', exampleMeaning: 'heater' },
  { kana: 'フ', romaji: 'fu', exampleWord: 'フォーク', exampleMeaning: 'fork' },
  { kana: 'ヘ', romaji: 'he', exampleWord: 'ヘルメット', exampleMeaning: 'helmet' },
  { kana: 'ホ', romaji: 'ho', exampleWord: 'ホテル', exampleMeaning: 'hotel' },

  { kana: 'マ', romaji: 'ma', exampleWord: 'メニュー', exampleMeaning: 'menu' },
  { kana: 'ミ', romaji: 'mi', exampleWord: 'ミルク', exampleMeaning: 'milk' },
  { kana: 'ム', romaji: 'mu', exampleWord: 'ゲーム', exampleMeaning: 'game' },
  { kana: 'メ', romaji: 'me', exampleWord: 'メモ', exampleMeaning: 'memo' },
  { kana: 'モ', romaji: 'mo', exampleWord: 'モデル', exampleMeaning: 'model' },

  { kana: 'ヤ', romaji: 'ya', exampleWord: 'タイヤ', exampleMeaning: 'tire' },
  { kana: 'ユ', romaji: 'yu', exampleWord: 'ユニーク', exampleMeaning: 'unique' },
  { kana: 'ヨ', romaji: 'yo', exampleWord: 'ヨーグルト', exampleMeaning: 'yogurt' },

  { kana: 'ラ', romaji: 'ra', exampleWord: 'ラーメン', exampleMeaning: 'ramen' },
  { kana: 'リ', romaji: 'ri', exampleWord: 'リモコン', exampleMeaning: 'remote' },
  { kana: 'ル', romaji: 'ru', exampleWord: 'ルール', exampleMeaning: 'rule' },
  { kana: 'レ', romaji: 're', exampleWord: 'レストラン', exampleMeaning: 'restaurant' },
  { kana: 'ロ', romaji: 'ro', exampleWord: 'ロビー', exampleMeaning: 'lobby' },

  { kana: 'ワ', romaji: 'wa', exampleWord: 'ワイン', exampleMeaning: 'wine' },
  { kana: 'ヲ', romaji: 'wo', exampleWord: 'ヲ', exampleMeaning: 'katakana wo' },
  { kana: 'ン', romaji: 'n', exampleWord: 'パン', exampleMeaning: 'bread' },
];

import { LevelId, RubySegment } from '../types/curriculum';
import { parseAnnotatedJapanese } from '../utils/furigana';

export interface DialogueLine {
  speaker: string;
  speakerRole: 'A' | 'B';
  annotatedJapanese: string;
  japanese: string;
  segments: RubySegment[];
  english: string;
}

export interface UnitDialogueStory {
  unitId: string;
  unitNumber: number;
  level: LevelId;
  title: string;
  japaneseTitle: string;
  setting: string;
  lines: DialogueLine[];
  comprehensionQuestion: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

interface RawDialogueSeed {
  unitId: string;
  unitNumber: number;
  level: LevelId;
  title: string;
  japaneseTitle: string;
  setting: string;
  lines: Array<{
    speaker: string;
    speakerRole: 'A' | 'B';
    annotatedJapanese: string;
    english: string;
  }>;
  comprehensionQuestion: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

const RAW_DIALOGUES: RawDialogueSeed[] = [
  {
    unitId: 'a11-u01',
    unitNumber: 1,
    level: 'A1.1',
    title: 'Meeting a New Neighbor',
    japaneseTitle: '新しい隣人とのあいさつ',
    setting: 'In the lobby of an apartment building in Tokyo during the morning.',
    lines: [
      {
        speaker: '佐藤 (Sato)',
        speakerRole: 'A',
        annotatedJapanese: 'おはようございます。{私|わたし}は{佐藤|さとう}です。',
        english: 'Good morning. I am Sato.',
      },
      {
        speaker: 'ミラー (Miller)',
        speakerRole: 'B',
        annotatedJapanese: 'おはようございます。はじめまして。{私|わたし}はミラーです。',
        english: 'Good morning. Nice to meet you. I am Miller.',
      },
      {
        speaker: '佐藤 (Sato)',
        speakerRole: 'A',
        annotatedJapanese: 'ミラーさんは{学生|がくせい}ですか。',
        english: 'Are you a student, Mr. Miller?',
      },
      {
        speaker: 'ミラー (Miller)',
        speakerRole: 'B',
        annotatedJapanese: 'いいえ、{学生|がくせい}ではありません。{会社員|かいしゃいん}です。どうぞよろしくお{願|ねが}いします。',
        english: 'No, I am not a student. I am an office worker. Pleased to meet you.',
      },
    ],
    comprehensionQuestion: {
      question: 'What is Mr. Miller’s occupation?',
      options: ['He is a university student', 'He is an office worker (会社員)', 'He is a teacher'],
      correctIndex: 1,
      explanation: 'Miller says 「学生ではありません。会社員です。」 ("I am not a student. I am an office worker.").',
    },
  },
  {
    unitId: 'a11-u02',
    unitNumber: 2,
    level: 'A1.1',
    title: 'At the Study Desk',
    japaneseTitle: '机の上の持ち物',
    setting: 'Two classmates checking items left on a classroom desk.',
    lines: [
      {
        speaker: '田中 (Tanaka)',
        speakerRole: 'A',
        annotatedJapanese: 'すみません、これはあなたの{辞書|じしょ}ですか。',
        english: 'Excuse me, is this your dictionary?',
      },
      {
        speaker: 'アンナ (Anna)',
        speakerRole: 'B',
        annotatedJapanese: 'いいえ、それは{私|わたし}の{辞書|じしょ}ではありません。{先生|せんせい}のです。',
        english: 'No, that is not my dictionary. It is the teacher’s.',
      },
      {
        speaker: '田中 (Tanaka)',
        speakerRole: 'A',
        annotatedJapanese: 'そうですか。この{日本語|にほんご}のノートも{先生|せんせい}のですか。',
        english: 'I see. Is this Japanese notebook also the teacher’s?',
      },
      {
        speaker: 'アンナ (Anna)',
        speakerRole: 'B',
        annotatedJapanese: 'いいえ、そのノートは{私|わたし}のです。ありがとうございます。',
        english: 'No, that notebook is mine. Thank you.',
      },
    ],
    comprehensionQuestion: {
      question: 'Whose Japanese notebook is on the desk?',
      options: ['It belongs to the teacher', 'It belongs to Anna', 'It belongs to Tanaka'],
      correctIndex: 1,
      explanation: 'Anna replies 「そのノートは私のです。」 ("That notebook is mine.").',
    },
  },
  {
    unitId: 'a11-u03',
    unitNumber: 3,
    level: 'A1.1',
    title: 'Finding Your Way in a Department Store',
    japaneseTitle: 'デパートの案内',
    setting: 'Asking a clerk where facilities are inside a store.',
    lines: [
      {
        speaker: '客 (Shopper)',
        speakerRole: 'A',
        annotatedJapanese: 'すみません、お{手洗|てあら}いはどこですか。',
        english: 'Excuse me, where is the restroom?',
      },
      {
        speaker: '店員 (Clerk)',
        speakerRole: 'B',
        annotatedJapanese: 'お{手洗|てあら}いはあそこです。エレベーターの{隣|となり}です。',
        english: 'The restroom is over there. It is next to the elevator.',
      },
      {
        speaker: '客 (Shopper)',
        speakerRole: 'A',
        annotatedJapanese: '{本屋|ほんや}もこの{階|かい}ですか。',
        english: 'Is the bookstore also on this floor?',
      },
      {
        speaker: '店員 (Clerk)',
        speakerRole: 'B',
        annotatedJapanese: 'いいえ、ここは{一階|いっかい}です。{本屋|ほんや}は{三階|さんがい}です。',
        english: 'No, this is the first floor. The bookstore is on the third floor.',
      },
    ],
    comprehensionQuestion: {
      question: 'Where is the bookstore located?',
      options: ['Next to the elevator on the first floor', 'On the third floor (三階)', 'Across from the station'],
      correctIndex: 1,
      explanation: 'The clerk states 「本屋は三階です。」 ("The bookstore is on the third floor.").',
    },
  },
  {
    unitId: 'a11-u04',
    unitNumber: 4,
    level: 'A1.1',
    title: 'Library Opening Hours',
    japaneseTitle: '図書館の時間',
    setting: 'Two students checking the city library schedule.',
    lines: [
      {
        speaker: '健太 (Kenta)',
        speakerRole: 'A',
        annotatedJapanese: '{今|いま}、{何時|なんじ}ですか。',
        english: 'What time is it now?',
      },
      {
        speaker: '美咲 (Misaki)',
        speakerRole: 'B',
        annotatedJapanese: '{午前|ごぜん}{八時|はちじ}{半|はん}です。',
        english: 'It is 8:30 AM.',
      },
      {
        speaker: '健太 (Kenta)',
        speakerRole: 'A',
        annotatedJapanese: '{図書館|としょかん}は{何時|なんじ}から{何時|なんじ}までですか。',
        english: 'From what time to what time is the library open?',
      },
      {
        speaker: '美咲 (Misaki)',
        speakerRole: 'B',
        annotatedJapanese: '{九時|くじ}から{午後|ごご}{七時|しちじ}までです。{月曜日|げつようび}は{休|やす}みです。',
        english: 'It is from 9:00 to 7:00 PM. Monday is a closed day.',
      },
    ],
    comprehensionQuestion: {
      question: 'When does the library open?',
      options: ['At 8:30 AM', 'At 9:00 AM (九時から)', 'At 7:00 PM'],
      correctIndex: 1,
      explanation: 'Misaki explains 「九時から午後七時までです。」 ("From 9:00 to 7:00 PM.").',
    },
  },
  {
    unitId: 'a11-u05',
    unitNumber: 5,
    level: 'A1.1',
    title: 'A Quiet Park Near the Station',
    japaneseTitle: '駅の近くの公園',
    setting: 'Talking about what is inside a neighborhood park.',
    lines: [
      {
        speaker: '高橋 (Takahashi)',
        speakerRole: 'A',
        annotatedJapanese: '{駅|えき}の{前|まえ}に{大|おお}きい{公園|こうえん}がありますね。',
        english: 'There is a big park in front of the station, isn’t there?',
      },
      {
        speaker: 'リー (Lee)',
        speakerRole: 'B',
        annotatedJapanese: 'ええ。{公園|こうえん}の{中|なか}にきれいな{池|いけ}もありますよ。',
        english: 'Yes. There is also a pretty pond inside the park.',
      },
      {
        speaker: '高橋 (Takahashi)',
        speakerRole: 'A',
        annotatedJapanese: 'あそこに{白|しろ}い{犬|いぬ}がいますか。',
        english: 'Is there a white dog over there?',
      },
      {
        speaker: 'リー (Lee)',
        speakerRole: 'B',
        annotatedJapanese: 'いいえ、{犬|いぬ}はいません。{木|き}の{下|した}に{猫|ねこ}が{二匹|にひき}います。',
        english: 'No, there is no dog. There are two cats under the tree.',
      },
    ],
    comprehensionQuestion: {
      question: 'What living animals are under the tree in the park?',
      options: ['A white dog', 'Two cats (猫が二匹)', 'Nobody is in the park'],
      correctIndex: 1,
      explanation: 'Lee says 「木の下に猫が二匹います。」 ("There are two cats under the tree.").',
    },
  },
  {
    unitId: 'a11-u06',
    unitNumber: 6,
    level: 'A1.1',
    title: 'Morning Breakfast Routine',
    japaneseTitle: '毎朝の朝ご飯',
    setting: 'Coworkers chatting over morning coffee about breakfast.',
    lines: [
      {
        speaker: '山本 (Yamamoto)',
        speakerRole: 'A',
        annotatedJapanese: '{毎朝|まいあさ}、{何|なに}を{食|た}べますか。',
        english: 'What do you eat every morning?',
      },
      {
        speaker: 'エマ (Emma)',
        speakerRole: 'B',
        annotatedJapanese: 'パンと{卵|たまご}を{食|た}べます。そしてコーヒーを{飲|の}みます。',
        english: 'I eat bread and eggs. And I drink coffee.',
      },
      {
        speaker: '山本 (Yamamoto)',
        speakerRole: 'A',
        annotatedJapanese: '{朝|あさ}、{新聞|しんぶん}を{読|よ}みますか。',
        english: 'Do you read the newspaper in the morning?',
      },
      {
        speaker: 'エマ (Emma)',
        speakerRole: 'B',
        annotatedJapanese: 'いいえ、{新聞|しんぶん}は{読|よ}みません。{音楽|おんがく}を{聞|き}きます。',
        english: 'No, I do not read the newspaper. I listen to music.',
      },
    ],
    comprehensionQuestion: {
      question: 'What does Emma do in the morning instead of reading the newspaper?',
      options: ['She watches television', 'She listens to music (音楽を聞きます)', 'She writes letters'],
      correctIndex: 1,
      explanation: 'Emma says 「新聞は読みません。音楽を聞きます。」 ("I do not read the newspaper. I listen to music.").',
    },
  },
  {
    unitId: 'a11-u07',
    unitNumber: 7,
    level: 'A1.1',
    title: 'Weekend Trip to Kyoto',
    japaneseTitle: '週末の京都旅行',
    setting: 'Talking about plans to travel to Kyoto on Sunday.',
    lines: [
      {
        speaker: '鈴木 (Suzuki)',
        speakerRole: 'A',
        annotatedJapanese: '{日曜日|にちようび}はどこに{行|い}きますか。',
        english: 'Where will you go on Sunday?',
      },
      {
        speaker: 'ダニエル (Daniel)',
        speakerRole: 'B',
        annotatedJapanese: '{友達|ともだち}と{京都|きょうと}へ{行|い}きます。',
        english: 'I will go to Kyoto with my friend.',
      },
      {
        speaker: '鈴木 (Suzuki)',
        speakerRole: 'A',
        annotatedJapanese: 'バスで{行|い}きますか。',
        english: 'Will you go by bus?',
      },
      {
        speaker: 'ダニエル (Daniel)',
        speakerRole: 'B',
        annotatedJapanese: 'いいえ、{電車|でんしゃ}で{行|い}きます。{夜|よる}{九時|くじ}に{家|いえ}へ{帰|かえ}ります。',
        english: 'No, I will go by train. I will return home at 9:00 at night.',
      },
    ],
    comprehensionQuestion: {
      question: 'How is Daniel traveling to Kyoto?',
      options: ['By bus alone', 'By train with a friend (友達と電車で)', 'By bicycle'],
      correctIndex: 1,
      explanation: 'Daniel says he is going with a friend (友達と) and by train (電車で行きます).',
    },
  },
  {
    unitId: 'a11-u08',
    unitNumber: 8,
    level: 'A1.1',
    title: 'Studying Japanese After Work',
    japaneseTitle: '仕事のあとの勉強',
    setting: 'Asking a friend where they usually study and eat lunch.',
    lines: [
      {
        speaker: '中村 (Nakamura)',
        speakerRole: 'A',
        annotatedJapanese: 'いつもどこで{昼|ひる}ご{飯|はん}を{食|た}べますか。',
        english: 'Where do you usually eat lunch?',
      },
      {
        speaker: 'ソフィア (Sofia)',
        speakerRole: 'B',
        annotatedJapanese: '{会社|かいしゃ}の{食堂|しょくどう}で{食|た}べます。ときどきカフェでも{食|た}べます。',
        english: 'I eat at the company cafeteria. Sometimes I also eat at a cafe.',
      },
      {
        speaker: '中村 (Nakamura)',
        speakerRole: 'A',
        annotatedJapanese: '{毎日|まいにち}、{家|いえ}で{日本語|にほんご}を{勉強|べんきょう}しますか。',
        english: 'Do you study Japanese at home every day?',
      },
      {
        speaker: 'ソフィア (Sofia)',
        speakerRole: 'B',
        annotatedJapanese: 'はい、{毎晩|まいばん}{一時間|いちじかん}{勉強|べんきょう}します。',
        english: 'Yes, I study every evening for one hour.',
      },
    ],
    comprehensionQuestion: {
      question: 'Where does Sofia usually eat lunch?',
      options: ['At home every day', 'At the company cafeteria (会社の食堂で)', 'At the library'],
      correctIndex: 1,
      explanation: 'Sofia answers 「会社の食堂で食べます。」 ("I eat at the company cafeteria.").',
    },
  },
  {
    unitId: 'a11-u09',
    unitNumber: 9,
    level: 'A1.1',
    title: 'Trying a New Ramen Shop',
    japaneseTitle: '新しいラーメン屋',
    setting: 'Two friends talking outside a newly opened ramen shop on a cold day.',
    lines: [
      {
        speaker: '伊藤 (Ito)',
        speakerRole: 'A',
        annotatedJapanese: '{今日|きょう}はとても{寒|さむ}いですね。',
        english: 'It is very cold today, isn’t it?',
      },
      {
        speaker: 'レオ (Leo)',
        speakerRole: 'B',
        annotatedJapanese: 'ええ。あの{新|あたら}しい{店|みせ}のラーメンはおいしいですか。',
        english: 'Yes. Is the ramen at that new shop delicious?',
      },
      {
        speaker: '伊藤 (Ito)',
        speakerRole: 'A',
        annotatedJapanese: 'はい、とてもおいしいですよ。そして{高|たか}くないです。',
        english: 'Yes, it is very delicious. And it is not expensive.',
      },
      {
        speaker: 'レオ (Leo)',
        speakerRole: 'B',
        annotatedJapanese: 'いいですね。{熱|あつ}いラーメンはいいですね。',
        english: 'That’s nice. Hot ramen is great.',
      },
    ],
    comprehensionQuestion: {
      question: 'How does Ito describe the ramen at the new shop?',
      options: ['Expensive and small', 'Very delicious and not expensive (おいしくて高くない)', 'Cold and sweet'],
      correctIndex: 1,
      explanation: 'Ito says 「とてもおいしいですよ。そして高くないです。」 ("It is very delicious, and it is not expensive.").',
    },
  },
  {
    unitId: 'a11-u10',
    unitNumber: 10,
    level: 'A1.1',
    title: 'Favorite Music & Weekend Sports',
    japaneseTitle: '好きな音楽とスポーツ',
    setting: 'Two classmates getting to know each other’s interests.',
    lines: [
      {
        speaker: '小林 (Kobayashi)',
        speakerRole: 'A',
        annotatedJapanese: 'マリアさんはどんな{音楽|おんがく}が{好|す}きですか。',
        english: 'What kind of music do you like, Maria?',
      },
      {
        speaker: 'マリア (Maria)',
        speakerRole: 'B',
        annotatedJapanese: '{静|しず}かな{音楽|おんがく}が{好|す}きです。ピアノも{好|す}きです。',
        english: 'I like quiet music. I also like the piano.',
      },
      {
        speaker: '小林 (Kobayashi)',
        speakerRole: 'A',
        annotatedJapanese: 'スポーツも{好|す}きですか。',
        english: 'Do you also like sports?',
      },
      {
        speaker: 'マリア (Maria)',
        speakerRole: 'B',
        annotatedJapanese: 'テニスが{好|す}きですが、あまり{上手|じょうず}ではありません。',
        english: 'I like tennis, but I am not very skilled at it.',
      },
    ],
    comprehensionQuestion: {
      question: 'What does Maria say about tennis?',
      options: ['She dislikes tennis', 'She likes tennis, but is not very good at it yet', 'She is a professional tennis teacher'],
      correctIndex: 1,
      explanation: 'Maria states 「テニスが好きですが、あまり上手ではありません。」 ("I like tennis, but I am not very skilled at it.").',
    },
  },
  {
    unitId: 'a12-u01',
    unitNumber: 11,
    level: 'A1.2',
    title: 'Talking About Last Weekend',
    japaneseTitle: '先週の週末',
    setting: 'Monday morning conversation at the office.',
    lines: [
      {
        speaker: '加藤 (Kato)',
        speakerRole: 'A',
        annotatedJapanese: '{昨日|きのう}はどこかへ{行|い}きましたか。',
        english: 'Did you go anywhere yesterday?',
      },
      {
        speaker: 'ベン (Ben)',
        speakerRole: 'B',
        annotatedJapanese: 'はい、{友達|ともだち}と{美術館|びじゅつかん}へ{行|い}きました。そして{写真|しゃしん}を{見|み}ました。',
        english: 'Yes, I went to the art museum with a friend. And we looked at photographs.',
      },
      {
        speaker: '加藤 (Kato)',
        speakerRole: 'A',
        annotatedJapanese: '{夜|よる}は{外|そと}で{晩|ばん}ご{飯|はん}を{食|た}べましたか。',
        english: 'Did you eat dinner out in the evening?',
      },
      {
        speaker: 'ベン (Ben)',
        speakerRole: 'B',
        annotatedJapanese: 'いいえ、{外|そと}では{食|た}べませんでした。{家|いえ}でカレーを{作|つく}りました。',
        english: 'No, I did not eat out. I made curry at home.',
      },
    ],
    comprehensionQuestion: {
      question: 'What did Ben do for dinner yesterday evening?',
      options: ['He ate at a restaurant near the museum', 'He made curry at home (家でカレーを作りました)', 'He did not eat dinner'],
      correctIndex: 1,
      explanation: 'Ben says 「外では食べませんでした。家でカレーを作りました。」',
    },
  },
  {
    unitId: 'a12-u02',
    unitNumber: 12,
    level: 'A1.2',
    title: 'Impressions of a Festival',
    japaneseTitle: 'お祭りの感想',
    setting: 'Asking a friend how the local summer festival was.',
    lines: [
      {
        speaker: '吉田 (Yoshida)',
        speakerRole: 'A',
        annotatedJapanese: '{先週|せんしゅう}のお{祭|まつ}りはどうでしたか。',
        english: 'How was last week’s festival?',
      },
      {
        speaker: 'ハンナ (Hanna)',
        speakerRole: 'B',
        annotatedJapanese: 'とてもにぎやかでした。そして{楽|たの}しかったです。',
        english: 'It was very lively. And it was fun.',
      },
      {
        speaker: '吉田 (Yoshida)',
        speakerRole: 'A',
        annotatedJapanese: '{天気|てんき}もよかったですか。',
        english: 'Was the weather also good?',
      },
      {
        speaker: 'ハンナ (Hanna)',
        speakerRole: 'B',
        annotatedJapanese: '{昼|ひる}は{少|すこ}し{暑|あつ}かったですが、{夜|よる}は{涼|すず}しかったです。',
        english: 'It was a little hot during the day, but it was cool at night.',
      },
    ],
    comprehensionQuestion: {
      question: 'How was the weather during the festival at night?',
      options: ['Rainy and cold', 'Cool and pleasant (夜は涼しかったです)', 'Very hot all night'],
      correctIndex: 1,
      explanation: 'Hanna says 「昼は少し暑かったですが、夜は涼しかったです。」',
    },
  },
  {
    unitId: 'a12-u03',
    unitNumber: 13,
    level: 'A1.2',
    title: 'A Busy Morning Schedule',
    japaneseTitle: '朝のスケジュール',
    setting: 'Discussing daily morning routines before commuting.',
    lines: [
      {
        speaker: '松本 (Matsumoto)',
        speakerRole: 'A',
        annotatedJapanese: '{毎朝|まいあさ}、{何時|なんじ}に{起|お}きますか。',
        english: 'What time do you wake up every morning?',
      },
      {
        speaker: 'オリビア (Olivia)',
        speakerRole: 'B',
        annotatedJapanese: '{六時|ろくじ}に{起|お}きて、{公園|こうえん}を{散歩|さんぽ}します。',
        english: 'I wake up at 6:00 and take a walk in the park.',
      },
      {
        speaker: '松本 (Matsumoto)',
        speakerRole: 'A',
        annotatedJapanese: 'それからどうしますか。',
        english: 'What do you do after that?',
      },
      {
        speaker: 'オリビア (Olivia)',
        speakerRole: 'B',
        annotatedJapanese: 'シャワーを{浴|あ}びて、{朝|あさ}ご{飯|はん}を{食|た}べて、{八時|はちじ}に{家|いえ}を{出|で}ます。',
        english: 'I take a shower, eat breakfast, and leave the house at 8:00.',
      },
    ],
    comprehensionQuestion: {
      question: 'What does Olivia do right after waking up at 6:00?',
      options: ['She leaves for work immediately', 'She takes a walk in the park (公園を散歩します)', 'She watches television'],
      correctIndex: 1,
      explanation: 'Olivia says 「六時に起きて、公園を散歩します。」',
    },
  },
  {
    unitId: 'a12-u04',
    unitNumber: 14,
    level: 'A1.2',
    title: 'Asking for Help in Class',
    japaneseTitle: '教室でのお願い',
    setting: 'A student asking the Japanese teacher for help with a kanji word.',
    lines: [
      {
        speaker: '学生 (Student)',
        speakerRole: 'A',
        annotatedJapanese: '{先生|せんせい}、すみません。ちょっといいですか。',
        english: 'Teacher, excuse me. Do you have a moment?',
      },
      {
        speaker: '先生 (Teacher)',
        speakerRole: 'B',
        annotatedJapanese: 'はい、どうぞ。このページの{質問|しつもん}ですか。',
        english: 'Yes, go ahead. Is it a question on this page?',
      },
      {
        speaker: '学生 (Student)',
        speakerRole: 'A',
        annotatedJapanese: 'はい。この{漢字|かんじ}の{読|よ}み{方|かた}を{教|おし}えてください。',
        english: 'Yes. Please teach me how to read this kanji.',
      },
      {
        speaker: '先生 (Teacher)',
        speakerRole: 'B',
        annotatedJapanese: 'いいですよ。ここにふりがなを{書|か}いてください。もう{一度|いちど}ゆっくり{読|よ}みますね。',
        english: 'Sure. Please write the furigana here. I will read it slowly one more time.',
      },
    ],
    comprehensionQuestion: {
      question: 'What did the student ask the teacher to do?',
      options: ['Close the window', 'Teach how to read a kanji (漢字の読み方を教えてください)', 'Lend a dictionary'],
      correctIndex: 1,
      explanation: 'The student requests 「この漢字の読み方を教えてください。」',
    },
  },
  {
    unitId: 'a12-u05',
    unitNumber: 15,
    level: 'A1.2',
    title: 'Making Plans for Saturday',
    japaneseTitle: '土曜日の約束',
    setting: 'Two friends arranging to see a movie together.',
    lines: [
      {
        speaker: '井上 (Inoue)',
        speakerRole: 'A',
        annotatedJapanese: '{今週|こんしゅう}の{土曜日|どようび}、{一緒|いっしょ}に{映画|えいが}を{見|み}ませんか。',
        english: 'Won’t you watch a movie together this Saturday?',
      },
      {
        speaker: 'ルーカス (Lucas)',
        speakerRole: 'B',
        annotatedJapanese: 'いいですね。ぜひ{行|い}きましょう。',
        english: 'That sounds great. Let’s definitely go.',
      },
      {
        speaker: '井上 (Inoue)',
        speakerRole: 'A',
        annotatedJapanese: '{何時|なんじ}にどこで{会|あ}いましょうか。',
        english: 'What time and where shall we meet?',
      },
      {
        speaker: 'ルーカス (Lucas)',
        speakerRole: 'B',
        annotatedJapanese: '{二時|にじ}に{駅|えき}の{北口|きたぐち}で{会|あ}いましょう。',
        english: 'Let’s meet at the north exit of the station at 2:00.',
      },
    ],
    comprehensionQuestion: {
      question: 'Where and when did Inoue and Lucas agree to meet?',
      options: ['At 2:00 at the station north exit (二時に駅の北口で)', 'At 6:00 inside the movie theater', 'On Sunday morning at the cafe'],
      correctIndex: 0,
      explanation: 'Lucas suggests 「二時に駅の北口で会いましょう。」',
    },
  },
  {
    unitId: 'a12-u06',
    unitNumber: 16,
    level: 'A1.2',
    title: 'Ordering Lunch at a Cafe',
    japaneseTitle: 'カフェでの注文',
    setting: 'Ordering sandwiches and drinks at a neighborhood cafe.',
    lines: [
      {
        speaker: '店員 (Staff)',
        speakerRole: 'A',
        annotatedJapanese: 'いらっしゃいませ。ご{注文|ちゅうもん}はお{決|き}まりですか。',
        english: 'Welcome. Have you decided on your order?',
      },
      {
        speaker: '客 (Customer)',
        speakerRole: 'B',
        annotatedJapanese: 'はい。サンドイッチを{一|ひと}つとホットコーヒーを{二杯|にはい}ください。',
        english: 'Yes. One sandwich and two cups of hot coffee, please.',
      },
      {
        speaker: '店員 (Staff)',
        speakerRole: 'A',
        annotatedJapanese: 'かしこまりました。{全部|ぜんぶ}で{千二百円|せんにひゃくえん}です。',
        english: 'Certainly. That is 1,200 yen in total.',
      },
      {
        speaker: '客 (Customer)',
        speakerRole: 'B',
        annotatedJapanese: 'カードでお{願|ねが}いします。',
        english: 'By card, please.',
      },
    ],
    comprehensionQuestion: {
      question: 'What did the customer order?',
      options: ['Two sandwiches and one tea', 'One sandwich and two cups of hot coffee', 'Three cakes and water'],
      correctIndex: 1,
      explanation: 'The customer asks for 「サンドイッチを一つとホットコーヒーを二杯ください。」',
    },
  },
  {
    unitId: 'a12-u07',
    unitNumber: 17,
    level: 'A1.2',
    title: 'A Phone Call on a Rainy Afternoon',
    japaneseTitle: '雨の日の電話',
    setting: 'Two friends talking on the phone while waiting for the train.',
    lines: [
      {
        speaker: '木村 (Kimura)',
        speakerRole: 'A',
        annotatedJapanese: 'もしもし、{今|いま}どこにいますか。',
        english: 'Hello, where are you right now?',
      },
      {
        speaker: 'サラ (Sara)',
        speakerRole: 'B',
        annotatedJapanese: '{今|いま}、{駅|えき}の{前|まえ}でバスを{待|ま}っています。',
        english: 'Right now, I am waiting for the bus in front of the station.',
      },
      {
        speaker: '木村 (Kimura)',
        speakerRole: 'A',
        annotatedJapanese: '{外|そと}はもう{雨|あめ}が{降|ふ}っていますか。',
        english: 'Is it already raining outside?',
      },
      {
        speaker: 'サラ (Sara)',
        speakerRole: 'B',
        annotatedJapanese: 'はい、{降|ふ}っていますよ。でも{傘|かさ}を{持|も}っていますから、{大丈夫|だいじょうぶ}です。',
        english: 'Yes, it is raining. But since I have an umbrella, I am fine.',
      },
    ],
    comprehensionQuestion: {
      question: 'What is Sara doing right now?',
      options: ['Walking in the park without an umbrella', 'Waiting for the bus in front of the station (バスを待っています)', 'Cooking at home'],
      correctIndex: 1,
      explanation: 'Sara says 「今、の前でバスを待っています。」',
    },
  },
  {
    unitId: 'a12-u08',
    unitNumber: 18,
    level: 'A1.2',
    title: 'Summer Vacation Wishes',
    japaneseTitle: '夏休みの希望',
    setting: 'Friends talking about what they want to do during their next holiday.',
    lines: [
      {
        speaker: '林 (Hayashi)',
        speakerRole: 'A',
        annotatedJapanese: '{次|つぎ}の{休|やす}みにどこへ{行|い}きたいですか。',
        english: 'Where do you want to go on the next holiday?',
      },
      {
        speaker: 'ノア (Noah)',
        speakerRole: 'B',
        annotatedJapanese: '{北海道|ほっかいどう}へ{行|い}きたいです。おいしいお{寿司|すし}を{食|た}べたいです。',
        english: 'I want to go to Hokkaido. I want to eat delicious sushi.',
      },
      {
        speaker: '林 (Hayashi)',
        speakerRole: 'A',
        annotatedJapanese: 'いいですね。{私|わたし}は{新|あたら}しいカメラが{欲|ほ}しいです。',
        english: 'That’s nice. I want a new camera.',
      },
      {
        speaker: 'ノア (Noah)',
        speakerRole: 'B',
        annotatedJapanese: 'じゃあ、{土曜日|どようび}にカメラの{店|みせ}を{見|み}に{行|い}きましょう。',
        english: 'Well then, let’s go look at a camera shop on Saturday.',
      },
    ],
    comprehensionQuestion: {
      question: 'What object does Hayashi want?',
      options: ['A new bicycle', 'A new camera (新しいカメラが欲しい)', 'A train ticket'],
      correctIndex: 1,
      explanation: 'Hayashi says 「私は新しいカメラが欲しいです。」',
    },
  },
  {
    unitId: 'a12-u09',
    unitNumber: 19,
    level: 'A1.2',
    title: 'Leaving Early Today',
    japaneseTitle: '今日の予定と理由',
    setting: 'Explaining a schedule change at the end of the afternoon.',
    lines: [
      {
        speaker: '斎藤 (Saito)',
        speakerRole: 'A',
        annotatedJapanese: '{今日|きょう}はもう{帰|かえ}りますか。',
        english: 'Are you heading home already today?',
      },
      {
        speaker: 'クララ (Clara)',
        speakerRole: 'B',
        annotatedJapanese: 'はい、{明日|あした}{朝|あさ}{早|はや}いですから、{今日|きょう}は{早|はや}く{帰|かえ}ります。',
        english: 'Yes, because tomorrow morning is early, I will go home early today.',
      },
      {
        speaker: '斎藤 (Saito)',
        speakerRole: 'A',
        annotatedJapanese: '{明日|あした}は{何|なに}がありますか。',
        english: 'What do you have tomorrow?',
      },
      {
        speaker: 'クララ (Clara)',
        speakerRole: 'B',
        annotatedJapanese: '{日本語|にほんご}のテストがありますから、{今晩|こんばん}{家|いえ}で{復習|ふくしゅう}します。',
        english: 'Because I have a Japanese test, I will review at home tonight.',
      },
    ],
    comprehensionQuestion: {
      question: 'Why is Clara going home early and reviewing tonight?',
      options: ['Because she has a Japanese test tomorrow (日本語のテストがありますから)', 'Because the train is stopping early', 'Because a friend is visiting'],
      correctIndex: 0,
      explanation: 'Clara explains 「日本語のテストがありますから、今晩家で復習します。」',
    },
  },
  {
    unitId: 'a12-u10',
    unitNumber: 20,
    level: 'A1.2',
    title: 'Choosing Seasons & Travel Options',
    japaneseTitle: '好きな季節と乗り物',
    setting: 'Comparing seasons and travel choices in Japan.',
    lines: [
      {
        speaker: '山口 (Yamaguchi)',
        speakerRole: 'A',
        annotatedJapanese: '{春|はる}と{秋|あき}とどちらが{好|す}きですか。',
        english: 'Between spring and autumn, which do you prefer?',
      },
      {
        speaker: 'アレックス (Alex)',
        speakerRole: 'B',
        annotatedJapanese: '{私|わたし}は{秋|あき}のほうが{好|す}きです。{紅葉|もみじ}がとてもきれいですから。',
        english: 'I prefer autumn. Because the autumn leaves are very beautiful.',
      },
      {
        speaker: '山口 (Yamaguchi)',
        speakerRole: 'A',
        annotatedJapanese: '{日本|にほん}の{料理|りょうり}の{中|なか}で{何|なに}が{一番|いちばん}{好|す}きですか。',
        english: 'Among Japanese dishes, what do you like the best?',
      },
      {
        speaker: 'アレックス (Alex)',
        speakerRole: 'B',
        annotatedJapanese: 'てんぷらが{一番|いちばん}{好|す}きです。',
        english: 'I like tempura the best.',
      },
    ],
    comprehensionQuestion: {
      question: 'Which season does Alex prefer, and what is his favorite Japanese dish?',
      options: ['Spring and ramen', 'Autumn and tempura (秋のほうが好き・てんぷらが一番好き)', 'Winter and curry'],
      correctIndex: 1,
      explanation: 'Alex says 「秋のほうが好きです」 and 「てんぷらが一番好きです」.',
    },
  },
];

export const UNIT_DIALOGUES: UnitDialogueStory[] = RAW_DIALOGUES.map((seed) => ({
  ...seed,
  lines: seed.lines.map((line) => {
    const parsed = parseAnnotatedJapanese(line.annotatedJapanese);
    return {
      speaker: line.speaker,
      speakerRole: line.speakerRole,
      annotatedJapanese: line.annotatedJapanese,
      japanese: parsed.japanese,
      segments: parsed.segments,
      english: line.english,
    };
  }),
}));

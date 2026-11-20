import type {GrammarCheck} from './grammarChecks';
// Alternate applications: choose a missing form or particle in a constrained context.
export const APPLICATION_CHECKS:Record<string,GrammarCheck>={
'a11-u01':{prompt:'Complete the polite yes/no question: 学生です＿。',options:['か','を'],correct:0,explanation:'Final か makes the polite statement a question; を marks an object.'},
'a11-u02':{prompt:'Express possession: 私＿本 (my book).',options:['で','の'],correct:1,explanation:'の connects the owner and noun.'},
'a11-u03':{prompt:'Point to the station far from both speakers: 駅は＿です。',options:['あそこ','ここ'],correct:0,explanation:'あそこ refers to a place away from both speakers.'},
'a11-u04':{prompt:'Complete “until five”: 五時＿',options:['から','まで'],correct:1,explanation:'まで marks the endpoint, から the starting point.'},
'a11-u05':{prompt:'Complete “There is a book on the desk”: 机の上＿本があります。',options:['に','で'],correct:0,explanation:'に marks the location of existence.'},
'a11-u06':{prompt:'Complete “read a book”: 本＿読みます。',options:['が','を'],correct:1,explanation:'を marks the direct object of 読む.'},
'a11-u07':{prompt:'Complete “with a friend”: 友達＿行きます。',options:['と','を'],correct:0,explanation:'と marks the companion.'},
'a11-u08':{prompt:'Complete “I do not watch much TV”: あまりテレビを＿。',options:['見ます','見ません'],correct:1,explanation:'In this basic pattern あまり combines with a negative predicate.'},
'a11-u09':{prompt:'Complete “not good”: ＿です。',options:['よくない','いくない'],correct:0,explanation:'いい has the irregular negative よくない.'},
'a11-u10':{prompt:'Complete “I like cats”: 猫＿好きです。',options:['を','が'],correct:1,explanation:'が commonly marks the object of preference with 好き.'},
'a12-u01':{prompt:'Complete “I ate yesterday”: 昨日食べ＿。',options:['ました','ます'],correct:0,explanation:'ました is the polite affirmative past.'},
'a12-u02':{prompt:'Complete “it was quiet”: 静か＿。',options:['かったです','でした'],correct:1,explanation:'静か is a な-adjective; use でした for polite past.'},
'a12-u03':{prompt:'Choose the て-form of 書く.',options:['書いて','書って'],correct:0,explanation:'Regular く-ending godan verbs such as 書く take いて; 行く is exceptional.'},
'a12-u04':{prompt:'Complete “Please read”: ＿ください。',options:['読みます','読んで'],correct:1,explanation:'読む becomes 読んで in the て-form.'},
'a12-u05':{prompt:'Complete “Let us go”: 行き＿。',options:['ましょう','ました'],correct:0,explanation:'ましょう makes a polite suggestion.'},
'a12-u06':{prompt:'Order three apples: りんごを＿ください。',options:['三杯','三つ'],correct:1,explanation:'三つ counts general objects; 杯 counts servings of liquid.'},
'a12-u07':{prompt:'Complete “I am reading a book”: 本を読んで＿。',options:['います','ください'],correct:0,explanation:'て-form + います can express an ongoing action.'},
'a12-u08':{prompt:'Complete “I do not want to eat”: 食べ＿です。',options:['たいない','たくない'],correct:1,explanation:'たい conjugates like an い-adjective: たくない.'},
'a12-u09':{prompt:'Complete “It is expensive, but delicious”: 高いです＿、おいしいです。',options:['が','から'],correct:0,explanation:'が marks contrast here, whereas から presents a reason.'},
'a12-u10':{prompt:'Complete “A is bigger than B”: BよりA＿ほうが大きいです。',options:['を','の'],correct:1,explanation:'Aのほうが selects A as the greater member of the comparison.'}
};
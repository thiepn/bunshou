/** New supplemental original checks, keyed to the unchanged curriculum. */
export type GrammarCheck={prompt:string;options:readonly [string,string];correct:0|1;explanation:string};
export const GRAMMAR_CHECKS:Record<string,GrammarCheck>={
 'a11-u01':{prompt:'Politely say “I am not a student.”',options:['私は学生ではありません。','私は学生ですか。'],correct:0,explanation:'ではありません negates a noun predicate. ですか asks a question. は marks the topic and is pronounced wa.'},
 'a11-u02':{prompt:'Point to a book next to you. Which form can directly precede 本?',options:['これ本','この本'],correct:1,explanation:'この modifies a following noun; これ stands alone. この本 means this book.'},
 'a11-u03':{prompt:'Ask where the station is.',options:['駅はどれですか。','駅はどこですか。'],correct:1,explanation:'どこ asks where; どれ asks which one among alternatives.'},
 'a11-u04':{prompt:'Say “from nine o’clock until three o’clock.”',options:['九時から三時まで','九時まで三時から'],correct:0,explanation:'から marks the starting point and まで the endpoint. 九時 is read くじ.'},
 'a11-u05':{prompt:'Say that a cat is in the room.',options:['部屋に猫があります。','部屋に猫がいます。'],correct:1,explanation:'Use います for animate beings such as cats, あります for ordinary inanimate objects; に marks the place of existence.'},
 'a11-u06':{prompt:'Say “I do not drink water.”',options:['水を飲みません。','水を飲みました。'],correct:0,explanation:'を marks the object. 飲みません is polite nonpast negative; 飲みました is polite past affirmative.'},
 'a11-u07':{prompt:'Select the natural phrase for going to school by train.',options:['電車に学校で行きます。','電車で学校に行きます。'],correct:1,explanation:'で indicates the means of transport; に marks the destination (へ is also possible).'},
 'a11-u08':{prompt:'Say “I study at home.”',options:['家で勉強します。','家に勉強します。'],correct:0,explanation:'で marks where an action occurs. に is used for destinations and locations of existence.'},
 'a11-u09':{prompt:'Choose the polite negative form of 高い (expensive).',options:['高いではありません。','高くないです。'],correct:1,explanation:'For regular い-adjectives, remove final い and add くない. The negative of いい is irregular: よくない.'},
 'a11-u10':{prompt:'Say “a clean room.”',options:['きれいな部屋','きれい部屋'],correct:0,explanation:'きれい is a な-adjective despite its final い sound. Use な before a noun.'},
 'a12-u01':{prompt:'Say “I did not watch television yesterday.”',options:['昨日テレビを見ません。','昨日テレビを見ませんでした。'],correct:1,explanation:'ませんでした is polite past negative. 昨日 normally needs no に.'},
 'a12-u02':{prompt:'Say “It was delicious.”',options:['おいしかったです。','おいしいでした。'],correct:0,explanation:'For い-adjectives, replace final い with かった to form the affirmative past. でした follows nouns and な-adjectives instead.'},
 'a12-u03':{prompt:'Say “I eat breakfast and go to school” as a sequence.',options:['朝ご飯を食べます、学校に行きます。','朝ご飯を食べて、学校に行きます。'],correct:1,explanation:'て-form connects the first action to the following one. The final verb carries the sentence tense.'},
 'a12-u04':{prompt:'Politely ask someone to wait.',options:['待ってください。','待ちますください。'],correct:0,explanation:'ください follows the て-form: 待つ → 待って. Do not add it directly after ます.'},
 'a12-u05':{prompt:'Invite someone to eat together using a polite question.',options:['一緒に食べませんでした。','一緒に食べませんか。'],correct:1,explanation:'ませんか is a polite invitation in this context. ませんでした is a negative past statement.'},
 'a12-u06':{prompt:'Order two cups of coffee.',options:['コーヒーを二杯ください。','コーヒーを二人ください。'],correct:0,explanation:'杯 is the counter for cups or glasses of drinks (二杯 = にはい). 人 counts people.'},
 'a12-u07':{prompt:'Say “I live in Tokyo” as a current state.',options:['東京に住んでいます。','東京に住みません。'],correct:0,explanation:'住んでいます describes an ongoing state of residence; 住みません is negative.'},
 'a12-u08':{prompt:'Say “I want to go to Japan.”',options:['日本に行くが欲しいです。','日本に行きたいです。'],correct:1,explanation:'Verb ます-stem + たい expresses wanting to do an action. 欲しい expresses wanting an object, e.g. 本が欲しいです.'},
 'a12-u09':{prompt:'Say “Because it is cold, I drink warm tea.”',options:['寒いですから、温かいお茶を飲みます。','寒いですが、温かいお茶を飲みます。'],correct:0,explanation:'から gives the reason; が connects a contrast. The prompt explicitly requests a causal connection.'},
 'a12-u10':{prompt:'Ask which is bigger, Tokyo or Osaka.',options:['東京と大阪とどこが大きいですか。','東京と大阪とどちらが大きいですか。'],correct:1,explanation:'どちら asks which of two specified choices; どこ asks where.'}
};

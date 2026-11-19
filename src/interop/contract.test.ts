import test from 'node:test';
import assert from 'node:assert/strict';
import {lexical,parseFragment,fragment,link} from './contract';
import {examples,resumeReference} from './corpus';
import {progressSummary} from './progress';
import {createInitialAppState} from '../utils/storage';
import {scheduleSentenceReview} from '../utils/srs';
test('public references round trip, refuse unknown versions, duplicate fields and arbitrary URLs',()=>{
 const r=lexical('vocabulary','学生','がくせい')!;
 assert.deepEqual(parseFragment(fragment(r)),r);
 for(const bad of ['#jv=2&kind=review','#jv=1&kind=review&kind=kana','#jv=1&kind=review&owner=private','#jv=1&kind=lesson&id=../x','#jv=1&kind=vocabulary&text=https://evil.invalid','#jv=1&kind=kanji&text=学生'])assert.equal(parseFragment(bad),null);
 assert.throws(()=>link('kotoba',{v:1,kind:'review'}));
 assert.equal(new URL(link('kotoba',r)).origin,'https://japanese.thiepn.dev');
});
test('actual frozen corpus returns public contextual examples and stable identities',()=>{
 const matches=examples(lexical('vocabulary','学生')!);
 assert.ok(matches.length>0);assert.ok(matches.every(x=>x.japanese.includes('学生')&&x.href.includes('kind=sentence')));
 assert.equal(examples({v:1,kind:'sentence',id:'a11-u01-01'})[0].english,'Good morning.');
 assert.equal(examples({v:1,kind:'sentence',id:'constructor'}).length,0);
 assert.equal(examples(lexical('vocabulary','学生','ありえない')!).length,0);
 assert.ok(examples(lexical('kanji','学')!).length>0);
});
test('progress summary contains only real aggregate counts and safe public resume',()=>{
 const s=createInitialAppState();s.settings.emaWishText='secret private vow';s.settings.preferredVoiceURI='private-device';
 s.records['a11-u01-01']=scheduleSentenceReview(undefined,'a11-u01-01','good','2026-11-18');
 const result=progressSummary(s,'2026-11-19');
 assert.equal(result.metrics.sentencesStudied,1);assert.equal(result.metrics.sentencesAvailable,620);assert.equal(result.metrics.reviewsDue,1);
 assert.equal(resumeReference(s,'2026-11-19').kind,'review');
 assert.equal(JSON.stringify(result).includes('private'),false);
 assert.deepEqual(Object.keys(result).sort(),['metrics','product','resumeUrl','schema','scope','version']);
});

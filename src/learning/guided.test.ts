import test from 'node:test';
import assert from 'node:assert/strict';
import {CURRICULUM_UNITS} from '../data/units';
import {SENTENCES_BY_ID} from '../data/sentences';
import {createInitialAppState} from '../utils/storage';
import {scheduleSentenceReview} from '../utils/srs';
import {GRAMMAR_CHECKS} from './grammarChecks';
import {coverage,makeLesson,matchesModel,recommendedUnit,selectPractice,sessionSummary} from './guided';
const day='2026-11-19';
test('all 20 unchanged units receive a complete six-task pathway',()=>{
 const s=createInitialAppState(),before=JSON.stringify(s);
 assert.equal(Object.keys(GRAMMAR_CHECKS).length,20);
 for(const u of CURRICULUM_UNITS){
  const tasks=makeLesson(s,u.id,day);
  assert.deepEqual(tasks.map(t=>t.kind),['grammar','context','listening','listening','production','production']);
  assert.equal(new Set(tasks.map(t=>t.id)).size,6);
  for(const t of tasks){
   assert.ok(t.prompt&&t.explanation);
   if(t.options){assert.ok(t.correct!==undefined&&t.correct>=0&&t.correct<t.options.length);assert.equal(new Set(t.options).size,t.options.length);}
   if(t.sentence){assert.equal(t.sentence.unitId,u.id);assert.equal(t.sentence,SENTENCES_BY_ID[t.sentence.id]);}
  }
 }
 assert.equal(JSON.stringify(s),before);
});
test('difficulty-based selection uses actual review records and preserves stable order',()=>{
 const s=createInitialAppState();
 s.records['a11-u01-31']=scheduleSentenceReview(undefined,'a11-u01-31','again',day);
 assert.equal(selectPractice(s,'a11-u01',day)[0].id,'a11-u01-31');
 assert.equal(recommendedUnit(s,day),'a11-u01');
 assert.deepEqual(coverage(s,'a11-u01',day),{total:31,studied:1,due:1,mastered:0,dialogue:false});
});
test('strict normalized model matching accepts original script and kana, not unrelated sentences',()=>{
 const s=SENTENCES_BY_ID['a11-u01-01'];
 assert.equal(matchesModel(' おはようございます。 ',s),true);
 assert.equal(matchesModel(s.readingKana,s),true);
 assert.equal(matchesModel('こんにちは',s),false);
 assert.equal(matchesModel('。',s),false);
});
test('assisted and missed work cannot inflate correctness; retest preserves task identity',()=>{
 const tasks=makeLesson(createInitialAppState(),'a11-u01',day);
 const initial=sessionSummary(tasks,{[tasks[0].id]:'correct',[tasks[1].id]:'assisted',[tasks[2].id]:'missed'});
 assert.equal(initial.complete,false);assert.equal(initial.correct,1);assert.equal(initial.assisted,1);assert.equal(initial.retry.length,5);
 const all=Object.fromEntries(tasks.map(t=>[t.id,'correct' as const]));
 assert.equal(sessionSummary(tasks,all).complete,true);assert.equal(sessionSummary(tasks,all).retry.length,0);
});

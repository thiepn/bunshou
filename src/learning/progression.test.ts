import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialAppState} from '../utils/storage';
import {emptyProgression,startSession,applyCommand,tasksFor,validProgression} from './progression';
import {APPLICATION_CHECKS} from './applicationChecks';
const s=createInitialAppState(),u='a11-u01',day='2026-11-19',id='11111111-1111-4111-8111-111111111111';
test('persisted session identity, first pass, retest and idempotent record',()=>{
 let p=startSession(emptyProgression(),u,s,day,id);
 const tasks=tasksFor(p.units[u].last,s);assert.equal(tasks.length,6);
 for(const [i,t] of tasks.entries())p=applyCommand(p,{kind:'answer',unitId:u,id,taskId:t.id,result:i===0?'missed':'correct'},s).progress;
 const saved=JSON.parse(JSON.stringify(p));assert.ok(validProgression(saved));
 assert.deepEqual(tasksFor(saved.units[u].last,s).map(t=>t.id),tasks.map(t=>t.id));
 p=applyCommand(saved,{kind:'retry',unitId:u,id},s).progress;
 p=applyCommand(p,{kind:'answer',unitId:u,id,taskId:tasks[0].id,result:'correct'},s).progress;
 const r=applyCommand(p,{kind:'record',unitId:u,id},s);assert.equal(r.log,true);
 assert.equal(r.progress.units[u].firstCorrect,5);assert.equal(r.progress.units[u].firstTotal,6);
 assert.equal(applyCommand(r.progress,{kind:'record',unitId:u,id},s).log,false);
 const next=startSession(r.progress,u,s,day,'22222222-2222-4222-8222-222222222222');
 assert.equal(next.units[u].last.variant,1);assert.equal(tasksFor(next.units[u].last,s)[0].id,u+':application');
 assert.equal(Object.keys(APPLICATION_CHECKS).length,20);
});
test('invalid task identity, duplicate sentence and foreign unit cannot resume',()=>{
 const p=startSession(emptyProgression(),u,s,day,id);
 assert.throws(()=>applyCommand(p,{kind:'answer',unitId:u,id,taskId:'foreign',result:'correct'},s),/STALE_TASK/);
 assert.throws(()=>startSession(p,u,s,day),/RESUME_REQUIRED/);
 const corrupt=structuredClone(p);corrupt.units[u].last.ids[0]='a12-u10-01';assert.equal(validProgression(corrupt),false);
 const duplicate=structuredClone(p);duplicate.units[u].last.ids[0]=duplicate.units[u].last.ids[1];assert.equal(validProgression(duplicate),false);
});

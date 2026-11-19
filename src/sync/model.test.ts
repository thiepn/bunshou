import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyRaw,state,mergeRaw,same,appendLocal,initialMeta,buildMutation,reconcile,unionReviews,change,applyReview,project,withDevice,syncRelevant} from './model';
import {scheduleSentenceReview} from '../utils/srs';
const edit=(raw:string,fn:(s:ReturnType<typeof state>)=>void)=>{const s=state(raw);fn(s);return JSON.stringify(s);};
test('independent preference and favorite changes merge',()=>{
 const b=emptyRaw(),l=edit(b,s=>s.settings.dailyNewTarget=20),r=edit(b,s=>s.favorites.push('a11-u01-01'));
 const m=state(mergeRaw(b,l,r)!);assert.equal(m.settings.dailyNewTarget,20);assert.deepEqual(m.favorites,['a11-u01-01']);
});
test('overlapping review records cannot be silently deduplicated',()=>{
 const b=emptyRaw(),l=edit(b,s=>s.records['a11-u01-01']=scheduleSentenceReview(undefined,'a11-u01-01','good','2026-11-18'));
 assert.equal(mergeRaw(b,l,l),null);
});
test('same setting divergent changes retain conflict',()=>{
 const b=emptyRaw(),l=edit(b,s=>s.settings.dailyNewTarget=20),r=edit(b,s=>s.settings.dailyNewTarget=30);
 assert.equal(mergeRaw(b,l,r),null);
});
test('review event identity immutable; replay dedupes and collision fails',()=>{
 const c=change({kind:'review',sentenceId:'a11-u01-01',grade:'good',date:'2026-11-18',isNew:true});
 assert.equal(unionReviews([c.event!],[c.event!]).length,1);
 assert.throws(()=>unionReviews([c.event!],[{...c.event!,data:{...c.event!.data,grade:'easy'}}]),/SYNC_EVENT_ID_REUSE/);
});
test('remote replacement prevents stale edits resurrecting state',()=>{
 const baseline={raw:edit(emptyRaw(),s=>s.favorites.push('a11-u01-01')),generation:0,reviews:[]};
 const m=appendLocal({...initialMeta(),remote:{revision:1,document:baseline}},{kind:'edit'});
 const local=edit(baseline.raw,s=>s.favorites.push('a11-u01-02'));
 const result=reconcile(local,m,{revision:2,document:{raw:emptyRaw(),generation:1,reviews:[]}});
 assert.equal(result.meta.conflict?.reason,'REMOTE_REPLACEMENT_OR_DELETION');assert.equal(result.raw,local);
});
test('tombstone requires explicit restore, not stale replay',()=>{
 const m=appendLocal({...initialMeta(),remote:{revision:5,document:null}},{kind:'edit'});
 assert.throws(()=>buildMutation(emptyRaw(),m),/SYNC_EXPLICIT_RESTORE_REQUIRED/);
 assert.equal(buildMutation(emptyRaw(),appendLocal(m,{kind:'replace'})).base_revision,5);
});

test('device-only preferences never alter wire projection',()=>{
 const b=emptyRaw(),l=edit(b,s=>{s.settings.theme='dark';s.settings.preferredVoiceURI='private-device';});
 assert.equal(syncRelevant(b,l),false);assert.equal(state(project(l)).settings.preferredVoiceURI,'');assert.equal(state(withDevice(b,l)).settings.theme,'dark');
});
test('disjoint concurrent reviews prove exact daily log addition and preserve scheduler outputs',()=>{
 const b=emptyRaw(),a=change({kind:'review',sentenceId:'a11-u01-01',grade:'good',date:'2026-11-19',isNew:true}),c=change({kind:'review',sentenceId:'a11-u01-02',grade:'hard',date:'2026-11-19',isNew:true});
 const l=edit(b,s=>applyReview(s,a.event!)),r=edit(b,s=>applyReview(s,c.event!));
 const m={...initialMeta(),remote:{revision:1,document:{raw:b,generation:0,reviews:[]}},pending:[a]};
 const result=reconcile(l,m,{revision:2,document:{raw:r,generation:0,reviews:[c.event!]}});
 assert.equal(result.meta.conflict,undefined);assert.equal(state(result.raw).dailyLogs['2026-11-19'].newStudiedCount,2);assert.equal(Object.keys(state(result.raw).records).length,2);
 const corrupt=edit(r,s=>s.dailyLogs['2026-11-19'].practiceCount++);
 assert.ok(reconcile(l,m,{revision:2,document:{raw:corrupt,generation:0,reviews:[c.event!]}}).meta.conflict);
});

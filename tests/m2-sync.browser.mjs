import {chromium} from './.m1-browser-deps/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {startFixture} from './m2-sync-fixture.mjs';
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const fixture=await startFixture(),browser=await chromium.launch();
try{
 const contexts=await Promise.all([browser.newContext(),browser.newContext(),browser.newContext()]);
 const pages=await Promise.all(contexts.map(c=>c.newPage()));
 for(const p of pages)await p.goto('http://127.0.0.1:4173/bunshou/');
 const op=(p,owner,bearer,kind,value=null)=>p.evaluate(async({owner,bearer,kind,value})=>{
  const {WorkspaceStore,decode}=await import('/bunshou/src/storage/workspace.ts');
  const {createTransport}=await import('/bunshou/src/sync/transport.ts');
  const {synchronize}=await import('/bunshou/src/sync/engine.ts');
  const {scheduleSentenceReview}=await import('/bunshou/src/utils/srs.ts');
  const s=await WorkspaceStore.open();
  try{
   let row=await s.read(owner);
   if(kind==='read')return row;
   if(kind==='sync'){const transport=createTransport('http://127.0.0.1:4174',async()=>({owner,bearer}),owner,()=>true);return await synchronize(s,owner,transport,()=>true);}
   const state=decode(row.raw);let action={kind:'edit'};
   if(kind==='target')state.settings.dailyNewTarget=value;
   else if(kind==='favorite')state.favorites.push(value);
   else if(kind==='review'){state.records[value]=scheduleSentenceReview(state.records[value],value,'good','2026-11-19');action={kind:'review',sentenceId:value,grade:'good',date:'2026-11-19',isNew:true};}
   else if(kind==='reset'){state.records={};state.favorites=[];state.dailyLogs={};action={kind:'replace'};}
   return await s.commit(owner,row.revision,state,action);
  }finally{s.close();}
 },{owner,bearer,kind,value});
 const [p,q,z]=pages;const a=(p,k,v)=>op(p,A,'fixture-a',k,v), b=(p,k,v)=>op(p,B,'fixture-b',k,v);
 await a(p,'review','a11-u01-01');fixture.dropAck();
 await assert.rejects(a(p,'sync'));const pending=await a(p,'read');assert.ok(pending.sync.flight);assert.equal(pending.sync.pending.length,1);
 const mutation=pending.sync.flight.mutation.mutation_id;
 await p.reload();assert.equal((await a(p,'read')).sync.flight.mutation.mutation_id,mutation);
 assert.equal(await a(p,'sync'),'synced');assert.equal(fixture.workspaces.get(A).revision,1);assert.equal(fixture.workspaces.get(A).document.reviews.length,1);
 assert.equal(await a(q,'sync'),'synced');assert.ok(JSON.parse((await a(q,'read')).raw).records['a11-u01-01']);
 await contexts[0].setOffline(true);await a(p,'target',20);await assert.rejects(a(p,'sync'));await contexts[0].setOffline(false);
 await a(q,'favorite','a11-u01-02');assert.equal(await a(q,'sync'),'synced');assert.equal(await a(p,'sync'),'synced');assert.equal(await a(q,'sync'),'synced');
 const merged=JSON.parse((await a(q,'read')).raw);assert.equal(merged.settings.dailyNewTarget,20);assert.deepEqual(merged.favorites,['a11-u01-02']);
 assert.equal(await b(z,'sync'),'synced');assert.equal(Object.keys(JSON.parse((await b(z,'read')).raw).records).length,0);
 // An owner mismatch in authenticated credentials blocks the request before fetch.
 await assert.rejects(z.evaluate(async({A,B})=>{const {createTransport}=await import('/bunshou/src/sync/transport.ts');return createTransport('http://127.0.0.1:4174',async()=>({owner:B,bearer:'fixture-b'}),A,()=>true).pull(crypto.randomUUID(),null);},{A,B}),/SYNC_AUTH_REQUIRED/);
 await a(p,'target',30);await a(q,'target',5);assert.equal(await a(p,'sync'),'synced');assert.equal(await a(q,'sync'),'conflict');
 const conflict=await a(q,'read');assert.equal(JSON.parse(conflict.raw).settings.dailyNewTarget,5);assert.equal(JSON.parse(conflict.sync.conflict.remote.document.raw).settings.dailyNewTarget,30);
 // Explicit conflict adoption preserves the local candidate, then a later reset
 // cannot be undone by the other device's stale edit.
 await q.evaluate(async A=>{const {WorkspaceStore}=await import('/bunshou/src/storage/workspace.ts');const {acceptRemote}=await import('/bunshou/src/sync/engine.ts');const s=await WorkspaceStore.open();try{const r=await s.read(A);await acceptRemote(s,A,r.revision,()=>true);}finally{s.close();}},A);
 assert.equal(await a(q,'sync'),'synced');assert.equal((await a(q,'read')).sync.archives.length,1);
 await a(q,'favorite','a11-u01-03');await a(p,'reset');assert.equal(await a(p,'sync'),'synced');assert.equal(await a(q,'sync'),'conflict');
 assert.equal((await a(q,'read')).sync.conflict.reason,'REMOTE_REPLACEMENT_OR_DELETION');assert.equal(Object.keys(JSON.parse(fixture.workspaces.get(A).document.raw).records).length,0);
 console.log('M2 browser PASS: durable lost ACK retry, actual offline commit, two contexts converge, owner isolation, conflicting edits retained, reset generation prevents resurrection');
 for(const c of contexts)await c.close();
}finally{await browser.close();await new Promise(resolve=>fixture.server.close(resolve));}

import {chromium,firefox,webkit} from './.m1-browser-deps/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const url='http://127.0.0.1:4173/bunshou/';
for(const engine of [chromium,firefox,webkit]){
 const browser=await engine.launch();
 try{
 const context=await browser.newContext(), page=await context.newPage();
 await page.goto(url);
 await page.getByText('Guest workspace',{exact:true}).first().waitFor();
 await page.getByText('Saved on this device',{exact:false}).first().waitFor();
 // Real browser IndexedDB transactions in the same served dev origin.
 const result=await page.evaluate(async()=>{
  const {WorkspaceStore,GUEST,DB_NAME,decode}=await import('/bunshou/src/storage/workspace.ts');
  const {createInitialAppState,STORAGE_KEY}=await import('/bunshou/src/utils/storage.ts');
  const {ALL_SENTENCES}=await import('/bunshou/src/data/sentences.ts');
  const {scheduleSentenceReview}=await import('/bunshou/src/utils/srs.ts');
  // Separate factory storage is impossible on one origin; use the existing
  // guest workspace only, a disposable synthetic browser context.
  const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
  const s=await WorkspaceStore.open();
  const original=await s.read(GUEST);
  const state=createInitialAppState();state.favorites=ALL_SENTENCES.map(x=>x.id);
  for(const x of ALL_SENTENCES)state.records[x.id]=scheduleSentenceReview(undefined,x.id,'good','2026-11-18');
  const committed=await s.commit(GUEST,original.revision,state);
  const second=await WorkspaceStore.open();
  const conflict=await Promise.allSettled([s.claimGuest(a,committed.revision,0,()=>true),second.claimGuest(b,committed.revision,0,()=>true)]);
  const winner=conflict[0].status==='fulfilled'?a:b;
  const loser=winner===a?b:a;
  const row=await s.read(winner),other=await s.read(loser),guest=await s.read(GUEST);
  const recovered=decode(row.raw);
  const changed={...recovered,favorites:recovered.favorites.slice(1)};
  const saves=await Promise.allSettled([s.commit(winner,row.revision,changed),second.commit(winner,row.revision,{...recovered,favorites:[]})]);
  const next=await s.read(winner);
  s.close();second.close();
  const third=await WorkspaceStore.open();const persisted=await third.read(winner);third.close();
  return {claims:conflict.filter(x=>x.status==='fulfilled').length,records:Object.keys(recovered.records).length,loser:other.revision,guestRecords:Object.keys(decode(guest.raw).records).length,guestRecovery:guest.previousRaw===undefined&&row.claimSourceRaw===committed.raw,saves:saves.filter(x=>x.status==='fulfilled').length,previous:next.previousRaw===row.raw,persisted:persisted.raw===next.raw,legacy:localStorage.getItem(STORAGE_KEY)};
 });
 assert.deepEqual(result,{claims:1,records:620,loser:0,guestRecords:0,guestRecovery:true,saves:1,previous:true,persisted:true,legacy:null});
 await page.reload();
 await page.getByText('Guest workspace',{exact:true}).first().waitFor();
 const raw=await page.evaluate(async()=>{
  const {createInitialAppState}=await import('/bunshou/src/utils/storage.ts');
  const {ALL_SENTENCES}=await import('/bunshou/src/data/sentences.ts');
  const {scheduleSentenceReview}=await import('/bunshou/src/utils/srs.ts');
  const state=createInitialAppState();
  for(const item of ALL_SENTENCES){state.records[item.id]=scheduleSentenceReview(undefined,item.id,'good','2026-11-18');state.favorites.push(item.id);}
  state.completedDialogues=['a11-u01'];state.lastOmikujiId='example';state.lastOmikujiDate='2026-11-18';
  return JSON.stringify(state);
 });
 const legacy=await browser.newContext();
 await legacy.addInitScript(raw=>{if(localStorage.getItem('bunsho_app_state_v1')===null)localStorage.setItem('bunsho_app_state_v1',raw);},raw);
 const first=await legacy.newPage();await first.goto(url);
 await first.getByText('Saved on this device',{exact:false}).first().waitFor();
 const migrated=await first.evaluate(async raw=>{const {WorkspaceStore,GUEST,decode}=await import('/bunshou/src/storage/workspace.ts');const s=await WorkspaceStore.open(),row=await s.read(GUEST);s.close();return {revision:row.revision,records:Object.keys(decode(row.raw).records).length,bytesPreserved:row.legacyRaw===raw&&localStorage.getItem('bunsho_app_state_v1')===raw};},raw);
 assert.deepEqual(migrated,{revision:1,records:620,bytesPreserved:true});
 const second=await legacy.newPage();await second.goto(url);await second.getByText('Saved on this device',{exact:false}).first().waitFor();
 const write=async(p,cap)=>p.evaluate(async cap=>{const {WorkspaceStore,GUEST,decode}=await import('/bunshou/src/storage/workspace.ts');const s=await WorkspaceStore.open();try{const row=await s.read(GUEST),state=decode(row.raw);state.settings.dailyReviewCap=cap;await s.commit(GUEST,1,state);return true;}catch(e){return false;}finally{s.close();}},cap);
 const writes=await Promise.all([write(first,100),write(second,999)]);
 assert.equal(writes.filter(Boolean).length,1);
 const invalid=await browser.newContext();await invalid.addInitScript(()=>localStorage.setItem('bunsho_app_state_v1','{damaged'));
 const invalidPage=await invalid.newPage();await invalidPage.goto(url);
 await invalidPage.getByText('LEGACY_RECOVERY_REQUIRED',{exact:true}).waitFor();
 invalidPage.on('dialog',dialog=>dialog.accept());
 await invalidPage.getByLabel('Recovery backup file').setInputFiles({name:'synthetic-backup.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await invalidPage.getByText('Saved on this device',{exact:false}).first().waitFor();
 const restored=await invalidPage.evaluate(async()=>{const {WorkspaceStore,GUEST,decode}=await import('/bunshou/src/storage/workspace.ts');const s=await WorkspaceStore.open();const row=await s.read(GUEST);s.close();return {records:Object.keys(decode(row.raw).records).length,original:row.legacyRaw,legacy:localStorage.getItem('bunsho_app_state_v1')};});
 assert.deepEqual(restored,{records:620,original:'{damaged',legacy:'{damaged'});
 await invalid.close();await legacy.close();await context.close();
 console.log(engine.name()+': real IndexedDB migration initialization, 620-record claim, concurrent owner claim, CAS, snapshot, reload PASS');
 }finally{await browser.close();}
}

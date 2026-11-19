import {chromium,firefox,webkit} from './.m1-browser-deps/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base='http://127.0.0.1:4173/bunshou/';
for(const engine of [chromium,firefox,webkit]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({acceptDownloads:true});
  await context.addInitScript(()=>{
   // Deterministic disposable audio interface; never pretend sound fidelity was tested.
   window.__m4AudioMode='success';
   const voice={voiceURI:'fixture-ja',name:'Fixture Japanese',lang:'ja-JP',localService:true};
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>window.__m4AudioMode==='unavailable'?[]:[voice],cancel(){},speak(u){setTimeout(()=>{if(window.__m4AudioMode==='error')u.onerror?.();else u.onend?.();},25);}}});
   Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:class{constructor(text){this.text=text;}}});
  });
  const page=await context.newPage();
  page.on('dialog',d=>d.accept());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await page.getByRole('button',{name:'Start guided lesson',exact:true}).click();
  await page.getByRole('heading',{name:'Guided lessons'}).waitFor();
  await page.getByLabel('Choose any unit').selectOption('a11-u01');
  const tasks=await page.evaluate(async()=>{
   const {makeLesson}=await import('/bunshou/src/learning/guided.ts');
   const {createInitialAppState}=await import('/bunshou/src/utils/storage.ts');
   return makeLesson(createInitialAppState(),'a11-u01','2026-11-19');
  });
  const next=async()=>{
   await page.getByRole('button',{name:'Continue exercise'}).click();
   await page.getByText('Saved on this device',{exact:false}).waitFor();
  };
  await page.getByRole('button',{name:'Start guided exercises'}).click();
  await page.getByRole('radio').nth(1-tasks[0].correct).check();
  await page.getByRole('button',{name:'Check answer'}).click();
  await page.getByText('Not the expected answer',{exact:true}).waitFor();await next();
  // Await the submitted checkpoint, not merely a click dispatched to React.
  await page.getByText('Context comprehension · 2/6',{exact:true}).waitFor();
  const checkpoint=await page.evaluate(async()=>{
   const {WorkspaceStore}=await import('/bunshou/src/storage/workspace.ts');
   const store=await WorkspaceStore.open();try{return (await store.read('guest')).guided.units['a11-u01'].last;}finally{store.close();}
  });
  assert.equal(checkpoint.index,1);assert.equal(checkpoint.first['a11-u01:grammar'],'missed');
  await page.reload();await page.getByRole('button',{name:'Start guided lesson',exact:true}).click();
  await page.getByText('Context comprehension · 2/6',{exact:true}).waitFor();
  await page.getByRole('radio').nth(tasks[1].correct).check();
  await page.getByRole('button',{name:'Check answer'}).click();await next();
  // Listening credit requires completed playback; fallback remains assisted.
  await page.getByRole('radio').nth(tasks[2].correct).check();
  assert.equal(await page.getByRole('button',{name:'Check answer'}).isDisabled(),true);
  await page.getByRole('button',{name:'Play Japanese audio'}).click();
  await page.getByRole('button',{name:'Check answer'}).click();await next();
  await page.evaluate(()=>{window.__m4AudioMode='unavailable';});
  await page.getByRole('button',{name:'Play Japanese audio'}).click();
  await page.getByText('Japanese voice unavailable.',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Reveal transcript (assisted)'}).click();
  await page.getByRole('radio').nth(tasks[3].correct).check();
  await page.getByRole('button',{name:'Check answer'}).click();
  await page.getByText('Assisted / skipped',{exact:true}).waitFor();await next();
  for(const t of tasks.slice(4)){
    await page.getByLabel('Your Japanese answer (kana or original spelling)').fill(t.sentence.readingKana);
    await page.getByRole('button',{name:'Check answer'}).click();await next();
  }
  await page.getByRole('heading',{name:'Guided practice results'}).waitFor();
  await page.getByText('Current result: 4/6 correct · 1 assisted · 1 missed.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Retry missed or assisted tasks'}).click();
  await page.getByRole('radio').nth(tasks[0].correct).check();await page.getByRole('button',{name:'Check answer'}).click();await next();
  await page.evaluate(()=>{window.__m4AudioMode='success';});
  await page.getByRole('button',{name:'Play Japanese audio'}).click();
  await page.getByRole('radio').nth(tasks[3].correct).check();
  await page.getByRole('button',{name:'Check answer'}).click();await next();
  await page.getByText('Current result: 6/6 correct · 0 assisted · 0 missed.',{exact:true}).waitFor();
  await page.getByText('First pass: 4/6 model matches or correct answers; 1 assisted; 1 missed.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Record completed practice session'}).click();
  await page.getByRole('button',{name:'Practice activity recorded'}).waitFor();
  await page.getByText('Saved on this device',{exact:false}).waitFor();
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export saved progress'}).click();
  const d=await pending;const saved=JSON.parse(await readFile(await d.path(),'utf8'));
  assert.equal(Object.keys(saved.records).length,0);
  assert.equal(Object.values(saved.dailyLogs).reduce((n,v)=>n+v.practiceCount,0),1);
  assert.equal(await page.getByRole('button',{name:'Practice activity recorded'}).isDisabled(),true);
  await page.reload();await page.getByRole('button',{name:'Start guided lesson',exact:true}).click();
  await page.getByRole('heading',{name:'Guided practice results'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Practice activity recorded'}).isDisabled(),true);
  await page.getByText('1 recorded sessions · 4/6 first-pass correct answers',{exact:true}).waitFor();
  const evidenceDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export guided learning evidence'}).click();
  const evidenceFile=await evidenceDownload;const exported=JSON.parse(await readFile(await evidenceFile.path(),'utf8'));
  assert.equal(exported.version,1);assert.equal(exported.units['a11-u01'].sessions,1);assert.equal(exported.units['a11-u01'].firstCorrect,4);
  assert.equal(exported.units['a11-u01'].last.logged,true);assert.equal(saved.guided,undefined);
  await page.getByRole('button',{name:'Explore next unit'}).click();
  assert.equal(await page.getByLabel('Choose any unit').inputValue(),'a11-u02');
  await page.getByLabel('Choose any unit').selectOption('a12-u10');
  await page.getByText('Elementary Comparisons (どちら・のほうが・一番)',{exact:true}).waitFor();
  // Exercise owner and stale-revision fences against real IndexedDB; no real account traffic.
  const evidence=await page.evaluate(async()=>{
   const {WorkspaceStore}=await import('/bunshou/src/storage/workspace.ts');
   const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
   const store=await WorkspaceStore.open(),other=await WorkspaceStore.open();
   try{
    const cmd={kind:'start',unitId:'a11-u02',day:'2026-11-19',id:crypto.randomUUID()};
    const row=await store.guidedCommand(a,0,cmd,()=>true);
    let stale=false,cancelled=false;
    try{await other.guidedCommand(a,0,cmd,()=>true);}catch{stale=true;}
    try{await other.guidedCommand(b,0,cmd,()=>false);}catch{cancelled=true;}
    const {decode}=await import('/bunshou/src/storage/workspace.ts');
    const state=decode(row.raw);state.settings.dailyNewTarget=20;
    const edited=await store.commit(a,row.revision,state);
    const preserved=JSON.stringify(edited.guided)===JSON.stringify(row.guided);
    const guest=await other.read('guest');
    const claimed=await store.claimGuest(b,guest.revision,0,()=>true);
    const moved=JSON.stringify(claimed.guided)===JSON.stringify(guest.guided)&&(await other.read('guest')).guided===undefined;
    return {stale,cancelled,preserved,moved,a:edited.guided.units['a11-u02'].last.id,b:claimed.guided.units['a11-u01'].sessions,guest:guest.guided.units['a11-u01'].sessions};
   }finally{store.close();other.close();}
  });
  assert.ok(evidence.stale&&evidence.cancelled&&evidence.preserved&&evidence.moved&&evidence.a);assert.equal(evidence.b,1);assert.equal(evidence.guest,1);
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(engine.name()+': M4 guided grammar, context, audio gate/fallback, typed production, targeted retest, one durable practice log, reload/resume, owner isolation, stale revision rejection and unchanged SRS PASS');
 }finally{await browser.close();}
}

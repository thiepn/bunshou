import {chromium,firefox,webkit} from './.m1-browser-deps/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base='http://127.0.0.1:4173/bunshou/';
for(const engine of [chromium,firefox,webkit]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({acceptDownloads:true});
  const page=await context.newPage();
  const ref='#jv=1&kind=vocabulary&text='+encodeURIComponent('学生');
  await page.goto(base+ref);
  await page.getByRole('heading',{name:'Context & Japanese ecosystem'}).waitFor();
  await page.getByText('Look up 学生 in Kotoba',{exact:true}).waitFor();
  const href=await page.getByRole('link',{name:'Look up 学生 in Kotoba'}).getAttribute('href');
  assert.equal(new URL(href).pathname,'/kotoba/');
  assert.ok(await page.getByRole('button',{name:'Practice this sentence'}).count()>0);
  // Disposable Kotoba consumer receives public handoff without remote traffic.
  const received=await page.evaluate(async href=>{const {parseFragment}=await import('/bunshou/src/interop/contract.ts');return parseFragment(new URL(href).hash);},href);
  assert.deepEqual(received,{v:1,kind:'vocabulary',text:'学生'});
  await page.goto(base+'#jv=1&kind=sentence&id=a11-u01-01');
  await page.getByText('Good morning.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Practice this sentence'}).click();
  // Export must be based on committed progress, not a navigation or practice click.
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export ecosystem summary'}).click();
  const d=await download;const summary=JSON.parse(await readFile(await d.path(),'utf8'));
  assert.equal(summary.schema,'thiepn.japanese.progress');assert.equal(summary.version,1);assert.equal(summary.product,'bunshou');assert.equal(summary.metrics.sentencesAvailable,620);assert.equal(summary.metrics.sentencesStudied,0);
  assert.equal(new URL(summary.resumeUrl).pathname,'/bunshou/');
  // Mock hub snapshot consumer: replace by product, never add counts twice.
  const hub=new Map();hub.set(summary.product,summary);hub.set(summary.product,summary);
  assert.equal(hub.size,1);assert.equal(hub.get('bunshou').metrics.sentencesStudied,0);
  await page.goto(base+new URL(summary.resumeUrl).hash);
  await page.getByRole('button',{name:'Export ecosystem summary'}).waitFor();
  await page.goto(base+'#jv=1&kind=sentence&id=constructor');
  await page.getByText('0 contextual examples.',{exact:false}).waitFor();
  await page.goto(base+'#jv=2&kind=review');
  await page.getByRole('heading',{name:'Context & Japanese ecosystem'}).waitFor();
  await context.close();
  console.log(engine.name()+': M3 public references, contextual search, explicit practice, aggregate export, hub snapshot and invalid link PASS');
 }finally{await browser.close();}
}

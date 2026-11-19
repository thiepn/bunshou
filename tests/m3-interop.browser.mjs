import {chromium,firefox,webkit} from './.m1-browser-deps/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base='http://127.0.0.1:4173/bunshou/';
for(const engine of [chromium,firefox,webkit]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({acceptDownloads:true});
  const page=await context.newPage();
  const diagnostics=[];
  page.on('pageerror',e=>diagnostics.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error')diagnostics.push('console: '+m.text());});
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))diagnostics.push('HTTP '+r.status()+' '+new URL(r.url()).pathname);});
  // Serve the exact fixture bytes rather than treating a test-only HTML document
  // as a second Vite HTML entry (which may rewrite its base-prefixed imports).
  // Its module requests still go through the real Vite server at /bunshou/src/.
  const fixtureHtml=await readFile(new URL('./m3-partner-fixture.html',import.meta.url),'utf8');
  await context.route(base+'tests/m3-partner-fixture.html?*',route=>route.fulfill({status:200,contentType:'text/html',body:fixtureHtml}));
  try{
  await context.route('https://japanese.thiepn.dev/**',async route=>{
   const u=new URL(route.request().url());
   if(!['/','/kotoba/','/bunshou/'].includes(u.pathname)||!route.request().isNavigationRequest())return route.abort();
   const target=u.pathname==='/bunshou/'?base:base+'tests/m3-partner-fixture.html';
   // Browser URL fragments are not sent in HTTP requests. Read location.hash
   // in the fulfilled document, then preserve it in the local navigation.
   const pageKind=u.pathname==='/kotoba/'?'kotoba':'japanese';
   return route.fulfill({status:200,contentType:'text/html',body:'<script>location.replace('+JSON.stringify(target+(u.pathname==='/bunshou/'?'':'?partner='+pageKind))+'+location.hash)</script>'});
  });
  const ref='#jv=1&kind=vocabulary&text='+encodeURIComponent('学生');
  await page.goto(base+ref);
  await page.getByRole('heading',{name:'Context & Japanese ecosystem'}).waitFor();
  await page.getByText('Look up 学生 in Kotoba',{exact:true}).waitFor();
  const href=await page.getByRole('link',{name:'Look up 学生 in Kotoba'}).getAttribute('href');
  assert.equal(new URL(href).pathname,'/kotoba/');
  assert.ok(await page.getByRole('button',{name:'Practice this sentence'}).count()>0);
  // User actually follows the public handoff to an intercepted disposable partner.
  await page.getByRole('link',{name:'Look up 学生 in Kotoba'}).click();
  await page.getByRole('heading',{name:'Disposable Kotoba'}).waitFor();
  await page.getByText('Lookup request: 学生',{exact:true}).waitFor();
  await page.getByRole('link',{name:'Find example sentences in Bunshō'}).click();
  await page.getByRole('heading',{name:'Context & Japanese ecosystem'}).waitFor();
  await page.getByText('Look up 学生 in Kotoba',{exact:true}).waitFor();
  await page.goto(base+'#jv=1&kind=sentence&id=a11-u01-01');
  await page.getByText('Good morning.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Practice this sentence'}).click();
  // Export must be based on committed progress, not a navigation or practice click.
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export ecosystem summary'}).click();
  const d=await download;const summary=JSON.parse(await readFile(await d.path(),'utf8'));
  assert.equal(summary.schema,'thiepn.japanese.progress');assert.equal(summary.version,1);assert.equal(summary.product,'bunshou');assert.equal(summary.metrics.sentencesAvailable,620);assert.equal(summary.metrics.sentencesStudied,0);
  assert.equal(new URL(summary.resumeUrl).pathname,'/bunshou/');
  await page.goto(base+'tests/m3-partner-fixture.html?partner=japanese');
  await page.getByRole('heading',{name:'Disposable Japanese hub'}).waitFor();
  const input=page.getByLabel('Import Bunshō aggregate snapshot');
  const payload={name:'summary.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(summary))};
  await input.setInputFiles(payload);
  await page.getByText('0 / 620 sentences studied',{exact:true}).waitFor();
  await input.setInputFiles([]);
  await input.setInputFiles(payload);
  await page.getByText('0 / 620 sentences studied',{exact:true}).waitFor();
  await input.setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...summary,owner:'private'}))});
  await page.getByText('Invalid or unsupported snapshot',{exact:true}).waitFor();
  await input.setInputFiles(payload);
  await page.getByText('Imported device snapshot — not verified Account progress',{exact:true}).waitFor();
  await page.getByRole('link',{name:'Resume Bunshō'}).click();
  await page.getByRole('button',{name:'Export ecosystem summary'}).waitFor();
  await page.goto(base+'#jv=1&kind=sentence&id=constructor');
  await page.getByText('0 contextual examples.',{exact:false}).waitFor();
  await page.goto(base+'#jv=2&kind=review');
  await page.getByRole('heading',{name:'Context & Japanese ecosystem'}).waitFor();
  }catch(e){
   console.error(engine.name()+' M3 failure', {url:page.url(),body:(await page.locator('body').innerText().catch(()=>'' )).slice(0,700),diagnostics:diagnostics.slice(-20)});
   throw e;
  }
  await context.close();
  console.log(engine.name()+': M3 public references, contextual search, explicit practice, aggregate export, hub snapshot and invalid link PASS');
 }finally{await browser.close();}
}

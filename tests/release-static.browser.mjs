import {chromium} from './.m1-browser-deps/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import {resolve,extname,join,sep} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('release-static'),original=resolve(process.argv[2]??'');
const manifest=JSON.parse(await readFile(join(root,'release-manifest.json'),'utf8'));
for(const entry of manifest.files)assert.equal(createHash('sha256').update(await readFile(join(root,entry.path))).digest('hex'),entry.sha256,entry.path);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.json':'application/json'};
function serve(dir,port,scoped){return new Promise(resolveServer=>{
 const server=createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,'http://127.0.0.1').pathname;
   if(scoped&&path==='/bunshou'){res.writeHead(308,{Location:'/bunshou/'});res.end();return;}
   if(scoped&&!path.startsWith('/bunshou/')){res.writeHead(404);res.end();return;}
   let file=resolve(dir,'.'+decodeURIComponent(path));
   if(file!==dir&&!file.startsWith(dir+sep))throw Error('path');
   if((await stat(file)).isDirectory())file=join(file,'index.html');
   const bytes=await readFile(file);
   const headers={'Content-Type':mime[extname(file)]??'application/octet-stream'};
   if(scoped&&path==='/bunshou/auth/callback/'){headers['Cache-Control']='no-store';headers['Referrer-Policy']='no-referrer';}
   res.writeHead(200,headers);res.end(bytes);
  }catch{res.writeHead(404);res.end();}
 });server.listen(port,'127.0.0.1',()=>resolveServer(server));
});}
const server=await serve(root,4175,true),baseline=await serve(original,4176,false);
const base='http://127.0.0.1:4175/bunshou/',old='http://127.0.0.1:4176/';
const browser=await chromium.launch();
try{
 const cb=await fetch(base+'auth/callback/?code=disposable-routing-probe');
 assert.equal(cb.status,200);assert.equal(cb.headers.get('cache-control'),'no-store');
 assert.equal(await cb.text(),await (await fetch(base)).text());
 assert.equal((await fetch(base+'assets/not-a-real-file.js')).status,404);
 assert.equal((await fetch('http://127.0.0.1:4175/')).status,404);
 assert.equal((await fetch(base+'sw.js')).status,200);
 assert.equal((await fetch(base+'manifest.webmanifest')).status,200);
 await mkdir('release-evidence',{recursive:true});
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const results=[];
  for(const [name,url] of [['original',old],['candidate',base]]){
   const ctx=await browser.newContext({viewport,serviceWorkers:'block'});
   await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
   await ctx.route('https://fonts.gstatic.com/**',r=>r.abort());
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'domcontentloaded'});
   const hero=page.getByAltText('Traditional Japanese Kyoto wooden study pavilion overlooking cherry blossoms and Mount Fuji at sunset');
   await hero.waitFor({state:'visible'});
   await page.waitForFunction(()=>Array.from(document.images).some(i=>i.alt.startsWith('Traditional Japanese Kyoto')&&i.complete&&i.naturalWidth>0));
   const details=await hero.evaluate(el=>({width:el.naturalWidth,height:el.naturalHeight,style:getComputedStyle(el).objectFit}));
   const colors=await page.evaluate(()=>({background:getComputedStyle(document.documentElement).backgroundColor,font:getComputedStyle(document.documentElement).fontFamily}));
   const nav=page.getByRole('navigation',{name:viewport.width<768?'Mobile navigation':'Main navigation'});
   for(const label of (viewport.width<768?['Home','Units','Grammar','Library','Stats','Settings']:['Home','Curriculum','Grammar','Library','Progress','Settings']))await nav.getByRole('button',{name:label,exact:true}).waitFor({state:'visible'});
   if(name==='candidate'){
    await page.getByRole('region',{name:'Account and workspace'}).getByText('Guest workspace',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Start guided lesson',exact:true}).waitFor();
    assert.equal(await page.locator('a[href^="https://japanese.thiepn.dev/kotoba/"]').count(),0);
   }
   await page.screenshot({path:'release-evidence/'+name+'-'+viewport.width+'.png',fullPage:true,animations:'disabled'});
   assert.deepEqual(errors,[]);
   results.push({details,colors});
   await ctx.close();
  }
  assert.deepEqual(results[0],results[1]);
  console.log('Original vs candidate '+viewport.width+'px: same hero dimensions/object fit, root palette/font stack and original navigation; screenshots captured (fallback fonts).');
 }
 console.log('Packaged release: hashes, exact callback, headers, SW/manifest, route isolation, missing asset 404, guest rendering PASS (local host simulation, not Cloudflare production).');
}finally{await browser.close();server.close();baseline.close();}

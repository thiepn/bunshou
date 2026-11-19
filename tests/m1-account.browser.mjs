import {chromium,firefox,webkit} from './.m1-browser-deps/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const origin='https://japanese.thiepn.dev', base=origin+'/bunshou/', callback=base+'auth/callback/';
const account='https://account.thiepn.dev', issuer='https://hycegznamzjhwinegaai.supabase.co';
const client='33333333-3333-4333-8333-333333333333', A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const emails={[A]:'a@example.invalid',[B]:'b@example.invalid'}, key='thiepn:bunshou:sso:v1:tokens', optout='thiepn:sso:'+client+':manual-signout';
const raw=JSON.stringify({version:1,records:{},favorites:['a11-u01-01'],dailyLogs:{},completedDialogues:[]});
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const root=resolve('dist-m1-fixture');
for(const engine of [chromium,firefox,webkit]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  let loginAs=A, eligible=false, denied=false, issued=0, refreshed=0, probes=0, nonce=0;
  const codes=new Map(),tokens=new Map(),refreshes=new Map(),errors=[];
  const cors={'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type,accept','cache-control':'no-store'};
  const reply=(route,status,body)=>route.fulfill({status,headers:cors,contentType:'application/json',body:JSON.stringify(body)});
  const issue=owner=>{const n=++issued,access='fixture-access-token-'+n,refresh='fixture-refresh-'+n;tokens.set(access,owner);refreshes.set(refresh,owner);return {access_token:access,refresh_token:refresh,expires_in:3600,token_type:'bearer',scope:'openid email profile offline_access'};};
  await context.route('**/*',async route=>{
   try{
    const req=route.request(),u=new URL(req.url());
    if(u.origin===origin&&u.pathname.startsWith('/bunshou/')){
     const relative=u.pathname.slice('/bunshou/'.length), path=(!relative||relative==='auth/callback/')?'index.html':relative;
     const file=resolve(root,path);if(!file.startsWith(root+'/'))throw Error('fixture traversal');
     let body;try{body=await readFile(file);}catch{return route.fulfill({status:404,body:'fixture not found'});}
     return route.fulfill({status:200,contentType:mime[extname(file)]||'application/octet-stream',body});
    }
    if(u.origin===account&&u.pathname==='/sso/probe'){
     probes++;assert.equal(u.searchParams.get('client_id'),client);
     const data=JSON.stringify({type:'thiepn:sso-probe:v1',clientId:client,signedIn:eligible,eligible});
     return route.fulfill({status:200,contentType:'text/html',body:'<script>parent.postMessage('+data+','+JSON.stringify(origin)+')</script>'});
    }
    if(u.origin!==issuer)return route.abort();
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    if(u.pathname==='/auth/v1/oauth/authorize'){
     const p=u.searchParams;assert.equal(p.get('client_id'),client);assert.equal(p.get('redirect_uri'),callback);assert.equal(p.get('response_type'),'code');assert.equal(p.get('code_challenge_method'),'S256');
     const code='fixture-code-'+(++nonce);codes.set(code,{owner:loginAs,challenge:p.get('code_challenge')});
     return route.fulfill({status:302,headers:{location:callback+'?code='+encodeURIComponent(code)+'&state='+encodeURIComponent(p.get('state'))}});
    }
    if(u.pathname==='/auth/v1/oauth/token'){
     const p=new URLSearchParams(req.postData()||'');assert.equal(p.get('client_id'),client);
     if(p.get('grant_type')==='authorization_code'){
      const code=p.get('code'),entry=codes.get(code);assert.ok(entry);codes.delete(code);
      assert.equal(p.get('redirect_uri'),callback);assert.equal(createHash('sha256').update(p.get('code_verifier')).digest('base64url'),entry.challenge);
      return reply(route,200,issue(entry.owner));
     }
     if(p.get('grant_type')==='refresh_token'){
      const refresh=p.get('refresh_token'),owner=refreshes.get(refresh);if(!owner)return reply(route,400,{error:'invalid_grant'});refreshes.delete(refresh);refreshed++;return reply(route,200,issue(owner));
     }
     throw Error('unknown grant');
    }
    const owner=tokens.get(req.headers().authorization?.replace(/^Bearer /,''));
    if(!owner)return reply(route,401,{error:'invalid_token'});
    if(u.pathname==='/auth/v1/user')return reply(route,200,{id:owner,email:emails[owner]});
    if(u.pathname==='/rest/v1/account_app_connections')return reply(route,200,[{user_id:owner,status:'connected'}]);
    if(u.pathname==='/rest/v1/account_app_grants')return reply(route,200,[{user_id:owner,permission_id:'identity.basic',status:denied?'denied':'granted'}]);
    throw Error('unexpected issuer path '+u.pathname);
   }catch(e){errors.push(String(e));await route.abort().catch(()=>{});}
  });
  await context.addInitScript(({origin,raw})=>{if(location.origin===origin&&!localStorage.getItem('fixture-seeded')){localStorage.setItem('bunsho_app_state_v1',raw);localStorage.setItem('fixture-seeded','1');}},{origin,raw});
  const page=await context.newPage();page.on('dialog',d=>d.accept());
  const saved=async p=>p.getByText('Saved on this device',{exact:false}).first().waitFor({state:'visible',timeout:20000});
  const owner=async(p,id)=>{await p.getByText(emails[id],{exact:true}).waitFor({state:'visible',timeout:20000});await saved(p);};
  const guest=async p=>{await p.getByText('Guest workspace',{exact:true}).first().waitFor({state:'visible',timeout:20000});await saved(p);};
  const row=async(p,id)=>p.evaluate(id=>new Promise((resolve,reject)=>{const q=indexedDB.open('thiepn-bunshou-workspaces-v1',1);q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('states'),r=tx.objectStore('states').get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();};}),id);
  await page.goto(base);await guest(page);
  await page.getByRole('button',{name:'Continue with THIEPN Account'}).click();await owner(page,A);
  assert.equal(page.url(),base);assert.equal(await page.evaluate(()=>sessionStorage.getItem('thiepn:bunshou:sso:v1:pending')),null);
  await page.getByRole('button',{name:'Move guest progress'}).click();await owner(page,A);
  const a=await row(page,A),g=await row(page,'guest');assert.deepEqual(JSON.parse(a.raw).favorites,['a11-u01-01']);assert.deepEqual(JSON.parse(g.raw).favorites,[]);assert.equal(g.previousRaw,undefined);
  await page.evaluate(key=>{const t=JSON.parse(localStorage.getItem(key));t.expiresAt=1;localStorage.setItem(key,JSON.stringify(t));window.dispatchEvent(new Event('focus'));},key);
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key))?.expiresAt>Date.now(),key);await owner(page,A);assert.ok(refreshed>=1);
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(500);
  await context.setOffline(true);
  await page.getByRole('button',{name:'Continue offline locally'}).click({timeout:15000});
  await page.getByText('Offline local access',{exact:false}).waitFor({state:'visible'});await owner(page,A);
  assert.equal(await page.getByRole('button',{name:'Move guest progress'}).count(),0);
  await context.setOffline(false);await owner(page,A);await page.getByText('Offline local access',{exact:false}).waitFor({state:'hidden'});
  eligible=true;await page.getByRole('button',{name:'Sign out',exact:true}).click();await guest(page);
  const before=issued;await page.reload();await guest(page);assert.equal(issued,before);assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null);
  loginAs=B;await page.getByRole('button',{name:'Continue with THIEPN Account'}).click();await owner(page,B);
  assert.equal(await page.getByText(emails[A],{exact:true}).count(),0);assert.equal(await row(page,B),null);assert.deepEqual((await row(page,A)).raw,a.raw);
  denied=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.getByRole('button',{name:'Continue as guest'}).waitFor({timeout:15000});assert.equal(await page.getByText(emails[B],{exact:true}).count(),0);
  await page.getByRole('button',{name:'Continue as guest'}).click();await guest(page);
  denied=false;loginAs=A;await page.getByRole('button',{name:'Continue with THIEPN Account'}).click();await owner(page,A);
  assert.deepEqual((await row(page,A)).raw,a.raw);
  const other=await context.newPage();await other.goto(base);await owner(other,A);
  await context.setOffline(true);await page.getByRole('button',{name:'Continue offline locally'}).click({timeout:15000});await owner(page,A);
  await other.evaluate(key=>localStorage.removeItem(key),key);
  await page.getByRole('button',{name:'Continue as guest'}).waitFor({timeout:15000});assert.equal(await page.getByText(emails[A],{exact:true}).count(),0);
  await page.getByRole('button',{name:'Continue as guest'}).click();await guest(page);await context.setOffline(false);await other.close();
  await page.reload();await guest(page);
  await page.evaluate(optout=>localStorage.removeItem(optout),optout);await page.reload();await owner(page,A);
  assert.ok(probes>=2);assert.deepEqual(errors,[]);
  await context.close();
  console.log(engine.name()+': Account fixture PASS (PKCE, migration, refresh, offline, A/B isolation, sign-out, revocation, cross-tab token removal, SSO)');
 }finally{await browser.close();}
}

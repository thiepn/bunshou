import type {AccountClient} from '../account/adapter';
import {createTransport} from './transport';
// Never export any SDK access/refresh token. The exact disposable build AND
// intercepted synthetic Account session must both be present.
export const fixtureEnabled=import.meta.env.VITE_BUNSHOU_M2_FIXTURE==='true'&&import.meta.env.VITE_BUNSHOU_OAUTH_CLIENT_ID==='33333333-3333-4333-8333-333333333333'&&import.meta.env.VITE_BUNSHOU_ACCOUNT_PUBLISHABLE_KEY==='disposable-fixture-key-not-a-real-key';
export function accountFixtureTransport(client:AccountClient,owner:string,stillCurrent:()=>boolean){
 if(!fixtureEnabled)throw Error('SYNC_FIXTURE_DISABLED');
 return createTransport('https://bunshou-m2-fixture.invalid',async()=>{
  if(!stillCurrent()||!navigator.onLine)throw Error('SYNC_AUTH_REQUIRED');
  const identity=await client.sso.verify();
  if(identity.status!=='signed-in'||identity.id!==owner||!stillCurrent())throw Error('SYNC_AUTH_REQUIRED');
  // Verification and grant checks exclusively use the existing Account adapter.
  const verified=await client.verifyConnection(identity);
  const token=await client.sso.getAccessToken();
  if(verified.status!=='signed-in'||verified.id!==owner||!/^fixture-access-token-\d+$/.test(token??'')||!stillCurrent())throw Error('SYNC_AUTH_REQUIRED');
  const bearer=owner==='11111111-1111-4111-8111-111111111111'?'fixture-a':owner==='22222222-2222-4222-8222-222222222222'?'fixture-b':'';
  if(!bearer)throw Error('SYNC_AUTH_REQUIRED');
  return {owner,bearer};
 },owner,stillCurrent);
}

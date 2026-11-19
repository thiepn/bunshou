import {createThiepnAccountSession,createThiepnBrowserSso} from '../../vendor/account-session/src/index';
import type {ThiepnIdentity} from '../../vendor/account-session/src/index';
export type Identity = ThiepnIdentity;
export const ACCOUNT_ORIGIN='https://account.thiepn.dev';
export const CALLBACK='https://japanese.thiepn.dev/bunshou/auth/callback/';
export const SESSION_KEY='thiepn:bunshou:sso:v1';
export function createAccount() {
  const env=import.meta.env;
  const issuer=env.VITE_BUNSHOU_ACCOUNT_ISSUER, key=env.VITE_BUNSHOU_ACCOUNT_PUBLISHABLE_KEY, clientId=env.VITE_BUNSHOU_OAUTH_CLIENT_ID;
  if(env.VITE_BUNSHOU_ACCOUNT_ENABLED!=='true') return null;
  if(!issuer || !key || !clientId) throw Error('ACCOUNT_CONFIG_INCOMPLETE');
  const redirect=env.VITE_BUNSHOU_CALLBACK_URL || CALLBACK;
  if(redirect!==CALLBACK || location.origin!==new URL(CALLBACK).origin) throw Error('ACCOUNT_ROUTE_NOT_CONFIGURED');
  const session=createThiepnAccountSession({issuer,publishableKey:key,clientId,redirectUri:redirect,storageKey:SESSION_KEY,authPolicy:'guest-first'});
  const sso=createThiepnBrowserSso(session,{accountOrigin:ACCOUNT_ORIGIN});
  // Connection/grant state is distinct from an authenticated identity.
  async function verifyConnection(identity: Identity): Promise<Identity> {
    if(identity.status!=='signed-in') return identity;
    const bearer=await sso.getAccessToken();
    if(!bearer) return {status:'unavailable',code:'ACCOUNT_TOKEN_UNAVAILABLE'};
    const req=(table:string,query:string)=>fetch(session.issuer+'/rest/v1/'+table+'?'+query,{headers:{apikey:key,Authorization:'Bearer '+bearer},cache:'no-store',signal:AbortSignal.timeout(8000)});
    const [connections,grants]=await Promise.all([
      req('account_app_connections','select=status,user_id&app_slug=eq.bunshou'),
      req('account_app_grants','select=permission_id,status,user_id&app_slug=eq.bunshou&permission_id=eq.identity.basic')
    ]);
    if(!connections.ok||!grants.ok) return {status:'unavailable',code:'ACCOUNT_CONNECTION_UNAVAILABLE'};
    const c=await connections.json(),g=await grants.json();
    if(!Array.isArray(c)||!Array.isArray(g)||!c.some(x=>x.user_id===identity.id&&(x.status==='connected'||x.status==='limited'))||!g.some(x=>x.user_id===identity.id&&x.permission_id==='identity.basic'&&x.status==='granted')) return {status:'unavailable',code:'ACCOUNT_CONNECTION_REQUIRED'};
    const latest=await sso.verify();
    return latest.status==='signed-in'&&latest.id===identity.id?latest:{status:'unavailable',code:'ACCOUNT_IDENTITY_CHANGED'};
  }
  return {sso,verifyConnection};
}
export type AccountClient=NonNullable<ReturnType<typeof createAccount>>;

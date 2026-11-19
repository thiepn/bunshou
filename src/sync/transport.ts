import {APP_ID,RESOURCE,RESOURCE_ID,type Mutation,type Remote,validateDocument} from './model';
export type Credentials={owner:string;bearer:string};
export interface SyncTransport{
 push(deviceId:string,mutation:Mutation):Promise<{status:'applied'|'already_applied'|'conflict';revision?:number}>;
 pull(deviceId:string,cursor:string|null):Promise<{remote?:Remote;cursor:string;hasMore:boolean}>;
}
/** Explicitly injected development endpoint. No production endpoint/default. */
export function createTransport(endpoint:string,authorize:()=>Promise<Credentials>,expectedOwner:string,stillCurrent:()=>boolean):SyncTransport{
 const url=new URL(endpoint);
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.protocol!=='http:')throw Error('SYNC_DEVELOPMENT_ENDPOINT_ONLY');
 async function post(path:string,data:unknown){
  if(!stillCurrent())throw Error('SYNC_OWNER_CHANGED');
  const auth=await authorize();if(!stillCurrent()||auth.owner!==expectedOwner||!auth.bearer)throw Error('SYNC_AUTH_REQUIRED');
  const response=await fetch(new URL(path,url),{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+auth.bearer},body:JSON.stringify(data),credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!stillCurrent())throw Error('SYNC_OWNER_CHANGED');
  if(!response.ok)throw Error('SYNC_HTTP_'+response.status);
  const result=await response.json();if(!stillCurrent())throw Error('SYNC_OWNER_CHANGED');
  if(result.protocol_version!==1)throw Error('SYNC_PROTOCOL_VERSION');return result;
 }
 return {
  async push(deviceId,mutation){
   const result=await post('/v1/sync/push',{protocol_version:1,app_id:APP_ID,device_id:deviceId,mutations:[mutation]});
   if(!Array.isArray(result.results)||result.results.length!==1)throw Error('SYNC_INVALID_ACK');
   const ack=result.results[0];
   if(ack.mutation_id!==mutation.mutation_id||ack.resource_id!==RESOURCE_ID||!['applied','already_applied','conflict'].includes(ack.status))throw Error('SYNC_REJECTED');
   if(ack.status!=='conflict'&&(!Number.isSafeInteger(ack.revision)||ack.revision!==mutation.base_revision+1))throw Error('SYNC_INVALID_ACK');
   return ack;
  },
  async pull(deviceId,cursor){
   const result=await post('/v1/sync/pull',{protocol_version:1,device_id:deviceId,app_id:APP_ID,cursor,limit:100});
   if(result.reset_required)throw Error('SYNC_BOOTSTRAP_REQUIRED');
   if(!Array.isArray(result.changes)||typeof result.next_cursor!=='string'||typeof result.has_more!=='boolean')throw Error('SYNC_INVALID_PULL');
   let remote:Remote|undefined;
   for(const c of result.changes){
    if(c.app_id!==APP_ID||c.primitive!=='document'||c.resource_type!==RESOURCE||c.resource_id!==RESOURCE_ID||c.schema_version!==1||!Number.isSafeInteger(c.revision)||c.revision<1||!['upsert','delete'].includes(c.operation)||(remote&&c.revision<=remote.revision))throw Error('SYNC_INVALID_CHANGE');
    remote={revision:c.revision,document:c.operation==='delete'?null:validateDocument(c.data)};
   }
   return {remote,cursor:result.next_cursor,hasMore:result.has_more};
  }
 };
}

import {WorkspaceStore,GUEST,type Envelope} from '../storage/workspace';
import {buildMutation,reconcile,type Remote,remoteRaw} from './model';
import type {SyncTransport} from './transport';
export type SyncResult='synced'|'pending'|'conflict';
/** Foreground, bounded cycle. Metadata and state use the same IDB transaction.
 * A lost response never deletes the immutable flight. Other tabs may retry it.
 */
export async function synchronize(store:WorkspaceStore,owner:string,transport:SyncTransport,stillCurrent:()=>boolean):Promise<SyncResult>{
 if(owner===GUEST||!stillCurrent())throw Error('SYNC_AUTH_REQUIRED');
 let row=await store.read(owner);
 const write=async(fn:Parameters<WorkspaceStore['updateSync']>[3])=>{row=await store.updateSync(owner,row.revision,stillCurrent,fn);};
 if(!row.sync)await write((r,m)=>({raw:r.raw,meta:m}));
 for(let step=0;step<32;step++){
  if(!stillCurrent())throw Error('SYNC_OWNER_CHANGED');
  const m=row.sync!;
  if(m.conflict)return 'conflict';
  if(m.flight){
   const flight=m.flight,ack=await transport.push(m.deviceId,flight.mutation);
   if(ack.status==='conflict'){
    // Keep pending events until remote changes have been durably read.
    await write((r,x)=>({raw:r.raw,meta:{...x,flight:undefined}}));
   }else{
    const remote:Remote={revision:ack.revision!,document:flight.mutation.data};
    await write((r,x)=>({raw:r.raw,meta:{...x,remote,flight:undefined,pending:x.pending.filter(y=>!flight.included.includes(y.id))}}));
   }
  }
  // Pull pages before creating any new mutation, including after acknowledgement.
  const current=row.sync!,page=await transport.pull(current.deviceId,current.cursor);
  await write((r,x)=>{
   // A push acknowledgement may be ahead of an older pull page.
   const merged=page.remote&&page.remote.revision>=x.remote.revision?reconcile(r.raw,x,page.remote):{raw:r.raw,meta:x};
   if(merged.meta.conflict)return merged; // do not advance cursor past unresolved changes
   return {raw:merged.raw,meta:{...merged.meta,cursor:page.cursor}};
  });
  if(row.sync!.conflict)return 'conflict';
  if(page.hasMore)continue;
  if(row.sync!.pending.length===0)return 'synced';
  await write((r,x)=>({raw:r.raw,meta:{...x,flight:{mutation:buildMutation(r.raw,x),included:x.pending.map(c=>c.id)}}}));
 }
 return 'pending';
}
/** First-stage explicit resolution: adopt remote while retaining local candidate
 * in previousRaw. Keeping local after deletion requires a new explicit import,
 * not an automatic stale retry. */
export async function acceptRemote(store:WorkspaceStore,owner:string,revision:number,stillCurrent:()=>boolean):Promise<Envelope>{
 return store.updateSync(owner,revision,stillCurrent,(r,m)=>{
  if(!m.conflict)throw Error('SYNC_NO_CONFLICT');
  const remote=m.conflict.remote;
  return {raw:remoteRaw(remote),meta:{...m,remote,pending:[],flight:undefined,conflict:undefined,archives:[...(m.archives??[]),{...m.conflict,localRaw:r.raw,pending:m.pending}]}};
 });
}

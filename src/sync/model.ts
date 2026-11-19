import type {PersistedAppState, ReviewGrade} from '../types/curriculum';
import {validateAndParseBackupJson,createInitialAppState} from '../utils/storage';
import {SENTENCES_BY_ID} from '../data/sentences';

export const APP_ID='bunshou' as const;
export const RESOURCE='learner_state' as const;
export const RESOURCE_ID='progress-v1' as const;
export type Action={kind:'edit'|'replace'|'undo'}|{kind:'review';sentenceId:string;grade:ReviewGrade;date:string;isNew:boolean};
export type ReviewEvent={event_id:string;event_type:'review.completed';schema_version:1;occurred_at:string;data:Extract<Action,{kind:'review'}>};
export type LocalChange={id:string;action:Action;event?:ReviewEvent};
export type Document={raw:string;generation:number;reviews:ReviewEvent[]};
export type Remote={revision:number;document:Document|null};
export type Mutation={mutation_id:string;primitive:'document';resource_type:typeof RESOURCE;resource_id:typeof RESOURCE_ID;operation:'upsert';base_revision:number;schema_version:1;data:Document};
export type Conflict={reason:string;localRaw:string;remote:Remote;pending:LocalChange[]};
export type SyncMeta={deviceId:string;remote:Remote;cursor:string|null;pending:LocalChange[];flight?:{mutation:Mutation;included:string[]};conflict?:Conflict};
export const emptyRaw=()=>JSON.stringify(createInitialAppState());
export function state(raw:string):PersistedAppState{const r=validateAndParseBackupJson(raw);if(!r.valid||!r.state)throw Error('SYNC_INVALID_STATE');return r.state;}
export function canonical(v:unknown):string{
 if(v===undefined)return 'undefined';
 if(v===null||typeof v!=='object')return JSON.stringify(v);
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 const obj=v as Record<string,unknown>;
 return '{'+Object.keys(obj).filter(k=>obj[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(obj[k])).join(',')+'}';
}
export const same=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
export const sameRaw=(a:string,b:string)=>same(state(a),state(b));
export const uuid=()=>crypto.randomUUID();
export function initialMeta(deviceId=uuid()):SyncMeta{return {deviceId,remote:{revision:0,document:null},cursor:null,pending:[]};}
export function change(action:Action={kind:'edit'},id=uuid()):LocalChange{
 if(action.kind!=='review')return {id,action};
 const event:ReviewEvent={event_id:id,event_type:'review.completed',schema_version:1,occurred_at:new Date().toISOString(),data:action};
 return {id,action,event};
}
export function appendLocal(meta:SyncMeta|undefined,action:Action={kind:'edit'},adopt=false):SyncMeta{
 const m=meta??initialMeta();
 return {...m,pending:[...m.pending,...(adopt&&!meta?[change({kind:'replace'})]:[]),change(action)]};
}
export function unionReviews(a:ReviewEvent[],b:ReviewEvent[]):ReviewEvent[]{
 const events=new Map<string,ReviewEvent>();
 for(const e of [...a,...b]){
  validateEvent(e);
  const old=events.get(e.event_id);if(old&&!same(old,e))throw Error('SYNC_EVENT_ID_REUSE');events.set(e.event_id,e);
 }
 return [...events.values()].sort((x,y)=>x.event_id.localeCompare(y.event_id));
}
function validateEvent(e:ReviewEvent){
 if(!e||typeof e.event_id!=='string'||!/^[-0-9a-f]{36}$/i.test(e.event_id)||e.event_type!=='review.completed'||e.schema_version!==1||!Number.isFinite(Date.parse(e.occurred_at))||e.data?.kind!=='review'||!Object.hasOwn(SENTENCES_BY_ID,e.data.sentenceId)||!['again','hard','good','easy'].includes(e.data.grade)||!/^\d{4}-\d{2}-\d{2}$/.test(e.data.date)||typeof e.data.isNew!=='boolean')throw Error('SYNC_INVALID_REVIEW');
}
export function validateDocument(d:Document){
 if(!d||typeof d.raw!=='string'||!Number.isSafeInteger(d.generation)||d.generation<0||!Array.isArray(d.reviews)||d.reviews.length>100000)throw Error('SYNC_INVALID_DOCUMENT');
 state(d.raw);const unique=unionReviews([],d.reviews);if(unique.length!==d.reviews.length)throw Error('SYNC_DUPLICATE_EVENT');
 return d;
}
export function remoteRaw(remote:Remote){return remote.document?.raw??emptyRaw();}
export function buildMutation(raw:string,m:SyncMeta):Mutation{
 const previous=m.remote.document;
 const replacement=m.pending.some(x=>x.action.kind==='replace');
 const data=validateDocument({raw,generation:(previous?.generation??0)+Number(replacement),reviews:unionReviews(previous?.reviews??[],m.pending.flatMap(x=>x.event?[x.event]:[]))});
 return {mutation_id:uuid(),primitive:'document',resource_type:RESOURCE,resource_id:RESOURCE_ID,operation:'upsert',base_revision:m.remote.revision,schema_version:1,data};
}
/** Conservative structural three-way merge; counters and SRS records are atomic per item.
 * Never infer missing legacy review history or replay the scheduler with a different order.
 */
export function mergeRaw(base:string,local:string,remote:string):string|null{
 const b=state(base),l=state(local),r=state(remote);
 const pick=(x:unknown,y:unknown,z:unknown):unknown=>{if(same(y,z))return y;if(same(x,y))return z;if(same(x,z))return y;throw Error('OVERLAP');};
 const map=(x:Record<string,unknown>,y:Record<string,unknown>,z:Record<string,unknown>)=>{
  const result:Record<string,unknown>=Object.create(null);
  for(const k of new Set([...Object.keys(x),...Object.keys(y),...Object.keys(z)])){const value=pick(x[k],y[k],z[k]);if(value!==undefined)result[k]=value;}return result;
 };
 const set=(x:string[],y:string[],z:string[])=>[...new Set([...x,...y,...z])].filter(k=>pick(x.includes(k),y.includes(k),z.includes(k))).sort();
 try{
  const logs=map(b.dailyLogs,l.dailyLogs,r.dailyLogs);
  const merged={version:1,settings:map(b.settings as unknown as Record<string,unknown>,l.settings as unknown as Record<string,unknown>,r.settings as unknown as Record<string,unknown>),records:map(b.records,l.records,r.records),dailyLogs:logs,favorites:set(b.favorites,l.favorites,r.favorites),completedDialogues:set(b.completedDialogues??[],l.completedDialogues??[],r.completedDialogues??[]),lastOmikujiDate:pick(b.lastOmikujiDate,l.lastOmikujiDate,r.lastOmikujiDate),lastOmikujiId:pick(b.lastOmikujiId,l.lastOmikujiId,r.lastOmikujiId)};
  const raw=JSON.stringify(merged);state(raw);return raw;
 }catch{return null;}
}
export function reconcile(localRaw:string,m:SyncMeta,remote:Remote):{raw:string;meta:SyncMeta}{
 if(remote.revision===m.remote.revision){if(!same(remote,m.remote))throw Error('SYNC_REVISION_REUSE');return {raw:localRaw,meta:m};}
 if(remote.revision<m.remote.revision)throw Error('SYNC_REVISION_ROLLBACK');
 if(remote.document)validateDocument(remote.document);
 const dirty=m.pending.length>0;
 if(!dirty)return {raw:remoteRaw(remote),meta:{...m,remote,conflict:undefined}};
 const barrier=m.pending.some(x=>x.action.kind==='replace'||x.action.kind==='undo');
 const deleted=remote.document===null||((m.remote.document?.generation??0)!==remote.document.generation);
 const merged=!barrier&&!deleted?mergeRaw(remoteRaw(m.remote),localRaw,remoteRaw(remote)):null;
 if(merged===null)return {raw:localRaw,meta:{...m,conflict:{reason:deleted?'REMOTE_REPLACEMENT_OR_DELETION':barrier?'LOCAL_REPLACEMENT_OR_UNDO':'OVERLAPPING_PROGRESS',localRaw,remote,pending:m.pending}}};
 return {raw:merged,meta:{...m,remote,conflict:undefined}};
}

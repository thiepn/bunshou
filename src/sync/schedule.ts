import type {SyncMeta} from './model';
export const DEBOUNCE_MS=1500, POLL_MS=60000, MAX_FAILURES=5;
export type SyncReceipt={attemptId:string;attemptAt:number;lastSuccessAt?:number;failures:number;retryAt?:number;outcome:'running'|'synced'|'pending'|'conflict'|'retry'|'blocked';code?:string};
export function beginAttempt(previous:SyncReceipt|undefined,id:string,now:number,manual:boolean):SyncReceipt{
 return {attemptId:id,attemptAt:now,lastSuccessAt:previous?.lastSuccessAt,failures:manual?0:previous?.failures??0,outcome:'running'};
}
export function finishAttempt(r:SyncReceipt,result:'synced'|'pending'|'conflict',now:number):SyncReceipt{
 return {...r,outcome:result,lastSuccessAt:result==='synced'?now:r.lastSuccessAt,failures:0,retryAt:undefined,code:undefined};
}
export function failureReceipt(r:SyncReceipt,error:unknown,now:number):SyncReceipt{
 const code=error instanceof Error&&/^SYNC_[A-Z0-9_]+$/.test(error.message)?error.message:'SYNC_NETWORK_OR_STORAGE';
 const transient=code==='SYNC_NETWORK_OR_STORAGE'||code==='SYNC_LOCAL_REVISION_CONFLICT'||code==='SYNC_HTTP_429'||/^SYNC_HTTP_5\d\d$/.test(code);
 const failures=r.failures+1;
 const retry=transient&&failures<MAX_FAILURES;
 return {...r,failures,outcome:retry?'retry':'blocked',code,retryAt:retry?now+Math.min(30000,2000*2**(failures-1)):undefined};
}
/** Only called while foreground, eligible, and free of local writes. A persisted
 * retry deadline survives reload; focus/reconnect cannot bypass the retry ceiling. */
export function nextDelay(m:SyncMeta|undefined,now:number,wake=false):number|null{
 if(!m?.autoSync||m.conflict)return null;
 const r=m.receipt;
 if(r?.outcome==='blocked')return null;
 if(r?.outcome==='retry')return Math.max(DEBOUNCE_MS,(r.retryAt??now)-now);
 if(m.pending.length||m.flight||r?.outcome==='pending'||r?.outcome==='running'||!r?.lastSuccessAt||wake)return DEBOUNCE_MS;
 return Math.max(DEBOUNCE_MS,r.lastSuccessAt+POLL_MS-now);
}
export function statusText(m:SyncMeta|undefined,offline:boolean):string{
 if(m?.conflict)return 'Conflict — choose a version';
 if(offline)return 'Offline — changes stored locally';
 const r=m?.receipt;
 if(r?.outcome==='blocked')return 'Sync paused — manual retry required';
 if(r?.outcome==='retry')return 'Sync retry scheduled';
 if(m?.pending.length||m?.flight)return 'Local changes pending';
 if(r?.outcome==='running')return 'Last attempt not confirmed';
 if(r?.outcome==='synced'&&r.lastSuccessAt)return 'Fixture sync complete';
 if(r?.outcome==='pending')return 'More changes pending';
 return 'Not yet synchronized';
}

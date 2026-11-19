import {beginAttempt,finishAttempt,failureReceipt,nextDelay,statusText} from '../sync/schedule';
import {accountFixtureTransport,fixtureEnabled} from '../sync/fixtureAccount';
import {synchronize,acceptRemote,keepLocal} from '../sync/engine';
import {remoteRaw} from '../sync/model';
import type {Action} from '../sync/model';
import {useEffect,useRef,useState,useCallback} from 'react';
import type {SetStateAction} from 'react';
import App from '../App';
import type {PersistedAppState} from '../types/curriculum';
import {createAccount, CALLBACK, SESSION_KEY, type AccountClient, type Identity} from './adapter';
import {WorkspaceStore,WorkspaceError,GUEST,decode,encode,type Envelope} from '../storage/workspace';
import {createInitialAppState} from '../utils/storage';
import {syncPort} from '../storage/sync';

type Selection={owner:string;email?:string|null;epoch:number};
type Ready={store:WorkspaceStore;row:Envelope;guest:Envelope|null;selection:Selection;cancel:AbortController};
const btn='rounded-lg border border-stone-400 px-3 py-2 text-sm hover:bg-stone-200 dark:hover:bg-slate-800 disabled:opacity-50';
function download(raw:string,name:string){const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export default function AccountWorkspace(){
  const [account]=useState<{client:AccountClient|null;error:string}>(()=>{try{return {client:createAccount(),error:''};}catch{return {client:null,error:'Account configuration unavailable'};}});
  const [selection,setSelection]=useState<Selection|null>(null);
  const [message,setMessage]=useState('Checking Account session…');
  const [ready,setReady]=useState<Ready|null>(null);
  const [error,setError]=useState<WorkspaceError|null>(null);
  const [recovering,setRecovering]=useState(false);
  const recoveryStore=useRef<WorkspaceStore|null>(null);
  const active=useRef<Ready|null>(null),epoch=useRef(0),identityEpoch=useRef(0),lastIdentity=useRef(''),settled=useRef(false);
  const selectedOwner=useRef<string|null>(null);
  // Same-document local access only; never an authority for remote requests.
  const lease=useRef<{owner:string;tokens:string;expires:number}|null>(null);
  const [offlineMode,setOfflineMode]=useState<'none'|'offer'|'active'|'checking'>('none');
  const offlineRef=useRef<typeof offlineMode>('none');
  const mode=useCallback((value:typeof offlineMode)=>{offlineRef.current=value;setOfflineMode(value);},[]);
  const leaseValid=useCallback(()=>{
    const v=lease.current;
    try{return !!v&&v.owner===selectedOwner.current&&Date.now()<v.expires&&localStorage.getItem(SESSION_KEY+':tokens')===v.tokens;}
    catch{return false;}
  },[]);
  const select=useCallback((owner:string,email?:string|null)=>{
    recoveryStore.current?.close();recoveryStore.current=null;setRecovering(false);
    mode('none');
    selectedOwner.current=owner;
    active.current?.cancel.abort();active.current?.store.close();active.current=null;
    const next={owner,email,epoch:++epoch.current};setReady(null);setError(null);setSelection(next);
    try{window.speechSynthesis?.cancel();}catch{}
  },[mode]);
  const lock=useCallback((text:string)=>{lease.current=null;mode('none');recoveryStore.current?.close();recoveryStore.current=null;setRecovering(false);selectedOwner.current=null;active.current?.cancel.abort();active.current?.store.close();active.current=null;++epoch.current;setReady(null);setSelection(null);setError(null);setMessage(text);try{window.speechSynthesis?.cancel();}catch{}},[mode]);
  useEffect(()=>{
    const client=account.client;let disposed=false;let running=false;let queued=false;
    if(!client){select(GUEST);setMessage(account.error||'Account connection not configured');return;}
    const publish=async(identity:Identity)=>{
      if(disposed||(!navigator.onLine&&identity.status!=='signed-out'))return;
      const token=++identityEpoch.current;
      if(identity.status==='signed-out'){lease.current=null;mode('none');lastIdentity.current='signed-out';if(selectedOwner.current!==GUEST)select(GUEST);setMessage('Guest workspace');return;}
      if(identity.status!=='signed-in'){lastIdentity.current='unavailable';lock('Account unavailable. Retry or use the separate guest workspace.');return;}
      const key='account:'+identity.id;
      if(lastIdentity.current!==key){lock('Verifying Account connection…');lastIdentity.current=key;}
      try{
        const checked=await client.verifyConnection(identity);
        if(disposed||token!==identityEpoch.current)return;
        if(checked.status==='signed-in'&&checked.id===identity.id){
          const stored=localStorage.getItem(SESSION_KEY+':tokens');
          if(!stored||!navigator.onLine){lock('Account session changed. Retry verification.');return;}
          if(selectedOwner.current!==checked.id)select(checked.id,checked.email);
          lease.current={owner:checked.id,tokens:stored,expires:Date.now()+30*60*1000};
          mode('none');setMessage('Account connected');
        }
        else{lastIdentity.current='unavailable';lock('Account connection unavailable. Reconnect or continue as guest.');}
      }catch{if(!disposed&&token===identityEpoch.current){lastIdentity.current='unavailable';lock('Account verification failed. Retry or use guest.');}}
    };
    const recheck=async()=>{if(disposed||!navigator.onLine)return;if(running){queued=true;return;}running=true;const started=identityEpoch.current;try{const result=await client.sso.verify();if(!disposed&&started===identityEpoch.current)await publish(result);}catch{if(!disposed&&started===identityEpoch.current)lock('Account verification unavailable.');}finally{running=false;if(queued){queued=false;void recheck();}}};
    // SDK verification publishes identities itself. Only react to owner/auth changes, not the
    // recursive verification of the same identity inside checkConnection.
    const unsubscribe=client.sso.subscribe(identity=>{
      if(disposed||!settled.current||(!navigator.onLine&&identity.status!=='signed-out'))return;
      const key=identity.status==='signed-in'?'account:'+identity.id:identity.status;
      if(key!==lastIdentity.current)void publish(identity);
    });
    const start=async()=>{
      const started=identityEpoch.current;
      try{
        const url=new URL(location.href),callback=new URL(CALLBACK);
        let identity:Identity;
        if(url.origin===callback.origin&&url.pathname===callback.pathname){
          try{identity=await client.sso.completeCallback(location);}finally{history.replaceState(null,'',new URL('../..',callback).pathname);}
        }else{const result=await client.sso.initialize();if(result.status==='redirecting'){if(!disposed&&started===identityEpoch.current)setMessage('Opening THIEPN Account…');return;}identity=result.identity;}
        if(!disposed){settled.current=true;if(started===identityEpoch.current){if(!navigator.onLine&&identity.status!=='signed-out')lock('Offline startup: verify your Account online, or continue as guest.');else await publish(identity);}}
      }catch{if(!disposed){settled.current=true;if(started===identityEpoch.current)lock('Account initialization failed. Retry or use guest.');}}
    };
    void start();
    const storage=(e:StorageEvent)=>{if(e.key===null||e.key.startsWith(SESSION_KEY)||e.key==='thiepn:sso:'+client.sso.clientId+':manual-signout'){++identityEpoch.current;lastIdentity.current='';lock('Checking changed Account session…');void recheck();}};
    const offline=()=>{
      if(selectedOwner.current===GUEST)return;
      ++identityEpoch.current;
      if(active.current&&leaseValid()){
        mode('offer');setMessage('Connection lost. Continue locally only with this previously verified Account.');
        try{window.speechSynthesis?.cancel();}catch{}
      }else lock('Offline. Account workspace locked; guest learning remains available.');
    };
    const online=()=>{if(offlineRef.current!=='none'){mode('checking');setMessage('Rechecking Account before resuming…');}if(settled.current)void recheck();};
    const focus=()=>{if(navigator.onLine)online();else if(offlineRef.current!=='none'&&!leaseValid())lock('Offline access expired. Reconnect or continue as guest.');};
    window.addEventListener('storage',storage);window.addEventListener('focus',focus);window.addEventListener('online',online);window.addEventListener('offline',offline);
    const interval=setInterval(()=>{if(settled.current&&navigator.onLine)void recheck();else if(offlineRef.current!=='none'&&!leaseValid())lock('Offline access expired. Reconnect or continue as guest.');},30000);
    return()=>{disposed=true;unsubscribe();clearInterval(interval);window.removeEventListener('storage',storage);window.removeEventListener('focus',focus);window.removeEventListener('online',online);window.removeEventListener('offline',offline);};
  },[account,select,lock,mode,leaseValid]);
  useEffect(()=>{
    if(!selection)return;
    let cancelled=false;let store:WorkspaceStore|undefined;
    void(async()=>{try{
      store=await WorkspaceStore.open();
      if(cancelled||selection.epoch!==epoch.current){store.close();return;}
      await store.migrateLegacy(window.localStorage);
      const row=await store.read(selection.owner),guest=selection.owner===GUEST?null:await store.read(GUEST);
      if(cancelled||selection.epoch!==epoch.current){store.close();return;}
      const next={store,row,guest,selection,cancel:new AbortController()};active.current=next;setReady(next);
    }catch(e){store?.close();if(!cancelled&&selection.epoch===epoch.current)setError(e instanceof WorkspaceError?e:new WorkspaceError('WORKSPACE_UNAVAILABLE'));}})();
    return()=>{cancelled=true;store?.close();};
  },[selection]);
  const signout=()=>{++identityEpoch.current;lastIdentity.current='signed-out';lock('Signing out…');try{account.client?.sso.signOutLocal();}catch{setMessage('Account session could not be cleared. Reload or manage Account.');return;}select(GUEST);setMessage('Signed out of Bunshō');};
  const connect=()=>{++identityEpoch.current;lock('Opening THIEPN Account…');void account.client?.sso.connect().catch(()=>setMessage('Account connection failed. Retry or continue as guest.'));};
  const guest=signout;
  const retry=()=>location.reload();
  const recover=async(raw:string)=>{
    const selected=selection,e=error;
    if(!selected||!e||e.raw===undefined||recovering||!['LEGACY_RECOVERY_REQUIRED','RECOVERY_REQUIRED'].includes(e.code))return;
    if(!window.confirm('Restore this validated backup into this workspace? Original damaged bytes will be preserved.'))return;
    const current=()=>selected.epoch===epoch.current&&selectedOwner.current===selected.owner;
    setRecovering(true);let store:WorkspaceStore|undefined;
    try{
      decode(raw);
      store=await WorkspaceStore.open();if(!current())return;
      recoveryStore.current=store;
      if(e.code==='LEGACY_RECOVERY_REQUIRED')await store.restoreLegacy(window.localStorage,e.raw,raw,current);
      else await store.restoreDamaged(selected.owner,e.raw,raw,current);
      if(current())select(selected.owner,selected.email);
    }catch(reason){if(current())setMessage(reason instanceof WorkspaceError?reason.code:'Recovery failed; original preserved.');}
    finally{store?.close();if(recoveryStore.current===store)recoveryStore.current=null;if(current())setRecovering(false);}
  };
  if(!ready)return <main className="max-w-xl mx-auto p-8 space-y-4"><h1 className="text-xl font-bold">Bunshō workspace</h1><p role="status">{error?error.code:message}</p>{error&&<p role="status">{message}</p>}{error?.raw!==undefined&&<button className={btn} onClick={()=>download(error.raw!,'bunshou-original-recovery.json')}>Export original bytes</button>}{error?.recoveryRaw!==undefined&&<button className={btn} onClick={()=>download(error.recoveryRaw!,'bunshou-recovery.json')}>Export recovery copy</button>}{error&&['LEGACY_RECOVERY_REQUIRED','RECOVERY_REQUIRED'].includes(error.code)&&<div className="space-y-2">{error.recoveryRaw!==undefined&&<button className={btn} disabled={recovering} onClick={()=>void recover(error.recoveryRaw!)}>Restore validated recovery copy</button>}<label className="block">Restore a backup file<input aria-label="Recovery backup file" type="file" accept="application/json,.json" disabled={recovering} onChange={e=>{const file=e.currentTarget.files?.[0];if(file){const captured=selection?.epoch;void file.text().then(raw=>{if(captured===epoch.current)void recover(raw);}).catch(()=>setMessage('Could not read recovery file.'));}}}/></label></div>}<div className="flex flex-wrap gap-2"><button className={btn} disabled={recovering} onClick={retry}>Retry</button>{account.client&&<button className={btn} onClick={connect}>Continue with THIEPN Account</button>}<button className={btn} onClick={guest}>Continue as guest</button></div></main>;
  return <>
    {(offlineMode==='offer'||offlineMode==='checking')&&<main className="max-w-xl mx-auto p-8 space-y-4"><h1 className="text-xl font-bold">Account workspace paused</h1><p role="status">{message}</p>{offlineMode==='offer'&&<><p>Only this open document may continue for up to 30 minutes after online verification. No cloud requests or guest migration are available offline.</p><button className={btn} onClick={()=>{if(leaseValid()&&!navigator.onLine)mode('active');else lock('Offline access unavailable. Reconnect or continue as guest.');}}>Continue offline locally</button></>}<button className={btn} onClick={guest}>Continue as guest</button></main>}
    <div hidden={offlineMode==='offer'||offlineMode==='checking'} inert={offlineMode==='offer'||offlineMode==='checking'}>
      <ActiveWorkspace key={ready.selection.epoch} ready={ready} message={message} offline={offlineMode!=='none'} configured={!!account.client} accountClient={account.client} canSync={()=>active.current===ready&&ready.selection.epoch===epoch.current&&offlineRef.current==='none'&&navigator.onLine} connect={connect} signout={signout} reload={()=>{if(!navigator.onLine&&ready.selection.owner!==GUEST){lock('Reconnect before reopening the Account workspace.');return;}select(ready.selection.owner,ready.selection.email);}} isCurrent={()=>active.current===ready&&ready.selection.epoch===epoch.current&&(navigator.onLine||ready.selection.owner===GUEST||leaseValid())}/>
    </div>
  </>;
}
function ActiveWorkspace({ready,message,offline,configured,accountClient,canSync,connect,signout,reload,isCurrent}:{ready:Ready;message:string;offline:boolean;configured:boolean;accountClient:AccountClient|null;canSync:()=>boolean;connect:()=>void;signout:()=>void;reload:()=>void;isCurrent:()=>boolean}){
  const {store,selection}=ready;
  const row=useRef(ready.row),draft=useRef(decode(ready.row.raw)),alive=useRef(true),failed=useRef(false),queue=useRef(Promise.resolve()),pendingCount=useRef(0);
  const claiming=useRef(false);
  const [state,setState]=useState(draft.current),[pending,setPending]=useState(0),[failure,setFailure]=useState(''),[dismissed,setDismissed]=useState(false);
  const [queued,setQueued]=useState(ready.row.sync?.pending.length??0);
  const [syncing,setSyncing]=useState(false),[syncMessage,setSyncMessage]=useState(''),[appEpoch,setAppEpoch]=useState(0);
  const [meta,setMeta]=useState(ready.row.sync);
  const fixture=fixtureEnabled&&!!accountClient&&selection.owner!==GUEST;
  const currentRef=useRef(isCurrent);currentRef.current=isCurrent;
  const syncRef=useRef(canSync);syncRef.current=canSync;
  const controller=useRef<AbortController|null>(null);
  const [wake,setWake]=useState(0);
  const wakeRef=useRef(false);
  const reloadFromStore=async()=>{
    const latest=await store.read(selection.owner);
    if(!alive.current||!currentRef.current())return;
    if(latest.raw!==row.current.raw){draft.current=decode(latest.raw);setState(draft.current);setAppEpoch(v=>v+1);}
    row.current=latest;setQueued(latest.sync?.pending.length??0);setMeta(latest.sync);
  };
  const runSync=async(resolve?:'remote'|'local',automatic=false)=>{
    if(!fixture||!accountClient||!syncRef.current()||document.visibilityState!=='visible'||pendingCount.current||claiming.current||failed.current||!currentRef.current()||(!resolve&&row.current.sync?.conflict))return;
    if(resolve&&!window.confirm(resolve==='remote'?'Use the other device version? This device’s candidate and review events will remain in a recovery archive.':'Replace the synchronized version with this device’s candidate? Both versions will remain in a recovery archive.'))return;
    claiming.current=true;setSyncing(true);setSyncMessage('Synchronizing disposable fixture…');
    const abort=new AbortController();controller.current=abort;
    const signal=AbortSignal.any([abort.signal,ready.cancel.signal]);
    const current=()=>alive.current&&currentRef.current()&&syncRef.current()&&!signal.aborted&&document.visibilityState==='visible';
    const attemptId=crypto.randomUUID();
    const record=async(fn:(m:NonNullable<Envelope['sync']>)=>NonNullable<Envelope['sync']>)=>{
      const latest=await store.read(selection.owner);
      return await store.updateSync(selection.owner,latest.revision,current,(r,m)=>({raw:r.raw,meta:fn(m)}));
    };
    try{
      if(resolve){const r=await store.read(selection.owner);await (resolve==='remote'?acceptRemote:keepLocal)(store,selection.owner,r.revision,current);}
      await record(m=>({...m,receipt:beginAttempt(m.receipt,attemptId,Date.now(),!automatic)}));
      const result=await synchronize(store,selection.owner,accountFixtureTransport(accountClient,selection.owner,current,signal),current);
      if(current())await record(m=>m.receipt?.attemptId===attemptId?{...m,receipt:finishAttempt(m.receipt,result,Date.now())}:m);
    }catch(e){
      if(current()){
        try{await record(m=>m.receipt?.attemptId===attemptId?{...m,receipt:failureReceipt(m.receipt,e,Date.now())}:m);}
        catch{if(current())setSyncMessage('Sync paused — retry or reload workspace');}
      }
    }finally{
      if(alive.current&&currentRef.current()){
        try{await reloadFromStore();setSyncMessage('');}catch{setSyncMessage('Sync paused — reload workspace');}
        setSyncing(false);
      }
      if(controller.current===abort)controller.current=null;
      claiming.current=false;
    }
  };
  const toggleAuto=async()=>{
    if(!fixture||!syncRef.current()||pendingCount.current||claiming.current||failed.current)return;
    claiming.current=true;setSyncing(true);
    try{
      const latest=await store.read(selection.owner);
      const enabled=!latest.sync?.autoSync;
      await store.updateSync(selection.owner,latest.revision,()=>alive.current&&syncRef.current(),(r,m)=>({raw:r.raw,meta:{...m,autoSync:enabled,receipt:enabled&&m.receipt?.outcome==='blocked'?{...m.receipt,outcome:'pending',failures:0,retryAt:undefined}:m.receipt}}));
      await reloadFromStore();
    }catch{if(alive.current&&currentRef.current())setSyncMessage('Automatic sync setting could not be saved');}
    finally{claiming.current=false;if(alive.current&&currentRef.current())setSyncing(false);}
  };
  useEffect(()=>{
    alive.current=true;
    const refresh=()=>{wakeRef.current=true;setWake(v=>v+1);};
    const pause=()=>{controller.current?.abort();refresh();};
    const visibility=()=>{if(document.visibilityState!=='visible')pause();else refresh();};
    window.addEventListener('offline',pause);window.addEventListener('online',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visibility);
    return()=>{alive.current=false;controller.current?.abort();window.removeEventListener('offline',pause);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  useEffect(()=>{
    if(!fixture||offline||!navigator.onLine||document.visibilityState!=='visible'||syncing||pending||failure||!syncRef.current())return;
    const delay=nextDelay(meta,Date.now(),wakeRef.current);wakeRef.current=false;
    if(delay===null)return;
    const timer=setTimeout(()=>void runSync(undefined,true),delay);
    return()=>clearTimeout(timer);
  },[fixture,offline,syncing,pending,failure,meta,wake]);
  const update=useCallback((action:SetStateAction<PersistedAppState>,syncAction:Action={kind:'edit'})=>{
    if(!alive.current||!isCurrent()||failed.current||claiming.current)return;
    let next:PersistedAppState;
    try{next=typeof action==='function'?action(draft.current):action;encode(next);}catch{failed.current=true;setFailure('Invalid change rejected. Reload committed workspace.');return;}
    if(next===draft.current)return;
    draft.current=next;setState(next);setPending(++pendingCount.current);
    queue.current=queue.current.then(async()=>{
      if(!alive.current||!isCurrent()||failed.current)return;
      try{row.current=await store.commit(selection.owner,row.current.revision,next,syncAction);if(alive.current&&isCurrent()){setQueued(row.current.sync?.pending.length??0);setMeta(row.current.sync);setSyncMessage('');}}
      catch(e){failed.current=true;if(alive.current&&isCurrent())setFailure(e instanceof WorkspaceError?e.code:'Save failed. Export unsaved progress before retrying.');}
    }).finally(()=>{pendingCount.current--;if(alive.current&&isCurrent())setPending(pendingCount.current);});
  },[store,selection.owner,isCurrent]);
  // App's existing callbacks have stable closures. Fence every write with the live owner.
  const [stableUpdate]=useState(()=>update);
  const claim=async()=>{
    if(offline||!navigator.onLine||!ready.guest||pendingCount.current||!isCurrent()||failed.current)return;
    if(!window.confirm('Move this device’s guest progress to this Account? A recovery snapshot will be retained inside this Account workspace.'))return;
    claiming.current=true;setPending(++pendingCount.current);
    try{await store.claimGuest(selection.owner,ready.guest.revision,row.current.revision,isCurrent);if(isCurrent())reload();}
    catch(e){if(isCurrent())setFailure(e instanceof WorkspaceError?e.code:'Guest claim failed');}
    finally{claiming.current=false;pendingCount.current--;if(isCurrent())setPending(pendingCount.current);}
  };
  const canClaim=!offline&&selection.owner!==GUEST&&row.current.revision===0&&!!ready.guest&&ready.guest.revision>0&&ready.guest.raw!==encode(createInitialAppState());
  return <>
    <section aria-label="Account and workspace" className="bg-[#FCFBF7] dark:bg-[#141923] text-stone-900 dark:text-white border-b border-stone-300 dark:border-slate-700 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-40"><strong>{selection.owner===GUEST?'Guest workspace':selection.email||'THIEPN Account'}</strong><p className="text-xs" role="status">{failure?'Workspace paused':pending?'Saving locally…':'Saved on this device'} · {fixture?'Disposable sync fixture · '+(syncMessage||statusText(meta,offline)):'Cloud sync '+syncPort.status()}{selection.owner!==GUEST&&queued>0?' · '+queued+' local changes queued (not uploaded)':''}{offline?' · Offline local access':''}</p>{fixture&&meta?.receipt?.lastSuccessAt&&<p className="text-xs">Last verified fixture sync: {new Date(meta.receipt.lastSuccessAt).toLocaleString()}</p>}{selection.owner===GUEST&&<p className="text-xs">{message}</p>}</div>
        {selection.owner===GUEST?<button className={btn} disabled={!configured||pending>0||!!failure} onClick={connect}>{configured?'Continue with THIEPN Account':'Account not configured'}</button>:<>{!offline&&<a className={btn} href="https://account.thiepn.dev/" target="_blank" rel="noreferrer">Manage Account</a>}<button className={btn} disabled={pending>0||!!failure} onClick={signout}>Sign out</button></>}
        {fixture&&<><button className={btn} disabled={syncing||offline||pending>0||!!failure||!!meta?.conflict} onClick={()=>void runSync()}>Sync now (fixture)</button><button className={btn} disabled={syncing||offline||pending>0||!!failure||canClaim} onClick={()=>void toggleAuto()}>{meta?.autoSync?'Disable automatic sync (fixture)':'Enable automatic sync (fixture)'}</button></>}
        <button className={btn} disabled={syncing||pending>0} onClick={()=>{if(isCurrent())download(row.current.raw,'bunshou-progress.json');}}>Export saved progress</button>
        {row.current.claimSourceRaw&&<button className={btn} disabled={pending>0} onClick={()=>{if(isCurrent())download(row.current.claimSourceRaw!,'bunshou-claimed-guest-backup.json');}}>Export claimed guest backup</button>}
        {row.current.previousRaw&&<button className={btn} disabled={pending>0} onClick={()=>{if(isCurrent())download(row.current.previousRaw!,'bunshou-previous-progress.json');}}>Export previous state</button>}
      </div>
      {fixture&&meta?.conflict&&<div role="alert" className="max-w-6xl mx-auto mt-3 space-y-2"><strong>Synchronization conflict</strong><p>{meta.conflict.reason==='REMOTE_REPLACEMENT_OR_DELETION'?'Another device replaced or deleted progress. Stale progress will not be restored automatically.':'Both devices changed overlapping progress. Choose a version; neither candidate will be silently discarded.'}</p><div className="flex flex-wrap gap-2"><button className={btn} disabled={syncing||pending>0||offline||!!failure} onClick={()=>void runSync('remote')}>Use other device version</button>{meta.conflict.reason!=='REMOTE_REPLACEMENT_OR_DELETION'&&<button className={btn} disabled={syncing||pending>0||offline||!!failure} onClick={()=>void runSync('local')}>Keep this device version</button>}<button className={btn} onClick={()=>{if(isCurrent())download(JSON.stringify({...meta.conflict,localRaw:row.current.raw,pending:meta.pending}),'bunshou-sync-conflict.json');}}>Export both candidates</button></div></div>}
      {meta?.archives?.length&&<button className={btn} onClick={()=>{if(isCurrent())download(JSON.stringify(meta.archives),'bunshou-sync-recovery-archive.json');}}>Export sync recovery archive</button>}
      {canClaim&&!dismissed&&<div className="max-w-6xl mx-auto mt-2 flex flex-wrap gap-2 items-center"><span>Guest progress is available ({Object.keys(decode(ready.guest!.raw).records).length} reviews). Move it only to this empty Account workspace?</span><button className={btn} disabled={syncing||pending>0} onClick={()=>void claim()}>Move guest progress</button><button className={btn} onClick={()=>setDismissed(true)}>Keep separate</button></div>}
      {canClaim&&dismissed&&<button className={btn} onClick={()=>setDismissed(false)}>Review guest migration</button>}
      {failure&&<div role="alert" className="mt-3 max-w-6xl mx-auto"><p>{failure} — unsaved changes have not replaced committed progress.</p><button className={btn} onClick={()=>{if(isCurrent())download(JSON.stringify(draft.current),'bunshou-unsaved-progress.json');}}>Export unsaved progress</button> <button className={btn} onClick={()=>{if(window.confirm('Discard unsaved in-memory changes and reload the saved workspace?'))reload();}}>Reload saved workspace</button></div>}
    </section>
    {!failure&&<div inert={claiming.current||syncing}><App key={appEpoch} appState={state} setAppState={stableUpdate}/></div>}
  </>;
}

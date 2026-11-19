import {useEffect,useRef,useState,useCallback} from 'react';
import type {SetStateAction} from 'react';
import App from '../App';
import type {PersistedAppState} from '../types/curriculum';
import {createAccount, CALLBACK, SESSION_KEY, type AccountClient, type Identity} from './adapter';
import {WorkspaceStore,WorkspaceError,GUEST,decode,encode,type Envelope} from '../storage/workspace';
import {createInitialAppState} from '../utils/storage';
import {syncPort} from '../storage/sync';

type Selection={owner:string;email?:string|null;epoch:number};
type Ready={store:WorkspaceStore;row:Envelope;guest:Envelope|null;selection:Selection};
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
  const select=useCallback((owner:string,email?:string|null)=>{
    recoveryStore.current?.close();recoveryStore.current=null;setRecovering(false);
    selectedOwner.current=owner;
    active.current?.store.close();active.current=null;
    const next={owner,email,epoch:++epoch.current};setReady(null);setError(null);setSelection(next);
    try{window.speechSynthesis?.cancel();}catch{}
  },[]);
  const lock=useCallback((text:string)=>{recoveryStore.current?.close();recoveryStore.current=null;setRecovering(false);selectedOwner.current=null;active.current?.store.close();active.current=null;++epoch.current;setReady(null);setSelection(null);setError(null);setMessage(text);try{window.speechSynthesis?.cancel();}catch{}},[]);
  useEffect(()=>{
    const client=account.client;let disposed=false;let running=false;let queued=false;
    if(!client){select(GUEST);setMessage(account.error||'Account connection not configured');return;}
    const publish=async(identity:Identity)=>{
      if(disposed)return;
      const token=++identityEpoch.current;
      if(identity.status==='signed-out'){lastIdentity.current='signed-out';if(selectedOwner.current!==GUEST)select(GUEST);setMessage('Guest workspace');return;}
      if(identity.status!=='signed-in'){lastIdentity.current='unavailable';lock('Account unavailable. Retry or use the separate guest workspace.');return;}
      const key='account:'+identity.id;
      if(lastIdentity.current!==key){lock('Verifying Account connection…');lastIdentity.current=key;}
      try{
        const checked=await client.verifyConnection(identity);
        if(disposed||token!==identityEpoch.current)return;
        if(checked.status==='signed-in'&&checked.id===identity.id){if(selectedOwner.current!==checked.id)select(checked.id,checked.email);setMessage('Account connected');}
        else{lastIdentity.current='unavailable';lock('Account connection unavailable. Reconnect or continue as guest.');}
      }catch{if(!disposed&&token===identityEpoch.current){lastIdentity.current='unavailable';lock('Account verification failed. Retry or use guest.');}}
    };
    const recheck=async()=>{if(disposed)return;if(running){queued=true;return;}running=true;const started=identityEpoch.current;try{const result=await client.sso.verify();if(!disposed&&started===identityEpoch.current)await publish(result);}catch{if(!disposed&&started===identityEpoch.current)lock('Account verification unavailable.');}finally{running=false;if(queued){queued=false;void recheck();}}};
    // SDK verification publishes identities itself. Only react to owner/auth changes, not the
    // recursive verification of the same identity inside checkConnection.
    const unsubscribe=client.sso.subscribe(identity=>{
      if(disposed||!settled.current)return;
      const key=identity.status==='signed-in'?'account:'+identity.id:identity.status;
      if(key!==lastIdentity.current)void publish(identity);
    });
    const start=async()=>{
      try{
        const url=new URL(location.href),callback=new URL(CALLBACK);
        let identity:Identity;
        if(url.origin===callback.origin&&url.pathname===callback.pathname){
          try{identity=await client.sso.completeCallback(location);}finally{history.replaceState(null,'',new URL('../..',callback).pathname);}
        }else{const result=await client.sso.initialize();if(result.status==='redirecting'){setMessage('Opening THIEPN Account…');return;}identity=result.identity;}
        if(!disposed){settled.current=true;await publish(identity);}
      }catch{if(!disposed){settled.current=true;lock('Account initialization failed. Retry or use guest.');}}
    };
    void start();
    const storage=(e:StorageEvent)=>{if(e.key===null||e.key.startsWith(SESSION_KEY)){++identityEpoch.current;lastIdentity.current='';lock('Checking changed Account session…');void recheck();}};
    const offline=()=>{if(active.current?.selection.owner!==GUEST){++identityEpoch.current;lastIdentity.current='unavailable';lock('Offline. Account workspace locked; guest learning remains available.');}};
    const focus=()=>{if(settled.current)void recheck();};
    window.addEventListener('storage',storage);window.addEventListener('focus',focus);window.addEventListener('online',focus);window.addEventListener('offline',offline);
    const interval=setInterval(()=>{if(settled.current&&navigator.onLine)void recheck();},60000);
    return()=>{disposed=true;unsubscribe();clearInterval(interval);window.removeEventListener('storage',storage);window.removeEventListener('focus',focus);window.removeEventListener('online',focus);window.removeEventListener('offline',offline);};
  },[account,select,lock]);
  useEffect(()=>{
    if(!selection)return;
    let cancelled=false;let store:WorkspaceStore|undefined;
    void(async()=>{try{
      store=await WorkspaceStore.open();
      if(cancelled||selection.epoch!==epoch.current){store.close();return;}
      await store.migrateLegacy(window.localStorage);
      const row=await store.read(selection.owner),guest=selection.owner===GUEST?null:await store.read(GUEST);
      if(cancelled||selection.epoch!==epoch.current){store.close();return;}
      const next={store,row,guest,selection};active.current=next;setReady(next);
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
  return <ActiveWorkspace key={ready.selection.epoch} ready={ready} message={message} configured={!!account.client} connect={connect} signout={signout} reload={()=>select(ready.selection.owner,ready.selection.email)} isCurrent={()=>active.current===ready&&ready.selection.epoch===epoch.current}/>;
}
function ActiveWorkspace({ready,message,configured,connect,signout,reload,isCurrent}:{ready:Ready;message:string;configured:boolean;connect:()=>void;signout:()=>void;reload:()=>void;isCurrent:()=>boolean}){
  const {store,selection}=ready;
  const row=useRef(ready.row),draft=useRef(decode(ready.row.raw)),alive=useRef(true),failed=useRef(false),queue=useRef(Promise.resolve()),pendingCount=useRef(0);
  const claiming=useRef(false);
  const [state,setState]=useState(draft.current),[pending,setPending]=useState(0),[failure,setFailure]=useState(''),[dismissed,setDismissed]=useState(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const update=useCallback((action:SetStateAction<PersistedAppState>)=>{
    if(!alive.current||!isCurrent()||failed.current||claiming.current)return;
    let next:PersistedAppState;
    try{next=typeof action==='function'?action(draft.current):action;encode(next);}catch{failed.current=true;setFailure('Invalid change rejected. Reload committed workspace.');return;}
    if(next===draft.current)return;
    draft.current=next;setState(next);setPending(++pendingCount.current);
    queue.current=queue.current.then(async()=>{
      if(!alive.current||!isCurrent()||failed.current)return;
      try{row.current=await store.commit(selection.owner,row.current.revision,next);}
      catch(e){failed.current=true;if(alive.current&&isCurrent())setFailure(e instanceof WorkspaceError?e.code:'Save failed. Export unsaved progress before retrying.');}
    }).finally(()=>{pendingCount.current--;if(alive.current&&isCurrent())setPending(pendingCount.current);});
  },[store,selection.owner,isCurrent]);
  // App's existing callbacks have stable closures. Fence every write with the live owner.
  const [stableUpdate]=useState(()=>update);
  const claim=async()=>{
    if(!ready.guest||pendingCount.current||!isCurrent()||failed.current)return;
    if(!window.confirm('Move this device’s guest progress to this Account? A recovery snapshot will be retained inside this Account workspace.'))return;
    claiming.current=true;setPending(++pendingCount.current);
    try{await store.claimGuest(selection.owner,ready.guest.revision,row.current.revision,isCurrent);if(isCurrent())reload();}
    catch(e){if(isCurrent())setFailure(e instanceof WorkspaceError?e.code:'Guest claim failed');}
    finally{claiming.current=false;pendingCount.current--;if(isCurrent())setPending(pendingCount.current);}
  };
  const canClaim=selection.owner!==GUEST&&row.current.revision===0&&!!ready.guest&&ready.guest.revision>0&&ready.guest.raw!==encode(createInitialAppState());
  return <>
    <section aria-label="Account and workspace" className="bg-[#FCFBF7] dark:bg-[#141923] text-stone-900 dark:text-white border-b border-stone-300 dark:border-slate-700 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-40"><strong>{selection.owner===GUEST?'Guest workspace':selection.email||'THIEPN Account'}</strong><p className="text-xs" role="status">{failure?'Workspace paused':pending?'Saving locally…':'Saved on this device'} · Cloud sync {syncPort.status()}</p>{selection.owner===GUEST&&<p className="text-xs">{message}</p>}</div>
        {selection.owner===GUEST?<button className={btn} disabled={!configured||pending>0||!!failure} onClick={connect}>{configured?'Continue with THIEPN Account':'Account not configured'}</button>:<><a className={btn} href="https://account.thiepn.dev/" target="_blank" rel="noreferrer">Manage Account</a><button className={btn} disabled={pending>0||!!failure} onClick={signout}>Sign out</button></>}
        <button className={btn} disabled={pending>0} onClick={()=>{if(isCurrent())download(row.current.raw,'bunshou-progress.json');}}>Export saved progress</button>
        {row.current.claimSourceRaw&&<button className={btn} disabled={pending>0} onClick={()=>{if(isCurrent())download(row.current.claimSourceRaw!,'bunshou-claimed-guest-backup.json');}}>Export claimed guest backup</button>}
        {row.current.previousRaw&&<button className={btn} disabled={pending>0} onClick={()=>{if(isCurrent())download(row.current.previousRaw!,'bunshou-previous-progress.json');}}>Export previous state</button>}
      </div>
      {canClaim&&!dismissed&&<div className="max-w-6xl mx-auto mt-2 flex flex-wrap gap-2 items-center"><span>Guest progress is available ({Object.keys(decode(ready.guest!.raw).records).length} reviews). Move it only to this empty Account workspace?</span><button className={btn} disabled={pending>0} onClick={()=>void claim()}>Move guest progress</button><button className={btn} onClick={()=>setDismissed(true)}>Keep separate</button></div>}
      {canClaim&&dismissed&&<button className={btn} onClick={()=>setDismissed(false)}>Review guest migration</button>}
      {failure&&<div role="alert" className="mt-3 max-w-6xl mx-auto"><p>{failure} — unsaved changes have not replaced committed progress.</p><button className={btn} onClick={()=>{if(isCurrent())download(JSON.stringify(draft.current),'bunshou-unsaved-progress.json');}}>Export unsaved progress</button> <button className={btn} onClick={()=>{if(window.confirm('Discard unsaved in-memory changes and reload the saved workspace?'))reload();}}>Reload saved workspace</button></div>}
    </section>
    {!failure&&<div inert={claiming.current}><App appState={state} setAppState={stableUpdate}/></div>}
  </>;
}

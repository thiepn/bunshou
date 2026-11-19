import {useEffect,useRef,useState} from 'react';
import {CURRICULUM_UNITS} from '../data/units';
import {GRAMMAR_HANDBOOK,GRAMMAR_COMPARISONS} from '../data/referenceData';
import {UNIT_DIALOGUES} from '../data/dialogues';
import {getLocalDateString} from '../utils/srs';
import {getAvailableJapaneseVoices} from '../utils/audio';
import type {PersistedAppState} from '../types/curriculum';
import type {StudyLaunchConfig} from './StudyView';
import {tasksFor,type Progression,type Command} from '../learning/progression';
import {coverage,matchesModel,recommendedUnit,sessionSummary,type GuidedTask,type Result} from '../learning/guided';

const button='rounded-lg border border-stone-400 dark:border-slate-600 px-4 py-2 text-sm font-medium disabled:opacity-50';
const primary='rounded-lg bg-[#C83E2B] text-white px-4 py-2 text-sm font-semibold disabled:opacity-50';
const panel='rounded-xl border border-stone-300 dark:border-slate-700 bg-[#FCFBF7] dark:bg-[#141923] p-4 sm:p-6 space-y-4';
const labels={grammar:'Grammar check',context:'Context comprehension',listening:'Listening comprehension',production:'Active production'};
export function GuidedLessonView({state,initialUnit,progression,command,onStudy}:{state:PersistedAppState;initialUnit?:string;progression:Progression;command:(c:Command)=>Promise<void>;onStudy:(config:StudyLaunchConfig)=>void}){
 const today=getLocalDateString();
 const [unitId,setUnitId]=useState(()=>CURRICULUM_UNITS.some(u=>u.id===initialUnit)?initialUnit!:CURRICULUM_UNITS.find(u=>progression.units[u.id]&&!progression.units[u.id].last.logged)?.id??recommendedUnit(state,today));
 const [showIntro,setShowIntro]=useState(false);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const busyRef=useRef(false);
 const evidence=progression.units[unitId],session=evidence?.last;
 const tasks=session?tasksFor(session,state):[];
 const stage=showIntro||!session?'intro':session.stage;
 const task=session&&tasks[session.index];
 const result=sessionSummary(tasks,session?.results??{}),firstResult=sessionSummary(tasks,session?.first??{});
 const lesson=GRAMMAR_HANDBOOK.find(u=>u.unitId===unitId)!;
 const unit=CURRICULUM_UNITS.find(u=>u.id===unitId)!;
 const dialogue=UNIT_DIALOGUES.find(u=>u.unitId===unitId)!;
 const comparisons=GRAMMAR_COMPARISONS.filter(c=>c.relatedUnitIds.includes(unitId));
 const counts=coverage(state,unitId,today);
 const send=async(c:Command)=>{
   if(busyRef.current)return;
   busyRef.current=true;setBusy(true);setNotice('');
   try{await command(c);setShowIntro(false);}
   catch{setNotice('Change was not saved. Reload the workspace before retrying if another tab changed it.');}
   finally{busyRef.current=false;setBusy(false);}
 };
 const start=()=>void send({kind:'start',unitId,day:today,id:crypto.randomUUID()});
 const nextTask=(value:Result)=>{if(session&&task)void send({kind:'answer',unitId,id:session.id,taskId:task.id,result:value});};
 const selectUnit=(id:string)=>{setUnitId(id);setShowIntro(false);setNotice('');};
 return <section className="max-w-4xl mx-auto p-4 sm:p-8 pb-28 space-y-5" aria-label="Guided learning">
  <header className="space-y-2"><h1 className="text-3xl font-bold">Guided lessons</h1><p className="text-sm">Understand a pattern, apply it in context, listen, then produce Japanese. Practice does not change review intervals.</p></header>
  <div className={panel}>
   <label className="block font-medium" htmlFor="guided-unit">Choose any unit</label>
   <select id="guided-unit" className="w-full rounded-lg border border-stone-400 bg-transparent p-2 dark:bg-slate-900" value={unitId} disabled={busy} onChange={e=>selectUnit(e.target.value)}>{CURRICULUM_UNITS.map(u=><option key={u.id} value={u.id}>{u.level} · Unit {u.unitNumber} · {u.title}</option>)}</select>
   <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm"><span>{counts.studied}/{counts.total} sentences introduced</span><span>{counts.due} due</span><span>{counts.mastered} SRS mastered</span><span>Dialogue: {counts.dialogue?'completed':'not completed'}</span></div>
   <progress className="w-full" max={counts.total} value={counts.studied} aria-label="Introduced sentences"/>
  </div>
  {notice&&<p role="alert">{notice}</p>}
  {evidence&&<div className={panel}><h2 className="font-bold">Saved learning evidence</h2><p>{evidence.sessions} recorded sessions · {evidence.firstCorrect}/{evidence.firstTotal} first-pass correct answers</p><p className="text-sm">{session?.logged?'Session recorded on this device.':'Session saved on this device; resume from your last submitted exercise.'}</p></div>}
  {stage==='intro'&&<div className={panel}>
    <p className="text-xs uppercase tracking-wide">1 · Understand</p><h2 className="text-xl font-bold">{lesson.title}</h2>
    <p className="font-mono text-sm break-words">{lesson.patternFormula}</p><p>{lesson.coreExplanation}</p><p className="text-sm"><strong>Usage note: </strong>{lesson.keyTip}</p>
    {lesson.examples.map((e,i)=><div key={i} className="border-l-2 border-[#C83E2B] pl-3"><p lang="ja" className="text-lg">{e.japanese}</p><p lang="ja" className="text-sm">{e.reading}</p><p>{e.english}</p></div>)}
    {comparisons.map(c=><details key={c.id}><summary className="cursor-pointer font-medium">{c.title}</summary><p className="mt-2">{c.leftRule}</p><p lang="ja">{c.leftExample.jp} — {c.leftExample.en}</p><p className="mt-2">{c.rightRule}</p><p lang="ja">{c.rightExample.jp} — {c.rightExample.en}</p></details>)}
    <p className="text-sm">Six exercises: grammar, dialogue comprehension, two listening questions and two model-sentence production tasks. Difficult and due sentences are prioritized.</p>
    {session&&!session.logged?<button className={primary} disabled={busy} onClick={()=>setShowIntro(false)}>Resume saved session</button>:<button className={primary} disabled={busy} onClick={start}>Start guided exercises</button>}
  </div>}
  {stage==='work'&&task&&<div className={panel}>
   <div className="flex flex-wrap justify-between gap-2 text-sm"><span>{labels[task.kind]} · {index+1}/{tasks.length}</span><span>{result.answered}/{result.total} answered</span></div>
   <TaskView key={session!.id+':'+task.id} task={task} dialogue={dialogue} settings={state.settings} onNext={nextTask} busy={busy}/>
   <button className={button} disabled={busy} onClick={()=>setShowIntro(true)}>Read explanation / pause</button>
  </div>}
  {stage==='summary'&&<div className={panel}>
   <h2 className="text-xl font-bold">Guided practice results</h2>
   <p>First pass: {firstResult.correct}/{firstResult.total} model matches or correct answers; {firstResult.assisted} assisted; {firstResult.missed} missed.</p>
   <p role="status">Current result: {result.correct}/{result.total} correct · {result.assisted} assisted · {result.missed} missed.</p>
   <p>{result.correct===result.total?'All tasks answered correctly against the model.':'Revisit missed or assisted tasks. A model match is not proof of general language mastery.'}</p>
   <div className="flex flex-wrap gap-2">
    {result.retry.length>0&&<button className={primary} disabled={busy} onClick={()=>session&&void send({kind:'retry',unitId,id:session.id})}>Retry missed or assisted tasks</button>}
    <button className={button} disabled={busy||!result.complete||session?.logged} onClick={()=>session&&void send({kind:'record',unitId,id:session.id})}>{session?.logged?'Practice activity recorded':'Record completed practice session'}</button>
    <button className={button} onClick={()=>onStudy({mode:'learn_new',unitId,level:unit.level})}>Study unit sentences with SRS</button>
    <button className={button} onClick={()=>onStudy({mode:'daily_review',level:unit.level})}>Review due sentences</button>
    <button className={button} onClick={()=>{const idx=CURRICULUM_UNITS.findIndex(u=>u.id===unitId);selectUnit(CURRICULUM_UNITS[(idx+1)%CURRICULUM_UNITS.length].id);}}>Explore next unit</button>
   </div>
   {session?.logged&&<button className={primary} disabled={busy} onClick={start}>Start another guided session</button>}
   <p className="text-xs">Scores are saved on this device. Recording adds one practice activity, not SRS credit or a mastery claim. Unsubmitted text is not saved.</p>
  </div>}
 </section>;
}
function TaskView({task,dialogue,settings,onNext,busy}:{task:GuidedTask;dialogue:typeof UNIT_DIALOGUES[number];settings:PersistedAppState['settings'];onNext:(r:Result)=>void;busy:boolean}){
 const [choice,setChoice]=useState<number|null>(null);
 const [answer,setAnswer]=useState('');
 const [outcome,setOutcome]=useState<Result|null>(null);
 const [transcript,setTranscript]=useState(false);
 const [playing,setPlaying]=useState(false);
 const [heard,setHeard]=useState(false);
 const [notice,setNotice]=useState('');
 const generation=useRef(0);
 
 useEffect(()=>()=>{generation.current++;try{window.speechSynthesis?.cancel();}catch{}},[]);
 const listen=()=>{
  const id=++generation.current;
  setNotice('');setPlaying(false);
  const voices=getAvailableJapaneseVoices();
  const voice=voices.find(v=>v.voiceURI===settings.preferredVoiceURI)??voices.find(v=>v.localService)??voices[0];
  if(!voice||!task.sentence||typeof SpeechSynthesisUtterance==='undefined'){setNotice('Japanese voice unavailable. Use the transcript for assisted reading, or skip.');return;}
  try{
   window.speechSynthesis.cancel();
   const u=new SpeechSynthesisUtterance(task.sentence.japanese);u.lang='ja-JP';u.voice=voice;u.rate=settings.audioSpeed;
   setPlaying(true);
   u.onend=()=>{if(generation.current===id){setPlaying(false);setHeard(true);}};
   u.onerror=()=>{if(generation.current===id){setPlaying(false);setNotice('Audio could not play. Reveal the transcript or try again.');}};
   window.speechSynthesis.speak(u);
  }catch{setPlaying(false);setNotice('Audio could not play. Reveal the transcript or try again.');}
 };
 const reveal=()=>{generation.current++;try{window.speechSynthesis?.cancel();}catch{}setPlaying(false);setTranscript(true);};
 const check=()=>{
  if(outcome)return;
  if(task.kind==='production'&&task.sentence){if(answer.trim())setOutcome(matchesModel(answer,task.sentence)?'correct':'missed');}
  else if(choice!==null&&(task.kind!=='listening'||heard||transcript))setOutcome(choice===task.correct?(transcript?'assisted':'correct'):'missed');
 };
 const finish=()=>{if(outcome&&!busy)onNext(outcome);};
 return <div className="space-y-4">
  {task.kind==='context'&&<div className="space-y-2"><p className="text-sm">{dialogue.setting}</p>{dialogue.lines.map((line,i)=><p key={i} lang="ja"><strong>{line.speaker}: </strong>{line.japanese}</p>)}<button className={button} disabled={!!outcome||transcript} onClick={reveal}>Reveal dialogue translation (assisted)</button>{transcript&&dialogue.lines.map((line,i)=><p key={i}>{line.english}</p>)}</div>}
  <h3 className="text-lg font-semibold">{task.kind==='production'?'Produce the Japanese model sentence: '+task.prompt:task.prompt}</h3>
  {task.kind==='listening'&&<div className="space-y-2"><div className="flex flex-wrap gap-2"><button className={button} disabled={playing||!!outcome} onClick={listen}>{playing?'Playing…':'Play Japanese audio'}</button><button className={button} disabled={transcript||!!outcome} onClick={reveal}>Reveal transcript (assisted)</button></div>{notice&&<p role="status">{notice}</p>}{transcript&&<p lang="ja" className="text-xl">{task.sentence?.japanese}</p>}{!heard&&!transcript&&<p className="text-sm">Play the audio to completion, or reveal the transcript.</p>}</div>}
  {task.options&&<fieldset disabled={!!outcome} className="space-y-2"><legend className="sr-only">Answer choices</legend>{task.options.map((option,i)=><label key={i} className="flex gap-3 items-start rounded-lg border border-stone-300 dark:border-slate-700 p-3 cursor-pointer"><input type="radio" name="guided-choice" checked={choice===i} onChange={()=>setChoice(i)}/><span>{option}</span></label>)}</fieldset>}
  {task.kind==='production'&&<div className="space-y-2"><label htmlFor="guided-production">Your Japanese answer (kana or original spelling)</label><textarea id="guided-production" lang="ja" rows={3} maxLength={256} disabled={!!outcome} className="w-full rounded-lg border border-stone-400 bg-transparent p-3" value={answer} onChange={e=>setAnswer(e.target.value)}/><p className="text-xs">Exact corpus-model comparison only. Alternative natural sentences are not automatically graded.</p></div>}
  {!outcome?<div className="flex flex-wrap gap-2"><button className={primary} disabled={task.kind==='production'?!answer.trim():choice===null||(task.kind==='listening'&&!heard&&!transcript)} onClick={check}>Check answer</button><button className={button} onClick={()=>{reveal();setOutcome('assisted');}}>Show answer / skip</button></div>:<div className="rounded-lg border border-stone-300 dark:border-slate-700 p-4 space-y-2" aria-live="polite">
   <strong>{outcome==='correct'?'Correct':outcome==='assisted'?'Assisted / skipped':task.kind==='production'?'Different from model — compare your answer':'Not the expected answer'}</strong>
   {task.options&&task.correct!==undefined&&<p>Expected: {task.options[task.correct]}</p>}
   {task.sentence&&<><p lang="ja" className="text-xl">{task.sentence.japanese}</p><p lang="ja">{task.sentence.readingKana}</p><p>{task.sentence.english}</p></>}
   <p>{task.explanation}</p><button className={primary} disabled={busy} onClick={finish}>Continue exercise</button>
  </div>}
 </div>;
}

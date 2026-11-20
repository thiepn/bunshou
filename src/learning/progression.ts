import {CURRICULUM_UNITS} from '../data/units';
import {SENTENCES_BY_UNIT} from '../data/sentences';
import type {PersistedAppState} from '../types/curriculum';
import {makeLesson,selectPractice,sessionSummary,type Result} from './guided';
export type Session={id:string;unitId:string;day:string;variant:0|1;ids:string[];first:Record<string,Result>;results:Record<string,Result>;index:number;stage:'work'|'summary';logged:boolean};
export type Evidence={sessions:number;firstCorrect:number;firstTotal:number;last:Session};
export type Progression={version:1;units:Record<string,Evidence>};
export const emptyProgression=():Progression=>({version:1,units:{}});
export function tasksFor(s:Session,state:PersistedAppState){return makeLesson(state,s.unitId,s.day,{ids:s.ids,variant:s.variant});}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).sort().join('|')===keys.sort().join('|');
const integer=(v:unknown,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max;
export function validProgression(value:unknown):value is Progression{
 if(!record(value)||!exact(value,['version','units'])||value.version!==1||!record(value.units)||Object.keys(value.units).length>20)return false;
 for(const [unit,e] of Object.entries(value.units)){
  if(!CURRICULUM_UNITS.some(u=>u.id===unit)||!record(e)||!exact(e,['sessions','firstCorrect','firstTotal','last'])||!integer(e.sessions,1000000)||!integer(e.firstCorrect,6000000)||!integer(e.firstTotal,6000000)||e.firstTotal!==e.sessions*6||e.firstCorrect>e.firstTotal||!record(e.last))return false;
  const s=e.last;
  if(!exact(s,['id','unitId','day','variant','ids','first','results','index','stage','logged'])||s.unitId!==unit||typeof s.id!=='string'||!/^[0-9a-f-]{36}$/i.test(s.id)||typeof s.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s.day)||!(s.variant===0||s.variant===1)||!Array.isArray(s.ids)||s.ids.length!==4||new Set(s.ids).size!==4||s.ids.some(id=>!SENTENCES_BY_UNIT[unit].some(x=>x.id===id))||!integer(s.index,5)||!['work','summary'].includes(String(s.stage))||typeof s.logged!=='boolean'||!record(s.first)||!record(s.results))return false;
  const keys=new Set([unit+(s.variant===1?':application':':grammar'),unit+':context',...s.ids.map((id,i)=>id+(i<2?':listen':':produce'))]);
  for(const map of [s.first,s.results])if(Object.entries(map).some(([k,v])=>!keys.has(k)||!['correct','assisted','missed'].includes(String(v))))return false;
  if(Object.keys(s.first).sort().join('|')!==Object.keys(s.results).sort().join('|'))return false;
  if(s.stage==='summary'&&Object.keys(s.results).length!==6)return false;
  if(s.logged&&(Object.keys(s.results).length!==6||e.sessions<1))return false;
 }
 return true;
}
export function startSession(p:Progression,unitId:string,state:PersistedAppState,day:string,id:string=crypto.randomUUID()):Progression{
 const old=p.units[unitId],last=old?.last;
 if(last&&!last.logged)throw Error('GUIDED_RESUME_REQUIRED');
 const weak=last?.ids.filter((id,i)=>last.first[id+(i<2?':listen':':produce')]!=='correct'||last.results[id+(i<2?':listen':':produce')]!=='correct')??[];
 const ids=selectPractice(state,unitId,day,4,weak,last?.ids??[]).map(s=>s.id);
 if(ids.length!==4)throw Error('GUIDED_INVALID_UNIT');
 const session:Session={id,unitId,day,variant:last?.variant===0?1:0,ids,first:{},results:{},index:0,stage:'work',logged:false};
 return {...p,units:{...p.units,[unitId]:{sessions:old?.sessions??0,firstCorrect:old?.firstCorrect??0,firstTotal:old?.firstTotal??0,last:session}}};
}
export type Command={kind:'start';unitId:string;day:string;id:string}|{kind:'answer';unitId:string;id:string;taskId:string;result:Result}|{kind:'retry'|'record'|'discard';unitId:string;id:string};
export function applyCommand(p:Progression,c:Command,state:PersistedAppState):{progress:Progression;log:boolean}{
 if(c.kind==='start')return {progress:startSession(p,c.unitId,state,c.day,c.id),log:false};
 const e=p.units[c.unitId];if(!e||e.last.id!==c.id)throw Error('GUIDED_STALE_SESSION');
 const s=e.last,tasks=tasksFor(s,state);
 if(c.kind==='discard'){if(s.logged)throw Error('GUIDED_ALREADY_RECORDED');const units={...p.units};if(e.sessions===0)delete units[c.unitId];else throw Error('GUIDED_FINISH_OR_RECORD_REQUIRED');return {progress:{...p,units},log:false};}
 let next:Session={...s},ev={...e},log=false;
 if(c.kind==='answer'){
  if(s.stage!=='work'||tasks[s.index]?.id!==c.taskId||!['correct','assisted','missed'].includes(c.result))throw Error('GUIDED_STALE_TASK');
  const retest=Object.hasOwn(s.first,c.taskId);
  next.first={...s.first,...(!retest?{[c.taskId]:c.result}:{})};next.results={...s.results,[c.taskId]:c.result};
  const idx=retest?tasks.findIndex((t,i)=>i>s.index&&s.results[t.id]!=='correct'):s.index+1;
  if(idx<0||idx>=tasks.length)next.stage='summary';else next.index=idx;
 }else if(c.kind==='retry'){
  if(s.stage!=='summary')throw Error('GUIDED_NOT_COMPLETE');const idx=tasks.findIndex(t=>s.results[t.id]!=='correct');
  if(idx<0)throw Error('GUIDED_NO_RETEST');next.stage='work';next.index=idx;
 }else if(c.kind==='record'){
  if(s.stage!=='summary'||!sessionSummary(tasks,s.results).complete)throw Error('GUIDED_NOT_COMPLETE');
  if(s.logged)return {progress:p,log:false};
  next.logged=true;ev.sessions++;ev.firstCorrect+=sessionSummary(tasks,s.first).correct;ev.firstTotal+=tasks.length;log=true;
 }
 ev.last=next;const progress={...p,units:{...p.units,[c.unitId]:ev}};
 if(!validProgression(progress))throw Error('GUIDED_INVALID_PROGRESS');return {progress,log};
}

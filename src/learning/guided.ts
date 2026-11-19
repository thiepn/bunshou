import {APPLICATION_CHECKS} from './applicationChecks';
import {ALL_SENTENCES,SENTENCES_BY_UNIT} from '../data/sentences';
import {CURRICULUM_UNITS} from '../data/units';
import {GRAMMAR_HANDBOOK} from '../data/referenceData';
import {UNIT_DIALOGUES} from '../data/dialogues';
import {classifyCardState,isLeechRecord} from '../utils/srs';
import type {PersistedAppState,SentenceItem} from '../types/curriculum';
import {GRAMMAR_CHECKS} from './grammarChecks';
export type GuidedTask={id:string;kind:'grammar'|'context'|'listening'|'production';prompt:string;options?:string[];correct?:number;explanation:string;sentence?:SentenceItem};
export type Result='correct'|'assisted'|'missed';
export function coverage(state:PersistedAppState,unitId:string,today:string){
 const items=SENTENCES_BY_UNIT[unitId]??[];
 return {total:items.length,studied:items.filter(s=>Object.hasOwn(state.records,s.id)).length,due:items.filter(s=>state.records[s.id]&&state.records[s.id].dueDate<=today).length,mastered:items.filter(s=>classifyCardState(state.records[s.id],today)==='mastered').length,dialogue:Boolean(state.completedDialogues?.includes(unitId))};
}
export function recommendedUnit(state:PersistedAppState,today:string){
 const units=CURRICULUM_UNITS.filter(u=>u.level===state.settings.selectedLevel);
 return (units.find(u=>coverage(state,u.id,today).due>0)??units.find(u=>coverage(state,u.id,today).studied<coverage(state,u.id,today).total)??units[0]).id;
}
export function priority(s:SentenceItem,state:PersistedAppState,today:string){
 const r=state.records[s.id];if(!r)return 20;
 return (isLeechRecord(r)?100:0)+(r.lastGrade==='again'?60:r.lastGrade==='hard'?30:0)+(r.dueDate<=today?40:0)+Math.min(r.lapses,10);
}
export function selectPractice(state:PersistedAppState,unitId:string,today:string,limit=4,weak:readonly string[]=[],seen:readonly string[]=[]){
 return [...(SENTENCES_BY_UNIT[unitId]??[])].sort((a,b)=>(priority(b,state,today)+(weak.includes(b.id)?200:0)-(seen.includes(b.id)?25:0))-(priority(a,state,today)+(weak.includes(a.id)?200:0)-(seen.includes(a.id)?25:0))||a.order-b.order).slice(0,limit);
}
export function normalizeJapanese(value:string){return value.normalize('NFC').replace(/[\s。、！？!?.,]/gu,'');}
export function matchesModel(input:string,s:SentenceItem){
 const v=normalizeJapanese(input);return !!v&&(v===normalizeJapanese(s.japanese)||v===normalizeJapanese(s.readingKana));
}
function choices(s:SentenceItem,unitId:string){
 // Same-unit distractors where possible, with unique normalized translations.
 const pool=[...(SENTENCES_BY_UNIT[unitId]??[]),...ALL_SENTENCES];
 const seen=new Set([s.english.trim().toLowerCase()]);
 const distractors:string[]=[];
 for(const x of pool){const k=x.english.trim().toLowerCase();if(x.id===s.id||seen.has(k))continue;seen.add(k);distractors.push(x.english);if(distractors.length===2)break;}
 const options=[...distractors];const correct=s.order%3;options.splice(correct,0,s.english);return {options,correct};
}
export function makeLesson(state:PersistedAppState,unitId:string,today:string,selection?:{ids:readonly string[];variant:0|1}):GuidedTask[]{
 const unit=CURRICULUM_UNITS.find(u=>u.id===unitId),lesson=GRAMMAR_HANDBOOK.find(u=>u.unitId===unitId),dialogue=UNIT_DIALOGUES.find(u=>u.unitId===unitId),check=(selection?.variant===1?APPLICATION_CHECKS:GRAMMAR_CHECKS)[unitId];
 if(!unit||!lesson||!dialogue||!check)return [];
 const q=dialogue.comprehensionQuestion;
 const tasks:GuidedTask[]=[{id:unitId+(selection?.variant===1?':application':':grammar'),kind:'grammar',prompt:check.prompt,options:[...check.options],correct:check.correct,explanation:check.explanation},{id:unitId+':context',kind:'context',prompt:q.question,options:q.options,correct:q.correctIndex,explanation:q.explanation}];
 const selected=selection?selection.ids.map(id=>(SENTENCES_BY_UNIT[unitId]??[]).find(s=>s.id===id)).filter((x):x is SentenceItem=>!!x):selectPractice(state,unitId,today);
 if(selected.length!==4||new Set(selected.map(s=>s.id)).size!==4)return [];
 for(const s of selected.slice(0,2)){
  tasks.push({id:s.id+':listen',kind:'listening',prompt:'Listen, then choose the translation closest to the corpus translation.',...choices(s,unitId),sentence:s,explanation:s.english});
 }
 for(const s of selected.slice(2,4)){
  tasks.push({id:s.id+':produce',kind:'production',prompt:s.english,sentence:s,explanation:'Compare your sentence with the corpus model. Other natural translations may be valid.'});
 }
 return tasks;
}
export function sessionSummary(tasks:GuidedTask[],results:Record<string,Result>){
 const values=tasks.map(t=>results[t.id]);
 return {total:tasks.length,answered:values.filter(Boolean).length,correct:values.filter(x=>x==='correct').length,assisted:values.filter(x=>x==='assisted').length,missed:values.filter(x=>x==='missed').length,complete:tasks.length>0&&values.every(Boolean),retry:tasks.filter(t=>results[t.id]!=='correct')};
}

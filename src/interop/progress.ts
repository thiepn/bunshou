import {ALL_SENTENCES} from '../data/sentences';
import {CURRICULUM_UNITS} from '../data/units';
import type {PersistedAppState} from '../types/curriculum';
import {getDueReviewQueue} from '../utils/srs';
import {resumeReference} from './corpus';
import {link,parseFragment,ROUTES} from './contract';
// Deliberately owner-free aggregate, explicitly exported by the learner.
// No UUID, email, grade history, timestamps, personal vow, backup or token.
export function progressSummary(state:PersistedAppState,today:string){
 return {schema:'thiepn.japanese.progress',version:1,product:'bunshou',scope:'device-snapshot',metrics:{
  sentencesStudied:ALL_SENTENCES.filter(s=>Object.hasOwn(state.records,s.id)).length,
  sentencesAvailable:ALL_SENTENCES.length,
  reviewsDue:getDueReviewQueue(ALL_SENTENCES,state.records,today).length,
  dialoguesCompleted:CURRICULUM_UNITS.filter(u=>state.completedDialogues?.includes(u.id)).length,
  dialoguesAvailable:CURRICULUM_UNITS.length
 },resumeUrl:link('bunshou',resumeReference(state,today))} as const;
}

export type BunshouSummary=ReturnType<typeof progressSummary>;
/** Reference hub consumer. Reject extra keys rather than accepting hidden
 * private fields. An imported snapshot is not a verified Account assertion. */
export function parseSummary(input:unknown):BunshouSummary|null{
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const s=input as Record<string,unknown>;
 const exact=(obj:object,keys:string[])=>Object.keys(obj).sort().join('|')===keys.sort().join('|');
 if(!exact(s,['schema','version','product','scope','metrics','resumeUrl'])||s.schema!=='thiepn.japanese.progress'||s.version!==1||s.product!=='bunshou'||s.scope!=='device-snapshot'||typeof s.resumeUrl!=='string'||!s.metrics||typeof s.metrics!=='object'||Array.isArray(s.metrics))return null;
 const m=s.metrics as Record<string,unknown>;
 if(!exact(m,['sentencesStudied','sentencesAvailable','reviewsDue','dialoguesCompleted','dialoguesAvailable'])||Object.values(m).some(v=>typeof v!=='number'||!Number.isSafeInteger(v)||v<0))return null;
 const n=m as unknown as BunshouSummary['metrics'];
 if(n.sentencesAvailable!==ALL_SENTENCES.length||n.dialoguesAvailable!==CURRICULUM_UNITS.length||n.sentencesStudied>n.sentencesAvailable||n.reviewsDue>n.sentencesStudied||n.dialoguesCompleted>n.dialoguesAvailable)return null;
 try{
  const u=new URL(s.resumeUrl),ref=parseFragment(u.hash);
  if(u.origin+u.pathname!==ROUTES.bunshou||u.username||u.password||u.search||!ref||(ref.kind!=='review'&&(ref.kind!=='lesson'||!CURRICULUM_UNITS.some(unit=>unit.id===ref.id))))return null;
 }catch{return null;}
 return {schema:'thiepn.japanese.progress',version:1,product:'bunshou',scope:'device-snapshot',metrics:{...n},resumeUrl:s.resumeUrl};
}

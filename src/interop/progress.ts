import {ALL_SENTENCES} from '../data/sentences';
import {CURRICULUM_UNITS} from '../data/units';
import type {PersistedAppState} from '../types/curriculum';
import {getDueReviewQueue} from '../utils/srs';
import {resumeReference} from './corpus';
import {link} from './contract';
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

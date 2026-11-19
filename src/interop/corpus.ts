import {ALL_SENTENCES,SENTENCES_BY_ID,SENTENCES_BY_UNIT} from '../data/sentences';
import {CURRICULUM_UNITS} from '../data/units';
import type {PersistedAppState,SentenceItem} from '../types/curriculum';
import {getDueReviewQueue} from '../utils/srs';
import {lexical,link,type Ref} from './contract';

export type Example={sentenceId:string;unitId:string;level:string;japanese:string;reading:string;english:string;match:'segment'|'surface'|'sentence';href:string};
export function examples(ref:Ref,limit=30):Example[]{
 if(!Number.isSafeInteger(limit)||limit<1||limit>100)return [];
 const result:{item:SentenceItem;match:Example['match']}[]=[];
 if(ref.kind==='sentence'){
  if(Object.hasOwn(SENTENCES_BY_ID,ref.id))result.push({item:SENTENCES_BY_ID[ref.id],match:'sentence'});
 }else if(ref.kind==='vocabulary'||ref.kind==='kanji'){
  const valid=lexical(ref.kind,ref.text,ref.reading);if(!valid||!('text' in valid))return [];
  for(const item of ALL_SENTENCES){
   const segment=item.segments.some(s=>s.text===valid.text&&(!valid.reading||s.reading===valid.reading));
   // Reading-constrained vocabulary must match an actual annotated segment.
   // Unconstrained substring hits are labelled surface, never lexical identity.
   if(segment||(!valid.reading&&item.japanese.includes(valid.text)))result.push({item,match:segment?'segment':'surface'});
  }
  result.sort((a,b)=>Number(b.match==='segment')-Number(a.match==='segment')||a.item.order-b.item.order);
 }
 return result.slice(0,limit).map(({item:s,match})=>({sentenceId:s.id,unitId:s.unitId,level:s.level,japanese:s.japanese,reading:s.readingKana,english:s.english,match,href:link('bunshou',{v:1,kind:'sentence',id:s.id})}));
}
export function unitExists(id:string){return CURRICULUM_UNITS.some(u=>u.id===id);}
export function suggestedLesson(s:PersistedAppState):Ref{
 const unit=CURRICULUM_UNITS.find(u=>u.level===s.settings.selectedLevel&&SENTENCES_BY_UNIT[u.id].some(x=>!Object.hasOwn(s.records,x.id)));
 if(unit)return {v:1,kind:'lesson',id:unit.id};
 return {v:1,kind:'review'};
}
export function resumeReference(s:PersistedAppState,today:string):Ref{
 return getDueReviewQueue(ALL_SENTENCES,s.records,today).length?{v:1,kind:'review'}:suggestedLesson(s);
}

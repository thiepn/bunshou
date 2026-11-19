import {useState} from 'react';
import {examples} from '../interop/corpus';
import {lexical,link,type Ref} from '../interop/contract';
import {SENTENCES_BY_ID} from '../data/sentences';
import type {StudyLaunchConfig} from './StudyView';

export function EcosystemView({initial,onPractice,onGrammar}:{initial:Ref|null;onPractice:(config:StudyLaunchConfig)=>void;onGrammar:(id:string)=>void}){
 const [text,setText]=useState(initial&&'text' in initial?initial.text:'');
 const [ref,setRef]=useState<Ref|null>(initial);
 const [invalid,setInvalid]=useState(false);
 const matches=ref?examples(ref,100):[];
 const [limit,setLimit]=useState(15);
 return <section className="max-w-5xl mx-auto p-4 sm:p-8 space-y-5">
  <header><h1 className="text-2xl font-bold">Context & Japanese ecosystem</h1><p className="text-sm mt-2">Explore Bunshō's existing sentence corpus. Vocabulary and kanji study belong to Kotoba; these links target the planned ecosystem routes and require compatible apps.</p></header>
  <div className="flex flex-wrap gap-3 text-sm">
   <a className="underline" href={link('japanese')} rel="noreferrer">Japanese hub</a>
   <a className="underline" href={link('japanese',{v:1,kind:'kana'})} rel="noreferrer">Kana Academy</a>
   <a className="underline" href={link('kotoba')} rel="noreferrer">Kotoba vocabulary & kanji</a>
  </div>
  <form className="flex flex-wrap gap-2 items-end" onSubmit={e=>{e.preventDefault();const r=lexical('vocabulary',text);setInvalid(!r);setRef(r);setLimit(15);}}>
   <label className="flex-1 min-w-40">Japanese word or character<input lang="ja" className="block w-full rounded-lg border border-stone-400 bg-transparent px-3 py-2" value={text} onChange={e=>setText(e.target.value)} maxLength={64}/></label>
   <button className="rounded-lg bg-[#C83E2B] text-white px-4 py-2" type="submit">Find contextual sentences</button>
  </form>
  {invalid&&<p role="alert">Enter Japanese text of up to 32 characters.</p>}
  {ref&&'text' in ref&&<a className="underline" href={link('kotoba',ref)} rel="noreferrer">Look up {ref.text} in Kotoba</a>}
  {ref&&<p role="status">{matches.length===100?'First 100':matches.length} contextual examples. Surface matches are not verified dictionary senses.</p>}
  {matches.slice(0,limit).map(s=><article key={s.sentenceId} className="rounded-xl border border-stone-300 dark:border-slate-700 p-4 space-y-2">
   <p className="text-xs text-stone-600 dark:text-slate-400">{s.level} · {s.unitId} · {s.match==='segment'?'Annotated match':s.match==='surface'?'Surface match':'Sentence reference'}</p>
   <p lang="ja" className="text-xl font-jp-serif">{s.japanese}</p><p lang="ja" className="text-sm">{s.reading}</p><p>{s.english}</p>
   <div className="flex flex-wrap gap-3 text-sm"><button className="underline" onClick={()=>onPractice({mode:'free_practice',customSet:[SENTENCES_BY_ID[s.sentenceId]]})}>Practice this sentence</button><button className="underline" onClick={()=>onGrammar(s.unitId)}>Open related grammar</button><a className="underline" href={s.href} rel="noreferrer">Sentence reference</a></div>
  </article>)}
  {matches.length>limit&&<button className="underline" onClick={()=>setLimit(n=>n+15)}>Show more examples</button>}
 </section>;
}

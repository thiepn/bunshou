/** Japanese ecosystem interoperability v1. Public references only; no credentials. */
export const ROUTES=Object.freeze({japanese:'https://japanese.thiepn.dev/',kotoba:'https://japanese.thiepn.dev/kotoba/',bunshou:'https://japanese.thiepn.dev/bunshou/'});
export type Product=keyof typeof ROUTES;
export type Ref={v:1;kind:'vocabulary'|'kanji';text:string;reading?:string}|{v:1;kind:'sentence'|'grammar-unit'|'lesson';id:string}|{v:1;kind:'review'|'kana'};
const japanese=/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々〆ヶー]+$/u;
const kana=/^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u;
const han=/^\p{Script=Han}$/u;
const idPattern=/^[a-z0-9-]{1,64}$/;
export function lexical(kind:'vocabulary'|'kanji',text:string,reading?:string):Ref|null{
 const t=text.normalize('NFC'),r=reading?.normalize('NFC');
 if(!japanese.test(t)||Array.from(t).length>32||(kind==='kanji'&&!han.test(t))||(r&&(!kana.test(r)||Array.from(r).length>64)))return null;
 return {v:1,kind,text:t,...(r?{reading:r}:{})};
}
export function supports(product:Product,ref:Ref){
 return product==='japanese'?ref.kind==='kana':product==='kotoba'?ref.kind==='vocabulary'||ref.kind==='kanji':ref.kind!=='kana';
}
export function fragment(ref:Ref){
 const p=new URLSearchParams({jv:'1',kind:ref.kind});
 if('text' in ref){p.set('text',ref.text);if(ref.reading)p.set('reading',ref.reading);}
 if('id' in ref)p.set('id',ref.id);
 return '#'+p.toString();
}
export function parseFragment(hash:string):Ref|null{
 if(!hash.startsWith('#jv=')||hash.length>1024)return null;
 const p=new URLSearchParams(hash.slice(1));
 if(p.get('jv')!=='1'||[...p.keys()].some(k=>p.getAll(k).length!==1))return null;
 const kind=p.get('kind');
 const only=(keys:string[])=>[...p.keys()].every(k=>keys.includes(k));
 if(kind==='vocabulary'||kind==='kanji'){
  if(!only(['jv','kind','text','reading']))return null;
  return lexical(kind,p.get('text')??'',p.get('reading')??undefined);
 }
 if(kind==='sentence'||kind==='grammar-unit'||kind==='lesson'){
  const id=p.get('id');return id&&idPattern.test(id)&&only(['jv','kind','id'])?{v:1,kind,id}:null;
 }
 if((kind==='review'||kind==='kana')&&only(['jv','kind']))return {v:1,kind};
 return null;
}
export function link(product:Product,ref?:Ref):string{
 if(!Object.hasOwn(ROUTES,product))throw Error('INTEROP_UNKNOWN_PRODUCT');
 if(!ref)return ROUTES[product];
 const parsed=parseFragment(fragment(ref));
 if(!parsed||!supports(product,parsed))throw Error('INTEROP_INVALID_REFERENCE');
 return ROUTES[product]+fragment(parsed);
}

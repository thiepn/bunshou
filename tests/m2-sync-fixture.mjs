import http from 'node:http';
import {randomUUID} from 'node:crypto';
const owners=new Map([['fixture-a','11111111-1111-4111-8111-111111111111'],['fixture-b','22222222-2222-4222-8222-222222222222']]);
const workspaces=new Map(), seen=new Map(), devices=new Map();
let loseNext=false;const expired=new Set();
const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
export async function startFixture(){
 workspaces.clear();seen.clear();devices.clear();expired.clear();loseNext=false;
 const server=http.createServer(async(req,res)=>{
  const reply=(code,value)=>{res.writeHead(code,{'access-control-allow-origin':'http://127.0.0.1:4173','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'POST,OPTIONS','content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));};
  if(req.method==='OPTIONS')return reply(204,{});
  const owner=owners.get(req.headers.authorization?.replace(/^Bearer /,''));
  if(!owner)return reply(401,{error:'authentication_required'});
  try{
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8_000_000)throw Error('size');}
   const p=JSON.parse(raw);if(p.protocol_version!==1||p.app_id!=='bunshou'||typeof p.device_id!=='string'||'user_id' in p||'owner' in p)return reply(400,{error:'validation_failed'});
   if(devices.has(p.device_id)&&devices.get(p.device_id)!==owner)return reply(403,{error:'resource_forbidden'});
   devices.set(p.device_id,owner);
   const data=workspaces.get(owner)??{revision:0,document:null,changes:[]};workspaces.set(owner,data);
   if(req.url==='/v1/sync/bootstrap'){return reply(200,{protocol_version:1,snapshot_id:randomUUID(),snapshot_cursor:data.changes.at(-1)?.cursor??'empty',items:data.changes.length?[data.changes.at(-1)]:[],page_token:null,done:true});}
   if(req.url==='/v1/sync/pull'){
    const idx=p.cursor===null||p.cursor==='empty'?-1:data.changes.findIndex(x=>x.cursor===p.cursor);
    if(expired.delete(owner))return reply(200,{protocol_version:1,changes:[],next_cursor:p.cursor??'empty',has_more:false,reset_required:true});
    if(p.cursor!==null&&p.cursor!=='empty'&&idx<0)return reply(200,{protocol_version:1,changes:[],next_cursor:p.cursor,has_more:false,reset_required:true});
    const records=data.changes.slice(idx+1,idx+1+100);return reply(200,{protocol_version:1,changes:records,next_cursor:records.at(-1)?.cursor??p.cursor??'empty',has_more:data.changes.length>idx+1+records.length,reset_required:false});
   }
   if(req.url!=='/v1/sync/push'||!Array.isArray(p.mutations)||p.mutations.length!==1)return reply(400,{error:'validation_failed'});
   const m=p.mutations[0], id=owner+':'+m.mutation_id, previous=seen.get(id);
   if(previous){if(previous.digest!==canonical(m))return reply(409,{error:'mutation_id_reuse'});return reply(200,{protocol_version:1,results:[{...previous.ack,status:'already_applied'}]});}
   const status={mutation_id:m.mutation_id,resource_id:m.resource_id};
   if(m.primitive!=='document'||m.resource_type!=='learner_state'||m.resource_id!=='progress-v1'||m.schema_version!==1||m.operation!=='upsert'||!m.data||'owner' in m.data||'user_id' in m.data)return reply(400,{error:'validation_failed'});
   if(m.base_revision!==data.revision)return reply(200,{protocol_version:1,results:[{...status,status:'conflict'}]});
   const events=new Map(m.data.reviews.map(e=>[e.event_id,e]));
   if(events.size!==m.data.reviews.length||data.document?.reviews.some(e=>canonical(events.get(e.event_id))!==canonical(e)))return reply(400,{error:'validation_failed'});
   data.revision++;data.document=m.data;const cursor=randomUUID();
   data.changes.push({cursor,app_id:'bunshou',primitive:'document',resource_type:'learner_state',resource_id:'progress-v1',operation:'upsert',schema_version:1,revision:data.revision,server_changed_at:new Date().toISOString(),data:m.data});
   const ack={...status,status:'applied',revision:data.revision,change_cursor:cursor};seen.set(id,{digest:canonical(m),ack});
   if(loseNext){loseNext=false;return reply(503,{error:'temporarily_unavailable'});}
   return reply(200,{protocol_version:1,results:[ack]});
  }catch{return reply(400,{error:'validation_failed'});}
 });
 await new Promise(resolve=>server.listen(4174,'127.0.0.1',resolve));
 return {server,workspaces,dropAck:()=>{loseNext=true;},expire:owner=>expired.add(owner)};
}

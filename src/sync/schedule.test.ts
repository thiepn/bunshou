import test from 'node:test';
import assert from 'node:assert/strict';
import {initialMeta,appendLocal} from './model';
import {beginAttempt,finishAttempt,failureReceipt,nextDelay,statusText,MAX_FAILURES,DEBOUNCE_MS,POLL_MS} from './schedule';
test('automatic opt-in, poll, pending and explicit conflict gates',()=>{
 let m={...initialMeta(),autoSync:true,receipt:finishAttempt(beginAttempt(undefined,'1',100,false),'synced',200)};
 assert.equal(nextDelay(m,200),POLL_MS);assert.equal(nextDelay(m,200,true),DEBOUNCE_MS);
 assert.equal(nextDelay(appendLocal(m),200),DEBOUNCE_MS);
 assert.equal(nextDelay({...m,autoSync:false},200),null);
 assert.equal(nextDelay({...m,conflict:{reason:'test',localRaw:'',remote:m.remote,pending:[]}},200),null);
});
test('persistent retry ceiling and deadline, manual retry resets count',()=>{
 let receipt=beginAttempt(undefined,'1',100,false);
 for(let i=1;i<=MAX_FAILURES;i++){
  receipt=failureReceipt(receipt,Error('SYNC_HTTP_503'),100);
  assert.equal(receipt.failures,i);
  const m={...initialMeta(),autoSync:true,receipt};
  if(i<MAX_FAILURES){assert.equal(receipt.outcome,'retry');assert.equal(nextDelay(m,100,true),2000*2**(i-1));}
  else {assert.equal(receipt.outcome,'blocked');assert.equal(nextDelay(m,100000,true),null);}
  receipt=beginAttempt(receipt,String(i+1),100,false);
 }
 assert.equal(beginAttempt(receipt,'manual',200,true).failures,0);
});
test('authorization and protocol failures stop automatic retry',()=>{
 const r=beginAttempt(undefined,'1',100,false);
 for(const code of ['SYNC_AUTH_REQUIRED','SYNC_HTTP_403','SYNC_INVALID_ACK'])assert.equal(failureReceipt(r,Error(code),100).outcome,'blocked');
});
test('status never reports complete with pending, flight, offline or interrupted receipt',()=>{
 const m={...initialMeta(),receipt:finishAttempt(beginAttempt(undefined,'a',100,false),'synced',200)};
 assert.equal(statusText(m,false),'Fixture sync complete');
 assert.equal(statusText(appendLocal(m),false),'Local changes pending');
 assert.match(statusText(m,true),/^Offline/);
 assert.equal(statusText({...m,receipt:beginAttempt(m.receipt,'b',300,false)},false),'Last attempt not confirmed');
});

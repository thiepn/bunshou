import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL_SENTENCES} from '../data/sentences';
import {CURRICULUM_UNITS} from '../data/units';
import {createInitialAppState} from '../utils/storage';
import {scheduleSentenceReview} from '../utils/srs';
import {decode,encode,WorkspaceError} from './workspace';
import {syncPort} from './sync';

function full(){const s=createInitialAppState();s.favorites=ALL_SENTENCES.map(x=>x.id);s.completedDialogues=CURRICULUM_UNITS.map(x=>x.id);for(const x of ALL_SENTENCES)s.records[x.id]=scheduleSentenceReview(undefined,x.id,'good','2026-11-18');return s;}
test('native full 620-record backup round trip',()=>{const s=full();assert.equal(ALL_SENTENCES.length,620);assert.equal(new Set(ALL_SENTENCES.map(x=>x.id)).size,620);assert.deepEqual(JSON.parse(encode(decode(encode(s)))),JSON.parse(encode(s)));});
test('future schema fails closed',()=>{const s=full();s.version=2;assert.throws(()=>decode(JSON.stringify(s)),WorkspaceError);});
test('unknown ID and prototype names fail closed',()=>{for(const id of ['unknown-id','constructor','__proto__']){let s=full();s.favorites.push(id);assert.throws(()=>decode(JSON.stringify(s)),WorkspaceError);}});
test('unknown private data does not disappear',()=>{const s=full();const raw=JSON.stringify({...s,unknownPrivateField:'keep'});assert.throws(()=>decode(raw),WorkspaceError);});
test('missing old optional fields may be added',()=>{const raw=JSON.stringify({version:1,records:{}});assert.equal(decode(raw).version,1);});
test('M2 cannot send learner data',()=>{assert.equal(syncPort.enabled,false);assert.equal(syncPort.status(),'disabled');});

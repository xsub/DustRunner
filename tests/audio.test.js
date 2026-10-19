import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {audioMix} from '../src/engine-sound.js';
import {ENGINES,engineById} from '../src/engines.js';
import {CombustionVoice} from '../src/combustion.js';
test('engine recordings are valid mono PCM loops with headroom and no silent seam',()=>{
 for(const name of ['ford-idle','v8-pull','v8-overrun']){
  const file=readFileSync(new URL(`../public/audio/${name}.wav`,import.meta.url));
  assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(file.toString('ascii',8,12),'WAVE');
  assert.equal(file.readUInt16LE(22),1);assert.equal(file.readUInt32LE(24),44100);assert.equal(file.readUInt16LE(34),16);
  const n=(file.length-44)/2;let sum=0,peak=0;
  for(let i=0;i<n;i++){const x=file.readInt16LE(44+i*2)/32768;sum+=x*x;peak=Math.max(peak,Math.abs(x));}
  assert.ok(Math.sqrt(sum/n)>.04&&peak<.93);
  const seam=Math.abs(file.readInt16LE(file.length-2)-file.readInt16LE(44))/32768;
  assert.ok(seam<.12,`${name} discontinuity ${seam}`);
 }
});
test('combustion uses six / eight events every two crank rotations',()=>{
 for(const cylinders of [6,8]){
  const voice=new CombustionVoice(44100);voice.rpm=1200;
  for(let i=0;i<44100;i++)voice.sample(1200,.7,cylinders,4.9);
  assert.ok(Math.abs(voice.firings-cylinders*10)<=1);
 }
});
test('combustion layer stays finite and bounded from idle to limiter',()=>{
 for(const e of ENGINES){
  const voice=new CombustionVoice(44100);let energy=0;
  for(let i=0;i<22050;i++){
   const x=voice.sample(e.idle+(e.redline-e.idle)*i/22050,.9,e.cylinders,e.liters);
   assert.ok(Number.isFinite(x)&&Math.abs(x)<=.32);energy+=x*x;
  }
  assert.ok(energy>1);
 }
});
test('RPM, cylinder count, displacement and load affect the recorded audio mix',()=>{
 const v8=engineById('302'),six=engineById('300');
 const idle=audioMix(v8,700,0),load=audioMix(v8,3000,1),coast=audioMix(v8,3000,0);
 assert.ok(load.rates[0]>idle.rates[0]);assert.ok(load.gains[1]>coast.gains[1]);assert.ok(coast.gains[2]>load.gains[2]);assert.ok(load.cutoff>coast.cutoff);
 assert.notDeepEqual(audioMix(six,2000,.5),audioMix(v8,2000,.5));
 assert.notDeepEqual(audioMix(engineById('400'),2000,.5),audioMix(v8,2000,.5));
});
test('switching live between I6 and V8 never creates an invalid fractional-cylinder voice',()=>{
 const voice=new CombustionVoice(44100);
 for(const count of [8,7.5,7,6.5,6,8])for(let i=0;i<5000;i++)assert.ok(Number.isFinite(voice.sample(2200,.8,count,4.9)));
});

import {RECORDING_LAYERS,steadyEngineLoop} from '../src/engine-loops.js';
test('recorded revs become steady four-stroke cycles with a clean, normalized join',()=>{
 for(const layer of RECORDING_LAYERS){
  const file=readFileSync(new URL(`../public/audio/${layer.name}.wav`,import.meta.url));
  const samples=Float32Array.from({length:(file.length-44)/2},(_,i)=>file.readInt16LE(44+i*2)/32768);
  const loop=steadyEngineLoop(samples,44100,layer);
  assert.ok(Math.abs(loop.length/44100-120/layer.rpm)<1/44100);
  let energy=0,peak=0,mean=0;
  for(const x of loop){assert.ok(Number.isFinite(x));energy+=x*x;peak=Math.max(peak,Math.abs(x));mean+=x;}
  assert.ok(Math.sqrt(energy/loop.length)>.18&&Math.sqrt(energy/loop.length)<.24);
  assert.ok(peak<=.881);assert.ok(Math.abs(mean/loop.length)<1e-6);
  assert.ok(Math.abs(loop[0]-loop.at(-1))<.08,`${layer.name}: clicking loop join`);
 }
});
test('constant RPM gives constant audio parameters, and loaded-loop pitch keeps rising to redline',()=>{
 for(const engine of ENGINES){
  const a=audioMix(engine,3000,.8);
  for(let i=0;i<600;i++)assert.deepEqual(audioMix(engine,3000,.8),a);
  assert.ok(audioMix(engine,engine.redline,1).rates[1]>audioMix(engine,engine.redline*.75,1).rates[1]);
 }
 const e=engineById('302'),coast=audioMix(e,3000,0),pull=audioMix(e,3000,1);
 assert.ok(pull.gains[1]>coast.gains[1]*3);assert.ok(pull.cutoff>coast.cutoff+2000);
});

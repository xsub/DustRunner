import test from 'node:test';
import assert from 'node:assert/strict';
import {RaceBenchmark,summarizeFrames} from '../src/race-benchmark.js';
test('benchmark reports true slow frames, lows and physical update frequency without averaging away stutters',()=>{
 const samples=Array.from({length:120},()=>({dt:16,cpuMs:4,physicsMs:2,steps:2,calls:50,triangles:1000,visibleCars:6}));samples[60].dt=100;
 const stats=summarizeFrames(samples);assert.ok(stats.fps<60);assert.ok(stats.onePercentLow<20);assert.equal(stats.worstMs,100);assert.equal(stats.worstFrameFps,10);assert.equal(stats.meetsStrict60,false);assert.equal(stats.over33Ms,1);assert.equal(stats.visibleCarsMin,6);assert.equal(summarizeFrames([]),null);
});
test('each track receives two passes, excludes warmup and requires full coverage',()=>{
 const loads=[],finished=[],bench=new RaceBenchmark({load:leg=>loads.push(leg),onFinish:r=>finished.push(r),warmup:.1,minimum:.1,maximum:2,passes:2});
 const state={active:true,progress:0,dropped:0,recoveries:0},timing={cpuMs:1,physicsMs:.5,steps:2};
 bench.start([{track:0,name:'A'},{track:1,name:'B'}],{});let now=0;
 for(let leg=0;leg<4;leg++){
  bench.advance();bench.record(now,timing,state);now+=100;bench.record(now,timing,state);
  for(let bin=0;bin<64;bin++){now+=10;bench.record(now,timing,{...state,progress:bin/64});}
 }
 assert.equal(bench.running,false);assert.equal(loads.length,4);assert.deepEqual(loads.map(l=>l.pass),[1,1,2,2]);assert.equal(finished.length,1);assert.ok(finished[0].results.every(r=>r.frames===64&&r.completeCoverage));
});
test('incomplete coverage times out honestly; interruptions never produce a completed report',()=>{
 const bench=new RaceBenchmark({load(){},warmup:0,minimum:.1,maximum:.2,passes:1}),state={active:true,progress:0,dropped:0,recoveries:0};
 bench.start([{track:0,name:'A'}],{});bench.advance();bench.record(0,{},state);bench.record(1,{},state);bench.record(250,{},state);
 assert.equal(bench.report.results[0].completeCoverage,false);assert.equal(bench.report.results[0].meetsStrict60,false);
 bench.start([{track:0,name:'A'}],{});bench.advance();bench.record(1000,{},state);bench.record(1016,{},{...state,active:false});assert.equal(bench.report.status,'interrupted');assert.equal(bench.report.results.length,0);
});

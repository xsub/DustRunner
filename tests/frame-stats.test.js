import test from 'node:test';
import assert from 'node:assert/strict';
import {FrameStats} from '../src/frame-stats.js';
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} ≠ ${expected}`);
test('FPS uses elapsed RAF time, including a stalled frame, not capped physics time',()=>{
 const stats=new FrameStats();stats.record(0);stats.record(20,{cpuMs:4,physicsMs:2,steps:2});stats.record(200,{cpuMs:12,physicsMs:6,steps:6});
 const s=stats.snapshot();close(s.fps,10);close(s.frameMs,100);close(s.cpuMs,8);close(s.physicsMs,4);close(s.physicsHz,40);close(s.stepsPerFrame,4);assert.equal(s.p95Ms,180);
});
test('rolling window ages out earlier slow frames and reports the 95th percentile',()=>{
 const stats=new FrameStats(2000);stats.record(0);stats.record(500);for(let i=1;i<=200;i++)stats.record(500+i*10,{steps:1});
 const s=stats.snapshot();assert.equal(stats.samples.length,200);close(s.fps,100);assert.equal(s.p95Ms,10);close(s.physicsHz,100);
});
test('pause/reset starts a fresh sampling window and does not count hidden time',()=>{
 const stats=new FrameStats();stats.record(0);stats.record(50);stats.reset();assert.equal(stats.snapshot(),null);stats.record(50000);assert.equal(stats.snapshot(),null);stats.record(50020);close(stats.snapshot().fps,50);assert.equal(stats.snapshot().physicsHz,0);
});
test('invalid or duplicate timestamps do not corrupt later samples',()=>{
 const stats=new FrameStats();stats.record(100);stats.record(NaN);stats.record(100);stats.record(90);stats.record(120);assert.equal(stats.samples.length,1);close(stats.snapshot().fps,50);
});
test('one percent low reveals stalls hidden by the average frame rate',()=>{
 const stats=new FrameStats(10000);stats.record(0);let now=0;
 for(let i=0;i<200;i++){now+=i===100?100:10;stats.record(now);}
 const s=stats.snapshot();assert.ok(s.fps>90);close(s.lowFps,1000/55);assert.equal(s.p99Ms,10);
});

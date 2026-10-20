import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RaceCompletion} from '../src/race-completion.js';
test('podium medals use requested confetti colors and finishing freezes results and awards only once',()=>{
 for(const [rank,medal,color,reward] of [[1,'ZŁOTO','#ed454d',900],[2,'SREBRO','#53bd77',600],[3,'BRĄZ','#f28b38',400],[4,null,null,300]]){
  const state=new RaceCompletion(),result=state.record(rank,193.56);assert.deepEqual([result.medal,result.color,result.reward],[medal,color,reward]);
  assert.equal(state.record(1,999),null);assert.equal(state.result.time,193.56);assert.equal(state.result.rank,rank);assert.ok(Object.isFrozen(state.result));
 }
});
test('the player can keep driving indefinitely after crossing the finish',()=>{
 const state=new RaceCompletion();state.record(1,100);
 for(let i=0;i<120*120;i++)assert.equal(state.tick(1/120,{speed:20}),false);
 assert.equal(state.closed,false);assert.equal(state.stoppedFor,0);assert.equal(state.result.time,100);
});
test('results appear after ten uninterrupted seconds stopped and the manual action closes exactly once',()=>{
 const state=new RaceCompletion();assert.equal(state.close(),false);state.record(2,150);
 for(let i=0;i<1199;i++)assert.equal(state.tick(1/120,{speed:0}),false);
 assert.equal(state.tick(1/120,{speed:0}),true);assert.equal(state.close(),true);assert.equal(state.close(),false);
 const manual=new RaceCompletion();manual.record(3,170);assert.equal(manual.close(),true);assert.equal(manual.stoppedFor,0);
});
test('menu, tuning, pause, driving input, sliding and flight interrupt the stopped countdown',()=>{
 for(const change of [{editing:true},{active:false},{driving:true},{speed:.4},{vertical:1},{airborne:true}]){
  const state=new RaceCompletion();state.record(1,100);state.tick(9,{speed:0});assert.equal(state.tick(30,{speed:0,...change}),false);assert.equal(state.stoppedFor,0);
  assert.equal(state.tick(9.9,{speed:0}),false);assert.equal(state.tick(.1,{speed:0}),true);
 }
 const state=new RaceCompletion();state.record(1,100);state.tick(9,{speed:0});state.interrupt();assert.equal(state.tick(1,{speed:0}),false);
 state.reset();assert.equal(state.result,null);assert.equal(state.tick(20,{speed:0}),false);
});

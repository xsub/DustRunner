import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceProgress,angleDelta,formatTime} from '../src/race.js';
test('complete lap requires all quarters and a forward line crossing',()=>{let cp=0,lap=0;for(const [a,b] of [[140,160],[290,310],[440,460],[590,10]]){({checkpoint:cp,lap}=advanceProgress(a,b,cp,lap));}assert.equal(lap,1);assert.equal(cp,0);});
test('line oscillation and skipping checkpoints do not award laps',()=>{assert.equal(advanceProgress(590,10,0,0).lap,0);assert.equal(advanceProgress(10,590,3,0).lap,0);assert.equal(advanceProgress(10,310,0,0).checkpoint,0);});
test('steering uses the shortest angle across wrap',()=>{assert.ok(Math.abs(angleDelta(-Math.PI+.1,Math.PI-.1)-.2)<1e-10);});
test('race time formats minutes and hundredths',()=>assert.equal(formatTime(65.123),'01:05.12'));

import {arcadeMotion,fitCircuitView} from '../src/race.js';
const car=()=>({speed:0,heading:0,height:0,vx:0,vz:0,x:0,z:0});
const drive={throttle:1,steer:0,brake:false,boost:false,onDirt:true};
function simulate(c,input,seconds,hz=60){for(let i=0;i<seconds*hz;i++)arcadeMotion(c,input,1/hz);return c;}
test('arcade truck reaches race pace quickly and brakes to reverse',()=>{const c=simulate(car(),drive,1);assert.ok(c.speed>17);simulate(c,{...drive,throttle:0,brake:true},.75);assert.ok(c.speed<0);});
test('steering responds immediately while retaining a short dirt slide',()=>{const c=simulate(car(),drive,1.5);const heading=c.heading;simulate(c,{...drive,steer:1},.25);assert.ok(c.heading-heading>.8);assert.ok(c.vx< -8);assert.ok(c.vz<0);});
test('handling is stable at 60 and 120 physics updates per second',()=>{const a=simulate(car(),drive,1.5,60),b=simulate(car(),drive,1.5,120);assert.ok(Math.abs(a.speed-b.speed)<.15);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.3);});
test('both circuit edges fit on portrait, desktop and ultrawide viewports',()=>{const bounds={minX:-45,maxX:43,minY:-28,maxY:30};for(const aspect of [.5,1,1.7,2.5]){const view=fitCircuitView(bounds,aspect);assert.ok(view.left<bounds.minX&&view.right>bounds.maxX);assert.ok(view.bottom<bounds.minY&&view.top>bounds.maxY);assert.ok(Math.abs((view.right-view.left)/(view.top-view.bottom)-aspect)<1e-10);}});

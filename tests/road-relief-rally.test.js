import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localRoadRelief,ROAD_RELIEF_DIAMETER} from '../src/road-relief.js';
import {rallyPace,packView} from '../src/attract-mode.js';
test('tire-scale road relief contains rounded hills and hollows with bounded slopes',()=>{
 let low=0,high=0,grade=0;
 for(let s=0;s<180;s+=.2)for(let z=-6;z<=6;z+=.5){
  const h=localRoadRelief(s,z,3);low=Math.min(low,h);high=Math.max(high,h);
  const ds=(localRoadRelief(s+.01,z,3)-localRoadRelief(s-.01,z,3))/.02;
  const dz=(localRoadRelief(s,z+.01,3)-localRoadRelief(s,z-.01,3))/.02;
  grade=Math.max(grade,Math.hypot(ds,dz));
  assert.equal(h,localRoadRelief(s,z,3));
 }
 assert.ok(ROAD_RELIEF_DIAMETER>1.6&&ROAD_RELIEF_DIAMETER<1.8);assert.ok(low<-.15);assert.ok(high>.15);assert.ok(grade<.4,`grade ${grade}`);
 assert.notEqual(localRoadRelief(6,0,0),localRoadRelief(6,0,1));
});
test('rally pack accelerates stragglers and keeps a scattered leader within reach',()=>{
 const cars=[{demoDistance:100},{demoDistance:94},{demoDistance:60},{demoDistance:50}];
 assert.ok(rallyPace(cars[3],cars,1000).pace>rallyPace(cars[0],cars,1000).pace);assert.equal(rallyPace(cars[3],cars,1000).catchup,true);
 assert.ok(rallyPace(cars[1],cars.slice(0,2),1000).pace>1.3);
 assert.deepEqual(packView([{x:0,z:4,vx:10,vz:2},{x:20,z:0,vx:8,vz:0}]),{x:10,z:2,vx:9,vz:1});
});

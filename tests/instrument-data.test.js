import test from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Vector3} from 'three';
import {instrumentStyle,instrumentReading,loadGearColor} from '../src/instrument-data.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('automatic instruments follow body while player overrides always win',()=>{
 for(const body of ['classic','sky','crawler'])assert.equal(instrumentStyle('auto',body),'round');
 for(const body of ['ranger','sunset','expedition','copper78'])assert.equal(instrumentStyle('auto',body),'rect');
 assert.equal(instrumentStyle('auto','godzilla78'),'six');assert.equal(instrumentStyle('invalid','classic'),'round');
 for(const style of ['six','rect','round'])for(const body of ['classic','copper78','godzilla78'])assert.equal(instrumentStyle(style,body),style);
});
test('forward gears encode actual load, retaining black reverse and gray neutral',()=>{
 for(const gear of [1,2,3,4,10]){
  assert.equal(loadGearColor(gear,0),'hsl(120 80% 62%)');assert.equal(loadGearColor(gear,50),'hsl(60 80% 62%)');assert.equal(loadGearColor(gear,100),'hsl(0 80% 62%)');
 }
 assert.equal(loadGearColor(-1,90),'#000000');assert.equal(loadGearColor(0,90),'#a0a5a0');assert.equal(loadGearColor(1,200),loadGearColor(1,100));
});
test('instruments read speed, real RPM/load and engine-specific redline without changing state',()=>{
 const car={style:'classic',engineId:'351m',speed:-12,nitro:42,powertrain:{rpm:2975,load:.82,gear:2}};
 const before=JSON.stringify(car),n=instrumentReading(car);close(n.speed,43.2);assert.equal(n.rpm,2975);assert.equal(n.redline,4500);assert.equal(n.load,82);assert.equal(n.nitro,42);assert.equal(JSON.stringify(car),before);
});
test('pitch and roll use physical body attitude in the air, independently of world heading',()=>{
 for(const heading of [0,.7,2.4,-3]){
  const yaw=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),heading);
  for(const [axis,key,angle] of [[new Vector3(1,0,0),'pitch',.4],[new Vector3(0,0,1),'roll',-.6]]){
   const q=yaw.clone().multiply(new Quaternion().setFromAxisAngle(axis,angle));
   const n=instrumentReading({engineId:'302',airborne:true,physics:{body:{rotation:()=>q}}});close(n[key],angle*180/Math.PI);
  }
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {AI_LEVELS,aiLevel,normalizeRaceSetup,readRaceSetup,saveRaceSetup} from '../src/ai-drivers.js';
import {createCircuit,opponentInput,nearestPoint} from '../src/tracks.js';
test('six-car default, solo play and safe configurable AI count with per-driver skills',()=>{
 assert.equal(normalizeRaceSetup().count,5);assert.equal(normalizeRaceSetup({count:0}).count,0);assert.equal(normalizeRaceSetup({count:99}).count,11);
 assert.deepEqual(normalizeRaceSetup().skills.slice(0,5),AI_LEVELS.map(p=>p.id));assert.equal(aiLevel('bad').id,'seasoned');
 const storage={value:'broken',getItem(){return this.value;},setItem(k,v){this.value=v;}};
 assert.equal(readRaceSetup(storage).count,5);saveRaceSetup(storage,{count:7,skills:['master']});assert.equal(readRaceSetup(storage).count,7);assert.equal(readRaceSetup(storage).skills[0],'master');
});
test('AI skill changes anticipation, line accuracy, pace and nitro decisions using ordinary driving inputs',()=>{
 const curve=createCircuit(0),samples=Array.from({length:600},(_,i)=>curve.getPointAt(i/600));let differences=0;
 for(let i=0;i<600;i+=20){const p=samples[i],t=curve.getTangentAt(i/600),car={x:p.x,z:p.z,speed:20,heading:Math.atan2(-t.x,-t.z),nitro:100,number:'12',lane:0};const near=nearestPoint(samples,p.x,p.z);
  const novice=opponentInput(car,near,curve,samples,{skill:'amateur'}),master=opponentInput(car,near,curve,samples,{skill:'master'});
  if(JSON.stringify(novice)!==JSON.stringify(master))differences++;
  for(const input of [novice,master]){assert.ok(Math.abs(input.steer)<=1);assert.ok(input.throttle>=0&&input.throttle<=1);assert.equal(typeof input.brake,'boolean');}
 }
 assert.ok(differences>10);assert.ok(AI_LEVELS.every((p,i)=>!i||p.pace>AI_LEVELS[i-1].pace));
});

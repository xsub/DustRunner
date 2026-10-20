import {test,before,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {TUNING_FIELDS,DEFAULT_TUNING,tuning,setTuning,validateTuning,tuningDocument,parseTuning,restoreTuning,readPresets,storePreset,ACTIVE_TUNING_KEY,PRESETS_KEY} from '../src/tuning.js';
import {vehicleMass,vehicleMassProperties} from '../src/vehicle-mass.js';
import {initPhysics,createPhysics} from '../src/physics.js';
import {TRACKS,ROAD_WIDTH,SHOULDER_WIDTH,refreshTracks,createCircuit,terrainHeight} from '../src/tracks.js';
import {buildTerrain} from '../src/terrain.js';
import {powertrainStep,resetPowertrain} from '../src/powertrain.js';
import {steeringStep,drivingControls} from '../src/driving-controls.js';
before(async()=>await initPhysics());
afterEach(()=>{setTuning(DEFAULT_TUNING);refreshTracks();});
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
test('tuning schema has unique controls, valid defaults and immutable factory settings',()=>{
 assert.equal(new Set(TUNING_FIELDS.map(f=>f.key)).size,TUNING_FIELDS.length);assert.ok(TUNING_FIELDS.length>=70);
 assert.deepEqual(validateTuning(DEFAULT_TUNING),DEFAULT_TUNING);assert.equal(Object.isFrozen(DEFAULT_TUNING),true);
 setTuning({gravity:12});assert.equal(DEFAULT_TUNING.gravity,20);assert.equal(tuning.gravity,12);
});
test('imports reject malformed JSON, incompatible versions, unknown fields and invalid numeric values',()=>{
 for(const value of [null,[],{gravity:NaN},{gravity:Infinity},{gravity:'12'},{gravity:100},{solverIterations:4.5},{gear1:2,gear2:2.2},{unexpected:1},JSON.parse('{"__proto__":{"gravity":0}}')])assert.throws(()=>validateTuning(value));
 for(const text of ['{','{}',JSON.stringify({format:'dust-runner-tunning',version:2,parameters:{}}),'x'.repeat(100001)])assert.throws(()=>parseTuning(text));
 const before={...tuning};assert.throws(()=>setTuning({compactDryMass:100}));assert.deepEqual(tuning,before,'invalid imports must not partly modify a running configuration');
});
test('copy/import roundtrip retains all values, name and reproducibility context',()=>{
 const original=tuningDocument({...DEFAULT_TUNING,gravity:11.5,compactDryMass:2750},'Moje ciężkie Bronco',{track:1,trackVariant:3,body:'ranger',engineId:'400',steeringMode:'hold',applied:true});
 assert.deepEqual(parseTuning(JSON.stringify(original)),original);
});
test('named browser presets overwrite by name, reload correctly and restore an active configuration',()=>{
 const storage=memory();let presets=[];
 presets=storePreset(storage,presets,tuningDocument({gravity:10},'A'));
 presets=storePreset(storage,presets,tuningDocument({gravity:12},'B'));
 presets=storePreset(storage,presets,tuningDocument({gravity:11},'A'));
 assert.equal(presets.length,2);assert.equal(readPresets(storage).find(p=>p.name==='A').parameters.gravity,11);
 storage.setItem(ACTIVE_TUNING_KEY,JSON.stringify(presets[1]));assert.equal(restoreTuning(storage),true);assert.equal(tuning.gravity,11);
 storage.setItem(PRESETS_KEY,JSON.stringify([presets[0],{bad:true}]));assert.equal(readPresets(storage).length,1);
});
test('unavailable browser storage never masquerades as a successful save',()=>{
 const storage={getItem(){throw Error('denied');},setItem(){throw Error('quota');}};
 assert.equal(restoreTuning(storage),false);assert.deepEqual(readPresets(storage),[]);
 assert.throws(()=>storePreset(storage,[],tuningDocument()),/quota/);
});
test('custom settings change actual Rapier mass, gravity, suspension and props',()=>{
 const oldProperties=vehicleMassProperties('classic','302');
 setTuning({compactDryMass:2775,engineMassScale:1.2,inertiaScale:1.5,gravity:12,spring:80,compression:6,rebound:9,tireMass:15,coneMass:5});
 assert.equal(vehicleMass('classic','302'),3045);assert.notEqual(vehicleMassProperties('classic','302'),oldProperties);
 const terrain={positions:new Float32Array([-50,0,-50,50,0,-50,-50,0,50,50,0,50]),indices:new Uint32Array([0,2,1,1,2,3]),heightAt:()=>0};
 const physics=createPhysics(terrain,{min:{x:-50,z:-50},max:{x:50,z:50}}),car={x:0,z:0,speed:0,heading:0,style:'classic',engineId:'302'};
 try{
  physics.reset(car);assert.ok(Math.abs(car.physics.body.mass()-3045)<.01);assert.equal(physics.world.gravity.y,-12);
  assert.equal(car.physics.controller.wheelSuspensionStiffness(0),80);assert.equal(car.physics.controller.wheelSuspensionCompression(0),6);assert.equal(car.physics.controller.wheelSuspensionRelaxation(0),9);
  assert.ok(Math.abs(physics.addBarrier(5,0,0,{kind:'tires'}).mass()-15)<.001);assert.ok(Math.abs(physics.addBarrier(-5,0,0,{kind:'cone'}).mass()-5)<.001);
 }finally{physics.dispose();}
});
test('drive, steering and brake settings alter their real simulation outputs',()=>{
 const makeCar=()=>{const car={speed:18,style:'classic',engineId:'302'};resetPowertrain(car);car.powertrain.gear=3;return car;};
 const normal=powertrainStep(makeCar(),{throttle:1,onDirt:true},1/120).acceleration;
 setTuning({torqueScale:1.5,steerLow:.7,heldSteerRate:1,brakeBuild:.8});
 const tuned=powertrainStep(makeCar(),{throttle:1,onDirt:true},1/120).acceleration;assert.ok(tuned>normal*1.4);
 assert.ok(Math.abs(steeringStep(0,1,0,.3,false,'hold')-.3)<1e-9);
 assert.ok(steeringStep(0,1,0,3)>.69);
 const state={};for(let i=0;i<60;i++)drivingControls(state,{brake:true},20,1/120);assert.ok(state.brakePressure<.5);
});
test('terrain settings rebuild width, ramp geometry and matching contact triangles',()=>{
 setTuning({roadWidth:9,shoulderWidth:20,rampHeight:4.5,jumpGap:8,rampRunup:35,landingLength:45,whoopsScale:.5});refreshTracks();
 assert.equal(ROAD_WIDTH,9);assert.equal(SHOULDER_WIDTH,20);const f=TRACKS[0].features[0];assert.equal(f.height,4.5);assert.equal(f.gap,8);
 const t=f.start+(f.runup-.001)/TRACKS[0].length;assert.ok(Math.abs(terrainHeight(t,0)-7.5)<.002);
 const curve=createCircuit(0,1),samples=Array.from({length:600},(_,i)=>curve.getPointAt(i/600)),terrain=buildTerrain(samples,curve,0);
 for(let i=0;i<terrain.positions.length;i+=387){const v=terrain.positions;assert.ok(Math.abs(terrain.heightAt(v[i],v[i+2])-v[i+1])<.003);}
});

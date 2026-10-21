import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {REFERENCE_MODELS,vehicleProfile,wheelConnectionY} from '../src/vehicle-models.js';
import {createBronco,BRONCO_STYLES} from '../src/vehicle.js';
import {isOpenBody,isCompactBody,rollCageSegments} from '../src/body-types.js';
import {defaultEngine,engineById} from '../src/engines.js';
import {initPhysics,createPhysics} from '../src/physics.js';
import {TIRE_RADIUS,VEHICLE_SCALE} from '../src/contact.js';
test('twelve photographed custom builds add distinct body, tire, roof and accessory configurations',()=>{
 assert.equal(Object.keys(REFERENCE_MODELS).length,12);assert.equal(Object.keys(BRONCO_STYLES).length,20);
 assert.ok(isOpenBody('roadsterBlack'));assert.ok(isCompactBody('halfCabRed'));assert.ok(rollCageSegments('roadsterBlack').length>rollCageSegments('sky').length);
 assert.equal(vehicleProfile('halfCabRed').bodyType,'halfCab');assert.equal(vehicleProfile('softtop78').bodyType,'softtop');
 for(const [id,spec] of Object.entries(REFERENCE_MODELS)){assert.equal(engineById(defaultEngine(id)).id,spec.engine);assert.ok(spec.track>=1&&spec.wheelScale>1&&spec.lift>0);}
});
test('all new models have finite geometry, separate correctly sized wheels and bounded draw batches',()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
 try{for(const [style,spec] of Object.entries(REFERENCE_MODELS)){
  const car=createBronco(style,'07');assert.equal(car.wheels.length,4);assert.equal(car.exhausts.length,2);
  let meshes=0;car.mesh.traverse(o=>{if(o.isMesh)meshes++;});assert.ok(meshes<75,`${style}: ${meshes} draw batches`);
  car.wheels.forEach(w=>{assert.equal(w.spin.scale.y,spec.wheelScale);assert.equal(w.spin.scale.x,spec.wheelWidth);assert.equal(Math.abs(w.x),spec.track);});
  const bounds=new THREE.Box3().setFromObject(car.mesh);assert.ok(Number.isFinite(bounds.max.y)&&bounds.max.y>bounds.min.y);car.dispose();
 }}finally{globalThis.document=previous;}
});
test('every new model uses matching lifted wheel contacts in real physics and settles on all four tires',async()=>{
 await initPhysics();
 const terrain={positions:new Float32Array([-100,0,-100,100,0,-100,-100,0,100,100,0,100]),indices:new Uint32Array([0,2,1,1,2,3]),heightAt:()=>0};
 const physics=createPhysics(terrain,{min:{x:-100,z:-100},max:{x:100,z:100}}),cars=Object.keys(REFERENCE_MODELS).map((style,i)=>({style,engineId:defaultEngine(style),x:(i%4)*12-18,z:Math.floor(i/4)*12-12,speed:0,heading:0}));
 try{
  cars.forEach(car=>physics.reset(car));
  for(let step=0;step<360;step++){cars.forEach(car=>physics.input(car,{throttle:0,steer:0,brake:false,onDirt:true,ai:true},1/120));physics.step();cars.forEach(car=>physics.sync(car,1/120));}
  for(const car of cars){const p=vehicleProfile(car.style),c=car.physics.controller;assert.equal(car.airborne,false,car.style);assert.equal(car.rollover,false,car.style);
   for(let i=0;i<4;i++){
    assert.ok(c.wheelIsInContact(i),`${car.style} wheel ${i}`);
    assert.ok(Math.abs(c.wheelRadius(i)-TIRE_RADIUS*VEHICLE_SCALE*p.wheelScale)<1e-6);
    assert.ok(Math.abs(c.wheelChassisConnectionPointCs(i).y-wheelConnectionY(car.style))<1e-6);
    const bottom=car.physics.body.translation().y+c.wheelChassisConnectionPointCs(i).y-c.wheelSuspensionLength(i)-c.wheelRadius(i);assert.ok(Math.abs(bottom)<.06,`${car.style}: tire bottom ${bottom}`);
   }
  }
 }finally{physics.dispose();}
});

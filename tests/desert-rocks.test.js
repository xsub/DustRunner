import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import {buildDesert} from '../src/desert.js';
import {desertRockFeatures,formationMask} from '../src/desert-rocks.js';
import {jumpPoint,jumpCoordinates,jumpEnd} from '../src/desert-jumps.js';
import {initPhysics,createPhysics} from '../src/physics.js';
import {createDesertRockMesh} from '../src/desert-rock-mesh.js';
before(initPhysics);
const ground=buildDesert();
test('seeded desert adds paired rock ramps, accessible rock formations and low boulder clusters',()=>{
 const f=desertRockFeatures();assert.equal(f.ramps.length,3);assert.ok(f.ramps.every(r=>r.paired));assert.equal(f.formations.length,3);assert.ok(f.stones.length>1200);
 assert.deepEqual(f,desertRockFeatures(1947));assert.notDeepEqual(f.stones,desertRockFeatures(123).stones);
 for(const s of f.stones)assert.ok(s.sy+s.offset<.36&&s.sx>.45);
 for(const r of f.ramps){
  const at=s=>{const p=jumpPoint(r,s);return ground.heightAt(p.x,p.z);};
  assert.ok(Math.abs(at(-35)-1)<.04);assert.ok(at(1)-at(-1)<.05,'no curb at the run-in');
  for(const side of [-1.5,1.5]){const center=jumpPoint(r,r.runup*.5),edge=jumpPoint(r,r.runup*.5,side);assert.ok(Math.abs(ground.heightAt(center.x,center.z)-ground.heightAt(edge.x,edge.z))<.06,'rigid deck stays flat across its width');}
  assert.ok(at(r.runup)>1+r.height*.7);assert.ok(at(r.runup+r.gap+6)>at(jumpEnd(r)-2),'opposite landing slopes back to ground');
 }
 for(const f of ground.rockFormations){
  assert.equal(formationMask(f,f.x,f.z),1);assert.ok(ground.heightAt(f.x,f.z)>f.height);
  for(let z=f.z-f.rz+5;z<f.z;z+=2.5)assert.ok(Math.abs(ground.heightAt(f.x,z+2.5)-ground.heightAt(f.x,z))/2.5<.8,'rock ascent must be driveable');
 }
});
test('visible sandstone uses the actual contact triangles and bounded geometry',()=>{
 const mesh=createDesertRockMesh(ground),a=mesh.geometry.attributes.position;
 try{assert.ok(a.count>1000&&a.count<200000);for(let i=0;i<a.count;i+=31)assert.ok(Math.abs(a.getY(i)-ground.heightAt(a.getX(i),a.getZ(i))-.018)<.0002);}
 finally{mesh.geometry.dispose();mesh.material.dispose();}
});
for(const jump of ground.rockRamps)test(`matched engine drives the smooth run-in, jumps and lands rock pair ${jump.id}`,()=>{
 const p=createPhysics(ground,ground.bounds),car={...jumpPoint(jump,-245),heading:jump.heading,style:'classic',engineId:jump.height>=12?'godzilla73':'302',speed:0,transmissionMode:'automatic',driveMode:'auto'};p.reset(car);
 let flight=0,landed=false,landingS=null,normalImpact=null,lastVelocity={x:0,y:0,z:0};
 try{
  for(let i=0;i<120*35;i++){
   p.input(car,{throttle:i>240?1:0,steer:0,onDirt:true},1/120);p.step();p.sync(car,1/120);const s=jumpCoordinates(jump,car.x,car.z).s;
   if(i>240&&s>jump.runup-3&&car.airborne)flight+=1/120;
   if(flight>.1&&!car.airborne&&!landed){landed=true;landingS=s;
    const dx=(ground.heightAt(car.x+.25,car.z)-ground.heightAt(car.x-.25,car.z))/.5,dz=(ground.heightAt(car.x,car.z+.25)-ground.heightAt(car.x,car.z-.25))/.5;
    normalImpact=Math.abs(lastVelocity.y-dx*lastVelocity.x-dz*lastVelocity.z)/Math.hypot(1,dx,dz);}
   lastVelocity={...car.physics.body.linvel()};assert.equal(car.rollover,false);if(s>jumpEnd(jump)+20)break;
  }
  assert.ok(flight>.2,`flight ${flight}`);assert.ok(landed);assert.ok(normalImpact<8,`landing normal impact ${normalImpact} m/s`);assert.ok(landingS>jump.runup+jump.gap-3.5&&landingS<jumpEnd(jump)+5,`landing at ${landingS}`);
  assert.ok(jumpCoordinates(jump,car.x,car.z).s>jumpEnd(jump),'continue after landing');
 }finally{p.dispose();}
});
for(const formation of ground.rockFormations)test(`stock 302 in LO climbs rock formation at ${formation.x}, ${formation.z}`,()=>{
 const p=createPhysics(ground,ground.bounds),car={x:formation.x,z:formation.z+formation.rz+15,heading:0,style:'classic',engineId:'302',speed:0,transmissionMode:'automatic',driveMode:'lo'};p.reset(car);
 try{
  for(let i=0;i<120*45;i++){p.input(car,{throttle:i>240?1:0,steer:0,onDirt:true},1/120);p.step();p.sync(car,1/120);assert.equal(car.rollover,false);if(car.z<formation.z+10)break;}
  assert.ok(car.z<formation.z+10,`stuck at ${car.z}`);assert.ok(car.height>formation.height*.8);
 }finally{p.dispose();}
});

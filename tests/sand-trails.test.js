import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSandTrails} from '../src/sand-trails.js';
function fixture(capacity=32){
 const scene=new THREE.Scene(),trails=createSandTrails(scene,capacity);let travel=0,grounded=[true,true,true,true],rock=false;
 const heightAt=(x,z)=>x*.2+z*.1;
 const car={heading:0,vx:0,vz:5,physics:{controls:{brakePressure:0},controller:{wheelIsInContact:i=>grounded[i],wheelContactPoint(i,target){target.x=i%2?1:-1;target.z=travel+(i<2?0:2);target.y=heightAt(target.x,target.z)+(rock?2:0);return target;}}}};
 return {scene,trails,car,heightAt,move(z){travel=z;trails.sample(car,heightAt);},contacts(v){grounded=v;},rock(v){rock=v;}};
}
test('all four tire trails conform both edges to the dune, with a bounded single draw mesh',()=>{
 const f=fixture(8);f.move(0);f.move(.5);assert.equal(f.trails.count,4);
 const attr=f.trails.mesh.geometry.attributes.position;
 for(let i=0;i<24;i++)assert.ok(Math.abs(attr.getY(i)-f.heightAt(attr.getX(i),attr.getZ(i))-.025)<1e-6);
 for(let z=1;z<20;z+=.5)f.move(z);
 assert.equal(f.trails.count,8);assert.equal(f.trails.mesh.geometry.drawRange.count,48);assert.equal(f.scene.children.length,1);
 f.trails.reset();assert.equal(f.trails.count,0);assert.equal(f.trails.mesh.geometry.drawRange.count,0);
});
test('airborne wheels, rocks and recovery never bridge across untracked terrain',()=>{
 const f=fixture();f.move(0);f.contacts([false,false,false,false]);f.move(.5);f.move(1);
 f.contacts([true,true,true,true]);f.move(1.5);assert.equal(f.trails.count,0);f.move(2);assert.equal(f.trails.count,4);
 f.rock(true);f.move(2.5);f.rock(false);f.move(3);assert.equal(f.trails.count,4);
 f.move(40);assert.equal(f.trails.count,4);f.move(40.5);assert.equal(f.trails.count,8);
 f.trails.breakTrail(f.car);f.move(41);assert.equal(f.trails.count,8);
});
test('stationary tires do not consume trail storage and sliding/braking leaves stronger ruts',()=>{
 const f=fixture();f.move(0);for(let i=0;i<200;i++)f.move(.01);assert.equal(f.trails.count,0);
 f.move(.5);const strength=f.trails.mesh.geometry.attributes.strength;assert.equal(strength.getX(0),1);
 f.car.vx=4;f.car.physics.controls.brakePressure=1;f.move(1);assert.ok(strength.getX(24)>strength.getX(0));
 f.contacts([true,false,false,false]);f.move(1.5);assert.equal(f.trails.count,9);
 f.trails.dispose();assert.equal(f.scene.children.length,0);
});

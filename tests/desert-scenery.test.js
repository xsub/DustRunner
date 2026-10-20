import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Box3} from 'three';
import {buildRaceDesert,combineGround,createDesertWind,raceDesertRelief} from '../src/desert-scenery.js';
import {createCircuit,ROAD_WIDTH,SHOULDER_WIDTH} from '../src/tracks.js';
import {buildTerrain} from '../src/terrain.js';
import {indexedNearest} from '../src/track-index.js';
import {Group} from 'three';
import {initPhysics,createPhysics} from '../src/physics.js';
const curve=createCircuit(0),samples=Array.from({length:3600},(_,i)=>curve.getPointAt(i/3600)),bounds=new Box3().setFromPoints(samples);
const dunes=buildRaceDesert(samples,bounds,ROAD_WIDTH+SHOULDER_WIDTH);
test('sand dunes leave the whole racing shoulder clear and use the rendered triangles for ground height',async()=>{
 let peak=0;
 for(let i=0;i<dunes.positions.length;i+=3){const [x,y,z]=dunes.positions.slice(i,i+3);peak=Math.max(peak,y);
  if(indexedNearest(samples,x,z).distance<ROAD_WIDTH+SHOULDER_WIDTH+2)assert.ok(Math.abs(y+.25)<1e-6);
  if(i%111===0)assert.ok(Math.abs(y-dunes.heightAt(x,z))<1e-5);
 }
 assert.ok(peak>2);assert.ok(dunes.anchors.length>0);
 const road=buildTerrain(samples,curve,0),contact=combineGround(road,dunes);
 assert.deepEqual(contact.positions.slice(0,road.positions.length),road.positions);
 assert.deepEqual(contact.indices.slice(0,road.indices.length),road.indices);
 assert.ok(contact.indices.every(i=>i<contact.positions.length/3));
 await initPhysics();const physics=createPhysics(contact,bounds),p=samples[0],car={x:p.x,z:p.z,heading:0,speed:0,style:'classic',engineId:'302'};
 try{physics.reset(car);for(let i=0;i<240;i++){physics.input(car,{throttle:0,steer:0,onDirt:true},1/120);physics.step();physics.sync(car,1/120);}
  assert.ok(Number.isFinite(car.height));assert.equal(car.airborne,false);
  assert.ok(Math.abs(car.height-contact.heightAt(car.x,car.z))<.2);
 }finally{physics.dispose();}
});
test('wind scenery has two render objects and cannot animate when paused or when the frame has no headroom',()=>{
 const world=new Group(),wind=createDesertWind({world,heightAt:()=>1,anchors:[{x:1,y:1,z:1}],random:()=>.5});
 assert.equal(world.children.length,2);let queries=0;
 for(let i=0;i<50;i++)wind.update(1,()=>{queries++;return true;},false);
 assert.equal(queries,0);assert.ok(world.children.every(o=>!o.visible));
 for(let i=0;i<10;i++)wind.update(0,()=>{queries++;return true;});assert.equal(queries,0);
 wind.update(.1,()=>true);assert.ok(world.children.some(o=>o.visible));
 for(const o of world.children){o.geometry.dispose();o.material.dispose();}
});

test('race sand has broad climbable hills and occasional dunes rather than short repeating ridges',()=>{
 let min=Infinity,max=-Infinity,small=0,broad=0;
 for(let x=-500;x<500;x++){
  const h=raceDesertRelief(x,71),near=raceDesertRelief(x+1,71);min=Math.min(min,h);max=Math.max(max,h);
  assert.equal(h,raceDesertRelief(x,71));assert.ok(Math.abs(h-near)<.35);
  small+=Math.abs(h-near);broad+=Math.abs(h-raceDesertRelief(x+24,71));
 }
 assert.ok(max-min>5);assert.ok(broad>small*12,'features should change over tens of meters, not tire-sized stripes');
 // Height-dependent easing beside the track must not create new roadside walls.
 const p=dunes.positions;
 for(let i=3;i<p.length;i+=3)if(Math.abs(p[i]-p[i-3]-4)<.01&&p[i+2]===p[i-1])assert.ok(Math.abs(p[i+1]-p[i-2])/4<.6);
});

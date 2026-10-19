import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadSurface,wheelContacts,bodyAttitude,updateWheel,TIRE_RADIUS,VEHICLE_SCALE} from '../src/contact.js';
import {createCircuit,terrainHeight,ROAD_WIDTH} from '../src/tracks.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('road contact interpolates rendered triangles and falls back to the infield',()=>{
 const surface=createRoadSurface([{x:0,z:0},{x:0,z:10}],[{x:0,z:1},{x:0,z:1}],[0,2],3);
 close(surface(2,2.5),.5);close(surface(-2,7.5),1.5);close(surface(4,5),-.25);
});
test('four wheel support follows slopes in any vehicle heading without burying tires',()=>{
 const heightAt=(x,z)=>.1*x+.22*z;
 for(const heading of [0,.7,1.8,3.4]){
  const contacts=wheelContacts({x:5,z:4,heading},heightAt),support=bodyAttitude(contacts);
  for(const w of contacts){
   assert.ok(w.ground>=heightAt(w.worldX,w.worldZ));
   const wheelBottom=support.ground+(w.ground-support.ground)+.025;
   assert.ok(wheelBottom>=heightAt(w.worldX,w.worldZ));
  }
  close(Math.tan(support.pitch),-.1*Math.sin(heading)-.22*Math.cos(heading));
  close(Math.tan(support.roll),.1*Math.cos(heading)-.22*Math.sin(heading));
 }
});
test('tire leading edge detects a sharp ramp before its axle reaches the ramp',()=>{
 const flat=wheelContacts({x:0,z:0,heading:0},()=>0);
 const ramp=wheelContacts({x:0,z:0,heading:0},(x,z)=>z< -1.5?.6:0);
 assert.ok(ramp[0].ground>flat[0].ground);
});
test('wheels roll one revolution per circumference, reverse and coast airborne',()=>{
 const radius=TIRE_RADIUS*VEHICLE_SCALE,wheel={x:-1,z:.91};
 const car={heading:0,vx:0,vz:-1,airborne:false};
 updateWheel(wheel,car,{worldX:0,worldZ:0},1);
 updateWheel(wheel,car,{worldX:0,worldZ:-2*Math.PI*radius},1);
 close(wheel.angularVelocity,-Math.PI*2);
 updateWheel(wheel,car,{worldX:0,worldZ:0},1);close(wheel.angularVelocity,Math.PI*2);
 car.airborne=true;updateWheel(wheel,car,{worldX:10,worldZ:10},.1);
 assert.ok(wheel.angularVelocity>0&&wheel.angularVelocity<Math.PI*2);
 car.airborne=false;updateWheel(wheel,car,{worldX:10,worldZ:10},.1);close(wheel.angularVelocity,0);
});
test('front wheels steer into a turn and the inside wheel steers farther',()=>{
 const left={x:-1,z:-.88},right={x:1,z:-.88},rear={x:-1,z:.91};
 const car={heading:0,vx:0,vz:-10,airborne:false};
 for(const w of [left,right,rear])updateWheel(w,car,{worldX:0,worldZ:0},.1);
 car.heading=.1;
 for(const w of [left,right,rear])updateWheel(w,car,{worldX:0,worldZ:-1},.1);
 assert.ok(left.steer>right.steer&&right.steer>0);close(rear.steer,0);
});
test('outside wheels travel farther than inside wheels through a turn',()=>{
 const car={x:0,z:0,heading:0,vx:0,vz:-10,airborne:false};
 const wheels=[{x:-1,z:.91},{x:1,z:.91}];
 let contacts=wheelContacts(car,()=>0);
 for(let i=0;i<2;i++)updateWheel(wheels[i],car,contacts[i*2+1],.1);
 car.heading=.1;car.x=-.05;car.z=-1;
 contacts=wheelContacts(car,()=>0);
 for(let i=0;i<2;i++)updateWheel(wheels[i],car,contacts[i*2+1],.1);
 assert.ok(Math.abs(wheels[1].angularVelocity)>Math.abs(wheels[0].angularVelocity));
});

import {createOffroadWheel} from '../src/wheel.js';
test('detailed tire and tread fit inside the terrain contact radius',()=>{
 const wheel=createOffroadWheel();let radius=0;
 for(const mesh of wheel.children){
  const positions=mesh.geometry.attributes.position;
  for(let i=0;i<positions.count;i++)radius=Math.max(radius,Math.hypot(positions.getY(i),positions.getZ(i)));
 }
 assert.ok(radius<=TIRE_RADIUS&&radius>TIRE_RADIUS-.01);
});

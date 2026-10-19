import test from 'node:test';
import assert from 'node:assert/strict';
import {carContact,resolveCarCollision,advanceCollisionRotation} from '../src/collision.js';
const car=(x,z,heading=0,vx=0,vz=0,height=0)=>({x,z,heading,vx,vz,height,speed:Math.hypot(vx,vz)});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const energy=c=>c.vx*c.vx+c.vz*c.vz+((3.48**2+5.04**2)/12)*(c.collisionYaw??0)**2;
test('longitudinal bumper contact is detected before vehicles overlap, parallel lanes stay clear',()=>{
 assert.ok(carContact(car(0,0),car(0,4.9)));
 assert.equal(carContact(car(0,0),car(3.5,0)),null);
 assert.ok(carContact(car(0,0),car(3.3,0)));
 assert.equal(carContact(car(0,0),car(0,5.2)),null);
});
test('head-on collision conserves momentum, loses energy and separates body outlines',()=>{
 const a=car(0,0,0,0,-20),b=car(0,-4.8,Math.PI,0,15),initial=energy(a)+energy(b);
 resolveCarCollision(a,b);
 close(a.vx+b.vx,0);close(a.vz+b.vz,-5);
 assert.ok(energy(a)+energy(b)<initial);
 assert.ok((carContact(a,b)?.depth??0)<.003);
 assert.ok(Math.abs(a.collisionYaw)<.01&&Math.abs(b.collisionYaw)<.01);
});
test('rear-end crash transfers momentum to the car in front',()=>{
 const a=car(0,0,0,0,-20),b=car(0,-4.8,0,0,-5);
 resolveCarCollision(a,b);
 assert.ok(b.vz< -5&&a.vz> -20);close(a.vz+b.vz,-25);
});
test('off-center impact generates angular response without adding energy',()=>{
 const a=car(0,0,0,0,-20),b=car(1.7,-4.5,Math.PI/8,0,0),initial=energy(a)+energy(b);
 assert.ok(resolveCarCollision(a,b));
 assert.ok(Math.abs(a.collisionYaw)+Math.abs(b.collisionYaw)>.1);
 assert.ok(energy(a)+energy(b)<=initial);
 const heading=a.heading,yaw=Math.abs(a.collisionYaw);advanceCollisionRotation(a,1/60);
 assert.notEqual(a.heading,heading);assert.ok(Math.abs(a.collisionYaw)<yaw);
});
test('trucks at different heights collide only when their bodies overlap vertically',()=>{
 assert.ok(carContact(car(0,0,0,0,0,0),car(0,4.8,0,0,0,1.2)));
 assert.equal(carContact(car(0,0),car(0,0,0,0,0,3)),null);
});
test('already separating contacts do not receive an extra bounce',()=>{
 const a=car(0,0,0,0,3),b=car(0,-4.8,0,0,-3);
 resolveCarCollision(a,b);close(a.vz,3);close(b.vz,-3);
});
test('repeated bumper impacts remain finite through a pack of trucks',()=>{
 const cars=[car(0,0,0,0,-20),car(.3,-4.5,0,0,-12),car(-.2,-8.8,0,0,-5)];
 for(let step=0;step<180;step++){
  for(const c of cars){advanceCollisionRotation(c,1/60);c.x+=c.vx/60;c.z+=c.vz/60;}
  for(let pass=0;pass<5;pass++)for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)resolveCarCollision(cars[i],cars[j]);
 }
 for(const c of cars)for(const value of [c.x,c.z,c.vx,c.vz,c.heading])assert.ok(Number.isFinite(value));
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok((carContact(cars[i],cars[j])?.depth??0)<.02);
});
import {containOnTrack} from '../src/race.js';
test('barrier clearance accounts for the nose when the truck faces across the road',()=>{
 const a=car(7,0,0,10,0),b=car(7,0,Math.PI/2,10,0);
 containOnTrack(a,{point:{x:0,z:0},distance:7,ground:0},7.75);
 containOnTrack(b,{point:{x:0,z:0},distance:7,ground:0},7.75);
 assert.ok(b.x<a.x);assert.ok(a.vx<=0&&b.vx<=0);
});

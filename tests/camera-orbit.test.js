import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraOrbit} from '../src/camera-orbit.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('default camera offset and O reset preserve the original angle and distance',()=>{
 const orbit=new CameraOrbit();close(orbit.offset().y,78);close(orbit.offset().z,70);
 orbit.step(new Set(['KeyI','KeyL','Equal']),1);assert.equal(orbit.manual,true);
 orbit.reset();close(orbit.offset().x,0);close(orbit.offset().y,78);close(orbit.offset().z,70);assert.equal(orbit.distance,1);assert.equal(orbit.manual,false);
});
test('zoom is limited to half the default distance, including keypad keys',()=>{
 const orbit=new CameraOrbit(),radius=Math.hypot(...Object.values(orbit.offset()));
 orbit.step(new Set(['NumpadAdd']),100);assert.equal(orbit.distance,.5);close(Math.hypot(...Object.values(orbit.offset())),radius/2);
 orbit.step(new Set(['NumpadSubtract']),100);assert.equal(orbit.distance,1);
});
test('orbit keeps a constant radius with safe elevation and independent opposite keys',()=>{
 const orbit=new CameraOrbit(),radius=Math.hypot(...Object.values(orbit.offset()));
 orbit.step(new Set(['KeyJ','KeyI']),100);close(Math.hypot(...Object.values(orbit.offset())),radius);close(orbit.pitch,80*Math.PI/180);
 orbit.step(new Set(['KeyK']),100);close(orbit.pitch,25*Math.PI/180);
 const before={...orbit};orbit.step(new Set(['KeyJ','KeyL','KeyI','KeyK','Equal','Minus']),1);close(orbit.yaw,before.yaw);close(orbit.pitch,before.pitch);close(orbit.distance,before.distance);
});
test('held camera controls are independent of render frame rate',()=>{
 const a=new CameraOrbit(),b=new CameraOrbit(),keys=new Set(['KeyL','KeyK','Equal']);
 for(let i=0;i<60;i++)a.step(keys,1/60);for(let i=0;i<120;i++)b.step(keys,1/120);
 close(a.yaw,b.yaw);close(a.pitch,b.pitch);close(a.distance,b.distance);
});

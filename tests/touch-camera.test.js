import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraOrbit} from '../src/camera-orbit.js';
import {bindTouchCamera} from '../src/touch-camera.js';
function setup(){
 const listeners={},captured=new Set(),orbit=new CameraOrbit();let enabled=true;
 const canvas={addEventListener:(name,handler)=>listeners[name]=handler,setPointerCapture:id=>captured.add(id),releasePointerCapture:id=>captured.delete(id),hasPointerCapture:id=>captured.has(id),getBoundingClientRect:()=>({width:400,height:800})};
 const controls=bindTouchCamera(canvas,{orbit,enabled:()=>enabled});
 return {orbit,captured,controls,disable:()=>enabled=false,fire:(name,id,x=100,y=100)=>listeners[name]({pointerId:id,clientX:x,clientY:y,preventDefault(){}})};
}
test('canvas drag orbits around the player and clamps elevation; cancelled pointers stop moving it',()=>{
 const t=setup(),initial=t.orbit.pitch;t.fire('pointerdown',1);t.fire('pointermove',1,150,160);
 assert.ok(t.orbit.yaw<0);assert.ok(t.orbit.pitch>initial);assert.equal(t.orbit.manual,true);assert.equal(t.orbit.distance,1);
 t.fire('pointermove',1,150,5000);assert.equal(t.orbit.pitch,80*Math.PI/180);
 t.fire('pointercancel',1);const before=t.orbit.yaw;t.fire('pointermove',1,300,300);assert.equal(t.orbit.yaw,before);assert.equal(t.captured.size,0);
});
test('two fingers pinch within half/default distance, then return to one-finger drag without a jump',()=>{
 const t=setup();t.fire('pointerdown',1,100,100);t.fire('pointerdown',2,200,100);
 t.fire('pointermove',2,400,100);assert.equal(t.orbit.distance,.5);assert.equal(t.orbit.yaw,0);
 t.fire('pointermove',2,130,100);assert.equal(t.orbit.distance,1);
 t.fire('pointerup',2);const pitch=t.orbit.pitch;t.fire('pointermove',1,110,100);
 assert.ok(t.orbit.yaw<0);assert.equal(t.orbit.pitch,pitch);t.controls.clear();assert.equal(t.captured.size,0);
});
test('disabled gestures reject new touches and release captures during menu or blur',()=>{
 const t=setup();t.fire('pointerdown',1);t.disable();t.fire('pointermove',1,200,300);
 assert.equal(t.orbit.manual,false);assert.equal(t.captured.size,0);t.fire('pointerdown',2);assert.equal(t.captured.size,0);
});

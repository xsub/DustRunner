import test from 'node:test';
import assert from 'node:assert/strict';
import {createMinimap} from '../src/minimap.js';

function fixture(run){
 const oldDocument=globalThis.document,oldPath=globalThis.Path2D,oldDensity=globalThis.devicePixelRatio;
 const calls={background:0,images:0,markers:0};
 const context=(background=false)=>new Proxy({}, {get:(_,key)=>()=>{if(key==='stroke'&&background)calls.background++;if(key==='drawImage')calls.images++;if(key==='translate')calls.markers++;},set:()=>true});
 const canvas={clientWidth:0,clientHeight:0,width:300,height:150,getContext:()=>context()};
 globalThis.document={createElement:()=>({getContext:()=>context(true)})};globalThis.Path2D=class{moveTo(){}lineTo(){}closePath(){}};globalThis.devicePixelRatio=1;
 try{run(canvas,calls);}finally{globalThis.document=oldDocument;globalThis.Path2D=oldPath;globalThis.devicePixelRatio=oldDensity;}
}
const track=[{x:-50,z:-20},{x:50,z:-20},{x:50,z:20},{x:-50,z:20}],cars=[{x:0,z:0,heading:0}];
test('minimap initializes when the hidden start HUD becomes visible without a window resize',()=>fixture((canvas,calls)=>{
 const map=createMinimap(canvas);map.setTrack(track,5);map.render(cars,'#fff');assert.equal(calls.images,0);
 canvas.clientWidth=186;canvas.clientHeight=105;map.render(cars,'#fff');
 assert.ok(calls.background>0);assert.equal(calls.images,1);assert.equal(calls.markers,1);assert.equal(canvas.width,186);
 const drawn=calls.background;map.render(cars,'#fff');assert.equal(calls.background,drawn);
}));
test('minimap refreshes for responsive layout, pixel density and track changes while hidden',()=>fixture((canvas,calls)=>{
 const map=createMinimap(canvas);canvas.clientWidth=186;canvas.clientHeight=105;map.setTrack(track,5);map.render(cars,'#fff');
 canvas.clientWidth=120;canvas.clientHeight=78;globalThis.devicePixelRatio=2;map.render(cars,'#fff');assert.equal(canvas.width,240);assert.equal(canvas.height,156);
 canvas.clientWidth=canvas.clientHeight=0;map.setTrack(track.map(p=>({x:p.x*2,z:p.z*2})),7);const drawn=calls.background;
 canvas.clientWidth=186;canvas.clientHeight=105;map.render(cars,'#fff');assert.ok(calls.background>drawn);assert.equal(canvas.width,372);
}));
test('desert minimap also builds after its hidden HUD is revealed',()=>fixture((canvas,calls)=>{
 const map=createMinimap(canvas);map.setDesert({bounds:{min:{x:0,z:0},max:{x:20,z:20}},heightAt:()=>1});
 canvas.clientWidth=186;canvas.clientHeight=105;map.render(cars,'#fff');assert.equal(calls.images,1);assert.equal(calls.markers,1);
}));

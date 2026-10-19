import {test} from 'node:test';
import assert from 'node:assert/strict';
import {followCameraStep,minimapTransform} from '../src/view.js';
import {createCircuit,ROAD_WIDTH} from '../src/tracks.js';
const viewport={width:1280,height:720};
const player={x:0,z:0,vx:23,vz:0,speed:23,airborne:false,bend:0};

test('camera reset snaps to the player with bounded forward visibility',()=>{
 const state=followCameraStep({x:-300,z:200,span:90},player,viewport,0,true);
 assert.ok(state.x>player.x&&state.x-player.x<=9);
 assert.equal(state.z,player.z);assert.ok(state.span<30);
});
test('follow smoothing is consistent across frame rates',()=>{
 const results=[];
 for(const hz of [60,120]){
   let state=followCameraStep({x:0,z:0,span:20},player,viewport,0,true);
   for(let i=1;i<=hz*4;i++)state=followCameraStep(state,{...player,x:23*i/hz},viewport,1/hz);
   results.push(state);
 }
 assert.ok(Math.abs(results[0].x-results[1].x)<.2);
 assert.ok(Math.abs(results[0].span-results[1].span)<1e-8);
});
test('player remains visible through sweeping turns on portrait and landscape screens',()=>{
 for(const view of [viewport,{width:390,height:844},{width:844,height:390}]){
   let state;
   for(let frame=0;frame<600;frame++){
     const t=frame/60,p={...player,x:30*Math.cos(t),z:20*Math.sin(t),vx:-30*Math.sin(t),vz:20*Math.cos(t)};
     state=followCameraStep(state??{x:p.x,z:p.z,span:20},p,view,1/60,frame===0);
     assert.ok(Math.abs((p.x-state.x)/(state.span*view.width/view.height))<.8);
     assert.ok(Math.abs((p.z-state.z)*.744/state.span)<.8);
   }
 }
});
test('jumps do not move the camera vertically and wider views ease in smoothly',()=>{
 const state=followCameraStep({x:0,z:0,span:20},player,viewport,0,true);
 const flat=followCameraStep(state,player,viewport,1/60);
 const hill=followCameraStep(state,{...player,height:8,vertical:20},viewport,1/60);
 assert.deepEqual(flat,hill);
 const jump=followCameraStep(state,{...player,airborne:true,bend:1},viewport,1/60);
 assert.ok(jump.span>flat.span&&jump.span-flat.span<.3);
});
for(const track of [0,1])test(`minimap fits the full road and racers on track ${track+1}`,()=>{
 const curve=createCircuit(track),points=Array.from({length:900},(_,i)=>curve.getPointAt(i/900));
 for(const [width,height]of [[166,105],[117,78]]){
   const map=minimapTransform(points,ROAD_WIDTH,width,height);
   for(const p of points)for(const edge of [-ROAD_WIDTH,ROAD_WIDTH]){
     const x=(p.x+edge)*map.scale+map.offsetX,z=(p.z+edge)*map.scale+map.offsetZ;
     assert.ok(x>0&&x<width&&z>0&&z<height);
   }
 }
});

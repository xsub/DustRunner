import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {initPhysics,createPhysics} from '../src/physics.js';
import {triangleSampler} from '../src/terrain.js';
import {markerView} from '../src/pov-view.js';
before(async()=>await initPhysics());
const dt=1/120;
function fixture(extent=120){
 const vertices=[],indices=[],n=41,size=extent*2;
 for(let z=0;z<n;z++)for(let x=0;x<n;x++)vertices.push(x/(n-1)*size-size/2,0,z/(n-1)*size-size/2);
 for(let z=0;z<n-1;z++)for(let x=0;x<n-1;x++){const a=z*n+x;indices.push(a,a+n,a+1,a+1,a+n,a+n+1);}
 const terrain={positions:new Float32Array(vertices),indices:new Uint32Array(indices)};terrain.heightAt=triangleSampler(terrain.positions,terrain.indices);
 const physics=createPhysics(terrain,{min:{x:-extent,z:-extent},max:{x:extent,z:extent}}),car={x:0,z:0,heading:0,speed:0,style:'classic',engineId:'302'};physics.reset(car);
 return {physics,car};
}
// What the driver sees from the seat: the road ahead, but not the ground under the bumper
// (the hood hides everything nearer than about four meters) and nothing beside the cab.
const windshield=car=>position=>car.z-position.z>4.5&&Math.abs(position.x-car.x)<(car.z-position.z);

// Drive straight at a wall of cones and report how far the cones were pushed and the truck's speed.
function drive(visibility){
 const f=fixture(),cones=[];
 for(let row=0;row<3;row++)for(let i=0;i<11;i++)cones.push({body:f.physics.addBarrier((i-5)*.55,.01,-34-row*.9,{kind:'cone'}),z:-34-row*.9});
 // More markers down the road, so the ten percent budget has something to work with.
 for(let i=0;i<40;i++)f.physics.addBarrier((i%2?1:-1)*7,.01,-40-i*2,{kind:'cone'});
 let shift=0,moving=0;
 try{
  for(let frame=0;frame<120*5;frame++){
   f.physics.setMarkerVisibility(visibility(f.car));
   f.physics.input(f.car,{throttle:1,steer:0,onDirt:true},dt);f.physics.step();f.physics.sync(f.car,dt);
   moving=Math.max(moving,f.physics.getStats().movingMarkers);
  }
  for(const cone of cones)shift=Math.max(shift,Math.abs(cone.body.translation().z-cone.z));
  return {shift,moving,z:f.car.z,speed:f.car.speed};
 }finally{f.physics.dispose();}
}

test('cones are solid from the driver\'s seat, not only where the windshield shows the ground',()=>{
 const board=drive(()=>()=>true),seatOnly=drive(windshield),seat=drive(car=>markerView(car,windshield(car)));
 assert.ok(board.z<-45,'the truck reaches and passes the cones: z='+board.z.toFixed(1));
 assert.ok(board.shift>.5&&board.moving>0,'reference: on the board the cones are hit');
 // The defect: a pure view test switches every cone off before the bumper arrives.
 assert.ok(seatOnly.shift<.05&&seatOnly.moving===0,'a view-only test lets the truck drive through them');
 assert.ok(seat.shift>.5&&seat.moving>0,'with the truck\'s surroundings always seen they are hit: '+seat.shift.toFixed(2)+' m');
 assert.ok(Math.abs(seat.speed-board.speed)<Math.abs(seatOnly.speed-board.speed)+.5,'and they slow the truck as on the board');
});

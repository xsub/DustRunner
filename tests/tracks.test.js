import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TRACKS,ROAD_WIDTH,createCircuit,terrainHeight,nearestPoint,opponentInput} from '../src/tracks.js';
import {arcadeMotion,updateSuspension,containOnTrack,advanceProgress} from '../src/race.js';

for(let track=0;track<TRACKS.length;track++){
 test(`${TRACKS[track].name}: tight corners leave room for the inside road edge`,()=>{
   const curve=createCircuit(track),n=900;
   for(let i=0;i<n;i++){
     const a=curve.getPointAt(i/n),b=curve.getPointAt(((i+1)%n)/n),c=curve.getPointAt(((i+2)%n)/n);
     const ab=b.clone().sub(a),bc=c.clone().sub(b),ac=c.clone().sub(a);
     const cross=Math.abs(ab.x*bc.z-ab.z*bc.x);
     if(cross>1e-8)assert.ok(ab.length()*bc.length()*ac.length()/(2*cross)>ROAD_WIDTH+.3);
   }
 });
 test(`${TRACKS[track].name}: terrain is continuous, bounded and wraps at the line`,()=>{
   let previous=terrainHeight(0,track);
   for(let i=1;i<=20000;i++){
     const height=terrainHeight(i/20000,track);
     assert.ok(Number.isFinite(height)&&height>=0&&height<=3);
     assert.ok(Math.abs(height-previous)<.06);
     previous=height;
   }
   assert.equal(terrainHeight(0,track),terrainHeight(1,track));
   assert.equal(TRACKS[track].features.filter(f=>f.kind==='jump').length,4);
 });
 test(`${TRACKS[track].name}: race-speed trucks take off and settle after ramps`,()=>{
   const curve=createCircuit(track),length=curve.getLength();
   const c={height:0,vertical:0,speed:23};let airtime=0,landings=0;
   for(let t=0;t<length/23+2;t+=1/120){
     const progress=Math.min(t*23/length,1);
     const contact=updateSuspension(c,terrainHeight(progress,track),1/120);
     if(contact.airborne)airtime+=1/120;
     if(contact.landed)landings++;
     assert.ok(c.height>=0&&c.height<8);
   }
   assert.ok(airtime>1,`airtime ${airtime}`);
   assert.ok(landings>=4,`landings ${landings}`);
   assert.equal(c.airborne,false);
   assert.ok(Math.abs(c.suspension)<.01);
 });
 test(`${TRACKS[track].name}: AI completes two laps through corners and jumps`,()=>{
   const n=900,curve=createCircuit(track),samples=Array.from({length:n},(_,i)=>curve.getPointAt(i/n));
   const p=samples[0],t=curve.getTangentAt(0);
   const c={x:p.x,z:p.z,heading:Math.atan2(-t.x,-t.z),speed:0,vx:0,vz:0,height:0,vertical:0,nitro:100,index:0,checkpoint:0,lap:0};
   let airborneFrames=0;
   for(let frame=0;frame<60*90&&c.lap<2;frame++){
     const near=nearestPoint(samples,c.x,c.z),input=opponentInput(c,near,curve,samples);
     input.boost=input.boost&&!c.airborne;
     c.nitro=Math.max(0,Math.min(100,c.nitro+(input.boost?-32:7)/60));
     arcadeMotion(c,{...input,ai:true,onDirt:true,opponent:1},1/60);
     const edge=nearestPoint(samples,c.x,c.z);
     containOnTrack(c,{...edge,ground:terrainHeight(edge.index/n,track)},ROAD_WIDTH);
     const next=nearestPoint(samples,c.x,c.z).index;
     Object.assign(c,advanceProgress(c.index,next,c.checkpoint,c.lap,n));c.index=next;
     updateSuspension(c,nearestPoint(samples,c.x,c.z).distance<=ROAD_WIDTH?terrainHeight(next/n,track):0,1/60);
     if(c.airborne)airborneFrames++;
   }
   assert.equal(c.lap,2,`AI stalled at index ${c.index}, checkpoint ${c.checkpoint}, lap ${c.lap}`);
   assert.ok(airborneFrames>0);
 });
}

test('slow trucks follow the ramp and flat-ground trucks do not hop',()=>{
 const c={height:0,vertical:0,speed:4};
 for(let i=0;i<1200;i++){updateSuspension(c,terrainHeight(i/1200,0),1/60);assert.equal(c.airborne,false);}
 const flat={height:2,vertical:0,lastGround:2,speed:23};
 for(let i=0;i<120;i++)updateSuspension(flat,2,1/60);
 assert.equal(flat.airborne,false);assert.equal(flat.height,2);
});

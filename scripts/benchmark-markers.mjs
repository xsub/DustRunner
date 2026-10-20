import {performance} from 'node:perf_hooks';
import {Group} from 'three';
import {TRACKS,createCircuit,ROAD_WIDTH,nearestPoint,opponentInput} from '../src/tracks.js';
import {buildTerrain} from '../src/terrain.js';
import {initPhysics,createPhysics} from '../src/physics.js';
import {createScenery} from '../src/scenery.js';
await initPhysics();
const index=8,n=3600,curve=createCircuit(index),samples=Array.from({length:n},(_,i)=>curve.getPointAt(i/n)),terrain=buildTerrain(samples,curve,index);
const xs=samples.map(p=>p.x),zs=samples.map(p=>p.z),bounds={min:{x:Math.min(...xs),z:Math.min(...zs)},max:{x:Math.max(...xs),z:Math.max(...zs)}};
const physics=createPhysics(terrain,bounds),nearest=(x,z)=>nearestPoint(samples,x,z);let seed=50;
const scenery=createScenery({world:new Group(),samples,curve,roadWidth:ROAD_WIDTH,heightAt:terrain.heightAt,nearest,bounds,random:()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;},addBarrier:(...args)=>physics.addBarrier(...args)});
const cars=['classic','ranger','sunset','expedition'].map((style,i)=>{
 const j=n-20-(i>1?25:0),p=samples[j],t=curve.getTangentAt(j/n),lane=i%2?3.5:-3.5;
 const car={style,engineId:'302',x:p.x-t.z*lane,z:p.z+t.x*lane,heading:Math.atan2(-t.x,-t.z),speed:0,lane,nitro:100};physics.reset(car);return car;
});
const timings=[];let maxAwake=0,maxMoving=null;
for(let frame=0;frame<3600;frame++){
 const start=performance.now(),player=cars[0];physics.setMarkerVisibility?.(p=>Math.abs(p.x-player.x)<80&&Math.abs(p.z-player.z)<65);
 for(const car of cars){const near=nearest(car.x,car.z);physics.input(car,{...opponentInput(car,near,curve,samples),boost:false,onDirt:near.distance<ROAD_WIDTH,ai:true},1/120);}
 physics.step();cars.forEach(car=>physics.sync(car,1/120));scenery.update(1/120);timings.push(performance.now()-start);
 if(frame%60===0){const s=physics.getStats();maxAwake=Math.max(maxAwake,s.awake);if(s.movingMarkers!==undefined)maxMoving=Math.max(maxMoving??0,s.movingMarkers);}
}
const sorted=timings.slice(240).sort((a,b)=>a-b),mean=sorted.reduce((a,b)=>a+b,0)/sorted.length;
console.log(JSON.stringify({track:TRACKS[index].name,steps:timings.length,simulationSeconds:30,meanStepMs:+mean.toFixed(3),p95StepMs:+sorted[Math.ceil(sorted.length*.95)-1].toFixed(3),maxAwake,maxMoving,bodies:physics.getStats().bodies},null,2));physics.dispose();

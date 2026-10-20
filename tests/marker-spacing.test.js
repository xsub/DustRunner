import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createCircuit,nearestPoint,ROAD_WIDTH} from '../src/tracks.js';
import {createScenery,MARKER_SPACING} from '../src/scenery.js';
test('Ravine Rush markers use eight-meter spacing and about a quarter of previous placements',()=>{
 const curve=createCircuit(8),samples=Array.from({length:3600},(_,i)=>curve.getPointAt(i/3600)),placements=[];let seed=50;
 const xs=samples.map(p=>p.x),zs=samples.map(p=>p.z),world=new Group();
 createScenery({world,samples,curve,roadWidth:ROAD_WIDTH,heightAt:()=>0,nearest:(x,z)=>nearestPoint(samples,x,z),bounds:{min:{x:Math.min(...xs),z:Math.min(...zs)},max:{x:Math.max(...xs),z:Math.max(...zs)}},random:()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;},addBarrier:(x,y,z)=>{placements.push({x,z});}});
 assert.equal(MARKER_SPACING,8);assert.ok(placements.length>400&&placements.length<600);
 for(let i=1;i<placements.length;i++)assert.ok(Math.hypot(placements[i].x-placements[i-1].x,placements[i].z-placements[i-1].z)>=MARKER_SPACING-.001);
 const geometries=new Set(),materials=new Set();world.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
});

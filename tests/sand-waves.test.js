import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {sandWaveHeight} from '../src/sand-waves.js';
import {setTuning,DEFAULT_TUNING,tuningDocument,parseTuning} from '../src/tuning.js';
import {buildRaceDesert,createSandMaterial} from '../src/desert-scenery.js';
import {createCircuit,ROAD_WIDTH,SHOULDER_WIDTH} from '../src/tracks.js';
import {Box3} from 'three';
import {buildDesert,createDesertHeight,DESERT_SPAWN} from '../src/desert.js';
afterEach(()=>setTuning(DEFAULT_TUNING));
test('Ruffles defaults off and configurable spacing/crest height use world meters',()=>{
 assert.equal(sandWaveHeight(12,9),0);
 for(const size of [16,32,120]){
  const options={sandRuffles:1,sandWaveSize:size,sandWaveHeight:2};
  assert.ok(Math.abs(sandWaveHeight(size/4/.77,0,options)-2)<1e-9);
  assert.ok(Math.abs(sandWaveHeight(size*3/4/.77,0,options))<1e-9);
  assert.ok(Math.abs(sandWaveHeight(7,11,options)-sandWaveHeight(7+size/.77,11,options))<1e-9);
 }
 const settings={...DEFAULT_TUNING,sandRuffles:1,sandWaveSize:48,sandWaveHeight:1.75};assert.deepEqual(parseTuning(JSON.stringify(tuningDocument(settings))).parameters,settings);
});
test('enabled waves alter actual collision vertices, preserve racing shoulders, and can be switched back off',()=>{
 const curve=createCircuit(0),samples=Array.from({length:600},(_,i)=>curve.getPointAt(i/600)),bounds=new Box3().setFromPoints(samples),clearance=ROAD_WIDTH+SHOULDER_WIDTH;
 const original=buildRaceDesert(samples,bounds,clearance);
 setTuning({sandRuffles:1,sandWaveSize:24,sandWaveHeight:2});const waves=buildRaceDesert(samples,bounds,clearance);let changed=0;
 for(let i=0;i<waves.positions.length;i+=3){const [x,y,z]=waves.positions.slice(i,i+3);assert.ok(y>=original.positions[i+1]-1e-5);if(Math.abs(original.positions[i+1]+.25)<1e-5)assert.ok(Math.abs(y+.25)<1e-5);if(y>original.positions[i+1]+.1)changed++;if(i%303===0)assert.ok(Math.abs(y-waves.heightAt(x,z))<1e-5);}
 assert.ok(changed>100);
 setTuning(DEFAULT_TUNING);assert.deepEqual(buildRaceDesert(samples,bounds,clearance).positions,original.positions);
});
test('rebuilding with changed options updates the shared sand shader uniforms',()=>{
 const material=createSandMaterial();let shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};material.onBeforeCompile(shader);
 assert.equal(shader.uniforms.sandRuffles.value,0);setTuning({sandRuffles:1,sandWaveSize:64});material.userData.updateWaves();assert.equal(shader.uniforms.sandRuffles.value,1);assert.equal(shader.uniforms.sandWaveSize.value,64);material.dispose();
});

test('Free Ride waves reach the collision mesh while preserving its flat recovery spawn',()=>{
 setTuning({sandRuffles:1,sandWaveSize:16,sandWaveHeight:3});
 const ground=buildDesert({variant:'ridges',seed:1947}),base=createDesertHeight({variant:'ridges',seed:1947});let changed=0;
 for(let i=0;i<ground.positions.length;i+=303){const x=ground.positions[i],y=ground.positions[i+1],z=ground.positions[i+2];if(y>base(x,z)+.1)changed++;assert.ok(Math.abs(y-ground.heightAt(x,z))<1e-4);}
 assert.ok(changed>100);assert.equal(ground.heightAt(DESERT_SPAWN.x,DESERT_SPAWN.z),1);
});

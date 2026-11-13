import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHorizon} from '../src/horizon.js';
import {createSandDrift,DRIFT_BOX} from '../src/sand-drift.js';
import {createSandMaterial,createDesertWind} from '../src/desert-scenery.js';
import {timePreset,TIME_PRESETS} from '../src/time-of-day.js';

// These shaders cannot run in node, so the tests pin the lines each visual fix depends on
// and the values the JavaScript side hands to them.

test('sky: clouds take the preset colour and light, and the haze band is the fog colour after tone mapping',()=>{
 const scene=new THREE.Scene(),horizon=createHorizon(scene),dome=horizon.group.children.find(child=>child.material?.isShaderMaterial),{uniforms,fragmentShader}=dome.material;
 assert.equal(horizon.group.visible,false,'hidden until a driver view asks for it');
 horizon.setTime(timePreset('night'));
 assert.deepEqual(uniforms.cloud.value.toArray(),new THREE.Color(timePreset('night').cloud).toArray());assert.equal(uniforms.cloudLight.value,timePreset('night').cloudLight);assert.equal(uniforms.stars.value,1);
 horizon.setTime(timePreset('day'));
 assert.deepEqual(uniforms.cloud.value.toArray(),[1,1,1]);assert.equal(uniforms.cloudLight.value,1);assert.equal(uniforms.stars.value,0);
 for(const preset of TIME_PRESETS){horizon.setTime(preset);assert.ok(Math.abs(uniforms.sunDir.value.length()-1)<1e-9);assert.ok(uniforms.sunDir.value.y>0);assert.deepEqual(uniforms.zenith.value.toArray(),new THREE.Color(preset.zenith).toArray());}
 assert.match(fragmentShader,/vec3 lit=mix\(horizon,cloud,\.5\)[^;]*\*cloudLight;/,'cloud body and sun rim follow the preset');
 // three.js applies fog to meshes after tone mapping and colour conversion; the sky must do the same.
 assert.equal(dome.material.fog,true);for(const name of ['fogColor','fogDensity','fogNear','fogFar'])assert.ok(uniforms[name],name+' uniform for three.js to fill');
 assert.match(fragmentShader,/#include <tonemapping_fragment>\s*#include <colorspace_fragment>\s*gl_FragColor\.rgb=mix\(fogColor,gl_FragColor\.rgb,smoothstep\(-\.012,\.085,h\)\);/);
 assert.doesNotMatch(fragmentShader,/uniform vec3 haze|mix\(haze/,'no second, tone-mapped haze colour');
 // Drawn after the opaque world at the far plane, without writing depth, so covered pixels are skipped.
 assert.ok(dome.renderOrder>0);assert.equal(dome.material.depthWrite,false);assert.match(dome.material.vertexShader,/gl_Position=p\.xyww;/);
 const before=uniforms.time.value;horizon.update(.5);assert.equal(uniforms.time.value,before+.5);
});

test('sand: the board view keeps the original grain and slope light; detail belongs to the driver views',()=>{
 const material=createSandMaterial(),shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};
 material.onBeforeCompile(shader);
 assert.equal(shader.uniforms.sandDetail,material.userData.sandDetail);assert.equal(shader.uniforms.sandSun,material.userData.sandSun);
 assert.equal(material.userData.sandDetail.value,0,'off until a driver view switches it on');assert.deepEqual(material.userData.sandSun.value.toArray(),[-.8,.55]);
 // With sandDetail 0 this is mix(.5, hash, 1.0), which is exactly the original hash term.
 assert.match(shader.fragmentShader,/float grain=mix\(\.5,sandHash\(floor\(p\*38\.0\)\),1\.0-sandDetail\*smoothstep\(\.07,\.3,footprint\)\);/);
 assert.match(shader.fragmentShader,/float ripple=sandDetail\*/,'ripples only from the driver views');
 assert.match(shader.fragmentShader,/float slopeLight=clamp\(dot\(duneNormal\.xz,sandSun\),-\.22,\.22\);/);
 assert.match(shader.fragmentShader,/uniform vec2 sandSun; uniform float sandDetail;/);
});

test('wind gusts are tinted in the shader; drifting grains stay densest at the ground',()=>{
 const world=new THREE.Group();createDesertWind({world,heightAt:()=>0,anchors:[],random:Math.random});
 const gust=world.children.find(child=>child.isPoints);
 assert.match(gust.material.fragmentShader,/uniform vec3 tint;.*vec3\(\.72,\.57,\.32\)\*tint/);

 const scene=new THREE.Scene(),drift=createSandDrift(scene,200),{uniforms,vertexShader}=drift.points.material;
 assert.equal(drift.points.visible,false);assert.equal(drift.points.geometry.attributes.position.count,200);
 // Heights are uniform in the buffer; the shader squares the wrapped level, so half the grains sit in the lowest quarter.
 assert.match(vertexShader,/float level=fract\(\(position\.y\+drift\.y\)\/box\.y\);\s*p\.y=box\.y\*level\*level\+ground-cameraPosition\.y\+\.15;/);
 const heights=Array.from({length:200},(_,i)=>drift.points.geometry.attributes.position.getY(i));
 assert.ok(Math.min(...heights)>=0&&Math.max(...heights)<=DRIFT_BOX.y);assert.ok(Math.abs(heights.reduce((a,b)=>a+b)/200-DRIFT_BOX.y/2)<.6,'uniform in the buffer');
 drift.update(1,{pixels:700,floor:5});assert.equal(uniforms.pixels.value,700);assert.equal(uniforms.ground.value,5);
 assert.ok(uniforms.drift.value.x>0&&uniforms.drift.value.z>0,'the wind carries them');assert.ok(Math.abs(uniforms.drift.value.y-(DRIFT_BOX.y-.12))<1e-9,'and they sink slowly');
 for(let i=0;i<5000;i++)drift.update(.1);for(const axis of ['x','y','z'])assert.ok(uniforms.drift.value[axis]>=0&&uniforms.drift.value[axis]<DRIFT_BOX[axis],'offsets stay wrapped');
 drift.setTint('#8f9bb5',.5);assert.deepEqual(uniforms.tint.value.toArray(),new THREE.Color('#8f9bb5').toArray());assert.equal(uniforms.opacity.value,.15);
});

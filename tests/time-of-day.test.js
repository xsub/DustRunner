import test from 'node:test';
import assert from 'node:assert/strict';
import {Color} from 'three';
import {TIME_PRESETS,DEFAULT_TIME,timePreset,nextTime,sunDirection,shadowDirection,shadowSetup,sandSlopeLight,SHADOW_MIN_ELEVATION,SHADOW_MAP} from '../src/time-of-day.js';

const luminance=hex=>{const c=new Color(hex);return .2126*c.r+.7152*c.g+.0722*c.b;};

test('midday reproduces the original board lighting exactly',()=>{
 const day=timePreset('day'),d=sunDirection(day),length=Math.hypot(30,55,20),shadow=shadowSetup(day);
 assert.ok(Math.abs(d.x*length+30)<1e-9&&Math.abs(d.y*length-55)<1e-9&&Math.abs(d.z*length-20)<1e-9);
 assert.equal(day.sun,'#fff0cb');assert.equal(day.sunPower,3.2);assert.equal(day.skyLight,'#fff4d6');assert.equal(day.groundLight,'#69653e');assert.equal(day.ambient,2.6);
 assert.equal(day.ground,'#a99a70');assert.equal(day.exposure,1.15);
 assert.ok(Math.abs(shadow.reach-length)<1e-9);assert.equal(shadow.far,180);assert.equal(shadow.normalBias,.04);
 // The original sand shader used the constant vector (−0.8, 0.55), which is not exactly the sun's direction.
 assert.deepEqual(sandSlopeLight(day),{x:-.8,z:.55});
 assert.deepEqual(new Color(day.dust).toArray(),[1,1,1],'dust, exhaust and ruts keep their original colours');
 assert.deepEqual(new Color(day.cloud).toArray(),[1,1,1]);assert.equal(day.cloudLight,1);assert.equal(Boolean(day.headlights),false);
});

test('every preset is complete, cycles both ways and keeps the sun above the horizon',()=>{
 assert.equal(timePreset('unknown').id,DEFAULT_TIME);assert.equal(timePreset(undefined).id,DEFAULT_TIME);
 let id=DEFAULT_TIME;const seen=new Set();for(let i=0;i<TIME_PRESETS.length;i++){seen.add(id);id=nextTime(id);}
 assert.equal(seen.size,TIME_PRESETS.length);assert.equal(id,DEFAULT_TIME);
 for(const preset of TIME_PRESETS){
  assert.equal(nextTime(nextTime(preset.id),-1),preset.id,'backwards undoes forwards');
  for(const key of ['sun','skyLight','groundLight','zenith','horizon','haze','ground','cloud','dust'])assert.match(preset[key],/^#[0-9a-f]{6}$/,preset.id+'.'+key);
  for(const key of ['sunPower','ambient','exposure','clouds','stars','range','cloudLight'])assert.ok(Number.isFinite(preset[key])&&preset[key]>=0,preset.id+'.'+key);
  const sun=sunDirection(preset),shadow=shadowDirection(preset);
  assert.ok(Math.abs(Math.hypot(sun.x,sun.y,sun.z)-1)<1e-9);assert.ok(sun.y>0,preset.id+' sun is above the horizon');
  assert.ok(shadow.y>=Math.sin(SHADOW_MIN_ELEVATION*Math.PI/180)-1e-9,preset.id+' shadow light keeps a usable height');
 }
 assert.equal(TIME_PRESETS.filter(p=>p.headlights).map(p=>p.id).join(),'night');
});

test('unlit dust and clouds dim with the light instead of glowing at dusk and at night',()=>{
 const dust=Object.fromEntries(TIME_PRESETS.map(p=>[p.id,luminance(p.dust)]));
 assert.ok(dust.day>dust.morning&&dust.morning>dust.golden&&dust.golden>dust.dusk&&dust.dusk>dust.night);
 assert.ok(dust.night<.2,'night dust is a small fraction of daylight dust');assert.ok(dust.golden<.6);
 const night=timePreset('night');
 assert.ok(luminance(night.cloud)<.05,'night clouds have a dark body');assert.ok(night.cloudLight<=.3,'the moon only faintly rims them');
});

test('low suns move the shadow light back and widen the bias past the soft-shadow kernel',()=>{
 const texel=SHADOW_MAP.extent/SHADOW_MAP.size;
 for(const preset of TIME_PRESETS){
  const setup=shadowSetup(preset),elevation=Math.asin(shadowDirection(preset).y);
  if(preset.elevation>40){assert.equal(setup.normalBias,.04,preset.id);assert.equal(setup.far,180,preset.id);continue;}
  assert.equal(setup.reach,120,preset.id);assert.equal(setup.far,234,preset.id);
  // The kernel reaches two texels; seen along the light a normal offset shrinks by cos(elevation).
  assert.ok(setup.normalBias/(texel*Math.cos(elevation))>=2,preset.id+' bias covers the kernel');assert.ok(setup.normalBias<.13,preset.id+' bias stays small enough not to detach shadows');
 }
});

test('sand slope light follows the sun and is weaker under a weak light',()=>{
 for(const preset of TIME_PRESETS.filter(p=>p.id!=='day')){
  const slope=sandSlopeLight(preset),sun=sunDirection(preset),cross=slope.x*sun.z-slope.z*sun.x;
  assert.ok(Math.abs(cross)<1e-9,preset.id+' points toward the sun');assert.ok(slope.x*sun.x+slope.z*sun.z>0,preset.id);
  assert.ok(Math.hypot(slope.x,slope.z)<=1.07,preset.id);
 }
 assert.ok(Math.hypot(sandSlopeLight(timePreset('night')).x,sandSlopeLight(timePreset('night')).z)<.3,'moonlight barely models the dunes');
});

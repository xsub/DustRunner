import test from 'node:test';
import assert from 'node:assert/strict';
import {VIEW_MODES,DEFAULT_VIEW,normalizeView,nextView,isPerspective,eyePoint,HeadLook,LOOK_LIMITS,povFov,headSpringStep,horizonStabilization,chaseStep,showcaseOrbit,viewWedge} from '../src/pov-view.js';
import {TIME_PRESETS,DEFAULT_TIME,timePreset,nextTime,sunDirection,shadowDirection} from '../src/time-of-day.js';
import {farGridAxis,farLandHeight} from '../src/horizon.js';
import {BRONCO_STYLES} from '../src/vehicle.js';
import {vehicleProfile} from '../src/vehicle-models.js';

test('views cycle through cockpit, hood, chase and the classic board',()=>{
 assert.equal(DEFAULT_VIEW,'cockpit');assert.equal(normalizeView('nonsense'),'cockpit');assert.equal(normalizeView('board'),'board');
 let view=DEFAULT_VIEW;const seen=[];for(let i=0;i<VIEW_MODES.length;i++){seen.push(view);view=nextView(view);}
 assert.deepEqual(seen,VIEW_MODES);assert.equal(view,DEFAULT_VIEW);assert.equal(nextView('cockpit',-1),'board');
 assert.ok(isPerspective('cockpit')&&isPerspective('chase')&&!isPerspective('board'));
});

test('the seated eye stays under every roof, behind the windshield and on the driver side',()=>{
 for(const style of Object.keys(BRONCO_STYLES)){
  const later=BRONCO_STYLES[style].lights==='square',roofY=style==='sunset'?2.29:later?2.33:2.36,wheelbase=vehicleProfile(style).wheelbase;
  const eye=eyePoint('cockpit',{roofY,wheelbase});
  assert.ok(eye.x<0,style+' is left-hand drive');assert.ok(eye.y<roofY-.2&&eye.y>1.9,style+' eye height');
  assert.ok(eye.z>-.35*wheelbase&&eye.z<.28*wheelbase,style+' eye sits between windshield and seat back');
  const hood=eyePoint('hood',{roofY,wheelbase});assert.equal(hood.x,0);assert.ok(hood.z<-.5&&hood.y>1.9,style+' bonnet camera is ahead of the glass and above the hood');
 }
});

test('head look clamps, holds a glance briefly and then returns to the road',()=>{
 const look=new HeadLook(),keys=new Set(['KeyJ']);
 for(let i=0;i<600;i++)look.step(keys,1/60);
 assert.equal(look.yaw,LOOK_LIMITS.yaw);assert.equal(look.pitch,0);
 keys.clear();for(let i=0;i<180;i++)look.step(keys,1/60);
 assert.ok(Math.abs(look.yaw)<.001,'recentered after release');
 look.adjust(-.6,-5);assert.equal(look.pitch,-LOOK_LIMITS.down);
 look.step(keys,.5);assert.ok(look.yaw<-.59,'a drag keeps its angle for a moment');
 for(let i=0;i<240;i++)look.step(keys,1/60);assert.ok(Math.abs(look.yaw)<.001&&Math.abs(look.pitch)<.001);
 look.adjust(0,0,.01);assert.equal(look.zoom,LOOK_LIMITS.zoomIn);look.adjust(0,0,100);assert.equal(look.zoom,LOOK_LIMITS.zoomOut);
});

test('field of view widens with speed and stays usable on phones',()=>{
 const wide=povFov(16/9,0),fast=povFov(16/9,40),portrait=povFov(9/19.5,0);
 assert.ok(wide>55&&wide<70);assert.ok(fast>wide&&fast-wide<=7.01);assert.ok(portrait<=84&&portrait>wide);
 assert.ok(povFov(16/9,0,.62)<wide);
});

test('the head spring lags acceleration, stays bounded and settles',()=>{
 let head={};for(let i=0;i<120;i++)head=headSpringStep(head,{x:0,y:0,z:-12},1/60);
 assert.ok(head.z>.02&&head.z<=.05,'thrown back under hard acceleration');assert.ok(Math.abs(head.x)<1e-6);
 head=headSpringStep(head,{x:0,y:-4000,z:0},1/60);assert.ok(Math.abs(head.y)<=.075+1e-9,'landing spike is clamped');
 for(let i=0;i<240;i++)head=headSpringStep(head,{x:0,y:0,z:0},1/60);
 assert.ok(Math.hypot(head.x,head.y,head.z)<1e-3,'returns to rest');
 const paused=headSpringStep({x:.01,vx:0},{x:0,y:0,z:0},0);assert.equal(paused.x,.01);
});

test('horizon stabilization fades out as the truck rolls over',()=>{
 assert.ok(horizonStabilization(1)>.15&&horizonStabilization(1)<=.25);assert.equal(horizonStabilization(.3),0);assert.equal(horizonStabilization(-1),0);
});

test('chase camera trails the heading, never sinks into a dune and snaps on reset',()=>{
 const target={x:10,y:2,z:-5,heading:0,speed:0};
 let state=chaseStep({},target,0,true);
 assert.ok(state.z>target.z+8&&Math.abs(state.x-target.x)<1e-9,'starts directly behind (front is −Z)');assert.ok(state.y>target.y+2);
 const turned={...target,heading:Math.PI/2};state=chaseStep(state,turned,1/60);
 assert.ok(state.yaw>0&&state.yaw<.2,'yaw lags a sudden turn');
 for(let i=0;i<300;i++)state=chaseStep(state,turned,1/60);assert.ok(Math.abs(state.yaw-Math.PI/2)<.01);
 const buried=chaseStep({},{...target,groundAt:()=>30},0,true);assert.ok(buried.y>=31.1-1e-9);
 const fast=chaseStep({},{...target,speed:40},0,true);assert.ok(fast.z-target.z>11.5,'pulls back at speed');
});

test('showcase orbit circles the truck above the ground',()=>{
 for(const time of [0,10,60,500]){const o=showcaseOrbit(time,{x:5,y:3,z:5},()=>8);const d=Math.hypot(o.x-5,o.z-5);assert.ok(d>7&&d<12);assert.ok(o.y>=8.9);assert.deepEqual(o.look,{x:5,y:4.25,z:5});}
});

test('minimap wedge opens ahead of the driver',()=>{
 const wedge=viewWedge({x:0,z:0},0,Math.PI/2,100);
 assert.equal(wedge.length,4);assert.deepEqual([wedge[0].x,wedge[0].z],[0,0]);
 assert.ok(Math.abs(wedge[2].z+100)<1e-9&&Math.abs(wedge[2].x)<1e-9,'center points along −Z at heading 0');
 assert.ok(wedge[1].x<0&&wedge[3].x>0&&wedge[1].z<0&&wedge[3].z<0);
});

test('midday reproduces the original board lighting; every preset is complete',()=>{
 const day=timePreset('day'),d=sunDirection(day),length=Math.hypot(30,55,20);
 assert.ok(Math.abs(d.x*length+30)<1e-9&&Math.abs(d.y*length-55)<1e-9&&Math.abs(d.z*length-20)<1e-9);
 assert.equal(day.sun,'#fff0cb');assert.equal(day.sunPower,3.2);assert.equal(day.ambient,2.6);assert.equal(day.ground,'#a99a70');assert.equal(day.exposure,1.15);
 assert.equal(timePreset('unknown').id,DEFAULT_TIME);
 let id=DEFAULT_TIME;const seen=new Set();for(let i=0;i<TIME_PRESETS.length;i++){seen.add(id);id=nextTime(id);}assert.equal(seen.size,TIME_PRESETS.length);assert.equal(id,DEFAULT_TIME);
 for(const preset of TIME_PRESETS){
  for(const key of ['sun','skyLight','groundLight','zenith','horizon','haze','ground'])assert.match(preset[key],/^#[0-9a-f]{6}$/,preset.id+'.'+key);
  const sun=sunDirection(preset),shadow=shadowDirection(preset);
  assert.ok(Math.abs(Math.hypot(sun.x,sun.y,sun.z)-1)<1e-9);assert.ok(sun.y>0,preset.id+' sun is above the horizon');
  assert.ok(shadow.y>=Math.sin(13*Math.PI/180)-1e-9,preset.id+' shadow light keeps a usable height');
 }
 assert.equal(TIME_PRESETS.filter(p=>p.headlights).map(p=>p.id).join(),'night');
});

test('far land meets the playable edge and rises into distant ranges',()=>{
 const axis=farGridAxis(-1200,1200);
 assert.ok(axis.includes(-1200)&&axis.includes(1200)&&axis.includes(-1197)&&axis.includes(1197));
 for(let i=1;i<axis.length;i++)assert.ok(axis[i]>axis[i-1],'strictly increasing');
 assert.ok(axis[0]<-9000&&axis.at(-1)>9000);assert.ok(axis.length<140,'stays a light mesh');
 assert.equal(farLandHeight(1200,0,0,17.5),17.5);
 let highest=0;for(let x=-9000;x<=9000;x+=450)for(let z=-9000;z<=9000;z+=450){const outside=Math.hypot(Math.max(0,Math.abs(x)-1200),Math.max(0,Math.abs(z)-600));if(outside>3000)highest=Math.max(highest,farLandHeight(x,z,outside));}
 assert.ok(highest>150,'mountains on the horizon');
 for(let x=1210;x<1500;x+=30)assert.ok(farLandHeight(x,0,x-1200,10)<40,'gentle dunes just beyond the rim');
});

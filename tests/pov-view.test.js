import test from 'node:test';
import assert from 'node:assert/strict';
import {VIEW_MODES,DEFAULT_VIEW,normalizeView,nextView,isPerspective,eyePoint,HeadLook,LOOK_LIMITS,povFov,COCKPIT_FOV_FLOOR,headSpringStep,horizonStabilization,chaseStep,showcaseOrbit,viewWedge,cockpitLayout,WHEEL,GAUGE_FACE,MIRROR,markerView,MARKER_NEAR,MARKER_FAR} from '../src/pov-view.js';
import {BRONCO_STYLES,cabinEnvelope} from '../src/vehicle.js';
import {TIME_PRESETS} from '../src/time-of-day.js';
import en from '../src/locales/en.js';

const degrees=radians=>radians*180/Math.PI;
// One style per distinct cabin envelope (roof height, windshield, wheelbase, open/bimini).
const ENVELOPES=['classic','ranger','sunset','sky','copper78','highroller78'];

test('views cycle through cockpit, hood, chase and the classic board, and each has a label',()=>{
 assert.equal(DEFAULT_VIEW,'cockpit');assert.equal(normalizeView('nonsense'),'cockpit');assert.equal(normalizeView('board'),'board');
 let view=DEFAULT_VIEW;const seen=[];for(let i=0;i<VIEW_MODES.length;i++){seen.push(view);view=nextView(view);}
 assert.deepEqual(seen,VIEW_MODES);assert.equal(view,DEFAULT_VIEW);assert.equal(nextView('cockpit',-1),'board');
 for(const mode of VIEW_MODES)assert.equal(nextView(nextView(mode),-1),mode);
 assert.ok(isPerspective('cockpit')&&isPerspective('hood')&&isPerspective('chase')&&!isPerspective('board'));
 for(const mode of VIEW_MODES)assert.ok(en['view.'+mode],'label for '+mode);
 for(const preset of TIME_PRESETS)assert.ok(en['time.'+preset.id],'label for '+preset.id);
});

test('every body shares one of the tested cabin envelopes',()=>{
 const key=style=>{const c=cabinEnvelope(style);return [c.roofY,c.front,c.wheelbase,c.open,c.bimini].join('/');},covered=new Set(ENVELOPES.map(key));
 for(const style of Object.keys(BRONCO_STYLES))assert.ok(covered.has(key(style)),style+' has an untested cabin envelope');
});

test('the seated eye is on the driver side, under every headliner and behind the windshield',()=>{
 for(const style of Object.keys(BRONCO_STYLES)){
  const cabin=cabinEnvelope(style),eye=eyePoint('cockpit',cabin);
  assert.equal(eye.x,-.39,style+' is left-hand drive');
  assert.equal(eye.y,Math.min(2.1,cabin.roofY-.25),style+' eye height');assert.ok(eye.y<=cabin.roofY-.065-.18,style+' head clears the roof underside');
  assert.ok(Math.abs(eye.z-.07*cabin.wheelbase)<1e-9,style+' eye sits over the seat');
  assert.ok(eye.z>(cabin.front-.015)*cabin.wheelbase+.3,style+' eye is well behind the windshield top');
  assert.ok(Math.abs(eye.pitch+.085)<.011,style+' looks about five degrees down the hood');
  const hood=eyePoint('hood',cabin);
  assert.equal(hood.x,0);assert.ok(hood.z<-.51*cabin.wheelbase-.25,style+' bonnet camera is ahead of the windshield base');assert.ok(Math.abs(hood.y-2.02)<.01,style+' bonnet camera height');assert.ok(Math.abs(hood.pitch+.05)<.02,style+' bonnet camera pitch');
 }
});

test('head look: keys, clamps, zoom direction and return to the road',()=>{
 const look=new HeadLook(),keys=new Set(['KeyJ']);
 for(let i=0;i<600;i++)look.step(keys,1/60);
 assert.equal(look.yaw,LOOK_LIMITS.yaw,'J looks left up to the limit');assert.equal(look.pitch,0);
 keys.clear();for(let i=0;i<180;i++)look.step(keys,1/60);
 assert.ok(Math.abs(look.yaw)<.001,'recentered after release');
 keys.add('KeyL');look.step(keys,.1);assert.ok(look.yaw<0,'L looks right');keys.clear();look.reset();
 keys.add('KeyI');look.step(keys,.1);assert.ok(look.pitch>0,'I looks up');keys.clear();look.reset();
 keys.add('KeyK');look.step(keys,.1);assert.ok(look.pitch<0,'K looks down');keys.clear();look.reset();
 keys.add('Equal');look.step(keys,.2);assert.ok(look.zoom<1,'+ zooms in');keys.clear();
 keys.add('Minus');look.step(keys,.6);assert.ok(look.zoom>1,'− zooms out');keys.clear();
 look.adjust(0,0,.01);assert.equal(look.zoom,LOOK_LIMITS.zoomIn);look.adjust(0,0,100);assert.equal(look.zoom,LOOK_LIMITS.zoomOut);
 look.adjust(0,-5);assert.equal(look.pitch,-LOOK_LIMITS.down);look.adjust(0,5);assert.equal(look.pitch,LOOK_LIMITS.up);
 // The same glance takes the same time at 30 and 120 frames per second.
 const sweep=hz=>{const l=new HeadLook(),k=new Set(['KeyJ']);for(let i=0;i<hz/2;i++)l.step(k,1/hz);return l.yaw;};
 assert.ok(Math.abs(sweep(30)-sweep(120))<1e-9);
 assert.ok(Math.abs(sweep(60)-1.3)<.03,'a glance turns at about 150 degrees a second');
 const nod=new HeadLook(),up=new Set(['KeyI']);for(let i=0;i<12;i++)nod.step(up,1/60);assert.ok(Math.abs(nod.pitch-.26)<.02,'and tilts at half that');
 // The driver can look over a shoulder, but not at the roof or into the footwell.
 assert.ok(LOOK_LIMITS.yaw>1.9&&LOOK_LIMITS.yaw<2.5);assert.ok(LOOK_LIMITS.up>.3&&LOOK_LIMITS.up<=.6);assert.ok(LOOK_LIMITS.down>.4&&LOOK_LIMITS.down<=.8);
});

test('a drag keeps its angle while the pointer is down and recentres only after release',()=>{
 const look=new HeadLook(),none=new Set();
 look.adjust(-.8,.2);look.held=true;
 for(let i=0;i<60*5;i++)look.step(none,1/60);
 assert.equal(look.yaw,-.8,'held and motionless for five seconds');assert.equal(look.pitch,.2);
 look.held=false;
 for(let i=0;i<60;i++)look.step(none,1/60);
 assert.equal(look.yaw,-.8,'the glance lingers for a moment after release');
 for(let i=0;i<60*3;i++)look.step(none,1/60);
 assert.ok(Math.abs(look.yaw)<.001&&Math.abs(look.pitch)<.001,'then returns to the road');
 look.adjust(.3,0);look.held=true;look.reset();assert.equal(look.held,false,'reset forgets the pointer');
});

test('field of view: fixed horizontal sweep, widens with speed either way, usable on phones',()=>{
 const wide=povFov(16/9,0),expected=degrees(2*Math.atan(Math.tan(46*Math.PI/180)/(16/9)));
 assert.ok(Math.abs(wide-expected)<.01,'92° horizontally at 16:9');
 assert.equal(povFov(16/9,-40),povFov(16/9,40),'reverse widens like forward');
 assert.ok(Math.abs(povFov(16/9,38)-wide-7)<1e-9&&Math.abs(povFov(16/9,400)-wide-7)<1e-9,'up to seven degrees');
 assert.ok(povFov(16/9,19)>wide&&povFov(16/9,19)<wide+7);
 assert.equal(povFov(9/19.5,0),84,'portrait is capped');assert.equal(povFov(4,0),50,'ultrawide keeps a floor');
 // The seated view never drops below 60° vertically, so ultrawide screens see what 16:9 sees.
 assert.equal(COCKPIT_FOV_FLOOR,60);assert.equal(povFov(21/9,0,1,COCKPIT_FOV_FLOOR),60);assert.equal(povFov(32/9,0,1,COCKPIT_FOV_FLOOR),60);
 assert.equal(povFov(16/9,0,1,COCKPIT_FOV_FLOOR),wide,'16:9 is unchanged by the floor');assert.ok(povFov(21/9,0)<52,'other views keep the 92° horizontal sweep');
 assert.ok(Math.abs(povFov(16/9,0,.62)-wide*.62)<1e-9);
 for(const aspect of [.3,.5,1,1.33,1.78,2.4,4])for(const zoom of [LOOK_LIMITS.zoomIn,1,LOOK_LIMITS.zoomOut]){const fov=povFov(aspect,30,zoom);assert.ok(fov>=28&&fov<=100,`aspect ${aspect} zoom ${zoom}`);}
});

test('the head spring moves the way a body would, stays bounded and settles',()=>{
 const settle=acceleration=>{let head={};for(let i=0;i<180;i++)head=headSpringStep(head,acceleration,1/60);return head;};
 // The truck faces −Z and the driver's right is +X.
 const launch=settle({x:0,y:0,z:-12}),braking=settle({x:0,y:0,z:12}),leftTurn=settle({x:-9,y:0,z:0}),landing=settle({x:0,y:30,z:0});
 assert.ok(launch.z>.02&&launch.z<=.05,'thrown back under acceleration');assert.ok(Math.abs(launch.x)<1e-9&&Math.abs(launch.y)<1e-9);
 assert.ok(braking.z<-.02,'thrown forward under braking');assert.ok(leftTurn.x>.015,'pushed to the outside of a left turn');assert.ok(landing.y<-.04,'pressed down on landing');
 let head=headSpringStep({},{x:0,y:-4000,z:0},1/60);assert.ok(Math.abs(head.y)<=.075+1e-9,'a spike is clamped');
 for(let i=0;i<240;i++)head=headSpringStep(head,{x:0,y:0,z:0},1/60);
 assert.ok(Math.hypot(head.x,head.y,head.z)<1e-3,'returns to rest');
 const paused=headSpringStep({x:.01,vx:0},{x:0,y:0,z:0},0);assert.equal(paused.x,.01);
 for(const dt of [1/240,1/30,.1,5]){const h=headSpringStep({},{x:50,y:-50,z:50},dt);for(const axis of ['x','y','z'])assert.ok(Number.isFinite(h[axis])&&Math.abs(h[axis])<=.075+1e-9,`dt ${dt}`);}
});

test('horizon stabilization holds about a fifth of the tilt and fades out in a rollover',()=>{
 assert.ok(Math.abs(horizonStabilization(1)-.22)<1e-9);assert.ok(Math.abs(horizonStabilization(.6)-.22*.25/.45)<1e-9,'fades between 35 and 80 percent upright');assert.equal(horizonStabilization(.8),.22);
 assert.equal(horizonStabilization(.3),0);assert.equal(horizonStabilization(-1),0);
});

test('chase camera trails the heading, looks past the truck and never sinks into a dune',()=>{
 const target={x:10,y:2,z:-5,heading:0,speed:0};
 let state=chaseStep({},target,0,true);
 assert.ok(Math.abs(state.z-target.z-9.2)<1e-9&&Math.abs(state.x-target.x)<1e-9,'starts 9.2 m directly behind (front is −Z)');assert.ok(Math.abs(state.y-target.y-3.3)<1e-9,'3.3 m above the truck');
 assert.ok(Math.abs(state.look.y-target.y-1.5)<1e-9,'aimed at the roof line');
 const beyond=(state.look.x-target.x)*(state.x-target.x)+(state.look.z-target.z)*(state.z-target.z);
 assert.ok(beyond<0,'the look point is on the far side of the truck');
 const turned={...target,heading:Math.PI/2};state=chaseStep(state,turned,1/60);
 assert.ok(state.yaw>0&&state.yaw<.2,'yaw lags a sudden turn');
 for(let i=0;i<300;i++)state=chaseStep(state,turned,1/60);assert.ok(Math.abs(state.yaw-Math.PI/2)<.01);
 // Across ±π the camera takes the short way round.
 let wrap=chaseStep({},{...target,heading:3.1},0,true);wrap=chaseStep(wrap,{...target,heading:-3.1},1/60);
 assert.ok(Math.abs(wrap.yaw)>3.09,'did not swing through zero');
 const glance=chaseStep({},{...target,lookYaw:.6},0,true);assert.ok(glance.x>target.x+3,'a glance swings the camera sideways');
 const buried=chaseStep({},{...target,groundAt:()=>30},0,true);assert.ok(buried.y>=31.1-1e-9);
 const fast=chaseStep({},{...target,speed:40},0,true),slow=chaseStep({},target,0,true);assert.ok(fast.z-target.z>slow.z-target.z+2.5,'pulls back at speed');
 assert.deepEqual(chaseStep({},{...target,speed:-40},0,true),fast,'reversing counts as speed');
});

test('showcase orbit circles the truck above the ground and widens with scale',()=>{
 for(const time of [0,10,60,500]){
  const o=showcaseOrbit(time,{x:5,y:3,z:5},()=>8),d=Math.hypot(o.x-5,o.z-5);assert.ok(d>7&&d<12);assert.ok(o.y>=8.9);assert.deepEqual(o.look,{x:5,y:4.25,z:5});
  const wide=showcaseOrbit(time,{x:5,y:3,z:5},()=>-50,1.45);assert.ok(Math.abs(Math.hypot(wide.x-5,wide.z-5)-d*1.45)<1e-9);assert.ok(wide.y>showcaseOrbit(time,{x:5,y:3,z:5},()=>-50).y);
 }
});

test('minimap wedge opens ahead of the driver',()=>{
 const wedge=viewWedge({x:0,z:0},0,Math.PI/2,100);
 assert.equal(wedge.length,4);assert.deepEqual([wedge[0].x,wedge[0].z],[0,0]);
 assert.ok(Math.abs(wedge[2].z+100)<1e-9&&Math.abs(wedge[2].x)<1e-9,'center points along −Z at heading 0');
 assert.ok(wedge[1].x<0&&wedge[3].x>0&&wedge[1].z<0&&wedge[3].z<0);
 const east=viewWedge({x:3,z:4},-Math.PI/2,Math.PI/2,100);assert.ok(Math.abs(east[2].x-103)<1e-9&&Math.abs(east[2].z-4)<1e-9);
});

test('cabin layout: road, then dials, then the wheel rim, for every roof height and wheelbase',()=>{
 for(const style of Object.keys(BRONCO_STYLES)){
  const cabin=cabinEnvelope(style),layout=cockpitLayout(cabin),{eye}=layout;
  // Wheel and dials sit straight ahead of the driver, at fixed distances down the cabin.
  assert.equal(layout.column.x,eye.x,style+': wheel in front of the driver');assert.equal(layout.binnacle.x,eye.x,style+': dials in front of the driver');
  assert.ok(Math.abs(layout.column.z+.14*cabin.wheelbase)<1e-9&&Math.abs(layout.binnacle.z+.33*cabin.wheelbase)<1e-9,style+': reach');
  assert.ok(Math.abs(layout.column.y-(eye.y-.291))<1e-9&&Math.abs(layout.binnacle.y-(eye.y-.152))<1e-9&&Math.abs(layout.pod.y-(eye.y-.18))<1e-9,style+': heights follow the eye');
  // Angle below the horizontal, seen from the eye in the truck's vertical mid-plane.
  const below=(y,z)=>Math.atan2(eye.y-y,eye.z-z);
  const rimTop={y:layout.column.y+WHEEL.radius*Math.cos(WHEEL.rake),z:layout.column.z+WHEEL.radius*Math.sin(WHEEL.rake)};
  const tube=Math.atan(WHEEL.tube/Math.hypot(eye.y-rimTop.y,eye.z-rimTop.z));
  const half=GAUGE_FACE.height/2,faceBottom={y:layout.binnacle.y-half*Math.cos(GAUGE_FACE.tilt),z:layout.binnacle.z-half*Math.sin(GAUGE_FACE.tilt)},faceTop={y:layout.binnacle.y+half*Math.cos(GAUGE_FACE.tilt),z:layout.binnacle.z+half*Math.sin(GAUGE_FACE.tilt)};
  assert.ok(degrees(below(rimTop.y,rimTop.z)-tube-below(faceBottom.y,faceBottom.z))>1.2,style+': the rim clears the bottom of the dial face');
  // At rest at least seven degrees of the wheel show above the bottom edge of a 16:9 screen.
  assert.ok(povFov(16/9,0,1,COCKPIT_FOV_FLOOR)/2-degrees(eye.pitch)-degrees(below(rimTop.y,rimTop.z)-tube)>7,style+': a good part of the wheel is on screen');
  // The hood's far edge is 16–17° down; the dial face must not rise above it into the road.
  assert.ok(degrees(below(faceTop.y,faceTop.z))>14,style+': dials stay below the road');
  // The rim's top edge is still on screen at rest on a 16:9 display.
  for(const aspect of [16/9,21/9,32/9])assert.ok(degrees(below(rimTop.y,rimTop.z))+degrees(tube)<povFov(aspect,0,1,COCKPIT_FOV_FLOOR)/2-degrees(eye.pitch),style+': the whole rim top shows at the bottom of a '+aspect.toFixed(2)+' screen');
  assert.ok(layout.binnacle.y-GAUGE_FACE.height/2-.03>1.755,style+': the binnacle sits above the dash top');
  // Inclinometer and mirror are inside a 92° horizontal view.
  const azimuth=p=>degrees(Math.atan2(p.x-eye.x,eye.z-p.z));
  assert.ok(azimuth(layout.pod)>20&&azimuth(layout.pod)<41,style+': inclinometer azimuth '+azimuth(layout.pod).toFixed(1));
  assert.ok(azimuth({x:layout.mirror.x+MIRROR.width/2*Math.cos(MIRROR.yaw),z:layout.mirror.z-MIRROR.width/2*Math.sin(MIRROR.yaw)})<44,style+": the mirror's far edge is in view");
  assert.ok(layout.mirror.z>(cabin.front-.015)*cabin.wheelbase+.04,style+': the mirror is inside the windshield');
  assert.equal(layout.mirror.x<-.2,cabin.front>-.3,style+': only a raked windshield slides the mirror toward the driver');
  assert.ok(layout.stalk>=.08&&layout.stalk<=.095,style+': a stalk long enough to reach the roof or roll cage');assert.equal(layout.stalk>.085,cabin.bimini,style+': longer under the thinner bimini slab');
 }
});

test('cabin proportions: raked wheel, tilted dial face, mirror as wide as its render target',()=>{
 assert.ok(WHEEL.rake<-.35&&WHEEL.rake>-.45);assert.ok(WHEEL.radius>.14&&WHEEL.radius<.16&&WHEEL.tube<.02);
 assert.ok(GAUGE_FACE.tilt<-.42&&GAUGE_FACE.tilt>-.5,'the face is tilted up toward the eye');assert.ok(Math.abs(GAUGE_FACE.width/GAUGE_FACE.height-3)<1e-9);
 assert.ok(Math.abs(MIRROR.width/MIRROR.height-512/144)<.01);assert.ok(MIRROR.yaw<-.3&&MIRROR.yaw>-.5,'turned toward the driver');
});

test('markers stay simulated around the truck even where the driver cannot see the ground',()=>{
 const player={x:100,z:-50},seen=markerView(player,p=>p.z<-60);
 assert.equal(seen({x:100,z:-47}),true,'under the bumper');assert.equal(seen({x:100+MARKER_NEAR-1,z:-50}),true,'beside the cab');
 assert.equal(seen({x:100+MARKER_NEAR+1,z:-50}),false,'far to the side and out of view');
 assert.equal(seen({x:100,z:-50-MARKER_NEAR-5}),true,'ahead and in view');
 assert.equal(seen({x:100,z:-50-MARKER_FAR-1}),false,'in view but too far to matter');
 assert.equal(markerView(player,()=>1)({x:100,z:-50-MARKER_FAR+1}),true,'the frustum test may return a truthy value');
 player.x=500;assert.equal(seen({x:100,z:-47}),false,'the region follows the live player position');
 // Board-sized surroundings, and a view range that keeps the marker count bounded.
 assert.ok(MARKER_NEAR>=40&&MARKER_NEAR<=50);assert.ok(MARKER_FAR>=100&&MARKER_FAR<=200);
});

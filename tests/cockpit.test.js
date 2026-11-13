import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCockpit,dialAngle,GAUGE_CANVAS,READOUT,GLOVE,STEERING_RATIO,STALK_FOOT} from '../src/cockpit.js';
import {createBronco,BRONCO_STYLES,cabinEnvelope} from '../src/vehicle.js';
import {eyePoint,povFov,cockpitLayout,COCKPIT_FOV_FLOOR,GAUGE_FACE,MIRROR,WHEEL} from '../src/pov-view.js';
import {DRIVE_MODES} from '../src/drive-modes.js';
import {DEFAULT_TUNING} from '../src/tuning.js';
import {VEHICLE_SCALE} from '../src/contact.js';

// The rig draws on a 2D canvas; node needs a stand-in that accepts any call.
// Every drawing call is recorded as [method, ...arguments] so tests can read what was painted.
function withDocument(run){
 const previous=globalThis.document,calls=[];
 const context=()=>new Proxy({},{get:(target,key)=>key in target?target[key]:(...args)=>{calls.push([key,...args]);},set:(target,key,value)=>{target[key]=value;return true;}});
 globalThis.document={createElement:()=>({width:0,height:0,getContext:context})};
 try{return run(calls);}finally{globalThis.document=previous;}
}
const ENVELOPES=['classic','ranger','sunset','sky','copper78','highroller78'];
function seated(style){
 const car=createBronco(style,'07',{driverSeat:true}),cockpit=createCockpit();
 cockpit.attach(car);cockpit.setVisible(true);car.mesh.updateMatrixWorld(true);
 const eye=eyePoint('cockpit',car.cabin),eyeWorld=new THREE.Vector3(eye.x,eye.y,eye.z).applyMatrix4(car.mesh.matrixWorld);
 return {car,cockpit,eye,eyeWorld};
}

test('dials are drawn round and the speedometer covers every reachable speed',()=>{
 assert.ok(Math.abs(GAUGE_CANVAS.binnacle/GAUGE_CANVAS.height-GAUGE_FACE.width/GAUGE_FACE.height)<1e-9,'binnacle pixels are square on its plane');
 assert.equal(GAUGE_CANVAS.width-GAUGE_CANVAS.binnacle,GAUGE_CANVAS.height,'the inclinometer region is square');
 // Governor ceiling from src/powertrain.js: (at most 40 m/s + 1.5 per engine upgrade level, three levels)
 // times the fastest boost-capable range pace, times nitro.
 const ceiling=(40+3*1.5)*Math.max(...DRIVE_MODES.filter(mode=>mode.boost).map(mode=>mode.pace))*DEFAULT_TUNING.boostScale*DEFAULT_TUNING.topSpeedScale*3.6;
 assert.ok(ceiling>250&&ceiling<260,'the formula still gives about 255 km/h: '+ceiling.toFixed(0));
 assert.ok(GAUGE_CANVAS.speedMax>=ceiling,'the needle never pegs below the governor');assert.equal(GAUGE_CANVAS.speedMax%40,0,'whole numbered ticks');
 assert.ok(dialAngle(GAUGE_CANVAS.speedMax/2,GAUGE_CANVAS.speedMax)>dialAngle(0,GAUGE_CANVAS.speedMax));
 assert.equal(dialAngle(-5,100),dialAngle(0,100));assert.equal(dialAngle(500,100),dialAngle(100,100));
});

test('from the seated eye neither the wheel nor a glove hides a readout, at any steering angle, on any body',()=>withDocument(()=>{
 const raycaster=new THREE.Raycaster(),direction=new THREE.Vector3(),point=new THREE.Vector3(),eyeWorld=new THREE.Vector3();
 // Readout boxes on the gauge canvas, in pixels: speed digits, gear, range and nitro, both needle hubs.
 const boxes={speed:[150,184,234,222],gear:[534,184,618,222],range:[READOUT.x,READOUT.y,READOUT.x+READOUT.width,READOUT.y+READOUT.height],speedHub:[180,116,204,140],revHub:[564,116,588,140]};
 const lock=DEFAULT_TUNING.steerLow*STEERING_RATIO;assert.ok(lock>3,'the wheel turns more than half a turn each way');
 for(const style of ENVELOPES){
  const {car,cockpit,eye}=seated(style),{parts}=cockpit,face=parts.binnacle.children.find(mesh=>mesh.geometry.type==='PlaneGeometry');
  parts.gloves.visible=true; // closed bodies show them; test the worst case on open bodies too
  // The eye at rest, and dipped three centimeters by the head spring on a firm landing.
  for(const dip of [0,-.03])for(let turn=-lock;turn<=lock+1e-9;turn+=.1){
   cockpit.update(0,turn/STEERING_RATIO,()=>({}));car.mesh.updateMatrixWorld(true);
   eyeWorld.set(eye.x,eye.y+dip,eye.z).applyMatrix4(car.mesh.matrixWorld);
   const occluders=[];parts.column.traverse(object=>{if(object.isMesh)occluders.push(object);});
   assert.ok(face&&occluders.length>5,style);
   for(const [name,[x0,y0,x1,y1]] of Object.entries(boxes)){
    let hidden=0,total=0;
    for(let px=x0;px<=x1;px+=8)for(let py=y0;py<=y1;py+=8){
     point.set((px/GAUGE_CANVAS.binnacle-.5)*GAUGE_FACE.width,(.5-py/GAUGE_CANVAS.height)*GAUGE_FACE.height,0).applyMatrix4(face.matrixWorld);
     const reach=point.distanceTo(eyeWorld);raycaster.set(eyeWorld,direction.copy(point).sub(eyeWorld).normalize());raycaster.far=reach-.002;
     total++;if(raycaster.intersectObjects(occluders,false).length)hidden++;
    }
    assert.equal(hidden,0,`${style}, wheel turned ${turn.toFixed(1)} rad, eye ${dip}: ${hidden}/${total} samples of the ${name} readout are hidden`);
   }
  }
 }
 // The range and nitro box sits in the gap between the two dial circles.
 for(const y of [READOUT.y,READOUT.y+READOUT.height])for(const [centre,x] of [[192,READOUT.x],[576,READOUT.x+READOUT.width]])assert.ok(Math.hypot(x-centre,y-128)>112+4,'clear of the dial at '+centre);
}));

test('mirror and inclinometer are in a 16:9 view, and the mirror hangs inside the cabin',()=>withDocument(()=>{
 const corner=new THREE.Vector3();
 for(const style of ENVELOPES){
  const {car,cockpit,eye,eyeWorld}=seated(style),cabin=car.cabin;
  // The seated view on a 16:9 monitor, an ultrawide monitor and a phone in landscape.
  for(const aspect of [16/9,21/9,19.5/9]){
   const camera=new THREE.PerspectiveCamera(povFov(aspect,0,1,COCKPIT_FOV_FLOOR),aspect,.09,100),label=`${style} at ${aspect.toFixed(2)}`;
   camera.position.copy(eyeWorld);camera.quaternion.copy(car.mesh.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(eye.pitch,0,0,'YXZ')));camera.updateMatrixWorld();
   const project=(object,x,y)=>corner.set(x,y,0).applyMatrix4(object.matrixWorld).project(camera).clone();
   for(const [x,y] of [[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sy])=>[sx*MIRROR.width/2,sy*MIRROR.height/2])){
    const ndc=project(cockpit.parts.glass,x,y);
    assert.ok(Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1&&ndc.z<1,`${label}: mirror corner on screen at ${ndc.x.toFixed(2)}, ${ndc.y.toFixed(2)}`);
   }
   // The whole inclinometer face, figures and label included.
   for(const [x,y] of [[-.06,-.06],[.06,-.06],[.06,.06],[-.06,.06]]){const ndc=project(cockpit.parts.pod,x,y);assert.ok(Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1,`${label}: inclinometer corner at ${ndc.x.toFixed(2)}, ${ndc.y.toFixed(2)}`);}
   // The wheel hub is straight ahead of the driver and the top of the rim is on screen.
   const hub=project(cockpit.parts.column,0,0),rim=project(cockpit.parts.column,0,WHEEL.radius+WHEEL.tube),rimLower=project(cockpit.parts.column,0,WHEEL.radius-WHEEL.tube);
   assert.ok(Math.abs(hub.x)<.02,`${label}: hub at x ${hub.x.toFixed(3)}`);assert.ok(rim.y>-1&&rimLower.y>-1,`${label}: rim top at y ${rimLower.y.toFixed(2)}`);
   // The tops of both gloves show at rest (hands at eleven and one).
   for(const side of [-1,1]){const angle=Math.PI/2+side*GLOVE.angle,top=project(cockpit.parts.column,Math.cos(angle)*(WHEEL.radius+.015),Math.sin(angle)*(WHEEL.radius+.015));assert.ok(Math.abs(top.x)<1&&top.y>-1,`${label}: glove top at ${top.x.toFixed(2)}, ${top.y.toFixed(2)}`);}
  }
  // Windshield plane from its bottom edge to its top edge, in the truck's own units.
  const bottom={y:1.65,z:-.51*cabin.wheelbase},top={y:cabin.roofY-.1,z:(cabin.front-.015)*cabin.wheelbase},inverse=car.mesh.matrixWorld.clone().invert();
  const housing=cockpit.parts.mirror.children.find(mesh=>mesh.geometry.type==='BoxGeometry'),{width,height,depth}=housing.geometry.parameters;
  for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
   corner.set(sx*width/2,sy*height/2,sz*depth/2).applyMatrix4(housing.matrixWorld).applyMatrix4(inverse);
   const glassZ=bottom.z+(top.z-bottom.z)*(corner.y-bottom.y)/(top.y-bottom.y);
   assert.ok(corner.z>glassZ,`${style}: mirror housing corner pokes ${(glassZ-corner.z).toFixed(3)} through the windshield`);
   assert.ok(corner.y<cabin.roofY-.065+1e-6||cabin.open,`${style}: mirror housing is below the headliner`);
  }
 }
}));

test('the mirror stalk reaches the roof, or the roll cage on open bodies',()=>withDocument(()=>{
 const raycaster=new THREE.Raycaster(),foot=new THREE.Vector3(),up=new THREE.Vector3();
 for(const style of [...ENVELOPES,'godzilla78','crawler','roadsterBlack','halfCabRed','softtop78']){
  const {car,cockpit}=seated(style),{stalk,mirror}=cockpit.parts,length=cockpitLayout(car.cabin).stalk,solids=[];
  assert.equal(stalk.visible,true,style);assert.ok(Math.abs(stalk.scale.y-length)<1e-9,style+': the mesh uses the layout length');
  car.chassis.traverse(object=>{if(object.isMesh&&!object.material.transparent)solids.push(object);});
  // The drawn stalk starts inside the mirror housing...
  const housing=mirror.children.find(mesh=>mesh.geometry.type==='BoxGeometry'),{width,height,depth}=housing.geometry.parameters,bottom=stalk.position.y-stalk.scale.y/2;
  assert.ok(Math.abs(stalk.position.x)<=width/2&&Math.abs(bottom-STALK_FOOT)<1e-9&&bottom<height/2&&bottom>-height/2&&Math.abs(stalk.position.z-housing.position.z)<=depth/2,style+': stalk foot is inside the housing');
  // ...and from its own lower end, along its own axis, the first opaque part of the truck is at or below its own top.
  foot.set(0,-.5,0).applyMatrix4(stalk.matrixWorld);up.set(0,.5,0).applyMatrix4(stalk.matrixWorld);const reach=foot.distanceTo(up);up.sub(foot).normalize();
  raycaster.set(foot,up);raycaster.far=1;
  const hit=raycaster.intersectObjects(solids,false)[0];assert.ok(Math.abs(reach-length*car.mesh.scale.x)<1e-9,style+': drawn length');
  assert.ok(hit,style+': something to hang from');assert.ok(hit.distance<=reach+.0015,`${style}: stalk stops ${(hit.distance-reach).toFixed(4)} m short of the roof`);
  assert.ok(reach-hit.distance<.06,`${style}: stalk does not poke far through: ${(reach-hit.distance).toFixed(3)} m`);
 }
}));

test('the player truck keeps its steering wheel in every view; only the seat shows dials and mirror',()=>withDocument(()=>{
 for(const style of ['classic','sky']){
  const car=createBronco(style,'07',{driverSeat:true}),cockpit=createCockpit(),{parts}=cockpit,open=cabinEnvelope(style).open;
  cockpit.attach(car);
  assert.equal(cockpit.visible,false);assert.equal(cockpit.rig.visible,true,'wheel and column are part of the truck');assert.equal(cockpit.rig.parent,car.mesh);
  assert.equal(parts.column.visible,true);assert.deepEqual([parts.binnacle.visible,parts.pod.visible,parts.mirror.visible,parts.gloves.visible],[false,false,false,false]);
  // The rig applies the proportions the layout promises: raked wheel, face tilted up, mirror turned to the driver.
  assert.equal(parts.column.rotation.x,WHEEL.rake);assert.equal(parts.binnacle.rotation.x,GAUGE_FACE.tilt);assert.equal(parts.mirror.rotation.y,MIRROR.yaw);
  cockpit.setVisible(true);assert.equal(cockpit.visible,true);
  assert.deepEqual([parts.binnacle.visible,parts.pod.visible,parts.mirror.visible],[true,true,true]);assert.equal(parts.gloves.visible,!open,'open bodies seat a driver with their own gloves');
  cockpit.setVisible(false);assert.deepEqual([parts.binnacle.visible,parts.gloves.visible,cockpit.rig.visible],[false,false,true]);
 }
 // The standard body still has its own small wheel; the player body leaves that to the rig.
 const meshes=car=>{let count=0;car.chassis.traverse(o=>{if(o.isMesh)count+=o.geometry.attributes.position.count;});return count;};
 assert.ok(meshes(createBronco('classic','11'))>meshes(createBronco('classic','07',{driverSeat:true})));
}));

test('swapping bodies keeps the rig: detach first, then dispose the old truck',()=>withDocument(()=>{
 const first=createBronco('classic','07',{driverSeat:true}),second=createBronco('sunset','07',{driverSeat:true}),cockpit=createCockpit();
 let disposed=0;cockpit.attach(first);
 cockpit.rig.traverse(object=>{if(!object.isMesh)return;object.geometry.addEventListener('dispose',()=>disposed++);object.material.addEventListener('dispose',()=>disposed++);if(object.material.map)object.material.map.addEventListener('dispose',()=>disposed++);});
 cockpit.detach();assert.equal(cockpit.rig.parent,null);first.dispose();
 assert.equal(disposed,0,'no rig geometry, material or texture was disposed with the old body');
 cockpit.attach(second);assert.equal(cockpit.rig.parent,second.mesh);
 const {column}=cockpit.parts,layout=cockpitLayout(second.cabin);assert.equal(column.position.y,layout.column.y,'re-seated for the lower roof');assert.ok(layout.column.y<cockpitLayout(first.cabin).column.y);
}));

test('the wheel follows the steering in every view; dials repaint only when seated and due',()=>withDocument(()=>{
 const car=createBronco('classic','07',{driverSeat:true}),cockpit=createCockpit();cockpit.attach(car);
 let reads=0;const reading=()=>{reads++;return {speedKmh:42,rpm:2100,redline:5200,gear:'A2',range:'HI',nitro:80,roll:3,pitch:-2,bearing:'N 0°'};};
 cockpit.update(1000,.2,reading);assert.equal(cockpit.parts.wheel.rotation.z,.2*STEERING_RATIO);assert.equal(reads,0,'nothing to paint from outside the cabin');
 cockpit.setVisible(true);cockpit.update(1000,-.1,reading);assert.equal(cockpit.parts.wheel.rotation.z,-.1*STEERING_RATIO);assert.equal(reads,1);
 cockpit.update(1030,0,reading);assert.equal(reads,1,'at most about 14 reads a second');
 cockpit.update(1071,0,reading);assert.equal(reads,2);
}));

test('the headlight can start ahead of every nose, bull bars and winches included',()=>withDocument(()=>{
 for(const style of Object.keys(BRONCO_STYLES)){
  const car=createBronco(style,'07',{driverSeat:true}),box=new THREE.Box3();car.mesh.scale.setScalar(1);car.mesh.updateMatrixWorld(true);box.setFromObject(car.chassis);
  assert.ok(Math.abs(car.cabin.frontZ-box.min.z)<1e-6,style+' nose tip');assert.ok(car.cabin.frontZ<-1.6*car.cabin.wheelbase,style+' nose is ahead of the grille');
  assert.deepEqual({...car.cabin,frontZ:0},{...cabinEnvelope(style),frontZ:0},style+' cabin matches the shared envelope');
  car.dispose();
 }
 assert.equal(VEHICLE_SCALE,1.4);
}));

test('what is painted: round dials in their own regions, the right scale, roll the right way',()=>withDocument(calls=>{
 const car=createBronco('classic','07',{driverSeat:true}),cockpit=createCockpit(),{binnacle,pod,glass}=cockpit.parts;cockpit.attach(car);cockpit.setVisible(true);
 calls.length=0;cockpit.update(1000,0,()=>({speedKmh:88,rpm:3100,redline:5200,gear:'A3',range:'HI',nitro:60,roll:10,pitch:-4,bearing:'NE 45°'}));
 const of=name=>calls.filter(call=>call[0]===name),texts=of('fillText').map(call=>String(call[1]));
 assert.equal(of('scale').length,0,'nothing is stretched after the fact');
 assert.deepEqual(of('translate').map(call=>[call[1],call[2]]),[[192,128],[576,128],[896,128]],'two dials in the 768 px binnacle region, the inclinometer in the last 256 px');
 for(const arc of of('arc'))assert.ok(arc[3]<=118,'every circle fits its 256 px tall region');
 assert.ok(texts.includes(String(GAUGE_CANVAS.speedMax))&&texts.includes('40')&&!texts.includes('20'),'speed ticks are numbered every 40 up to the maximum');
 assert.ok(texts.includes('88')&&texts.includes('A3')&&texts.includes('HI')&&texts.includes('NE 45°')&&texts.includes('km/h'));
 const rangeLabel=of('fillText').find(call=>call[1]==='HI'),nitro=of('strokeRect')[0];
 assert.ok(rangeLabel[2]>READOUT.x&&rangeLabel[2]<READOUT.x+READOUT.width&&rangeLabel[3]>READOUT.y&&rangeLabel[3]<READOUT.y+READOUT.height,'range label inside its box');
 assert.ok(nitro[1]>=READOUT.x&&nitro[1]+nitro[3]<=READOUT.x+READOUT.width&&nitro[2]>=READOUT.y&&nitro[2]+nitro[4]<=READOUT.y+READOUT.height,'nitro bar inside its box');
 assert.ok(texts.includes('+10°  ·  -4°'),'roll then pitch, as labelled');
 // The silhouette leans the way the body rolls: a positive roll turns the canvas counter-clockwise.
 assert.ok(of('rotate').some(call=>Math.abs(call[1]+10*Math.PI/180)<1e-12));
 // Each plane samples only its own part of the canvas, and the mirror image is flipped left to right.
 const range=(mesh,axis)=>{const uv=mesh.geometry.attributes.uv,values=Array.from({length:uv.count},(_,i)=>axis==='x'?uv.getX(i):uv.getY(i));return [Math.min(...values),Math.max(...values)];};
 const face=binnacle.children.find(mesh=>mesh.geometry.type==='PlaneGeometry'),dial=pod.children.find(mesh=>mesh.geometry.type==='PlaneGeometry'),split=GAUGE_CANVAS.binnacle/GAUGE_CANVAS.width;
 assert.deepEqual(range(face,'x'),[0,split]);assert.deepEqual(range(dial,'x'),[split,1]);assert.deepEqual(range(face,'y'),[0,1]);
 const uv=glass.geometry.attributes.uv,position=glass.geometry.attributes.position;
 for(let i=0;i<uv.count;i++)assert.equal(uv.getX(i),position.getX(i)>0?0:1,'mirror glass is flipped');
}));

test('the mirror pass looks backward and leaves the renderer exactly as it found it',()=>withDocument(()=>{
 const car=createBronco('classic','07',{driverSeat:true}),cockpit=createCockpit(),scene=new THREE.Scene(),log=[];cockpit.attach(car);car.mesh.updateMatrixWorld(true);
 const renderer={target:'screen',shadowMap:{autoUpdate:true},info:{render:{calls:7,triangles:99}},fail:false,compiled:[],
  getRenderTarget(){return this.target;},setRenderTarget(target){this.target=target;},compile(){this.compiled.push(this.target);},
  render(drawn,camera){log.push({target:this.target,camera,rig:cockpit.rig.visible,shadows:this.shadowMap.autoUpdate});if(this.fail)throw new Error('context lost');}};
 assert.equal(cockpit.renderMirror(renderer,scene),false,'nothing to mirror from outside the cabin');assert.equal(log.length,0);
 cockpit.setVisible(true);
 assert.equal(cockpit.renderMirror(renderer,scene),true);assert.equal(cockpit.renderMirror(renderer,scene),false,'every other frame');assert.equal(cockpit.renderMirror(renderer,scene),true);
 assert.equal(log.length,2);const pass=log[0];
 assert.equal(pass.target,cockpit.parts.target);assert.equal(pass.camera,cockpit.mirrorCamera);assert.equal(pass.rig,false,'the rig is not in its own mirror');assert.equal(pass.shadows,false,'shadow maps are reused');
 assert.deepEqual([renderer.target,renderer.shadowMap.autoUpdate,cockpit.rig.visible],['screen',true,true]);
 assert.deepEqual({...cockpit.mirrorStats},{calls:7,triangles:99,every:2});
 // The camera sits on the glass and looks toward the back of the truck (+Z), upright.
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(cockpit.mirrorCamera.quaternion),upward=new THREE.Vector3(0,1,0).applyQuaternion(cockpit.mirrorCamera.quaternion),glassAt=cockpit.parts.glass.getWorldPosition(new THREE.Vector3());
 assert.ok(forward.z>.999&&upward.y>.999);assert.ok(cockpit.mirrorCamera.position.distanceTo(glassAt)<1e-9);
 assert.equal(cockpit.renderMirror(renderer,scene,4),false);assert.equal(cockpit.mirrorStats.every,4,'the slower cadence under load is reported');
 // A failing render must not leave the target bound, the shadows frozen or the wheel hidden.
 renderer.fail=true;assert.throws(()=>cockpit.renderMirror(renderer,scene,1),/context lost/);
 assert.deepEqual([renderer.target,renderer.shadowMap.autoUpdate,cockpit.rig.visible],['screen',true,true]);
 cockpit.prewarm(renderer,scene);assert.deepEqual(renderer.compiled,[cockpit.parts.target],'shader variants are compiled for the mirror target');assert.equal(renderer.target,'screen');
}));


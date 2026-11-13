import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCockpit,dialAngle,GAUGE_CANVAS,STEERING_RATIO} from '../src/cockpit.js';
import {createBronco,BRONCO_STYLES,cabinEnvelope} from '../src/vehicle.js';
import {eyePoint,povFov,GAUGE_FACE,MIRROR} from '../src/pov-view.js';
import {VEHICLE_SCALE} from '../src/contact.js';

// The rig draws on a 2D canvas; node needs a stand-in that accepts any call.
function withDocument(run){
 const previous=globalThis.document;
 const context=()=>new Proxy({},{get:(target,key)=>key in target?target[key]:()=>{},set:(target,key,value)=>{target[key]=value;return true;}});
 globalThis.document={createElement:()=>({width:0,height:0,getContext:context})};
 try{return run();}finally{globalThis.document=previous;}
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
 // Fastest engine in HI range with nitro reaches about 229 km/h.
 assert.ok(GAUGE_CANVAS.speedMax>=230);assert.equal(GAUGE_CANVAS.speedMax%40,0,'whole numbered ticks');
 assert.ok(dialAngle(GAUGE_CANVAS.speedMax/2,GAUGE_CANVAS.speedMax)>dialAngle(0,GAUGE_CANVAS.speedMax));
 assert.equal(dialAngle(-5,100),dialAngle(0,100));assert.equal(dialAngle(500,100),dialAngle(100,100));
});

test('from the seated eye the steering wheel never hides the readouts, on any body',()=>withDocument(()=>{
 const raycaster=new THREE.Raycaster(),direction=new THREE.Vector3(),point=new THREE.Vector3();
 // Readout boxes on the gauge canvas, in pixels: speed digits, gear, range and nitro, both needle hubs.
 const boxes={speed:[150,184,234,222],gear:[534,184,618,222],range:[344,188,424,248],speedHub:[180,116,204,140],revHub:[564,116,588,140]};
 for(const style of ENVELOPES){
  const {cockpit,eyeWorld}=seated(style),face=cockpit.parts.binnacle.children.find(mesh=>mesh.geometry.type==='PlaneGeometry'),occluders=[];
  cockpit.parts.column.traverse(object=>{if(object.isMesh&&object.visible)occluders.push(object);});
  assert.ok(face&&occluders.length>5,style);
  for(const [name,[x0,y0,x1,y1]] of Object.entries(boxes)){
   let hidden=0,total=0;
   for(let px=x0;px<=x1;px+=6)for(let py=y0;py<=y1;py+=6){
    point.set((px/GAUGE_CANVAS.binnacle-.5)*GAUGE_FACE.width,(.5-py/GAUGE_CANVAS.height)*GAUGE_FACE.height,0).applyMatrix4(face.matrixWorld);
    const reach=point.distanceTo(eyeWorld);raycaster.set(eyeWorld,direction.copy(point).sub(eyeWorld).normalize());raycaster.far=reach-.002;
    total++;if(raycaster.intersectObjects(occluders,false).length)hidden++;
   }
   assert.equal(hidden,0,`${style}: ${hidden}/${total} samples of the ${name} readout are behind the wheel`);
  }
 }
}));

test('mirror and inclinometer are in a 16:9 view, and the mirror hangs inside the cabin',()=>withDocument(()=>{
 const corner=new THREE.Vector3();
 for(const style of ENVELOPES){
  const {car,cockpit,eye,eyeWorld}=seated(style),cabin=car.cabin,camera=new THREE.PerspectiveCamera(povFov(16/9,0),16/9,.09,100);
  camera.position.copy(eyeWorld);camera.quaternion.copy(car.mesh.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(eye.pitch,0,0,'YXZ')));camera.updateMatrixWorld();
  const project=(object,x,y)=>corner.set(x,y,0).applyMatrix4(object.matrixWorld).project(camera).clone();
  for(const [x,y] of [[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sy])=>[sx*MIRROR.width/2,sy*MIRROR.height/2])){
   const ndc=project(cockpit.parts.glass,x,y);
   assert.ok(Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1&&ndc.z<1,`${style}: mirror corner on screen at ${ndc.x.toFixed(2)}, ${ndc.y.toFixed(2)}`);
  }
  const pod=project(cockpit.parts.pod,0,0);assert.ok(Math.abs(pod.x)<.92&&Math.abs(pod.y)<1,`${style}: inclinometer centre at ${pod.x.toFixed(2)}, ${pod.y.toFixed(2)}`);
  // Windshield plane from its bottom edge to its top edge, in the truck's own units.
  const bottom={y:1.65,z:-.51*cabin.wheelbase},top={y:cabin.roofY-.1,z:(cabin.front-.015)*cabin.wheelbase},inverse=car.mesh.matrixWorld.clone().invert();
  const housing=cockpit.parts.mirror.children.find(mesh=>mesh.geometry.type==='BoxGeometry'),{width,height,depth}=housing.geometry.parameters;
  for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
   corner.set(sx*width/2,sy*height/2,sz*depth/2).applyMatrix4(housing.matrixWorld).applyMatrix4(inverse);
   const glassZ=bottom.z+(top.z-bottom.z)*(corner.y-bottom.y)/(top.y-bottom.y);
   assert.ok(corner.z>glassZ,`${style}: mirror housing corner pokes ${(glassZ-corner.z).toFixed(3)} through the windshield`);
   assert.ok(corner.y<cabin.roofY-.065+1e-6||cabin.open,`${style}: mirror housing is below the headliner`);
  }
  assert.equal(cockpit.parts.stalk.visible,!cabin.open,style);
 }
}));

test('the player truck keeps its steering wheel in every view; only the seat shows dials and mirror',()=>withDocument(()=>{
 for(const style of ['classic','sky']){
  const car=createBronco(style,'07',{driverSeat:true}),cockpit=createCockpit(),{parts}=cockpit,open=cabinEnvelope(style).open;
  cockpit.attach(car);
  assert.equal(cockpit.visible,false);assert.equal(cockpit.rig.visible,true,'wheel and column are part of the truck');assert.equal(cockpit.rig.parent,car.mesh);
  assert.equal(parts.column.visible,true);assert.deepEqual([parts.binnacle.visible,parts.pod.visible,parts.mirror.visible,parts.gloves.visible],[false,false,false,false]);
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
 const {column}=cockpit.parts;assert.ok(Math.abs(column.position.y-(eyePoint('cockpit',second.cabin).y-.31))<1e-9,'re-seated for the lower roof');
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

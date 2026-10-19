import RAPIER from '@dimforge/rapier3d-compat';
import {Quaternion,Vector3} from 'three';
import {engineById} from './engines.js';
import {powertrainStep} from './powertrain.js';
import {WHEEL_LAYOUT,VEHICLE_SCALE,TIRE_RADIUS} from './contact.js';
export const GRAVITY=9.81,CHASSIS_HEIGHT=1.5,REST_LENGTH=.55;
export const initPhysics=()=>RAPIER.init();
const q=new Quaternion(),forward=new Vector3(),up=new Vector3();
export function createPhysics(terrain,bounds){
 const world=new RAPIER.World({x:0,y:-GRAVITY,z:0});world.timestep=1/120;world.numSolverIterations=8;
 world.createCollider(RAPIER.ColliderDesc.trimesh(terrain.positions,terrain.indices).setFriction(.75).setRestitution(.03));
 world.createCollider(RAPIER.ColliderDesc.cuboid((bounds.max.x-bounds.min.x)/2+80,.5,(bounds.max.z-bounds.min.z)/2+80).setTranslation((bounds.min.x+bounds.max.x)/2,-.75,(bounds.min.z+bounds.max.z)/2).setFriction(.8));
 const vehicles=new Set();
 function add(car){
  const mass=car.style==='classic'?1650:2050;
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCanSleep(false).setCcdEnabled(true).setLinearDamping(.025).setAngularDamping(.9));
  world.createCollider(RAPIER.ColliderDesc.cuboid(1.23,.48,2.28).setTranslation(0,.05,0).setMass(mass*.86).setFriction(.65).setRestitution(.08),body);
  world.createCollider(RAPIER.ColliderDesc.cuboid(1.16,.53,1.22).setTranslation(0,1.19,.65).setMass(mass*.14).setFriction(.6).setRestitution(.05),body);
  const controller=world.createVehicleController(body);controller.indexUpAxis=1;controller.setIndexForwardAxis=2;
  const tireColliders=[];
  WHEEL_LAYOUT.forEach((w,i)=>{
   controller.addWheel({x:w.x*VEHICLE_SCALE,y:-.15,z:w.z*VEHICLE_SCALE},{x:0,y:-1,z:0},{x:-1,y:0,z:0},REST_LENGTH,TIRE_RADIUS*VEHICLE_SCALE);
   controller.setWheelSuspensionStiffness(i,65);controller.setWheelSuspensionCompression(i,4.4);controller.setWheelSuspensionRelaxation(i,5.2);
   controller.setWheelMaxSuspensionTravel(i,.42);controller.setWheelMaxSuspensionForce(i,mass*24);
   controller.setWheelFrictionSlip(i,1.35);controller.setWheelSideFrictionStiffness(i,.8);
   // A smaller collision envelope catches the tires when the truck is on its side.
   tireColliders.push(world.createCollider(RAPIER.ColliderDesc.ball(.58).setTranslation(w.x*VEHICLE_SCALE,-.15-REST_LENGTH,w.z*VEHICLE_SCALE).setMass(0).setFriction(.8),body));
  });
  const vehicle={body,controller,mass,tireColliders,steer:0};car.physics=vehicle;vehicles.add(car);return vehicle;
 }
 function reset(car){
  const v=car.physics??add(car),rotation=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),car.heading);
  v.body.setTranslation({x:car.x,y:terrain.heightAt(car.x,car.z)+CHASSIS_HEIGHT+.15,z:car.z},true);v.body.setRotation(rotation,true);
  v.body.setLinvel({x:0,y:0,z:0},true);v.body.setAngvel({x:0,y:0,z:0},true);v.steer=0;car.rolloverTime=0;car.rollover=false;
  for(let i=0;i<4;i++){v.controller.setWheelEngineForce(i,0);v.controller.setWheelBrake(i,0);v.controller.setWheelSteering(i,0);}
 }
 function input(car,input,dt){
  const v=car.physics,c=v.controller;
  const mass=car.style==='classic'?1650:2050;
  if(mass!==v.mass){v.body.collider(0).setMass(mass*.86);v.body.collider(1).setMass(mass*.14);v.mass=mass;for(let i=0;i<4;i++)c.setWheelMaxSuspensionForce(i,mass*24);}
  q.copy(v.body.rotation());forward.set(0,0,-1).applyQuaternion(q);
  const state=car.powertrain;
  // Kick down under climbing load rather than lugging a high gear up the ramp.
  if(!car.airborne&&forward.y>.12&&input.throttle>.5&&state?.gear>1&&state.cooldown<=0&&state.rpm<engineById(car.engineId).redline*.6){state.gear--;state.cooldown=.8;state.shiftTime=.12;}
  const drive=powertrainStep(car,input,dt);
  // Player input retains the requested one-fifth steering sensitivity.
  const desired=(input.steer??0)*(input.ai?.38:.4);
  v.steer+=(desired-v.steer)*(1-Math.exp(-dt*9));
  const drag=-car.speed*(input.onDirt?.16:.6);
  const force=(drive.acceleration+drag)*v.mass/4;
  const braking=input.brake&&car.speed>.1?5.2*v.mass*dt/4:0;
  for(let i=0;i<4;i++){
   const layout=WHEEL_LAYOUT[i];
   let angle=0;if(layout.z<0&&Math.abs(v.steer)>.0001){const radius=2.506/Math.tan(v.steer);angle=Math.atan(2.506/(radius-layout.x*1.4));}
   c.setWheelSteering(i,angle);c.setWheelEngineForce(i,car.rollover?0:-force);c.setWheelBrake(i,braking);
   c.setWheelFrictionSlip(i,(input.onDirt?1.35:.8)+(input.tires??0)*.08);
  }
  // Only actual wheel contacts can transfer engine/brake/steering forces.
  c.updateVehicle(dt,undefined,undefined,collider=>collider.parent()?.handle!==v.body.handle);
 }
 function sync(car,dt){
  const v=car.physics,b=v.body,c=v.controller,p=b.translation(),velocity=b.linvel();q.copy(b.rotation());
  forward.set(0,0,-1).applyQuaternion(q);up.set(0,1,0).applyQuaternion(q);
  car.x=p.x;car.z=p.z;car.vx=velocity.x;car.vz=velocity.z;car.vertical=velocity.y;
  car.heading=Math.atan2(-forward.x,-forward.z);car.speed=velocity.x*forward.x+velocity.y*forward.y+velocity.z*forward.z;
  car.airborne=!WHEEL_LAYOUT.some((_,i)=>c.wheelIsInContact(i));car.height=p.y-CHASSIS_HEIGHT;
  car.rollover=up.y<.35;car.rolloverTime=car.rollover?(car.rolloverTime??0)+dt:0;
  car.suspensionLengths=WHEEL_LAYOUT.map((_,i)=>c.wheelSuspensionLength(i)??REST_LENGTH);
  v.tireColliders.forEach((collider,i)=>{const w=WHEEL_LAYOUT[i];collider.setTranslationWrtParent({x:w.x*1.4,y:-.15-car.suspensionLengths[i],z:w.z*1.4});});
 }
 return {world,add,reset,input,sync,step(){world.step();},dispose(){for(const car of vehicles)delete car.physics;world.free();},
  addBarrier(x,y,z){world.createCollider(RAPIER.ColliderDesc.cylinder(.38,.48).setTranslation(x,y+.38,z).setFriction(.8).setRestitution(.1));}};
}

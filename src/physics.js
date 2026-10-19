import RAPIER from '@dimforge/rapier3d-compat';
import {Quaternion,Vector3} from 'three';
import {powertrainStep} from './powertrain.js';
import {vehicleMassProperties} from './vehicle-mass.js';
import {drivingControls,rollingResistance,BRAKE_DECELERATION,steeringStep} from './driving-controls.js';
import {WHEEL_LAYOUT,VEHICLE_SCALE,TIRE_RADIUS} from './contact.js';
export const GRAVITY=9.81,CHASSIS_HEIGHT=1.5,REST_LENGTH=.55;
export const initPhysics=()=>RAPIER.init();
const q=new Quaternion(),forward=new Vector3(),up=new Vector3();
export function createPhysics(terrain,bounds){
 const world=new RAPIER.World({x:0,y:-GRAVITY,z:0});world.timestep=1/120;world.numSolverIterations=8;
 world.createCollider(RAPIER.ColliderDesc.trimesh(terrain.positions,terrain.indices).setFriction(.75).setRestitution(.03));
 world.createCollider(RAPIER.ColliderDesc.cuboid((bounds.max.x-bounds.min.x)/2+80,.5,(bounds.max.z-bounds.min.z)/2+80).setTranslation((bounds.min.x+bounds.max.x)/2,-.75,(bounds.min.z+bounds.max.z)/2).setFriction(.8));
 const vehicles=new Set(),barriers=[],barrierBodies=new Set(),barrierGrid=new Map(),cellSize=12;
 function activateBarriers(car){
  const reach=12+Math.min(12,Math.abs(car.speed??0)*.4);
  for(let x=Math.floor((car.x-reach)/cellSize);x<=Math.floor((car.x+reach)/cellSize);x++)for(let z=Math.floor((car.z-reach)/cellSize);z<=Math.floor((car.z+reach)/cellSize);z++){
   for(const prop of barrierGrid.get(`${x},${z}`)??[])if(!prop.active&&(prop.origin.x-car.x)**2+(prop.origin.z-car.z)**2<reach*reach){prop.active=true;prop.body.setEnabled(true);prop.body.wakeUp();}
  }
 }
 function add(car){
  const properties=vehicleMassProperties(car.style,car.engineId),{mass}=properties;
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCanSleep(false).setCcdEnabled(true).setLinearDamping(.025).setAngularDamping(.9));
  world.createCollider(RAPIER.ColliderDesc.cuboid(1.23,.48,2.28).setTranslation(0,.05,0).setMass(0).setFriction(.65).setRestitution(.08),body);
  world.createCollider(RAPIER.ColliderDesc.cuboid(1.16,.53,1.22).setTranslation(0,1.19,.65).setMass(0).setFriction(.6).setRestitution(.05),body);
  body.setAdditionalMassProperties(mass,properties.centerOfMass,properties.principalAngularInertia,properties.angularInertiaLocalFrame,true);
  body.recomputeMassPropertiesFromColliders();
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
  const vehicle={body,controller,mass,tireColliders,steer:0,controls:{brakePressure:0,stoppedTime:0,reverse:false,reverseTravel:false},massKey:`${car.style}:${car.engineId}`};car.physics=vehicle;vehicles.add(car);return vehicle;
 }
 function reset(car){
  const v=car.physics??add(car),rotation=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),car.heading);
  v.body.setTranslation({x:car.x,y:terrain.heightAt(car.x,car.z)+CHASSIS_HEIGHT+.15,z:car.z},true);v.body.setRotation(rotation,true);
  v.body.setLinvel({x:0,y:0,z:0},true);v.body.setAngvel({x:0,y:0,z:0},true);v.steer=0;v.controls={brakePressure:0,stoppedTime:0,reverse:false,reverseTravel:false};car.rolloverTime=0;car.rollover=false;
  for(let i=0;i<4;i++){v.controller.setWheelEngineForce(i,0);v.controller.setWheelBrake(i,0);v.controller.setWheelSteering(i,0);}
 }
 function input(car,input,dt){
  activateBarriers(car);
  const v=car.physics,c=v.controller;
  const properties=vehicleMassProperties(car.style,car.engineId),{mass}=properties;
  const massKey=`${car.style}:${car.engineId}`;
  if(massKey!==v.massKey){
   v.body.setAdditionalMassProperties(mass,properties.centerOfMass,properties.principalAngularInertia,properties.angularInertiaLocalFrame,true);v.body.recomputeMassPropertiesFromColliders();
   v.mass=mass;v.massKey=massKey;for(let i=0;i<4;i++)c.setWheelMaxSuspensionForce(i,mass*24);
  }
  q.copy(v.body.rotation());forward.set(0,0,-1).applyQuaternion(q);
  const controls=drivingControls(v.controls,{...input,airborne:car.airborne},car.speed,dt);
  const drive=powertrainStep(car,{...input,...controls,slope:forward.y},dt);
  // Keyboard presses build toward full parking lock, with less lock at speed.
  v.steer=steeringStep(v.steer,input.steer,car.speed,dt,input.ai,input.steeringMode,input.centerSteering);
  const drag=-Math.sign(car.speed)*rollingResistance(car.speed,input.onDirt);
  // Loose dirt cannot turn every extra engine/nitro torque into thrust.
  // Limit longitudinal traction, preserving physical weight transfer and
  // full pitch/roll freedom instead of adding an artificial anti-flip torque.
  const traction=GRAVITY*(input.onDirt?1.0:.7)*(1+(input.tires??0)*.04);
  const pedalBrake=BRAKE_DECELERATION*controls.brakePressure;
  const brakingForward=input.brake&&!controls.reverse;
  let acceleration=drive.acceleration+drag;
  let braking=0;
  if(brakingForward){
   // Rapier's wheel controller chooses engine force OR brake impulse. Put
   // service brake, engine braking and rolling resistance in one channel.
   const deceleration=pedalBrake+Math.abs(drag)+Math.abs(drive.engineBraking);
   const holding=Math.abs(car.speed)<.2?GRAVITY*controls.brakePressure:0;
   braking=Math.max(deceleration,holding)*v.mass*dt/4;
   acceleration=0;
  }else acceleration-=Math.sign(car.speed)*pedalBrake;
  const force=Math.max(-traction,Math.min(traction,acceleration))*v.mass/4;
  for(let i=0;i<4;i++){
   const layout=WHEEL_LAYOUT[i];
   let angle=0;if(layout.z<0&&Math.abs(v.steer)>.0001){const radius=2.506/Math.tan(v.steer);angle=Math.atan(2.506/(radius+layout.x*1.4));}
   c.setWheelSteering(i,angle);c.setWheelEngineForce(i,car.rollover?0:-force);c.setWheelBrake(i,braking);
   c.setWheelFrictionSlip(i,(input.onDirt?1.35:.8)+(input.tires??0)*.08);
  }
  // Only actual wheel contacts can transfer engine/brake/steering forces.
  c.updateVehicle(dt,undefined,undefined,collider=>collider.parent()?.handle!==v.body.handle&&!barrierBodies.has(collider.parent()?.handle));
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
  resetBarriers(){for(const prop of barriers){const {body,origin}=prop;prop.active=false;body.setTranslation(origin,true);body.setRotation({x:0,y:0,z:0,w:1},true);body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);body.sleep();body.setEnabled(false);}},
  addBarrier(x,y,z,{kind='tires',layers=2}={}){
   // Light, sleeping props wake on impact; they are never immovable walls.
   const origin={x,y,z},body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,z).setLinearDamping(.35).setAngularDamping(.45).setCcdEnabled(true));
   const collider=desc=>world.createCollider(desc.setFriction(.65).setRestitution(.12),body);
   if(kind==='cone'){
    collider(RAPIER.ColliderDesc.cuboid(.425,.06,.425).setTranslation(0,.06,0).setMass(1.8));
    collider(RAPIER.ColliderDesc.cone(.62,.38).setTranslation(0,.74,0).setMass(1.2));
   }else for(let layer=0;layer<layers;layer++)collider(RAPIER.ColliderDesc.cylinder(.16,.55).setTranslation(0,.17+layer*.32,0).setMass(10));
   const prop={body,origin,active:false},key=`${Math.floor(x/cellSize)},${Math.floor(z/cellSize)}`;
   barriers.push(prop);if(!barrierGrid.has(key))barrierGrid.set(key,[]);barrierGrid.get(key).push(prop);
   barrierBodies.add(body.handle);body.sleep();body.setEnabled(false);return body;
  }};
}

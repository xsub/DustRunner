import {tuning as cfg,tuningRevision,DEFAULT_TUNING} from './tuning.js';
import RAPIER from '@dimforge/rapier3d-compat';
import {Quaternion,Vector3} from 'three';
import {axleWheelForces,driveModeById} from './drive-modes.js';
import {powertrainStep} from './powertrain.js';
import {vehicleMassProperties} from './vehicle-mass.js';
import {isOpenBody,rollCageSegments} from './body-types.js';
import {drivingControls,rollingResistance,steeringStep} from './driving-controls.js';
import {arcadePedals,arcadeSteering,descentDeceleration} from './handling.js';
import {WHEEL_LAYOUT,VEHICLE_SCALE,TIRE_RADIUS} from './contact.js';
export const GRAVITY=DEFAULT_TUNING.gravity,CHASSIS_HEIGHT=1.5,REST_LENGTH=.55;
export const initPhysics=()=>RAPIER.init();
const q=new Quaternion(),forward=new Vector3(),up=new Vector3();
export function createPhysics(terrain,bounds){
 const world=new RAPIER.World({x:0,y:-cfg.gravity,z:0});world.timestep=1/120;world.numSolverIterations=cfg.solverIterations;
 world.createCollider(RAPIER.ColliderDesc.trimesh(terrain.positions,terrain.indices).setFriction(cfg.groundFriction).setRestitution(.03));
 world.createCollider(RAPIER.ColliderDesc.cuboid((bounds.max.x-bounds.min.x)/2+80,.5,(bounds.max.z-bounds.min.z)/2+80).setTranslation((bounds.min.x+bounds.max.x)/2,-.75,(bounds.min.z+bounds.max.z)/2).setFriction(.8));
 const vehicles=new Set(),barriers=[],barrierBodies=new Set(),barrierGrid=new Map(),cellSize=12,activeMarkers=new Set();
 let markerBudget=Infinity,visibleMarkers=0,hasMarkerView=false;
 function moveMarkerCell(prop){
  const key=`${Math.floor(prop.position.x/cellSize)},${Math.floor(prop.position.z/cellSize)}`;
  if(prop.cell===key)return;
  if(prop.cell){const list=barrierGrid.get(prop.cell),i=list.indexOf(prop);if(i>=0)list.splice(i,1);}
  if(!barrierGrid.has(key))barrierGrid.set(key,[]);barrierGrid.get(key).push(prop);prop.cell=key;
 }
 function anchorMarker(prop,restore=false){
  const {body}=prop;
  const position=restore?{...prop.origin}:{x:prop.position.x,y:terrain.heightAt(prop.position.x,prop.position.z)+.01,z:prop.position.z};
  body.setTranslation(position,false);body.setRotation({x:0,y:0,z:0,w:1},false);body.setLinvel({x:0,y:0,z:0},false);body.setAngvel({x:0,y:0,z:0},false);body.sleep();body.setEnabled(false);
  prop.position=position;prop.rotation={x:0,y:0,z:0,w:1};prop.active=false;prop.version++;activeMarkers.delete(prop);moveMarkerCell(prop);
 }
 function setMarkerVisibility(isVisible){
  hasMarkerView=true;visibleMarkers=0;
  for(const prop of barriers){prop.visible=Boolean(isVisible(prop.position));if(prop.visible)visibleMarkers++;}
  markerBudget=Math.floor(visibleMarkers*.1);
  for(const prop of activeMarkers)if(!prop.visible)anchorMarker(prop);
  // Enforce the quota immediately even when the view shrinks or turns away.
  if(activeMarkers.size>markerBudget){
   const distance=prop=>{let best=Infinity;for(const car of vehicles)best=Math.min(best,(prop.position.x-car.x)**2+(prop.position.z-car.z)**2);return best;};
   const farthest=[...activeMarkers].sort((a,b)=>distance(b)-distance(a));
   while(activeMarkers.size>markerBudget)anchorMarker(farthest.shift());
  }
 }
 function activateBarriers(car){
  const reach=6,cos=Math.cos(car.heading),sin=Math.sin(car.heading),ahead=3.25+Math.min(1,Math.abs(car.speed??0)*.025);
  for(let x=Math.floor((car.x-reach)/cellSize);x<=Math.floor((car.x+reach)/cellSize);x++)for(let z=Math.floor((car.z-reach)/cellSize);z<=Math.floor((car.z+reach)/cellSize);z++){
   for(const prop of barrierGrid.get(`${x},${z}`)??[]){
    if(prop.active||!prop.visible||activeMarkers.size>=markerBudget)continue;
    const dx=prop.position.x-car.x,dz=prop.position.z-car.z;
    // Wake only in the truck's swept footprint, never merely because it is nearby.
    if(Math.abs(dx*cos-dz*sin)>1.9||Math.abs(-dx*sin-dz*cos)>ahead)continue;
    const group=(prop.group??[prop]).filter(member=>!member.active);
    if(group.some(member=>!member.visible)||activeMarkers.size+group.length>markerBudget)continue;
    for(const member of group){member.active=true;member.age=0;activeMarkers.add(member);member.body.setEnabled(true);member.body.wakeUp();}
   }
  }
 }
 function updateMarkers(){
  for(const prop of activeMarkers){
   prop.age+=world.timestep;prop.position=prop.body.translation();prop.rotation=prop.body.rotation();prop.version++;
   let near=false;for(const car of vehicles)if((car.x-prop.position.x)**2+(car.z-prop.position.z)**2<64){near=true;break;}
   if(prop.body.isSleeping()||(!near&&prop.age>.6))anchorMarker(prop);
  }
 }
 function add(car){
  const properties=vehicleMassProperties(car.style,car.engineId),{mass}=properties;
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCanSleep(false).setCcdEnabled(true).setLinearDamping(cfg.linearDamping).setAngularDamping(cfg.angularDamping));
  world.createCollider(RAPIER.ColliderDesc.cuboid(1.23,.48,2.28).setTranslation(0,.05,0).setMass(0).setFriction(.65).setRestitution(cfg.bodyBounce),body);
  if(isOpenBody(car.style)){
   for(const [a,b] of rollCageSegments(car.style)){
    const from=new Vector3(...a).multiplyScalar(VEHICLE_SCALE),to=new Vector3(...b).multiplyScalar(VEHICLE_SCALE);from.y-=CHASSIS_HEIGHT;to.y-=CHASSIS_HEIGHT;
    const delta=to.clone().sub(from),center=from.clone().add(to).multiplyScalar(.5),rotation=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),delta.clone().normalize());
    world.createCollider(RAPIER.ColliderDesc.cuboid(.075,delta.length()/2,.075).setTranslation(center.x,center.y,center.z).setRotation(rotation).setMass(0).setFriction(.6).setRestitution(cfg.bodyBounce/2),body);
   }
  }else world.createCollider(RAPIER.ColliderDesc.cuboid(1.16,.53,1.22).setTranslation(0,1.19,.65).setMass(0).setFriction(.6).setRestitution(cfg.bodyBounce/2),body);
  body.setAdditionalMassProperties(mass,properties.centerOfMass,properties.principalAngularInertia,properties.angularInertiaLocalFrame,true);
  body.recomputeMassPropertiesFromColliders();
  const controller=world.createVehicleController(body);controller.indexUpAxis=1;controller.setIndexForwardAxis=2;
  const tireColliders=[];
  WHEEL_LAYOUT.forEach((w,i)=>{
   controller.addWheel({x:w.x*VEHICLE_SCALE,y:-.15,z:w.z*VEHICLE_SCALE},{x:0,y:-1,z:0},{x:-1,y:0,z:0},cfg.restLength,TIRE_RADIUS*VEHICLE_SCALE);
   controller.setWheelSuspensionStiffness(i,cfg.spring);controller.setWheelSuspensionCompression(i,cfg.compression);controller.setWheelSuspensionRelaxation(i,cfg.rebound);
   controller.setWheelMaxSuspensionTravel(i,cfg.suspensionTravel);controller.setWheelMaxSuspensionForce(i,mass*cfg.suspensionForce);
   controller.setWheelFrictionSlip(i,cfg.roadGrip);controller.setWheelSideFrictionStiffness(i,cfg.sideGrip);
   // A smaller collision envelope catches the tires when the truck is on its side.
   tireColliders.push(world.createCollider(RAPIER.ColliderDesc.ball(.58).setTranslation(w.x*VEHICLE_SCALE,-.15-cfg.restLength,w.z*VEHICLE_SCALE).setMass(0).setFriction(.8),body));
  });
  const vehicle={body,controller,mass,tireColliders,steer:0,controls:{brakePressure:0,stoppedTime:0,reverse:false,reverseTravel:false},arcade:{},massKey:`${car.style}:${car.engineId}:${tuningRevision()}`};car.physics=vehicle;vehicles.add(car);return vehicle;
 }
 function reset(car){
  const v=car.physics??add(car),rotation=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),car.heading);
  v.body.setTranslation({x:car.x,y:terrain.heightAt(car.x,car.z)+CHASSIS_HEIGHT+.15,z:car.z},true);v.body.setRotation(rotation,true);
  v.body.setLinvel({x:0,y:0,z:0},true);v.body.setAngvel({x:0,y:0,z:0},true);v.steer=0;v.arcade={};v.descentActive=false;v.controls={brakePressure:0,stoppedTime:0,reverse:false,reverseTravel:false};car.rolloverTime=0;car.rollover=false;
  for(let i=0;i<4;i++){v.controller.setWheelEngineForce(i,0);v.controller.setWheelBrake(i,0);v.controller.setWheelSteering(i,0);}
 }
 function refreshMass(car){
  const v=car.physics,c=v.controller;
  const properties=vehicleMassProperties(car.style,car.engineId),{mass}=properties;
  const massKey=`${car.style}:${car.engineId}:${tuningRevision()}`;
  if(massKey!==v.massKey){
   v.body.setAdditionalMassProperties(mass,properties.centerOfMass,properties.principalAngularInertia,properties.angularInertiaLocalFrame,true);v.body.recomputeMassPropertiesFromColliders();
   v.mass=mass;v.massKey=massKey;for(let i=0;i<4;i++)c.setWheelMaxSuspensionForce(i,mass*cfg.suspensionForce);
  }
 }
 function input(car,input,dt){
  activateBarriers(car);refreshMass(car);
  const v=car.physics,c=v.controller;
  const arcade=car.handlingProfile==='arcade'&&!input.ai;
  if(arcade)input=arcadePedals(v.arcade,input,dt);
  q.copy(v.body.rotation());forward.set(0,0,-1).applyQuaternion(q);
  const controls=drivingControls(v.controls,{...input,airborne:car.airborne},car.speed,dt);
  const drive=powertrainStep(car,{...input,...controls,slope:forward.y},dt);
  // Keyboard presses build toward full parking lock, with less lock at speed.
  const lateralSpeed=(car.vx??0)*Math.cos(car.heading)-(car.vz??0)*Math.sin(car.heading);
  v.steer=arcade?arcadeSteering(v.steer,input.steer,car.speed,lateralSpeed,dt,{mode:input.steeringMode,center:input.centerSteering,airborne:car.airborne}):steeringStep(v.steer,input.steer,car.speed,dt,input.ai,input.steeringMode,input.centerSteering);
  const drag=-Math.sign(car.speed)*rollingResistance(car.speed,input.onDirt);
  // Loose dirt cannot turn every extra engine/nitro torque into thrust.
  // Limit longitudinal traction, preserving physical weight transfer and
  // full pitch/roll freedom instead of adding an artificial anti-flip torque.
  const traction=cfg.gravity*(input.onDirt?cfg.roadTraction:cfg.offroadTraction)*(1+(input.tires??0)*.04);
  const pedalBrake=cfg.brakeDeceleration*controls.brakePressure;
  const brakingForward=input.brake&&!controls.reverse;
  const contacts=WHEEL_LAYOUT.map((_,i)=>c.wheelIsInContact(i));
  const descent=descentDeceleration({enabled:arcade&&car.hillDescent,mode:car.powertrain.mode,speed:car.speed,slope:forward.y,throttle:input.throttle,brake:input.brake,contacts:contacts.filter(Boolean).length,rollover:car.rollover});v.descentActive=descent>0;
  let acceleration=drive.acceleration+drag;
  let braking=0;
  if(brakingForward||descent>0){
   // Rapier's wheel controller chooses engine force OR brake impulse. Put
   // service brake, engine braking and rolling resistance in one channel.
   const deceleration=pedalBrake+Math.abs(drag)+Math.abs(drive.engineBraking);
   const holding=Math.abs(car.speed)<.2?cfg.gravity*controls.brakePressure:0;
   braking=Math.max(deceleration,holding,descent)*v.mass*dt/4;
   acceleration=0;
  }else acceleration-=Math.sign(car.speed)*pedalBrake;
  const force=Math.max(-traction,Math.min(traction,acceleration))*v.mass/4;
  const wheelForces=axleWheelForces(force,contacts,car.powertrain.locks,driveModeById(car.powertrain.mode).id==='auto');
  v.wheelForces=wheelForces;
  for(let i=0;i<4;i++){
   const layout=WHEEL_LAYOUT[i];
   let angle=0;if(layout.z<0&&Math.abs(v.steer)>.0001){const radius=2.506/Math.tan(v.steer);angle=Math.atan(2.506/(radius+layout.x*1.4));}
   const rearBrake=layout.z>0?cfg.handbrakeDeceleration*(Number(input.handbrake)||0)*v.mass*dt/2:0;
   c.setWheelSteering(i,angle);c.setWheelEngineForce(i,car.rollover||rearBrake>0?0:-wheelForces[i]);c.setWheelBrake(i,Math.max(braking,rearBrake));
   c.setWheelFrictionSlip(i,(input.onDirt?cfg.roadGrip:cfg.offroadGrip)+(input.tires??0)*.08);
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
  car.suspensionLengths=WHEEL_LAYOUT.map((_,i)=>c.wheelSuspensionLength(i)??cfg.restLength);
  v.tireColliders.forEach((collider,i)=>{const w=WHEEL_LAYOUT[i];collider.setTranslationWrtParent({x:w.x*1.4,y:-.15-car.suspensionLengths[i],z:w.z*1.4});});
 }
 return {world,add,reset,input,sync,refreshMass,addBoundary(x,z,hx,hz,height){world.createCollider(RAPIER.ColliderDesc.cuboid(hx,height,hz).setTranslation(x,height,z).setFriction(.8));},setMarkerVisibility,getStats(){return {awake:vehicles.size+activeMarkers.size,bodies:vehicles.size+barriers.length,visibleMarkers:hasMarkerView?visibleMarkers:barriers.length,movingMarkers:activeMarkers.size,markerBudget:hasMarkerView?markerBudget:barriers.length};},step(){world.step();updateMarkers();},dispose(){for(const car of vehicles)delete car.physics;world.free();},
  resetBarriers(){for(const prop of barriers)anchorMarker(prop,true);},
  addBarrier(x,y,z,{kind='tires',layers=2}={}){
   const makeBody=(height)=>world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,height,z).setLinearDamping(cfg.propLinearDamping).setAngularDamping(cfg.propAngularDamping).setCcdEnabled(true));
   const register=(body,height)=>{
    const prop={body,origin:{x,y:height,z},position:{x,y:height,z},rotation:{x:0,y:0,z:0,w:1},active:false,visible:true,version:0,age:0};
    body.markerState=prop;barriers.push(prop);moveMarkerCell(prop);
    barrierBodies.add(body.handle);body.sleep();body.setEnabled(false);
   };
   if(kind==='cone'){
    const body=makeBody(y);
    world.createCollider(RAPIER.ColliderDesc.cuboid(.425,.06,.425).setTranslation(0,.06,0).setMass(cfg.coneMass*.6).setFriction(cfg.coneFriction).setRestitution(cfg.propBounce),body);
    world.createCollider(RAPIER.ColliderDesc.cone(.62,.38).setTranslation(0,.74,0).setMass(cfg.coneMass*.4).setFriction(cfg.coneFriction).setRestitution(cfg.propBounce),body);
    register(body,y);return body;
   }
   // Separate light tires scatter instead of wedging a rigid stack under a truck.
   const tires=[];
   for(let layer=0;layer<layers;layer++){
    const height=y+layer*.32,body=makeBody(height);
    world.createCollider(RAPIER.ColliderDesc.cylinder(.16,.55).setTranslation(0,.17,0).setMass(cfg.tireMass).setFriction(cfg.tireFriction).setRestitution(cfg.propBounce),body);
    register(body,height);tires.push(body);
   }
   const group=tires.map(body=>body.markerState);for(const prop of group)prop.group=group;
   tires[0].tireBodies=tires;return tires[0];
  }};
}

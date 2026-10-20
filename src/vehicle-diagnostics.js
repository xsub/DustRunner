import {Quaternion,Vector3} from 'three';
import {WHEEL_LAYOUT,VEHICLE_SCALE,TIRE_RADIUS} from './contact.js';
import {engineById} from './engines.js';

// Read only, sampled by the HUD. Impulses belong to the last fixed physics
// step, so divide by that step's duration, never by the display frame time.
export function readVehicleDiagnostics(car,{dt=1/120,gravity=9.81}={}){
 const {body,controller}=car.physics,q=new Quaternion().copy(body.rotation());
 const forward=new Vector3(0,0,-1).applyQuaternion(q),right=new Vector3(1,0,0).applyQuaternion(q),up=new Vector3(0,1,0).applyQuaternion(q);
 const heading=Math.atan2(-forward.x,-forward.z),cos=Math.cos(heading),sin=Math.sin(heading);
 const project=v=>({x:v.x*cos-v.z*sin,y:v.y,forward:-v.x*sin-v.z*cos});
 const point=v=>project(new Vector3(v.x,v.y,v.z).applyQuaternion(q));
 const origin=body.translation(),mass=body.mass();
 const wheels=WHEEL_LAYOUT.map((layout,i)=>{
  const contact=controller.wheelIsInContact(i),rest=controller.wheelSuspensionRestLength(i)??.55,length=controller.wheelSuspensionLength(i)??rest;
  const attach=controller.wheelChassisConnectionPointCs(i)??{x:layout.x*VEHICLE_SCALE,y:-.15,z:layout.z*VEHICLE_SCALE};
  const radius=controller.wheelRadius(i)??TIRE_RADIUS*VEHICLE_SCALE,steer=controller.wheelSteering(i)??0;
  const normal=new Vector3().copy(contact?controller.wheelContactNormal(i)??up:up).normalize();
  const axle=new Vector3(-Math.cos(steer),0,Math.sin(steer)).applyQuaternion(q);
  axle.addScaledVector(normal,-axle.dot(normal)).normalize();
  const tangent=new Vector3().crossVectors(normal,axle).normalize();
  const support=contact?controller.wheelSuspensionForce(i)??0:0;
  // Rapier's +Z forward axis and -X axle are opposite to the car's driving
  // convention. Report +forward/+right, preserving the true force vectors.
  const longitudinal=contact?-(controller.wheelForwardImpulse(i)??0)/dt:0,lateral=contact?-(controller.wheelSideImpulse(i)??0)/dt:0;
  const hub=point({x:attach.x,y:attach.y-length,z:attach.z});
  const hit=contact?controller.wheelContactPoint(i):null;
  const ground=hit?project({x:hit.x-origin.x,y:hit.y-origin.y,z:hit.z-origin.z}):null;
  const rate=-(car.wheels?.[i]?.angularVelocity??0);
  return {index:i,contact,rest,length,radius,compression:rest-length,steer,rate,angle:car.wheels?.[i]?.angle??0,rpm:Math.abs(rate)*60/(2*Math.PI),speed:rate*radius*3.6,
   camber:Math.atan2((car.suspensionLengths?.[i%2]??length)-(car.suspensionLengths?.[i%2+2]??length),2*VEHICLE_SCALE),
   mount:point(attach),hub,ground,support,longitudinal,lateral,
   supportVector:project(normal.multiplyScalar(support)),tractionVector:project(tangent.multiplyScalar(-longitudinal)),sideVector:project(axle.multiplyScalar(-lateral))};
 });
 return {style:car.style,engine:engineById(car.engineId),rpm:car.powertrain?.rpm??engineById(car.engineId).idle,mass,weight:mass*gravity,center:point(body.localCom()),pitch:Math.atan2(forward.y,Math.hypot(forward.x,forward.z)),roll:Math.atan2(right.y,up.y),
  wheels,point,support:wheels.reduce((sum,w)=>sum+w.support,0),contacts:wheels.filter(w=>w.contact).length};
}

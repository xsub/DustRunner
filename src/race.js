import {carOutline} from './collision.js';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function angleDelta(target,current){return Math.atan2(Math.sin(target-current),Math.cos(target-current));}
export function advanceProgress(previous,next,checkpoint,lap,samples=600){
 const delta=(next-previous+samples)%samples;
 if(delta>samples/2)return {checkpoint,lap};
 const quarter=Math.floor(next/(samples/4));
 if(quarter===checkpoint+1)checkpoint=quarter;
 if(checkpoint===3&&next<samples/4&&previous>samples*.75){lap++;checkpoint=0;}
 return {checkpoint,lap};
}
export function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;}

// Fast throttle and yaw response, with a short, controllable lateral slide.
// World units and seconds keep the handling independent of rendering frame rate.
export function arcadeMotion(car,input,dt){
 // Tire forces require contact: steering, throttle, braking and nitro cannot
 // bend or accelerate a jump. Carry the actual takeoff velocity until landing.
 if(car.airborne){
   car.x+=car.vx*dt;car.z+=car.vz*dt;
   car.speed=(car.speed<0?-1:1)*Math.hypot(car.vx,car.vz);
   return;
 }
 const {throttle,steer,brake,boost,onDirt,engine=0,tires=0,ai=false,opponent=0}=input;
 const max=(ai?21.4+opponent*.35:23+engine*1.5)*(boost?1.42:1);
 // Progressive braking gives the truck a longer run-out; braking overrides throttle.
 car.speed+=(brake?-12:throttle*(boost?38:23))*dt;
 car.speed*=Math.exp(-dt*(onDirt?.55:1.6));
 car.speed=clamp(car.speed,-8,onDirt?max:max*.65);
 const yaw=(ai?3.2:3.65+tires*.12)*clamp(Math.abs(car.speed)/3,0,1);
 car.heading+=steer*yaw*dt*(car.speed<0?-1:1);
 const grip=1-Math.exp(-dt*((ai?10:9.5+tires*1.1)));
 car.vx+=(-Math.sin(car.heading)*car.speed-car.vx)*grip;
 car.vz+=(-Math.cos(car.heading)*car.speed-car.vz)*grip;
 car.x+=car.vx*dt;car.z+=car.vz*dt;
}

export function fitCircuitView(bounds,aspect){
 const cx=(bounds.minX+bounds.maxX)/2,cy=(bounds.minY+bounds.maxY)/2;
 // 6% at the sides, 8% top/bottom keeps the entire race visible beneath the HUD.
 let width=(bounds.maxX-bounds.minX)*1.06,height=(bounds.maxY-bounds.minY)*1.16;
 if(width/height<aspect)width=height*aspect;else height=width/aspect;
 return {left:cx-width/2,right:cx+width/2,top:cy+height/2,bottom:cy-height/2};
}

// Contact follows the terrain until a crest falls away faster than the truck.
// Airborne trucks then follow gravity and settle through a damped suspension.
export function updateSuspension(car,ground,dt) {
 const previousGround=car.lastGround??ground;
 const groundVelocity=(ground-previousGround)/dt;
 const wasAirborne=!!car.airborne;
 let landed=false;
 if(wasAirborne) {
   car.vertical-=28*dt;
   car.height+=car.vertical*dt;
   if(car.height<=ground) {
     const impact=Math.max(0,-car.vertical+groundVelocity);
     car.height=ground;car.airborne=false;car.vertical=groundVelocity;car.rampRiseVelocity=0;
     car.suspensionVelocity=-Math.min(impact*.2,2.6);
     car.speed*=1-Math.min(impact*.0025,.045);
     landed=true;
   }
 } else if((car.rampRiseVelocity??0)>1.2 && groundVelocity<=0 && (car.vertical??0)>0 && Math.abs(car.speed)>8) {
   car.airborne=true;
   car.vertical=clamp(car.rampRiseVelocity*.55,1.2,3.2);
   car.rampRiseVelocity=0;
   car.height=Math.max(car.height,ground);
 } else {
   car.rampRiseVelocity=groundVelocity>0?Math.max(car.rampRiseVelocity??0,groundVelocity):0;
   car.height=ground;car.vertical=groundVelocity;car.airborne=false;
 }
 car.lastGround=ground;
 car.suspensionVelocity=(car.suspensionVelocity??0)+(-(car.suspension??0)*95-(car.suspensionVelocity??0)*12)*dt;
 car.suspension=clamp((car.suspension??0)+car.suspensionVelocity*dt,-.24,.16);
 return {landed,airborne:car.airborne};
}

export function containOnTrack(car,edge,halfWidth){
 // Airborne trucks can clear low barriers; never guide them around a corner
 // with the track boundary when their tires are above the barrier tops.
 if(car.airborne&&car.height>(edge.ground??0)+.7)return;
 const nx=(car.x-edge.point.x)/(edge.distance||1),nz=(car.z-edge.point.z)/(edge.distance||1);
 const reach=Math.max(...carOutline(car).map(p=>(p.x-car.x)*nx+(p.z-car.z)*nz));
 const limit=halfWidth-reach-.08;
 if(edge.distance<=limit)return;
 car.x=edge.point.x+nx*limit;car.z=edge.point.z+nz*limit;
 const outward=car.vx*nx+car.vz*nz;
 if(outward>0){car.vx-=nx*outward;car.vz-=nz*outward;car.speed*=.9;}
}

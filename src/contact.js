import {clamp} from './race.js';

export const VEHICLE_SCALE=1.4;
export const TIRE_RADIUS=.602;
export const WHEEL_LAYOUT=[-1,1].flatMap(x=>[-.88,.91].map(z=>({x,z})));

// The same two triangles used by the rendered road, indexed in a spatial grid.
export function createRoadSurface(samples,tangents,heights,width){
 const grid=new Map(),cell=8,n=samples.length;
 const edges=samples.map((p,i)=>[-1,1].map(side=>({x:p.x-tangents[i].z*width*side,z:p.z+tangents[i].x*width*side,y:heights[i]})));
 for(let i=0;i<n;i++){
  const [a,b]=edges[i],[c,d]=edges[(i+1)%n];
  for(const triangle of [[a,b,c],[b,d,c]]){
   const xs=triangle.map(p=>p.x),zs=triangle.map(p=>p.z);
   for(let x=Math.floor(Math.min(...xs)/cell);x<=Math.floor(Math.max(...xs)/cell);x++)
    for(let z=Math.floor(Math.min(...zs)/cell);z<=Math.floor(Math.max(...zs)/cell);z++){
     const key=`${x},${z}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(triangle);
    }
  }
 }
 return (x,z)=>{
  let height=-.25;
  for(const [a,b,c] of grid.get(`${Math.floor(x/cell)},${Math.floor(z/cell)}`)??[]){
   const denominator=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
   if(Math.abs(denominator)<1e-10)continue;
   const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/denominator;
   const v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/denominator;
   if(u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7)height=Math.max(height,u*a.y+v*b.y+(1-u-v)*c.y);
  }
  return height;
 };
}

export function wheelContacts(car,heightAt){
 const s=Math.sin(car.heading),c=Math.cos(car.heading),radius=TIRE_RADIUS*VEHICLE_SCALE;
 return WHEEL_LAYOUT.map((w,i)=>{
  const x=car.x+(w.x*c+w.z*s)*VEHICLE_SCALE,z=car.z+(-w.x*s+w.z*c)*VEHICLE_SCALE;
  const angle=car.heading+(car.wheels?.[i]?.steer??0),ws=Math.sin(angle),wc=Math.cos(angle);
  let ground=heightAt(x,z);
  // Sample across the tire's bottom arc and its width: a ramp can touch the
  // leading edge before the point directly below the axle reaches it.
  for(const side of [-.22,0,.22])for(const t of [-.8,-.4,0,.4,.8]){
   const along=t*radius,across=side*VEHICLE_SCALE;
   const h=heightAt(x+wc*across+ws*along,z-ws*across+wc*along);
   ground=Math.max(ground,h+Math.sqrt(radius*radius-along*along)-radius);
  }
  return {...w,worldX:x,worldZ:z,ground};
 });
}

export function bodyAttitude(contacts){
 const average=points=>points.reduce((sum,w)=>sum+w.ground,0)/points.length;
 return {
  ground:average(contacts),
  pitch:Math.atan2(average(contacts.filter(w=>w.z<0))-average(contacts.filter(w=>w.z>0)),1.79*VEHICLE_SCALE),
  roll:Math.atan2(average(contacts.filter(w=>w.x>0))-average(contacts.filter(w=>w.x<0)),2*VEHICLE_SCALE)
 };
}

export function updateWheel(wheel,car,contact,dt){
 let steer=0;
 if(wheel.z<0){
  const yaw=wheel.previousHeading===undefined?0:Math.atan2(Math.sin(car.heading-wheel.previousHeading),Math.cos(car.heading-wheel.previousHeading))/dt;
  const forward=-(car.vx*Math.sin(car.heading)+car.vz*Math.cos(car.heading));
  // Ackermann: the inside wheel follows a smaller circle than the outside.
  if(Math.abs(forward)>.4)steer=clamp(Math.atan2(yaw*1.79*VEHICLE_SCALE,Math.abs(forward)+yaw*wheel.x*VEHICLE_SCALE)*Math.sign(forward),-.6,.6);
 }
 wheel.steer=(wheel.steer??0)+(steer-(wheel.steer??0))*(1-Math.exp(-dt*16));
 if(!car.airborne&&wheel.previousX!==undefined){
  const heading=car.heading+wheel.steer;
  const distance=-(contact.worldX-wheel.previousX)*Math.sin(heading)-(contact.worldZ-wheel.previousZ)*Math.cos(heading);
  wheel.angularVelocity=-distance/(TIRE_RADIUS*VEHICLE_SCALE*dt);
 }else if(car.airborne)wheel.angularVelocity=(wheel.angularVelocity??0)*Math.exp(-dt*.18);
 else wheel.angularVelocity=0;
 wheel.angle=((wheel.angle??0)+wheel.angularVelocity*dt)%(Math.PI*2);
 wheel.previousX=contact.worldX;wheel.previousZ=contact.worldZ;wheel.previousHeading=car.heading;
}

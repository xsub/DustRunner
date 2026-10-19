// Convex bumper/body/tire outline in world units; heading uses Three's Y axis.
const OUTLINE=[[-1.38,-2.46],[1.38,-2.46],[1.74,-2.02],[1.74,2.03],[.94,2.58],[-.94,2.58],[-1.74,2.03],[-1.74,-2.02]];
const INERTIA=(3.48**2+5.04**2)/12;
const dot=(a,b)=>a.x*b.x+a.z*b.z;
const cross=(r,n)=>r.z*n.x-r.x*n.z;
export function carOutline(car){
 const c=Math.cos(car.heading),s=Math.sin(car.heading);
 return OUTLINE.map(([x,z])=>({x:car.x+x*c+z*s,z:car.z-x*s+z*c}));
}
export function carContact(a,b){
 // Test actual body height, so a truck can clear another rather than being
 // pulled sideways by a collision between their projected screen silhouettes.
 const bottomA=(a.height??0)+.65,topA=(a.height??0)+3.44;
 const bottomB=(b.height??0)+.65,topB=(b.height??0)+3.44;
 if(bottomA>=topB||bottomB>=topA)return null;
 if(Math.hypot(b.x-a.x,b.z-a.z)>6.2)return null;
 const pa=carOutline(a),pb=carOutline(b);
 let depth=Infinity,normal;
 for(const polygon of [pa,pb])for(let i=0;i<polygon.length;i++){
  const p=polygon[i],q=polygon[(i+1)%polygon.length],length=Math.hypot(q.x-p.x,q.z-p.z);
  const axis={x:-(q.z-p.z)/length,z:(q.x-p.x)/length};
  const project=points=>{const d=points.map(p=>dot(p,axis));return [Math.min(...d),Math.max(...d)];};
  const [amin,amax]=project(pa),[bmin,bmax]=project(pb);
  const overlap=Math.min(amax,bmax)-Math.max(amin,bmin);
  if(overlap<=0)return null;
  if(overlap<depth){depth=overlap;normal=axis;}
 }
 if(dot({x:b.x-a.x,z:b.z-a.z},normal)<0){normal.x*=-1;normal.z*=-1;}
 // Clip the two outlines to locate the actual shared contact patch.
 let patch=pa;
 for(let i=0;i<pb.length&&patch.length;i++){
  const p=pb[i],q=pb[(i+1)%pb.length];
  const side=v=>(q.x-p.x)*(v.z-p.z)-(q.z-p.z)*(v.x-p.x);
  const output=[];
  for(let j=0;j<patch.length;j++){
   const u=patch[j],v=patch[(j+1)%patch.length],du=side(u),dv=side(v);
   if(du>=-1e-9)output.push(u);
   if((du>=0)!==(dv>=0)){const t=du/(du-dv);output.push({x:u.x+(v.x-u.x)*t,z:u.z+(v.z-u.z)*t});}
  }
  patch=output;
 }
 const point=patch.length?{x:patch.reduce((s,p)=>s+p.x,0)/patch.length,z:patch.reduce((s,p)=>s+p.z,0)/patch.length}:{x:(a.x+b.x)/2,z:(a.z+b.z)/2};
 return {normal,depth,point};
}
export function resolveCarCollision(a,b){
 const contact=carContact(a,b);if(!contact)return false;
 const {normal:n,depth,point}=contact;
 const ra={x:point.x-a.x,z:point.z-a.z},rb={x:point.x-b.x,z:point.z-b.z};
 const velocity=(car,r)=>({x:car.vx+(car.collisionYaw??0)*r.z,z:car.vz-(car.collisionYaw??0)*r.x});
 const va=velocity(a,ra),vb=velocity(b,rb),rv={x:vb.x-va.x,z:vb.z-va.z};
 const speed=dot(rv,n);
 const apply=(axis,impulse)=>{
  a.vx-=axis.x*impulse;a.vz-=axis.z*impulse;b.vx+=axis.x*impulse;b.vz+=axis.z*impulse;
  a.collisionYaw=(a.collisionYaw??0)-cross(ra,axis)*impulse/INERTIA;
  b.collisionYaw=(b.collisionYaw??0)+cross(rb,axis)*impulse/INERTIA;
 };
 if(speed<0){
  const impulse=-(1.08)*speed/(2+(cross(ra,n)**2+cross(rb,n)**2)/INERTIA);
  apply(n,impulse);
  const tangent={x:-n.z,z:n.x};
  const va2=velocity(a,ra),vb2=velocity(b,rb);
  const slip=(vb2.x-va2.x)*tangent.x+(vb2.z-va2.z)*tangent.z;
  const friction=-slip/(2+(cross(ra,tangent)**2+cross(rb,tangent)**2)/INERTIA);
  apply(tangent,Math.max(-impulse*.3,Math.min(impulse*.3,friction)));
 }
 // Position correction doesn't add energy; repeated solver passes settle packs.
 const correction=Math.max(0,depth-.002)*.5;
 a.x-=n.x*correction;a.z-=n.z*correction;b.x+=n.x*correction;b.z+=n.z*correction;
 for(const car of [a,b])car.speed=-(car.vx*Math.sin(car.heading)+car.vz*Math.cos(car.heading));
 return true;
}
export function advanceCollisionRotation(car,dt){
 const yaw=car.collisionYaw??0;
 car.heading+=yaw*dt;
 car.collisionYaw=yaw*Math.exp(-dt*(car.airborne?.7:4));
}

import {terrainHeight,ROAD_WIDTH,SHOULDER_WIDTH} from './tracks.js';

// Rendering, wheel rays and chassis contacts all use these exact triangles.
export function buildTerrain(samples,curve,trackIndex){
 const offsets=[-ROAD_WIDTH-SHOULDER_WIDTH,-ROAD_WIDTH-6,...Array.from({length:29},(_,i)=>-ROAD_WIDTH+2*ROAD_WIDTH*i/28),ROAD_WIDTH+6,ROAD_WIDTH+SHOULDER_WIDTH];
 const positions=[],indices=[],uv=[],colors=[],n=samples.length,cols=offsets.length;
 for(let i=0;i<=n;i++){
  const j=i%n,p=samples[j],t=curve.getTangentAt(j/n);
  const before=curve.getTangentAt(((j-2+n)%n)/n),after=curve.getTangentAt(((j+2)%n)/n);
  const turn=Math.atan2(before.x*after.z-before.z*after.x,before.x*after.x+before.z*after.z);
  let radius=4*curve.getLength()/n/(Math.abs(turn)||1e-9);
  for(let k=-36;k<=36;k+=3){
   const a=curve.getTangentAt(((j+k-2+n)%n)/n),b=curve.getTangentAt(((j+k+2+n)%n)/n);
   const nearby=Math.atan2(a.x*b.z-a.z*b.x,a.x*b.x+a.z*b.z);
   if(nearby*turn>0)radius=Math.min(radius,4*curve.getLength()/n/(Math.abs(nearby)||1e-9));
  }
  for(const nominal of offsets){
   const shoulder=Math.max(0,(Math.abs(nominal)-ROAD_WIDTH)/SHOULDER_WIDTH);
   // Narrow the inner embankment before it reaches the bend's center.
   const reach=nominal*turn>0?Math.min(SHOULDER_WIDTH,Math.max(.6,radius-ROAD_WIDTH-.8)):SHOULDER_WIDTH;
   const lateral=Math.sign(nominal)*(Math.min(Math.abs(nominal),ROAD_WIDTH)+shoulder*reach);
   const edge=Math.max(-ROAD_WIDTH,Math.min(ROAD_WIDTH,lateral));
   const h=terrainHeight(j/n,trackIndex,edge,curve.variant??0)*(1-shoulder)-.25*shoulder;
   positions.push(p.x-t.z*lateral,h,p.z+t.x*lateral);uv.push(i*curve.getLength()/n/8,lateral/8);
   colors.push(1-shoulder*.1,1-shoulder*.03,1-shoulder*.08);
  }
  if(i<n)for(let c=0;c<cols-1;c++){
   const a=i*cols+c,b=a+cols;
   // Reflect the triangle diagonal too, keeping the exact contact surface.
   if(curve.lateralSign<0)indices.push(a,a+1,b+1,a,b+1,b);
   else indices.push(a,a+1,b,a+1,b+1,b);
  }
 }
 const vertices=new Float32Array(positions),triangles=new Uint32Array(indices);
 return {positions:vertices,indices:triangles,uv:new Float32Array(uv),colors:new Float32Array(colors),heightAt:triangleSampler(vertices,triangles)};
}
export function triangleSampler(vertices,indices){
 const grid=new Map(),cell=8;
 for(let i=0;i<indices.length;i+=3){
  const points=[0,1,2].map(k=>{const j=indices[i+k]*3;return {x:vertices[j],y:vertices[j+1],z:vertices[j+2]};});
  const xs=points.map(p=>p.x),zs=points.map(p=>p.z);
  for(let x=Math.floor(Math.min(...xs)/cell);x<=Math.floor(Math.max(...xs)/cell);x++)for(let z=Math.floor(Math.min(...zs)/cell);z<=Math.floor(Math.max(...zs)/cell);z++){
   const key=`${x},${z}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(points);
  }
 }
 return (x,z)=>{
  let height=-.25;
  for(const [a,b,c] of grid.get(`${Math.floor(x/cell)},${Math.floor(z/cell)}`)??[]){
   const d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(d)<1e-9)continue;
   const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/d,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/d;
   if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001)height=Math.max(height,u*a.y+v*b.y+(1-u-v)*c.y);
  }
  return height;
 };
}

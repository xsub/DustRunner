import {gridHeight} from './grid-height.js';
import {jumpCoordinates,jumpEnd} from './desert-jumps.js';
// Spend triangles on narrow ramp decks, not on the entire 2.88 km² desert.
// Boundary samples follow the neighboring coarse triangle edge, avoiding cracks.
export function refineJumpMesh({positions,uv,colors,rockMask,cols,rows,step,minX,minZ,sampleHeight,ramps,areas=[]}){
 const selected=new Set(),cells=new Map(),sub=5;
 for(const ramp of ramps){
  const radius=Math.hypot(jumpEnd(ramp)+8,ramp.halfWidth+ramp.edgeWidth+5);
  const loX=Math.max(0,Math.floor((ramp.x-radius-minX)/step)),hiX=Math.min(cols-1,Math.ceil((ramp.x+radius-minX)/step));
  const loZ=Math.max(0,Math.floor((ramp.z-radius-minZ)/step)),hiZ=Math.min(rows-1,Math.ceil((ramp.z+radius-minZ)/step));
  for(let iz=loZ;iz<=hiZ;iz++)for(let ix=loX;ix<=hiX;ix++){
   const {s,side}=jumpCoordinates(ramp,minX+(ix+.5)*step,minZ+(iz+.5)*step);
   if(s> -5&&s<jumpEnd(ramp)+5&&Math.abs(side)<ramp.halfWidth+Math.min(8,ramp.edgeWidth)+3)selected.add(iz*cols+ix);
  }
 }
 for(const area of areas)for(let iz=Math.max(0,Math.floor((area.z-(area.halfZ??area.half)-minZ)/step));iz<=Math.min(rows-1,Math.ceil((area.z+(area.halfZ??area.half)-minZ)/step));iz++)for(let ix=Math.max(0,Math.floor((area.x-(area.halfX??area.half)-minX)/step));ix<=Math.min(cols-1,Math.ceil((area.x+(area.halfX??area.half)-minX)/step));ix++)selected.add(iz*cols+ix);
 const p=[...positions],u=[...uv],c=[...colors],r=[...rockMask],indices=[],coarse=gridHeight(positions,cols,rows,step,minX,minZ);
 for(let iz=0;iz<rows;iz++)for(let ix=0;ix<cols;ix++){
  const id=iz*cols+ix,a=iz*(cols+1)+ix,b=a+cols+1;
  if(!selected.has(id)){indices.push(a,b,a+1,a+1,b,b+1);continue;}
  const start=p.length/3,x0=minX+ix*step,z0=minZ+iz*step,vertices=new Float32Array((sub+1)**2*3);
  for(let z=0;z<=sub;z++)for(let x=0;x<=sub;x++){
   const wx=x0+x*step/sub,wz=z0+z*step/sub;
   const boundary=(x===0&&!selected.has(id-1))||(x===sub&&!selected.has(id+1))||(z===0&&!selected.has(id-cols))||(z===sub&&!selected.has(id+cols));
   const h=boundary?coarse(wx,wz):sampleHeight(wx,wz),tx=x/sub,tz=z/sub;
   const weights=[(1-tx)*(1-tz),tx*(1-tz),(1-tx)*tz,tx*tz],corners=[a,a+1,b,b+1];
   p.push(wx,h,wz);vertices.set([wx,h,wz],(z*(sub+1)+x)*3);u.push(wx/12,wz/12);
   for(let k=0;k<3;k++)c.push(corners.reduce((v,corner,i)=>v+colors[corner*3+k]*weights[i],0));
   r.push(corners.reduce((v,corner,i)=>v+rockMask[corner]*weights[i],0));
  }
  for(let z=0;z<sub;z++)for(let x=0;x<sub;x++){const a=start+z*(sub+1)+x,b=a+sub+1;indices.push(a,b,a+1,a+1,b,b+1);}
  cells.set(id,gridHeight(vertices,sub,sub,step/sub,x0,z0));
 }
 return {positions:new Float32Array(p),indices:new Uint32Array(indices),uv:new Float32Array(u),colors:new Float32Array(c),rockMask:new Float32Array(r),heightAt:(x,z)=>{
  const ix=Math.min(cols-1,Math.floor((x-minX)/step)),iz=Math.min(rows-1,Math.floor((z-minZ)/step));
  return (cells.get(iz*cols+ix)??coarse)(x,z);
 },refinedCells:selected.size};
}

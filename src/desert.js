import {triangleSampler} from './terrain.js';
export const DESERT_WIDTH=1200,DESERT_DEPTH=600;
export const DESERT_BOUNDS={min:{x:-DESERT_WIDTH/2,z:-DESERT_DEPTH/2},max:{x:DESERT_WIDTH/2,z:DESERT_DEPTH/2}};
export const DESERT_SPAWN={x:0,z:210,heading:0};
export const DESERT_REGIONS=[{x:-380,z:20,label:'FALE'},{x:5,z:-120,label:'GRZBIETY'},{x:380,z:0,label:'WYSOKIE'}];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
let seed=1947;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
// Fixed landmarks: varied scales, directions and shapes, independent of reloads.
const dunes=Array.from({length:64},(_,i)=>{
 const x=-530+random()*1060,z=-225+random()*450,angle=random()*Math.PI;
 return {x,z,cos:Math.cos(angle),sin:Math.sin(angle),height:5+random()*(x>180?19:11),width:17+random()*24,length:22+random()*55,kind:i%4,curve:(random()-.5)*.007};
});
export function desertHeight(x,z){
 const warp=7*Math.sin(z*.017)+5*Math.sin(x*.012+z*.009);
 const u=x*.85+z*.53+warp,v=z*.85-x*.53;
 const east=smooth((x-100)/220),west=1-smooth((x+300)/220);
 // West: broad rolling swells. Center: winding parallel ridges. East: higher bowls.
 const swells=(2+3*west)*(1+Math.sin(u*(.025+.008*Math.sin(z*.008))))/2;
 const ridges=(1.8+2.8*(1-west))*(1+Math.sin(u*.064+Math.sin(v*.027)*1.8))**2/4;
 const ripples=(.12+.4*smooth((z+200)/300))*(1+Math.sin(v*.29+Math.sin(u*.06)*2))/2;
 let features=0;
 for(const dune of dunes){
  const dx=x-dune.x,dz=z-dune.z;
  if(Math.abs(dx)>135||Math.abs(dz)>135)continue;
  const a=dx*dune.cos+dz*dune.sin,b=-dx*dune.sin+dz*dune.cos;
  let h;
  if(dune.kind===0){ // crescent: curved slip face with tapering horns
   const face=(a+dune.curve*b*b)/dune.width;
   h=dune.height*Math.exp(-face*face*2-(b/dune.length)**4*1.5);
  }else if(dune.kind===1){ // long asymmetric ridge, steeper lee side
   const face=a/(dune.width*(a>0?.6:1.4));
   h=dune.height*Math.exp(-face*face*1.7-(b/dune.length)**4);
  }else if(dune.kind===2){ // rounded solitary dome
   h=dune.height*Math.exp(-((a/dune.width)**2+(b/dune.length)**2));
  }else{ // intersecting star-dune arms and shallow bowls between them
   const r=Math.hypot(a,b),angle=Math.atan2(b,a);
   h=dune.height*Math.exp(-((r/dune.length)**2))*(0.42+.58*(.5+.5*Math.cos(angle*3+r*.035))**2);
  }
  h*=1-smooth((Math.max(Math.abs(dx),Math.abs(dz))-105)/30);
  features=Math.max(features,h);
 }
 const bowl=east*2.2*(1+Math.sin(x*.019+z*.024))/2;
 const blend=smooth((Math.hypot(x-DESERT_SPAWN.x,z-DESERT_SPAWN.z)-8)/28);
 const edge=Math.max(Math.max(0,(Math.abs(x)-(DESERT_WIDTH/2-35))/35),Math.max(0,(Math.abs(z)-(DESERT_DEPTH/2-35))/35));
 return 1+(swells+ridges+ripples+features+bowl)*blend+18*edge*edge;
}
export function buildDesert(){
 const step=2.5,cols=DESERT_WIDTH/step,rows=DESERT_DEPTH/step,positions=[],indices=[],uv=[],colors=[];
 for(let z=0;z<=rows;z++)for(let x=0;x<=cols;x++){
  const wx=DESERT_BOUNDS.min.x+x*step,wz=DESERT_BOUNDS.min.z+z*step,h=desertHeight(wx,wz);
  positions.push(wx,h,wz);uv.push(wx/12,wz/12);
  // Broad slope shading makes dune faces legible from the overhead camera.
  const sx=(desertHeight(wx+step,wz)-desertHeight(wx-step,wz))/(step*2),sz=(desertHeight(wx,wz+step)-desertHeight(wx,wz-step))/(step*2);
  const shade=Math.max(.24,Math.min(1.20,.88-sx*.9+sz*.9)),tone=(.72+Math.min(h,25)*.012)*shade;
  colors.push(tone,Math.min(1.15,tone+.035),Math.min(1.1,tone+.055));
 }
 for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){const a=z*(cols+1)+x,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const vertices=new Float32Array(positions),triangles=new Uint32Array(indices);
 return {positions:vertices,indices:triangles,uv:new Float32Array(uv),colors:new Float32Array(colors),heightAt:triangleSampler(vertices,triangles),bounds:DESERT_BOUNDS,regions:DESERT_REGIONS};
}

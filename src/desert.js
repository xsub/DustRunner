import {gridHeight} from './grid-height.js';
import {sandWaveHeight} from './sand-waves.js';
export const DESERT_WIDTH=2400,DESERT_DEPTH=1200;
export const DESERT_BOUNDS={min:{x:-DESERT_WIDTH/2,z:-DESERT_DEPTH/2},max:{x:DESERT_WIDTH/2,z:DESERT_DEPTH/2}};
export const DESERT_SPAWN={x:0,z:210,heading:0};
export const DESERT_REGIONS=[{x:-800,z:20,label:'FALE'},{x:5,z:-120,label:'GRZBIETY'},{x:800,z:0,label:'WYSOKIE'}];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const DESERT_VARIANTS=[
 {id:'ridges',name:'BURZOWE GRZBIETY',description:'Gęste pasma, strome zbocza i głębokie siodła',amplitude:1.75,width:1.3,count:96,defaultSeed:1947},
 {id:'stars',name:'MORZE WIELKICH WYDM',description:'Wysokie wydmy gwiaździste, kopce i rozległe niecki',amplitude:2.2,width:1.65,count:80,defaultSeed:8671},
 {id:'random',name:'LOSOWA EKSPEDYCJA',description:'Nowy układ wydm odtwarzany z podanego ziarna',amplitude:1.95,width:1.4,count:112,defaultSeed:43210},
];
export function normalizeDesertOptions(options={}){
 const variant=DESERT_VARIANTS.find(v=>v.id===options.variant)??DESERT_VARIANTS[0];
 const value=Number(options.seed);return {variant:variant.id,seed:Number.isInteger(value)&&value>=0&&value<=4294967295?value:variant.defaultSeed};
}
const samplers=new Map();
export function createDesertHeight(options={}){
 const normalized=normalizeDesertOptions(options),profile=DESERT_VARIANTS.find(v=>v.id===normalized.variant),key=profile.id+':'+normalized.seed;
 if(samplers.has(key))return samplers.get(key);
 let seed=normalized.seed;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const phase=profile.id==='random'?random()*20:0;
 const dunes=Array.from({length:profile.count*4},(_,i)=>{
  // Preserve the original seeded central dunes; populate the added land at
  // the same density without stretching existing hills or their slopes.
  let x,z;
  if(i<profile.count){x=-530+random()*1060;z=-225+random()*450;}
  else do{x=DESERT_BOUNDS.min.x+70+random()*(DESERT_WIDTH-140);z=DESERT_BOUNDS.min.z+75+random()*(DESERT_DEPTH-150);}while(Math.abs(x)<=530&&Math.abs(z)<=225);
  const angle=random()*Math.PI;
  return {x,z,cos:Math.cos(angle),sin:Math.sin(angle),height:(5+random()*(x>180?19:11))*profile.amplitude,width:(17+random()*24)*profile.width,length:(22+random()*55)*profile.width,kind:profile.id==='ridges'?(i%3):profile.id==='stars'?2+i%2:Math.floor(random()*4),curve:(random()-.5)*.007};
 });
 // Each sample visits only nearby dunes, independent of the total map area.
 const duneCells=new Map(),cell=190;
 for(const dune of dunes)for(let x=Math.floor((dune.x-190)/cell);x<=Math.floor((dune.x+190)/cell);x++)for(let z=Math.floor((dune.z-190)/cell);z<=Math.floor((dune.z+190)/cell);z++){
  const key=x+','+z;if(!duneCells.has(key))duneCells.set(key,[]);duneCells.get(key).push(dune);
 }
 const height=(x,z)=>{
 const warp=12*Math.sin(z*.017+phase)+9*Math.sin(x*.012+z*.009+phase);
 const u=x*.85+z*.53+warp,v=z*.85-x*.53;
 const east=smooth((x-100)/220),west=1-smooth((x+300)/220);
 // West: broad rolling swells. Center: winding parallel ridges. East: higher bowls.
 const swells=profile.amplitude*(2+3*west)*(1+Math.sin(u*(.025+.008*Math.sin(z*.008))))/2;
 const ridges=profile.amplitude*(1.8+2.8*(1-west))*(1+Math.sin(u*.064+Math.sin(v*.027)*1.8))**2/4;
 const ripples=(.12+.4*smooth((z+200)/300))*(1+Math.sin(v*.29+Math.sin(u*.06)*2))/2;
 let features=0;
 for(const dune of duneCells.get(Math.floor(x/cell)+','+Math.floor(z/cell))??[]){
  const dx=x-dune.x,dz=z-dune.z;
  if(Math.abs(dx)>190||Math.abs(dz)>190)continue;
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
  h*=1-smooth((Math.max(Math.abs(dx),Math.abs(dz))-145)/45);
  features=Math.max(features,h);
 }
 const bowl=east*2.2*(1+Math.sin(x*.019+z*.024))/2;
 const blend=smooth((Math.hypot(x-DESERT_SPAWN.x,z-DESERT_SPAWN.z)-8)/28);
 const edge=Math.max(Math.max(0,(Math.abs(x)-(DESERT_WIDTH/2-35))/35),Math.max(0,(Math.abs(z)-(DESERT_DEPTH/2-35))/35));
 return 1+(swells+ridges+ripples+features+bowl)*blend+18*edge*edge;
 };
 if(samplers.size>=12)samplers.delete(samplers.keys().next().value);samplers.set(key,height);return height;
}
export function desertHeight(x,z,options={}){return createDesertHeight(options)(x,z);}
export function buildDesert(options={}){
 const configuration=normalizeDesertOptions(options),baseHeight=createDesertHeight(configuration);
 const sampleHeight=(x,z)=>baseHeight(x,z)+sandWaveHeight(x,z)*smooth((Math.hypot(x-DESERT_SPAWN.x,z-DESERT_SPAWN.z)-8)/28);
 const step=2.5,cols=DESERT_WIDTH/step,rows=DESERT_DEPTH/step,count=(cols+1)*(rows+1);
 const vertices=new Float32Array(count*3),triangles=new Uint32Array(cols*rows*6),uv=new Float32Array(count*2),colors=new Float32Array(count*3);
 for(let z=0;z<=rows;z++)for(let x=0;x<=cols;x++){
  const i=z*(cols+1)+x,wx=DESERT_BOUNDS.min.x+x*step,wz=DESERT_BOUNDS.min.z+z*step;
  vertices.set([wx,sampleHeight(wx,wz),wz],i*3);uv.set([wx/12,wz/12],i*2);
 }
 // Reuse the sampled height grid for lighting instead of evaluating the dune
 // field four more times per vertex. The contact mesh keeps its 2.5 m spacing.
 for(let z=0;z<=rows;z++)for(let x=0;x<=cols;x++){
  const i=z*(cols+1)+x,h=vertices[i*3+1],left=Math.max(0,x-1),right=Math.min(cols,x+1),back=Math.max(0,z-1),front=Math.min(rows,z+1);
  const sx=(vertices[(z*(cols+1)+right)*3+1]-vertices[(z*(cols+1)+left)*3+1])/((right-left)*step);
  const sz=(vertices[(front*(cols+1)+x)*3+1]-vertices[(back*(cols+1)+x)*3+1])/((front-back)*step);
  const shade=Math.max(.24,Math.min(1.20,.88-sx*.9+sz*.9)),tone=(.72+Math.min(h,25)*.012)*shade;
  colors.set([tone,Math.min(1.15,tone+.035),Math.min(1.1,tone+.055)],i*3);
 }
 for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){
  const a=z*(cols+1)+x,b=a+cols+1;triangles.set([a,b,a+1,a+1,b,b+1],(z*cols+x)*6);
 }
 return {positions:vertices,indices:triangles,uv,colors,heightAt:gridHeight(vertices,cols,rows,step,DESERT_BOUNDS.min.x,DESERT_BOUNDS.min.z),bounds:DESERT_BOUNDS,regions:DESERT_REGIONS,configuration};
}

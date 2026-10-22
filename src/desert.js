import {createHardDesertHeight,HARD_DESERT_REGIONS} from './desert-hard.js';
import {gridHeight} from './grid-height.js';
import {desertJumps,shapeDesertJump,jumpPoint,jumpEnd} from './desert-jumps.js';
import {sandWaveHeight} from './sand-waves.js';
export const DESERT_WIDTH=2400,DESERT_DEPTH=1200;
export const DESERT_BOUNDS={min:{x:-DESERT_WIDTH/2,z:-DESERT_DEPTH/2},max:{x:DESERT_WIDTH/2,z:DESERT_DEPTH/2}};
export const DESERT_SPAWN={x:0,z:210,heading:0};
export const DESERT_REGIONS=[{x:-700,z:300,label:'KOLEINY'},{x:0,z:70,label:'SKOCZNIE'},{x:750,z:-280,label:'WIELKA'}];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const DESERT_VARIANTS=[
 {id:'ridges',name:'RAJDOWE WYDMY',description:'Płaskie koleiny, średnie wydmy, usypane skocznie i długa wielka wydma',amplitude:1,width:1.1,count:96,defaultSeed:1947},
 {id:'stars',name:'MORZE WIELKICH WYDM',description:'Szerokie wydmy i łagodne podjazdy, duże zjazdy oraz skocznie',amplitude:1.15,width:1.3,count:80,defaultSeed:8671},
 {id:'random',name:'LOSOWA EKSPEDYCJA',description:'Losowa mieszanka płaskiego piasku, średnich wydm i skoczni',amplitude:1.05,width:1.2,count:112,defaultSeed:43210},
 {id:'hard',name:'TRUDNE WYDMY',description:'Poprzedni stromy teren: wysokie wydmy, ostre grzbiety i głębokie siodła. Bez przygotowanych skoczni. Zalecany reduktor LO / 4×4.',hard:true,defaultSeed:1947},
];
export function normalizeDesertOptions(options={}){
 const variant=DESERT_VARIANTS.find(v=>v.id===options.variant)??DESERT_VARIANTS[0];
 const value=Number(options.seed);return {variant:variant.id,seed:Number.isInteger(value)&&value>=0&&value<=4294967295?value:variant.defaultSeed};
}
const samplers=new Map();
export function createDesertHeight(options={}){
 const normalized=normalizeDesertOptions(options),profile=DESERT_VARIANTS.find(v=>v.id===normalized.variant),key=profile.id+':'+normalized.seed;
 if(samplers.has(key))return samplers.get(key);
 if(profile.hard){const height=createHardDesertHeight(normalized.seed,{width:DESERT_WIDTH,depth:DESERT_DEPTH,spawn:DESERT_SPAWN});if(samplers.size>=12)samplers.delete(samplers.keys().next().value);samplers.set(key,height);return height;}
 let seed=normalized.seed;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const phase=profile.id==='random'?random()*20:0;
 const jumps=desertJumps(normalized.seed);
 const dunes=Array.from({length:profile.count*3},()=>{
  const x=DESERT_BOUNDS.min.x+90+random()*(DESERT_WIDTH-180),z=DESERT_BOUNDS.min.z+90+random()*(DESERT_DEPTH-180),angle=random()*Math.PI;
  return {x,z,cos:Math.cos(angle),sin:Math.sin(angle),height:(2.2+random()*5.8)*profile.amplitude,width:(23+random()*23)*profile.width,length:(35+random()*50)*profile.width,kind:Math.floor(random()*3),curve:(random()-.5)*.001};
 });
 // Each sample visits only nearby dunes, independent of the total map area.
 const duneCells=new Map(),cell=190;
 for(const dune of dunes)for(let x=Math.floor((dune.x-190)/cell);x<=Math.floor((dune.x+190)/cell);x++)for(let z=Math.floor((dune.z-190)/cell);z<=Math.floor((dune.z+190)/cell);z++){
  const key=x+','+z;if(!duneCells.has(key))duneCells.set(key,[]);duneCells.get(key).push(dune);
 }
 const height=(x,z)=>{
 const u=x*.85+z*.53,v=z*.85-x*.53;
 const flat=1-smooth((Math.hypot((x+700)/300,(z-300)/190)-.6)/.55);
 const swells=.45*(1+Math.sin(u*.013+phase))* (1-flat);
 const ridges=.55*(1+Math.sin(v*.019+Math.sin(u*.011)+phase))*(1-flat);
 // Shallow curb-height ruts in the flat district, not a wall of short ripples.
 const rutAxis=x+6*Math.sin(z*.018+phase),rut=Math.sin(rutAxis*.22)/.22;
 const ripples=-.18*Math.exp(-((rut/1.25)**2))*flat+.035*Math.sin(v*.13+phase);
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
   const face=a/(dune.width*(a>0?.9:1.2));
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
 // Two rare, broad giant dunes: long descents without steep access walls.
 const giant=(cx,cz,h,rx,rz)=>{const r2=((x-cx)/rx)**2+((z-cz)/rz)**2;return r2>5?0:h*Math.exp(-r2*1.8)*(1-smooth((Math.sqrt(r2)-1.7)/.5));};
 const giants=Math.max(giant(760,-280,48,260,300),giant(-850,-330,32,230,230));
 const blend=smooth((Math.hypot(x-DESERT_SPAWN.x,z-DESERT_SPAWN.z)-20)/50);
 const edge=Math.max(Math.max(0,(Math.abs(x)-(DESERT_WIDTH/2-35))/35),Math.max(0,(Math.abs(z)-(DESERT_DEPTH/2-35))/35));
 let result=1+Math.max(0,.22+swells+ridges+ripples+features*(1-flat)+giants)*blend;
 for(const jump of jumps)result=shapeDesertJump(jump,x,z,result);
 return result+18*edge*edge;
 };
 if(samplers.size>=12)samplers.delete(samplers.keys().next().value);samplers.set(key,height);return height;
}
export function desertHeight(x,z,options={}){return createDesertHeight(options)(x,z);}
export function buildDesert(options={}){
 const configuration=normalizeDesertOptions(options),baseHeight=createDesertHeight(configuration),jumps=configuration.variant==='hard'?[]:desertJumps(configuration.seed);
 const protectedAreas=[DESERT_SPAWN,...jumps.flatMap(jump=>Array.from({length:Math.ceil((jump.approach+jumpEnd(jump))/12)+1},(_,i)=>[-jump.halfWidth,0,jump.halfWidth].map(side=>jumpPoint(jump,-jump.approach+i*12,side))).flat())];
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
 return {positions:vertices,indices:triangles,uv,colors,heightAt:gridHeight(vertices,cols,rows,step,DESERT_BOUNDS.min.x,DESERT_BOUNDS.min.z),bounds:DESERT_BOUNDS,regions:configuration.variant==='hard'?HARD_DESERT_REGIONS:DESERT_REGIONS,jumps,protectedAreas,configuration};
}

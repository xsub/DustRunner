// Original steep desert generator retained as the optional challenge terrain.
// Its seeded formulas and dune sequence come from the pre-playground version.
export const HARD_DESERT_REGIONS=[{x:-800,z:20,label:'FALE'},{x:5,z:-120,label:'GRZBIETY'},{x:800,z:0,label:'WYSOKIE'}];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function createHardDesertHeight(initialSeed,{width=2400,depth=1200,spawn={x:0,z:210}}={}){
 const profile={id:'ridges',amplitude:1.75,width:1.3,count:96};
 const bounds={min:{x:-width/2,z:-depth/2},max:{x:width/2,z:depth/2}};
 let seed=initialSeed;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const phase=profile.id==='random'?random()*20:0;
 const dunes=Array.from({length:profile.count*4},(_,i)=>{
  // Preserve the original seeded central dunes; populate the added land at
  // the same density without stretching existing hills or their slopes.
  let x,z;
  if(i<profile.count){x=-530+random()*1060;z=-225+random()*450;}
  else do{x=bounds.min.x+70+random()*(width-140);z=bounds.min.z+75+random()*(depth-150);}while(Math.abs(x)<=530&&Math.abs(z)<=225);
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
 const blend=smooth((Math.hypot(x-spawn.x,z-spawn.z)-8)/28);
 const edge=Math.max(Math.max(0,(Math.abs(x)-(width/2-35))/35),Math.max(0,(Math.abs(z)-(depth/2-35))/35));
 return 1+(swells+ridges+ripples+features+bowl)*blend+18*edge*edge;
 };
 return height;
}

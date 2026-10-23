import {t as msg} from './i18n.js';
export const JUMP_REFERENCE_LENGTH=5.08;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function pairedJump(spec){
 // Landing envelopes calibrated with the real 120 Hz vehicle/contact model.
 // Stock 302 for small/medium pairs; a strong V8 for the expert 15 m pair.
 const profiles=[[5.4,27,0,.48],[7.2,27,-1.4,.48],[10.5,25,2,.30],[15,33,2,.48],[16.5,33,0,.48]];
 const upper=profiles.findIndex(p=>p[0]>=spec.height),i=upper<0?profiles.length-1:upper,a=profiles[Math.max(0,i-1)],b=profiles[i],t=a===b?0:Math.max(0,Math.min(1,(spec.height-a[0])/(b[0]-a[0])));
 const blend=k=>a[k]+(b[k]-a[k])*t,vx=blend(1),landingLift=blend(2),slope=blend(3),gravity=20,takeoffSpeedKmh=spec.height>=12?125:spec.height>8?85:92;
 spec={...spec,gap:spec.height>=12?19.2:15.3,landingNose:spec.height>=12?9.1:2.5};
 const flareHeight=6,flareStart=(slope+Math.sqrt(slope*slope+2*gravity*(spec.height+landingLift-flareHeight)/(vx*vx)))*vx*vx/gravity;
 return {...spec,landingLift,takeoffSpeedKmh,flightVx:vx,flightSlope:slope,flareHeight,flareStart,landing:Math.max(10,flareStart+24-spec.gap)};
}
export function desertJumps(seed=1947){
 let state=seed>>>0;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
 const specs=[
  [0,110,0,1.8,true,msg("desert_jumps.easy_pair")],[-340,100,Math.PI/2,3.2,false,msg("desert_jumps.medium_jump")],
  [350,240,-Math.PI/2,3.5,true,msg("desert_jumps.medium_pair")],[-650,-150,-.7,2.2,false,msg("desert_jumps.easy_jump")],
  [650,90,Math.PI/2,5.5,true,msg("desert_jumps.big_pair")],[400,-300,Math.PI,4.2,false,msg("desert_jumps.long_jump")]
 ];
 return specs.map(([x,z,heading,height,paired,label],i)=>pairedJump({id:i,x:Math.round((x+(i?(random()-.5)*40:0))/2.5)*2.5,z:Math.round((z+(i?(random()-.5)*40:0))/2.5)*2.5,heading,height:height*3,runup:height*3*4.5,paired,label,halfWidth:i===0?4:5,edgeWidth:Math.max(12,height*3*2.5),approach:260}));
}
export function jumpCoordinates(jump,x,z){const dx=x-jump.x,dz=z-jump.z;return {s:-dx*Math.sin(jump.heading)-dz*Math.cos(jump.heading),side:dx*Math.cos(jump.heading)-dz*Math.sin(jump.heading)};}
export function jumpPoint(jump,s,side=0){return {x:jump.x-Math.sin(jump.heading)*s+Math.cos(jump.heading)*side,z:jump.z-Math.cos(jump.heading)*s-Math.sin(jump.heading)*side};}
export function jumpEnd(jump){return jump.paired?jump.runup+jump.gap+jump.landing:jump.runup*2;}
export function jumpSurface(jump,s){
 if(s>=0&&s<=jump.runup){const t=s/jump.runup;return jump.height*(.25*t*t+.75*t*t*t);}
 if(!jump.paired&&s>jump.runup&&s<=jump.runup*2){const t=(jump.runup*2-s)/jump.runup;return jump.height*(.25*t*t+.75*t*t*t);}
 if(s>jump.runup&&s<jump.runup+2.5)return jump.height*(1-smooth((s-jump.runup)/2.5));
 if(jump.paired){const start=jump.runup+jump.gap,t=(s-start)/jump.landing;
  if(t>=0&&t<=1){
   const d=s-jump.runup,nose=smooth((s-start)/(jump.landingNose??2.5));
   const ballistic=jump.height+jump.landingLift+jump.flightSlope*d-10*d*d/(jump.flightVx*jump.flightVx);
   if(d>jump.flareStart){const q=Math.min(1,(d-jump.flareStart)/24),h=jump.flareHeight,m=-.65*24;return ((2*q**3-3*q*q+1)*h+(q**3-2*q*q+q)*m)*nose;}
   return Math.max(0,ballistic)*nose;
  }
 }
 return 0;
}
export function shapeDesertJump(jump,x,z,natural){
 const {s,side}=jumpCoordinates(jump,x,z),end=jumpEnd(jump);
  if(s< -jump.approach-35||s>end+jump.approach+35||Math.abs(side)>jump.halfWidth+45)return natural;
  const entry=smooth((s+jump.approach+35)/35),exit=1-smooth((s-end-jump.approach)/35),pad=(1-smooth((Math.abs(side)-jump.halfWidth-10)/35))*entry*exit;
  const deck=1-smooth((Math.abs(side)-jump.halfWidth)/(jump.edgeWidth??8));
  return natural*(1-pad)+pad+jumpSurface(jump,s)*deck*entry*exit;
}

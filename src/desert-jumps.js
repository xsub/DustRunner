const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function desertJumps(seed=1947){
 let state=seed>>>0;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
 const specs=[
  [0,110,0,1.8,24,6,true,'ŁATWA PARA'],[-340,100,Math.PI/2,3.2,30,10,false,'SKOK ŚREDNI'],
  [350,240,-Math.PI/2,3.5,32,12,true,'PARA ŚREDNIA'],[-650,-150,-.7,2.2,27,8,false,'SKOK ŁATWY'],
  [650,90,Math.PI/2,5.5,40,16,true,'DUŻA PARA'],[400,-400,Math.PI,4.2,36,14,false,'DŁUGI SKOK']
 ];
 return specs.map(([x,z,heading,height,runup,gap,paired,label],i)=>({id:i,x:x+(i?(random()-.5)*40:0),z:z+(i?(random()-.5)*40:0),heading:heading+(i?(random()-.5)*.3:0),height,runup,gap,paired,label,halfWidth:i===0?12:15,approach:110,landing:45,landingHeight:height*.65}));
}
export function jumpCoordinates(jump,x,z){const dx=x-jump.x,dz=z-jump.z;return {s:-dx*Math.sin(jump.heading)-dz*Math.cos(jump.heading),side:dx*Math.cos(jump.heading)-dz*Math.sin(jump.heading)};}
export function jumpPoint(jump,s,side=0){return {x:jump.x-Math.sin(jump.heading)*s+Math.cos(jump.heading)*side,z:jump.z-Math.cos(jump.heading)*s-Math.sin(jump.heading)*side};}
export function jumpEnd(jump){return jump.runup+(jump.paired?jump.gap+jump.landing:55);}
export function jumpSurface(jump,s){
 if(s>=0&&s<=jump.runup){const t=s/jump.runup;return jump.height*(.25*t*t+.75*t*t*t);}
 if(s>jump.runup&&s<jump.runup+2.5)return jump.height*(1-smooth((s-jump.runup)/2.5));
 if(jump.paired){const start=jump.runup+jump.gap,t=(s-start)/jump.landing;
  if(t>=0&&t<=1){const nose=Math.min(1,(s-start)/3);return jump.landingHeight*smooth(nose)*(1-t);}
 }
 return 0;
}
export function shapeDesertJump(jump,x,z,natural){
 const {s,side}=jumpCoordinates(jump,x,z),end=jumpEnd(jump);
 if(jump.rock){
  if(s< -jump.approach-35||s>end+40||Math.abs(side)>jump.halfWidth+45)return natural;
  const entry=smooth((s+jump.approach+35)/35),exit=1-smooth((s-end)/40),pad=(1-smooth((Math.abs(side)-jump.halfWidth-10)/35))*entry*exit;
  const deck=1-smooth((Math.abs(side)-jump.halfWidth)/(jump.edgeWidth??8));
  return natural*(1-pad)+pad+jumpSurface(jump,s)*deck*entry*exit;
 }
 if(s< -jump.approach-35||s>end+40||Math.abs(side)>jump.halfWidth+(jump.edgeWidth??35))return natural;
 const width=1-smooth((Math.abs(side)-jump.halfWidth)/(jump.edgeWidth??35)),entry=smooth((s+jump.approach+35)/35),exit=1-smooth((s-end)/40),blend=width*entry*exit;
 return natural*(1-blend)+(1+jumpSurface(jump,s))*blend;
}

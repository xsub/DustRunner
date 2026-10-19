export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function angleDelta(target,current){return Math.atan2(Math.sin(target-current),Math.cos(target-current));}
export function advanceProgress(previous,next,checkpoint,lap,samples=600){
 const delta=(next-previous+samples)%samples;
 if(delta>samples/2)return {checkpoint,lap};
 const quarter=Math.floor(next/(samples/4));
 if(quarter===checkpoint+1)checkpoint=quarter;
 if(checkpoint===3&&next<samples/4&&previous>samples*.75){lap++;checkpoint=0;}
 return {checkpoint,lap};
}
export function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;}

// Fast throttle and yaw response, with a short, controllable lateral slide.
// World units and seconds keep the handling independent of rendering frame rate.
export function arcadeMotion(car,input,dt){
 const {throttle,steer,brake,boost,onDirt,engine=0,tires=0,ai=false,opponent=0}=input;
 const max=(ai?21.4+opponent*.35:23+engine*1.5)*(boost?1.42:1);
 car.speed+=(throttle*(boost?38:23)-(brake?36:0))*dt;
 car.speed*=Math.exp(-dt*(onDirt?.55:1.6));
 car.speed=clamp(car.speed,-8,onDirt?max:max*.65);
 const yaw=(ai?3.2:3.65+tires*.12)*clamp(Math.abs(car.speed)/3,0,1);
 car.heading+=steer*yaw*dt*(car.speed<0?-1:1)*(car.height>.6?.8:1);
 const grip=1-Math.exp(-dt*((ai?10:9.5+tires*1.1)*(car.height>.6?.65:1)));
 car.vx+=(-Math.sin(car.heading)*car.speed-car.vx)*grip;
 car.vz+=(-Math.cos(car.heading)*car.speed-car.vz)*grip;
 car.x+=car.vx*dt;car.z+=car.vz*dt;
}

export function fitCircuitView(bounds,aspect){
 const cx=(bounds.minX+bounds.maxX)/2,cy=(bounds.minY+bounds.maxY)/2;
 // 6% at the sides, 8% top/bottom keeps the entire race visible beneath the HUD.
 let width=(bounds.maxX-bounds.minX)*1.06,height=(bounds.maxY-bounds.minY)*1.16;
 if(width/height<aspect)width=height*aspect;else height=width/aspect;
 return {left:cx-width/2,right:cx+width/2,top:cy+height/2,bottom:cy-height/2};
}

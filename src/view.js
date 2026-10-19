import {clamp} from './race.js';

// Fixed orientation keeps left/right controls and the north-up minimap consistent.
// Follow the horizontal motion, never the truck's vertical jump or body pitch.
export function followCameraStep(state,player,viewport,dt,snap=false){
 const aspect=viewport.width/viewport.height;
 const leadX=player.vx*.32,leadZ=player.vz*.32;
 const leadScale=Math.min(1,9/(Math.hypot(leadX,leadZ)||1));
 const targetX=player.x+leadX*leadScale,targetZ=player.z+leadZ*leadScale;
 const base=clamp(viewport.height/36,12,24);
 const span=Math.max(17/aspect,base+clamp(Math.abs(player.speed)/35,0,1)*2+clamp(player.bend??0,0,1)*3+(player.airborne?1.5:0));
 const pan=snap?1:1-Math.exp(-6*dt),zoom=snap?1:1-Math.exp(-2.5*dt);
 return {x:state.x+(targetX-state.x)*pan,z:state.z+(targetZ-state.z)*pan,span:state.span+(span-state.span)*zoom};
}

export function minimapTransform(points,halfWidth,width,height){
 const margin=halfWidth+2;
 const minX=Math.min(...points.map(p=>p.x))-margin,maxX=Math.max(...points.map(p=>p.x))+margin;
 const minZ=Math.min(...points.map(p=>p.z))-margin,maxZ=Math.max(...points.map(p=>p.z))+margin;
 const scale=Math.min((width-12)/(maxX-minX),(height-12)/(maxZ-minZ));
 return {scale,offsetX:width/2-(minX+maxX)*scale/2,offsetZ:height/2-(minZ+maxZ)*scale/2};
}

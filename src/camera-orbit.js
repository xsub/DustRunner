const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const CAMERA_KEYS=new Set(['KeyI','KeyJ','KeyK','KeyL','KeyO','Equal','Minus','NumpadAdd','NumpadSubtract']);
const DEFAULT_PITCH=Math.atan2(78,70),RADIUS=Math.hypot(78,70);

// Orbit only: the target stays on the truck, with no independent camera pan.
export class CameraOrbit {
 constructor(){this.reset();}
 reset(preset='race'){
  // Elevated desert board view keeps 30–35 degree dunes readable instead
  // of viewing their uphill faces nearly edge-on. Orthographic projection stays.
  this.yaw=preset==='desert'?Math.PI/4:0;
  this.pitch=preset==='desert'?55*Math.PI/180:DEFAULT_PITCH;
  this.distance=1;this.manual=false;
 }
 step(keys,dt){
  const horizontal=Number(keys.has('KeyL'))-Number(keys.has('KeyJ'));
  const vertical=Number(keys.has('KeyI'))-Number(keys.has('KeyK'));
  const zoom=Number(keys.has('Minus')||keys.has('NumpadSubtract'))-Number(keys.has('Equal')||keys.has('NumpadAdd'));
  if(horizontal||vertical||zoom)this.manual=true;
  this.yaw=Math.atan2(Math.sin(this.yaw+horizontal*dt),Math.cos(this.yaw+horizontal*dt));
  this.pitch=clamp(this.pitch+vertical*dt*.65,25*Math.PI/180,80*Math.PI/180);
  this.distance=clamp(this.distance*Math.exp(zoom*dt*.7),.5,1);
 }
 offset(){const radius=RADIUS*this.distance,horizontal=radius*Math.cos(this.pitch);return {x:Math.sin(this.yaw)*horizontal,y:radius*Math.sin(this.pitch),z:Math.cos(this.yaw)*horizontal};}
}

// Wildlife retreats before a truck arrives; it is never a collision target.
// Check the swept approach too, so a fast truck cannot skip the warning zone.
export function snakeRetreat(state,vehicles,time,dt){
 let near=false,urgent=false;
 for(const car of vehicles){
  const x=car.x-state.x,z=car.z-state.z,vx=car.vx??0,vz=car.vz??0;
  const travel=vx*vx+vz*vz,t=travel>0?Math.max(0,Math.min(.7,-(x*vx+z*vz)/travel)):0;
  const distance=Math.hypot(x,z),approach=Math.hypot(x+vx*t,z+vz*t);
  if(distance<9||approach<8)near=true;
  if(distance<6)urgent=true;
 }
 if(near)state.hideUntil=time+4;
 const target=near||time<(state.hideUntil??0)?1:0;
 state.retreat=urgent?1:Math.max(0,Math.min(1,(state.retreat??0)+(target?1:-1)*dt*(target?6:1.5)));
 return state.retreat>=1;
}

import {TIRE_RADIUS,VEHICLE_SCALE} from './contact.js';
export const ROAD_RELIEF_DIAMETER=2*TIRE_RADIUS*VEHICLE_SCALE;
const smooth=t=>t*t*(3-2*t);
const random=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
// Compact rounded mounds and hollows: footprints span one to four tires.
// Evaluate only neighbouring cells, with no allocations or global noise layers.
export function localRoadRelief(distance,lateral,seed=0){
 let height=0;
 const row=Math.floor(distance/9);
 for(let j=row-1;j<=row+1;j++)for(let lane=-1;lane<=1;lane++){
  const id=j*13+lane*67+seed*977;
  const diameter=ROAD_RELIEF_DIAMETER*(1+3*random(id+1)),r=diameter/2;
  const x=j*9+2+5*random(id+2),z=lane*4+(random(id+3)-.5)*2;
  const d=Math.hypot((distance-x)/r,(lateral-z)/r);
  if(d>=1)continue;
  const amplitude=diameter*(.035+.02*random(id+4))*(random(id+5)>.46?1:-1);
  height+=amplitude*(1-smooth(d));
 }
 return height;
}

import {vehicleProfile} from './vehicle-models.js';
import {engineById} from './engines.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const INSTRUMENT_STYLES=['auto','six','rect','round'];
export const INSTRUMENT_NAMES={six:'Rally Six',rect:'Ranger ’78',round:'Heritage ’66'};
export function instrumentStyle(preference,body){
 if(INSTRUMENT_STYLES.includes(preference)&&preference!=='auto')return preference;
 if(body==='godzilla78'||body==='monster80')return 'six';
 if(vehicleProfile(body).era>=1978)return 'rect';
 return ['ranger','sunset','expedition','copper78'].includes(body)?'rect':'round';
}
export function instrumentReading(car){
 const q=car.physics?.body.rotation()??{x:0,y:0,z:0,w:1},{x,y,z,w}=q;
 const fx=-2*(x*z+w*y),fy=2*(w*x-y*z),fz=-(1-2*(x*x+y*y));
 const pitch=Math.atan2(fy,Math.hypot(fx,fz))*180/Math.PI;
 const roll=Math.atan2(2*(x*y+w*z),1-2*(x*x+z*z))*180/Math.PI;
 const e=engineById(car.engineId);
 return {speed:Math.abs(car.speed??0)*3.6,rpm:car.powertrain?.rpm??e.idle,redline:e.redline,
  load:clamp(car.powertrain?.load??0,0,1)*100,nitro:clamp(car.nitro??100,0,100),pitch,roll,gear:car.powertrain?.gear??1};
}
export function loadGearColor(gear,load){
 if(gear<0)return '#000000';if(gear===0)return '#a0a5a0';
 return `hsl(${Math.round((1-clamp(load,0,100)/100)*120)} 80% 62%)`;
}

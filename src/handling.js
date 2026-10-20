import {tuning as cfg} from './tuning.js';
import {steeringStep} from './driving-controls.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const approach=(from,to,rate,dt)=>from+(to-from)*(1-Math.exp(-dt*rate));
export const HANDLING_PROFILES=['arcade','classic'];

// Assistance moves pedals and the rack, never chassis pose or velocity.
export function arcadePedals(state,input,dt){
 const target=clamp(input.throttle??0,0,1);
 state.throttle=approach(state.throttle??0,target,1/(target>(state.throttle??0)?cfg.arcadeThrottleBuild:cfg.arcadeThrottleRelease),dt);
 if(state.throttle<.001)state.throttle=0;
 state.handbrake=approach(state.handbrake??0,input.handbrake?1:0,12,dt);
 if(state.handbrake<.001)state.handbrake=0;
 return {...input,throttle:input.brake?0:state.throttle,handbrake:state.handbrake};
}
export function arcadeSteering(current,input,speed,sideSpeed,dt,{mode='return',center=false,airborne=false}={}){
 // Held steering remains held; release must not introduce a hidden countersteer.
 if(mode==='hold')return steeringStep(current,input,speed,dt,false,mode,center);
 const velocity=Math.abs(speed),parking=cfg.steerLow;
 const cornerLock=Math.atan2(2.506*cfg.gravity*cfg.arcadeLateralG,velocity*velocity+1);
 const lock=Math.min(parking,Math.max(cfg.steerHigh*.6,cornerLock));
 const slip=Math.atan2(sideSpeed,Math.max(4,velocity));
 const assist=!airborne&&speed>4?clamp(-slip*cfg.arcadeCountersteer,-.12,.12):0;
 const target=center?0:clamp((input??0)*lock+assist,-parking,parking);
 return approach(current,target,cfg.arcadeSteerResponse*(Math.sign(target)!==Math.sign(current)?1.3:1),dt);
}
// Downhill control uses ordinary wheel brakes in low range, only on contact.
export function descentDeceleration({enabled,mode,speed,slope,throttle,brake,contacts,rollover}){
 if(!enabled||!['lo','4x4'].includes(mode)||contacts<2||rollover||throttle>.03||brake)return 0;
 const downhill=-slope*Math.sign(speed),target=cfg.descentSpeed/3.6;
 if(downhill<.035||Math.abs(speed)<target)return 0;
 return clamp((Math.abs(speed)-target)*2+cfg.gravity*downhill,0,7);
}

import {engineById,engineTorque} from './engines.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const RATIOS=[3,1.75,1],FINAL_DRIVE=4.7,ROLLING_RADIUS=.34;
export function resetPowertrain(car){
 const engine=engineById(car.engineId);
 car.powertrain={engineId:engine.id,rpm:engine.idle,gear:1,shiftTime:0,cooldown:0,load:0,throttle:0,torque:0,limiter:false};
 return car.powertrain;
}
export function powertrainStep(car,input,dt){
 const e=engineById(car.engineId),state=car.powertrain?.engineId===e.id?car.powertrain:resetPowertrain(car);
 const reverse=input.brake&&car.speed<=.05,gas=input.brake?(reverse?1:0):clamp(input.throttle??0,0,1);
 const speed=Math.abs(car.speed),upgrade=1+(input.engine??0)*.08;
 state.cooldown=Math.max(0,state.cooldown-dt);state.shiftTime=Math.max(0,state.shiftTime-dt);
 if(reverse)state.gear=-1;else if(state.gear<0)state.gear=1;
 const wheelRpm=speed/ROLLING_RADIUS*60/(2*Math.PI)*FINAL_DRIVE;
 if(!car.airborne&&state.cooldown<=0&&state.gear>0){
  const coupled=wheelRpm*RATIOS[state.gear-1];
  const shiftUp=coupled>e.redline*.78&&gas>.1&&state.gear<3;
  const shiftDown=state.gear>1&&(coupled<1200||(gas>.8&&coupled<e.redline*.35&&wheelRpm*RATIOS[state.gear-2]<e.redline*.7));
  if(shiftUp||shiftDown){state.gear+=shiftUp?1:-1;state.shiftTime=.14;state.cooldown=.55;}
 }
 const ratio=state.gear<0?3.1:RATIOS[state.gear-1];
 const coupled=wheelRpm*ratio;
 const freeTarget=e.idle+gas*(e.redline-e.idle);
 // Converter slip permits a launch; in flight the engine revs freely without
 // applying tire force or changing the takeoff trajectory.
 const target=car.airborne?freeTarget:Math.max(e.idle+gas*950,coupled);
 const response=state.shiftTime>0?.045:e.inertia;
 state.rpm+= (clamp(target,e.idle,e.redline+100)-state.rpm)*(1-Math.exp(-dt/response));
 state.limiter=state.rpm>e.redline-60;
 const effectiveGas=gas*(state.shiftTime>0?.12:1)*(state.limiter?.2:1);
 state.throttle+=(effectiveGas-state.throttle)*(1-Math.exp(-dt/.1));
 state.load+=(gas*(car.airborne?.12:1)*(state.shiftTime>0?.15:1)-state.load)*(1-Math.exp(-dt/.13));
 state.torque=engineTorque(e,state.rpm)*effectiveGas*upgrade;
 // Common arcade pace scaling preserves the compact courses, while torque,
 // gearing, flywheel response and each engine's power band affect acceleration.
 const mass=car.style==='classic'?1650:2050;
 const converter=1+Math.max(0,1-speed/5)*.25;
 const force=state.torque*ratio*FINAL_DRIVE*.84/ROLLING_RADIUS*converter;
 let acceleration=car.airborne?0:clamp(force/mass*1.8,0,12)*(input.boost?1.42:1)*(reverse?-1:1);
 const braking=gas===0&&!car.airborne?-Math.sign(car.speed)*e.braking*clamp(state.rpm/e.redline,.2,1):0;
 const power=Math.max(...e.curve.map(([rpm,torque])=>rpm*torque/9549));
 const topSpeed=clamp(23*Math.cbrt(power/125),17,28)+(input.engine??0)*1.5;
 // Fade wheel force at the pace ceiling instead of deleting momentum when
 // nitro ends. Coasting and braking remain governed by drag and tire forces.
 const paceLimit=topSpeed*(input.boost?1.42:1);
 if(!reverse&&acceleration>0)acceleration*=clamp((paceLimit-car.speed)/1.5,0,1);
 return {acceleration:acceleration+braking,topSpeed,rpm:state.rpm,gear:state.gear,torque:state.torque,load:state.load};
}

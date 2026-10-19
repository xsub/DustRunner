import {tuning as cfg} from './tuning.js';
import {engineById,engineTorque} from './engines.js';
import {vehicleMass} from './vehicle-mass.js';
import {rollingResistance} from './driving-controls.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

export function resetPowertrain(car){
 const engine=engineById(car.engineId);
 car.powertrain={engineId:engine.id,rpm:engine.idle,gear:1,shiftTime:0,cooldown:0,load:0,throttle:0,torque:0,limiter:false,grade:0,roadLoad:0};
 return car.powertrain;
}
// Match the replacement engine to current road speed without resetting motion.
export function swapEngine(car,engineId){
 const engine=engineById(engineId);if(engine.id!==engineId)throw new Error('Unknown engine');
 const reverse=car.powertrain?.gear<0||car.physics?.controls.reverseTravel;
 const old=car.powertrain,previousEngine=engineById(car.engineId);
 car.engineId=engineId;const state=resetPowertrain(car),ratios=[cfg.gear1,cfg.gear2,cfg.gear3];
 const wheelRpm=Math.abs(car.speed??0)/cfg.driveRadius*60/(2*Math.PI)*cfg.finalDrive;
 state.gear=reverse?-1:Math.max(1,ratios.findIndex(ratio=>wheelRpm*ratio<=engine.redline*cfg.shiftRpm)+1);
 if(!reverse&&ratios.every(ratio=>wheelRpm*ratio>engine.redline*cfg.shiftRpm))state.gear=3;
 state.rpm=clamp(car.airborne&&old?old.rpm/previousEngine.redline*engine.redline:wheelRpm*(reverse?3.1:ratios[state.gear-1]),engine.idle,engine.redline);
 state.cooldown=.35;state.grade=old?.grade??0;state.roadLoad=old?.roadLoad??0;
 return state;
}
export function powertrainStep(car,input,dt){
 const RATIOS=[cfg.gear1,cfg.gear2,cfg.gear3],FINAL_DRIVE=cfg.finalDrive,ROLLING_RADIUS=cfg.driveRadius;
 const e=engineById(car.engineId),state=car.powertrain?.engineId===e.id?car.powertrain:resetPowertrain(car);
 const reverse=input.reverse??(input.brake&&car.speed<=.05),gas=input.brake?(reverse?clamp(input.reverseThrottle??1,0,1):0):clamp(input.throttle??0,0,1);
 const speed=Math.abs(car.speed),upgrade=1+(input.engine??0)*.08,mass=vehicleMass(car.style,car.engineId);
 const grade=car.airborne?0:Math.max(0,input.slope??0);
 state.grade+=(grade-(state.grade??0))*(1-Math.exp(-dt/.35));
 state.roadLoad=rollingResistance(speed,input.onDirt!==false)+speed*.025+cfg.gravity*state.grade;
 const capacity=ratio=>{
  const rpm=clamp(speed/ROLLING_RADIUS*60/(2*Math.PI)*FINAL_DRIVE*ratio,e.idle,e.redline);
  return engineTorque(e,rpm)*cfg.torqueScale*upgrade*ratio*FINAL_DRIVE*.84/ROLLING_RADIUS/mass*cfg.driveScale;
 };
 state.cooldown=Math.max(0,state.cooldown-dt);state.shiftTime=Math.max(0,state.shiftTime-dt);
 if(reverse)state.gear=-1;else if(state.gear<0)state.gear=1;
 const wheelRpm=speed/ROLLING_RADIUS*60/(2*Math.PI)*FINAL_DRIVE;
 if(!car.airborne&&state.cooldown<=0&&state.gear>0){
  const coupled=wheelRpm*RATIOS[state.gear-1];
  const climbing=state.grade>.07;
  const nextCapacity=state.gear<3?capacity(RATIOS[state.gear]):0;
  // Hold the climbing gear if the next gear cannot sustain road load. A
  // distinct downshift threshold and dwell prevent repeated 2↔3 hunting.
  const holdForHill=climbing&&nextCapacity<state.roadLoad+.8&&coupled<e.redline*.95;
  const shiftUp=coupled>e.redline*cfg.shiftRpm&&gas>.1&&state.gear<3&&!holdForHill;
  const lowerRpm=state.gear>1?wheelRpm*RATIOS[state.gear-2]:Infinity;
  const hillKickdown=climbing&&gas>.65&&capacity(RATIOS[state.gear-1])<state.roadLoad+.9&&lowerRpm<e.redline*.86;
  const shiftDown=state.gear>1&&(coupled<1200||(gas>.8&&coupled<e.redline*.35&&lowerRpm<e.redline*.7)||hillKickdown);
  if(shiftUp||shiftDown){state.gear+=shiftUp?1:-1;state.shiftTime=.14;state.cooldown=climbing?1.25:.65;}
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
 state.torque=engineTorque(e,state.rpm)*cfg.torqueScale*effectiveGas*upgrade;
 // Common arcade pace scaling preserves the compact courses, while torque,
 // gearing, flywheel response and each engine's power band affect acceleration.
 const converter=1+Math.max(0,1-speed/5)*.25;
 const force=state.torque*ratio*FINAL_DRIVE*.84/ROLLING_RADIUS*converter;
 let acceleration=car.airborne?0:clamp(force/mass*cfg.driveScale,0,12)*(input.boost?cfg.boostScale:1)*(reverse?-1:1);
 const braking=gas===0&&!car.airborne?-Math.sign(car.speed)*e.braking*cfg.engineBraking*clamp(state.rpm/e.redline,.2,1):0;
 const power=Math.max(...e.curve.map(([rpm,torque])=>rpm*torque/9549));
 const topSpeed=(clamp(23*Math.cbrt(power*cfg.torqueScale/125),17,28)+(input.engine??0)*1.5)*cfg.topSpeedScale;
 // Fade wheel force at the pace ceiling instead of deleting momentum when
 // nitro ends. Coasting and braking remain governed by drag and tire forces.
 const paceLimit=topSpeed*(input.boost?cfg.boostScale:1);
 const governor=!reverse?clamp((paceLimit-car.speed)/1.5,0,1):1;
 if(!reverse&&acceleration>0)acceleration*=governor;
 // Audible load follows delivered torque and resistance, rather than just
 // mirroring the accelerator key. Governor and shifts close the throttle;
 // a loaded climb opens the exhaust sound, coasting removes the pull layer.
 const utilization=clamp(state.roadLoad/Math.max(1,capacity(ratio)),0,1);
 const targetLoad=effectiveGas*governor*(.58+.42*utilization)*(car.airborne?.12:1);
 state.load+=(targetLoad-state.load)*(1-Math.exp(-dt/.16));
 return {acceleration:acceleration+braking,engineBraking:braking,topSpeed,rpm:state.rpm,gear:state.gear,torque:state.torque,load:state.load};
}

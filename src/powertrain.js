import {tuning as cfg} from './tuning.js';
import {engineById,engineTorque} from './engines.js';
import {vehicleMass} from './vehicle-mass.js';
import {driveModeById,DRIVE_MODES,RANGE_SHIFT_SPEED} from './drive-modes.js';
import {rollingResistance} from './driving-controls.js';
import {gearboxFor,transmissionMode,TRANSMISSION_MODES} from './transmissions.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

const gearLimit=(car,mode)=>transmissionMode(car)==='arcade'?mode.maxGear:gearboxFor(car).ratios.length;
function matchGear(state,engine,speed,mode,car){
 const box=gearboxFor(car),limit=gearLimit(car,mode),ratios=box.ratios,wheelRpm=Math.abs(speed)/cfg.driveRadius*60/(2*Math.PI)*cfg.finalDrive*mode.range;
 if(state.gear>0){state.gear=limit;for(let i=0;i<limit;i++)if(wheelRpm*ratios[i]<=engine.redline*cfg.shiftRpm){state.gear=i+1;break;}}
 state.rpm=clamp(wheelRpm*(state.gear<0?box.reverse:state.gear===0?0:ratios[state.gear-1]),engine.idle,engine.redline);
}
function updateRange(car,state){
 const requested=driveModeById(car.driveMode),speed=Math.abs(car.speed??0),safe=!car.airborne&&speed<=RANGE_SHIFT_SPEED;
 if(state.mode!==requested.id&&(requested.id!=='4x4'||safe)){
  state.mode=requested.id;matchGear(state,engineById(car.engineId),speed,requested,car);state.shiftTime=.14;state.cooldown=.35;
 }
 state.pendingMode=state.mode!==requested.id?requested.id:null;
 if(state.mode!=='4x4')state.locks={front:false,rear:false};
 else if(safe)state.locks={front:car.axleLocks?.front??true,rear:car.axleLocks?.rear??true};
 return driveModeById(state.mode);
}
export function selectDriveMode(car,id){
 if(!DRIVE_MODES.some(mode=>mode.id===id))throw new Error('Unknown drive mode');
 car.driveMode=id;const state=car.powertrain??resetPowertrain(car);updateRange(car,state);return state;
}
export function resetPowertrain(car){
 const engine=engineById(car.engineId),requested=driveModeById(car.driveMode),old=car.powertrain;
 const mode=requested.id==='4x4'&&(car.airborne||Math.abs(car.speed??0)>RANGE_SHIFT_SPEED)?driveModeById(old?.mode):requested;
 car.powertrain={engineId:engine.id,transmissionMode:transmissionMode(car),transmissionId:gearboxFor(car).id,mode:mode.id,locks:{front:false,rear:false},rpm:engine.idle,gear:1,shiftTime:0,cooldown:0,load:0,throttle:0,torque:0,limiter:false,grade:0,roadLoad:0};
 if(mode.id==='4x4'&&old?.mode==='4x4')car.powertrain.locks={...old.locks};
 updateRange(car,car.powertrain);return car.powertrain;
}
// Replacement engines retain speed, selected range and axle lock requests.
export function swapEngine(car,engineId){
 const engine=engineById(engineId);if(engine.id!==engineId)throw new Error('Unknown engine');
 const reverse=car.powertrain?.gear<0||transmissionMode(car)!=='manual'&&car.physics?.controls.reverseTravel,neutral=transmissionMode(car)==='manual'&&car.powertrain?.gear===0;
 const old=car.powertrain,previousEngine=engineById(car.engineId);
 car.engineId=engineId;const state=resetPowertrain(car);if(reverse)state.gear=-1;if(neutral)state.gear=0;
 matchGear(state,engine,car.speed??0,driveModeById(state.mode),car);
 if(car.airborne&&old)state.rpm=clamp(old.rpm/previousEngine.redline*engine.redline,engine.idle,engine.redline);
 state.cooldown=.35;state.grade=old?.grade??0;state.roadLoad=old?.roadLoad??0;return state;
}
export function powertrainStep(car,input,dt){
 const box=gearboxFor(car),RATIOS=box.ratios,ROLLING_RADIUS=cfg.driveRadius,manual=transmissionMode(car)==='manual';
 const e=engineById(car.engineId),state=car.powertrain?.engineId===e.id&&car.powertrain.transmissionMode===transmissionMode(car)?car.powertrain:resetPowertrain(car);
 const mode=updateRange(car,state),FINAL_DRIVE=cfg.finalDrive*mode.range,driveScale=cfg.driveScale*1.35;
 const reverse=manual?state.gear<0:input.reverse??(input.brake&&car.speed<=.05),gas=input.brake?(reverse&&!manual?clamp(input.reverseThrottle??1,0,1):0):clamp(input.throttle??0,0,1);
 const pedal=gas*mode.pedal;
 const directedSpeed=reverse?-car.speed:car.speed,coupledSpeed=Math.max(0,directedSpeed);
 const speed=Math.abs(car.speed),upgrade=1+(input.engine??0)*.08,mass=vehicleMass(car.style,car.engineId);
 const grade=car.airborne?0:Math.max(0,input.slope??0);
 state.grade+=(grade-(state.grade??0))*(1-Math.exp(-dt/.35));
 state.roadLoad=rollingResistance(speed,input.onDirt!==false)+speed*.025+cfg.gravity*state.grade;
 const capacity=ratio=>{
  const rpm=clamp(coupledSpeed/ROLLING_RADIUS*60/(2*Math.PI)*FINAL_DRIVE*ratio,e.idle,e.redline);
  return engineTorque(e,rpm)*cfg.torqueScale*upgrade*ratio*FINAL_DRIVE*.84/ROLLING_RADIUS/mass*driveScale;
 };
 state.cooldown=Math.max(0,state.cooldown-dt);state.shiftTime=Math.max(0,state.shiftTime-dt);if(state.shiftTime===0&&state.shiftNotice==='Trwa zmiana biegu')state.shiftNotice='';
 if(!manual){if(reverse)state.gear=-1;else if(state.gear<0)state.gear=1;}
 const wheelRpm=coupledSpeed/ROLLING_RADIUS*60/(2*Math.PI)*FINAL_DRIVE;
 const maxGear=gearLimit(car,mode);if(state.gear>maxGear)state.gear=maxGear;
 if(!manual&&!car.airborne&&state.cooldown<=0&&state.gear>0){
  const coupled=wheelRpm*RATIOS[state.gear-1];
  const climbing=state.grade>.07;
  const nextCapacity=state.gear<maxGear?capacity(RATIOS[state.gear]):0;
  // Hold the current gear if the next cannot sustain road load. A
  // distinct downshift threshold and dwell prevent repeated 2↔3 hunting.
  const holdForLoad=nextCapacity<state.roadLoad+.6&&coupled<e.redline*.95;
  const shiftUp=coupled>e.redline*cfg.shiftRpm&&gas>.1&&state.gear<maxGear&&!holdForLoad;
  const lowerRpm=state.gear>1?wheelRpm*RATIOS[state.gear-2]:Infinity;
  const hillKickdown=climbing&&gas>.65&&capacity(RATIOS[state.gear-1])<state.roadLoad+.9&&lowerRpm<e.redline*.86;
  const shiftDown=state.gear>1&&(coupled<1200||(gas>.8&&coupled<e.redline*.35&&lowerRpm<e.redline*.7)||hillKickdown);
  if(shiftUp||shiftDown){state.gear+=shiftUp?1:-1;state.shiftTime=box.shiftTime;state.cooldown=climbing?1.25:.65;}
 }
 const ratio=state.gear<0?box.reverse:state.gear===0?0:RATIOS[state.gear-1];
 const coupled=wheelRpm*ratio;
 const freeTarget=e.idle+pedal*(e.redline-e.idle);
 // Converter slip permits a launch; in flight the engine revs freely without
 // applying tire force or changing the takeoff trajectory.
 const target=car.airborne||state.gear===0?freeTarget:Math.max(e.idle+pedal*950,coupled);
 const response=state.shiftTime>0?.045:e.inertia;
 state.rpm+= (clamp(target,e.idle,e.redline+100)-state.rpm)*(1-Math.exp(-dt/response));
 state.limiter=state.rpm>e.redline-60;
 const effectiveGas=pedal*(state.shiftTime>0?.12:1)*(state.limiter?.2:1);
 state.throttle+=(effectiveGas-state.throttle)*(1-Math.exp(-dt/.1));
 state.torque=engineTorque(e,state.rpm)*cfg.torqueScale*effectiveGas*upgrade;
 // Stronger arcade response retains each engine's torque curve and mass.
 // Transfer reduction raises wheel torque and engine RPM at the same speed.
 const converter=1+Math.max(0,1-speed/5)*.25;
 const force=state.torque*ratio*FINAL_DRIVE*.84/ROLLING_RADIUS*converter;
 let acceleration=car.airborne?0:clamp(force/mass*driveScale,0,mode.id==='4x4'?2.4+cfg.gravity*state.grade:12)*(input.boost&&mode.boost?cfg.boostScale:1)*(reverse?-1:1);
 const braking=gas===0&&!car.airborne&&state.gear!==0?-Math.sign(car.speed)*e.braking*cfg.engineBraking*(mode.low?Math.sqrt(mode.range):1)*clamp(state.rpm/e.redline,.2,1):0;
 const power=Math.max(...e.curve.map(([rpm,torque])=>rpm*torque/9549));
 const topSpeed=(mode.id==='4x4'?3.6:(clamp(32*Math.cbrt(power*cfg.torqueScale/125),24,40)+(input.engine??0)*1.5)*mode.pace)*cfg.topSpeedScale;
 // Fade wheel force at the pace ceiling instead of deleting momentum when
 // nitro ends. Coasting and braking remain governed by drag and tire forces.
 const engineCeiling=manual&&ratio>0?e.redline/(ratio*FINAL_DRIVE)*ROLLING_RADIUS*2*Math.PI/60:Infinity;
 const paceLimit=Math.min(engineCeiling,reverse?(mode.id==='4x4'?1.6:mode.low?3.5:8):topSpeed*(input.boost&&mode.boost?cfg.boostScale:1));
 const governor=clamp((paceLimit-directedSpeed)/(mode.id==='4x4'?.35:1.5),0,1);
 acceleration*=governor;
 // Audible load follows delivered torque and resistance, rather than just
 // mirroring the accelerator key. Governor and shifts close the throttle;
 // a loaded climb opens the exhaust sound, coasting removes the pull layer.
 const utilization=clamp(state.roadLoad/Math.max(1,capacity(ratio)),0,1);
 const targetLoad=effectiveGas*governor*(.58+.42*utilization)*(car.airborne?.12:state.gear===0?.08:1);
 state.load+=(targetLoad-state.load)*(1-Math.exp(-dt/.16));
 return {acceleration:acceleration+braking,engineBraking:braking,topSpeed,rpm:state.rpm,gear:state.gear,torque:state.torque,load:state.load};
}

export function selectTransmissionMode(car,mode){
 if(!TRANSMISSION_MODES.includes(mode))throw new Error('Unknown transmission mode');
 const old=car.powertrain,reverse=old?.gear<0;car.transmissionMode=mode;
 const state=resetPowertrain(car);if(reverse)state.gear=-1;
 matchGear(state,engineById(car.engineId),car.speed??0,driveModeById(state.mode),car);
 state.shiftTime=gearboxFor(car).shiftTime;return state;
}
export function shiftGear(car,gear){
 if(transmissionMode(car)!=='manual')return false;
 const state=car.powertrain??resetPowertrain(car),box=gearboxFor(car),engine=engineById(car.engineId);
 if(!Number.isInteger(gear)||gear< -1||gear>box.ratios.length)return false;
 if(state.shiftTime>.01){state.shiftNotice='Trwa zmiana biegu';return false;}
 if(gear!==0&&((gear<0&&car.speed>.6)||(gear>0&&car.speed<-.6))){state.shiftNotice='Zatrzymaj auto przed zmianą kierunku';return false;}
 const ratio=gear<0?box.reverse:gear===0?0:box.ratios[gear-1],rpm=Math.abs(car.speed??0)/cfg.driveRadius*60/(2*Math.PI)*cfg.finalDrive*driveModeById(state.mode).range*ratio;
 if(!car.airborne&&rpm>engine.redline*.97&&(state.gear<=0||gear<state.gear)){state.shiftNotice='Za wysokie obroty · najpierw zwolnij';return false;}
 state.gear=gear;state.shiftTime=box.shiftTime;state.cooldown=.5;state.shiftNotice='';return true;
}

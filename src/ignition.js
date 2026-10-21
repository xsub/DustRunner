export const START_TIME=1.1,STOP_TIME=.45;
export const ignitionPhase=car=>car.ignition?.phase??'running';
export function resetIgnition(car){car.ignition={phase:'running',time:0,notice:'',noticeTime:0,serial:(car.ignition?.serial??0)+1};}
export function requestIgnition(car){
 const phase=ignitionPhase(car);
 if(phase==='starting'||phase==='stopping')return false;
 if(!car.ignition)resetIgnition(car);
 if(phase==='running'&&(car.airborne||Math.abs(car.speed??0)>.25||Math.hypot(car.vx??0,car.vz??0)>.25||Math.abs(car.vertical??0)>.4)){
  car.ignition.notice='ZATRZYMAJ AUTO, ABY ZGASIĆ';car.ignition.noticeTime=2.5;return false;
 }
 Object.assign(car.ignition,{phase:phase==='off'?'starting':'stopping',time:0,notice:'',noticeTime:0,serial:(car.ignition.serial??0)+1,stopRpm:car.powertrain?.rpm??700});return true;
}
export function ignitionStep(car,dt,idle=700){
 const state=car.ignition;if(!state)return {phase:'running',rpm:idle};
 state.noticeTime=Math.max(0,state.noticeTime-dt);if(!state.noticeTime)state.notice='';
 state.time+=dt;
 if(state.phase==='starting'&&state.time>=START_TIME){state.phase='running';state.time=0;}
 if(state.phase==='stopping'&&state.time>=STOP_TIME){state.phase='off';state.time=0;}
 const rpm=state.phase==='off'?0:state.phase==='stopping'?state.stopRpm*Math.max(0,1-state.time/STOP_TIME):state.phase==='starting'?180+Math.min(1,Math.max(0,(state.time-.75)/.35))*(idle-180):idle;
 return {phase:state.phase,rpm};
}

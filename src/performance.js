import {tuning as cfg} from './tuning.js';
import {engineTorque} from './engines.js';
import {arcadeMotion} from './race.js';

export function curvePerformance(engine){
 const peakTorque=Math.max(...engine.curve.map(p=>p[1]));
 let powerKw=0,powerRpm=engine.idle;
 const check=rpm=>{const power=rpm*engineTorque(engine,rpm)/9549;if(power>powerKw){powerKw=power;powerRpm=rpm;}};
 for(let i=1;i<engine.curve.length;i++){
  const [x,y]=engine.curve[i-1],[xx,yy]=engine.curve[i];
  check(x);check(xx);
  const slope=(yy-y)/(xx-x),intercept=y-slope*x;
  if(slope<0){const extremum=-intercept/(2*slope);if(extremum>x&&extremum<xx)check(extremum);}
 }
 return {peakTorque:peakTorque*cfg.torqueScale,powerKw:powerKw*cfg.torqueScale,powerHp:powerKw*cfg.torqueScale/.745699872,powerRpm};
}

// A fresh car for every run: no persistent upgrades, nitro, steering or terrain
// features. This is the longitudinal drivetrain bench, not the full 3D vehicle.
export function benchmarkEngine(engine,body='classic'){
 const car={engineId:engine.id,style:body==='classic'?'classic':'ranger',speed:0,heading:0,x:0,z:0,vx:0,vz:0};
 const dt=1/60,target=50/3.6;let zeroTo50=null;
 for(let frame=0;frame<60*60;frame++){
  const before=car.speed;
  arcadeMotion(car,{throttle:1,steer:0,brake:false,boost:false,onDirt:true,engine:0,tires:0},dt);
  if(zeroTo50===null&&before<target&&car.speed>=target)zeroTo50=frame*dt+(target-before)/(car.speed-before)*dt;
 }
 return {engineId:engine.id,...curvePerformance(engine),zeroTo50,speedKmh:car.speed*3.6};
}

import {initPhysics,createPhysics} from '../src/physics.js';
import {buildDesert} from '../src/desert.js';
import {jumpPoint,jumpCoordinates,jumpEnd} from '../src/desert-jumps.js';
await initPhysics();
const variant=process.argv[2]??'jumpy',seed=Number(process.argv[3]??20261022),terrain=buildDesert({variant,seed});
const runs=variant==='jumpy'?[{id:'dune-line',x:0,z:210,heading:0}]:[...terrain.rockRamps,...terrain.jumps.filter(j=>j.paired)];
for(const jump of runs)for(const engineId of ['170','302','godzilla73']){
 const p=createPhysics(terrain,terrain.bounds),car={...(jump.runup?jumpPoint(jump,-245):jump),heading:jump.heading,style:'classic',engineId,speed:0,transmissionMode:'automatic',driveMode:'auto'};p.reset(car);
 let flight=0,flights=[],launch=null,maxHeight=0,lastVy=0;
 for(let i=0;i<120*35;i++){
  p.input(car,{throttle:i>240?1:0,steer:0,onDirt:true},1/120);p.step();p.sync(car,1/120);
  const s=jump.runup?jumpCoordinates(jump,car.x,car.z).s:210-car.z;
  if(car.airborne){if(!flight)launch={s,speed:car.speed*3.6,vy:car.physics.body.linvel().y,height:car.height};flight+=1/120;}
  else if(flight){if(flight>.12)flights.push({...launch,range:s-launch.s,duration:flight,landing:s,side:jump.runup?jumpCoordinates(jump,car.x,car.z).side:car.x,impact:lastVy});flight=0;}
  lastVy=car.physics.body.linvel().y;maxHeight=Math.max(maxHeight,car.height);
  if(car.rollover||s>(jump.runup?jumpEnd(jump)+70:500))break;
 }
 console.log(JSON.stringify({variant,seed,recommendedTakeoffKmh:jump.takeoffSpeedKmh,id:jump.id,engineId,flights,maxHeight,rollover:car.rollover,end:jump.runup?jumpCoordinates(jump,car.x,car.z).s:210-car.z}));p.dispose();
}

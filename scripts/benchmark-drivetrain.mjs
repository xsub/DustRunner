import {initPhysics,createPhysics} from '../src/physics.js';
import {DRIVE_MODES} from '../src/drive-modes.js';
await initPhysics();
const terrain={positions:new Float32Array([-5000,0,-5000,5000,0,-5000,-5000,0,5000,5000,0,5000]),indices:new Uint32Array([0,2,1,1,2,3]),heightAt:()=>0};
for(const engineId of process.argv.slice(2).length?process.argv.slice(2):['170','302','351wefi'])for(const mode of DRIVE_MODES){
 const physics=createPhysics(terrain,{min:{x:-5000,z:-5000},max:{x:5000,z:5000}}),car={engineId,style:'classic',driveMode:mode.id,axleLocks:{front:true,rear:true},x:0,z:0,heading:0,speed:0};
 physics.reset(car);let zeroTo50=null,zeroTo80=null,speedAt10;
 for(let i=0;i<120*60;i++){
  physics.input(car,{throttle:1,steer:0,onDirt:true},1/120);physics.step();physics.sync(car,1/120);
  if(zeroTo50===null&&car.speed>=50/3.6)zeroTo50=(i+1)/120;
  if(zeroTo80===null&&car.speed>=80/3.6)zeroTo80=(i+1)/120;
  if(i===1199)speedAt10=car.speed*3.6;
 }
 console.log(JSON.stringify({engineId,mode:mode.id,zeroTo50,zeroTo80,speedAt10,speedAt60:car.speed*3.6,rpm:car.powertrain.rpm,gear:car.powertrain.gear,locks:car.powertrain.locks}));physics.dispose();
}

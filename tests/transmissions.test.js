import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {ENGINES,engineById} from '../src/engines.js';
import {ENGINE_TRANSMISSIONS,transmissionForEngine,gearboxFor,gearLabel} from '../src/transmissions.js';
import {powertrainStep,resetPowertrain,selectTransmissionMode,shiftGear,swapEngine,selectDriveMode} from '../src/powertrain.js';
import {drivingControls} from '../src/driving-controls.js';
import {initPhysics,createPhysics} from '../src/physics.js';
const dt=1/120,input={throttle:1,onDirt:true,slope:0};
const car=(engineId='302')=>({engineId,style:engineId==='godzilla73'?'godzilla78':'classic',driveMode:'hi',speed:0,airborne:false,x:0,z:0,heading:0});
const settleShift=c=>{for(let i=0;i<60;i++)powertrainStep(c,{...input,throttle:0},dt);};
before(initPhysics);
test('every engine has an immutable fixed gearbox and every forward ratio is selectable',()=>{
 assert.equal(Object.keys(ENGINE_TRANSMISSIONS).length,ENGINES.length);
 for(const e of ENGINES){const c=car(e.id),box=transmissionForEngine(e.id);assert.ok(Object.isFrozen(box)&&Object.isFrozen(box.ratios));
  assert.ok(box.ratios.every((r,i)=>r>0&&(i===0||r<box.ratios[i-1])));selectTransmissionMode(c,'manual');settleShift(c);
  for(let gear=-1;gear<=box.ratios.length;gear++){assert.equal(shiftGear(c,gear),true,`${e.id}: ${gear}`);assert.equal(c.powertrain.gear,gear);settleShift(c);}
  assert.equal(shiftGear(c,box.ratios.length+1),false);
 }
 assert.equal(transmissionForEngine('godzilla73').ratios.length,10);assert.equal(transmissionForEngine('300').ratios.length,4);
});
test('manual holds its selected gear; neutral removes drive and engine braking but allows free revving',()=>{
 const c=car();selectTransmissionMode(c,'manual');settleShift(c);c.speed=18;
 for(let i=0;i<600;i++)powertrainStep(c,input,dt);assert.equal(c.powertrain.gear,1);assert.ok(c.powertrain.rpm<=engineById(c.engineId).redline+100);
 assert.equal(shiftGear(c,0),true);for(let i=0;i<300;i++){const drive=powertrainStep(c,input,dt);assert.equal(drive.acceleration,0);assert.equal(drive.engineBraking,0);}
 assert.ok(c.powertrain.rpm>4500);assert.equal(gearLabel(c),'N');
});
test('manual shifting protects reverse and over-rev reductions, including through neutral',()=>{
 const c=car('godzilla73');selectTransmissionMode(c,'manual');settleShift(c);assert.equal(shiftGear(c,10),true);settleShift(c);c.speed=40;
 assert.equal(shiftGear(c,1),false);assert.equal(c.powertrain.gear,10);assert.equal(c.speed,40);
 assert.equal(shiftGear(c,-1),false);assert.equal(shiftGear(c,0),true);settleShift(c);c.speed=-5;
 assert.equal(shiftGear(c,1),false);assert.equal(c.powertrain.gear,0);
 c.speed=0;assert.equal(shiftGear(c,-1),true);settleShift(c);assert.equal(gearLabel(c),'R');assert.ok(powertrainStep(c,input,dt).acceleration<0);
 const controls={};for(let i=0;i<300;i++)drivingControls(controls,{brake:true,manualGearbox:true},0,dt);assert.equal(controls.reverse,false);assert.ok(controls.brakePressure>.99);
});
test('gearbox follows hot-swapped engine and HI/LO keeps all forward gears without deleting momentum',()=>{
 const c=car('godzilla73');selectTransmissionMode(c,'manual');settleShift(c);shiftGear(c,10);settleShift(c);c.speed=20;
 swapEngine(c,'302');assert.equal(c.transmissionMode,'manual');assert.equal(c.powertrain.transmissionId,'c4');assert.ok(c.powertrain.gear<=3);assert.equal(c.speed,20);
 swapEngine(c,'godzilla73');selectDriveMode(c,'lo');assert.equal(c.powertrain.transmissionId,'torqshift');assert.equal(c.speed,20);assert.ok(c.powertrain.gear>=1&&c.powertrain.gear<=10);
 c.speed=0;settleShift(c);selectDriveMode(c,'4x4');settleShift(c);assert.equal(shiftGear(c,10),true);powertrainStep(c,input,dt);assert.equal(c.powertrain.gear,10);
});
test('all engines run their assigned full automatic without invalid RPM or gears, while Arcade retains DEV ratios',()=>{
 for(const e of ENGINES){const c=car(e.id);selectTransmissionMode(c,'automatic');
  for(let i=0;i<120*30;i++){const drive=powertrainStep(c,input,dt);c.speed=Math.max(0,c.speed+(drive.acceleration-c.speed*.06)*dt);assert.ok(Number.isFinite(drive.rpm));assert.ok(c.powertrain.gear>=1&&c.powertrain.gear<=gearboxFor(c).ratios.length);}
  assert.ok(c.speed>10,e.id);selectTransmissionMode(c,'arcade');assert.equal(gearboxFor(c).ratios.length,3);assert.ok(c.powertrain.gear<=3);
 }
});
test('real physics: manual reverse drives backwards, the brake stops it, and neutral coasts',()=>{
 const terrain={positions:new Float32Array([-500,0,-500,500,0,-500,-500,0,500,500,0,500]),indices:new Uint32Array([0,2,1,1,2,3]),heightAt:()=>0};
 const p=createPhysics(terrain,{min:{x:-500,z:-500},max:{x:500,z:500}}),c=car();selectTransmissionMode(c,'manual');p.reset(c);
 const step=(controls={})=>{p.input(c,{throttle:0,steer:0,onDirt:true,...controls},dt);p.step();p.sync(c,dt);};
 try{
  for(let i=0;i<180;i++)step();assert.equal(shiftGear(c,-1),true);
  for(let i=0;i<360;i++)step({throttle:.6});assert.ok(c.speed< -1);assert.ok(c.z>2);
  for(let i=0;i<420;i++)step({brake:true});assert.ok(Math.abs(c.speed)<.2);assert.equal(c.powertrain.gear,-1);assert.equal(c.physics.controls.reverse,false);
  assert.equal(shiftGear(c,0),true);for(let i=0;i<120;i++)step({throttle:1});assert.ok(Math.abs(c.speed)<.2);assert.equal(c.powertrain.gear,0);
 }finally{p.dispose();}
});

test('manual rev ceiling limits first-gear propulsion and an upshift can always recover an overspeed gear',()=>{
 const c=car('godzilla73');selectTransmissionMode(c,'manual');settleShift(c);c.speed=30;
 assert.equal(shiftGear(c,2),true,'upshift must remain available even if the next gear is still over redline');settleShift(c);c.speed=0;shiftGear(c,1);settleShift(c);
 for(let i=0;i<120*30;i++){const drive=powertrainStep(c,input,dt);c.speed=Math.max(0,c.speed+(drive.acceleration-c.speed*.06)*dt);}
 assert.equal(c.powertrain.gear,1);assert.ok(c.speed*3.6<50,`first gear speed ${c.speed*3.6}`);assert.ok(c.speed*3.6>25);
});

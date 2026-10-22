import test from 'node:test';
import assert from 'node:assert/strict';
import {cycleDrivingMode,drivingMode} from '../src/driving-mode.js';
import {resetPowertrain} from '../src/powertrain.js';
const car=()=>({engineId:'302',driveMode:'auto',transmissionMode:'automatic',speed:0,airborne:false,axleLocks:{front:true,rear:true}});
test('primary control cycles automatic, manual, crawler and back to full automatic repeatedly',()=>{
 const c=car();resetPowertrain(c);
 for(let i=0;i<4;i++){
  assert.equal(drivingMode(c),'A');assert.equal(cycleDrivingMode(c),'M');assert.equal(c.transmissionMode,'manual');assert.equal(c.driveMode,'auto');
  assert.equal(cycleDrivingMode(c),'4x4');assert.equal(c.transmissionMode,'automatic');assert.equal(c.powertrain.mode,'4x4');
  assert.equal(cycleDrivingMode(c),'A');assert.equal(c.powertrain.mode,'auto');assert.equal(c.transmissionMode,'automatic');
 }
});
test('crawler request at speed remains pending and can be cancelled by next click',()=>{
 const c=car();resetPowertrain(c);c.speed=15;cycleDrivingMode(c);cycleDrivingMode(c);
 assert.equal(drivingMode(c),'4x4');assert.equal(c.powertrain.mode,'auto');assert.equal(c.powertrain.pendingMode,'4x4');
 cycleDrivingMode(c);assert.equal(c.driveMode,'auto');assert.equal(c.powertrain.pendingMode,null);
});

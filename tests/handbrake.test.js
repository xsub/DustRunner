import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Handbrake} from '../src/handbrake.js';
test('Shift stays momentary even after long holds at different physics rates',()=>{
 for(const hz of [30,60,120]){const b=new Handbrake();for(let i=0;i<hz*5;i++)assert.equal(b.update(true,1/hz),true);assert.equal(b.latched,false);assert.equal(b.update(false,1/hz),false);}
});
test('parking toggle latches immediately and a second toggle releases',()=>{
 const b=new Handbrake();assert.equal(b.toggle(),true);for(let i=0;i<100;i++)assert.equal(b.update(false,1/120),true);assert.equal(b.toggle(),false);assert.equal(b.active,false);
});
test('momentary Shift never silently releases the parking lock; pause preserves it, reset clears it',()=>{
 const b=new Handbrake();b.toggle();b.press();b.release();assert.equal(b.latched,true);b.cancelHold();assert.equal(b.active,true);b.reset();assert.equal(b.active,false);b.press();b.cancelHold();assert.equal(b.active,false);
});

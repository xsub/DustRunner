import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindTouchControls} from '../src/touch-controls.js';
function button(key){const handlers={},classes=new Set();return {dataset:{key},classList:{add:c=>classes.add(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c)},setPointerCapture(){},addEventListener:(name,callback)=>handlers[name]=callback,fire:(name,id)=>handlers[name]({pointerId:id,preventDefault(){}}),classes};}
test('two thumbs can steer and accelerate independently, including cancellation',()=>{
 const keys=new Set(),left=button('ArrowLeft'),gas=button('ArrowUp');
 bindTouchControls([left,gas],{keys,enabled:()=>true});
 left.fire('pointerdown',1);gas.fire('pointerdown',2);assert.deepEqual([...keys],['ArrowLeft','ArrowUp']);
 left.fire('pointercancel',1);assert.deepEqual([...keys],['ArrowUp']);assert.equal(left.classes.size,0);
 gas.fire('lostpointercapture',2);assert.equal(keys.size,0);
});
test('releasing one pointer on the same button keeps the remaining hold; clear releases handbrake',()=>{
 const keys=new Set(),hb=button('ShiftLeft'),events=[];
 const controls=bindTouchControls([hb],{keys,enabled:()=>true,onHandbrake:value=>events.push(value)});
 hb.fire('pointerdown',1);hb.fire('pointerdown',2);hb.fire('pointerup',1);assert.ok(keys.has('ShiftLeft'));
 controls.clear();assert.equal(keys.size,0);assert.equal(events.at(-1),false);assert.equal(hb.classes.size,0);
});
test('paused or menu state rejects touches',()=>{
 const keys=new Set(),gas=button('ArrowUp');bindTouchControls([gas],{keys,enabled:()=>false});gas.fire('pointerdown',1);assert.equal(keys.size,0);
});

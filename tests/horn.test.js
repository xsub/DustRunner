import test from 'node:test';
import assert from 'node:assert/strict';
import {Horn} from '../src/horn.js';
function audio(){
 const sources=[],gains=[];
 const param=()=>({value:0,setTargetAtTime(v){this.value=v;},cancelScheduledValues(){}});
 const node=()=>({connect(){},disconnect(){this.disconnected=true;}});
 const context={state:'running',currentTime:10,destination:{},
  createGain(){const n={...node(),gain:param()};gains.push(n);return n;},
  createBiquadFilter:()=>({...node(),frequency:param(),Q:param()}),
  createOscillator(){const n={...node(),frequency:param(),start(){this.started=true;},stop(){this.stopped=(this.stopped??0)+1;}};sources.push(n);return n;}};
 return {context,sources,gains};
}
test('held horn uses one two-tone voice, stops on release and frees audio nodes',()=>{
 const {context,sources,gains}=audio(),horn=new Horn();
 for(let i=0;i<120;i++)horn.update(true,context,{volume:.5});
 assert.equal(sources.length,2);assert.deepEqual(sources.map(s=>s.frequency.value),[349,440]);assert.equal(horn.sounding,true);
 horn.update(false,context);assert.equal(horn.sounding,false);assert.ok(sources.every(s=>s.stopped===1));
 horn.stop();assert.ok(sources.every(s=>s.stopped===1));sources.forEach(s=>s.onended());assert.ok(gains[0].disconnected);
 horn.update(true,context);assert.equal(sources.length,4);
});
test('horn respects sound off, audio availability, pause gating and volume',()=>{
 const {context,sources,gains}=audio(),horn=new Horn();
 horn.update(true,null);horn.update(true,context,{enabled:false});assert.equal(sources.length,0);
 horn.update(true,context,{volume:1});const loud=gains[0].gain.value;
 horn.update(true,context,{volume:.2});assert.ok(gains[0].gain.value<loud);
 horn.update(true,context,{enabled:false});assert.equal(horn.sounding,false);
 context.state='suspended';horn.update(true,context);assert.equal(horn.sounding,false);
});

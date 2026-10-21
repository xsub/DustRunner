import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AttractMusic} from '../src/attract-music.js';
function fakeContext(){
 const nodes=[];const param=()=>({value:0,events:[],setValueAtTime(...v){this.events.push(['value',...v]);},linearRampToValueAtTime(...v){this.events.push(['ramp',...v]);},setTargetAtTime(...v){this.events.push(['target',...v]);},cancelScheduledValues(...v){this.events.push(['cancel',...v]);}});
 const c={currentTime:0,destination:{},nodes,createGain(){const n={gain:param(),connect(){},disconnect(){}};nodes.push(n);return n;},createOscillator(){const n={frequency:param(),connect(){},disconnect(){},start(t){this.started=t;},stop(t){this.stopped=t;}};nodes.push(n);return n;}};return c;
}
test('ambient score starts only when enabled, stays quiet and schedules by audio time',()=>{
 const music=new AttractMusic(),c=fakeContext();music.update({enabled:true});music.attach(c);music.update();assert.equal(music.voices.length,0);
 music.update({enabled:true,volume:1});assert.equal(music.voices.length,6);assert.equal(music.master.gain.events.at(-1)[1],.16);
 for(let i=0;i<600;i++)music.update({enabled:true});assert.equal(music.voices.length,6);
 c.currentTime=8;music.update({enabled:true});assert.equal(music.voices.length,12);assert.equal(music.bar,2);
});
test('mute/start/hidden state cancels scheduled notes and fades all voices; re-enable restarts cleanly',()=>{
 const music=new AttractMusic(),c=fakeContext();music.attach(c);music.update({enabled:true});const voices=[...music.voices];
 c.currentTime=1;music.update({enabled:false});assert.equal(music.playing,false);assert.equal(music.voices.length,0);
 for(const v of voices){assert.equal(v.osc.stopped,1.5);assert.ok(v.gain.gain.events.some(e=>e[0]==='cancel'));v.osc.onended();}
 music.update({enabled:true});assert.equal(music.voices.length,6);assert.equal(music.bar,1);
 music.attach(c);assert.equal(music.voices.length,6);
});

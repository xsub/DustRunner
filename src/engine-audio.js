import {audioMix} from './engine-sound.js';
import {RECORDING_LAYERS,steadyEngineLoop} from './engine-loops.js';
import workletUrl from './engine-worklet.js?worker&url';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class EngineAudio{
 constructor(){this.context=null;this.ready=null;this.layers=[];this.latest=null;}
 async init(){
  if(this.context){await this.context.resume();return this.ready;}
  const context=new AudioContext();this.context=context;
  // Resume while still inside the initiating button's user gesture.
  const resumed=context.resume();
  this.master=context.createGain();this.master.gain.value=0;
  const compressor=context.createDynamicsCompressor();compressor.threshold.value=-15;compressor.knee.value=12;compressor.ratio.value=5;compressor.attack.value=.006;compressor.release.value=.12;
  this.filter=context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=1600;this.filter.Q.value=.5;
  this.bass=context.createBiquadFilter();this.bass.type='lowshelf';this.bass.frequency.value=180;
  const highpass=context.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=32;
  this.filter.connect(this.bass);this.bass.connect(highpass);highpass.connect(compressor);compressor.connect(this.master);this.master.connect(context.destination);
  this.ready=(async()=>{
   await resumed;
   const buffers=await Promise.all(RECORDING_LAYERS.map(async layer=>{
    const {name}=layer;
    const response=await fetch(`${import.meta.env.BASE_URL}audio/${name}.wav`);if(!response.ok)throw Error('Engine recording unavailable');
    const decoded=await context.decodeAudioData(await response.arrayBuffer());
    const cycle=steadyEngineLoop(decoded.getChannelData(0),decoded.sampleRate,layer);
    const buffer=context.createBuffer(1,cycle.length,decoded.sampleRate);buffer.copyToChannel(cycle,0);return buffer;
   }));
   await context.audioWorklet.addModule(workletUrl);
   this.voice=new AudioWorkletNode(context,'bronco-combustion',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1]});
   this.voiceGain=context.createGain();this.voiceGain.gain.value=0;this.voice.connect(this.voiceGain);this.voiceGain.connect(this.filter);
   this.layers=buffers.map(buffer=>{
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(this.filter);source.start();return {source,gain};
   });
  })();
  try{await this.ready;}catch(error){await context.close();this.context=null;this.ready=null;this.layers=[];throw error;}
 }
 silence(){if(this.context)this.master.gain.setTargetAtTime(0,this.context.currentTime,.035);}
 update(engine,state,{enabled=false,volume=.5}={}){
  if(!this.context)return;
  const now=this.context.currentTime;
  this.master.gain.setTargetAtTime(enabled?clamp(volume,0,1)*.7:0,now,.045);
  if(!this.layers.length||!this.voice)return;
  const rpm=state?.rpm??engine.idle,load=clamp(state?.load??0,0,1),mix=audioMix(engine,rpm,load);
  this.layers.forEach((layer,i)=>{layer.source.playbackRate.setTargetAtTime(mix.rates[i],now,.045);layer.gain.gain.setTargetAtTime(mix.gains[i],now,.045);});
  this.filter.frequency.setTargetAtTime(mix.cutoff,now,.045);this.bass.gain.setTargetAtTime(mix.bass,now,.06);
  this.voiceGain.gain.setTargetAtTime(mix.combustion,now,.045);
  for(const [key,value] of Object.entries({rpm,load,cylinders:engine.cylinders,liters:engine.liters})){
   const param=this.voice.parameters.get(key);
   if(key==='cylinders')param.setValueAtTime(value,now);else param.setTargetAtTime(value,now,.025);
  }
 }
}

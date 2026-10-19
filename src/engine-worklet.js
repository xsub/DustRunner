import {CombustionVoice} from './combustion.js';
class EngineProcessor extends AudioWorkletProcessor{
 static get parameterDescriptors(){return [
  {name:'rpm',defaultValue:700,minValue:300,maxValue:6500,automationRate:'k-rate'},
  {name:'load',defaultValue:0,minValue:0,maxValue:1,automationRate:'k-rate'},
  {name:'cylinders',defaultValue:8,minValue:6,maxValue:8,automationRate:'k-rate'},
  {name:'liters',defaultValue:4.9,minValue:2,maxValue:7,automationRate:'k-rate'}
 ];}
 constructor(){super();this.voice=new CombustionVoice(sampleRate);}
 process(inputs,outputs,p){
  const channel=outputs[0]?.[0];if(channel)for(let i=0;i<channel.length;i++)channel[i]=this.voice.sample(p.rpm[0],p.load[0],Math.round(p.cylinders[0]),p.liters[0]);
  return true;
 }
}
registerProcessor('bronco-combustion',EngineProcessor);

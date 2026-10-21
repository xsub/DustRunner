// Original, quiet ambient score: slow voiced chords and a sparse bell motif.
// Shares the engine AudioContext; no downloads, timers or per-frame allocations.
const chords=[[48,55,59,64],[45,52,55,59],[41,48,52,57],[43,50,55,62]];
const melody=[76,71,74,67,72,69,67,74];
const frequency=midi=>440*2**((midi-69)/12);
export class AttractMusic{
 constructor(){this.context=null;this.master=null;this.voices=[];this.next=0;this.bar=0;this.playing=false;}
 attach(context){
  if(this.context===context)return;
  this.silence();this.master?.disconnect();this.context=context;
  this.master=context.createGain();this.master.gain.value=0;this.master.connect(context.destination);
 }
 note(midi,time,duration,level,type='sine'){
  const context=this.context,osc=context.createOscillator(),gain=context.createGain();
  osc.type=type;osc.frequency.value=frequency(midi);
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level,time+Math.min(1.8,duration*.25));
  gain.gain.setValueAtTime(level,time+duration*.55);gain.gain.linearRampToValueAtTime(0,time+duration);
  osc.connect(gain);gain.connect(this.master);osc.start(time);osc.stop(time+duration+.05);
  const voice={osc,gain};this.voices.push(voice);
  osc.onended=()=>{osc.disconnect();gain.disconnect();const index=this.voices.indexOf(voice);if(index>=0)this.voices.splice(index,1);};
 }
 update({enabled=false,volume=.5}={}){
  if(!this.context)return;
  if(!enabled){if(this.playing)this.silence();return;}
  const now=this.context.currentTime;
  if(!this.playing){this.playing=true;this.next=now+.05;this.bar=0;}
  this.master.gain.setTargetAtTime(Math.max(0,Math.min(1,volume))*.16,now,.7);
  if(this.next<now)this.next=now+.05;
  // Schedule one eight-second phrase ahead. The render loop never drives pitch.
  if(this.next<=now+.25){
   for(const midi of chords[this.bar%chords.length])this.note(midi,this.next,9,.14);
   this.note(melody[this.bar%melody.length],this.next+2,3.8,.1);
   this.note(melody[(this.bar+3)%melody.length],this.next+5,2.8,.065);
   this.bar++;this.next+=8;
  }
 }
 silence(){
  if(!this.context)return;
  const now=this.context.currentTime;this.master.gain.setTargetAtTime(0,now,.08);
  for(const {osc,gain} of this.voices){gain.gain.cancelScheduledValues(now);gain.gain.setTargetAtTime(0,now,.08);osc.stop(now+.5);}
  this.voices=[];this.playing=false;
 }
}

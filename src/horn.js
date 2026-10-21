// A classic two-tone electric horn. One voice pair per press, with soft edges.
export class Horn {
 constructor(){this.voice=null;}
 get sounding(){return Boolean(this.voice);}
 stop(){
  const voice=this.voice;if(!voice)return;this.voice=null;
  const now=voice.context.currentTime;
  voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,.015);
  voice.sources.forEach(source=>source.stop(now+.08));
 }
 update(pressed,context,{enabled=true,volume=.5}={}){
  if(!pressed||!enabled||!context||context.state!=='running'){this.stop();return;}
  if(this.voice?.context!==context)this.stop();
  if(!this.voice){
   const gain=context.createGain(),filter=context.createBiquadFilter(),sources=[];
   gain.gain.value=0;filter.type='lowpass';filter.frequency.value=1500;filter.Q.value=.7;filter.connect(gain);gain.connect(context.destination);
   const voice={context,gain,sources};this.voice=voice;let remaining=2;
   for(const frequency of [349,440]){
    const source=context.createOscillator();source.type='sawtooth';source.frequency.value=frequency;source.connect(filter);sources.push(source);
    source.onended=()=>{source.disconnect();if(--remaining===0){filter.disconnect();gain.disconnect();}};source.start();
   }
  }
  this.voice.gain.gain.setTargetAtTime(Math.max(0,Math.min(1,volume))*.075,context.currentTime,.018);
 }
}

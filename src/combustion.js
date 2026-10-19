// Small deterministic combustion layer. The recorded loops supply most V8 timbre;
// this supplies cylinder-count timing, bank irregularity and load-dependent texture.
export class CombustionVoice{
 constructor(sampleRate){this.sampleRate=sampleRate;this.phase=0;this.envelope=0;this.age=0;this.rpm=700;this.seed=1977;this.low=0;this.firings=0;}
 sample(rpm,load,cylinders,liters){
  // Cylinder count is discrete, including during a live engine selection.
  cylinders=cylinders<7?6:8;
  this.rpm+=(rpm-this.rpm)*Math.min(1,1/(this.sampleRate*.012));
  const previous=Math.floor(this.phase*cylinders);
  this.phase+=this.rpm/(120*this.sampleRate);
  const next=Math.floor(this.phase*cylinders);
  if(next!==previous){
   const weights=cylinders===8?[1,.72,.9,.65,.82,1,.65,.92]:[.97,1,.96,1,.98,1];
   this.envelope+=weights[next%cylinders]*(.35+.65*load);this.age=0;this.firings++;
  }
  if(this.phase>=1)this.phase-=1;
  this.age+=1/this.sampleRate;this.envelope*=Math.exp(-1/(this.sampleRate*.012));
  this.seed^=this.seed<<13;this.seed^=this.seed>>>17;this.seed^=this.seed<<5;
  const noise=(this.seed>>>0)/2147483648-1;
  const resonance=135/Math.sqrt(liters/4.9);
  const raw=this.envelope*(Math.sin(this.age*resonance*Math.PI*2)*.65+Math.sin(this.age*resonance*2.1*Math.PI*2)*.2+noise*.13);
  this.low+=(raw-this.low)*.12;
  return Math.tanh(this.low*.8)*.32;
 }
}

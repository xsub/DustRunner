import {t as msg} from './i18n.js';
// Sustain one four-stroke engine cycle from each recording. Replaying an
// entire recorded rev would reintroduce that rev even at constant game RPM.
export const RECORDING_LAYERS=Object.freeze([
 {name:'ford-idle',rpm:650,offset:.7},
 {name:'v8-pull',rpm:1100,offset:.67},
 {name:'v8-overrun',rpm:1150,offset:.8},
]);

export function steadyEngineLoop(samples,sampleRate,{rpm,offset}){
 const size=Math.round(sampleRate*120/rpm),overlap=Math.round(sampleRate*.006);
 const center=Math.round(offset*sampleRate),radius=Math.round(sampleRate*.09);
 const minimum=Math.max(0,center-radius),maximum=Math.min(samples.length-size-overlap-1,center+radius);
 if(maximum<minimum)throw new RangeError(msg("engine_loops.recording_is_too_short_for_a"));
 let start=minimum,best=-Infinity;
 // Match waveform phase across the join before applying the short crossfade.
 for(let candidate=minimum;candidate<=maximum;candidate+=17){
  let dot=0,a2=1e-9,b2=1e-9;
  for(let k=0;k<overlap;k+=3){const a=samples[candidate+k],b=samples[candidate+size+k];dot+=a*b;a2+=a*a;b2+=b*b;}
  const edge=Math.abs(samples[candidate+overlap]-samples[candidate+overlap-1]);
  const correlation=dot/Math.sqrt(a2*b2)-edge*4;
  if(correlation>best){best=correlation;start=candidate;}
 }
 const result=new Float32Array(size);
 for(let i=0;i<size;i++){
  let value=samples[start+overlap+i];
  if(i>=size-overlap){const k=i-size+overlap,t=k/(overlap-1),blend=t*t*(3-2*t);value=value*(1-blend)+samples[start+k]*blend;}
  result[i]=value;
 }
 let mean=0;for(const value of result)mean+=value/size;
 let energy=0,peak=0;for(let i=0;i<size;i++){result[i]-=mean;energy+=result[i]**2;peak=Math.max(peak,Math.abs(result[i]));}
 const gain=Math.min(.23/Math.max(.001,Math.sqrt(energy/size)),.88/Math.max(.001,peak));
 for(let i=0;i<size;i++)result[i]*=gain;
 return result;
}

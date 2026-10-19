import {RECORDING_LAYERS} from './engine-loops.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function audioMix(engine,rpm,load){
 const six=engine.cylinders===6,rateScale=six?.75:1;
 const rev=clamp((rpm-engine.idle)/(engine.redline-engine.idle),0,1);
 const idle=Math.cos(clamp((rpm-1000)/1100,0,1)*Math.PI/2),running=Math.sqrt(1-idle*idle);
 return {
  // The cycle length fixes the reference pitch. Do not cap high-RPM V8s at
  // the old 2.5x rate or the recording sounds like a slow engine at redline.
  rates:RECORDING_LAYERS.map(layer=>clamp(rpm/layer.rpm*rateScale,.45,10)),
  gains:[idle*(.48-load*.14),running*(.20+load*.68)*(six?.3:1),running*(.10+(1-load)*.38)*(six?.3:1)],
  cutoff:(six?850:1100)+load*3000+rev*1300,
  bass:six?1:3.5+(engine.liters-4.9)*1.1+load*1.5,
  combustion:six?.62:.24
 };
}

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function audioMix(engine,rpm,load){
 const six=engine.cylinders===6,rateScale=six?.75:1;
 const body=Math.pow(4.9/engine.liters,.12);
 const rev=clamp((rpm-engine.idle)/(engine.redline-engine.idle),0,1);
 const idle=Math.cos(clamp((rpm-1100)/1200,0,1)*Math.PI/2);
 return {
  rates:[clamp(rpm/850*rateScale*body,.55,2.6),clamp(rpm/2400*rateScale*body,.4,2.5),clamp(rpm/1800*rateScale*body,.45,2.6)],
  gains:[idle*(.52-load*.18),(Math.sqrt(1-idle*idle)*.48+load*.5)*(six?.32:1),(.12+rev*.35)*(1-load)*(six?.3:1)],
  cutoff:(six?700:900)+load*2400+rev*900,
  bass:six?1:4+(engine.liters-4.9)*1.1,
  combustion:six?.62:.27
 };
}

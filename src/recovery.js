// Recovery is an occasional terrain query, never part of the simulation loop.
// Check the whole Bronco footprint, not just its center or four wheel points.
export function recoveryFootprint(heightAt,x,z,heading,{widthScale=1,lengthScale=1}={}){
 const cos=Math.cos(heading),sin=Math.sin(heading),values=[];
 let min=Infinity,max=-Infinity,maxSlope=0;
 for(let f=-3;f<=3;f++)for(let side=-2;side<=2;side++){
  const h=heightAt(x+side*widthScale*cos+f*lengthScale*sin,z-side*widthScale*sin+f*lengthScale*cos);
  if(!Number.isFinite(h))return {safe:false,score:Infinity,height:0};
  const i=values.length;values.push(h);min=Math.min(min,h);max=Math.max(max,h);
  if(side>-2)maxSlope=Math.max(maxSlope,Math.abs(h-values[i-1])/widthScale);
  if(f>-3)maxSlope=Math.max(maxSlope,Math.abs(h-values[i-5])/lengthScale);
 }
 const range=max-min;
 return {safe:range<=.2&&maxSlope<=.06,score:range+maxSlope*4,height:max};
}
export function findRecoverySpot({x,z,heading,heightAt,bounds,candidates,fallback,blocked,footprint}){
 let best=null;
 const evaluate=p=>{
  if(blocked?.(p.x,p.z))return null;
  if(bounds&&(p.x<bounds.min.x+5||p.x>bounds.max.x-5||p.z<bounds.min.z+5||p.z>bounds.max.z-5))return null;
  const ground=recoveryFootprint(heightAt,p.x,p.z,p.heading??heading,footprint);
  const candidate={...p,heading:p.heading??heading,...ground};
  if(!best||candidate.score<best.score)best=candidate;
  return candidate.safe?candidate:null;
 };
 if(candidates){for(const p of candidates){const spot=evaluate(p);if(spot)return spot;}}
 else{
  const here=evaluate({x,z,heading});if(here)return here;
  // Search nearby rings first; all directions use the same distance priority.
  for(let radius=6;radius<=120;radius+=6){
   let flat=null;
   for(let i=0;i<16;i++){
    const a=i*Math.PI/8,p={x:x+Math.cos(a)*radius,z:z+Math.sin(a)*radius,heading};
    const spot=evaluate(p);if(spot&&(!flat||spot.score<flat.score))flat=spot;
   }
   if(flat)return flat;
  }
 }
 if(fallback){const spot=evaluate(fallback);if(spot)return spot;}
 return best??{x,z,heading,height:heightAt(x,z),safe:false};
}

// Seeded, close-packed dunes. Dimensions are game metres: stock tire diameter
// is ~1.7 m and a stock Bronco is ~5.1 m long. No extra collision bodies are needed.
export const JUMPY_SPACING=30;
export function createJumpyDunes(seed=1947){
 let state=seed>>>0;const random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
 const dunes=new Map();
 for(let ix=-41;ix<=41;ix++)for(let iz=-22;iz<=22;iz++){
  const lane=ix===0,small=random()<.23;
  // Keep a calibrated central rhythm in every seed; the surrounding dunes vary.
  const height=lane?3:small?.84+random()*1.2:3.6+random()*4.4;
  dunes.set(ix+','+iz,{lane,x:ix*30+(lane?0:(random()-.5)*5),z:150+iz*30+(lane?0:(random()-.5)*4),height,rx:lane?20:18+random()*3,rz:lane?20:16+random()*2});
 }
 const heightAt=(x,z)=>{
  const ix=Math.round(x/30),iz=Math.round((z-150)/30);let h=0;
  for(let a=ix-1;a<=ix+1;a++)for(let b=iz-1;b<=iz+1;b++){
   const dune=dunes.get(a+','+b);if(!dune)continue;
   if(dune.lane){
    const s=dune.z-z,side=Math.abs(x-dune.x)/20;
    if(side<1&&s> -24&&s<10){const up=s<=0?(1+s/24)**2:(1-s/10)**2;h=Math.max(h,dune.height*up*(.5+.5*Math.cos(Math.PI*side)));}
    continue;
   }
   const r=Math.hypot((x-dune.x)/dune.rx,(z-dune.z)/dune.rz);
   if(r<1)h=Math.max(h,dune.height*(Math.sqrt(1.0036)-Math.sqrt(r*r+.0036))/(Math.sqrt(1.0036)-.06));
  }
  // A calm starting basin blends into the first jump rather than an entry wall.
  const t=Math.max(0,Math.min(1,(Math.hypot(x,z-210)-12)/22));
  return 1+h*t*t*(3-2*t);
 };
 return {heightAt,dunes:[...dunes.values()]};
}

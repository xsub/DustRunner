import {jumpCoordinates,jumpSurface,shapeDesertJump} from './desert-jumps.js';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const cache=new Map();
export function desertRockFeatures(seed=1947){
 seed>>>=0;if(cache.has(seed))return cache.get(seed);
 let state=seed;const random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
 const ramps=[[95,145,0,2.4,30,9],[-240,310,-Math.PI/2,3.5,38,13],[520,-60,Math.PI/2,5,48,18]].map(([x,z,heading,height,runup,gap],id)=>({id:'rock-'+id,x,z,heading,height,runup,gap,paired:true,label:'SKALNA PARA '+(id+1),halfWidth:10,edgeWidth:8,approach:75,landing:48,landingHeight:height*.7,rock:true}));
 const formations=[{x:230,z:-70,rx:65,rz:95,height:11},{x:-500,z:-280,rx:85,rz:110,height:15},{x:930,z:320,rx:90,rz:100,height:18}];
 const stones=[];
 for(let cluster=0;cluster<48;cluster++){
  const cx=cluster===0?55:-1100+random()*2200,cz=cluster===0?205:-500+random()*1000;
  for(let i=0;i<28;i++){
   const x=cx+(random()-.5)*65,z=cz+(random()-.5)*45;
   if(Math.hypot(x,z-210)<20)continue;
   // Tops 0.16–0.38 m: axle articulation rather than a chassis-height wall.
   stones.push({x,z,sx:.5+random()*.55,sy:.16+random()*.13,sz:.55+random()*.65,offset:.02+random()*.04});
  }
 }
 const features={ramps,formations,stones};if(cache.size>=12)cache.delete(cache.keys().next().value);cache.set(seed,features);return features;
}
export function formationMask(f,x,z){return 1-smooth((Math.hypot((x-f.x)/f.rx,(z-f.z)/f.rz)-.30)/.70);}
export function shapeRockFeatures(features,x,z,natural){
 let value=natural;
 for(const f of features.formations){const mask=formationMask(f,x,z);if(mask>0)value=value*(1-mask)+(1+f.height)*mask;}
 for(const ramp of features.ramps)value=shapeDesertJump(ramp,x,z,value);
 return value;
}
export function rockCoverage(features,x,z){
 let amount=0;
 for(const f of features.formations)amount=Math.max(amount,formationMask(f,x,z));
 for(const r of features.ramps){const {s,side}=jumpCoordinates(r,x,z);if(Math.abs(side)<r.halfWidth+r.edgeWidth&&jumpSurface(r,s)>.04)amount=Math.max(amount,1-smooth((Math.abs(side)-r.halfWidth)/r.edgeWidth));}
 return amount;
}

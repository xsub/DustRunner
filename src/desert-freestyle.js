const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const cache=new Map();
export function desertFreestyle(seed=1947){
 seed>>>=0;if(cache.has(seed))return cache.get(seed);
 let state=seed;const random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
 const pyramids=[{x:-85,z:130,height:3.2,top:2,bank:14}];
 const rollers=[];
 for(let x=-1120;x<=1120;x+=42)for(let z=-500;z<=500;z+=42){
  const px=x+(random()-.5)*16,pz=z+(random()-.5)*16;
  if(Math.abs(px)<48||Math.hypot(px,pz-210)<65||Math.hypot(px+700,pz-300)<110||(px> -235&&px< -95&&pz>60&&pz<355))continue;
  const angle=random()*Math.PI;rollers.push({x:px,z:pz,cos:Math.cos(angle),sin:Math.sin(angle),length:6+random()*9,width:3.5+random()*2,height:random()<.22?-.15-random()*.15:.25+random()*.6});
 }
 const heights=[.3,.5,.75,-.2,.4,.65,-.25,.45];
 heights.forEach((height,i)=>rollers.push({x:-165,z:270-i*16,cos:1,sin:0,length:12,width:2,height,practice:true}));
 const cells=new Map(),size=64;
 for(const r of rollers)for(let ix=Math.floor((r.x-30)/size);ix<=Math.floor((r.x+30)/size);ix++)for(let iz=Math.floor((r.z-30)/size);iz<=Math.floor((r.z+30)/size);iz++){const key=ix+','+iz;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(r);}
 const rollerHeight=(x,z)=>{
  if(Math.abs(x)<25||Math.hypot(x,z-210)<30)return 0;
  let h=0;for(const r of cells.get(Math.floor(x/size)+','+Math.floor(z/size))??[]){
   const dx=x-r.x,dz=z-r.z,a=Math.abs(dx*r.cos+dz*r.sin),b=Math.abs(-dx*r.sin+dz*r.cos);
   if(a<r.length&&b<r.width)h+=r.height*(.5+.5*Math.cos(Math.PI*b/r.width))*(1-smooth((a/r.length-.65)/.35));
  }
  return h;
 };
 const result={pyramids,rollers,rollerHeight};if(cache.size>=12)cache.delete(cache.keys().next().value);cache.set(seed,result);return result;
}
export function pyramidHeight(p,x,z){
 const r=Math.max(Math.abs(x-p.x),Math.abs(z-p.z)),q=1-Math.max(0,Math.min(1,(r-p.top)/p.bank));
 return p.height*(.25*q*q+.75*q*q*q);
}
export function freestyleCoverage(features,x,z){
 let rock=0;for(const p of features.pyramids){const r=Math.max(Math.abs(x-p.x),Math.abs(z-p.z));rock=Math.max(rock,1-smooth((r-p.top-p.bank+3)/3));}return rock;
}
export function shapeFreestyle(features,x,z,natural){
 const district=Math.max(Math.abs(x+165)/35,Math.abs(z-210)/105),pad=1-smooth((district-.85)/.15);
 let h=Math.max(1,natural*(1-pad)+1.35*pad+features.rollerHeight(x,z));
 return h;
}
export function shapePyramids(features,x,z,natural){
 let h=natural;
 for(const p of features.pyramids){const r=Math.max(Math.abs(x-p.x),Math.abs(z-p.z)),blend=1-smooth((r-p.top-p.bank-30)/20);if(blend>0)h=h*(1-blend)+(1+pyramidHeight(p,x,z))*blend;}
 return h;
}

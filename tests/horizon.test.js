import test from 'node:test';
import assert from 'node:assert/strict';
import {farGridAxis,farLandHeight,buildFarLand,placeButtes,BUTTE_FOOT,BUTTE_COUNT,FAR_FLOOR,FAR_CELL,SEAM_DROP,SEAM_INSET} from '../src/horizon.js';
import {buildDesert} from '../src/desert.js';

const wavy=(x,z)=>6+4*Math.sin(x/9)+3*Math.cos(z/7)+.02*x;
const odd={min:{x:-283.7,z:-201.3},max:{x:311.9,z:187.4}};
// Largest amount by which the far land rises above the real terrain just inside the edge.
function seamExcess(bounds,far,heightAt){
 let excess=-Infinity;
 for(const inset of [.25,.75,1.5,2.5]){
  for(let x=bounds.min.x+inset;x<=bounds.max.x-inset;x+=.5)for(const z of [bounds.min.z+inset,bounds.max.z-inset])excess=Math.max(excess,far.heightAt(x,z)-heightAt(x,z));
  for(let z=bounds.min.z+inset;z<=bounds.max.z-inset;z+=.5)for(const x of [bounds.min.x+inset,bounds.max.x-inset])excess=Math.max(excess,far.heightAt(x,z)-heightAt(x,z));
 }
 return excess;
}
// Largest gap between a butte's base and the far land anywhere under its footprint.
function hover(site,far){
 let gap=-Infinity;const cos=Math.cos(site.yaw),sin=Math.sin(site.yaw);
 for(const ring of [0,.25,.5,.75,1])for(let k=0;k<120;k++){const a=k/120*Math.PI*2,lx=Math.cos(a)*BUTTE_FOOT*ring*site.width,lz=Math.sin(a)*BUTTE_FOOT*ring*site.depth;gap=Math.max(gap,site.y-far.heightAt(site.x+lx*cos+lz*sin,site.z-lx*sin+lz*cos));}
 return gap;
}

test('far grid: exact ends, a tight inner skirt, strictly increasing, kilometers of reach',()=>{
 for(const [min,max] of [[-1200,1200],[odd.min.x,odd.max.x],[0,10]]){
  const axis=farGridAxis(min,max,9000,FAR_CELL);
  assert.ok(axis.includes(min)&&axis.includes(max),'the edge rows are found by value');assert.ok(axis.includes(min+3)&&axis.includes(max-3));
  for(let i=1;i<axis.length;i++)assert.ok(axis[i]>axis[i-1],'strictly increasing');
  assert.ok(axis[0]<min-9000&&axis.at(-1)>max+9000);
 }
 assert.ok(farGridAxis(-1200,1200,9000,FAR_CELL).length<220,'stays a light mesh');
});

test('far land height meets the edge and rises into distant ranges',()=>{
 assert.equal(farLandHeight(1200,0,0,17.5),17.5);
 const near=farLandHeight(1280,0,80,40);assert.ok(near<40&&near>farLandHeight(1280,0,80,0),'80 m out is still a blend of the edge height');
 let highest=0;for(let x=-9000;x<=9000;x+=450)for(let z=-9000;z<=9000;z+=450){const outside=Math.hypot(Math.max(0,Math.abs(x)-1200),Math.max(0,Math.abs(z)-600));if(outside>3000)highest=Math.max(highest,farLandHeight(x,z,outside));}
 assert.ok(highest>150,'mountains on the horizon');
 for(let x=1210;x<1500;x+=30)assert.ok(farLandHeight(x,0,x-1200,10)<40,'gentle dunes just beyond the rim');
});

test('the far land never rises through the real terrain at the seam',()=>{
 const far=buildFarLand(odd,wavy);
 assert.ok(seamExcess(odd,far,wavy)<=1e-9);
 assert.equal(far.heightAt(0,0),FAR_FLOOR,'hidden floor under the playground');
 // Along the edge it hangs from the lowest real terrain nearby, never far below that.
 for(let x=odd.min.x+1;x<odd.max.x-1;x+=1){
  let low=Infinity;for(let t=Math.max(odd.min.x+SEAM_INSET,x-2*FAR_CELL);t<=Math.min(odd.max.x-SEAM_INSET,x+2*FAR_CELL);t+=.5)low=Math.min(low,wavy(t,odd.min.z+SEAM_INSET));
  assert.ok(far.heightAt(x,odd.min.z)>=low-SEAM_DROP-.05,'the seam at x='+x+' is not needlessly low');
 }
});

test('the far-land sampler is the exact rendered surface and is safe beyond the grid',()=>{
 const far=buildFarLand(odd,wavy),position=far.geometry.attributes.position,index=far.geometry.index;
 for(let i=0;i<position.count;i+=97)assert.ok(Math.abs(far.heightAt(position.getX(i),position.getZ(i))-position.getY(i))<1e-4,'matches its own vertices');
 // Inside every 500th triangle the sampler equals the plane through its three corners.
 for(let t=0;t<index.count;t+=1500){
  const [a,b,c]=[0,1,2].map(k=>index.getX(t+k)),x=(position.getX(a)+position.getX(b)+position.getX(c))/3,z=(position.getZ(a)+position.getZ(b)+position.getZ(c))/3,y=(position.getY(a)+position.getY(b)+position.getY(c))/3;
  assert.ok(Math.abs(far.heightAt(x,z)-y)<1e-3*Math.max(1,Math.abs(y)),'centroid of triangle '+t/3);
 }
 for(const [x,z] of [[1e6,1e6],[-1e6,0],[0,-1e6],[far.xs.at(-1),far.zs.at(-1)],[far.xs[0],far.zs[0]]])assert.ok(Number.isFinite(far.heightAt(x,z)),'clamped at '+x+','+z);
 assert.equal(far.lowestVertexWithin(0,0,1),Infinity,'no vertex that close');assert.equal(far.lowestVertexWithin(0,0,400),FAR_FLOOR);
});

test('buttes stand on the ground under their whole footprint, outside the playground',()=>{
 for(const [bounds,heightAt,seed] of [[odd,wavy,7],[odd,wavy,8]]){
  const far=buildFarLand(bounds,heightAt),sites=placeButtes(bounds,far,seed);
  assert.equal(sites.length,BUTTE_COUNT);assert.deepEqual(placeButtes(bounds,far,seed),sites,'deterministic for a seed');
  for(const site of sites){
   for(const key of ['x','y','z','yaw','width','height','depth'])assert.ok(Number.isFinite(site[key]),key);
   assert.ok(hover(site,far)<=0,'no part of the base hangs in the air: '+hover(site,far).toFixed(2));
   assert.ok(site.buried<.3,'not swallowed by a slope: '+site.buried.toFixed(2));
   const outside=Math.hypot(Math.max(bounds.min.x-site.x,0,site.x-bounds.max.x),Math.max(bounds.min.z-site.z,0,site.z-bounds.max.z));
   assert.ok(outside-BUTTE_FOOT*Math.max(site.width,site.depth)>=50,'talus stays clear of the playable edge');
   assert.ok(site.height>=110&&site.width>40&&site.depth>40);
  }
 }
 const far=buildFarLand(odd,wavy);assert.notDeepEqual(placeButtes(odd,far,7),placeButtes(odd,far,8),'each world gets its own skyline');
});

test('real desert: seam and buttes hold for the default and the steepest dunes',()=>{
 for(const variant of ['ridges','hard']){
  const ground=buildDesert({variant}),far=buildFarLand(ground.bounds,ground.heightAt),sites=placeButtes(ground.bounds,far,1947);
  assert.ok(seamExcess(ground.bounds,far,ground.heightAt)<=1e-6,variant+' seam');
  for(const site of sites){assert.ok(hover(site,far)<=0,variant+' butte hovers');assert.ok(site.buried<.3,variant+' butte buried');}
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {farGridAxis,farLandHeight,buildFarLand,placeButtes,butteFit,BUTTE_FOOT,BUTTE_COUNT,BUTTE_MARGIN,FAR_FLOOR,FAR_CELL,SEAM_DROP,SEAM_INSET} from '../src/horizon.js';
import {buildDesert} from '../src/desert.js';
import {Box3} from 'three';
import {createCircuit,refreshTracks} from '../src/tracks.js';
import {buildTerrain} from '../src/terrain.js';
import {buildRaceDesert} from '../src/desert-scenery.js';
import {DEFAULT_TUNING} from '../src/tuning.js';

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
// Distance from the playable rectangle to the outer edge of a butte's talus.
const clearance=(bounds,site)=>Math.hypot(Math.max(bounds.min.x-site.x,0,site.x-bounds.max.x),Math.max(bounds.min.z-site.z,0,site.z-bounds.max.z))-BUTTE_FOOT*Math.max(site.width,site.depth);
// Largest gap between a butte's base and the far land anywhere under its footprint.
// Brute force, independent of placeButtes: 4000 points on the outline plus inner rings.
function hover(site,far){
 let gap=-Infinity;const cos=Math.cos(site.yaw),sin=Math.sin(site.yaw);
 for(const [ring,steps] of [[0,1],[.25,90],[.5,180],[.75,360],[1,4000]])for(let k=0;k<steps;k++){const a=k/steps*Math.PI*2,lx=Math.cos(a)*BUTTE_FOOT*ring*site.width,lz=Math.sin(a)*BUTTE_FOOT*ring*site.depth;gap=Math.max(gap,site.y-far.heightAt(site.x+lx*cos+lz*sin,site.z-lx*sin+lz*cos));}
 return gap;
}
// A circuit world exactly as the game builds it: road, dunes, and the dune rectangle as the edge.
function circuitWorld(index,variant){
 refreshTracks();
 const curve=createCircuit(index,variant),N=3600,samples=Array.from({length:N},(_,i)=>curve.getPointAt(i/N)),terrain=buildTerrain(samples,curve,index);
 const dunes=buildRaceDesert(samples,new Box3().setFromPoints(samples),DEFAULT_TUNING.roadWidth*2+DEFAULT_TUNING.shoulderWidth),p=dunes.positions,last=p.length-3;
 return {bounds:{min:{x:p[0],z:p[2]},max:{x:p[last],z:p[last+2]}},heightAt:(x,z)=>Math.max(terrain.heightAt(x,z),dunes.heightAt(x,z)),seed:index+7};
}

test('far grid: exact ends, a tight inner skirt, strictly increasing, kilometers of reach',()=>{
 for(const [min,max] of [[-1200,1200],[odd.min.x,odd.max.x],[0,10]]){
  const axis=farGridAxis(min,max,9000,FAR_CELL);
  assert.ok(axis.includes(min)&&axis.includes(max),'the edge rows are found by value');assert.ok(axis.includes(min+3)&&axis.includes(max-3));
  for(let i=1;i<axis.length;i++)assert.ok(axis[i]>axis[i-1],'strictly increasing');
  assert.ok(axis[0]<min-9000&&axis.at(-1)>max+9000);
 }
 assert.ok(farGridAxis(-1200,1200,9000,FAR_CELL).length<220,'stays a light mesh');assert.ok(FAR_CELL<=30,'fine enough to follow the real edge');
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
 assert.equal(far.lowestUnder(0,0,5,5),FAR_FLOOR,'a small ellipse inside one triangle of the hidden floor');
});

test('the lowest ground under an ellipse is exact, also between grid vertices',()=>{
 const far=buildFarLand(odd,wavy);
 // Out in the coarse grid, cells are far larger than the footprint: compare with brute force.
 for(const [x,z,rx,rz,yaw] of [[2600,900,300,180,.7],[-3100,-2200,420,260,2.1],[900,2500,150,340,-1],[odd.max.x+70,0,60,40,.3],[5200,4100,500,500,0]]){
  let brute=Infinity;const cos=Math.cos(yaw),sin=Math.sin(yaw);
  for(const [ring,steps] of [[0,1],[.3,200],[.6,400],[.85,800],[1,20000]])for(let k=0;k<steps;k++){const a=k/steps*Math.PI*2,lx=Math.cos(a)*rx*ring,lz=Math.sin(a)*rz*ring;brute=Math.min(brute,far.heightAt(x+lx*cos+lz*sin,z-lx*sin+lz*cos));}
  const exact=far.lowestUnder(x,z,rx,rz,yaw);
  assert.ok(exact<=brute+1e-6,`never above any sampled point (${exact.toFixed(3)} vs ${brute.toFixed(3)})`);assert.ok(brute-exact<.3,`and not needlessly low (${(brute-exact).toFixed(3)} m)`);
 }
});

test('buttes stand on the ground under their whole footprint, outside the playground',()=>{
 for(const [bounds,heightAt,seed] of [[odd,wavy,7],[odd,wavy,8]]){
  const far=buildFarLand(bounds,heightAt),sites=placeButtes(bounds,far,seed);
  assert.equal(sites.length,BUTTE_COUNT);assert.deepEqual(placeButtes(bounds,far,seed),sites,'deterministic for a seed');
  for(const site of sites){
   for(const key of ['x','y','z','yaw','width','height','depth'])assert.ok(Number.isFinite(site[key]),key);
   assert.ok(hover(site,far)<=0,'no part of the base hangs in the air: '+hover(site,far).toFixed(2));
   assert.ok(site.buried<.3,'not swallowed by a slope: '+site.buried.toFixed(2));
   assert.ok(clearance(bounds,site)>=BUTTE_MARGIN-1e-6,'talus stays clear of the playable edge');
   assert.ok(site.height>=110&&site.width>40&&site.depth>40);
  }
 }
 const far=buildFarLand(odd,wavy);assert.notDeepEqual(placeButtes(odd,far,7),placeButtes(odd,far,8),'each world gets its own skyline');
 for(let seed=1;seed<=40;seed++)for(const site of placeButtes(odd,far,seed)){assert.ok(hover(site,far)<=0,'seed '+seed);assert.ok(clearance(odd,site)>=BUTTE_MARGIN-1e-6,'seed '+seed);}
 // A butte too wide for its distance is shrunk to keep exactly the margin; others are untouched.
 assert.equal(BUTTE_MARGIN,60);assert.equal(butteFit(100,100,600),1);assert.equal(butteFit(300,500,600),butteFit(500,300,600));
 const fit=butteFit(500,300,600);assert.ok(fit<1&&Math.abs(600-BUTTE_FOOT*500*fit-BUTTE_MARGIN)<1e-9);assert.equal(butteFit(100,100,30),0,'nothing fits inside the margin');
});

test('at a corner the far land hangs from the lower of the two edges, whichever it is',()=>{
 const bounds={min:{x:-300,z:-200},max:{x:300,z:200}};
 // A low strip along one edge only, stopping short of the corner cell of the other edge.
 const lowAlongX=(x,z)=>x<bounds.min.x+1&&z>bounds.min.z+1?2:20,lowAlongZ=(x,z)=>z<bounds.min.z+1&&x>bounds.min.x+1?2:20;
 for(const [name,terrain] of [['−X',lowAlongX],['−Z',lowAlongZ]]){
  const far=buildFarLand(bounds,terrain);
  assert.ok(far.heightAt(bounds.min.x,bounds.min.z)<=2-SEAM_DROP+1e-6,`corner follows the low ${name} edge`);
 }
 const far=buildFarLand(bounds,lowAlongX);
 assert.ok(Math.abs(far.heightAt(0,bounds.min.z)-(20-SEAM_DROP))<1e-4,'away from the corner the seam is back at the high edge');
});

test('circuits: seam and buttes hold on worlds built the way the game builds them',()=>{
 // Track 1 mirrored (variant 2) is the world where a sampled footing once left a butte 30 m in the air.
 for(const [index,variant] of [[1,2],[1,1],[0,0],[13,3]]){
  const world=circuitWorld(index,variant),far=buildFarLand(world.bounds,world.heightAt),sites=placeButtes(world.bounds,far,world.seed);
  assert.ok(seamExcess(world.bounds,far,world.heightAt)<=1e-6,`track ${index}/${variant} seam`);
  for(const [i,site] of sites.entries()){assert.ok(hover(site,far)<=1e-6,`track ${index}/${variant} butte ${i} hovers ${hover(site,far).toFixed(2)} m`);assert.ok(site.buried<.3,`track ${index}/${variant} butte ${i} buried`);assert.ok(clearance(world.bounds,site)>=BUTTE_MARGIN-1e-6);}
 }
});

test('real desert: seam and buttes hold for the default and the steepest dunes',()=>{
 for(const variant of ['ridges','hard']){
  const ground=buildDesert({variant}),far=buildFarLand(ground.bounds,ground.heightAt),sites=placeButtes(ground.bounds,far,1947);
  assert.ok(seamExcess(ground.bounds,far,ground.heightAt)<=1e-6,variant+' seam');
  for(const site of sites){assert.ok(hover(site,far)<=0,variant+' butte hovers');assert.ok(site.buried<.3,variant+' butte buried');}
 }
});

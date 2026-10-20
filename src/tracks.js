import {tuning as cfg} from './tuning.js';
import {extraTrackDefinitions} from './track-pack.js';
import * as THREE from 'three';
import {angleDelta,clamp} from './race.js';
import {indexedNearest} from './track-index.js';

export const TRACK_SCALE = 1.35;
export const LENGTH_MULTIPLIER = 4;
export let ROAD_WIDTH = cfg.roadWidth;
export let SHOULDER_WIDTH = cfg.shoulderWidth;
// Map axes: OX runs left/right (world X), OY runs up/down (world Z).
export const TRACK_VARIANTS=[
 {name:'ORIGINAL',x:1,z:1},
 {name:'MIRROR OY',x:-1,z:1},
 {name:'MIRROR OX',x:1,z:-1},
 {name:'MIRROR OX + OY',x:-1,z:-1},
];
const BASE_TRACKS = [
  {
    name: 'DUSTBOWL',
    points: [[-38,-27],[-15,-30],[12,-30],[36,-26],[45,-12],[38,2],[27,9],[32,25],[12,31],[-6,23],[-21,29],[-41,24],[-48,9],[-40,-6]],
    features: [
      {kind:'jump',start:.045,length:.065,height:1.43},
      {kind:'whoops',start:.19,length:.09,height:0.42,count:3},
      {kind:'jump',start:.32,length:.065,height:1.76},
      {kind:'jump',start:.48,length:.06,height:1.49},
      {kind:'whoops',start:.61,length:.095,height:0.49,count:4},
      {kind:'jump',start:.77,length:.065,height:1.62},
    ],
  },
  {
    name: 'RATTLESNAKE',
    points: [[-36,-28],[-8,-28],[20,-28],[44,-28],[44,-4],[16,-4],[-4,-4],[-4,16],[20,16],[44,16],[44,40],[12,40],[-16,40],[-24,20],[-24,0],[-44,0],[-52,20],[-68,12],[-68,-12],[-52,-28]],
    features: [
      {kind:'jump',start:.04,length:.055,height:1.62},
      {kind:'whoops',start:.15,length:.08,height:0.52,count:3},
      {kind:'jump',start:.28,length:.055,height:1.82},
      {kind:'whoops',start:.4,length:.075,height:0.72,count:2},
      {kind:'jump',start:.53,length:.055,height:1.69},
      {kind:'whoops',start:.65,length:.08,height:0.49,count:4},
      {kind:'jump',start:.79,length:.06,height:1.56},
    ],
  },
];

// Keep each expanded lap exactly four times the previous course length.
function spline(points){
 const path=new THREE.CurvePath();
 for(let i=0;i<points.length;i++){
  const p=o=>points[(i+o+points.length)%points.length];
  const blend=(a,b,c)=>a.clone().addScaledVector(b,4).add(c).divideScalar(6);
  path.add(new THREE.CubicBezierCurve3(blend(p(-1),p(0),p(1)),p(0).clone().multiplyScalar(2).add(p(1)).divideScalar(3),p(0).clone().addScaledVector(p(1),2).divideScalar(3),blend(p(0),p(1),p(2))));
 }
 return path;
}
const extended=[
 [[-52,-38],[-30,-38],[-8,-38],[14,-38],[38,-38],[58,-38],[68,-28],[64,-10],[48,-8],[52,6],[70,14],[66,34],[48,40],[34,30],[20,42],[0,34],[-14,46],[-36,40],[-48,26],[-30,18],[-20,6],[-32,-4],[-48,4],[-66,18],[-70,0],[-62,-18]],
 BASE_TRACKS[1].points,
];
function buildTrack(track,index){
 const scale=TRACK_SCALE*(index===1?1.06:1),vectors=points=>points.map(([x,z])=>new THREE.Vector3(x,0,z));
 const previousLength=spline(vectors(track.points).map(p=>p.multiplyScalar(scale))).getLength();
 const points=extended[index],factor=previousLength*LENGTH_MULTIPLIER/spline(vectors(points)).getLength();
 const length=previousLength*LENGTH_MULTIPLIER;
 return {...track,points:points.map(([x,z])=>[x*factor,z*factor]),length,previousLength,
  features:[{kind:'canyon',start:index===0?.085:.035,length:(cfg.rampRunup+cfg.jumpGap+cfg.landingLength)/length,height:cfg.rampHeight,runup:cfg.rampRunup,gap:cfg.jumpGap,landing:cfg.landingLength},
   ...[.24,.43,.64,.82].map((start,i)=>({kind:'whoops',start,length:(70+i*5)/length,height:(.10+i*.025)*cfg.whoopsScale,count:7+i})),
   ...[.34,.56,.74,.93].map(start=>({kind:'jump',start,length:32/length,height:cfg.smallJumpHeight})),
   ...[.29,.51,.71,.90].map(start=>({kind:'dip',start,length:28/length,height:-cfg.dipDepth}))]};
}
function buildExtraTrack(track,index){
 const curve=spline(track.points.map(([x,z])=>new THREE.Vector3(x,0,z))),length=curve.getLength();
 const features=[{kind:'canyon',start:.025,length:(cfg.rampRunup+cfg.jumpGap+cfg.landingLength)/length,height:cfg.rampHeight,runup:cfg.rampRunup,gap:cfg.jumpGap,landing:cfg.landingLength}];
 // Eight broad jumps, six whoop fields and offset dips distribute suspension
 // work over the entire long lap. Feature lengths remain in world meters.
 for(let i=0;i<8;i++)features.push({kind:'jump',start:.15+i*.102,length:(32+(i%3)*6)/length,height:cfg.smallJumpHeight*(2+(i%3)*.65)*track.roughness});
 for(let i=0;i<6;i++)features.push({kind:'whoops',start:.19+i*.13,length:60/length,height:(.16+(i%3)*.07)*cfg.whoopsScale*track.roughness,count:7+i%3});
 for(let i=0;i<7;i++)features.push({kind:'dip',start:.175+i*.113,length:34/length,height:-cfg.dipDepth*(1.4+i%3*.3)});
 return {...track,length,features,packIndex:index};
}
function allTracks(){return [...BASE_TRACKS.map(buildTrack),...extraTrackDefinitions().map(buildExtraTrack)];}
export const TRACKS=allTracks();
export function refreshTracks(){ROAD_WIDTH=cfg.roadWidth;SHOULDER_WIDTH=cfg.shoulderWidth;TRACKS.splice(0,TRACKS.length,...allTracks());}
class ShiftedCircuit extends THREE.Curve{
 constructor(path,offset){super();this.path=path;this.offset=offset;}
 getPoint(t,target){return this.path.getPointAt(((t+this.offset)%1+1)%1,target);}
 getPointAt(t,target){return this.getPoint(t,target);}
 getTangent(t,target){return this.path.getTangentAt(((t+this.offset)%1+1)%1,target);}
 getTangentAt(t,target){return this.getTangent(t,target);}
 getLength(){return this.path.getLength();}
}
export function createCircuit(index,variant=0){
 const reflection=TRACK_VARIANTS[variant];
 const path=spline(TRACKS[index].points.map(([x,z])=>new THREE.Vector3(x*reflection.x,0,z*reflection.z)));
 // Put the grid on the long straight, giving gentle steering a fair run-up.
 const circuit=new ShiftedCircuit(path,index===0?.04:index>=2?.10:0);
 circuit.variant=variant;circuit.lateralSign=reflection.x*reflection.z;
 return circuit;
}
const smooth=t=>t*t*(3-2*t);
export function terrainHeight(progress,index=0,lateral=0,variant=0){
 const reflection=TRACK_VARIANTS[variant];
 // A single reflection swaps left/right, including banks and split landings.
 lateral*=reflection.x*reflection.z;
 const t=((progress%1)+1)%1,track=TRACKS[index],s=t*track.length;
 // Keep the launch runway flat, then blend into large elevation changes.
 const rough=track.roughness??0,envelope=rough?smooth(Math.max(0,Math.min(1,(t-.09)/.07)))*smooth(Math.max(0,Math.min(1,(1-t)/.04))):0;
 const hills=rough*envelope*(3.8+3.2*Math.sin(t*Math.PI*(6+2*(track.terrainStyle??0)))+1.5*Math.sin(t*Math.PI*18));
 // Broad rolling ground, bank changes and offset wheel ruts share one mesh.
 let height=3+hills*cfg.rollingScale+cfg.rollingScale*(.30*Math.sin(t*Math.PI*8)+.14*Math.sin(t*Math.PI*22));
 height+=cfg.bankScale*lateral*(.06+rough*envelope*.035)*Math.sin(t*Math.PI*12)+cfg.rutScale*(.025*Math.sin(s*.43+lateral*1.7)+.020*Math.sin(s*.71-lateral*.9));
 for(const f of track.features){
  const u=(t-f.start)/f.length;if(u<=0||u>=1)continue;
  if(f.kind==='canyon'){
   const d=(t-f.start)*track.length;
   if(d<f.runup){const r=d/f.runup;return 3+f.height*r*r*(1.5-.5*r);}
   if(d<f.runup+.8)return 3+f.height*(1-smooth((d-f.runup)/.8));
   if(d<f.runup+f.gap)return 3;
   // Two landing lanes: straddling the seam loads one side first.
   const lane=smooth(Math.max(0,Math.min(1,(lateral+.55)/1.1)));
   const landingHeight=cfg.landingLow+lane*cfg.landingSplit;
   const r=(d-f.runup-f.gap)/f.landing;
   // A short nose bevel avoids an invisible vertical collision wall.
   return 3+landingHeight*Math.min(1,r*f.landing/7)*(1-smooth(r));
  }
  height+=f.height*(f.kind==='whoops'?Math.sin(u*Math.PI*f.count)**2:Math.sin(u*Math.PI)**2);
 }
 return height;
}

export function nearestPoint(samples,x,z){
 return indexedNearest(samples,x,z);
}

export function opponentInput(car,near,curve,samples){
 const n=samples.length;
 const spacing=curve.getLength()/n;
 const look=Math.max(3,Math.round((8+Math.abs(car.speed)*.45)/spacing));
 const target=samples[(near.index+look)%n].clone();
 const tangent=curve.getTangentAt(((near.index+look)%n)/n);
 target.x-=tangent.z*(car.lane??-3.5);target.z+=tangent.x*(car.lane??-3.5);
 const desired=Math.atan2(-(target.x-car.x),-(target.z-car.z));
 const diff=angleDelta(desired,car.heading);
 const now=curve.getTangentAt(near.index/n),ahead=curve.getTangentAt(((near.index+look*2)%n)/n);
 const bend=Math.abs(angleDelta(Math.atan2(ahead.x,ahead.z),Math.atan2(now.x,now.z)));
 const targetSpeed=bend>.7?14:bend>.35?18:22;
 return {steer:clamp(diff*1.6,-1,1),throttle:Math.abs(diff)>1?.45:1,brake:car.speed>targetSpeed+1,boost:car.nitro>20&&bend<.18&&Math.abs(diff)<.2&&near.distance<3};
}

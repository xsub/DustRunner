import * as THREE from 'three';
import {angleDelta,clamp} from './race.js';

export const TRACK_SCALE = 1.35;
export const ROAD_WIDTH = 6.2 * 1.25;
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

// Preserve the tuned physical ramp lengths when spacing the circuit farther apart.
export const TRACKS=BASE_TRACKS.map(track=>({...track,features:track.features.map(f=>({...f,length:f.length/TRACK_SCALE}))}));

export function createCircuit(index) {
  const points=TRACKS[index].points.map(([x,z])=>new THREE.Vector3(x,0,z).multiplyScalar(TRACK_SCALE*(index===1?1.06:1)));
  const path=new THREE.CurvePath();
  // A closed cubic B-spline rounds each hairpin without folding the inside road edge.
  for(let i=0;i<points.length;i++){
    const p=offset=>points[(i+offset+points.length)%points.length];
    const blend=(a,b,c)=>a.clone().addScaledVector(b,4).add(c).divideScalar(6);
    path.add(new THREE.CubicBezierCurve3(
      blend(p(-1),p(0),p(1)),p(0).clone().multiplyScalar(2).add(p(1)).divideScalar(3),
      p(0).clone().addScaledVector(p(1),2).divideScalar(3),blend(p(0),p(1),p(2)),
    ));
  }
  return path;
}

const smooth = t=>t*t*(3-2*t);
export function terrainHeight(progress,index=0) {
  const t=((progress%1)+1)%1;
  let height=0;
  for(const feature of TRACKS[index].features) {
    const u=(t-feature.start)/feature.length;
    if(u<=0||u>=1)continue;
    if(feature.kind==='jump') {
      // Rounded run-up, short crest and steep landing face make a real takeoff.
      height+=feature.height*(u<.48?smooth(u/.48):1-smooth((u-.48)/.52));
    } else {
      height+=feature.height*Math.sin(u*Math.PI*feature.count)**2;
    }
  }
  return height;
}

export function nearestPoint(samples,x,z){
 let best=Infinity,index=0;
 for(let i=0;i<samples.length;i++){const p=samples[i],d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;index=i;}}
 return {index,distance:Math.sqrt(best),point:samples[index]};
}

export function opponentInput(car,near,curve,samples){
 const n=samples.length;
 const look=Math.round(15+Math.abs(car.speed)*.4);
 const target=samples[(near.index+look)%n];
 const desired=Math.atan2(-(target.x-car.x),-(target.z-car.z));
 const diff=angleDelta(desired,car.heading);
 const now=curve.getTangentAt(near.index/n),ahead=curve.getTangentAt(((near.index+look*2)%n)/n);
 const bend=Math.abs(angleDelta(Math.atan2(ahead.x,ahead.z),Math.atan2(now.x,now.z)));
 const targetSpeed=bend>.7?14:bend>.35?18:22;
 return {steer:clamp(diff*1.8,-1,1),throttle:Math.abs(diff)>1?.45:1,brake:car.speed>targetSpeed+1,boost:car.nitro>20&&bend<.18&&Math.abs(diff)<.2&&near.distance<3};
}

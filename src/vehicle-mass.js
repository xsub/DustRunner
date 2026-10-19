// Representative game mass calibrations, not factory shipping weights.
// The engine replaces the baseline 302's mass rather than adding a second
// engine on top of the curb mass. Physics and powertrain share this model.
const ENGINE_MASS={170:185,200:195,289:210,302:225,'302efi':230,'351m':285,400:300,300:270,'300efi':275,'351w':250,'351wefi':255};
const cache=new Map();
export function vehicleMass(style='classic',engineId='302'){
 return (style==='classic'?1425:1825)+(ENGINE_MASS[engineId]??225);
}
export function vehicleMassProperties(style='classic',engineId='302'){
 const key=`${style}:${engineId}`;if(cache.has(key))return cache.get(key);
 const engineMass=ENGINE_MASS[engineId]??225,mass=vehicleMass(style,engineId),dry=mass-engineMass;
 const parts=[
  // Mass, local center (body origin is 1.5 above the road), box dimensions.
  [dry*.43,[0,-.80,-.16],[2.35,.30,4.3]], // low frame / drivetrain
  [dry*.24,[0,-.12,-.04],[2.45,.85,4.2]], // body panels
  [dry*.12,[0,.20,.30],[2.1,.80,2.4]], // cabin / occupants
  [dry*.04,[0,1.12,.55],[2.3,.14,2.6]], // light roof
  [engineMass,[0,-.45,-1.03],[.85,.80,1.05]], // iron block under the hood
 ];
 for(const x of [-1.4,1.4])for(const z of [-1.232,1.274])parts.push([dry*.17/4,[x,-.66,z],[.6,1.4,1.4]]);
 const centerOfMass={x:0,y:0,z:0};
 for(const [m,p] of parts)for(const [i,axis] of ['x','y','z'].entries())centerOfMass[axis]+=m*p[i]/mass;
 let xx=0,yy=0,zz=0,yz=0;
 for(const [m,p,[w,h,d]] of parts){
  const x=p[0]-centerOfMass.x,y=p[1]-centerOfMass.y,z=p[2]-centerOfMass.z;
  xx+=m*((h*h+d*d)/12+y*y+z*z);yy+=m*((w*w+d*d)/12+x*x+z*z);zz+=m*((w*w+h*h)/12+x*x+y*y);yz-=m*y*z;
 }
 // Symmetry cancels XY/XZ terms. Diagonalize the remaining YZ block so
 // Rapier receives both the distributed inertia and its principal frame.
 const angle=.5*Math.atan2(2*yz,yy-zz),mean=(yy+zz)/2,spread=Math.hypot((yy-zz)/2,yz);
 const properties={mass,engineMass,centerOfMass,principalAngularInertia:{x:xx,y:mean+spread,z:mean-spread},angularInertiaLocalFrame:{x:Math.sin(angle/2),y:0,z:0,w:Math.cos(angle/2)}};
 cache.set(key,properties);return properties;
}

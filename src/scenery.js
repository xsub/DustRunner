import * as THREE from 'three';
import {snakeRetreat} from './wildlife.js';
export const MARKER_SPACING=8;

// Shared geometries and instanced plants keep the desert inexpensive to draw.
export function createScenery({world,samples,curve,roadWidth,terrain,heightAt=()=>-.25,addBarrier=()=>{},addRocks=()=>{},protectedAreas=[],smallRocks=[],nearest,bounds,random}){
 const material=color=>new THREE.MeshStandardMaterial({color,roughness:1});
 const rubber=material('#30322b'),worn=material('#45463a'),orange=material('#ee792e'),white=material('#f4ebd8');
 const barrierBatches=new Map(),barrierMatrix=new THREE.Object3D(),barrierBindings=[];let currentBarrier;
 const barrier=(geometry,mat,x,y,z,rx=0,ry=0,rz=0)=>{
  let byMaterial=barrierBatches.get(geometry);if(!byMaterial){byMaterial=new Map();barrierBatches.set(geometry,byMaterial);}if(!byMaterial.has(mat))byMaterial.set(mat,[]);
  barrierMatrix.position.set(x,y,z);barrierMatrix.rotation.set(rx,ry,rz);barrierMatrix.updateMatrix();const matrix=barrierMatrix.matrix.clone(),local=matrix.clone();
  if(currentBarrier){local.elements[12]-=currentBarrier.origin.x;local.elements[13]-=currentBarrier.origin.y;local.elements[14]-=currentBarrier.origin.z;}
  byMaterial.get(mat).push({matrix,local,body:currentBarrier?.body});
 };
 const mesh=(geometry,mat,parent=world)=>{const m=new THREE.Mesh(geometry,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 // Circular, separated tires replace overlapping rectangular barrier segments.
 const tireGeometry=new THREE.TorusGeometry(.38,.17,6,14);
 const coneBase=new THREE.BoxGeometry(.85,.12,.85);
 const coneSections=[new THREE.CylinderGeometry(.28,.4,.42,10),new THREE.CylinderGeometry(.19,.28,.32,10),new THREE.CylinderGeometry(.045,.19,.5,10)];
 for(const originalSide of [-1,1]){
  const side=originalSide*(curve.lateralSign??1);
  let last=null,first=null,count=0;
  for(let i=0;i<samples.length;i++){
   const p=samples[i],t=curve.getTangentAt(i/samples.length);
   const x=p.x-t.z*(roadWidth+.06)*side,z=p.z+t.x*(roadWidth+.06)*side;
   if(last&&Math.hypot(x-last.x,z-last.z)<MARKER_SPACING)continue;
   if(first&&i>samples.length*.9&&Math.hypot(x-first.x,z-first.z)<MARKER_SPACING)continue;
   last={x,z};first??=last;
   const y=heightAt(x,z)+.01;
   const cone=count++%4===2,layers=2+(count%7===0?1:0);
   currentBarrier={origin:{x,y,z},body:addBarrier(x,y,z,{kind:cone?'cone':'tires',layers})};
   if(cone){
    barrier(coneBase,rubber,x,y+.06,z,0,Math.atan2(t.x,t.z));
    let bottom=y+.12;
    coneSections.forEach((g,k)=>{const h=[.42,.32,.5][k];barrier(g,k===1?white:orange,x,bottom+h/2,z);bottom+=h;});
   }else{
    for(let layer=0;layer<layers;layer++){
     const body=currentBarrier.body,origin=currentBarrier.origin;
     currentBarrier={body:body?.tireBodies?.[layer]??body,origin:{x,y:y+layer*.32,z}};
     barrier(tireGeometry,(count+layer)%3?worn:rubber,x,y+.17+layer*.32,z,Math.PI/2,0,count*.7+layer);
     currentBarrier={body,origin};
    }
   }
  }
 }
 for(const [geometry,byMaterial] of barrierBatches)for(const [mat,entries] of byMaterial){
  const batch=new THREE.InstancedMesh(geometry,mat,entries.length);
  entries.forEach((entry,index)=>{batch.setMatrixAt(index,entry.matrix);if(entry.body)barrierBindings.push({batch,index,body:entry.body,local:entry.local,version:-1});});
  batch.castShadow=true;batch.receiveShadow=true;batch.frustumCulled=false;world.add(batch);
 }
 const propPose=new THREE.Matrix4(),propMatrix=new THREE.Matrix4(),propPosition=new THREE.Vector3(),propRotation=new THREE.Quaternion(),unitScale=new THREE.Vector3(1,1,1);
 const matrix=new THREE.Object3D();
 const plantBatches=[];
 const batch=(geometry,color,capacity)=>{const m=new THREE.InstancedMesh(geometry,material(color),capacity);m.castShadow=true;m.receiveShadow=true;m.count=0;world.add(m);plantBatches.push(m);return m;};
 const trunks=batch(new THREE.CylinderGeometry(1,1,1,7),'#65703b',1600);
 const leaves=batch(new THREE.ConeGeometry(1,1,5),'#79834c',2600);
 const rockGeometry=new THREE.IcosahedronGeometry(1,0),rockVertices=[],rockCells=new Map();
 const bushes=batch(rockGeometry,'#82745b',2200+smallRocks.length);
 const rockPosition=rockGeometry.attributes.position;
 const rock=(x,y,z,sx,sy,sz)=>{
  put(bushes,x,y,z,sx,sy,sz);
  for(let j=0;j<rockPosition.count;j++)rockVertices.push(x+rockPosition.getX(j)*sx,y+rockPosition.getY(j)*sy,z+rockPosition.getZ(j)*sz);
  const key=`${Math.floor(x/8)},${Math.floor(z/8)}`;if(!rockCells.has(key))rockCells.set(key,[]);rockCells.get(key).push({x,z,radius:Math.max(sx,sz)});
 };
 const isRecoveryBlocked=(x,z)=>{
  for(let gx=Math.floor((x-6)/8);gx<=Math.floor((x+6)/8);gx++)for(let gz=Math.floor((z-6)/8);gz<=Math.floor((z+6)/8);gz++)for(const r of rockCells.get(`${gx},${gz}`)??[])if(Math.hypot(r.x-x,r.z-z)<4+r.radius)return true;
  return false;
 };
 const dry=batch(new THREE.ConeGeometry(1,1,4),'#aa985a',1800);
 function put(batch,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){
  matrix.position.set(x,y,z);matrix.scale.set(sx,sy,sz);matrix.rotation.set(rx,ry,rz);matrix.updateMatrix();batch.setMatrixAt(batch.count++,matrix.matrix);
 }
 for(let i=0;i<1200;i++){
  const x=bounds.min.x-20+random()*(bounds.max.x-bounds.min.x+40),z=bounds.min.z-20+random()*(bounds.max.z-bounds.min.z+40);
  if(protectedAreas.some(p=>Math.hypot(p.x-x,p.z-z)<8)||nearest(x,z).distance<roadWidth+2.6||z>bounds.max.z+roadWidth+3||z<bounds.min.z-roadWidth-3)continue;
  const type=random(),size=.7+random()*.8,y=heightAt(x,z);
  if(type<.27){ // branching saguaro
   const h=(1.5+random()*2.2)*size;
   put(trunks,x,y+h/2,z,.22*size,h,.22*size);
   for(const side of [-1,1]){
    const arm=h*(.45+random()*.16),reach=.6*size;
    put(trunks,x+side*reach*.5,y+arm,z,.16*size,reach,.16*size,0,0,Math.PI/2);
    put(trunks,x+side*reach,y+arm+.4*size,z,.16*size,.8*size,.16*size);
   }
  }else if(type<.49){ // agave rosettes
   for(let k=0;k<7;k++){
    const a=k*Math.PI*2/7;
    put(leaves,x+Math.sin(a)*.38*size,y+.36*size,z+Math.cos(a)*.38*size,.15*size,1.2*size,.22*size,Math.cos(a)*.85,0,-Math.sin(a)*.85);
   }
  }else if(type<.78){
   for(let k=0;k<3;k++)rock(x+(random()-.5)*size,y+.3*size,z+(random()-.5)*size,.6*size,.45*size,.55*size);
  }else{
   for(let k=0;k<5;k++)put(dry,x+(random()-.5)*.8,y+.28*size,z+(random()-.5)*.8,.07,.7*size,.07,(random()-.5)*.7,random()*6,(random()-.5)*.7);
  }
 }
 for(const stone of smallRocks){
  if(protectedAreas.some(p=>Math.hypot(p.x-stone.x,p.z-stone.z)<8))continue;
  rock(stone.x,heightAt(stone.x,stone.z)+stone.offset,stone.z,stone.sx,stone.sy,stone.sz);
 }
 if(rockVertices.length)addRocks(new Float32Array(rockVertices));
 for(const batch of plantBatches){batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();}

 const snakes=[],skin=material('#987444'),diamond=material('#463b29'),rattle=material('#d2bb80'),black=material('#151b14');
 const bodyGeometry=new THREE.SphereGeometry(1,7,5),headGeometry=new THREE.SphereGeometry(1,8,6);
 for(let attempt=0;attempt<700&&snakes.length<18;attempt++){
  const x=bounds.min.x+random()*(bounds.max.x-bounds.min.x),z=bounds.min.z+random()*(bounds.max.z-bounds.min.z);
  // Full animation envelope (body, tail and wandering) remains off the road.
  if(nearest(x,z).distance<roadWidth+5.5)continue;
  const group=new THREE.Group();world.add(group);
  const segments=[];
  for(let j=0;j<24;j++)segments.push(mesh(bodyGeometry,j%4===1?diamond:skin,group));
  const head=mesh(headGeometry,skin,group);head.scale.set(.2,.12,.28);
  for(const side of [-1,1]){const eye=mesh(bodyGeometry,black,head);eye.position.set(side*.75,.5,-.4);eye.scale.set(.15,.2,.14);}
  const tail=[];for(let j=0;j<4;j++){const bead=mesh(bodyGeometry,rattle,group);bead.scale.set(.075-j*.01,.065,.085);tail.push(bead);}
  snakes.push({group,segments,head,tail,x,z,groundY:heightAt(x,z),phase:random()*Math.PI*2,visible:false,retreat:0,hideUntil:0});
 }
 // Animated snakes share five draw calls instead of hundreds of meshes.
 const snakeBatches=new Map();
 for(const snake of snakes){
  snake.group.removeFromParent();
  snake.group.traverse(part=>{
   if(!part.isMesh)return;
   const key=part.geometry.uuid+'/'+part.material.uuid;
   if(!snakeBatches.has(key))snakeBatches.set(key,{geometry:part.geometry,material:part.material,parts:[]});
   snakeBatches.get(key).parts.push({part,snake});
  });
 }
 for(const data of snakeBatches.values()){
  data.mesh=new THREE.InstancedMesh(data.geometry,data.material,data.parts.length);data.mesh.count=0;data.mesh.castShadow=true;data.mesh.receiveShadow=true;data.mesh.frustumCulled=false;data.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);world.add(data.mesh);
 }
 const packSnakes=()=>{
  for(const {mesh,parts} of snakeBatches.values()){let count=0;for(const {part,snake} of parts)if(snake.visible)mesh.setMatrixAt(count++,part.matrixWorld);mesh.count=count;if(count)mesh.instanceMatrix.needsUpdate=true;}
 };
 let time=0,lastDecorTime=-Infinity,activeSnakes=0,decorUpdates=0;
 return {isRecoveryBlocked,getStats:()=>({activeSnakes,decorUpdates}),resetBarriers(){for(const binding of barrierBindings)binding.version=-1;},update(dt,isVisible=()=>true,allowDecor=true,vehicles=[]){
  const dirty=new Set();
  for(const binding of barrierBindings){
   const state=binding.body.markerState;if(!state||binding.version===state.version)continue;binding.version=state.version;
   propPosition.copy(state.position);propRotation.copy(state.rotation);
   propPose.compose(propPosition,propRotation,unitScale);propMatrix.multiplyMatrices(propPose,binding.local);
   binding.batch.setMatrixAt(binding.index,propMatrix);dirty.add(binding.batch);
  }
  for(const batch of dirty)batch.instanceMatrix.needsUpdate=true;
  time+=dt;
  let hidden=false;
  if(dt>0)for(const snake of snakes){
   // Safety remains active even when decorative animation yields to physics.
   if(snakeRetreat(snake,vehicles,time,dt)&&snake.visible){snake.visible=false;hidden=true;}
  }
  if(hidden)packSnakes();
  // Contacts are synchronized above every frame. Decorative animation may
  // wait for headroom, runs at 30 Hz, and never evaluates offscreen terrain.
  if(!allowDecor||time-lastDecorTime<1/30-1e-9)return;
  lastDecorTime=time;decorUpdates++;activeSnakes=0;
  for(const snake of snakes){
   snake.visible=snake.retreat<1&&Boolean(isVisible(snake.x,snake.groundY+.2,snake.z));
   if(!snake.visible)continue;activeSnakes++;
   const a=snake.phase+time*.12;
   snake.group.position.set(snake.x+Math.cos(a)*1.25,heightAt(snake.x+Math.cos(a)*1.25,snake.z+Math.sin(a)*1.25)+.14,snake.z+Math.sin(a)*1.25);
   snake.group.scale.setScalar(1-snake.retreat);snake.group.position.y-=snake.retreat*.2;
   snake.group.rotation.y=Math.PI-a;
   const point=u=>({x:Math.sin(u*8+time*4+snake.phase)*.19,z:1.1-u*2.2});
   snake.segments.forEach((part,j)=>{
    const u=j/23,p=point(u),radius=.06+.075*Math.sin(u*Math.PI/2);
    part.position.set(p.x,0,p.z);part.scale.set(radius,.085,radius*1.2);
   });
   const p=point(1),previous=point(.95);snake.head.position.set(p.x,.015,p.z-.08);snake.head.rotation.y=Math.atan2(-(p.x-previous.x),-(p.z-previous.z));
   const end=point(0);snake.tail.forEach((bead,j)=>bead.position.set(end.x,.02+j*.012,end.z+.08+j*.1));
  }
  for(const snake of snakes)if(snake.visible)snake.group.updateMatrixWorld(true);
  packSnakes();
 }};
}

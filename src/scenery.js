import * as THREE from 'three';

// Shared geometries and instanced plants keep the desert inexpensive to draw.
export function createScenery({world,samples,curve,roadWidth,terrain,heightAt=()=>-.25,addBarrier=()=>{},nearest,bounds,random}){
 const material=color=>new THREE.MeshStandardMaterial({color,roughness:1});
 const rubber=material('#30322b'),worn=material('#45463a'),orange=material('#ee792e'),white=material('#f4ebd8');
 const barrierBatches=new Map(),barrierMatrix=new THREE.Object3D();
 const barrier=(geometry,mat,x,y,z,rx=0,ry=0,rz=0)=>{
  let byMaterial=barrierBatches.get(geometry);if(!byMaterial){byMaterial=new Map();barrierBatches.set(geometry,byMaterial);}if(!byMaterial.has(mat))byMaterial.set(mat,[]);
  barrierMatrix.position.set(x,y,z);barrierMatrix.rotation.set(rx,ry,rz);barrierMatrix.updateMatrix();byMaterial.get(mat).push(barrierMatrix.matrix.clone());
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
   if(last&&Math.hypot(x-last.x,z-last.z)<2.1)continue;
   if(first&&i>samples.length*.9&&Math.hypot(x-first.x,z-first.z)<2.1)continue;
   last={x,z};first??=last;
   const y=heightAt(x,z)+.01;
   addBarrier(x,y,z);
   if(count++%4===2){
    barrier(coneBase,rubber,x,y+.06,z,0,Math.atan2(t.x,t.z));
    let bottom=y+.12;
    coneSections.forEach((g,k)=>{const h=[.42,.32,.5][k];barrier(g,k===1?white:orange,x,bottom+h/2,z);bottom+=h;});
   }else{
    for(let layer=0;layer<2+(count%7===0?1:0);layer++){
     barrier(tireGeometry,(count+layer)%3?worn:rubber,x,y+.17+layer*.32,z,Math.PI/2,0,count*.7+layer);
    }
   }
  }
 }
 for(const [geometry,byMaterial] of barrierBatches)for(const [mat,matrices] of byMaterial){const batch=new THREE.InstancedMesh(geometry,mat,matrices.length);matrices.forEach((m,i)=>batch.setMatrixAt(i,m));batch.castShadow=true;batch.receiveShadow=true;batch.computeBoundingSphere();world.add(batch);}
 const matrix=new THREE.Object3D();
 const plantBatches=[];
 const batch=(geometry,color,capacity)=>{const m=new THREE.InstancedMesh(geometry,material(color),capacity);m.castShadow=true;m.receiveShadow=true;m.count=0;world.add(m);plantBatches.push(m);return m;};
 const trunks=batch(new THREE.CylinderGeometry(1,1,1,7),'#65703b',1600);
 const leaves=batch(new THREE.ConeGeometry(1,1,5),'#79834c',2600);
 const bushes=batch(new THREE.IcosahedronGeometry(1,0),'#778058',2200);
 const dry=batch(new THREE.ConeGeometry(1,1,4),'#aa985a',1800);
 function put(batch,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){
  matrix.position.set(x,y,z);matrix.scale.set(sx,sy,sz);matrix.rotation.set(rx,ry,rz);matrix.updateMatrix();batch.setMatrixAt(batch.count++,matrix.matrix);
 }
 for(let i=0;i<1200;i++){
  const x=bounds.min.x-20+random()*(bounds.max.x-bounds.min.x+40),z=bounds.min.z-20+random()*(bounds.max.z-bounds.min.z+40);
  if(nearest(x,z).distance<roadWidth+2.6||z>bounds.max.z+roadWidth+3||z<bounds.min.z-roadWidth-3)continue;
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
   for(let k=0;k<3;k++)put(bushes,x+(random()-.5)*size,y+.3*size,z+(random()-.5)*size,.6*size,.45*size,.55*size);
  }else{
   for(let k=0;k<5;k++)put(dry,x+(random()-.5)*.8,y+.28*size,z+(random()-.5)*.8,.07,.7*size,.07,(random()-.5)*.7,random()*6,(random()-.5)*.7);
  }
 }
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
  snakes.push({group,segments,head,tail,x,z,phase:random()*Math.PI*2});
 }
 let time=0;
 return {update(dt){
  time+=dt;
  for(const snake of snakes){
   const a=snake.phase+time*.12;
   snake.group.position.set(snake.x+Math.cos(a)*1.25,heightAt(snake.x+Math.cos(a)*1.25,snake.z+Math.sin(a)*1.25)+.14,snake.z+Math.sin(a)*1.25);
   snake.group.rotation.y=Math.PI-a;
   const point=u=>({x:Math.sin(u*8+time*4+snake.phase)*.19,z:1.1-u*2.2});
   snake.segments.forEach((part,j)=>{
    const u=j/23,p=point(u),radius=.06+.075*Math.sin(u*Math.PI/2);
    part.position.set(p.x,0,p.z);part.scale.set(radius,.085,radius*1.2);
   });
   const p=point(1),previous=point(.95);snake.head.position.set(p.x,.015,p.z-.08);snake.head.rotation.y=Math.atan2(-(p.x-previous.x),-(p.z-previous.z));
   const end=point(0);snake.tail.forEach((bead,j)=>bead.position.set(end.x,.02+j*.012,end.z+.08+j*.1));
  }
 }};
}

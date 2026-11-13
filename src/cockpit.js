import * as THREE from 'three';
import {cockpitLayout,WHEEL,GAUGE_FACE,MIRROR} from './pov-view.js';
import {batchRigidMeshes} from './mesh-batching.js';

// First-person cabin furniture for the player's truck: a full-size steering
// wheel that follows the front wheels, a lit instrument binnacle, a dash
// inclinometer and a working rear-view mirror. The exterior model already
// provides pillars, roof, hood, seats and glass. Positions are model units.
const DIAL_START=Math.PI*.78,DIAL_SWEEP=Math.PI*1.44;
export const dialAngle=(value,max)=>DIAL_START+DIAL_SWEEP*Math.max(0,Math.min(1,value/max));
export const STEERING_RATIO=7.5;
// Glove spheres: angle from the top of the rim, radius, and how far they are squashed toward the rim.
export const GLOVE={angle:.7,radius:.03,radial:.8};
// The mirror stalk starts this far above the mirror's centre, inside its housing.
export const STALK_FOOT=.02;
// Canvas layout in pixels. Each region has the same aspect as the plane it is
// mapped onto, so circles drawn here stay round on the dash.
export const GAUGE_CANVAS={width:1024,height:256,binnacle:768,speedMax:280};
// Range label and nitro bar, in canvas pixels, in the gap between the two dials.
export const READOUT={x:344,y:98,width:80,height:60};

function drawDial(ctx,x,y,radius,{value,max,major,minor,label,unit,redFrom=Infinity,format=v=>v}){
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#0d110d';ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();
 ctx.lineWidth=5;ctx.strokeStyle='#8f8a6c';ctx.stroke();
 for(let v=0;v<=max+1e-6;v+=minor){
  const a=dialAngle(v,max),big=Math.abs(v/major-Math.round(v/major))<1e-6,inner=radius*(big?.76:.84);
  ctx.strokeStyle=v>=redFrom?'#e0523a':'#f0ead2';ctx.lineWidth=big?4:2;
  ctx.beginPath();ctx.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);ctx.lineTo(Math.cos(a)*radius*.92,Math.sin(a)*radius*.92);ctx.stroke();
  if(big){ctx.fillStyle=v>=redFrom?'#e0523a':'#f0ead2';ctx.font=`700 ${Math.round(radius*.2)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(format(v),Math.cos(a)*radius*.58,Math.sin(a)*radius*.58);}
 }
 ctx.fillStyle='#a7b196';ctx.font=`700 ${Math.round(radius*.15)}px sans-serif`;ctx.textAlign='center';ctx.fillText(unit,0,radius*.34);
 ctx.fillStyle='#f4cf58';ctx.font=`800 ${Math.round(radius*.3)}px sans-serif`;ctx.fillText(label,0,radius*.66);
 const a=dialAngle(value,max);ctx.rotate(a);
 ctx.fillStyle='#ff6a3a';ctx.beginPath();ctx.moveTo(-radius*.16,-4);ctx.lineTo(radius*.84,-1.5);ctx.lineTo(radius*.84,1.5);ctx.lineTo(-radius*.16,4);ctx.closePath();ctx.fill();
 ctx.fillStyle='#262b24';ctx.beginPath();ctx.arc(0,0,radius*.1,0,Math.PI*2);ctx.fill();
 ctx.restore();
}

export function createCockpit({halfFloat=false}={}){
 // The wheel and column are part of the truck in every view. The seat-only
 // furniture (dials, inclinometer, mirror, gloves) appears from the driver's eye.
 const rig=new THREE.Group();rig.name='cockpit';
 const matte=color=>new THREE.MeshStandardMaterial({color,roughness:.82,metalness:.05});
 const black=matte('#181b18'),grip=matte('#232722'),leather=matte('#3b2a1d'),chrome=new THREE.MeshStandardMaterial({color:'#c5cbc6',metalness:.85,roughness:.25});
 const add=(geometry,material,parent,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=true;parent.add(m);return m;};

 // Steering wheel: the column group carries the rake, the wheel group turns.
 // Rim, spokes, hub and shaft are merged by material: three draw calls in any view.
 const column=new THREE.Group(),wheel=new THREE.Group(),solid=new THREE.Group();column.rotation.x=WHEEL.rake;column.add(wheel);wheel.add(solid);rig.add(column);
 const shaft=add(new THREE.CylinderGeometry(.022,.026,.24,10),black,solid,0,0,-.13);shaft.rotation.x=Math.PI/2;
 add(new THREE.TorusGeometry(WHEEL.radius,WHEEL.tube,10,40),grip,solid);
 for(const angle of [Math.PI/2+2.2,Math.PI/2-2.2,-Math.PI/2]){const spoke=add(new THREE.BoxGeometry(.13,.022,.01),chrome,solid,Math.cos(angle)*.08,Math.sin(angle)*.08,-.004);spoke.rotation.z=angle;}
 const hub=add(new THREE.CylinderGeometry(.04,.045,.03,20),black,solid);hub.rotation.x=Math.PI/2;
 const horn=add(new THREE.CylinderGeometry(.03,.03,.034,20),chrome,solid);horn.rotation.x=Math.PI/2;
 batchRigidMeshes(solid);
 const gloves=new THREE.Group();wheel.add(gloves);
 // Hands at eleven and one, flattened against the rim so that, as the wheel turns and a
 // glove passes over the top, it stays within the rim's own outline and off the dials.
 for(const side of [-1,1]){
  const angle=Math.PI/2+side*GLOVE.angle,reach=WHEEL.radius-.007,hand=add(new THREE.SphereGeometry(GLOVE.radius,12,10),leather,gloves,Math.cos(angle)*reach,Math.sin(angle)*reach,.006);
  hand.rotation.z=angle-Math.PI/2;hand.scale.set(1.15,GLOVE.radial,1.25);
  const thumb=add(new THREE.CapsuleGeometry(.011,.03,4,8),leather,gloves,Math.cos(angle)*.125,Math.sin(angle)*.125+.012,.016);thumb.rotation.z=angle+Math.PI/2;
 }

 // One canvas feeds both the binnacle (3:1 region) and the inclinometer (1:1 region).
 const canvas=document.createElement('canvas');canvas.width=GAUGE_CANVAS.width;canvas.height=GAUGE_CANVAS.height;const ctx=canvas.getContext('2d');
 const gaugeTexture=new THREE.CanvasTexture(canvas);gaugeTexture.colorSpace=THREE.SRGBColorSpace;gaugeTexture.anisotropy=4;
 const gaugeMaterial=new THREE.MeshBasicMaterial({map:gaugeTexture,toneMapped:false});
 const region=(geometry,u0,u1)=>{const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,u0+(u1-u0)*uv.getX(i));return geometry;};
 const split=GAUGE_CANVAS.binnacle/GAUGE_CANVAS.width;
 const binnacle=new THREE.Group();binnacle.rotation.x=GAUGE_FACE.tilt;rig.add(binnacle);
 add(new THREE.BoxGeometry(GAUGE_FACE.width+.036,GAUGE_FACE.height+.027,.09),black,binnacle,0,-.006,-.05);
 const brow=add(new THREE.BoxGeometry(GAUGE_FACE.width+.051,.014,.12),black,binnacle,0,GAUGE_FACE.height/2+.012,-.012);brow.castShadow=true;
 add(region(new THREE.PlaneGeometry(GAUGE_FACE.width,GAUGE_FACE.height),0,split),gaugeMaterial,binnacle);
 const pod=new THREE.Group();pod.rotation.set(-.3,-.62,0,'YXZ');rig.add(pod);
 add(new THREE.BoxGeometry(.135,.135,.06),black,pod,0,0,-.034);
 add(region(new THREE.PlaneGeometry(.12,.12),split,1),gaugeMaterial,pod);

 // Rear-view mirror: a low-resolution second render of the same world. The
 // half-float target keeps dark tones and bright sand until the glass tone-maps them.
 const target=new THREE.WebGLRenderTarget(512,144,halfFloat?{depthBuffer:true,type:THREE.HalfFloatType}:{depthBuffer:true,colorSpace:THREE.SRGBColorSpace});
 const mirror=new THREE.Group();mirror.rotation.set(-.05,MIRROR.yaw,0,'YXZ');rig.add(mirror);
 add(new THREE.BoxGeometry(MIRROR.width+.012,MIRROR.height+.011,.02),black,mirror,0,0,-.012);
 // Unit-height stalk: attach() stretches it from inside the housing to the layout's length.
 const stalk=add(new THREE.CylinderGeometry(.007,.007,1,8),black,mirror,0,.06,-.012);
 const glass=add(region(new THREE.PlaneGeometry(MIRROR.width,MIRROR.height),1,0),new THREE.MeshBasicMaterial({map:target.texture}),mirror);
 const mirrorCamera=new THREE.PerspectiveCamera(20,512/144,.5,2400),back=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);
 const mirrorStats={calls:0,triangles:0,every:2};
 let attached=null,seated=false,open=false,lastPaint=-Infinity,painted='',frame=0;
 const showFurniture=()=>{binnacle.visible=pod.visible=mirror.visible=seated;gloves.visible=seated&&!open;};
 showFurniture();

 function paint(r){
  ctx.fillStyle='#161a15';ctx.fillRect(0,0,GAUGE_CANVAS.width,GAUGE_CANVAS.height);
  drawDial(ctx,192,128,112,{value:r.speedKmh,max:GAUGE_CANVAS.speedMax,major:40,minor:20,label:String(Math.round(r.speedKmh)),unit:'km/h'});
  const top=Math.ceil(r.redline/1000)+1;
  drawDial(ctx,576,128,112,{value:r.rpm/1000,max:top,major:1,minor:.5,label:r.gear,unit:'×1000 rpm',redFrom:r.redline/1000});
  // Range and nitro sit mid-height between the dials, above anything the wheel can pass in front of.
  ctx.fillStyle='#0d110d';ctx.fillRect(READOUT.x,READOUT.y,READOUT.width,READOUT.height);ctx.fillStyle='#a7b196';ctx.font='700 17px sans-serif';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText(r.range,READOUT.x+READOUT.width/2,READOUT.y+23);
  ctx.fillStyle=r.nitro>15?'#58c7d8':'#e0523a';ctx.fillRect(READOUT.x+8,READOUT.y+36,64*Math.max(0,Math.min(1,r.nitro/100)),10);ctx.strokeStyle='#8f8a6c';ctx.lineWidth=1;ctx.strokeRect(READOUT.x+8,READOUT.y+36,64,10);
  // Inclinometer: the rear silhouette leans with the body, the figures give roll and pitch.
  ctx.save();ctx.translate(896,128);ctx.fillStyle='#0d110d';ctx.beginPath();ctx.arc(0,0,118,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8f8a6c';ctx.lineWidth=5;ctx.stroke();
  ctx.strokeStyle='#f0ead2';ctx.lineWidth=3;for(const deg of [-40,-30,-20,-10,0,10,20,30,40]){const a=-Math.PI/2+deg*Math.PI/180;ctx.beginPath();ctx.moveTo(Math.cos(a)*(deg%20?104:96),Math.sin(a)*(deg%20?104:96));ctx.lineTo(Math.cos(a)*112,Math.sin(a)*112);ctx.stroke();}
  ctx.save();ctx.rotate(-r.roll*Math.PI/180);ctx.fillStyle='#f4cf58';ctx.fillRect(-46,-34,92,40);ctx.fillRect(-34,-62,68,30);ctx.fillStyle='#161a15';ctx.fillRect(-26,-56,52,18);ctx.fillStyle='#262b24';ctx.fillRect(-52,2,22,30);ctx.fillRect(30,2,22,30);
  ctx.strokeStyle='#ff6a3a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-70);ctx.lineTo(0,-108);ctx.stroke();ctx.restore();
  ctx.fillStyle='#f0ead2';ctx.font='800 26px sans-serif';ctx.textAlign='center';ctx.fillText(`${r.roll>=0?'+':''}${Math.round(r.roll)}°  ·  ${r.pitch>=0?'+':''}${Math.round(r.pitch)}°`,0,66);
  ctx.fillStyle='#a7b196';ctx.font='700 17px sans-serif';ctx.fillText('ROLL · PITCH',0,88);ctx.fillStyle='#f4cf58';ctx.font='800 22px sans-serif';ctx.fillText(r.bearing,0,-84);
  ctx.restore();gaugeTexture.needsUpdate=true;
 }

 return {
  rig,mirrorCamera,mirrorStats,
  // Named parts, for tests and inspection.
  parts:{column,wheel,gloves,binnacle,pod,mirror,stalk,glass,target},
  attach(car){
   const layout=cockpitLayout(car.cabin);
   car.mesh.add(rig);attached=car;open=Boolean(car.cabin?.open);painted='';
   column.position.set(layout.column.x,layout.column.y,layout.column.z);binnacle.position.set(layout.binnacle.x,layout.binnacle.y,layout.binnacle.z);
   pod.position.set(layout.pod.x,layout.pod.y,layout.pod.z);mirror.position.set(layout.mirror.x,layout.mirror.y,layout.mirror.z);
   stalk.scale.y=layout.stalk;stalk.position.y=STALK_FOOT+layout.stalk/2;
   // Open trucks already seat a suited driver whose own gloves hold the wheel.
   showFurniture();
  },
  // Call before disposing the truck's own meshes: the rig outlives every body swap.
  detach(){rig.removeFromParent();attached=null;},
  get visible(){return seated;},
  setVisible(visible){if(seated===Boolean(visible))return;seated=Boolean(visible);showFurniture();},
  // `read` is only called when the dials are due a repaint (about 14 times a second).
  update(now,steer,read){
   wheel.rotation.z=steer*STEERING_RATIO;
   if(!seated||now-lastPaint<70)return;
   lastPaint=now;
   const reading=read(),key=[Math.round(reading.speedKmh),Math.round(reading.rpm/40),reading.gear,reading.range,Math.round(reading.nitro/4),Math.round(reading.roll),Math.round(reading.pitch),reading.bearing].join('|');
   if(key===painted)return;
   painted=key;paint(reading);
  },
  // Compile the render-target shader variants while a menu is on screen, so
  // the first mirror frame does not stall the start of a drive.
  prewarm(renderer,scene){
   const previous=renderer.getRenderTarget();
   try{renderer.setRenderTarget(target);renderer.compile(scene,mirrorCamera);}finally{renderer.setRenderTarget(previous);}
  },
  // Call before the main pass: reuses the previous frame's shadow maps.
  renderMirror(renderer,scene,every=2){
   mirrorStats.every=every;
   if(!seated||!attached||frame++%every)return false;
   glass.getWorldPosition(mirrorCamera.position);attached.mesh.getWorldQuaternion(mirrorCamera.quaternion).multiply(back);mirrorCamera.updateMatrixWorld();
   const previous=renderer.getRenderTarget(),auto=renderer.shadowMap.autoUpdate;
   try{
    rig.visible=false;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(target);renderer.render(scene,mirrorCamera);
    mirrorStats.calls=renderer.info.render.calls;mirrorStats.triangles=renderer.info.render.triangles;
   }finally{renderer.setRenderTarget(previous);renderer.shadowMap.autoUpdate=auto;rig.visible=true;}
   return true;
  },
 };
}

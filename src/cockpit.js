import * as THREE from 'three';

// First-person cabin furniture for the player's truck: a full-size steering
// wheel that follows the front wheels, a lit instrument binnacle, a dash
// inclinometer and a working rear-view mirror. The exterior model already
// provides pillars, roof, hood, seats and glass. Positions are model units.
const DIAL_START=Math.PI*.78,DIAL_SWEEP=Math.PI*1.44;
export const dialAngle=(value,max)=>DIAL_START+DIAL_SWEEP*Math.max(0,Math.min(1,value/max));
export const STEERING_RATIO=7.5;

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

export function createCockpit(){
 const rig=new THREE.Group();rig.name='cockpit';rig.visible=false;
 const matte=color=>new THREE.MeshStandardMaterial({color,roughness:.82,metalness:.05});
 const black=matte('#181b18'),grip=matte('#232722'),leather=matte('#3b2a1d'),chrome=new THREE.MeshStandardMaterial({color:'#c5cbc6',metalness:.85,roughness:.25});
 const add=(geometry,material,parent,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=true;parent.add(m);return m;};

 // Steering wheel: the column group carries the rake, the wheel group turns.
 const column=new THREE.Group(),wheel=new THREE.Group();column.rotation.x=-.4;column.add(wheel);rig.add(column);
 add(new THREE.TorusGeometry(.15,.0135,10,40),grip,wheel);
 for(const angle of [Math.PI/2+2.2,Math.PI/2-2.2,-Math.PI/2]){const spoke=add(new THREE.BoxGeometry(.13,.022,.01),chrome,wheel,Math.cos(angle)*.08,Math.sin(angle)*.08,-.004);spoke.rotation.z=angle;}
 const hub=add(new THREE.CylinderGeometry(.04,.045,.03,20),black,wheel);hub.rotation.x=Math.PI/2;
 const horn=add(new THREE.CylinderGeometry(.03,.03,.034,20),chrome,wheel);horn.rotation.x=Math.PI/2;
 const gloves=new THREE.Group();wheel.add(gloves);
 for(const side of [-1,1]){
  const angle=Math.PI/2+side*.95,hand=add(new THREE.SphereGeometry(.032,12,10),leather,gloves,Math.cos(angle)*.15,Math.sin(angle)*.15,.006);hand.scale.set(1.15,.95,1.25);
  const thumb=add(new THREE.CapsuleGeometry(.011,.03,4,8),leather,gloves,Math.cos(angle)*.125,Math.sin(angle)*.125+.012,.016);thumb.rotation.z=angle+Math.PI/2;
 }

 // One canvas feeds both the binnacle (left 512 px) and the inclinometer.
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const ctx=canvas.getContext('2d');
 const gaugeTexture=new THREE.CanvasTexture(canvas);gaugeTexture.colorSpace=THREE.SRGBColorSpace;gaugeTexture.anisotropy=4;
 const gaugeMaterial=new THREE.MeshBasicMaterial({map:gaugeTexture,toneMapped:false});
 const region=(geometry,u0,u1)=>{const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,u0+(u1-u0)*uv.getX(i));return geometry;};
 const binnacle=new THREE.Group();binnacle.rotation.x=-.46;rig.add(binnacle);
 add(new THREE.BoxGeometry(.3,.115,.09),black,binnacle,0,-.006,-.05);
 const brow=add(new THREE.BoxGeometry(.315,.014,.12),black,binnacle,0,.056,-.012);brow.castShadow=true;
 add(region(new THREE.PlaneGeometry(.264,.088),0,512/768),gaugeMaterial,binnacle);
 const pod=new THREE.Group();pod.rotation.set(-.3,-.62,0,'YXZ');rig.add(pod);
 add(new THREE.BoxGeometry(.135,.135,.06),black,pod,0,0,-.034);
 add(region(new THREE.PlaneGeometry(.12,.12),512/768,1),gaugeMaterial,pod);

 // Rear-view mirror: a low-resolution second render of the same world.
 const target=new THREE.WebGLRenderTarget(512,144,{depthBuffer:true});
 const mirror=new THREE.Group();mirror.rotation.set(-.05,-.42,0,'YXZ');rig.add(mirror);
 add(new THREE.BoxGeometry(.222,.07,.02),black,mirror,0,0,-.012);
 add(new THREE.CylinderGeometry(.007,.007,.05,8),black,mirror,0,.058,-.012);
 const glass=add(region(new THREE.PlaneGeometry(.208,.058),1,0),new THREE.MeshBasicMaterial({map:target.texture}),mirror);
 const mirrorCamera=new THREE.PerspectiveCamera(20,512/144,.5,2400),back=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);
 let attached=null,lastPaint=-1,painted='',frame=0;

 function paint(r){
  ctx.fillStyle='#161a15';ctx.fillRect(0,0,768,256);
  drawDial(ctx,128,128,112,{value:r.speedKmh,max:160,major:20,minor:10,label:String(Math.round(r.speedKmh)),unit:'km/h'});
  const top=Math.ceil(r.redline/1000)+1;
  drawDial(ctx,384,128,112,{value:r.rpm/1000,max:top,major:1,minor:.5,label:r.gear,unit:'×1000 rpm',redFrom:r.redline/1000});
  ctx.fillStyle='#0d110d';ctx.fillRect(236,196,40,52);ctx.fillStyle='#a7b196';ctx.font='700 13px sans-serif';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText(r.range,256,214);
  ctx.fillStyle=r.nitro>15?'#58c7d8':'#e0523a';ctx.fillRect(240,222,32*Math.max(0,Math.min(1,r.nitro/100)),8);ctx.strokeStyle='#8f8a6c';ctx.lineWidth=1;ctx.strokeRect(240,222,32,8);
  // Inclinometer: rear silhouette shows roll, the side bar shows pitch.
  ctx.save();ctx.translate(640,128);ctx.fillStyle='#0d110d';ctx.beginPath();ctx.arc(0,0,118,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8f8a6c';ctx.lineWidth=5;ctx.stroke();
  ctx.strokeStyle='#f0ead2';ctx.lineWidth=3;for(const deg of [-40,-30,-20,-10,0,10,20,30,40]){const a=-Math.PI/2+deg*Math.PI/180;ctx.beginPath();ctx.moveTo(Math.cos(a)*(deg%20?104:96),Math.sin(a)*(deg%20?104:96));ctx.lineTo(Math.cos(a)*112,Math.sin(a)*112);ctx.stroke();}
  ctx.save();ctx.rotate(-r.roll*Math.PI/180);ctx.fillStyle='#f4cf58';ctx.fillRect(-46,-34,92,40);ctx.fillRect(-34,-62,68,30);ctx.fillStyle='#161a15';ctx.fillRect(-26,-56,52,18);ctx.fillStyle='#262b24';ctx.fillRect(-52,2,22,30);ctx.fillRect(30,2,22,30);
  ctx.strokeStyle='#ff6a3a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-70);ctx.lineTo(0,-108);ctx.stroke();ctx.restore();
  ctx.fillStyle='#f0ead2';ctx.font='800 26px sans-serif';ctx.textAlign='center';ctx.fillText(`${r.roll>=0?'+':''}${Math.round(r.roll)}°  ·  ${r.pitch>=0?'+':''}${Math.round(r.pitch)}°`,0,66);
  ctx.fillStyle='#a7b196';ctx.font='700 17px sans-serif';ctx.fillText('ROLL · PITCH',0,88);ctx.fillStyle='#f4cf58';ctx.font='800 22px sans-serif';ctx.fillText(r.bearing,0,-84);
  ctx.restore();gaugeTexture.needsUpdate=true;
 }

 return {
  rig,mirrorCamera,
  attach(car){
   const cabin=car.cabin??{},roofY=cabin.roofY??2.36,wheelbase=cabin.wheelbase??1;
   car.mesh.add(rig);attached=car;
   column.position.set(-.39,1.83,-.14*wheelbase);binnacle.position.set(-.39,1.94,-.33*wheelbase);
   pod.position.set(.04,1.86,-.34*wheelbase);mirror.position.set(-.03,roofY-.165,-.33*wheelbase);
   // Open trucks already seat a suited driver whose own gloves hold the wheel.
   gloves.visible=!cabin.open;
  },
  get visible(){return rig.visible;},
  setVisible(visible){rig.visible=visible;},
  update(now,reading){
   wheel.rotation.z=reading.steer*STEERING_RATIO;
   const key=[Math.round(reading.speedKmh),Math.round(reading.rpm/40),reading.gear,reading.range,Math.round(reading.nitro/4),Math.round(reading.roll),Math.round(reading.pitch),reading.bearing].join('|');
   if(now-lastPaint<70||key===painted)return;
   lastPaint=now;painted=key;paint(reading);
  },
  // Call after the main frame: reuses this frame's shadow maps.
  renderMirror(renderer,scene,every=2){
   if(!rig.visible||!attached||frame++%every)return false;
   glass.getWorldPosition(mirrorCamera.position);attached.mesh.getWorldQuaternion(mirrorCamera.quaternion).multiply(back);mirrorCamera.updateMatrixWorld();
   const previous=renderer.getRenderTarget(),auto=renderer.shadowMap.autoUpdate;
   rig.visible=false;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(target);renderer.render(scene,mirrorCamera);
   renderer.setRenderTarget(previous);renderer.shadowMap.autoUpdate=auto;rig.visible=true;return true;
  },
 };
}

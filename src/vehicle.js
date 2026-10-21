import * as THREE from 'three';
import {REFERENCE_MODELS,vehicleProfile} from './vehicle-models.js';
import {exhaustLayout} from './exhaust-layout.js';
import {createOffroadWheel} from './wheel.js';
import {isOpenBody,isBiminiBody,rollCageSegments} from './body-types.js';
import {VEHICLE_SCALE,TIRE_RADIUS} from './contact.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {batchRigidMeshes} from './mesh-batching.js';

export const BRONCO_STYLES={
 classic:{name:'HERITAGE · EMERALD',color:'#087a50',roof:'#eee9d9',width:.89,rounded:.055,lights:'round',flares:'#eee9d9'},
 ranger:{name:'RANGER · TANGERINE',color:'#d9581e',roof:'#f0e9d8',width:.96,rounded:.035,lights:'square',flares:'#d9581e'},
 sunset:{name:'SUNSET · MIDNIGHT',color:'#172433',roof:'#172433',width:.96,rounded:.10,lights:'square',flares:'#172433'},
 sky:{name:'SKY · OPEN AIR',color:'#9dbfc9',roof:'#eee9d5',width:.89,rounded:.055,lights:'round',flares:'#eee9d5'},
 crawler:{name:'CRAWLER · OLIVE',color:'#525d32',roof:'#242a21',width:.89,rounded:.055,lights:'round',flares:'#525d32'},
 expedition:{name:'TRAIL · OLIVE',color:'#686c55',roof:'#393e33',width:.89,rounded:.055,lights:'round',flares:'#686c55'},
 copper78:{name:'CLASSIC ’78 · COPPER',color:'#693a24',roof:'#573c2b',width:.99,rounded:.06,lights:'square',flares:'#693a24'},
 godzilla78:{name:'GODZILLA ’78 · 7.3',color:'#182a31',roof:'#182025',width:.99,rounded:.06,lights:'square',flares:'#182a31'},
 ...REFERENCE_MODELS
};

// Original procedural bodies inspired by the supplied classic / two-tone / sunset references.
// Wheelbase, track, lift and tire sizes are shared with the physical vehicle profiles.
export function createBronco(style='classic',number='07'){
 const spec=BRONCO_STYLES[style]??BRONCO_STYLES.classic,later=spec.lights==='square',w=spec.width,open=isOpenBody(style),bimini=isBiminiBody(style),utility=style==='expedition'||style==='crawler'||style==='godzilla78'||spec.bullbar,halfCab=spec.bodyType==='halfCab',softtop=spec.bodyType==='softtop',bullnose=spec.era>=1980,profile=vehicleProfile(style);
 const mesh=new THREE.Group(),chassis=new THREE.Group(),wheels=[],axles=[];mesh.add(chassis);chassis.scale.z=profile.wheelbase;
 const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.55,...extra});
 const body=new THREE.MeshPhysicalMaterial({color:spec.color,metalness:.22,roughness:utility?.72:.38,clearcoat:utility?.12:.45,clearcoatRoughness:.18});
 const rubber=material('#20231e'),trim=material('#292d28'),ivory=material(spec.roof,{roughness:.4});
 const metal=material('#bbc2bc',{metalness:.8,roughness:.25}),flares=material(spec.flares,{metalness:.15,roughness:.4});
 const glass=material('#536f77',{transparent:true,opacity:.39,depthWrite:false,side:THREE.DoubleSide,metalness:.1,roughness:.16});
 const light=material('#fff4d1',{emissive:'#e4d4a5',emissiveIntensity:.24});
 const amber=material('#df7b18',{emissive:'#c05b08',emissiveIntensity:.12}),red=material('#a72e24');
 function part(geometry,mat,x=0,y=0,z=0,parent=chassis){
  const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=mat!==glass;m.receiveShadow=mat!==glass;parent.add(m);return m;
 }
 const box=(a,b,c,mat,x,y,z,parent)=>part(new THREE.BoxGeometry(a,b,c),mat,x,y,z,parent);
 const round=(a,b,c,r,mat,x,y,z)=>part(new RoundedBoxGeometry(a,b,c,3,r),mat,x,y,z);
 function rod(a,b,r,mat){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),d=to.clone().sub(from);const m=part(new THREE.CylinderGeometry(r,r,d.length(),10),mat,...from.clone().add(to).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
 function pane(points,mat=glass){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();const m=part(geometry,mat);if(mat===glass)points.forEach((p,i)=>rod(p,points[(i+1)%points.length],.012,trim));return m;
 }
 const disc=(r,depth,mat,x,y,z)=>{const m=part(new THREE.CylinderGeometry(r,r,depth,32),mat,x,y,z);m.rotation.x=Math.PI/2;return m;};
 // Separate chassis rails, live axles, differential housings and red dampers.
 for(const side of [-1,1])box(.12,.14,2.85,trim,side*.48,.52,.04);
 for(const z of [-.88,.91]){
  const group=new THREE.Group();group.position.set(0,TIRE_RADIUS-profile.lift,z*profile.wheelbase);mesh.add(group);
  const tube=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,2.0,12),trim);tube.rotation.z=Math.PI/2;tube.scale.y=profile.track;tube.castShadow=true;group.add(tube);
  const diff=new THREE.Mesh(new THREE.SphereGeometry(.19,12,8),trim);diff.scale.set(1,.8,1.1);diff.castShadow=true;group.add(diff);
  axles.push({group,indices:z<0?[0,2]:[1,3]});
  for(const side of [-1,1]){rod([side*.69,.6,z],[side*.73,1.02,z+.12],.035,red);rod([side*.61,.55,z],[side*.62,.87,z-.38],.027,metal);}
 }
 box(1.38,.12,2.9,trim,0,.88,.02);box(1.5,.09,1.8,trim,0,1.34,.54);
 // Wheel arches are cut into the sheet metal rather than painted onto a box.
 const panel=new THREE.Shape(),r=.71,angle=Math.asin(.2/r);
 panel.moveTo(1.53,.78);panel.lineTo(1.53,1.49);panel.lineTo(-1.53,1.49);panel.lineTo(-1.53,.78);
 panel.lineTo(-.91-r*Math.cos(angle),.78);panel.absarc(-.91,.58,r,Math.PI-angle,angle,true);
 panel.lineTo(.88-r*Math.cos(angle),.78);panel.absarc(.88,.58,r,Math.PI-angle,angle,true);panel.lineTo(1.53,.78);panel.closePath();
 const geometry=new THREE.ExtrudeGeometry(panel,{depth:.045,bevelEnabled:true,bevelThickness:.018,bevelSize:.025,bevelSegments:3,curveSegments:20});
 for(const side of [-1,1]){
  const flank=part(geometry,body,side>0?w-.03:-w-.015);flank.rotation.y=Math.PI/2;
  for(const z of [-.88,.91]){
   const flare=part(new THREE.TorusGeometry(.745,.045,8,32,Math.PI),flares,side*(w+.025),.58,z);flare.rotation.y=Math.PI/2;
  }
 }
 round(w*2,.14,1.27,.045,body,0,1.55,-.91);
 round(w*1.72,.045,1.02,.025,body,0,1.63,-.92); // raised hood stamping
 box(w*2,.09,.09,body,0,1.59,-.24);
 box(w*2,.24,.10,body,0,1.4,1.5);
 // Hollow cabin: visible seats, rear bench, dashboard and steering wheel.
 const seat=material(spec.seat??(style==='sky'?'#d8ceab':'#3a4036'),{roughness:.94});
 for(const side of [-1,1]){
  round(.52,.15,.48,.06,seat,side*.39,1.43,.04);
  const back=round(.52,.5,.12,.06,seat,side*.39,1.72,.28);back.rotation.x=-.12;
  round(.33,.16,.1,.04,seat,side*.39,2.03,.31);
 }
 if(!halfCab)round(1.4,.37,.23,.05,seat,0,1.67,1.21);
 box(w*1.8,.19,.23,trim,0,1.66,-.32);
 const steering=part(new THREE.TorusGeometry(.14,.015,6,20),trim,-.39,1.82,-.12);steering.rotation.x=-.4;
 rod([-.39,1.65,-.29],[-.39,1.82,-.12],.025,trim);
 // Roof and posts frame real glass openings; the rear cap is narrower at the top.
 const roofY=style==='sunset'?2.29:later?2.33:2.36,front=style==='sunset'?-.29:-.35,back=1.49,rearTop=style==='sunset'?1.31:1.45;
 if(!open&&!bimini)round(w*2+.07,.13,halfCab?.92:1.91,spec.rounded,ivory,0,roofY,halfCab?.06:.59);
 if(halfCab){box(w*2,.16,1.02,trim,0,1.36,.96);box(w*2,.20,.07,body,0,1.61,.49);pane([[-w+.12,1.73,.535],[-w+.12,roofY-.12,.535],[w-.12,roofY-.12,.535],[w-.12,1.73,.535]]);for(const side of [-1,1]){rod([side*(w-.1),1.53,.60],[side*(w-.1),2.18,.60],.045,trim);rod([side*(w-.1),2.18,.60],[side*(w-.1),1.53,1.35],.045,trim);}rod([-(w-.1),2.18,.60],[w-.1,2.18,.60],.045,trim);}
 if(bimini){
  round(w*2+.06,.12,.88,.045,body,0,roofY,-.04);
  const canvasTop=material(style==='copper78'?'#6c5037':'#262b28',{roughness:.98});
  round(w*1.92,.035,1.02,.018,canvasTop,0,roofY-.03,1.00);
  for(const side of [-1,1]){rod([side*w,1.56,1.4],[side*(w-.09),roofY-.07,.53],.025,trim);rod([side*w,1.56,.48],[side*(w-.09),roofY-.07,1.43],.022,trim);}
 }
 if(open){for(const [a,b] of rollCageSegments(style,w))rod(a,b,style==='sky'?.046:.055,ivory);}
 for(const side of [-1,1]){
  const x=side*w,topX=side*(w-.065);
  if(!open){rod([x,1.59,-.54],[topX,roofY-.055,front],.044,body);
  rod([x,1.55,.39],[topX,roofY-.06,.39],.045,ivory);
  if(!halfCab)rod([x,1.54,back],[topX,roofY-.06,rearTop],.058,ivory);
  }
  box(.07,.09,1.92,body,x,1.56,.54);
  if(!open){pane([[x,1.63,-.49],[x,1.63,.32],[topX,roofY-.09,.32],[topX,roofY-.09,front+.06]]);
  if(!bimini&&!halfCab)pane([[x+.006*side,1.63,.47],[x+.006*side,1.63,1.4],[topX,roofY-.10,rearTop-.05],[topX,roofY-.10,.47]]);
  if(!halfCab){rod([x,1.63,.46],[x,1.63,1.41],.022,trim);
  rod([topX,roofY-.09,.45],[topX,roofY-.09,rearTop-.04],.02,trim);}
  }
  // Chrome belt line, door seams, hinges, handles and side markers.
  box(.023,.027,2.97,metal,side*(w+.039),1.44,0);
  box(.016,.52,.015,trim,side*(w+.04),1.12,.36);
  box(.026,.025,.20,metal,side*(w+.058),1.4,.14);
  for(const y of [1.02,1.34])box(.028,.055,.045,metal,side*(w+.045),y,-.36);
  box(.03,.085,.17,amber,side*(w+.04),1.25,-1.32);
  box(.025,.065,.15,red,side*(w+.04),1.2,1.33);
  rod([x,1.56,-.35],[side*(w+.13),1.83,-.31],.015,metal);
  round(.13,.16,.21,.025,metal,side*(w+.14),1.85,-.32);
  // Two-tone lower panels and layered sunset stripes stay above arch openings.
  if(style==='ranger')box(.026,.17,2.97,ivory,side*(w+.04),1.4,0);
  if(style==='sunset'){
   const colors=['#f5b837','#ef8127','#d34422','#962e20'];
   colors.forEach((color,i)=>box(.027,.055,2.99,material(color),side*(w+.043),1.46-i*.058,0));
   colors.slice(0,3).forEach((color,i)=>{const stripe=box(.018,.62,.042,material(color),side*(w+.049),1.92,.37+i*.042);stripe.rotation.x=-.06;});
  }
  if(bimini){
   const colors=style==='copper78'?['#eee0b2','#dd762f','#f2cb79']:['#b89b68','#d2b783','#e5d8ac'];
   colors.forEach((color,i)=>{
    const stripe=material(color),y=1.44-i*.045;
    box(.028,.033,2.99,stripe,side*(w+.045),y,0);
    // Free Wheeling-style rise at the cab's rear edge, above the side belt.
    rod([side*(w+.047),1.49,.40+i*.045],[side*(w-.045),roofY-.07,.40+i*.045],.017,stripe);
    box(.035,.030,.95,stripe,side*(w+.045),1.53-i*.045,1.0);
   });
  }
 }
 pane([[-w+.05,1.65,-.51],[w-.05,1.65,-.51],[w-.105,roofY-.10,front-.015],[-w+.105,roofY-.10,front-.015]]);
 if(!open&&!bimini&&!halfCab)pane([[-w+.07,1.64,1.505],[-w+.12,roofY-.1,rearTop+.01],[w-.12,roofY-.1,rearTop+.01],[w-.07,1.64,1.505]]);
 for(const x of [-.45,.36])rod([x,1.66,-.535],[x+.26,1.69,-.54],.012,trim);
 // Distinct front fascias: early circular lamps versus broad rectangular lamps.
 round(w*2,.55,.12,.06,body,0,1.21,-1.55);
 round(w*2-.09,.43,.07,.035,metal,0,1.22,-1.62);
 box(w*2-.15,.35,.025,rubber,0,1.22,-1.67);
 const grilleWidth=later?1.18:1.04;
 if(bullnose){box(w*2-.12,.47,.04,trim,0,1.23,-1.68);for(const side of [-1,1])box(.32,.37,.035,metal,side*.77,1.24,-1.71);}
 for(let row=0;row<(bullnose?4:later?3:4);row++)box(grilleWidth,.025,.025,metal,0,1.08+row*.085,-1.69);
 for(const x of (bullnose?[-.48,-.24,0,.24,.48]:[-.36,0,.36]))box(.018,.34,.024,metal,x,1.21,-1.70);
 for(const side of [-1,1]){
  const x=side*(later?.75:.66);
  if(later){round(.30,.37,.06,.035,metal,x,1.23,-1.69);round(.225,.27,.035,.02,light,x,1.25,-1.73);box(.24,.075,.035,amber,x,1.035,-1.72);}
  else{disc(.195,.07,metal,x,1.22,-1.69);disc(.153,.035,light,x,1.22,-1.735);box(.17,.08,.035,amber,side*.4,1.23,-1.73);}
 }
 round(w*2+.15,.14,.19,.03,utility?trim:metal,0,.81,-1.59);
 round(w*2+.12,.14,.18,.03,halfCab?trim:metal,0,.81,1.56);
 for(const side of [-1,1]){box(.10,.26,.05,red,side*(w-.09),1.21,1.57);box(.09,.12,.06,ivory,side*(w-.09),1.01,1.58);}
 if(utility){
  box(.42,.21,.15,trim,0,1.01,-1.64);rod([-.66,.88,-1.69],[-.66,1.17,-1.69],.03,trim);rod([.66,.88,-1.69],[.66,1.17,-1.69],.03,trim);rod([-.66,1.17,-1.69],[.66,1.17,-1.69],.03,trim);
 }
 if(bimini){
  const creamStripe=material(style==='copper78'?'#f1d9a6':'#bc9a5c');
  for(const x of [-.15,.15])box(.037,.012,1.12,creamStripe,x,1.665,-.94);
  box(.33,.012,.04,creamStripe,0,1.665,-1.50);
  if(style==='godzilla78'){round(.66,.12,.72,.05,trim,0,1.73,-.87);for(const x of [-.21,-.07,.07,.21])box(.025,.014,.45,metal,x,1.795,-.88);}
  const badgeCanvas=document.createElement('canvas');badgeCanvas.width=256;badgeCanvas.height=64;const badge=badgeCanvas.getContext('2d');badge.fillStyle=style==='copper78'?'#693a24':'#182a31';badge.fillRect(0,0,256,64);badge.fillStyle='#eee0b2';badge.font='bold 27px sans-serif';badge.textAlign='center';badge.fillText(style==='copper78'?'BRONCO® 1978':'7.3 GODZILLA',128,42);
  const badgeMaterial=material('#ffffff',{map:new THREE.CanvasTexture(badgeCanvas)});
  for(const side of [-1,1]){const plate=part(new THREE.PlaneGeometry(.62,.15),badgeMaterial,side*(w+.065),1.34,-.45);plate.rotation.y=side*Math.PI/2;}
 }
 if(open){
  const suit=material(style==='sky'?'#bd643a':'#b49d64'),skin=material('#bd8c65'),helmet=material('#e8dfc7'),visor=material('#273e40',{roughness:.2,metalness:.25});
  const torso=round(.39,.43,.27,.07,suit,-.39,1.76,.09);torso.name='driver-torso';
  part(new THREE.SphereGeometry(.075,10,8),skin,-.39,2.005,.07);
  const head=part(new THREE.SphereGeometry(.145,16,12),helmet,-.39,2.15,.065);head.name='driver-head';
  const shield=part(new THREE.SphereGeometry(.13,16,8,0,Math.PI),visor,-.39,2.16,.045);shield.rotation.y=Math.PI/2;shield.scale.set(1,.48,1);
  for(const side of [-1,1]){
   const shoulder=-.39+side*.19,elbow=-.39+side*.235,hand=-.39+side*.12;
   rod([shoulder,1.91,.04],[elbow,1.73,-.03],.065,suit);rod([elbow,1.73,-.03],[hand,1.82,-.14],.055,suit);
   part(new THREE.SphereGeometry(.06,10,8),trim,hand,1.82,-.14);
   rod([-.39+side*.10,1.51,.06],[-.39+side*.12,1.4,-.24],.085,suit);rod([-.39+side*.12,1.4,-.24],[-.39+side*.12,1.30,-.36],.07,trim);
   rod([-.39+side*.13,1.96,.00],[-.39+side*.045,1.59,-.065],.025,trim);
  }
  box(.09,.065,.025,metal,-.39,1.63,-.065);
  if(style==='crawler'){
   // Snorkel, winch line, recovery hooks and rear fire extinguisher.
   rod([w+.04,1.43,-1.10],[w+.04,2.35,-.46],.065,trim);box(.20,.12,.17,trim,w+.04,2.38,-.46);
   const spool=part(new THREE.CylinderGeometry(.11,.11,.36,14),metal,0,1.04,-1.78);spool.rotation.z=Math.PI/2;
   for(const x of [-.38,.38]){const hook=part(new THREE.TorusGeometry(.07,.025,6,12,Math.PI*1.65),red,x,.84,-1.75);hook.rotation.z=-.4;}
   rod([.4,1.8,1.35],[.7,1.8,1.35],.075,red);box(.06,.14,.07,metal,.75,1.8,1.35);
  }
 }
 if(bullnose){const oval=part(new THREE.SphereGeometry(.075,12,8),material('#2f5375',{metalness:.3}),0,1.23,-1.738);oval.scale.set(1.7,.6,.23);}
 if(spec.twoTone)for(const side of [-1,1]){
  const accent=material(spec.twoTone);box(.035,.29,3.01,accent,side*(w+.045),1.32,0);
  for(const y of [1.16,1.48])box(.038,.021,3.02,metal,side*(w+.05),y,0);
 }
 if(softtop){
  round(w*2+.06,.08,.86,.035,body,0,roofY+.03,.06);
  for(const z of [.48,.85,1.25]){rod([-w,roofY+.07,z],[w,roofY+.07,z],.018,trim);}
  for(const side of [-1,1])box(.025,.035,1.0,ivory,side*(w-.035),1.63,.95);
 }
 if(spec.sunVisor){const visor=box(w*2+.18,.055,.29,body,0,roofY+.03,-.47);visor.rotation.x=-.14;}
 if(spec.rack){
  for(const x of [-w+.06,w-.06]){rod([x,roofY+.07,-.23],[x,roofY+.35,-.23],.026,trim);rod([x,roofY+.07,1.38],[x,roofY+.35,1.38],.026,trim);rod([x,roofY+.35,-.23],[x,roofY+.35,1.38],.027,trim);}
  for(const z of [-.23,.10,.42,.74,1.06,1.38])rod([-w+.06,roofY+.21,z],[w-.06,roofY+.21,z],.023,trim);
  for(const z of [-.23,1.38])rod([-w+.06,roofY+.35,z],[w-.06,roofY+.35,z],.027,trim);
 }
 if(spec.roofLights){for(let i=0;i<spec.roofLights;i++){const x=(i-(spec.roofLights-1)/2)*.4;disc(.11,.09,trim,x,roofY+.18,-.25);disc(.086,.025,light,x,roofY+.18,-.305);}}
 if(spec.bullbar){
  for(const x of [-.72,.72])rod([x,.77,-1.88],[x,1.44,-1.88],.045,metal);
  rod([-.72,1.44,-1.88],[.72,1.44,-1.88],.045,metal);
  for(let i=0;i<(spec.fogLights??2);i++){const x=(i-((spec.fogLights??2)-1)/2)*.3;disc(.10,.1,trim,x,1.25,-1.91);disc(.077,.025,light,x,1.25,-1.98);}
 }
 if(spec.rivets)for(const side of [-1,1])for(const z of [-.88,.91])for(let i=0;i<9;i++){const a=i*Math.PI/8;part(new THREE.SphereGeometry(.015,6,4),metal,side*(w+.075),.58+Math.sin(a)*.745,z+Math.cos(a)*.745);}
 if(profile.lift)for(const side of [-1,1])for(const z of [-.88,.91]){
  rod([side*.69,.6-profile.lift,z],[side*.73,1.02,z+.12],.039,red);
  rod([side*.61,.55-profile.lift,z],[side*.62,.87,z-.38],.028,metal);
  if(spec.coils){const points=Array.from({length:65},(_,i)=>new THREE.Vector3(side*.65+.075*Math.cos(i/64*Math.PI*12),.6-profile.lift+i/64*(.38+profile.lift),z+.075*Math.sin(i/64*Math.PI*12)));part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.018,5,false),red);}
 }
 for(const x of [-1,1])for(const z of [-.88,.91]){
  const pivot=new THREE.Group(),wheel=createOffroadWheel(spec.finish??(style==='crawler'||style==='godzilla78'?'bronze':'silver'),profile.wheelScale>1.3?1.15/profile.wheelScale:1);wheel.scale.set(profile.wheelWidth,profile.wheelScale,profile.wheelScale);pivot.position.set(x*profile.track,TIRE_RADIUS-profile.lift,z*profile.wheelbase);pivot.add(wheel);mesh.add(pivot);wheels.push({pivot,spin:wheel,x:x*profile.track,z:z*profile.wheelbase});
 }
 const spare=createOffroadWheel(spec.finish??(style==='crawler'?'bronze':'silver'),profile.wheelScale>1.3?1.15/profile.wheelScale:1);spare.rotation.y=Math.PI/2;spare.scale.setScalar(.86*Math.min(1.25,profile.wheelScale));spare.position.set(.15,1.42,1.59);if(!halfCab)chassis.add(spare);
 // Small rally numbers leave the reference paint and roof silhouette visible.
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#ebe7d8';ctx.fillRect(0,0,128,128);ctx.fillStyle='#263024';ctx.font='900 80px sans-serif';ctx.textAlign='center';ctx.fillText(number,64,94);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const numberMaterial=material('#ffffff',{map:texture});
 const roof=part(new THREE.PlaneGeometry(.6,.55),numberMaterial,0,open?1.657:roofY+.067,open?-.92:halfCab?.06:.64);roof.rotation.x=-Math.PI/2;
 for(const side of [-1,1]){const decal=part(new THREE.PlaneGeometry(.34,.24),numberMaterial,side*(w+.066),1.13,.02);decal.rotation.y=side*Math.PI/2;}
 const exhausts=exhaustLayout(style,w).map(({from,tip,direction})=>{
  rod(from,tip,.063,metal);
  const outlet=new THREE.Object3D();outlet.name='exhaust-outlet';outlet.position.fromArray(tip);outlet.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...direction));chassis.add(outlet);
  const hole=part(new THREE.CircleGeometry(.047,12),trim,...tip);hole.quaternion.copy(outlet.quaternion);hole.position.addScaledVector(new THREE.Vector3(...direction),.006);
  return outlet;
 });
 batchRigidMeshes(chassis);
 for(const axle of axles)batchRigidMeshes(axle.group);
 mesh.scale.setScalar(VEHICLE_SCALE);mesh.userData.style=style;
 return {mesh,chassis,body,wheels,axles,exhausts,dispose(){
  const geometries=new Set(),materials=new Set(),textures=new Set([texture]);mesh.traverse(o=>{if(o.userData.sharedWheel)return;if(o.geometry)geometries.add(o.geometry);if(o.material){materials.add(o.material);if(o.material.map)textures.add(o.material.map);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
 }};
}

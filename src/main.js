import * as THREE from 'three';
import {createDesertReflections} from './lighting.js';
import './style.css';
import {VEHICLE_SCALE} from './contact.js';
import {createScenery} from './scenery.js';
import {createBronco} from './vehicle.js';
import {followCameraStep} from './view.js';
import {createMinimap} from './minimap.js';
import {TRACKS,TRACK_VARIANTS,ROAD_WIDTH,createCircuit,terrainHeight,nearestPoint,opponentInput} from './tracks.js';
import {ENGINES,engineById,defaultEngine} from './engines.js';
import {resetPowertrain} from './powertrain.js';
import {createHistoryPanel} from './history-panel.js';
import {EngineAudio} from './engine-audio.js';
import {clamp,angleDelta,advanceProgress,formatTime} from './race.js';
import {buildTerrain} from './terrain.js';
import {initPhysics,createPhysics,CHASSIS_HEIGHT} from './physics.js';

async function boot(){
await initPhysics();
const $=s=>document.querySelector(s),canvas=$('#scene'),game=$('#game'),menuDialog=$('#game-menu');
canvas.tabIndex=0;
const minimap=createMinimap($('#minimap'));
let cameraState={x:0,z:0,span:20};
const viewCorners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>new THREE.Vector3(x,y,-1)),viewDirection=new THREE.Vector3();
const scene=new THREE.Scene();scene.background=new THREE.Color('#a99a70');scene.fog=new THREE.Fog('#a99a70',105,210);
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){$('#message p').textContent='WebGL is required. Please enable hardware acceleration and reload.';$('#start').disabled=true;throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor('#a99a70');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const reflections=createDesertReflections(renderer);scene.environment=reflections.texture;scene.environmentIntensity=.65;
const camera=new THREE.OrthographicCamera(-50,50,35,-35,.1,250);camera.position.set(12,88,62);camera.lookAt(0,0,0);
scene.add(new THREE.HemisphereLight('#fff4d6','#69653e',2.6));const sun=new THREE.DirectionalLight('#fff0cb',3.2);sun.position.set(-30,55,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:180});sun.shadow.normalBias=.04;scene.add(sun,sun.target);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,...extra});
const textureCanvas=document.createElement('canvas');textureCanvas.width=256;textureCanvas.height=256;const textureContext=textureCanvas.getContext('2d');textureContext.fillStyle='#a8784c';textureContext.fillRect(0,0,256,256);for(let i=0;i<18000;i++){textureContext.fillStyle=Math.random()>.5?'#93683b':'#be8d59';textureContext.globalAlpha=.25+Math.random()*.3;textureContext.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*2,1+Math.random()*2);}const dirtTexture=new THREE.CanvasTexture(textureCanvas);dirtTexture.wrapS=dirtTexture.wrapT=THREE.RepeatWrapping;dirtTexture.colorSpace=THREE.SRGBColorSpace;
const sand=mat('#b59b65'),dirt=mat('#c8a06f',{map:dirtTexture,side:THREE.DoubleSide}),dark=mat('#252b24'),cream=mat('#e8d7a1'),green=mat('#58633b');
let world=new THREE.Group();scene.add(world);const trucks=[],particles=[];let samples=[],curve,trackIndex=0,trackVariant=0,heightAt=()=>0,scenery,physics;
const N=3600,roadWidth=ROAD_WIDTH;
function box(w,h,d,material,x=0,y=0,z=0,parent=world){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cylinder(r,h,material,x,y,z,parent=world,segments=10){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
let seed=42;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function nearest(x,z){return nearestPoint(samples,x,z);}
function terrain(i){return terrainHeight(i/N,trackIndex,0,trackVariant);}
function ribbon(offset,width,material,y=0){const positions=[],normals=[],uv=[],indices=[];for(let i=0;i<=N;i++){const j=i%N,p=samples[j],t=curve.getTangentAt(j/N),normal=new THREE.Vector3(-t.z,0,t.x);for(let side=0;side<2;side++){const q=p.clone().addScaledVector(normal,offset+(side-.5)*width);positions.push(q.x,heightAt(q.x,q.z)+y,q.z);normals.push(0,1,0);uv.push(i/20,side);}if(i<N){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,material);mesh.castShadow=material===dirt;mesh.receiveShadow=true;world.add(mesh);}

function sign(text,x,z,rotation=0){const c=document.createElement('canvas');c.width=512;c.height=100;const ctx=c.getContext('2d');ctx.fillStyle='#273321';ctx.fillRect(0,0,512,100);ctx.fillStyle='#f5d363';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,68);const m=box(12,2.3,.22,new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(c)}),x,heightAt(x,z)+2.7,z);m.rotation.y=rotation;for(const dx of [-5,5])box(.2,2,.2,dark,x+Math.cos(rotation)*dx,heightAt(x,z)+1,z-Math.sin(rotation)*dx);}
function makeWorld(){
 physics?.dispose();
 const geometries=new Set(),materials=new Set();for(const child of [...world.children]){world.remove(child);child.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});}geometries.forEach(g=>g.dispose());materials.forEach(m=>{if(![sand,dirt,dark,cream,green].includes(m))m.dispose();});seed=42+trackIndex;
 curve=createCircuit(trackIndex,trackVariant);samples=Array.from({length:N},(_,i)=>curve.getPointAt(i/N));
 const terrainMesh=buildTerrain(samples,curve,trackIndex);heightAt=terrainMesh.heightAt;
 const bounds=new THREE.Box3().setFromPoints(samples),pitZ=bounds.max.z+roadWidth+8,standZ=bounds.min.z-roadWidth-7;
 physics=createPhysics(terrainMesh,bounds);
 box(bounds.max.x-bounds.min.x+160,.7,bounds.max.z-bounds.min.z+160,sand,(bounds.min.x+bounds.max.x)/2,-.6,(bounds.min.z+bounds.max.z)/2);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(terrainMesh.positions,3));geometry.setAttribute('uv',new THREE.BufferAttribute(terrainMesh.uv,2));geometry.setIndex(new THREE.BufferAttribute(terrainMesh.indices,1));geometry.computeVertexNormals();
 const surface=new THREE.Mesh(geometry,dirt);surface.receiveShadow=true;surface.castShadow=true;world.add(surface);
 ribbon(-3.7,.12,mat('#c29a63',{polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),.025);ribbon(3.7,.12,mat('#c29a63',{polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),.025);
 // Conforming painted cross-strips stay flush even on banked, split landings.
 const rampPaint=mat('#e4bb5c',{side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 function stripe(progress,color=rampPaint){
  const vertices=[],indices=[],segments=28,ds=.11/curve.getLength();
  for(const d of [-ds,ds]){const t=((progress+d)%1+1)%1,p=curve.getPointAt(t),tangent=curve.getTangentAt(t);
   for(let k=0;k<=segments;k++){const lateral=(k/segments-.5)*roadWidth*1.8,x=p.x-tangent.z*lateral,z=p.z+tangent.x*lateral;vertices.push(x,heightAt(x,z)+.035,z);}}
  for(let k=0;k<segments;k++)indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();world.add(new THREE.Mesh(g,color));
 }
 for(const f of TRACKS[trackIndex].features){
  if(f.kind==='canyon'){
   for(const d of [4,9,14,19])stripe(f.start+d/curve.getLength());
   for(const d of [f.runup+f.gap+2,f.runup+f.gap+8,f.runup+f.gap+16])stripe(f.start+d/curve.getLength());
   const t=f.start-12/curve.getLength(),p=curve.getPointAt(t),a=curve.getTangentAt(t);sign('JUMP · PICK A SIDE',p.x-a.z*(roadWidth+8),p.z+a.x*(roadWidth+8),Math.atan2(-a.x,-a.z));
  }else for(let k=0;k<(f.count??2);k++)stripe(f.start+(k+.5)/(f.count??2)*f.length);
 }
 scenery=createScenery({world,samples,curve,roadWidth,terrain:(i,side)=>terrainHeight(i/N,trackIndex,side,trackVariant),heightAt,addBarrier:(...args)=>physics.addBarrier(...args),nearest,bounds,random:rand});
 // Grandstands, pit garages and warm desert details.
 for(let row=0;row<4;row++){box(26,.6,1.6,mat(row%2?'#69715b':'#827d61'),-3,1+row*.65,standZ-row*1.3);for(let j=0;j<34;j++){const x=-15+j*.75;const colors=['#d6b663','#8b5540','#ece2ba','#394e48'];box(.33,.65,.35,mat(colors[Math.floor(rand()*4)]),x,1.7+row*.65,standZ-row*1.3);}}
 for(let i=0;i<3;i++){box(8,3,5,mat('#beb191'),-20+i*10,1.5,pitZ);box(8.7,.22,6,mat(['#a75f3c','#73816b','#b69a4c'][i]),-20+i*10,3.1,pitZ);box(4.8,2.4,.1,dark,-20+i*10,1.2,pitZ-2.56);}
 sign('DUST RUNNER',-1,standZ+4);sign('GOOD TIMES. FULL THROTTLE.',0,pitZ-5,Math.PI);
 // Checkered start strip follows the track's tangent.
 const p=samples[0],t=curve.getTangentAt(0),a=Math.atan2(t.z,t.x);for(let col=0;col<12;col++)for(let row=0;row<2;row++){const along=(row-.5)*.65,side=(col-5.5)*(roadWidth*2/12);const tile=box(.65,.04,roadWidth*2/12,(row+col)%2?cream:dark,p.x+Math.cos(a)*along-Math.sin(a)*side,heightAt(p.x+Math.cos(a)*along-Math.sin(a)*side,p.z+Math.sin(a)*along+Math.cos(a)*side)+.055,p.z+Math.sin(a)*along+Math.cos(a)*side);tile.rotation.y=-a;}
 for(const side of [-1,1]){const q=p.clone().add(new THREE.Vector3(-t.z,0,t.x).multiplyScalar(side*(roadWidth+1.1)));box(.25,7,.25,dark,q.x,heightAt(q.x,q.z)+3.5,q.z);}
 const beam=box(.35,.5,(roadWidth+1.1)*2,cream,p.x,heightAt(p.x,p.z)+7,p.z);beam.rotation.y=-a;
 for(let k=0;k<16;k++){const x=(rand()-.5)*150,z=bounds.min.z-roadWidth-30-rand()*15;const hill=new THREE.Mesh(new THREE.ConeGeometry(8+rand()*12,6+rand()*13,5),mat('#a9976c'));hill.position.set(x,1,z);world.add(hill);}
 minimap.setTrack(samples,roadWidth,TRACKS[trackIndex].features,curve.getLength());
}
function makeTruck(style,num){
 const {mesh,chassis,body,wheels,axles,dispose}=createBronco(style,num);scene.add(mesh);
 return {mesh,chassis,body,wheels,axles,dispose,number:num,style,engineId:defaultEngine(style),x:0,z:0,vx:0,vz:0,heading:0,speed:0,index:0,checkpoint:0,lap:0,height:0,vertical:0,nitro:100,boosting:false,finish:false};
}
makeWorld();['classic','ranger','sunset','expedition'].forEach((c,i)=>trucks.push(makeTruck(c,['07','12','28','03'][i])));
const keys=new Set();let phase='ready',previousPhase='racing',elapsed=0,count=0,selectedColor='#087a50',cash=0,levels={engine:0,grip:0},lastTime=0,muted=true,volume=.55,audioPreviewTime=0;
const engineAudio=new EngineAudio();
try{const save=JSON.parse(localStorage.getItem('dust-runner-save'));if(save){if(ENGINES.some(e=>e.id===save.engineId))trucks[0].engineId=save.engineId;if(Number.isFinite(save.volume))volume=clamp(save.volume,0,1);cash=Math.max(0,Number(save.cash)||0);levels.engine=clamp(Number(save.engine)||0,0,3);levels.grip=clamp(Number(save.grip)||0,0,3);}}catch{}
function save(){try{localStorage.setItem('dust-runner-save',JSON.stringify({cash,...levels,engineId:trucks[0].engineId,volume}));}catch{}updateGarage();}
function updateGarage(){$('#cash').textContent=cash;for(const type of ['engine','grip']){$(`#${type}-level`).textContent=levels[type];const b=$(`[data-upgrade="${type}"]`);b.disabled=levels[type]>=3;b.title=levels[type]>=3?'Fully upgraded':'Buy upgrade for $300';}}
updateGarage();
function reset(){elapsed=0;count=0;phase='ready';$('#race-status').textContent='FREE PRACTICE';$('#countdown').textContent='';$('#pause').textContent='Ⅱ';$('#message').style.display='block';$('#message').innerHTML='<span>DUST RUNNER</span><strong>'+TRACKS[trackIndex].name+'</strong><p>Three laps · '+(curve.getLength()/1000).toFixed(2)+' km per lap · Split landing ahead.</p><button id="start">RACE <span>↗</span></button><button class="setup-link" id="open-setup">TRUCK · TRACK · PIT STOP</button><small>ENTER TO RACE · WASD / ARROWS TO DRIVE</small>';$('#start').onclick=start;$('#open-setup').onclick=openMenu;updateMenu();
 trucks.forEach((c,i)=>{const j=N-20-(i>1?25:0),p=samples[j],t=curve.getTangentAt(j/N),side=(i%2?1:-1)*2.1*curve.lateralSign;Object.assign(c,{x:p.x-t.z*side,z:p.z+t.x*side,vx:0,vz:0,heading:Math.atan2(-t.x,-t.z),speed:0,index:j,checkpoint:-1,lap:0,height:terrain(j),vertical:0,airborne:false,lastGround:terrain(j),suspension:0,suspensionVelocity:0,rampRiseVelocity:0,collisionYaw:0,nitro:100,boosting:false,finish:false});c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.set(0,c.heading,0);c.wheels.forEach(w=>{w.previousRotation=undefined;w.previousX=undefined;w.previousHeading=undefined;w.angle=0;w.steer=0;w.angularVelocity=0;});c.stuckTime=0;c.lane=(i%2?3.5:-3.5)*curve.lateralSign;resetPowertrain(c);physics.reset(c);poseTruck(c,0,true);});
 for(const p of particles){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();}particles.length=0;updateCamera(0,true);}
function start(){if(phase==='racing'||phase==='countdown')return;audioPreviewTime=0;reset();phase='countdown';count=3.4;$('#message').style.display='none';$('#race-status').textContent='GET READY';canvas.focus({preventScroll:true});initAudio();}
function pause(){if(!['racing','countdown','paused'].includes(phase))return;if(phase==='paused'){phase=previousPhase;$('#countdown').textContent='';$('#pause').textContent='Ⅱ';}else{previousPhase=phase;phase='paused';$('#countdown').textContent='PAUSED';$('#pause').textContent='▶';engineAudio.silence();}keys.clear();canvas.focus({preventScroll:true});}
let menuPaused=false;
function updateMenu(){$('#menu-play').textContent=phase==='paused'?'RESUME RACE ↗':'START RACE ↗';$('#engine-select').disabled=['racing','countdown','paused'].includes(phase);}
function openMenu(){if(menuDialog.open)return;menuPaused=phase==='racing'||phase==='countdown';if(menuPaused)pause();keys.clear();updateMenu();menuDialog.showModal();}
function closeMenu(){menuDialog.close();if(menuPaused&&phase==='paused')pause();menuPaused=false;canvas.focus({preventScroll:true});}
$('#menu').onclick=openMenu;$('#menu-close').onclick=closeMenu;
$('#menu-play').onclick=()=>{closeMenu();if(['ready','finished'].includes(phase))start();else if(phase==='paused')pause();};
menuDialog.addEventListener('cancel',event=>{event.preventDefault();closeMenu();});
menuDialog.addEventListener('keydown',event=>{event.stopPropagation();if(event.code==='Escape'){event.preventDefault();closeMenu();}});
function updateSoundLabels(){
 $('#sound').innerHTML=`SOUND ${muted?'OFF':'ON'} <span>◖))</span>`;
 $('#quick-sound').textContent=muted?'♪ OFF':'♪ ON';$('#quick-sound').setAttribute('aria-pressed',String(!muted));
}
async function initAudio(){
 if(muted)return;
 $('#audio-status').textContent='Loading engine recordings…';
 try{await engineAudio.init();$('#audio-status').textContent='Recordings ready · RPM and load drive the sound.';}
 catch{$('#audio-status').textContent='Audio could not load. Toggle sound to retry.';muted=true;updateSoundLabels();}
}
async function toggleSound(){muted=!muted;audioPreviewTime=0;updateSoundLabels();if(!muted)await initAudio();}
$('#sound').onclick=toggleSound;$('#quick-sound').onclick=()=>{toggleSound();if(['racing','countdown'].includes(phase))canvas.focus({preventScroll:true});};
$('#engine-volume').value=Math.round(volume*100);
$('#engine-volume').oninput=e=>{volume=Number(e.target.value)/100;save();};
const engineSelect=$('#engine-select');
engineSelect.innerHTML=[...new Set(ENGINES.map(e=>e.group))].map(group=>`<optgroup label="${group}">${ENGINES.filter(e=>e.group===group).map(e=>`<option value="${e.id}">${e.name}</option>`).join('')}</optgroup>`).join('');
function updateEngineMenu(){
 const e=engineById(trucks[0].engineId);engineSelect.value=e.id;
 const peak=Math.max(...e.curve.map(p=>p[1]));
 $('#engine-character').textContent=e.character;
 $('#engine-spec').textContent=`${e.cylinders} CYL · ${e.idle}–${e.redline} RPM · ${peak} N·m peak tune`;
 const points=e.curve.map(([rpm,torque])=>`${10+(rpm-e.idle)/(e.redline-e.idle)*280},${70-torque/450*58}`).join(' ');
 $('#torque-line').setAttribute('points',points);$('#torque-chart').setAttribute('aria-label',`${e.name}: modeled torque curve, ${peak} newton meters peak`);
}
engineSelect.onchange=()=>{
 if(['racing','countdown','paused'].includes(phase)){updateEngineMenu();return;}
 trucks[0].engineId=engineSelect.value;resetPowertrain(trucks[0]);audioPreviewTime=0;updateEngineMenu();save();
};
$('#engine-preview').onclick=async()=>{muted=false;updateSoundLabels();await initAudio();if(!muted)audioPreviewTime=3.4;};
updateEngineMenu();updateSoundLabels();
const historyPanel=createHistoryPanel({getPlayer:()=>trucks[0],canFit:()=>!['racing','countdown','paused'].includes(phase),fitEngine:id=>{engineSelect.value=id;engineSelect.onchange();}});
$('#open-history').onclick=()=>{audioPreviewTime=0;engineAudio.silence();historyPanel.open();};
function updateEngineSound(dt){
 const e=engineById(trucks[0].engineId);let state=trucks[0].powertrain,preview=audioPreviewTime>0&&!['racing','countdown'].includes(phase);
 if(preview){audioPreviewTime=Math.max(0,audioPreviewTime-dt);const t=1-audioPreviewTime/3.4;state={rpm:e.idle+(e.redline-e.idle)*Math.sin(t*Math.PI)*.9,load:t<.62?.85:.1};}
 const enabled=!muted&&!document.hidden&&document.hasFocus()&&(preview||(!menuDialog.open&&phase!=='paused'));
 engineAudio.update(e,state,{enabled,volume});
}
$('#recover-touch').onclick=()=>recover(trucks[0]);
$('#pause').onclick=pause;$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#app').requestFullscreen();}catch{$('#garage-note').textContent='Fullscreen is unavailable in this browser.';}};
document.addEventListener('fullscreenchange',()=>{$('#fullscreen').textContent=document.fullscreenElement?'⊡':'⛶';$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Fullscreen game');});
document.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>{
 const player=trucks[0];scene.remove(player.mesh);player.dispose();
 const model=createBronco(b.dataset.model,player.number);Object.assign(player,model,{style:b.dataset.model});scene.add(player.mesh);
 selectedColor=b.dataset.color;poseTruck(player,0);
 document.querySelectorAll('[data-model]').forEach(el=>{el.classList.toggle('selected',el===b);el.querySelector('b').textContent=el===b?'SELECTED ↗':'SELECT ↗';});
});
function rebuildTrack(){
 keys.clear();makeWorld();resize();reset();
 $('#track-name').textContent=`0${trackIndex+1} — ${TRACKS[trackIndex].name}${trackVariant?' · '+TRACK_VARIANTS[trackVariant].name:''}`;
 $('#track-variant-status').textContent=TRACK_VARIANTS[trackVariant].name+' · VARIANT '+(trackVariant+1)+' / 4';
 document.querySelectorAll('[data-reflection]').forEach(b=>{const active=Boolean(trackVariant&Number(b.dataset.reflection));b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>{trackIndex=Number(b.dataset.track);document.querySelectorAll('[data-track]').forEach(el=>el.classList.toggle('active',el===b));rebuildTrack();});
document.querySelectorAll('[data-reflection]').forEach(b=>b.onclick=()=>{trackVariant^=Number(b.dataset.reflection);rebuildTrack();});
document.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{const type=b.dataset.upgrade;if(phase==='racing'||phase==='countdown'||phase==='paused'){$('#garage-note').textContent='Upgrades are available between races.';return;}if(cash<300){$('#garage-note').textContent='You need $300. Finish a race to earn more cash.';return;}if(levels[type]<3){cash-=300;levels[type]++;save();$('#garage-note').textContent=`${type==='engine'?'Engine':'Tires'} upgraded to level ${levels[type]}. Ready for the next race.`;}});
// During a race, Space belongs to nitro even when a HUD button has focus.
window.addEventListener('keydown',e=>{if(menuDialog.open)return;if(e.target instanceof HTMLButtonElement&&e.code==='Space'&&!['racing','countdown','paused'].includes(phase))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.repeat)return;keys.add(e.code);if(e.code==='Enter'&&['ready','finished'].includes(phase))start();if(e.code==='KeyP'||e.code==='Escape')pause();if(e.code==='KeyR')reset();if(e.code==='KeyF')recover(trucks[0]);});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{audioPreviewTime=0;engineAudio.silence();keys.clear();if(phase==='racing'||phase==='countdown')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){audioPreviewTime=0;engineAudio.silence();}});
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key);});
function dust(c){if(particles.length>130||Math.random()>.48)return;const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.2+Math.random()*.3,0),new THREE.MeshBasicMaterial({color:c.boosting?'#ead38f':'#c5a477',transparent:true,opacity:.45,depthWrite:false}));mesh.position.set(c.x+Math.sin(c.heading)*2,heightAt(c.x,c.z)+.3,c.z+Math.cos(c.heading)*2);scene.add(mesh);particles.push({mesh,life:.6+Math.random()*.5,vx:(Math.random()-.5)*3,vz:(Math.random()-.5)*3});}
function finish(){phase='finished';trucks[0].finish=true;const rank=ranking().indexOf(trucks[0])+1,reward=[900,600,400,300][rank-1];cash+=reward;save();$('#race-status').textContent='RACE COMPLETE';$('#message').style.display='block';$('#message').innerHTML=`<span>THE DUST HAS SETTLED</span><strong>${['FIRST PLACE!','SECOND PLACE','THIRD PLACE','KEEP ON TRUCKIN’'][rank-1]}</strong><p>${formatTime(elapsed)} · $${reward} earned · Visit the pit stop for upgrades.</p><button id="start">RACE AGAIN <span>↗</span></button><button class="setup-link" id="open-setup">PIT STOP · UPGRADES</button><small>OR PRESS ENTER</small>`;$('#start').onclick=start;$('#open-setup').onclick=openMenu;$('#garage-note').textContent=`$${reward} earned. Upgrade your truck and get back out there.`;}
function ranking(){return [...trucks].sort((a,b)=>(b.lap*N+b.index+(b.checkpoint>=0?N:0))-(a.lap*N+a.index+(a.checkpoint>=0?N:0)));}
const bodyOffset=new THREE.Vector3();
function poseTruck(c,dt,snap=false){
 if(!c.physics)return;
 const {body,controller}=c.physics;
 c.mesh.quaternion.copy(body.rotation());bodyOffset.set(0,-CHASSIS_HEIGHT,0).applyQuaternion(c.mesh.quaternion);
 const p=body.translation();c.mesh.position.set(p.x+bodyOffset.x,p.y+bodyOffset.y,p.z+bodyOffset.z);
 c.chassis.rotation.set(0,0,0);c.chassis.position.y=0;
 c.wheels.forEach((w,i)=>{
  const length=controller.wheelSuspensionLength(i)??.55;
  w.pivot.position.y=(CHASSIS_HEIGHT-.15-length)/VEHICLE_SCALE;
  w.pivot.rotation.y=controller.wheelSteering(i)??0;
  const raw=controller.wheelRotation(i)??0;
  if(dt>0){
   if(controller.wheelIsInContact(i)&&w.previousRotation!==undefined)w.angularVelocity=(raw-w.previousRotation)/dt;
   else w.angularVelocity=(w.angularVelocity??0)*Math.exp(-dt*.12);
   w.angle=(w.angle??0)+(w.angularVelocity??0)*dt;
  }
  w.previousRotation=raw;w.spin.rotation.x=w.angle??0;
 });
 // Each live axle follows the two wheel hubs, including its differential.
 c.axles?.forEach(axle=>{
  const left=c.wheels[axle.indices[0]].pivot.position,right=c.wheels[axle.indices[1]].pivot.position;
  axle.group.position.y=(left.y+right.y)/2;
  axle.group.rotation.z=Math.atan2(right.y-left.y,right.x-left.x);
  for(const index of axle.indices)c.wheels[index].pivot.rotation.z=axle.group.rotation.z;
 });
}
function recover(c,advance=0){
 const near=nearest(c.x,c.z),index=(near.index+Math.round(advance*N/curve.getLength()))%N,t=curve.getTangentAt(index/N),p=samples[index];
 c.x=p.x-t.z*(c.lane??-3.5);c.z=p.z+t.x*(c.lane??-3.5);c.heading=Math.atan2(-t.x,-t.z);c.speed=0;
 physics.reset(c);physics.sync(c,0);poseTruck(c,0,true);
}
function step(dt){if(phase==='countdown'){count-=dt;$('#countdown').textContent=count>.4?Math.ceil(count-.4):'GO!';if(count<=0){phase='racing';$('#countdown').textContent='';$('#race-status').textContent='RACE IN PROGRESS';}}if(phase==='racing'){
 elapsed+=dt;
 // Two 120 Hz physics steps per gameplay tick keep fast ramp contacts stable.
 for(let substep=0;substep<2;substep++){
  trucks.forEach((c,i)=>{
   const near=nearest(c.x,c.z),onDirt=near.distance<roadWidth;
   let throttle=0,steer=0,brake=false,boost=false;
   if(i===0){throttle=keys.has('ArrowUp')||keys.has('KeyW')?1:0;brake=keys.has('ArrowDown')||keys.has('KeyS');steer=.2*((keys.has('ArrowLeft')||keys.has('KeyA')?1:0)-(keys.has('ArrowRight')||keys.has('KeyD')?1:0));boost=keys.has('Space')&&c.nitro>0&&throttle>0;}
   else ({throttle,steer,brake,boost}=opponentInput(c,near,curve,samples));
   boost=boost&&!c.airborne&&!brake&&!c.rollover;c.boosting=boost;
   c.nitro=clamp(c.nitro+(boost?-32:7)*dt/2,0,100);
   physics.input(c,{throttle,steer,brake,boost,onDirt,engine:i===0?levels.engine:0,tires:i===0?levels.grip:0,ai:i!==0},dt/2);
  });
  physics.step();trucks.forEach(c=>physics.sync(c,dt/2));
 }
 trucks.forEach((c,i)=>{
  const next=nearest(c.x,c.z).index;
  if(c.checkpoint===-1){if(c.index>N*.75&&next<N*.25)c.checkpoint=0;}else{const p=advanceProgress(c.index,next,c.checkpoint,c.lap,N);c.checkpoint=p.checkpoint;c.lap=p.lap;}
  c.index=next;if(!c.airborne&&Math.abs(c.speed)>5)dust(c);
  c.stuckTime=Math.abs(c.speed)<1?(c.stuckTime??0)+dt:0;
  if(i>0&&(c.rolloverTime>3||nearest(c.x,c.z).distance>roadWidth+12||c.stuckTime>6)){recover(c,c.stuckTime>6?6:0);c.stuckTime=0;}
  poseTruck(c,dt);
 });
 $('#race-status').textContent=trucks[0].rollover?'ROLLOVER · F TO RECOVER':trucks[0].airborne?'AIRBORNE':'RACE IN PROGRESS';
 if(trucks[0].lap>=3)finish();
 }
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];if(phase!=='paused'){p.life-=dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.z+=p.vz*dt;p.mesh.position.y+=dt*.6;p.mesh.scale.multiplyScalar(1+dt*.7);p.mesh.material.opacity=Math.max(0,p.life*.35);}if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);}}
 const c=trucks[0];if(import.meta.env.DEV)canvas.dataset.physics=JSON.stringify({x:c.x,z:c.z,index:c.index,heading:c.heading,airborne:c.airborne,height:c.height,rollover:c.rollover,suspension:c.suspensionLengths,rpm:c.powertrain?.rpm,gear:c.powertrain?.gear,load:c.powertrain?.load,grade:c.powertrain?.grade,mass:c.physics.body.mass(),centerOfMass:c.physics.body.localCom(),noseUpDegrees:Math.asin(clamp(2*(c.mesh.quaternion.w*c.mesh.quaternion.x-c.mesh.quaternion.y*c.mesh.quaternion.z),-1,1))*180/Math.PI,brakePressure:c.physics.controls.brakePressure});
 $('#speed').textContent=Math.round(Math.abs(c.speed)*3.6);$('#time').textContent=formatTime(elapsed);$('#lap').innerHTML=`${String(Math.min(c.lap+1,3)).padStart(2,'0')}<small> / 03</small>`;$('#position').innerHTML=`${String(ranking().indexOf(c)+1).padStart(2,'0')}<small> / 04</small>`;$('#nitro-text').textContent=Math.round(c.nitro)+'%';$('#nitro-fill').style.width=c.nitro+'%';const drivetrain=c.powertrain;$('#rpm').textContent=Math.round(drivetrain?.rpm??engineById(c.engineId).idle);$('#gear').textContent=drivetrain?.gear<0?'R':`D${drivetrain?.gear??1}`;
}
function updateCamera(dt,snap=false){
 const player=trucks[0];if(!player||(!snap&&phase==='paused'))return;
 const w=game.clientWidth,h=game.clientHeight;if(!w||!h)return;
 const look=Math.round(12/(curve.getLength()/N));
 const now=curve.getTangentAt(player.index/N),ahead=curve.getTangentAt(((player.index+look)%N)/N);
 const bend=Math.abs(angleDelta(Math.atan2(ahead.x,ahead.z),Math.atan2(now.x,now.z)));
 const previousY=cameraState.y;cameraState=followCameraStep(cameraState,{...player,bend},{width:w,height:h},dt,snap);
 cameraState.y=previousY;const {x,z,span}=cameraState,aspect=w/h;
 camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;
 const targetY=heightAt(player.x,player.z)+Math.max(0,player.height-heightAt(player.x,player.z))*.35;
 cameraState.y=(cameraState.y??targetY)+(targetY-(cameraState.y??targetY))*(snap?1:1-Math.exp(-dt*3));
 camera.position.set(x,78+cameraState.y,z+70);camera.lookAt(x,cameraState.y,z);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 camera.getWorldDirection(viewDirection);
 const ndc=[[-1,-1],[1,-1],[1,1],[-1,1]];
 viewCorners.forEach((point,i)=>{point.set(ndc[i][0],ndc[i][1],-1).unproject(camera);point.addScaledVector(viewDirection,-point.y/viewDirection.y);});
 // Keep shadow coverage around the visible race, with stable, snapped light motion.
 const sx=Math.round(x*20)/20,sz=Math.round(z*20)/20;
 sun.target.position.set(sx,0,sz);sun.position.set(sx-30,55,sz+20);
}
function resize(){
 const w=game.clientWidth,h=game.clientHeight;if(!w||!h)return;
 renderer.setSize(w,h,false);minimap.resize();updateCamera(0,true);
}
new ResizeObserver(resize).observe(game);reset();resize();let accumulator=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;accumulator+=dt;while(accumulator>=1/60){step(1/60);accumulator-=1/60;}scenery.update(phase==='paused'?0:dt);updateEngineSound(dt);updateCamera(dt);minimap.render(trucks,selectedColor,viewCorners);renderer.render(scene,camera);}requestAnimationFrame(frame);
// Read-only telemetry makes gameplay and rendering easy to inspect.
window.__DUST_RUNNER__={getState:()=>({phase,elapsed,track:trackIndex,trackVariant,renderer:renderer.info.render,player:{x:trucks[0].x,z:trucks[0].z,speed:trucks[0].speed,lap:trucks[0].lap,nitro:trucks[0].nitro,engineId:trucks[0].engineId,powertrain:{...trucks[0].powertrain}},trucks:trucks.map(c=>({lap:c.lap,index:c.index,x:c.x,z:c.z,airborne:c.airborne,height:c.height,rollover:c.rollover,suspension:c.suspensionLengths})),cash,levels:{...levels}})};

}
boot().catch(error=>{console.error(error);document.querySelector('#message p').textContent='The physics engine could not load. Please reload the game.';});

import * as THREE from 'three';
import './style.css';
import {createRoadSurface,wheelContacts,bodyAttitude,updateWheel,VEHICLE_SCALE,TIRE_RADIUS} from './contact.js';
import {createBronco} from './vehicle.js';
import {followCameraStep} from './view.js';
import {createMinimap} from './minimap.js';
import {TRACKS,ROAD_WIDTH,createCircuit,terrainHeight,nearestPoint,opponentInput} from './tracks.js';
import {clamp,angleDelta,advanceProgress,formatTime,arcadeMotion,updateSuspension,containOnTrack} from './race.js';
const $=s=>document.querySelector(s),canvas=$('#scene'),game=$('#game'),menuDialog=$('#game-menu');
canvas.tabIndex=0;
const minimap=createMinimap($('#minimap'));
let cameraState={x:0,z:0,span:20};
const viewCorners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>new THREE.Vector3(x,y,-1)),viewDirection=new THREE.Vector3();
const scene=new THREE.Scene();scene.background=new THREE.Color('#a99a70');scene.fog=new THREE.Fog('#a99a70',105,210);
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){$('#message p').textContent='WebGL is required. Please enable hardware acceleration and reload.';$('#start').disabled=true;throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor('#a99a70');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const camera=new THREE.OrthographicCamera(-50,50,35,-35,.1,250);camera.position.set(12,88,62);camera.lookAt(0,0,0);
scene.add(new THREE.HemisphereLight('#fff4d6','#69653e',2.6));const sun=new THREE.DirectionalLight('#fff0cb',3.2);sun.position.set(-30,55,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:180});sun.shadow.normalBias=.04;scene.add(sun,sun.target);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,...extra});
const textureCanvas=document.createElement('canvas');textureCanvas.width=256;textureCanvas.height=256;const textureContext=textureCanvas.getContext('2d');textureContext.fillStyle='#a8784c';textureContext.fillRect(0,0,256,256);for(let i=0;i<18000;i++){textureContext.fillStyle=Math.random()>.5?'#93683b':'#be8d59';textureContext.globalAlpha=.25+Math.random()*.3;textureContext.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*2,1+Math.random()*2);}const dirtTexture=new THREE.CanvasTexture(textureCanvas);dirtTexture.wrapS=dirtTexture.wrapT=THREE.RepeatWrapping;dirtTexture.colorSpace=THREE.SRGBColorSpace;
const sand=mat('#b59b65'),dirt=mat('#c8a06f',{map:dirtTexture,side:THREE.DoubleSide}),dark=mat('#252b24'),cream=mat('#e8d7a1'),green=mat('#58633b');
let world=new THREE.Group();scene.add(world);const trucks=[],particles=[];let samples=[],curve,trackIndex=0,heightAt=()=>0;
const N=900,roadWidth=ROAD_WIDTH;
function box(w,h,d,material,x=0,y=0,z=0,parent=world){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cylinder(r,h,material,x,y,z,parent=world,segments=10){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
let seed=42;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function nearest(x,z){return nearestPoint(samples,x,z);}
function terrain(i){return terrainHeight(i/N,trackIndex);}
function ribbon(offset,width,material,y=0){const positions=[],normals=[],uv=[],indices=[];for(let i=0;i<=N;i++){const j=i%N,p=samples[j],t=curve.getTangentAt(j/N),normal=new THREE.Vector3(-t.z,0,t.x);for(let side=0;side<2;side++){const q=p.clone().addScaledVector(normal,offset+(side-.5)*width);positions.push(q.x,terrain(j)+y,q.z);normals.push(0,1,0);uv.push(i/20,side);}if(i<N){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,material);mesh.castShadow=material===dirt;mesh.receiveShadow=true;world.add(mesh);}
function terrainSkirts(){
 const material=mat('#9a6d44',{side:THREE.DoubleSide});
 for(const side of [-1,1]){const positions=[],indices=[];
   for(let i=0;i<=N;i++){const j=i%N,p=samples[j],t=curve.getTangentAt(j/N),x=p.x-t.z*roadWidth*side,z=p.z+t.x*roadWidth*side;
     positions.push(x,-.25,z,x,terrain(j)+.01,z);
     if(i<N){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
   const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.castShadow=true;world.add(mesh);
 }
}

function sign(text,x,z,rotation=0){const c=document.createElement('canvas');c.width=512;c.height=100;const ctx=c.getContext('2d');ctx.fillStyle='#273321';ctx.fillRect(0,0,512,100);ctx.fillStyle='#f5d363';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,68);const m=box(12,2.3,.22,new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(c)}),x,2.7,z);m.rotation.y=rotation;for(const dx of [-5,5])box(.2,2,.2,dark,x+dx,1,z);}
function makeWorld(){
 for(const child of [...world.children]){world.remove(child);child.traverse(o=>{o.geometry?.dispose();});}seed=42+trackIndex;
 curve=createCircuit(trackIndex);samples=Array.from({length:N},(_,i)=>curve.getPointAt(i/N));
 heightAt=createRoadSurface(samples,samples.map((_,i)=>curve.getTangentAt(i/N)),samples.map((_,i)=>terrain(i)+.01),roadWidth);
 const bounds=new THREE.Box3().setFromPoints(samples),pitZ=bounds.max.z+roadWidth+8,standZ=bounds.min.z-roadWidth-7;
 box(360,.7,300,sand,0,-.6,0);ribbon(0,roadWidth*2,dirt,.01);terrainSkirts();
 ribbon(-3.7,.12,mat('#c29a63'),.025);ribbon(3.7,.12,mat('#c29a63'),.025);
 const rampPaint=mat('#e4bb5c');
 for(const f of TRACKS[trackIndex].features){const count=f.kind==='whoops'?f.count:2;for(let k=0;k<count;k++){const u=f.kind==='whoops'?(k+.5)/count:.25+k*.13;const j=Math.round((f.start+u*f.length)*N)%N,p=samples[j],t=curve.getTangentAt(j/N);const stripe=box(roadWidth*1.65,.035,.16,rampPaint,p.x,terrain(j)+.05,p.z);stripe.rotation.y=Math.atan2(-t.x,-t.z);stripe.castShadow=false;}}
 for(let i=0;i<N;i+=5){const p=samples[i],t=curve.getTangentAt(i/N),n=new THREE.Vector3(-t.z,0,t.x);for(const side of [-1,1]){const q=p.clone().addScaledVector(n,side*(roadWidth+.3));const b=box(curve.getLength()/N*5+.12,.7,.7,i%10===0?cream:mat('#ab5d3a'),q.x,.38+terrain(i),q.z);b.rotation.y=-Math.atan2(t.z,t.x);}}
 // Tire stacks and scrub leave the racing surface clear.
 for(let i=0;i<280;i++){const x=bounds.min.x-25+rand()*(bounds.max.x-bounds.min.x+50),z=bounds.min.z-25+rand()*(bounds.max.z-bounds.min.z+50);if(nearest(x,z).distance<roadWidth+4)continue;if(rand()<.37){const r=.4+rand()*1.1;const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(r,0),mat(rand()>.5?'#8e8057':'#c0ac7b'));rock.position.set(x,r*.3,z);rock.scale.y=.7;rock.rotation.set(rand(),rand()*6,rand());rock.castShadow=true;world.add(rock);}else{const h=1+rand()*2.4;cylinder(.25,h,green,x,h/2,z,world,6);box(.8,.23,.23,green,x+.35,h*.6,z);box(.2,h*.4,.2,green,x+.7,h*.75,z);}}
 for(let i=0;i<90;i++){let x=(rand()-.5)*120,z=(rand()-.5)*90;if(nearest(x,z).distance<9)continue;box(.08,.05,.45,green,x,.02,z);}
 // Grandstands, pit garages and warm desert details.
 for(let row=0;row<4;row++){box(26,.6,1.6,mat(row%2?'#69715b':'#827d61'),-3,1+row*.65,standZ-row*1.3);for(let j=0;j<34;j++){const x=-15+j*.75;const colors=['#d6b663','#8b5540','#ece2ba','#394e48'];box(.33,.65,.35,mat(colors[Math.floor(rand()*4)]),x,1.7+row*.65,standZ-row*1.3);}}
 for(let i=0;i<3;i++){box(8,3,5,mat('#beb191'),-20+i*10,1.5,pitZ);box(8.7,.22,6,mat(['#a75f3c','#73816b','#b69a4c'][i]),-20+i*10,3.1,pitZ);box(4.8,2.4,.1,dark,-20+i*10,1.2,pitZ-2.56);}
 sign('DUST RUNNER',-1,standZ+4);sign('GOOD TIMES. FULL THROTTLE.',0,pitZ-5,Math.PI);
 // Checkered start strip follows the track's tangent.
 const p=samples[0],t=curve.getTangentAt(0),a=Math.atan2(t.z,t.x);for(let col=0;col<12;col++)for(let row=0;row<2;row++){const along=(row-.5)*.65,side=(col-5.5)*(roadWidth*2/12);const tile=box(.65,.04,roadWidth*2/12,(row+col)%2?cream:dark,p.x+Math.cos(a)*along-Math.sin(a)*side,.055,p.z+Math.sin(a)*along+Math.cos(a)*side);tile.rotation.y=-a;}
 for(const side of [-1,1]){const q=p.clone().add(new THREE.Vector3(-t.z,0,t.x).multiplyScalar(side*(roadWidth+1.1)));box(.25,7,.25,dark,q.x,3.5,q.z);}
 const beam=box(.35,.5,(roadWidth+1.1)*2,cream,p.x,7,p.z);beam.rotation.y=-a;
 for(let k=0;k<16;k++){const x=(rand()-.5)*150,z=bounds.min.z-roadWidth-30-rand()*15;const hill=new THREE.Mesh(new THREE.ConeGeometry(8+rand()*12,6+rand()*13,5),mat('#a9976c'));hill.position.set(x,1,z);world.add(hill);}
 minimap.setTrack(samples,roadWidth);
}
function makeTruck(color,num){
 const {mesh,chassis,body,wheels}=createBronco(color,num);scene.add(mesh);
 return {mesh,chassis,body,wheels,x:0,z:0,vx:0,vz:0,heading:0,speed:0,index:0,checkpoint:0,lap:0,height:0,vertical:0,nitro:100,boosting:false,finish:false};
}
makeWorld();['#f3bf42','#e6644c','#5ca9ba','#ece9cf'].forEach((c,i)=>trucks.push(makeTruck(c,['07','12','28','03'][i])));
const keys=new Set();let phase='ready',previousPhase='racing',elapsed=0,count=0,selectedColor='#f3bf42',cash=0,levels={engine:0,grip:0},lastTime=0,muted=true,audio,osc,gain;
try{const save=JSON.parse(localStorage.getItem('dust-runner-save'));if(save){cash=Math.max(0,Number(save.cash)||0);levels.engine=clamp(Number(save.engine)||0,0,3);levels.grip=clamp(Number(save.grip)||0,0,3);}}catch{}
function save(){try{localStorage.setItem('dust-runner-save',JSON.stringify({cash,...levels}));}catch{}updateGarage();}
function updateGarage(){$('#cash').textContent=cash;for(const type of ['engine','grip']){$(`#${type}-level`).textContent=levels[type];const b=$(`[data-upgrade="${type}"]`);b.disabled=levels[type]>=3;b.title=levels[type]>=3?'Fully upgraded':'Buy upgrade for $300';}}
updateGarage();
function reset(){elapsed=0;count=0;phase='ready';$('#race-status').textContent='FREE PRACTICE';$('#countdown').textContent='';$('#pause').textContent='Ⅱ';$('#message').style.display='block';$('#message').innerHTML='<span>DUST RUNNER</span><strong>'+(trackIndex?'RATTLESNAKE':'DUSTBOWL')+'</strong><p>Three laps. Four trucks. All dirt.</p><button id="start">RACE <span>↗</span></button><button class="setup-link" id="open-setup">TRUCK · TRACK · PIT STOP</button><small>ENTER TO RACE · WASD / ARROWS TO DRIVE</small>';$('#start').onclick=start;$('#open-setup').onclick=openMenu;updateMenu();
 trucks.forEach((c,i)=>{const j=N-20-(i>1?25:0),p=samples[j],t=curve.getTangentAt(j/N),side=(i%2?1:-1)*2.1;Object.assign(c,{x:p.x-t.z*side,z:p.z+t.x*side,vx:0,vz:0,heading:Math.atan2(-t.x,-t.z),speed:0,index:j,checkpoint:-1,lap:0,height:terrain(j),vertical:0,airborne:false,lastGround:terrain(j),suspension:0,suspensionVelocity:0,rampRiseVelocity:0,nitro:100,boosting:false,finish:false});c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.set(0,c.heading,0);c.wheels.forEach(w=>{w.previousX=undefined;w.previousHeading=undefined;w.angle=0;w.steer=0;w.angularVelocity=0;});poseTruck(c,0,true);});
 for(const p of particles){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();}particles.length=0;updateCamera(0,true);}
function start(){if(phase==='racing'||phase==='countdown')return;reset();phase='countdown';count=3.4;$('#message').style.display='none';$('#race-status').textContent='GET READY';canvas.focus({preventScroll:true});initAudio();}
function pause(){if(!['racing','countdown','paused'].includes(phase))return;if(phase==='paused'){phase=previousPhase;$('#countdown').textContent='';$('#pause').textContent='Ⅱ';}else{previousPhase=phase;phase='paused';$('#countdown').textContent='PAUSED';$('#pause').textContent='▶';}keys.clear();canvas.focus({preventScroll:true});}
let menuPaused=false;
function updateMenu(){$('#menu-play').textContent=phase==='paused'?'RESUME RACE ↗':'START RACE ↗';}
function openMenu(){if(menuDialog.open)return;menuPaused=phase==='racing'||phase==='countdown';if(menuPaused)pause();keys.clear();updateMenu();menuDialog.showModal();}
function closeMenu(){menuDialog.close();if(menuPaused&&phase==='paused')pause();menuPaused=false;canvas.focus({preventScroll:true});}
$('#menu').onclick=openMenu;$('#menu-close').onclick=closeMenu;
$('#menu-play').onclick=()=>{closeMenu();if(['ready','finished'].includes(phase))start();else if(phase==='paused')pause();};
menuDialog.addEventListener('cancel',event=>{event.preventDefault();closeMenu();});
menuDialog.addEventListener('keydown',event=>{event.stopPropagation();if(event.code==='Escape'){event.preventDefault();closeMenu();}});
function initAudio(){if(muted)return;try{if(!audio){audio=new AudioContext();osc=audio.createOscillator();gain=audio.createGain();osc.type='sawtooth';osc.connect(gain);gain.connect(audio.destination);gain.gain.value=.02;osc.start();}audio.resume();}catch{}}
$('#sound').onclick=()=>{muted=!muted;$('#sound').innerHTML=`SOUND ${muted?'OFF':'ON'} <span>◖))</span>`;if(!muted)initAudio();if(gain)gain.gain.value=muted?0:.02;};
$('#pause').onclick=pause;$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#app').requestFullscreen();}catch{$('#garage-note').textContent='Fullscreen is unavailable in this browser.';}};
document.addEventListener('fullscreenchange',()=>{$('#fullscreen').textContent=document.fullscreenElement?'⊡':'⛶';$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Fullscreen game');});
document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{selectedColor=b.dataset.color;trucks[0].body.color.set(selectedColor);document.querySelectorAll('[data-color]').forEach(el=>{el.classList.toggle('selected',el===b);el.querySelector('b').textContent=el===b?'SELECTED ↗':'SELECT ↗';});});
document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>{trackIndex=Number(b.dataset.track);document.querySelectorAll('[data-track]').forEach(el=>el.classList.toggle('active',el===b));makeWorld();resize();$('#track-name').textContent=trackIndex?'02 — RATTLESNAKE':'01 — DUSTBOWL';reset();});
document.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{const type=b.dataset.upgrade;if(phase==='racing'||phase==='countdown'||phase==='paused'){$('#garage-note').textContent='Upgrades are available between races.';return;}if(cash<300){$('#garage-note').textContent='You need $300. Finish a race to earn more cash.';return;}if(levels[type]<3){cash-=300;levels[type]++;save();$('#garage-note').textContent=`${type==='engine'?'Engine':'Tires'} upgraded to level ${levels[type]}. Ready for the next race.`;}});
window.addEventListener('keydown',e=>{if(menuDialog.open)return;if(e.target instanceof HTMLButtonElement&&e.code==='Space')return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.repeat)return;keys.add(e.code);if(e.code==='Enter'&&['ready','finished'].includes(phase))start();if(e.code==='KeyP'||e.code==='Escape')pause();if(e.code==='KeyR')reset();});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(phase==='racing'||phase==='countdown')pause();});
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key);});
function dust(c){if(particles.length>130||Math.random()>.48)return;const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.2+Math.random()*.3,0),new THREE.MeshBasicMaterial({color:c.boosting?'#ead38f':'#c5a477',transparent:true,opacity:.45,depthWrite:false}));mesh.position.set(c.x+Math.sin(c.heading)*2,.3,c.z+Math.cos(c.heading)*2);scene.add(mesh);particles.push({mesh,life:.6+Math.random()*.5,vx:(Math.random()-.5)*3,vz:(Math.random()-.5)*3});}
function finish(){phase='finished';trucks[0].finish=true;const rank=ranking().indexOf(trucks[0])+1,reward=[900,600,400,300][rank-1];cash+=reward;save();$('#race-status').textContent='RACE COMPLETE';$('#message').style.display='block';$('#message').innerHTML=`<span>THE DUST HAS SETTLED</span><strong>${['FIRST PLACE!','SECOND PLACE','THIRD PLACE','KEEP ON TRUCKIN’'][rank-1]}</strong><p>${formatTime(elapsed)} · $${reward} earned · Visit the pit stop for upgrades.</p><button id="start">RACE AGAIN <span>↗</span></button><button class="setup-link" id="open-setup">PIT STOP · UPGRADES</button><small>OR PRESS ENTER</small>`;$('#start').onclick=start;$('#open-setup').onclick=openMenu;$('#garage-note').textContent=`$${reward} earned. Upgrade your truck and get back out there.`;}
function ranking(){return [...trucks].sort((a,b)=>(b.lap*N+b.index+(b.checkpoint>=0?N:0))-(a.lap*N+a.index+(a.checkpoint>=0?N:0)));}
function poseTruck(c,dt,snap=false){
 const contacts=wheelContacts(c,heightAt),support=bodyAttitude(contacts);
 if(snap){c.height=support.ground;c.lastGround=support.ground;}
 const ground=c.airborne?c.height:support.ground;
 c.mesh.position.set(c.x,ground+.025,c.z);c.mesh.rotation.set(0,c.heading,0);
 const pitch=c.airborne?clamp(-c.vertical*.035,-.3,.3):support.pitch;
 const roll=c.airborne?0:support.roll;
 const blend=snap?1:1-Math.exp(-dt*18);
 c.chassis.rotation.x=THREE.MathUtils.lerp(c.chassis.rotation.x,pitch,blend);
 c.chassis.rotation.z=THREE.MathUtils.lerp(c.chassis.rotation.z,roll,blend);
 // Only the sprung body compresses; tire contact is independent of body bounce.
 c.chassis.position.y=clamp(c.suspension??0,-.14,.16)/VEHICLE_SCALE;
 c.wheels.forEach((w,i)=>{
  const contact=contacts[i];
  w.pivot.position.y=TIRE_RADIUS+(c.airborne?Math.max(0,contact.ground-ground):contact.ground-ground)/VEHICLE_SCALE;
  if(dt>0)updateWheel(w,c,contact,dt);
  w.pivot.rotation.y=w.steer??0;w.spin.rotation.x=w.angle??0;
 });
}
function step(dt){if(phase==='countdown'){count-=dt;$('#countdown').textContent=count>.4?Math.ceil(count-.4):'GO!';if(count<=0){phase='racing';$('#countdown').textContent='';$('#race-status').textContent='RACE IN PROGRESS';}}if(phase==='racing'){
 elapsed+=dt;
 trucks.forEach((c,i)=>{const near=nearest(c.x,c.z),onDirt=near.distance<roadWidth;let throttle=0,steer=0,brake=false,boost=false;
 if(i===0){throttle=keys.has('ArrowUp')||keys.has('KeyW')?1:0;brake=keys.has('ArrowDown')||keys.has('KeyS');steer=(keys.has('ArrowLeft')||keys.has('KeyA')?1:0)-(keys.has('ArrowRight')||keys.has('KeyD')?1:0);boost=keys.has('Space')&&c.nitro>0&&throttle>0;}else{({throttle,steer,brake,boost}=opponentInput(c,near,curve,samples));}
 boost=boost&&!c.airborne;
 c.boosting=boost;if(boost)c.nitro=Math.max(0,c.nitro-dt*32);else c.nitro=Math.min(100,c.nitro+dt*7);
 arcadeMotion(c,{throttle,steer,brake,boost,onDirt,engine:i===0?levels.engine:0,tires:i===0?levels.grip:0,ai:i!==0,opponent:i},dt);
 // Keep the enlarged trucks inside the barriers without trapping them on contact.
 const edge=nearest(c.x,c.z);containOnTrack(c,{...edge,ground:terrain(edge.index)},roadWidth);
 const next=nearest(c.x,c.z).index;
 // Crossing the line once arms quarter checkpoints; a full circuit is required for every lap.
 if(c.checkpoint===-1){if(c.index>N*.75&&next<N*.25)c.checkpoint=0;}else{const p=advanceProgress(c.index,next,c.checkpoint,c.lap,N);c.checkpoint=p.checkpoint;c.lap=p.lap;}
 c.index=next;
 const contacts=wheelContacts(c,heightAt),support=bodyAttitude(contacts);
 const ground=c.airborne?Math.max(...contacts.map(w=>w.ground)):support.ground;
 const contact=updateSuspension(c,ground,dt);
 if(contact.landed&&Math.abs(c.speed)>10){for(let n=0;n<5;n++)dust(c);}
 if(Math.abs(c.speed)>5)dust(c);
 });
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=trucks[i],b=trucks[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d<3.2&&d>.001&&Math.abs(a.height-b.height)<1){const push=(3.2-d)*.5;a.x-=dx/d*push;a.z-=dz/d*push;b.x+=dx/d*push;b.z+=dz/d*push;a.speed*=.98;b.speed*=.98;}}
 trucks.forEach(c=>poseTruck(c,dt));
 if(trucks[0].lap>=3)finish();
 }
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];if(phase!=='paused'){p.life-=dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.z+=p.vz*dt;p.mesh.position.y+=dt*.6;p.mesh.scale.multiplyScalar(1+dt*.7);p.mesh.material.opacity=Math.max(0,p.life*.35);}if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);}}
 const c=trucks[0];$('#speed').textContent=Math.round(Math.abs(c.speed)*3.6);$('#time').textContent=formatTime(elapsed);$('#lap').innerHTML=`${String(Math.min(c.lap+1,3)).padStart(2,'0')}<small> / 03</small>`;$('#position').innerHTML=`${String(ranking().indexOf(c)+1).padStart(2,'0')}<small> / 04</small>`;$('#nitro-text').textContent=Math.round(c.nitro)+'%';$('#nitro-fill').style.width=c.nitro+'%';if(audio&&osc&&gain){osc.frequency.setTargetAtTime(45+Math.abs(c.speed)*5,audio.currentTime,.1);gain.gain.setTargetAtTime(muted||phase!=='racing'?0:.012+(c.boosting?.008:0),audio.currentTime,.1);}
}
function updateCamera(dt,snap=false){
 const player=trucks[0];if(!player||(!snap&&phase==='paused'))return;
 const w=game.clientWidth,h=game.clientHeight;if(!w||!h)return;
 const look=Math.round(12/(curve.getLength()/N));
 const now=curve.getTangentAt(player.index/N),ahead=curve.getTangentAt(((player.index+look)%N)/N);
 const bend=Math.abs(angleDelta(Math.atan2(ahead.x,ahead.z),Math.atan2(now.x,now.z)));
 cameraState=followCameraStep(cameraState,{...player,bend},{width:w,height:h},dt,snap);
 const {x,z,span}=cameraState,aspect=w/h;
 camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;
 camera.position.set(x,78,z+70);camera.lookAt(x,0,z);camera.updateProjectionMatrix();camera.updateMatrixWorld();
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
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;accumulator+=dt;while(accumulator>=1/60){step(1/60);accumulator-=1/60;}updateCamera(dt);minimap.render(trucks,selectedColor,viewCorners);renderer.render(scene,camera);}requestAnimationFrame(frame);
// Read-only telemetry makes gameplay and rendering easy to inspect.
window.__DUST_RUNNER__={getState:()=>({phase,elapsed,track:trackIndex,renderer:renderer.info.render,player:{x:trucks[0].x,z:trucks[0].z,speed:trucks[0].speed,lap:trucks[0].lap,nitro:trucks[0].nitro},trucks:trucks.map(c=>({lap:c.lap,index:c.index,x:c.x,z:c.z,airborne:c.airborne,height:c.height})),cash,levels:{...levels}})};

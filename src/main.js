import * as THREE from 'three';
import {createDrivePanel} from './drive-panel.js';
import {createHandlingPanel} from './handling-panel.js';
import {driveModeById} from './drive-modes.js';
import {SimulationClock} from './simulation-clock.js';
import {batchRigidMeshes} from './mesh-batching.js';
import {FrameStats} from './frame-stats.js';
import {VehiclePresentation} from './vehicle-presentation.js';
import {RenderBudget} from './render-budget.js';
import {createDustPool} from './dust-pool.js';
import {createSandTrails} from './sand-trails.js';
import {createRaceKerbs} from './race-kerbs.js';
import {Handbrake} from './handbrake.js';
import {engineDriverAudible} from './engine-sound.js';
import {chunkTerrain} from './terrain-chunks.js';
import {buildRaceDesert,combineGround,createSandMaterial,createDesertWind} from './desert-scenery.js';
import {createDesertReflections} from './lighting.js';
import './style.css';
import {VEHICLE_SCALE} from './contact.js';
import {vehicleMass} from './vehicle-mass.js';
import {createScenery} from './scenery.js';
import {createBronco} from './vehicle.js';
import {followCameraStep} from './view.js';
import {createMinimap} from './minimap.js';
import {TRACKS,TRACK_VARIANTS,ROAD_WIDTH,refreshTracks,setGeneratedTrack,createCircuit,terrainHeight,nearestPoint,opponentInput} from './tracks.js';
import {ENGINES,engineById,defaultEngine} from './engines.js';
import {resetPowertrain,swapEngine} from './powertrain.js';
import {createHistoryPanel} from './history-panel.js';
import {EngineAudio} from './engine-audio.js';
import {clamp,angleDelta,advanceProgress,formatTime} from './race.js';
import {buildTerrain} from './terrain.js';
import {findRecoverySpot} from './recovery.js';
import {createTransmissionPanel} from './transmission-panel.js';
import {transmissionMode,gearLabel} from './transmissions.js';
import {RaceCompletion} from './race-completion.js';
import {createRaceCelebration} from './race-celebration.js';
import {desertInvitation} from './desert-share.js';
import {buildDesert,DESERT_SPAWN,DESERT_BOUNDS,DESERT_VARIANTS,normalizeDesertOptions} from './desert.js';
import {initPhysics,createPhysics,CHASSIS_HEIGHT} from './physics.js';
import {tuning as cfg,restoreTuning,setTuning,tuningDocument,ACTIVE_TUNING_KEY} from './tuning.js';
import {createTuningPanel} from './tuning-panel.js';
import {createStatsOverlay} from './stats-overlay.js';
import {readVehicleDiagnostics} from './vehicle-diagnostics.js';
import {createVehicleDiagnosticsOverlay} from './vehicle-diagnostics-overlay.js';

try{restoreTuning(window.localStorage);}catch{}
refreshTracks();

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
const renderBudget=new RenderBudget(),performanceTracker=new FrameStats(10000),simulationClock=new SimulationClock();renderer.setPixelRatio(renderBudget.pixelRatio(game.clientWidth,game.clientHeight,devicePixelRatio));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor('#a99a70');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const reflections=createDesertReflections(renderer);scene.environment=reflections.texture;scene.environmentIntensity=.65;
const markerFrustum=new THREE.Frustum(),markerViewMatrix=new THREE.Matrix4(),markerPosition=new THREE.Vector3();
const markerIsVisible=position=>{markerPosition.set(position.x,position.y+.17,position.z);return markerFrustum.containsPoint(markerPosition);};
const decorSphere=new THREE.Sphere(new THREE.Vector3(),5);
const sceneryIsVisible=(x,y,z)=>{decorSphere.center.set(x,y,z);return markerFrustum.intersectsSphere(decorSphere);};
const camera=new THREE.OrthographicCamera(-50,50,35,-35,.1,250);camera.position.set(12,88,62);camera.lookAt(0,0,0);
scene.add(new THREE.HemisphereLight('#fff4d6','#69653e',2.6));const sun=new THREE.DirectionalLight('#fff0cb',3.2);sun.position.set(-30,55,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:180});sun.shadow.normalBias=.04;scene.add(sun,sun.target);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,...extra});
const textureCanvas=document.createElement('canvas');textureCanvas.width=256;textureCanvas.height=256;const textureContext=textureCanvas.getContext('2d');textureContext.fillStyle='#a8784c';textureContext.fillRect(0,0,256,256);for(let i=0;i<18000;i++){textureContext.fillStyle=Math.random()>.5?'#93683b':'#be8d59';textureContext.globalAlpha=.25+Math.random()*.3;textureContext.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*2,1+Math.random()*2);}const dirtTexture=new THREE.CanvasTexture(textureCanvas);dirtTexture.wrapS=dirtTexture.wrapT=THREE.RepeatWrapping;dirtTexture.colorSpace=THREE.SRGBColorSpace;
const sand=createSandMaterial(),dirt=mat('#c8a06f',{map:dirtTexture,side:THREE.DoubleSide}),dark=mat('#252b24'),cream=mat('#e8d7a1'),green=mat('#58633b');
let world=new THREE.Group();scene.add(world);const trucks=[],dustPool=createDustPool(scene),sandTrails=createSandTrails(scene);let samples=[],curve,trackIndex=0,trackVariant=0,freeRide=false,heightAt=()=>0,scenery,physics,desertWind;
const N=3600;let roadWidth=ROAD_WIDTH;
let desertOptions=normalizeDesertOptions();
try{desertOptions=normalizeDesertOptions(JSON.parse(localStorage.getItem('dust-runner-desert-v1'))??{});}catch{}
const desertQuery=new URLSearchParams(location.search);if(desertQuery.has('dunes'))desertOptions=normalizeDesertOptions({variant:desertQuery.get('dunes'),seed:desertQuery.get('seed')??undefined});
function box(w,h,d,material,x=0,y=0,z=0,parent=world){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cylinder(r,h,material,x,y,z,parent=world,segments=10){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
let seed=42;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function nearest(x,z){return nearestPoint(samples,x,z);}
function terrain(i){return terrainHeight(i/N,trackIndex,0,trackVariant);}
function ribbon(offset,width,material,y=0){const positions=[],normals=[],uv=[],indices=[];for(let i=0;i<=N;i++){const j=i%N,p=samples[j],t=curve.getTangentAt(j/N),normal=new THREE.Vector3(-t.z,0,t.x);for(let side=0;side<2;side++){const q=p.clone().addScaledVector(normal,offset+(side-.5)*width);positions.push(q.x,heightAt(q.x,q.z)+y,q.z);normals.push(0,1,0);uv.push(i/20,side);}if(i<N){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,material);mesh.castShadow=material===dirt;mesh.receiveShadow=true;world.add(mesh);}

function sign(text,x,z,rotation=0){const c=document.createElement('canvas');c.width=512;c.height=100;const ctx=c.getContext('2d');ctx.fillStyle='#273321';ctx.fillRect(0,0,512,100);ctx.fillStyle='#f5d363';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,68);const m=box(12,2.3,.22,new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(c)}),x,heightAt(x,z)+2.7,z);m.rotation.y=rotation;for(const dx of [-5,5])box(.2,2,.2,dark,x+Math.cos(rotation)*dx,heightAt(x,z)+1,z-Math.sin(rotation)*dx);}
function activeTrucks(){return freeRide?trucks.slice(0,1):trucks;}
function makeDesertWorld(){
 const ground=buildDesert(desertOptions);heightAt=ground.heightAt;physics=createPhysics(ground,ground.bounds);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(ground.positions,3));geometry.setAttribute('uv',new THREE.BufferAttribute(ground.uv,2));geometry.setAttribute('color',new THREE.BufferAttribute(ground.colors,3));geometry.setIndex(new THREE.BufferAttribute(ground.indices,1));geometry.computeVertexNormals();
 world.add(chunkTerrain(geometry,sand,64,false));
 const anchors=[];for(let z=ground.bounds.min.z+30;z<ground.bounds.max.z-30;z+=24)for(let x=ground.bounds.min.x+30;x<ground.bounds.max.x-30;x+=24){const y=heightAt(x,z);if(y>5&&y>heightAt(x+6,z)&&y>heightAt(x-6,z))anchors.push({x,y,z});}
 desertWind=createDesertWind({world,heightAt,anchors,random:rand});
 scenery=createScenery({world,samples:[],curve,roadWidth:0,heightAt,addRocks:vertices=>physics.addRocks(vertices),protectedAreas:[DESERT_SPAWN],nearest:()=>({distance:Infinity}),bounds:ground.bounds,random:rand});
 // A raised sandy rim and solid outer edge keep the finite playground contained.
 for(const side of [-1,1])for(const axis of ['x','z']){const halfX=DESERT_BOUNDS.max.x,halfZ=DESERT_BOUNDS.max.z,x=axis==='x'?side*(halfX+1):0,z=axis==='z'?side*(halfZ+1):0;physics.addBoundary(x,z,axis==='x'?1:halfX+2,axis==='z'?1:halfZ+2,45);}
 minimap.setDesert(ground);
}
function makeWorld(){
 sand.userData.updateWaves();
 roadWidth=ROAD_WIDTH;
 physics?.dispose();
 const geometries=new Set(),materials=new Set();for(const child of [...world.children]){world.remove(child);child.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});}geometries.forEach(g=>g.dispose());materials.forEach(m=>{if(![sand,dirt,dark,cream,green].includes(m))m.dispose();});seed=42+trackIndex;
 curve=createCircuit(trackIndex,trackVariant);samples=Array.from({length:N},(_,i)=>curve.getPointAt(i/N));
 if(freeRide){makeDesertWorld();return;}
 const terrainMesh=buildTerrain(samples,curve,trackIndex);
 const bounds=new THREE.Box3().setFromPoints(samples),pitZ=bounds.max.z+roadWidth+8,standZ=bounds.min.z-roadWidth-7;
 const dunes=buildRaceDesert(samples,bounds,roadWidth+cfg.shoulderWidth);
 heightAt=(x,z)=>Math.max(terrainMesh.heightAt(x,z),dunes.heightAt(x,z));
 physics=createPhysics(combineGround(terrainMesh,dunes),bounds);
 const duneGeometry=new THREE.BufferGeometry();duneGeometry.setAttribute('position',new THREE.BufferAttribute(dunes.positions,3));duneGeometry.setAttribute('uv',new THREE.BufferAttribute(dunes.uv,2));duneGeometry.setIndex(new THREE.BufferAttribute(dunes.indices,1));duneGeometry.computeVertexNormals();
 world.add(chunkTerrain(duneGeometry,sand,64,false));
 desertWind=createDesertWind({world,heightAt,anchors:dunes.anchors,random:rand});
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(terrainMesh.positions,3));geometry.setAttribute('uv',new THREE.BufferAttribute(terrainMesh.uv,2));geometry.setIndex(new THREE.BufferAttribute(terrainMesh.indices,1));geometry.computeVertexNormals();
 world.add(chunkTerrain(geometry,dirt));
 world.add(createRaceKerbs(terrainMesh,N,curve.getLength()));
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
 scenery=createScenery({world,samples,curve,roadWidth,terrain:(i,side)=>terrainHeight(i/N,trackIndex,side,trackVariant),heightAt,addRocks:vertices=>physics.addRocks(vertices),addBarrier:(...args)=>physics.addBarrier(...args),nearest,bounds,random:rand});
 // Grandstands, pit garages and warm desert details.
 const stands=new THREE.Group();world.add(stands);const spectatorMaterials=['#d6b663','#8b5540','#ece2ba','#394e48'].map(color=>mat(color)),benchMaterials=['#827d61','#69715b'].map(color=>mat(color));
 for(let row=0;row<4;row++){box(26,.6,1.6,benchMaterials[row%2],-3,1+row*.65,standZ-row*1.3,stands);for(let j=0;j<34;j++){const x=-15+j*.75;box(.33,.65,.35,spectatorMaterials[Math.floor(rand()*4)],x,1.7+row*.65,standZ-row*1.3,stands);}}
 batchRigidMeshes(stands);stands.traverse(o=>{o.matrixAutoUpdate=false;});
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
 return {mesh,chassis,body,wheels,axles,dispose,number:num,style,engineId:defaultEngine(style),driveMode:'auto',transmissionMode:'arcade',axleLocks:{front:true,rear:true},x:0,z:0,vx:0,vz:0,heading:0,speed:0,index:0,checkpoint:0,lap:0,height:0,vertical:0,nitro:100,boosting:false,finish:false};
}
makeWorld();['classic','ranger','sunset','expedition'].forEach((c,i)=>trucks.push(makeTruck(c,['07','12','28','03'][i])));
const completion=new RaceCompletion(),celebration=createRaceCelebration(game);
const keys=new Set();let phase='ready',previousPhase='racing',elapsed=0,count=0,selectedColor='#087a50',cash=0,levels={engine:0,grip:0},lastTime=0,muted=true,volume=.55,steeringMode='return',audioPreviewTime=0;
const engineAudio=new EngineAudio(),handbrake=new Handbrake();
try{const save=JSON.parse(localStorage.getItem('dust-runner-save'));if(save){trucks[0].transmissionMode=transmissionMode({transmissionMode:save.transmissionMode});trucks[0].driveMode=driveModeById(save.driveMode).id;trucks[0].axleLocks={front:typeof save.axleLocks?.front==='boolean'?save.axleLocks.front:true,rear:typeof save.axleLocks?.rear==='boolean'?save.axleLocks.rear:true};if(['return','hold'].includes(save.steeringMode))steeringMode=save.steeringMode;if(ENGINES.some(e=>e.id===save.engineId))trucks[0].engineId=save.engineId;if(Number.isFinite(save.volume))volume=clamp(save.volume,0,1);cash=Math.max(0,Number(save.cash)||0);levels.engine=clamp(Number(save.engine)||0,0,3);levels.grip=clamp(Number(save.grip)||0,0,3);}}catch{}
function save(){try{localStorage.setItem('dust-runner-save',JSON.stringify({cash,...levels,engineId:trucks[0].engineId,volume,steeringMode,driveMode:trucks[0].driveMode,transmissionMode:transmissionMode(trucks[0]),axleLocks:trucks[0].axleLocks}));}catch{}updateGarage();}
function updateGarage(){$('#cash').textContent=cash;for(const type of ['engine','grip']){$(`#${type}-level`).textContent=levels[type];const b=$(`[data-upgrade="${type}"]`);b.disabled=levels[type]>=3;b.title=levels[type]>=3?'Fully upgraded':'Buy upgrade for $300';}}
updateGarage();
const drivePanel=createDrivePanel({getPlayer:()=>trucks[0],onChange:()=>{completion.interrupt();save();},onInteract:()=>{if(!menuDialog.open)canvas.focus({preventScroll:true});}});
const transmissionPanel=createTransmissionPanel({getPlayer:()=>trucks[0],onChange:()=>{completion.interrupt();save();},onInteract:()=>{if(!menuDialog.open)canvas.focus({preventScroll:true});}});
const handlingPanel=createHandlingPanel({getPlayer:()=>trucks[0],onChange:()=>{completion.interrupt();keys.clear();},onInteract:()=>{if(!menuDialog.open)canvas.focus({preventScroll:true});}});
function reset(){handbrake.reset();completion.reset();celebration.reset();$('#race-victory').hidden=true;simulationClock.reset(true);physics.resetBarriers();scenery.resetBarriers();elapsed=0;count=0;phase='ready';$('#race-status').textContent=freeRide?'FREE RIDE · PUSTYNIA':'FREE PRACTICE';$('#countdown').textContent='';$('#pause').textContent='Ⅱ';$('#message').style.display='block';$('#message').innerHTML='<span>DUST RUNNER</span><strong>'+TRACKS[trackIndex].name+'</strong><p>Three laps · '+(curve.getLength()/1000).toFixed(2)+' km per lap · Split landing ahead.</p><button id="start">RACE <span>↗</span></button><button class="setup-link" id="open-setup">TRUCK · TRACK · PIT STOP</button><small>ENTER TO RACE · WASD / ARROWS TO DRIVE</small>';if(freeRide){$('#message').innerHTML='<span>FREE RIDE</span><strong>PUSTYNIA</strong><p>1200 × 600 m · Wydmy sierpowe, długie grzbiety, wysokie kopce i pola nierównego piasku. Bez przeciwników i limitu czasu.</p><button id="start">JEDŹ NA PUSTYNIĘ ↗</button><button class="setup-link" id="open-setup">SAMOCHÓD · SILNIK · MENU</button><small>F · POSTAW AUTO NA KOŁACH &nbsp; R · WRÓĆ NA START</small>';}$('#start').onclick=start;$('#open-setup').onclick=openMenu;updateMenu();
 trucks.forEach((c,i)=>c.mesh.visible=!freeRide||i===0);
 activeTrucks().forEach((c,i)=>{const j=N-20-(i>1?25:0),p=samples[j],t=curve.getTangentAt(j/N),side=(i%2?1:-1)*2.1*curve.lateralSign;Object.assign(c,{x:p.x-t.z*side,z:p.z+t.x*side,vx:0,vz:0,heading:Math.atan2(-t.x,-t.z),speed:0,index:j,checkpoint:-1,lap:0,height:terrain(j),vertical:0,airborne:false,lastGround:terrain(j),suspension:0,suspensionVelocity:0,rampRiseVelocity:0,collisionYaw:0,nitro:100,boosting:false,finish:false});c.mesh.position.set(c.x,0,c.z);c.mesh.rotation.set(0,c.heading,0);c.wheels.forEach(w=>{w.previousRotation=undefined;w.previousX=undefined;w.previousHeading=undefined;w.angle=0;w.steer=0;w.angularVelocity=0;});c.stuckTime=0;c.lane=(i%2?3.5:-3.5)*curve.lateralSign;if(freeRide)Object.assign(c,{...DESERT_SPAWN,height:heightAt(DESERT_SPAWN.x,DESERT_SPAWN.z)});resetPowertrain(c);physics.reset(c);poseTruck(c,0,true);});
 sandTrails.reset();dustPool.reset();updateCamera(0,true);}
function start(){if(phase==='racing'||phase==='countdown')return;audioPreviewTime=0;reset();phase=freeRide?'racing':'countdown';count=3.4;$('#message').style.display='none';$('#race-status').textContent=freeRide?'FREE RIDE · PUSTYNIA':'GET READY';canvas.focus({preventScroll:true});initAudio();}
function pause(){handbrake.cancelHold();completion.interrupt();if(!['racing','countdown','paused'].includes(phase))return;if(phase==='paused'){phase=previousPhase;$('#countdown').textContent='';$('#pause').textContent='Ⅱ';}else{previousPhase=phase;phase='paused';$('#countdown').textContent='PAUSED';$('#pause').textContent='▶';engineAudio.silence();}keys.clear();canvas.focus({preventScroll:true});}
let menuPaused=false;
function updateMenu(){$('#menu-play').textContent=freeRide?(phase==='paused'?'WRÓĆ NA PUSTYNIĘ ↗':'JEDŹ NA PUSTYNIĘ ↗'):(phase==='paused'?'RESUME RACE ↗':'START RACE ↗');}
function openMenu(){if(menuDialog.open)return;syncSandWaves();completion.interrupt();menuPaused=phase==='racing'||phase==='countdown';if(menuPaused)pause();keys.clear();updateMenu();menuDialog.showModal();}
function closeMenu(){completion.interrupt();menuDialog.close();if(menuPaused&&phase==='paused')pause();menuPaused=false;canvas.focus({preventScroll:true});}
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
const steeringSelect=$('#steering-mode');steeringSelect.value=steeringMode;
function updateSteeringHelp(){
 $('#steering-help').textContent=steeringMode==='hold'?'Tap to adjust the wheel angle; hold to turn farther. Release to keep the angle. Opposite arrow unwinds it. C or both steering arrows centers the wheels.':'Hold an arrow to steer. Release to center automatically. Steering becomes gentler at speed.';
}
steeringSelect.onchange=()=>{steeringMode=steeringSelect.value;keys.clear();updateSteeringHelp();save();};
updateSteeringHelp();
$('#engine-volume').value=Math.round(volume*100);
$('#engine-volume').oninput=e=>{volume=Number(e.target.value)/100;save();};
const engineSelect=$('#engine-select');
engineSelect.innerHTML=[...new Set(ENGINES.map(e=>e.group))].map(group=>`<optgroup label="${group}">${ENGINES.filter(e=>e.group===group).map(e=>`<option value="${e.id}">${e.name}</option>`).join('')}</optgroup>`).join('');
function updateEngineMenu(){
 const e=engineById(trucks[0].engineId);engineSelect.value=e.id;
 const peak=Math.max(...e.curve.map(p=>p[1]))*cfg.torqueScale;
 $('#engine-character').textContent=e.character;
 $('#engine-spec').textContent=`${e.cylinders} CYL · ${e.idle}–${e.redline} RPM · ${Math.round(peak)} N·m peak tune · ${vehicleMass(trucks[0].style,e.id)} KG`;
 const points=e.curve.map(([rpm,torque])=>`${10+(rpm-e.idle)/(e.redline-e.idle)*280},${70-torque*cfg.torqueScale/Math.max(450,peak*1.1)*58}`).join(' ');
 $('#torque-line').setAttribute('points',points);$('#torque-chart').setAttribute('aria-label',`${e.name}: modeled torque curve, ${peak} newton meters peak`);transmissionPanel.update();
}
engineSelect.onchange=()=>{
 if(engineSelect.value===trucks[0].engineId)return;
 swapEngine(trucks[0],engineSelect.value);physics.refreshMass(trucks[0]);audioPreviewTime=0;engineAudio.silence();updateEngineMenu();save();
};
$('#engine-preview').onclick=async()=>{muted=false;updateSoundLabels();await initAudio();if(!muted)audioPreviewTime=3.4;};
updateEngineMenu();updateSoundLabels();
const historyPanel=createHistoryPanel({getPlayer:()=>trucks[0],canFit:()=>true,fitEngine:id=>{engineSelect.value=id;engineSelect.onchange();}});
$('#open-history').onclick=()=>{audioPreviewTime=0;engineAudio.silence();historyPanel.open();};
function updateEngineSound(dt){
 const e=engineById(trucks[0].engineId);let state=trucks[0].powertrain,preview=audioPreviewTime>0&&!['racing','countdown'].includes(phase);
 if(preview){audioPreviewTime=Math.max(0,audioPreviewTime-dt);const t=1-audioPreviewTime/3.4;state={rpm:e.idle+(e.redline-e.idle)*Math.sin(t*Math.PI)*.9,load:t<.62?.85:.1};}
 const powered=engineDriverAudible(trucks[0],{preview,accelerator:keys.has('ArrowUp')||keys.has('KeyW'),brake:keys.has('ArrowDown')||keys.has('KeyS')});
 const enabled=powered&&!muted&&!document.hidden&&document.hasFocus()&&(preview||(!menuDialog.open&&!document.querySelector('#tuning-menu')?.open&&phase!=='paused'));
 if(import.meta.env.DEV)canvas.dataset.engineAudible=String(enabled);
 engineAudio.update(e,state,{enabled,volume});
}
$('#recover-touch').onclick=()=>recover(trucks[0]);
$('#pause').onclick=pause;$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#app').requestFullscreen();}catch{$('#garage-note').textContent='Fullscreen is unavailable in this browser.';}};
document.addEventListener('fullscreenchange',()=>{$('#fullscreen').textContent=document.fullscreenElement?'⊡':'⛶';$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Fullscreen game');});
document.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>{
 const player=trucks[0];scene.remove(player.mesh);player.dispose();
 const model=createBronco(b.dataset.model,player.number);Object.assign(player,model,{style:b.dataset.model});scene.add(player.mesh);
 if(['copper78','godzilla78'].includes(b.dataset.model))player.engineId=defaultEngine(b.dataset.model);
 selectedColor=b.dataset.color;poseTruck(player,0);updateEngineMenu();
 document.querySelectorAll('[data-model]').forEach(el=>{el.classList.toggle('selected',el===b);el.querySelector('b').textContent=el===b?'SELECTED ↗':'SELECT ↗';});
 rebuildTrack();
});
function rebuildTrack(){
 keys.clear();makeWorld();resize();reset();
 $('#track-name').textContent=freeRide?'PUSTYNIA — '+DESERT_VARIANTS.find(v=>v.id===desertOptions.variant).name+(desertOptions.variant==='random'?' · #'+desertOptions.seed:''):`${String(trackIndex+1).padStart(2,'0')} — ${TRACKS[trackIndex].name}${trackVariant?' · '+TRACK_VARIANTS[trackVariant].name:''}`;
 $('#track-variant-status').textContent=TRACK_VARIANTS[trackVariant].name+' · VARIANT '+(trackVariant+1)+' / 4';
 document.querySelectorAll('[data-reflection]').forEach(b=>{const active=Boolean(trackVariant&Number(b.dataset.reflection));b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{freeRide=b.dataset.mode==='desert';document.querySelectorAll('[data-mode]').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',String(el===b));});document.querySelector('.track-select').hidden=freeRide;$('#desert-options').hidden=!freeRide;document.querySelector('.hud').classList.toggle('freeride-hud',freeRide);document.querySelector('.minimap>div>span').textContent=freeRide?'PUSTYNIA':'COURSE';document.querySelector('.minimap>div>small').textContent=freeRide?'➤ TY · 1200 × 600 M':'➤ YOU · ▲ JUMP';$('#minimap').setAttribute('aria-label',freeRide?'Desert dunes and player position':'Full circuit with all four racers and the camera view');rebuildTrack();});
function renderTrackChoices(){
 $('#track-grid').innerHTML=TRACKS.map((track,index)=>{
  const c=createCircuit(index),points=Array.from({length:100},(_,j)=>c.getPointAt(j/100));
  const xs=points.map(p=>p.x),zs=points.map(p=>p.z),minX=Math.min(...xs),minZ=Math.min(...zs),scale=70/Math.max(Math.max(...xs)-minX,Math.max(...zs)-minZ);
  const line=points.map(p=>`${5+(p.x-minX)*scale},${5+(p.z-minZ)*scale}`).join(' ');
  return `<button class="${index===trackIndex?'active':''}" data-track="${index}" aria-pressed="${index===trackIndex}"><svg viewBox="0 0 80 80" aria-hidden="true"><polyline points="${line} ${line.split(' ')[0]}"/></svg><span>${String(index+1).padStart(2,'0')} · ${track.name}</span><small>${(track.length/1000).toFixed(2)} KM · ${track.features.filter(f=>['jump','canyon'].includes(f.kind)).length} SKOKÓW · 3 WYS.</small></button>`;
 }).join('');
}
renderTrackChoices();
const desertSelect=$('#desert-variant'),desertSeed=$('#desert-seed');
desertSelect.innerHTML=DESERT_VARIANTS.map(v=>`<option value="${v.id}">${v.name}</option>`).join('');
function updateDesertOptions(){
 $('#desert-share-status').textContent='';$('#desert-share-text').hidden=true;
 const profile=DESERT_VARIANTS.find(v=>v.id===desertOptions.variant);desertSelect.value=profile.id;desertSeed.value=desertOptions.seed;
 $('#desert-generator').hidden=profile.id!=='random';$('#desert-description').textContent=profile.description;
 try{localStorage.setItem('dust-runner-desert-v1',JSON.stringify(desertOptions));}catch{}
}
function applyDesertOptions(options){desertOptions=normalizeDesertOptions(options);updateDesertOptions();if(freeRide)rebuildTrack();}
desertSelect.onchange=()=>applyDesertOptions({variant:desertSelect.value,...(desertSelect.value==='random'?{seed:crypto.getRandomValues(new Uint32Array(1))[0]}:{})});
function applyDesertSeed(){if(!desertSeed.checkValidity()){desertSeed.reportValidity();return;}applyDesertOptions({variant:'random',seed:desertSeed.value});}
desertSeed.onchange=applyDesertSeed;$('#desert-apply-seed').onclick=applyDesertSeed;desertSeed.onkeydown=event=>{if(event.code==='Enter'){event.preventDefault();applyDesertSeed();}};
$('#desert-share').onclick=async()=>{
 const invitation=desertInvitation(desertOptions),field=$('#desert-share-text');field.value=invitation.text;
 try{await navigator.clipboard.writeText(invitation.text);field.hidden=true;$('#desert-share-status').textContent='Skopiowano zaproszenie i link do tej pustyni. Wyślij je znajomym!';}
 catch{field.hidden=false;field.focus();field.select();$('#desert-share-status').textContent='Skopiuj zaznaczone zaproszenie: Ctrl/Cmd+C lub przytrzymaj tekst.';}
};
$('#desert-generate').onclick=()=>applyDesertOptions({variant:'random',seed:crypto.getRandomValues(new Uint32Array(1))[0]});updateDesertOptions();
$('#track-grid').onclick=event=>{const b=event.target.closest('[data-track]');if(!b)return;trackIndex=Number(b.dataset.track);renderTrackChoices();rebuildTrack();};
try{const saved=localStorage.getItem('dust-runner-race-seed');if(saved!==null)$('#race-seed').value=String(Number(saved)>>>0);}catch{}
function generateRace(random=false){
 const field=$('#race-seed');if(random)field.value=String(crypto.getRandomValues(new Uint32Array(1))[0]);
 if(!field.checkValidity()){field.reportValidity();return;}
 trackIndex=setGeneratedTrack(field.value);field.value=String(TRACKS[trackIndex].seed);renderTrackChoices();rebuildTrack();
 try{localStorage.setItem('dust-runner-race-seed',field.value);}catch{}
 const track=TRACKS[trackIndex];$('#race-generator-status').textContent=`Gotowe · #${track.seed} · ${(track.length/1000).toFixed(2)} km · ${track.rampCount} ramp · 3 wysokości. Naciśnij START RACE, aby jechać.`;
}
$('#race-generate').onclick=()=>generateRace(true);$('#race-apply-seed').onclick=()=>generateRace();
$('#race-seed').onkeydown=event=>{if(event.code==='Enter'){event.preventDefault();generateRace();}};
document.querySelectorAll('[data-reflection]').forEach(b=>b.onclick=()=>{trackVariant^=Number(b.dataset.reflection);rebuildTrack();});
document.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{const type=b.dataset.upgrade;if(phase==='racing'||phase==='countdown'||phase==='paused'){$('#garage-note').textContent='Upgrades are available between races.';return;}if(cash<300){$('#garage-note').textContent='You need $300. Finish a race to earn more cash.';return;}if(levels[type]<3){cash-=300;levels[type]++;save();$('#garage-note').textContent=`${type==='engine'?'Engine':'Tires'} upgraded to level ${levels[type]}. Ready for the next race.`;}});
function syncSandWaves(){
 $('#sand-ruffles').checked=Boolean(cfg.sandRuffles);$('#sand-wave-size').value=cfg.sandWaveSize;$('#sand-wave-height').value=cfg.sandWaveHeight;paintSandWaveValues();
}
function paintSandWaveValues(){
 $('#sand-wave-size-value').textContent=$('#sand-wave-size').value+' m';$('#sand-wave-height-value').textContent=Number($('#sand-wave-height').value).toFixed(2)+' m';
}
$('#sand-wave-size').oninput=$('#sand-wave-height').oninput=paintSandWaveValues;
$('#sand-waves-apply').onclick=()=>{
 completion.interrupt();applyParameters({...cfg,sandRuffles:Number($('#sand-ruffles').checked),sandWaveSize:Number($('#sand-wave-size').value),sandWaveHeight:Number($('#sand-wave-height').value)});
 try{localStorage.setItem(ACTIVE_TUNING_KEY,JSON.stringify(tuningDocument(cfg,'Aktywne ustawienia')));$('#sand-waves-status').textContent='Zastosowano i zapisano w tej przeglądarce.';}
 catch{$('#sand-waves-status').textContent='Zastosowano. Przeglądarka nie pozwoliła zapisać ustawień.';}
};
function applyParameters(parameters){
 const previous={...cfg};
 try{setTuning(parameters);refreshTracks();makeWorld();reset();resize();updateEngineMenu();}
 catch(error){setTuning(previous);refreshTracks();makeWorld();reset();resize();updateEngineMenu();throw error;}
}
let devResume=false;
const tuningPanel=createTuningPanel({
 onOpen(){completion.interrupt();devResume=menuPaused||phase==='racing'||phase==='countdown';if(menuDialog.open){menuDialog.close();menuPaused=false;}if(phase==='racing'||phase==='countdown')pause();keys.clear();engineAudio.silence();},
 onClose(drive){completion.interrupt();if(drive)start();else if(devResume&&phase==='paused')pause();devResume=false;canvas.focus({preventScroll:true});},
 onApply:applyParameters,
 getContext:()=>({mode:freeRide?'desert':'race',desert:{...desertOptions},track:trackIndex,trackVariant,body:trucks[0].style,engineId:trucks[0].engineId,steeringMode,handlingProfile:trucks[0].handlingProfile,hillDescent:trucks[0].hillDescent,driveMode:trucks[0].driveMode,transmissionMode:transmissionMode(trucks[0]),frontLock:trucks[0].axleLocks.front,rearLock:trucks[0].axleLocks.rear,engineUpgrade:levels.engine,tireUpgrade:levels.grip}),
 getStats:()=>{const c=trucks[0];return {mass:Math.round(c.physics.body.mass()),speed:Math.round(Math.abs(c.speed)*3.6),vertical:c.vertical.toFixed(2),contacts:[0,1,2,3].filter(i=>c.physics.controller.wheelIsInContact(i)).length,rpm:Math.round(c.powertrain?.rpm??0)};},
});
$('#open-tuning').onclick=$('#quick-dev').onclick=()=>tuningPanel.open();
const statsOverlay=createStatsOverlay({game,toggle:$('#show-stats'),onInteract:()=>canvas.focus({preventScroll:true}),getDiagnostics:()=>{
 const c=trucks[0],info=renderer.info,powertrain=c.powertrain;
 return {...physics.getStats(),physicsBudget:simulationClock.budgetMs,limitedFrames:simulationClock.limitedFrames,background:scenery.getStats?.().activeSnakes??0,resolution:Math.round(canvas.width)+' × '+Math.round(canvas.height),calls:info.render.calls,triangles:info.render.triangles,geometries:info.memory.geometries,textures:info.memory.textures,speed:Math.round(Math.abs(c.speed)*3.6),rpm:Math.round(powertrain?.rpm??0),gear:driveModeById(powertrain?.mode).label+' · '+gearLabel(c),mass:Math.round(c.physics.body.mass()),contacts:[0,1,2,3].filter(i=>c.physics.controller.wheelIsInContact(i)).length,vertical:c.vertical.toFixed(2),phase:({ready:'GOTOWY',countdown:'START',racing:'JAZDA',paused:'PAUZA',finished:'META'})[phase]};
}});
const vehicleDiagram=createVehicleDiagnosticsOverlay({game,toggle:$('#show-vehicle-diagram'),getEnginePreview:()=>({engine:engineById(trucks[0].engineId),rpm:0,running:false}),onInteract:()=>canvas.focus({preventScroll:true}),getDiagnostics:()=>['ready','countdown'].includes(phase)?null:{...readVehicleDiagnostics(trucks[0],{dt:simulationClock.dt,gravity:cfg.gravity}),running:phase==='racing'}});
// During a race, Space belongs to nitro even when a HUD button has focus.
window.addEventListener('keydown',e=>{if(menuDialog.open||document.querySelector('#tuning-menu')?.open)return;if(e.target instanceof HTMLButtonElement&&e.code==='Space'&&!['racing','countdown','paused'].includes(phase))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.repeat)return;if(transmissionPanel.shortcut(e)||drivePanel.shortcut(e)){e.preventDefault();return;}keys.add(e.code);if(['ShiftLeft','ShiftRight'].includes(e.code)){handbrake.press();updateGameHud();}if(e.code==='Enter'&&['ready','finished'].includes(phase))start();if(e.code==='KeyH')handlingPanel.toggleDescent();if(e.code==='KeyP'||e.code==='Escape')pause();if(e.code==='KeyR')reset();if(e.code==='KeyF')recover(trucks[0]);});window.addEventListener('keyup',e=>{keys.delete(e.code);if(['ShiftLeft','ShiftRight'].includes(e.code)&&!keys.has('ShiftLeft')&&!keys.has('ShiftRight')){handbrake.release();updateGameHud();}});window.addEventListener('blur',()=>{handbrake.cancelHold();audioPreviewTime=0;engineAudio.silence();keys.clear();if(phase==='racing'||phase==='countdown')pause();});
document.addEventListener('visibilitychange',()=>{simulationClock.reset();lastTime=performance.now();if(document.hidden){handbrake.cancelHold();keys.clear();audioPreviewTime=0;engineAudio.silence();}});
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);if(b.dataset.key==='ShiftLeft'){handbrake.press();updateGameHud();}};b.onpointerup=b.onpointercancel=()=>{keys.delete(b.dataset.key);if(b.dataset.key==='ShiftLeft'&&!keys.has('ShiftRight')){handbrake.release();updateGameHud();}};});
function dust(c,dt){if(Math.random()<=Math.min(1,dt*60))dustPool.spawn(c,heightAt(c.x,c.z));}
function finish(){
 const result=completion.record(ranking().indexOf(trucks[0])+1,elapsed);if(!result)return;
 trucks[0].finish=true;cash+=result.reward;save();
 $('#race-victory').hidden=false;$('#finish-medal').textContent=result.medal?result.rank:'✓';$('#finish-medal').style.setProperty('--medal',result.metal);
 $('#finish-title').textContent=(result.medal?result.medal+' · ':'META · ')+formatTime(result.time);
 $('#garage-note').textContent=`$${result.reward} earned. Upgrade your truck and get back out there.`;
 celebration.burst(result);
}
function showResults(){
 if(!completion.close())return;const result=completion.result;
 phase='finished';keys.clear();engineAudio.silence();celebration.reset();$('#race-victory').hidden=true;$('#countdown').textContent='';
 $('#race-status').textContent='RACE COMPLETE';$('#message').style.display='block';$('#message').innerHTML=`<span>THE DUST HAS SETTLED</span><strong>${result.title}</strong><p>${formatTime(result.time)} · $${result.reward} earned · Visit the pit stop for upgrades.</p><button id="start">RACE AGAIN <span>↗</span></button><button class="setup-link" id="open-setup">PIT STOP · UPGRADES</button><small>OR PRESS ENTER</small>`;
 $('#start').onclick=start;$('#open-setup').onclick=openMenu;$('#start').focus({preventScroll:true});
}
$('#end-race').onclick=showResults;

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
 // Locked virtual axle shafts share angular velocity. Contact wheels set
 // the shaft speed; unloading a wheel no longer makes it stop independently.
 for(const [name,indices] of [['front',[0,2]],['rear',[1,3]]])if(c.powertrain?.locks?.[name]){
  const grounded=indices.filter(i=>controller.wheelIsInContact(i)),source=grounded.length?grounded:indices;
  const rate=source.reduce((sum,i)=>sum+(c.wheels[i].angularVelocity??0),0)/source.length;
  for(const i of indices){const w=c.wheels[i];w.angle=(w.angle??0)+(rate-(w.angularVelocity??0))*dt;w.angularVelocity=rate;w.spin.rotation.x=w.angle;}
 }
 // Each live axle follows the two wheel hubs, including its differential.
 c.axles?.forEach(axle=>{
  const left=c.wheels[axle.indices[0]].pivot.position,right=c.wheels[axle.indices[1]].pivot.position;
  axle.group.position.y=(left.y+right.y)/2;
  axle.group.rotation.z=Math.atan2(right.y-left.y,right.x-left.x);
  for(const index of axle.indices)c.wheels[index].pivot.rotation.z=axle.group.rotation.z;
 });
 if(c.presentation?.mesh!==c.mesh)c.presentation=new VehiclePresentation(c);
 c.presentation.capture(snap);
}
function recover(c,advance=0){
 if(c===trucks[0])handbrake.reset();
 sandTrails.breakTrail(c);
 let spot;
 if(freeRide){
  spot=findRecoverySpot({x:c.x,z:c.z,heading:c.heading,heightAt,blocked:scenery.isRecoveryBlocked,bounds:{min:{x:DESERT_BOUNDS.min.x+20,z:DESERT_BOUNDS.min.z+20},max:{x:DESERT_BOUNDS.max.x-20,z:DESERT_BOUNDS.max.z-20}},fallback:DESERT_SPAWN});
 }else{
  const near=nearest(c.x,c.z),origin=(near.index+Math.round(advance*N/curve.getLength()))%N,candidates=[];
  // Search along the course, avoiding ramps and heavily banked corners.
  for(let distance=0;distance<=120;distance+=6)for(const direction of distance?[1,-1]:[1]){
   const index=(origin+Math.round(direction*distance*N/curve.getLength())+N)%N,t=curve.getTangentAt(index/N),p=samples[index];
   for(const lane of [c.lane??-3.5,0,3.5,-3.5])candidates.push({x:p.x-t.z*lane,z:p.z+t.x*lane,heading:Math.atan2(-t.x,-t.z),index});
  }
  spot=findRecoverySpot({x:c.x,z:c.z,heading:c.heading,heightAt,blocked:scenery.isRecoveryBlocked,candidates});
 }
 Object.assign(c,{x:spot.x,z:spot.z,heading:spot.heading,speed:0,vx:0,vz:0,vertical:0,stuckTime:0,boosting:false});
 if(spot.index!==undefined)c.index=spot.index;
 resetPowertrain(c);physics.reset(c,{groundHeight:spot.height});physics.sync(c,0);poseTruck(c,0,true);
 // The normal camera follow pans to the safe patch, including its elevation.
 // Recovery while paused must also bring the destination into view.
 if(c===trucks[0]&&phase==='paused')updateCamera(0,true);
}

let framePhysicsMs=0,framePhysicsSteps=0;
function step(dt){if(phase==='countdown'){count-=dt;$('#countdown').textContent=count>.4?Math.ceil(count-.4):'GO!';if(count<=0){phase='racing';$('#countdown').textContent='';$('#race-status').textContent='RACE IN PROGRESS';}}if(phase==='racing'){
 elapsed+=dt;
 handbrake.update(keys.has('ShiftLeft')||keys.has('ShiftRight'),dt);
 // One complete shared-world 120 Hz step; display refresh is independent.
  const physicsStarted=performance.now();
  activeTrucks().forEach((c,i)=>{
   const near=nearest(c.x,c.z),onDirt=freeRide||near.distance<roadWidth;
   let throttle=0,steer=0,brake=false,boost=false;
   if(i===0){throttle=keys.has('ArrowUp')||keys.has('KeyW')?1:0;brake=keys.has('ArrowDown')||keys.has('KeyS');steer=((keys.has('ArrowLeft')||keys.has('KeyA')?1:0)-(keys.has('ArrowRight')||keys.has('KeyD')?1:0));boost=keys.has('Space')&&c.nitro>0&&throttle>0;}
   else ({throttle,steer,brake,boost}=opponentInput(c,near,curve,samples));
   boost=boost&&driveModeById(c.powertrain?.mode).boost&&!c.airborne&&!brake&&!c.rollover;c.boosting=boost;
   c.nitro=clamp(c.nitro+(boost?-cfg.nitroDrain:cfg.nitroRecharge)*dt,0,100);
   physics.input(c,{throttle,steer,brake,boost,onDirt,handbrake:i===0&&handbrake.active,steeringMode:i===0?steeringMode:'return',centerSteering:i===0&&(keys.has('KeyC')||((keys.has('ArrowLeft')||keys.has('KeyA'))&&(keys.has('ArrowRight')||keys.has('KeyD')))),engine:i===0?levels.engine:0,tires:i===0?levels.grip:0,ai:i!==0},dt);
  });
  physics.step();activeTrucks().forEach(c=>physics.sync(c,dt));
  framePhysicsMs+=performance.now()-physicsStarted;framePhysicsSteps++;
 activeTrucks().forEach((c,i)=>{
  sandTrails.sample(c,heightAt);
  if(freeRide){if(!c.airborne&&Math.abs(c.speed)>5)dust(c,dt);poseTruck(c,dt);return;}
  const next=nearest(c.x,c.z).index;
  if(c.checkpoint===-1){if(c.index>N*.75&&next<N*.25)c.checkpoint=0;}else{const p=advanceProgress(c.index,next,c.checkpoint,c.lap,N);c.checkpoint=p.checkpoint;c.lap=p.lap;}
  c.index=next;if(!c.airborne&&Math.abs(c.speed)>5)dust(c,dt);
  c.stuckTime=Math.abs(c.speed)<1?(c.stuckTime??0)+dt:0;
  if(i>0&&(c.rolloverTime>3||nearest(c.x,c.z).distance>roadWidth+12||c.stuckTime>6)){recover(c,c.stuckTime>6?6:0);c.stuckTime=0;}
  poseTruck(c,dt);
 });
 if(!freeRide&&trucks[0].lap>=3&&!completion.result)finish();
 }
}
function updateGameHud(){
 const hb=$('#handbrake-hud');hb.textContent=handbrake.latched?'RĘCZNY · ZACIĄGNIĘTY 🔒':handbrake.active?`ZACIĄGANIE · ${Math.round(handbrake.progress*100)}%`:'RĘCZNY · PRZYTRZYMAJ 2 s';hb.style.setProperty('--hold',`${handbrake.progress*100}%`);hb.classList.toggle('latched',handbrake.latched);
 document.querySelectorAll('[data-key="ShiftLeft"]').forEach(button=>button.setAttribute('aria-pressed',String(handbrake.active)));

 if(phase==='racing')$('#race-status').textContent=completion.result?'META · '+(completion.result.medal??'FINISH')+' · JEDŹ DALEJ':trucks[0].rollover?'ROLLOVER · F TO RECOVER':trucks[0].airborne?'AIRBORNE':freeRide?'FREE RIDE · PUSTYNIA':'RACE IN PROGRESS';
 const c=trucks[0];if(import.meta.env.DEV)canvas.dataset.physics=JSON.stringify({x:c.x,z:c.z,index:c.index,heading:c.heading,airborne:c.airborne,height:c.height,rollover:c.rollover,suspension:c.suspensionLengths,rpm:c.powertrain?.rpm,gear:c.powertrain?.gear,load:c.powertrain?.load,grade:c.powertrain?.grade,mass:c.physics.body.mass(),centerOfMass:c.physics.body.localCom(),noseUpDegrees:Math.asin(clamp(2*(c.mesh.quaternion.w*c.mesh.quaternion.x-c.mesh.quaternion.y*c.mesh.quaternion.z),-1,1))*180/Math.PI,brakePressure:c.physics.controls.brakePressure,steering:c.physics.steer});
 $('#speed').textContent=Math.round(Math.abs(c.speed)*3.6);$('#time').textContent=formatTime(completion.result?.time??elapsed);$('#lap').innerHTML=`${String(Math.min(c.lap+1,3)).padStart(2,'0')}<small> / 03</small>`;$('#position').innerHTML=`${String(completion.result?.rank??ranking().indexOf(c)+1).padStart(2,'0')}<small> / 04</small>`;$('#nitro-text').textContent=Math.round(c.nitro)+'%';$('#nitro-fill').style.width=c.nitro+'%';const drivetrain=c.powertrain;$('#rpm').textContent=Math.round(drivetrain?.rpm??engineById(c.engineId).idle);$('#gear').textContent=driveModeById(drivetrain?.mode).label+' · '+gearLabel(c);
}
function updateCamera(dt,snap=false){
 const player=trucks[0];if(!player||(!snap&&phase==='paused'))return;
 const w=game.clientWidth,h=game.clientHeight;if(!w||!h)return;
 const look=Math.round(12/(curve.getLength()/N));
 const now=curve.getTangentAt(player.index/N),ahead=curve.getTangentAt(((player.index+look)%N)/N);
 const bend=freeRide?0:Math.abs(angleDelta(Math.atan2(ahead.x,ahead.z),Math.atan2(now.x,now.z)));
 const previousY=cameraState.y;cameraState=followCameraStep(cameraState,{...player,bend},{width:w,height:h},dt,snap);
 cameraState.y=previousY;const {x,z,span}=cameraState,aspect=w/h;
 camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;
 const targetY=heightAt(player.x,player.z)+Math.max(0,player.height-heightAt(player.x,player.z))*.35;
 cameraState.y=(cameraState.y??targetY)+(targetY-(cameraState.y??targetY))*(snap?1:1-Math.exp(-dt*3));
 camera.position.set(x,78+cameraState.y,z+70);camera.lookAt(x,cameraState.y,z);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 markerViewMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);markerFrustum.setFromProjectionMatrix(markerViewMatrix);physics?.setMarkerVisibility(markerIsVisible);
 camera.getWorldDirection(viewDirection);
 const ndc=[[-1,-1],[1,-1],[1,1],[-1,1]];
 viewCorners.forEach((point,i)=>{point.set(ndc[i][0],ndc[i][1],-1).unproject(camera);point.addScaledVector(viewDirection,-point.y/viewDirection.y);});
 // Keep shadow coverage around the visible race, with stable, snapped light motion.
 const sx=Math.round(x*20)/20,sz=Math.round(z*20)/20;
 sun.target.position.set(sx,0,sz);sun.position.set(sx-30,55,sz+20);
}
function resize(){
 const w=game.clientWidth,h=game.clientHeight;if(!w||!h)return;
 renderer.setPixelRatio(renderBudget.pixelRatio(w,h,devicePixelRatio));renderer.setSize(w,h,false);minimap.resize();updateCamera(0,true);
}
new ResizeObserver(resize).observe(game);reset();resize();if(new URLSearchParams(location.search).get('mode')==='desert')document.querySelector('[data-mode="desert"]').click();let lastHudPaint=0;
function frame(now){
 requestAnimationFrame(frame);const frameStarted=performance.now();framePhysicsMs=framePhysicsSteps=0;
 const elapsedFrame=Math.max(0,(now-lastTime)/1000),dt=Math.min(elapsedFrame,.1);lastTime=now;
 // Driving and contacts run before optional UI/scenery work. Catch-up has a
 // time and step cap, so a slow frame cannot create an ever-growing backlog.
 let work={alpha:1,dropped:0,cpuMs:0};
 if(!document.hidden&&(phase==='racing'||phase==='countdown'))work=simulationClock.advance(elapsedFrame,step);else simulationClock.reset();
 if(completion.tick(dt,{speed:Math.hypot(trucks[0].vx??0,trucks[0].vz??0),vertical:trucks[0].vertical,airborne:trucks[0].airborne,driving:[...keys].some(key=>['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','Space','KeyQ','KeyE','KeyN'].includes(key)),editing:menuDialog.open||document.querySelector('#tuning-menu')?.open,active:phase==='racing'&&!document.hidden&&document.hasFocus()}))showResults();
 celebration.update(dt,phase==='racing'&&!document.hidden);
 activeTrucks().forEach(c=>c.presentation?.render(phase==='racing'?work.alpha:1));
 updateEngineSound(dt);updateCamera(dt);
 dustPool.update(phase==='paused'?0:dt);
 scenery.update(phase==='paused'?0:dt,sceneryIsVisible,work.dropped===0&&work.cpuMs<simulationClock.budgetMs,activeTrucks());
 desertWind?.update(phase==='racing'?dt:0,sceneryIsVisible,work.dropped===0&&work.cpuMs<simulationClock.budgetMs);
 tuningPanel.update(now);
 if(now-lastHudPaint>=100){drivePanel.update();transmissionPanel.update();handlingPanel.update();updateGameHud();minimap.render(activeTrucks(),selectedColor,viewCorners);lastHudPaint=now;}
 renderer.render(scene,camera);
 vehicleDiagram.update(now);
 const cpuMs=performance.now()-frameStarted;
 if(renderBudget.sample(now,cpuMs,phase==='racing'&&!document.hidden))renderer.setPixelRatio(renderBudget.pixelRatio(game.clientWidth,game.clientHeight,devicePixelRatio));
 const timing={cpuMs,physicsMs:framePhysicsMs,steps:framePhysicsSteps};performanceTracker.record(now,timing);statsOverlay.record(now,timing);
}
requestAnimationFrame(frame);
// Read-only telemetry makes gameplay and rendering easy to inspect.
window.__DUST_RUNNER__={getState:()=>({phase,elapsed,result:completion.result,stoppedAfterFinish:completion.stoppedFor,mode:freeRide?'desert':'race',desert:{...desertOptions},track:trackIndex,trackVariant,renderer:{...renderer.info.render,width:canvas.width,height:canvas.height},performance:performanceTracker.snapshot(),scheduler:{budgetMs:simulationClock.budgetMs,limitedFrames:simulationClock.limitedFrames,droppedSeconds:simulationClock.droppedSeconds},player:{x:trucks[0].x,z:trucks[0].z,speed:trucks[0].speed,lap:trucks[0].lap,nitro:trucks[0].nitro,engineId:trucks[0].engineId,powertrain:{...trucks[0].powertrain}},trucks:trucks.map(c=>({lap:c.lap,index:c.index,x:c.x,z:c.z,airborne:c.airborne,height:c.height,rollover:c.rollover,suspension:c.suspensionLengths})),cash,levels:{...levels}})};

}
boot().catch(error=>{console.error(error);document.querySelector('#message p').textContent='The physics engine could not load. Please reload the game.';});

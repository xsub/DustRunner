import {translateDOM,t as msg,tx as msgHTML} from './i18n.js';
import * as THREE from 'three';
import {createBronco,BRONCO_STYLES} from './vehicle.js';
import {REFERENCE_MODELS} from './vehicle-models.js';
import {defaultEngine,engineById} from './engines.js';
import {vehicleMass} from './vehicle-mass.js';
import {GARAGE_SELECTION_KEY} from './vehicle-selection.js';
translateDOM();
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(420,280);renderer.setClearColor('#d9d8c1');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#fff8e7','#737956',3));const sun=new THREE.DirectionalLight('#fff3dc',4);sun.position.set(-6,9,-5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-6,right:6,top:7,bottom:-7,near:.1,far:30});sun.shadow.normalBias=.025;scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#d5d3b9',roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const camera=new THREE.OrthographicCamera(-5,5,3.3,-3.3,.1,100);let rear=false;
let active=null,frame=0,lastTime=0;
let selected='classic';try{selected=localStorage.getItem(GARAGE_SELECTION_KEY)||selected;}catch{}
function present(car,canvas,angle=0){
 car.mesh.rotation.y=0;car.mesh.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(car.mesh),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 floor.position.y=bounds.min.y-.025;
 const span=Math.max(2.8,size.y*.7,Math.hypot(size.x,size.z)*.5)*1.08,aspect=420/280;
 camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;
 camera.position.copy(center).add(new THREE.Vector3(6,3.8,rear?7:-7).normalize().multiplyScalar(14));
 camera.lookAt(center);camera.updateProjectionMatrix();car.mesh.rotation.y=angle;
 renderer.render(scene,camera);
 if(canvas.width!==renderer.domElement.width){canvas.width=renderer.domElement.width;canvas.height=renderer.domElement.height;}
 canvas.getContext('2d').drawImage(renderer.domElement,0,0);
}
function draw(style,canvas){
 const car=createBronco(style,'07');scene.add(car.mesh);present(car,canvas);scene.remove(car.mesh);car.dispose();
}
function markSelection(){
 document.querySelectorAll('[data-model]').forEach(card=>{
  card.classList.toggle('selected',card.dataset.model===selected);
  card.setAttribute('aria-pressed',String(active?.card===card&&active.rotating));
 });
}
function animate(now){
 frame=0;if(!active?.rotating||document.hidden)return;
 if(lastTime&&now-lastTime<1000/30){frame=requestAnimationFrame(animate);return;}
 const dt=lastTime?Math.min((now-lastTime)/1000,.1):0;lastTime=now;
 active.angle=(active.angle+dt*Math.PI/9)%(Math.PI*2);
 present(active.car,active.canvas,active.angle);frame=requestAnimationFrame(animate);
}
function activate(card,style){
 selected=style;try{localStorage.setItem(GARAGE_SELECTION_KEY,style);}catch{}
 if(active?.card===card){active.rotating=!active.rotating;}
 else{
  if(active){scene.remove(active.car.mesh);active.car.dispose();}
  const car=createBronco(style,'07');scene.add(car.mesh);
  active={car,card,canvas:card.querySelector('canvas'),angle:0,rotating:true};
 }
 cancelAnimationFrame(frame);lastTime=0;markSelection();present(active.car,active.canvas,active.angle);
 document.querySelector('#garage-status').textContent=BRONCO_STYLES[style].name+(" "+msg("vehicle_showroom.selected_for_player")+" ")+(active.rotating?msg("vehicle_showroom.rotation_on_click_again_to_stop"):msg("vehicle_showroom.rotation_stopped"));
 if(active.rotating)frame=requestAnimationFrame(animate);
}
function cards(container,entries){
 if(active)scene.remove(active.car.mesh);
 container.replaceChildren();
 for(const [style,spec] of entries){
  const card=document.createElement('article');card.className='card';card.tabIndex=0;card.setAttribute('role','button');
  card.setAttribute('aria-label',(msg("vehicle_showroom.select")+" ")+spec.name+(" "+msg("vehicle_showroom.and_toggle_rotation")));
  const engine=engineById(defaultEngine(style));
  card.innerHTML=`<canvas aria-label="${spec.name}"></canvas><h2>${spec.name}</h2><p>${spec.note??msg("vehicle_showroom.dust_runner_classics")}<br><small>${msgHTML("vehicle_showroom.kg_simulation",{v3:(engine.name),v4:(Math.round(vehicleMass(style,engine.id)))})}</small></p>`;
  container.append(card);draw(style,card.querySelector('canvas'));card.dataset.model=style;
  card.onclick=()=>activate(card,style);card.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate(card,style);}};
 }
 if(active)scene.add(active.car.mesh);
 markSelection();
}
document.querySelector('#view').onclick=()=>{
 rear=!rear;document.querySelector('#view').textContent=rear?msg("vehicle_showroom.show_front"):msg("vehicle_showroom.show_rear");
 // The active turntable must not appear in the static previews.
 if(active)scene.remove(active.car.mesh);
 document.querySelectorAll('[data-model]').forEach(card=>{if(card!==active?.card)draw(card.dataset.model,card.querySelector('canvas'));});
 if(active){scene.add(active.car.mesh);present(active.car,active.canvas,active.angle);}
};
document.querySelector('#older').ontoggle=()=>{
 if(document.querySelector('#older').open&&!document.querySelector('#old-models').children.length)
  cards(document.querySelector('#old-models'),Object.entries(BRONCO_STYLES).filter(([id])=>!REFERENCE_MODELS[id]));
};
document.addEventListener('visibilitychange',()=>{
 cancelAnimationFrame(frame);lastTime=0;if(!document.hidden&&active?.rotating)frame=requestAnimationFrame(animate);
});
window.addEventListener('pagehide',event=>{cancelAnimationFrame(frame);if(event.persisted)return;if(active){scene.remove(active.car.mesh);active.car.dispose();active=null;}renderer.dispose();});
cards(document.querySelector('#new-models'),Object.entries(REFERENCE_MODELS));

import * as THREE from 'three';
import {createBronco,BRONCO_STYLES} from './vehicle.js';
import {REFERENCE_MODELS} from './vehicle-models.js';
import {defaultEngine,engineById} from './engines.js';
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(420,280);renderer.setClearColor('#d9d8c1');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#fff8e7','#737956',3));const sun=new THREE.DirectionalLight('#fff3dc',4);sun.position.set(-6,9,-5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-6,right:6,top:7,bottom:-7,near:.1,far:30});sun.shadow.normalBias=.025;scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#d5d3b9',roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const camera=new THREE.OrthographicCamera(-5,5,3.3,-3.3,.1,100);let rear=false;
function draw(style,canvas){
 const car=createBronco(style,'07');scene.add(car.mesh);car.mesh.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(car.mesh),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());floor.position.y=bounds.min.y-.025;
 const span=Math.max(2.8,size.y*.66,size.z*.48),aspect=420/280;camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.position.copy(center).add(new THREE.Vector3(6,3.8,rear?7:-7).normalize().multiplyScalar(14));camera.lookAt(center);camera.updateProjectionMatrix();renderer.render(scene,camera);
 canvas.width=renderer.domElement.width;canvas.height=renderer.domElement.height;canvas.getContext('2d').drawImage(renderer.domElement,0,0);scene.remove(car.mesh);car.dispose();
}
function cards(container,entries){container.replaceChildren();for(const [style,spec] of entries){const card=document.createElement('article');card.className='card';const engine=engineById(defaultEngine(style));card.innerHTML=`<canvas aria-label="${spec.name}"></canvas><h2>${spec.name}</h2><p>${spec.note??'KLASYCZNA KOLEKCJA DUST RUNNER'}<br><small>${engine.name}</small></p>`;container.append(card);draw(style,card.querySelector('canvas'));card.dataset.model=style;}}
function render(){cards(document.querySelector('#new-models'),Object.entries(REFERENCE_MODELS));if(document.querySelector('#older').open)cards(document.querySelector('#old-models'),Object.entries(BRONCO_STYLES).filter(([id])=>!REFERENCE_MODELS[id]));}
document.querySelector('#view').onclick=()=>{rear=!rear;document.querySelector('#view').textContent=rear?'POKAŻ PRZÓD':'POKAŻ TYŁ';render();};document.querySelector('#older').ontoggle=()=>{if(document.querySelector('#older').open)cards(document.querySelector('#old-models'),Object.entries(BRONCO_STYLES).filter(([id])=>!REFERENCE_MODELS[id]));};render();

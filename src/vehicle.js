import * as THREE from 'three';
import {createOffroadWheel} from './wheel.js';
import {VEHICLE_SCALE,TIRE_RADIUS} from './contact.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// A compact, early-Bronco-inspired two-door silhouette, built from original geometry.
export function createBronco(color,number){
 const mesh=new THREE.Group(),chassis=new THREE.Group(),wheels=[];mesh.add(chassis);
 const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
 const body=material(color),rubber=material('#202622'),trim=material('#373f37');
 const ivory=material('#f2ead2'),metal=material('#b4b9ac',{metalness:.55,roughness:.45});
 const glass=material('#294b50',{metalness:.25,roughness:.28,side:THREE.DoubleSide});
 const light=material('#fff0bd',{emissive:'#e9ce84',emissiveIntensity:.6});
 function box(w,h,d,mat,x,y,z,parent=chassis){
   const part=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
   part.position.set(x,y,z);part.castShadow=true;part.receiveShadow=true;parent.add(part);return part;
 }
 function cylinder(radius,width,mat,x,y,z,axis,parent=chassis){
   const part=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,width,16),mat);
   part.position.set(x,y,z);part.rotation[axis]=Math.PI/2;part.castShadow=true;parent.add(part);return part;
 }
 function roundedBox(w,h,d,radius,mat,x,y,z){
   const part=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,radius),mat);
   part.position.set(x,y,z);part.castShadow=true;part.receiveShadow=true;chassis.add(part);return part;
 }
 // The reference's continuous beltline and circular arches define the early body.
 // Real wheel cutouts replace the square fender blocks of the first model.
 box(1.24,.3,2.78,trim,0,.75,0);
 box(1.69,.23,3.02,body,0,1.36,0);
 roundedBox(1.75,.15,1.2,.045,body,0,1.51,-.94);
 const panel=new THREE.Shape(),archRadius=.71,archAngle=Math.asin(.2/archRadius);
 panel.moveTo(1.52,.78);panel.lineTo(1.52,1.46);panel.lineTo(-1.52,1.46);panel.lineTo(-1.52,.78);
 panel.lineTo(-.91-archRadius*Math.cos(archAngle),.78);
 panel.absarc(-.91,.58,archRadius,Math.PI-archAngle,archAngle,true);
 panel.lineTo(.88-archRadius*Math.cos(archAngle),.78);
 panel.absarc(.88,.58,archRadius,Math.PI-archAngle,archAngle,true);
 panel.lineTo(1.52,.78);panel.closePath();
 const panelGeometry=new THREE.ExtrudeGeometry(panel,{depth:.055,bevelEnabled:true,bevelThickness:.012,bevelSize:.018,bevelSegments:2,curveSegments:12});
 for(const side of [-1,1]){
   const flank=new THREE.Mesh(panelGeometry,body);flank.rotation.y=Math.PI/2;
   flank.position.x=side>0?.85:-.905;flank.castShadow=true;flank.receiveShadow=true;chassis.add(flank);
   for(const z of [-.88,.91]){
     const lip=new THREE.Mesh(new THREE.TorusGeometry(.74,.035,6,20,Math.PI),body);
     lip.rotation.y=Math.PI/2;lip.position.set(side*.925,.58,z);lip.castShadow=true;chassis.add(lip);
   }
 }
 // Short, slightly raked windshield; long cream hardtop and large rear-quarter glass.
 box(1.67,.86,1.7,ivory,0,1.88,.59);
 roundedBox(1.82,.17,1.87,.065,ivory,0,2.36,.54);
 const windshield=box(1.47,.64,.035,glass,0,1.91,-.325);windshield.rotation.x=.2;
 box(1.43,.58,.035,glass,0,1.92,1.455);
 for(const side of [-1,1]){
   const windowShape=new THREE.Shape();windowShape.moveTo(.35,1.61);windowShape.lineTo(.215,2.22);windowShape.lineTo(-.29,2.22);windowShape.lineTo(-.29,1.61);windowShape.closePath();
   const window=new THREE.Mesh(new THREE.ShapeGeometry(windowShape),glass);
   window.rotation.y=Math.PI/2;window.position.x=side*.852;chassis.add(window);
   box(.035,.59,.86,glass,side*.852,1.92,.86);
   box(.045,.66,.09,ivory,side*.86,1.94,.35);
   box(.04,.07,.22,metal,side*.935,1.44,.15);
   for(const y of [.98,1.32])box(.04,.055,.085,metal,side*.935,y,-.28);
   box(.025,.58,.018,trim,side*.925,1.15,.42);
   box(.13,.1,1.05,trim,side*.925,.68,.08);
   box(.07,.09,.1,metal,side*.94,1.69,-.3);
   roundedBox(.15,.18,.2,.035,metal,side*1.01,1.8,-.3);
 }
 // Full-width horizontal grille, round headlamps and slim chrome bumpers.
 roundedBox(1.76,.52,.1,.07,metal,0,1.2,-1.55);
 box(1.02,.34,.04,rubber,0,1.2,-1.615);
 for(const y of [1.08,1.19,1.3])box(1.04,.035,.025,metal,0,y,-1.645);
 for(const x of [-.31,0,.31])box(.025,.32,.025,metal,x,1.2,-1.66);
 for(const x of [-.67,.67]){
   cylinder(.205,.09,trim,x,1.22,-1.6,'x');
   cylinder(.158,.105,light,x,1.22,-1.62,'x');
 }
 roundedBox(1.97,.16,.2,.035,metal,0,.79,-1.56);
 for(const x of [-.57,.57])box(.09,.32,.13,metal,x,.91,-1.66);
 roundedBox(1.92,.16,.18,.035,metal,0,.79,1.55);
 for(const x of [-.76,.76])box(.15,.3,.05,material('#c34d39',{emissive:'#8b2317',emissiveIntensity:.15}),x,1.17,1.53);
 // Steering pivots and axle spin remain independent of suspension travel.
 for(const x of [-1,1])for(const z of [-.88,.91]){
   const pivot=new THREE.Group(),wheel=createOffroadWheel();
   pivot.position.set(x,TIRE_RADIUS,z);pivot.add(wheel);mesh.add(pivot);
   wheels.push({pivot,spin:wheel,x,z});
 }
 const spare=createOffroadWheel();spare.rotation.y=Math.PI/2;
 spare.scale.setScalar(.9);spare.position.set(.16,1.4,1.69);chassis.add(spare);
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#f2ead2';ctx.fillRect(0,0,128,128);
 ctx.fillStyle='#243024';ctx.font='900 83px sans-serif';ctx.textAlign='center';ctx.fillText(number,64,94);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const numberMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:.9});
 const roof=new THREE.Mesh(new THREE.PlaneGeometry(1.07,.92),numberMaterial);
 roof.rotation.x=-Math.PI/2;roof.position.set(0,2.456,.54);chassis.add(roof);
 for(const side of [-1,1]){
   const decal=new THREE.Mesh(new THREE.PlaneGeometry(.49,.35),numberMaterial);
   decal.rotation.y=side*Math.PI/2;decal.position.set(side*.927,1.16,-.02);chassis.add(decal);
 }
 mesh.scale.setScalar(VEHICLE_SCALE);
 return {mesh,chassis,body,wheels};
}

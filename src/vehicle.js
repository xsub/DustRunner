import * as THREE from 'three';

// A compact, early-Bronco-inspired two-door silhouette, built from original geometry.
export function createBronco(color,number){
 const mesh=new THREE.Group(),wheels=[];
 const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
 const body=material(color),rubber=material('#202622'),trim=material('#373f37');
 const ivory=material('#f2ead2'),metal=material('#b4b9ac',{metalness:.55,roughness:.45});
 const glass=material('#294b50',{metalness:.25,roughness:.28});
 const light=material('#fff0bd',{emissive:'#e9ce84',emissiveIntensity:.6});
 function box(w,h,d,mat,x,y,z,parent=mesh){
   const part=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
   part.position.set(x,y,z);part.castShadow=true;part.receiveShadow=true;parent.add(part);return part;
 }
 function cylinder(radius,width,mat,x,y,z,axis,parent=mesh){
   const part=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,width,16),mat);
   part.position.set(x,y,z);part.rotation[axis]=Math.PI/2;part.castShadow=true;parent.add(part);return part;
 }
 // Flat hood, upright cabin and a full rear hardtop replace the pickup bed.
 box(1.65,.3,2.7,trim,0,.68,0);
 box(1.78,.59,2.83,body,0,1.05,0);
 box(1.72,.17,.89,body,0,1.42,-1.01);
 box(1.67,.93,1.89,body,0,1.85,.4);
 box(1.82,.16,2.02,ivory,0,2.36,.4);
 box(1.47,.64,.035,glass,0,1.88,-.565);
 box(.055,.65,.045,trim,0,1.88,-.59);
 box(1.43,.57,.035,glass,0,1.91,1.36);
 for(const side of [-1,1]){
   box(.035,.59,.66,glass,side*.848,1.91,-.13);
   box(.035,.59,.78,glass,side*.848,1.91,.75);
   box(.05,.66,.11,ivory,side*.855,1.94,.29);
   box(.035,.07,.21,metal,side*.91,1.42,.08);
   box(.16,.14,1.48,trim,side*.94,.68,.06);
   box(.18,.22,.23,trim,side*1.01,1.77,-.48);
   for(const z of [-.88,.91])box(.18,.21,.99,trim,side*.93,1.13,z);
 }
 // Round lamps and a narrow horizontal grille read clearly even at arcade scale.
 box(1.68,.46,.08,metal,0,1.15,-1.45);
 box(.91,.27,.1,rubber,0,1.16,-1.51);
 for(const x of [-.29,0,.29])box(.055,.21,.025,metal,x,1.16,-1.57);
 for(const x of [-.62,.62]){
   cylinder(.205,.1,trim,x,1.19,-1.53,'x');
   cylinder(.156,.115,light,x,1.19,-1.55,'x');
 }
 box(1.94,.2,.21,metal,0,.78,-1.5);
 box(1.9,.2,.18,trim,0,.78,1.46);
 for(const x of [-.72,.72])box(.18,.3,.05,material('#c34d39',{emissive:'#8b2317',emissiveIntensity:.15}),x,1.14,1.44);
 // Wheel groups rotate around the axle so the rims and tread roll together.
 for(const x of [-1,1])for(const z of [-.88,.91]){
   const wheel=new THREE.Group();wheel.position.set(x,.58,z);mesh.add(wheel);
   cylinder(.56,.43,rubber,0,0,0,'z',wheel);
   cylinder(.29,.46,metal,0,0,0,'z',wheel);
   cylinder(.13,.48,trim,0,0,0,'z',wheel);
   for(let i=0;i<12;i++){
     const angle=i*Math.PI/6;
     const tread=box(.46,.08,.17,trim,0,Math.cos(angle)*.55,Math.sin(angle)*.55,wheel);
     tread.rotation.x=angle;
   }
   wheels.push(wheel);
 }
 // Rear-mounted spare is fixed to the tailgate, not part of the rolling wheels.
 cylinder(.49,.3,rubber,0,1.38,1.57,'x');
 cylinder(.25,.32,metal,0,1.38,1.58,'x');
 cylinder(.1,.34,trim,0,1.38,1.59,'x');
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#f2ead2';ctx.fillRect(0,0,128,128);
 ctx.fillStyle='#243024';ctx.font='900 83px sans-serif';ctx.textAlign='center';ctx.fillText(number,64,94);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const numberMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:.9});
 const roof=new THREE.Mesh(new THREE.PlaneGeometry(1.07,.92),numberMaterial);
 roof.rotation.x=-Math.PI/2;roof.position.set(0,2.447,.4);mesh.add(roof);
 for(const side of [-1,1]){
   const decal=new THREE.Mesh(new THREE.PlaneGeometry(.49,.35),numberMaterial);
   decal.rotation.y=side*Math.PI/2;decal.position.set(side*.898,1.15,-.02);mesh.add(decal);
 }
 mesh.scale.setScalar(1.4);
 return {mesh,body,wheels};
}

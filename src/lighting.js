import * as THREE from 'three';

// Outdoor sky/sand reflections instead of white indoor studio panels.
export function createDesertReflections(renderer){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
 const context=canvas.getContext('2d'),gradient=context.createLinearGradient(0,0,0,128);
 for(const [stop,color] of [[0,'#8baeba'],[.43,'#d2dddb'],[.52,'#d2c3a0'],[.68,'#ad915e'],[1,'#62634b']])gradient.addColorStop(stop,color);
 context.fillStyle=gradient;context.fillRect(0,0,256,128);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.mapping=THREE.EquirectangularReflectionMapping;
 const generator=new THREE.PMREMGenerator(renderer),target=generator.fromEquirectangular(texture);
 texture.dispose();generator.dispose();return target;
}

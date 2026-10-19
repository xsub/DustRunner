import {triangleSampler} from './terrain.js';
export const DESERT_SIZE=600;
export const DESERT_SPAWN={x:0,z:210,heading:0};
// Broad wind-shaped dunes, short crests and a level starting basin.
export function desertHeight(x,z){
 const u=x*.85+z*.53,v=z*.85-x*.53;
 const waves=3.8*(1+Math.sin(u*.065))**2/4+2.5*(1+Math.sin(v*.039+1.2))/2;
 const ridges=2.6*Math.exp(-((Math.sin((u+v*.18)*.046)/.26)**2));
 const spawn=Math.min(1,Math.hypot(x-DESERT_SPAWN.x,z-DESERT_SPAWN.z)/30);
 const blend=spawn*spawn*(3-2*spawn);
 const rim=14*Math.max(0,(Math.max(Math.abs(x),Math.abs(z))-270)/30)**2;
 return 1+(waves+ridges)*blend+rim;
}
export function buildDesert(){
 const cells=240,half=DESERT_SIZE/2,step=DESERT_SIZE/cells,positions=[],indices=[],uv=[],colors=[];
 for(let z=0;z<=cells;z++)for(let x=0;x<=cells;x++){
  const wx=-half+x*step,wz=-half+z*step,h=desertHeight(wx,wz);
  positions.push(wx,h,wz);uv.push(wx/12,wz/12);const tone=.64+Math.min(h,10)*.055;colors.push(tone,Math.min(1.15,tone+.035),Math.min(1.1,tone+.055));
 }
 for(let z=0;z<cells;z++)for(let x=0;x<cells;x++){const a=z*(cells+1)+x,b=a+cells+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const vertices=new Float32Array(positions),triangles=new Uint32Array(indices);
 return {positions:vertices,indices:triangles,uv:new Float32Array(uv),colors:new Float32Array(colors),heightAt:triangleSampler(vertices,triangles),bounds:{min:{x:-half,z:-half},max:{x:half,z:half}}};
}

import {minimapTransform} from './view.js';

export function createMinimap(canvas){
 const ctx=canvas.getContext('2d');
 const background=document.createElement('canvas'),bg=background.getContext('2d');
 let points=[],halfWidth=0,transform,width=0,height=0,density=1,features=[],length=1,desert=null,dirty=true;
 function project(p){return {x:p.x*transform.scale+transform.offsetX,y:p.z*transform.scale+transform.offsetZ};}
 function rebuild(){
   dirty=true;
   if(!points.length)return;
   width=canvas.clientWidth;height=canvas.clientHeight;if(!width||!height)return;
   density=Math.min(globalThis.devicePixelRatio||1,2);
   canvas.width=background.width=Math.round(width*density);canvas.height=background.height=Math.round(height*density);
   transform=minimapTransform(points,halfWidth,width,height);dirty=false;
   bg.setTransform(density,0,0,density,0,0);bg.clearRect(0,0,width,height);
   if(desert){
    const step=10;for(let z=desert.bounds.min.z;z<desert.bounds.max.z;z+=step)for(let x=desert.bounds.min.x;x<desert.bounds.max.x;x+=step){const q=project({x,z}),h=desert.heightAt(x,z);bg.fillStyle=`hsl(39 45% ${44+Math.min(30,h*1.2)}%)`;bg.fillRect(q.x,q.y,step*transform.scale+1,step*transform.scale+1);}
    bg.strokeStyle='#e1cd93';bg.lineWidth=1;const a=project({x:desert.bounds.min.x,z:desert.bounds.min.z}),b=project({x:desert.bounds.max.x,z:desert.bounds.max.z});bg.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);bg.font='bold 7px Arial';bg.textAlign='center';for(const region of desert.regions??[]){const q=project(region);bg.fillStyle='#273321bb';bg.fillRect(q.x-19,q.y-5,38,10);bg.fillStyle='#fff2cf';bg.fillText(region.label,q.x,q.y+2);}return;
   }
   const path=new Path2D();points.forEach((p,i)=>{const q=project(p);if(!i)path.moveTo(q.x,q.y);else path.lineTo(q.x,q.y);});path.closePath();
   bg.lineJoin='round';bg.lineCap='round';bg.strokeStyle='#a59b78';bg.lineWidth=halfWidth*2*transform.scale+2;bg.stroke(path);
   bg.strokeStyle='#655640';bg.lineWidth=halfWidth*2*transform.scale;bg.stroke(path);
   bg.strokeStyle='#e1cd9366';bg.lineWidth=.6;bg.stroke(path);
   const p=points[0],t=points[1],segmentLength=Math.hypot(t.x-p.x,t.z-p.z)||1;
   const a=project({x:p.x-(t.z-p.z)/segmentLength*halfWidth,z:p.z+(t.x-p.x)/segmentLength*halfWidth});
   const b=project({x:p.x+(t.z-p.z)/segmentLength*halfWidth,z:p.z-(t.x-p.x)/segmentLength*halfWidth});
   bg.beginPath();bg.moveTo(a.x,a.y);bg.lineTo(b.x,b.y);bg.strokeStyle='#f4f2dd';bg.lineWidth=2;bg.stroke();
   for(const feature of features.filter(f=>['canyon','jump'].includes(f.kind))){
    const q=project(points[Math.round((feature.start+(feature.runup??feature.length*length*.5)/length)*points.length)%points.length]);
    bg.fillStyle=['#d9ddb2','#eda95d','#ffda63'][feature.tier??2];bg.beginPath();bg.moveTo(q.x,q.y-4);bg.lineTo(q.x+4,q.y+3);bg.lineTo(q.x-4,q.y+3);bg.closePath();bg.fill();
   }
 }
 return {
   setDesert(ground){desert=ground;points=[ground.bounds.min,ground.bounds.max];halfWidth=0;features=[];rebuild();},
   setTrack(samples,width,trackFeatures=[],trackLength=1){desert=null;points=samples;halfWidth=width;features=trackFeatures;length=trackLength;rebuild();},
   resize:rebuild,
   render(cars,color,viewCorners=[]){
     // The HUD starts hidden: its first measurable size may arrive without
     // resizing the game. Rebuild on reveal, layout changes or display density.
     if(dirty||canvas.clientWidth!==width||canvas.clientHeight!==height||density!==Math.min(globalThis.devicePixelRatio||1,2))rebuild();
     if(dirty||!transform)return;
     ctx.setTransform(density,0,0,density,0,0);ctx.clearRect(0,0,width,height);ctx.drawImage(background,0,0,width,height);
     ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
     if(viewCorners.length){ctx.beginPath();viewCorners.forEach((p,i)=>{const q=project(p);if(!i)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);});ctx.closePath();ctx.fillStyle='#e7efcb10';ctx.fill();ctx.strokeStyle='#edf3d16b';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);}
     const colors=cars.map((car,i)=>i===0?color:'#'+car.body.color.getHexString());
     for(let i=cars.length-1;i>=0;i--){const car=cars[i],p=project(car);ctx.save();ctx.translate(p.x,p.y);
       if(i===0){ctx.rotate(-car.heading);ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(3.6,4);ctx.lineTo(0,2);ctx.lineTo(-3.6,4);ctx.closePath();ctx.strokeStyle='#fffce5';ctx.lineWidth=2;ctx.fillStyle=color;ctx.fill();ctx.stroke();}
       else{ctx.beginPath();ctx.arc(0,0,2.7,0,Math.PI*2);ctx.fillStyle=colors[i];ctx.fill();ctx.strokeStyle='#e7dfc6';ctx.lineWidth=.8;ctx.stroke();}
       ctx.restore();
     }
     ctx.restore();
   },
 };
}

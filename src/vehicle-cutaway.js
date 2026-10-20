import {isOpenBody,isBiminiBody} from './body-types.js';
import {drawInstalledEngine} from './engine-anatomy.js';

// Original engineering illustration, in the game's chassis coordinates. Body
// details are illustrative; hubs, springs, axles, CG and forces use telemetry.
export const CUTAWAY_SIZE={width:720,height:380};
const C={ink:'#d5e4e5',muted:'#7798a7',frame:'#80bbc6',engine:'#dda06b',damper:'#ec8c76',spring:'#e5ca80',rubber:'#12202a',rim:'#b9d0d5',support:'#f4cf58',traction:'#6cd8dc',side:'#ef9c80',weight:'#c7b0ed'};
export function drawVehicleCutaway(ctx,d,{expanded=false}={}){
 const {width,height}=CUTAWAY_SIZE;
 ctx.save();ctx.fillStyle='#12212b';ctx.fillRect(0,0,width,height);
 ctx.lineWidth=.6;ctx.strokeStyle='#6a96a112';ctx.beginPath();
 for(let x=0;x<width;x+=20){ctx.moveTo(x,0);ctx.lineTo(x,height);}for(let y=0;y<height;y+=20){ctx.moveTo(0,y);ctx.lineTo(width,y);}ctx.stroke();
 const text=(label,x,y,color=C.muted,size=11)=>{ctx.fillStyle=color;ctx.font=`${size}px monospace`;ctx.fillText(label,x,y);};
 const line=(a,b,color=C.ink,w=1.5)=>{ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();};
 const path=(points,fill,stroke=C.ink,w=1.5,closed=true)=>{ctx.beginPath();points.forEach((p,i)=>{if(i)ctx.lineTo(...p);else ctx.moveTo(...p);});if(closed)ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke();}};
 const circle=(p,r,fill,stroke=C.ink,w=1.5)=>{ctx.beginPath();ctx.arc(...p,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke();}};
 const arrow=(a,v,color)=>{const length=Math.hypot(...v);if(length<2)return;const k=Math.min(1,62/length),end=[a[0]+v[0]*k,a[1]+v[1]*k],angle=Math.atan2(v[1],v[0]);line(a,end,color,2.4);path([end,[end[0]-7*Math.cos(angle-.42),end[1]-7*Math.sin(angle-.42)] ,[end[0]-7*Math.cos(angle+.42),end[1]-7*Math.sin(angle+.42)]],color,null);};
 line([457,40],[457,337],'#7798a73b',1);
 text('01 / PRZEKRÓJ WZDŁUŻNY',18,24,C.ink,12);text('02 / WIDOK OD PRZODU',477,24,C.ink,12);
 text('BRONCO® · RAMA / NAPĘD / ZAWIESZENIE',18,43,C.muted,9);
 if(!d){text('ODCZYT PO ROZPOCZĘCIU JAZDY',196,191,C.ink,13);ctx.restore();return;}
 const open=isOpenBody(d.style),bimini=isBiminiBody(d.style),square=['ranger','sunset','copper78','godzilla78'].includes(d.style);
 for(const side of [true,false]){
  const scale=side?72*(1-.22*Math.min(1,Math.abs(Math.sin(d.pitch))*1.4)):60*(1-.1*Math.abs(Math.sin(d.roll))),cx=side?229:586,cy=side?195:191;
  const p=v=>[cx+(side?-v.forward:-v.x)*scale,cy-v.y*scale];
  const model=(x,y,z)=>p(d.point({x,y,z}));
  const section=(a,b)=>side?model(0,b,a):model(a,b,-2.14);
  const shape=(points,fill,stroke=C.ink,w=1.5,closed=true)=>path(points.map(([a,b])=>section(a,b)),fill,stroke,w,closed);
  const seg=(a,b,color=C.ink,w=1.5)=>line(section(...a),section(...b),color,w);
  const disc=(a,b,r,fill,stroke=C.ink,w=1.5)=>circle(section(a,b),r*scale,fill,stroke,w);
  function label(name,point,x,y){const origin=p(point);line(origin,[x+(x>origin[0]?-5:5),y-4],C.muted,.8);circle(origin,2,C.frame,null);text(name,x,y,C.muted,9);}
  // Transparent sheet metal exposes mechanical components, like a workshop
  // cutaway. The wheel arches are cut out of the silhouette, not drawn across it.
  let outline;
  if(side){
   outline=open?[[-2.2,.60],[-2.07,.70],[-.43,.72],[-.18,1.64],[-.12,1.64],[-.32,.72],[2.18,.72],[2.18,-.38]]:[[-2.2,.60],[-2.07,.70],[-.43,.72],[-.18,1.64],[1.97,1.64],[2.13,1.52],[2.18,-.38]];
   const theta=Math.asin(.32/.95);
   for(const z of [1.274,-1.232]){for(let j=0;j<=18;j++){const a=theta+(Math.PI-2*theta)*j/18;outline.push([z+.95*Math.cos(a),-.7+.95*Math.sin(a)]);}}
   outline.push([-2.2,-.38]);
  }else outline=[[-1.24,-.36],[-1.24,.61],[-1.17,.74],[-1.04,1.64],[1.04,1.64],[1.17,.74],[1.24,.61],[1.24,-.36]];
  shape(outline,'#d5e4e508',C.ink,1.7);
  if(side){
   // Chassis rail, transfer case, gear housing and the exposed engine block.
   shape([[-2.07,-.45],[2.09,-.45],[2.09,-.61],[-2.07,-.61]],'#80bbc623',C.frame,2);
   seg([-1.9,-.53],[1.94,-.53],'#d5e4e550',.8);
   drawInstalledEngine({side,shape,seg,disc,engine:d.engine});
   shape([[-.79,-.12],[-.47,-.15],[.10,-.28],[.10,-.48],[-.57,-.42]],'#80bbc62e',C.frame,1.6);
   shape([[.02,-.25],[.39,-.25],[.39,-.52],[.02,-.52]],'#dda06b25',C.engine,1.6);
   // Cooling stack, fan, exhaust and fuel tank.
   shape([[-1.98,.48],[-1.88,.48],[-1.88,-.10],[-1.98,-.10]],'#80bbc618',C.frame,1);
   for(let y=-.03;y<.43;y+=.07)seg([-1.97,y],[-1.89,y],C.frame,.7);
   seg([-1.84,.19],[-1.61,.19],C.engine,2);seg([-1.45,-.14],[-.77,-.35],C.engine,1.2);seg([-.77,-.35],[1.99,-.70],C.engine,1.2);
   shape([[1.44,-.46],[2,-.46],[2,-.68],[1.44,-.68]],'#80bbc61a',C.frame,1.2);
   if(!open){shape([[-.32,.76],[-.10,1.48],[.66,1.48],[.66,.76]],'#6cd8dc0c','#a5c9d0aa',1.3);if(!bimini)shape([[.85,.76],[.85,1.48],[1.92,1.48],[1.98,.76]],'#6cd8dc0c','#a5c9d0aa',1.3);else{seg([.85,.76],[1.92,1.48],C.muted,1);seg([1.98,.76],[.85,1.48],C.muted,1);}seg([-.14,1.55],[1.98,1.55],C.ink,1);}
   else{seg([.73,.66],[.73,1.57],C.frame,3);seg([.73,1.57],[1.91,.72],C.frame,2);if(d.style==='crawler')seg([-.14,1.57],[1.91,1.57],C.frame,2);}
   seg([-.35,.70],[-.35,-.33],'#d5e4e577',1);seg([.76,.70],[.76,-.33],'#d5e4e577',1);seg([.49,.65],[.66,.65],C.ink,2.5);
   seg([-2.15,.60],[2.13,.60],'#d5e4e566',1);seg([-2.26,-.30],[-2.04,-.30],C.ink,4);seg([2.10,-.30],[2.30,-.30],C.ink,4);
   // Rear mounted spare, with its sidewall section and mounting bracket.
   seg([2.16,.2],[2.31,.2],C.frame,2);shape([[2.25,-.24],[2.44,-.24],[2.44,.77],[2.25,.77]],'#a5c9d00d',C.muted,1.2);
  }else{
   // Windshield, roof seam, fender shoulders, grille and proper headlamp bezels.
   shape([[-.98,.82],[-.88,1.48],[.88,1.48],[.98,.82]],'#6cd8dc10','#a5c9d0bb',1.4);
   seg([-1.02,1.56],[1.02,1.56],C.ink,1.6);seg([-.13,.85],[.08,.85],C.ink,1);seg([-.83,.79],[-.48,.90],C.ink,1.4);seg([.05,.79],[.40,.90],C.ink,1.4);
   shape([[-1.17,.52],[1.17,.52],[1.17,-.01],[-1.17,-.01]],'#d5e4e508',C.ink,1.4);
   shape([[-.72,.47],[.72,.47],[.72,.03],[-.72,.03]],'#0a1720',C.muted,1);
   for(let y=.11;y<.47;y+=.09)seg([-.70,y],[.70,y],'#afc7ceaa',.9);
   for(let x=-.56;x<.7;x+=.22)seg([x,.06],[x,.44],'#afc7ce88',.9);
   for(const x of [-.96,.96]){
    if(square){shape([[x-.17,.47],[x+.17,.47],[x+.17,.07],[x-.17,.07]],'#d5e4e510',C.ink,1.7);}
    else{disc(x,.27,.19,'#d5e4e510',C.ink,2);disc(x,.27,.145,null,'#d5e4e566',.8);}
    shape([[x-.11,-.09],[x+.11,-.09],[x+.11,-.02],[x-.11,-.02]],'#dda06b42',C.engine,1);
   }
   seg([-1.31,-.24],[1.31,-.24],C.rim,5);seg([-1.31,-.29],[1.31,-.29],C.muted,1);
   // Crossmember and the engine behind the grille, visible in cutaway.
   seg([-.9,-.45],[.9,-.45],C.frame,5);
   drawInstalledEngine({side,shape,seg,disc,engine:d.engine});
  }

  // Springs and dampers connect the body's true mount to each live wheel hub.
  const spring=w=>{
   const a=p(w.mount),b=p(w.hub),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=dy/len,ny=-dx/len;
   const offset=side?7:9;
   line([a[0]+nx*offset,a[1]+ny*offset],[b[0]+nx*offset,b[1]+ny*offset],C.damper,4);
   line([a[0]+nx*offset,a[1]+ny*offset],[a[0]+dx*.45+nx*offset,a[1]+dy*.45+ny*offset],'#d5e4e5',1.2);
   if(w.index%2===0){
    const coil=[];for(let i=0;i<=36;i++){const t=i/36,amp=i===0||i===36?0:4;coil.push([a[0]+dx*t+nx*Math.sin(t*Math.PI*12)*amp,a[1]+dy*t+ny*Math.sin(t*Math.PI*12)*amp]);}path(coil,null,C.spring,1.6,false);
   }else if(side){
    const front=section(.55,-.47),rear=section(2.03,-.47);
    for(let leaf=0;leaf<3;leaf++){ctx.beginPath();ctx.moveTo(...front);ctx.quadraticCurveTo(b[0],b[1]+8+leaf*3,...rear);ctx.strokeStyle=C.spring;ctx.lineWidth=1.3;ctx.stroke();}
   }
   circle(a,2.3,C.frame,null);circle(b,3,C.frame,null);
  };
  const wheel=(w,far)=>{
   const hub=p(w.hub);ctx.save();ctx.translate(...hub);ctx.rotate(side?-d.pitch:-d.roll-w.camber);
   const radius=w.radius*scale;
   if(side){
    circle([0,0],radius,far?null:C.rubber,w.contact?C.rim:C.muted,far?1:2);
    if(!far){
     circle([0,0],radius*.85,null,'#78929e88',1);circle([0,0],radius*.53,'#a5c9d018',C.rim,1.5);circle([0,0],radius*.42,null,C.muted,1);
     for(let j=0;j<24;j++){const a=w.angle+j*Math.PI/12,ca=Math.cos(a),sa=Math.sin(a);line([ca*radius*.91,sa*radius*.91],[Math.cos(a+.055)*radius*.99,Math.sin(a+.055)*radius*.99],C.muted,1.8);}
     for(let j=0;j<8;j++){const a=w.angle+j*Math.PI/4;circle([Math.cos(a)*radius*.36,Math.sin(a)*radius*.36],radius*.067,'#12202a',C.rim,1);}
     for(let j=0;j<5;j++){const a=w.angle+j*Math.PI*2/5;circle([Math.cos(a)*radius*.23,Math.sin(a)*radius*.23],1.7,C.rim,null);}
     circle([0,0],radius*.12,'#80bbc644',C.rim,1.2);
    }
   }else{
    const half=(.5*Math.cos(w.steer)+2*w.radius*Math.abs(Math.sin(w.steer)))*scale/2;
    const points=[[-half+4,-radius], [half-4,-radius],[half,-radius+7],[half,radius-7],[half-4,radius],[-half+4,radius],[-half,radius-7],[-half,-radius+7]];
    path(points,far?null:C.rubber,w.contact?C.rim:C.muted,far?1:1.8);
    if(!far){for(let j=-5;j<=5;j++){const y=j*radius/6;line([-half+3,y-2],[0,y+2],C.muted,1.2);line([0,y+2],[half-3,y-2],C.muted,1.2);}line([-half*.6,-radius+5],[-half*.6,radius-5],'#a5c9d044',.7);}
   }
   ctx.restore();
  };
  const farIndices=side?[2,3]:[1,3],nearIndices=side?[0,1]:[0,2];
  ctx.globalAlpha=.22;ctx.setLineDash([4,4]);for(const i of farIndices){spring(d.wheels[i]);wheel(d.wheels[i],true);}ctx.setLineDash([]);ctx.globalAlpha=1;
  // Exposed prop shafts, leaf springs and rigid axle/differential housings.
  if(side){
   for(const i of [0,1]){
    const hub=p(d.wheels[i].hub),transfer=section(.22,-.4);line(transfer,hub,C.frame,3);circle(hub,5,'#12212b',C.frame,1.4);
   }
  }else{
   for(const [indices,alpha] of [[[1,3],.22],[[0,2],1]]){
    ctx.globalAlpha=alpha;const a=p(d.wheels[indices[0]].hub),b=p(d.wheels[indices[1]].hub),mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];line(a,b,C.frame,7);circle(mid,10,'#203641',C.frame,1.6);line([a[0],a[1]-7],[b[0],b[1]-7],C.rim,1.5);ctx.globalAlpha=1;
   }
  }
  // X-ray suspension stays legible over the near tires instead of disappearing
  // behind their opaque tread. Geometry endpoints still use the measured hubs.
  for(const i of nearIndices){wheel(d.wheels[i],false);spring(d.wheels[i]);}
  // Contact and force overlays remain data driven, above the technical artwork.
  for(const i of side?[2,3,0,1]:[1,3,0,2]){
   const w=d.wheels[i];ctx.globalAlpha=(side?i>=2:i%2===1)?.3:1;
   if(w.contact){const ground=p(w.ground??w.hub);line([ground[0]-10,ground[1]+3],[ground[0]+10,ground[1]+3],C.muted,1.5);
    for(const [v,color] of [[w.supportVector,C.support],[side?w.tractionVector:w.sideVector,side?C.traction:C.side]])arrow(ground,[(side?-v.forward:-v.x)*.0044,-v.y*.0044],color);
   }ctx.globalAlpha=1;
  }
  const cg=p(d.center);circle(cg,5,'#12212b',C.weight,1.7);line([cg[0]-8,cg[1]],[cg[0]+8,cg[1]],C.weight,1);line([cg[0],cg[1]-8],[cg[0],cg[1]+8],C.weight,1);arrow(cg,[0,d.weight*.0044],C.weight);
  if(expanded){
   if(side){label(d.engine?.cylinders===6?'I6 / BLOK SILNIKA':'V8 / BLOK SILNIKA',d.point({x:0,y:.35,z:-1.2}),27,75);label('RAMA PODŁUŻNICOWA',d.point({x:0,y:-.52,z:-.42}),31,324);label('REDUKTOR + WAŁ',d.point({x:0,y:-.38,z:.24}),295,324);}
   else{label('MOST / MECHANIZM RÓŻNICOWY',{x:(d.wheels[0].hub.x+d.wheels[2].hub.x)/2,y:(d.wheels[0].hub.y+d.wheels[2].hub.y)/2,forward:0},482,324);}
  }
 }
 if(expanded){text('RAMA',18,339,C.frame,9);text('SILNIK',70,339,C.engine,9);text('AMORTYZATOR',130,339,C.damper,9);text('SPRĘŻYNA / RESOR',235,339,C.spring,9);}
 line([18,354],[40,354],C.support,2);text('5 kN',47,358,C.ink,10);text('Wektory >14 kN skrócone',103,358,C.muted,9);
 text(expanded?'MODEL GRY · RYSUNEK POGLĄDOWY · DYNAMIKA Z TELEMETRII':'PRZEKRÓJ MODELU GRY · ⤢ POWIĘKSZ',18,375,C.muted,9);
 ctx.restore();
}

import {t as msg} from './i18n.js';
// Slider/crank geometry for an illustrative OHV cutaway. Coordinates are
// normalized; this is kinematics, not a combustion/thermal solver.
export function sliderCrank(angle,bank=0,radius=.13,rod=.42){
 const pin={x:Math.sin(angle)*radius,y:Math.cos(angle)*radius},axis={x:Math.sin(bank),y:Math.cos(bank)};
 const along=pin.x*axis.x+pin.y*axis.y,across=pin.x*axis.y-pin.y*axis.x;
 const travel=along+Math.sqrt(Math.max(0,rod*rod-across*across));
 return {pin,piston:{x:axis.x*travel,y:axis.y*travel},travel,cam:angle/2};
}
// The slider is the wrist pin, not the piston crown. Project every joint
// with one scale so the visible conrod keeps its length throughout a turn.
export function crankAssembly(angle,bank=0,origin={x:0,y:0},scale=1){
 const k=sliderCrank(angle,bank),project=p=>({x:origin.x+p.x*scale,y:origin.y-p.y*scale});
 return {journal:{...origin},crankPin:project(k.pin),wristPin:project(k.piston)};
}
export function valveLift(angle){
 const cycle=((angle%(Math.PI*4))+Math.PI*4)%(Math.PI*4);
 return {intake:cycle<Math.PI?Math.sin(cycle):0,exhaust:cycle>Math.PI*3?Math.sin(cycle-Math.PI*3):0};
}

// Installed silhouettes use the same visible families as the large inspector.
export function drawInstalledEngine({side,shape,seg,disc,engine}){
 const godzilla=engine?.id==='godzilla73',six=engine?.cylinders===6,blue=godzilla?'#253840':'#426780',metal='#b4c4c6',copper='#d7af7a';
 if(side){
  shape([[-1.64,-.19],[-1.64,.27],[-1.46,.43],[-.74,.43],[-.63,.22],[-.73,-.19]],'#49606b55',metal,1.5);
  shape([[-1.47,.33],[-1.47,.51],[-.73,.51],[-.73,.33]],blue,metal,1.5);
  shape([[-1.55,-.18],[-.69,-.18],[-.78,-.37],[-1.46,-.37]],'#74888c44',metal,1.2);
  const count=six?6:4;
  for(let i=0;i<count;i++){const z=-1.42+i*.65/(count-1);disc(z,.22,.045,'#12212b',copper,.9);seg([z,.28],[z,.44],metal,.8);disc(z,.47,.012,'#12212b',metal,.6);}
  for(let i=0;i<5;i++)seg([-1.43+i*.15,.37],[-1.43+i*.15,.47],metal,.7);
  disc(-1.62,-.07,.13,'#344c58',metal,1.5);disc(-1.62,.18,.08,'#344c58',metal,1);
  seg([-1.72,-.07],[-1.69,.18],copper,1);seg([-1.52,-.07],[-1.55,.18],copper,1);
  if(godzilla){shape([[-1.45,.52],[-1.36,.66],[-.85,.66],[-.76,.52]],'#18242c',metal,1.2);for(let i=0;i<4;i++)seg([-1.34+i*.13,.54],[-1.29+i*.13,.63],metal,1);}
  else{shape([[-1.34,.52],[-1.34,.59],[-.95,.59],[-.95,.52]],blue,metal,1);seg([-1.31,.56],[-.98,.56],metal,1);}
 }else{
  shape(six?[[-.2,-.32],[-.24,.38],[.24,.38],[.2,-.32]]:[[-.35,-.34],[-.65,.28],[-.42,.55],[-.12,.24],[.12,.24],[.42,.55],[.65,.28],[.35,-.34]],'#49606b55',metal,1.3);
  if(!six)for(const sign of [-1,1]){shape([[sign*.15,.23],[sign*.43,.57],[sign*.64,.38],[sign*.36,.05]],blue,metal,1.4);for(const t of [.25,.36,.46])disc(sign*t,.26+(t-.25),.018,'#12212b',metal,.8);}
  shape([[-.31,-.28],[.31,-.28],[.25,-.45],[-.25,-.45]],'#74888c44',metal,1);
  disc(0,-.2,.15,'#283e49',metal,1.4);disc(0,.06,.09,'#283e49',metal,1);seg([-.15,-.2],[-.09,.06],copper,1);seg([.15,-.2],[.09,.06],copper,1);
  if(godzilla){shape([[-.2,.3],[-.17,.58],[.17,.58],[.2,.3]],'#18242c',metal,1);for(const x of [-.12,-.04,.04,.12])seg([x,.34],[x,.53],metal,.9);}
  else shape([[-.27,.41],[-.27,.48],[.27,.48],[.27,.41]],blue,metal,1);
 }
}

export function drawEngineAnatomy(ctx,data,phase=0){
 const e=data?.engine,godzilla=e?.id==='godzilla73',six=e?.cylinders===6;
 const ink='#d4e0e5',steel='#8ba6af',dark='#14232c',copper='#daae77',blue=godzilla?'#202d34':'#315879';
 ctx.save();ctx.fillStyle='#12212b';ctx.fillRect(0,0,720,380);
 const line=(a,b,color=steel,w=1.5)=>{ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();};
 const poly=(p,fill,stroke=steel,w=1.5)=>{ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke();};
 const rect=(x,y,w,h,fill,stroke=steel)=>poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],fill,stroke);
 const circle=(x,y,r,fill,stroke=steel,w=1.5)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke();};
 const text=(s,x,y,color=ink,size=11)=>{ctx.font=`${size}px monospace`;ctx.fillStyle=color;ctx.fillText(s,x,y);};
 for(let x=0;x<720;x+=20)line([x,50],[x,345],'#7c9aa710',.6);for(let y=60;y<345;y+=20)line([0,y],[720,y],'#7c9aa710',.6);
 text(e?.name??msg("engine_anatomy.engine_start_driving_for_live_data"),18,25,ink,14);
 text(msg("engine_anatomy.ohv_crank_rods_pistons_pushrods_valves"),18,44,steel,10);
 if(!e){ctx.restore();return;}
 text(six?msg("engine_anatomy.01_inline_six_section"):msg("engine_anatomy.01_v8_section_90_banks"),18,68);
 text(msg("engine_anatomy.02_cylinder_head_side_view"),435,68);
 line([415,80],[415,338],'#8ba6af40',1);
 // Cast block and sump silhouette inspired by the Reman Engine long blocks.
 poly(six?[[157,150],[243,150],[254,272],[146,272]]:[[53,161],[97,101],[170,157],[230,157],[303,101],[347,161],[290,269],[110,269]],'#34464e');
 poly([[125,260],[275,260],[263,299],[137,299]],'#354c58');
 for(let x=141;x<270;x+=18)circle(x,275,2,dark);
 const S=169,cx=200,cy=250,P=v=>[cx+v.x*S,cy-v.y*S];
 const banks=six?[0]:[-Math.PI/4,Math.PI/4];
 for(const bank of banks){
  const k=sliderCrank(phase,bank),axis={x:Math.sin(bank),y:Math.cos(bank)},normal={x:Math.cos(bank),y:-Math.sin(bank)};
  const point=(t,n)=>P({x:axis.x*t+normal.x*n,y:axis.y*t+normal.y*n});
  poly([point(.14,-.12),point(.14,.12),point(.68,.12),point(.68,-.12)],'#172c35',steel);
  const top=k.travel+.055;
  poly([point(top-.08,-.105),point(top-.08,.105),point(top,.105),point(top,-.105)],'#bac9c7',ink);
  for(const t of [-.025,-.05])line(point(top+t,-.105),point(top+t,.105),dark,1);
  line(P(k.pin),point(top-.055,0),copper,6);line(P(k.pin),point(top-.055,0),'#eed4a2',1);
  line([cx,cy],P(k.pin),steel,8);circle(...P(k.pin),7,'#6b7d80',ink);circle(...point(top-.055,0),3,dark,ink);
  // Separate head casting, valve deck and rocker cover with fasteners/ribs.
  poly([point(.65,-.17),point(.65,.17),point(.78,.17),point(.78,-.17)],'#687d84',ink);
  poly([point(.79,-.19),point(.79,.19),point(.88,.16),point(.88,-.16)],blue,steel);
  for(const n of [-.14,.14])for(const t of [.69,.75])circle(...point(t,n),2,dark,steel);
  for(let n=-.1;n<=.11;n+=.05)line(point(.80,n),point(.86,n),steel,.7);
  const lift=valveLift(phase-bank+(bank>0?Math.PI*2:0));
  for(const [n,v] of [[-.06,lift.intake],[.06,lift.exhaust]]){
   line(point(.76,n),point(.64-v*.035,n),copper,2);line(point(.64-v*.035,n-.035),point(.64-v*.035,n+.035),ink,2);
   const spring=[];for(let i=0;i<=20;i++)spring.push(point(.67+i*.0035,n+Math.sin(i*Math.PI/2)*.018));
   for(let i=1;i<spring.length;i++)line(spring[i-1],spring[i],'#d7c391',1);
   line(point(.74,n),P({x:axis.x*.28+normal.x*.17,y:axis.y*.28+normal.y*.17}),copper,1);
  }
 }
 // Crankshaft, cam timing gears and a visible 2:1 timing drive.
 circle(cx,cy,23,'#354750',ink,2);circle(cx,cy,13,dark,steel);
 circle(cx,cy-48,28,'#465862',steel);circle(cx,cy-48,5,dark,steel);
 for(const [r,y,a,teeth] of [[14,cy,phase,12],[28,cy-48,phase/2,24]])for(let j=0;j<teeth;j++){const t=a+j*Math.PI*2/teeth;line([cx+Math.cos(t)*r,y+Math.sin(t)*r],[cx+Math.cos(t)*(r+3),y+Math.sin(t)*(r+3)],copper,1.5);}
 line([cx-14,cy],[cx-28,cy-48],copper,2);line([cx+14,cy],[cx+28,cy-48],copper,2);
 if(godzilla){
  // Godzilla's EFI plenum/runners replace the round carburetor air cleaner.
  rect(169,119,62,31,'#15202a',steel);for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(173+i*14,123);ctx.quadraticCurveTo(150+i*25,148,136+i*40,157);ctx.strokeStyle=steel;ctx.lineWidth=3;ctx.stroke();}circle(200,128,10,dark,steel);text(msg("engine_anatomy.7_3_efi"),171,115,ink,9);
 }else{rect(181,139,38,18,'#b79c69',copper);poly([[153,135],[247,135],[235,122],[165,122]],'#466173',steel);line([158,129],[242,129],ink,1);}
 // Four cylinders of one bank (all six for I6); cross-plane crank phases.
 const count=six?6:4,gap=six?39:57,start=six?445:451;
 const throws=six?[0,Math.PI*2/3,Math.PI*4/3,Math.PI*4/3,Math.PI*2/3,0]:[0,Math.PI/2,Math.PI*3/2,Math.PI];
 rect(434,173,268,104,'#34464e');rect(434,143,268,30,'#687d84');rect(438,125,260,17,blue);rect(441,279,252,20,'#354c58');
 for(let i=0;i<count;i++){
  const x=start+i*gap+15,a=phase+throws[i],assembly=crankAssembly(a,0,{x,y:269},148),py=assembly.wristPin.y-8;
  rect(x-13,173,26,91,dark);rect(x-11,py,22,12,'#bdcfcb',ink);line([x-11,py+4],[x+11,py+4],dark,1);
  const pin=[assembly.crankPin.x,assembly.crankPin.y],wrist=[assembly.wristPin.x,assembly.wristPin.y];
  line([x,269],pin,steel,7);circle(x,269,4,dark,steel);
  line(pin,wrist,copper,4);circle(...pin,5,dark,copper);circle(...wrist,2.5,dark,ink);
  const lift=valveLift(a);
  for(const [dx,v] of [[-6,lift.intake],[6,lift.exhaust]]){
   const y=159+v*6;line([x+dx,136],[x+dx,y],copper,1.5);line([x+dx-4,y],[x+dx+4,y],ink,2);
   for(let j=0;j<4;j++)line([x+dx-3,143+j*3],[x+dx+3,144+j*3],copper,1);
   line([x+dx-5,137-v*2],[x+dx+4,134+v*2],ink,2);
  }
  line([x+15,235],[x+12,136],copper,1);circle(x,151,2,dark,steel);
 }
 line([438,269],[697,269],steel,2);line([438,235],[697,235],copper,1);
 text(msg("engine_anatomy.crankshaft_timing_drive_2_1"),65,325,steel,9);text(msg("engine_anatomy.head_two_valves_per_cylinder"),452,325,steel,9);
 text(msg("engine_anatomy.engine_speed_rpm",{v0:(Math.round(data.rpm??e.idle))}),18,350,ink,11);
 text(msg("engine_anatomy.illustrative_motion_1_50_ohv_kinematics"),18,369,steel,10);
 text(godzilla?msg("engine_anatomy.godzilla_7_3_modern_swap"):six?msg("engine_anatomy.inline_six_cylinder"):msg("engine_anatomy.v8_two_banks_of_four"),435,350,copper,10);
 ctx.restore();
}

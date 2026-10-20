const KEY='dust-runner-vehicle-diagram-v1',RAD=180/Math.PI;
const ORDER=[0,2,1,3],NAMES=['LP','PP','LT','PT'];
const COLORS={body:'#d9e2c5',support:'#f4cf58',traction:'#6cd8dc',side:'#ef9c80',weight:'#bbafd9'};
export function createVehicleDiagnosticsOverlay({game,toggle,getDiagnostics,onInteract}){
 let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)??'{}')??{};}catch{}
 let visible=saved.visible!==false,collapsed=typeof saved.collapsed==='boolean'?saved.collapsed:matchMedia('(max-width:720px)').matches;
 let position=saved.position&&Number.isFinite(saved.position.x)&&Number.isFinite(saved.position.y)?saved.position:null,lastPaint=-Infinity,drag;
 const panel=document.createElement('aside');panel.id='vehicle-diagnostics';panel.className='vehicle-diagnostics';panel.setAttribute('aria-label','Przekroje auta, siły i praca zawieszenia');
 panel.innerHTML=`<div class="vehicle-diagram-heading" title="Przeciągnij okienko"><strong>SIŁY · ZAWIESZENIE</strong><button class="diagram-collapse" aria-controls="vehicle-diagram-details">−</button><button class="diagram-hide" aria-label="Ukryj przekroje auta" title="Włącz ponownie w Menu → Przekroje auta">×</button></div><div id="vehicle-diagram-details"><canvas width="520" height="276" role="img" aria-label="Przekroje z boku i od przodu: nadwozie, koła, sprężyny i wektory sił"></canvas><p class="diagram-attitude"></p><table aria-label="Telemetria czterech kół"><thead><tr><th>Koło</th><th title="Ugięcie względem długości spoczynkowej; minus oznacza rozprężenie">Δ mm</th><th>Skręt °</th><th title="Pochylenie osi względem nadwozia">Kąt °</th><th>RPM</th><th title="Prędkość obwodowa opony, ze znakiem obrotów">km/h</th></tr></thead><tbody>${ORDER.map((i,n)=>`<tr data-wheel="${i}"><th>${NAMES[n]}</th>${'<td>—</td>'.repeat(5)}</tr>`).join('')}</tbody></table><div class="diagram-legend"><span class="support">↑ N</span><span class="traction">→ napęd / ham.</span><span class="side">↔ boczna</span><span class="weight">↓ mg</span></div><p class="diagram-load"></p><small>LP/PP przód · LT/PT tył · szare = bez kontaktu<br>Siły kN · kreska = 5 kN · odczyt 10 Hz</small></div>`;
 game.append(panel);
 const heading=panel.querySelector('.vehicle-diagram-heading'),details=panel.querySelector('#vehicle-diagram-details'),collapse=panel.querySelector('.diagram-collapse'),canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d');
 const attitude=panel.querySelector('.diagram-attitude'),load=panel.querySelector('.diagram-load'),rows=ORDER.map(i=>panel.querySelector(`[data-wheel="${i}"]`));
 function save(){try{localStorage.setItem(KEY,JSON.stringify({visible,collapsed,position}));}catch{}}
 function place(){if(!visible)return;const x=Math.max(0,game.clientWidth-panel.offsetWidth),y=Math.max(0,game.clientHeight-panel.offsetHeight);panel.style.left=Math.round(position?Math.max(0,Math.min(1,position.x))*x:Math.min(x,12))+'px';panel.style.top=Math.round(position?Math.max(0,Math.min(1,position.y))*y:Math.min(y,game.clientWidth<=720?100:88))+'px';}
 function visibility(){panel.hidden=!visible;details.hidden=collapsed;panel.classList.toggle('diagram-collapsed',collapsed);toggle.checked=visible;collapse.textContent=collapsed?'+':'−';collapse.setAttribute('aria-expanded',String(!collapsed));collapse.setAttribute('aria-label',collapsed?'Rozwiń przekroje auta':'Zwiń przekroje auta');lastPaint=-Infinity;place();}
 collapse.onclick=()=>{collapsed=!collapsed;visibility();save();onInteract();};
 panel.querySelector('.diagram-hide').onclick=()=>{visible=false;visibility();save();onInteract();};
 toggle.onchange=()=>{visible=toggle.checked;visibility();save();};
 heading.addEventListener('keydown',event=>event.stopPropagation());
 heading.onpointerdown=e=>{if(e.button!==0||e.target.closest('button'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:panel.offsetLeft,top:panel.offsetTop};heading.setPointerCapture(e.pointerId);e.preventDefault();};
 heading.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;const x=Math.max(0,game.clientWidth-panel.offsetWidth),y=Math.max(0,game.clientHeight-panel.offsetHeight);position={x:x?Math.max(0,Math.min(x,drag.left+e.clientX-drag.x))/x:0,y:y?Math.max(0,Math.min(y,drag.top+e.clientY-drag.y))/y:0};place();};
 heading.onpointerup=heading.onpointercancel=()=>{if(!drag)return;drag=null;save();onInteract();};
 new ResizeObserver(place).observe(game);new ResizeObserver(place).observe(panel);visibility();
 function line(a,b,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}
 function arrow(start,vector,color){
  const length=Math.hypot(...vector);if(length<1)return;
  // Capped at 22px to keep impact spikes inside this tiny diagram.
  const factor=Math.min(1,22/length),dx=vector[0]*factor,dy=vector[1]*factor,end=[start[0]+dx,start[1]+dy],angle=Math.atan2(dy,dx);
  line(start,end,color,1.3);line(end,[end[0]-3*Math.cos(angle-.5),end[1]-3*Math.sin(angle-.5)],color);line(end,[end[0]-3*Math.cos(angle+.5),end[1]-3*Math.sin(angle+.5)],color);
 }
 function draw(d){
  ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,260,138);ctx.font='8px monospace';ctx.fillStyle='#aebda0';ctx.fillText('Z BOKU · przód ←',7,11);ctx.fillText('OD PRZODU',151,11);
  line([139,20],[139,126],'#c6d2b326');
  for(const side of [true,false]){
   const scale=side?22:24,cx=side?72:202,cy=67;
   const project=p=>[cx+(side?-p.forward:-p.x)*scale,cy-p.y*scale];
   // The wire body follows the complete rigid-body orientation, including a rollover.
   const outline=side?[[0,-.3,-2.2],[0,.65,-2.2],[0,.7,-.35],[0,1.6,.1],[0,1.6,1.85],[0,-.3,1.85]]:[[-1.24,-.3,-1.2],[-1.24,.6,-1.2],[-1.05,1.6,-1.2],[1.05,1.6,-1.2],[1.24,.6,-1.2],[1.24,-.3,-1.2]];
   ctx.beginPath();outline.forEach(([x,y,z],i)=>{const p=project(d.point({x,y,z}));if(i)ctx.lineTo(...p);else ctx.moveTo(...p);});ctx.closePath();ctx.strokeStyle=COLORS.body;ctx.lineWidth=1.2;ctx.stroke();
   for(const i of side?[2,3,0,1]:[1,3,0,2]){
    const w=d.wheels[i],far=side?i>=2:i%2===1,mount=project(w.mount),hub=project(w.hub),color=w.contact?COLORS.support:'#6e7c6a';
    ctx.globalAlpha=far?.35:1;
    // Zigzag spring from its actual attachment to its independently moving hub.
    const dx=hub[0]-mount[0],dy=hub[1]-mount[1],len=Math.hypot(dx,dy)||1;ctx.beginPath();ctx.moveTo(...mount);
    for(let j=1;j<7;j++){const offset=j%2?2:-2;ctx.lineTo(mount[0]+dx*j/7+dy/len*offset,mount[1]+dy*j/7-dx/len*offset);}ctx.lineTo(...hub);ctx.strokeStyle=color;ctx.lineWidth=1;ctx.stroke();
    ctx.save();ctx.translate(...hub);ctx.rotate(side?-d.pitch:-d.roll-w.camber);ctx.strokeStyle=w.contact?COLORS.body:'#6e7c6a';ctx.lineWidth=2;
    if(side){ctx.beginPath();ctx.arc(0,0,w.radius*scale,0,Math.PI*2);ctx.stroke();
     // White hub mark uses integrated wheel angle; it is a visualization at
     // 10Hz and can alias at speed. The RPM table remains authoritative.
     const angle=w.angle;line([0,0],[Math.cos(angle)*w.radius*scale*.65,Math.sin(angle)*w.radius*scale*.65],COLORS.body);
    }else{ctx.strokeRect(-4,-w.radius*scale,8,w.radius*scale*2);const a=w.steer;line([-Math.sin(a)*5,Math.cos(a)*5],[Math.sin(a)*5,-Math.cos(a)*5],COLORS.traction,1.5);}
    ctx.restore();
    if(w.contact){const ground=project(w.ground??w.hub);line([ground[0]-5,ground[1]],[ground[0]+5,ground[1]],'#839472');
     for(const [v,c] of [[w.supportVector,COLORS.support],[side?w.tractionVector:w.sideVector,side?COLORS.traction:COLORS.side]])arrow(ground,[(side?-v.forward:-v.x)*.0024,-v.y*.0024],c);
    }
    ctx.globalAlpha=1;
   }
   const cg=project(d.center);ctx.fillStyle=COLORS.weight;ctx.beginPath();ctx.arc(...cg,2,0,Math.PI*2);ctx.fill();arrow(cg,[0,d.weight*.0024],COLORS.weight);
  }
  line([9,132],[21,132],COLORS.support,1.3);ctx.fillStyle='#aebda0';ctx.fillText('5 kN  (wektory >9 kN skrócone)',26,135);
 }
 // The overlay never integrates its own wheel motion or modifies the car.
 return {update(now){
  if(!visible||collapsed||document.hidden||now-lastPaint<100)return;
  lastPaint=now;const d=getDiagnostics();
  if(!d){
   ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,260,138);ctx.font='10px monospace';ctx.fillStyle=COLORS.body;ctx.fillText('ODCZYT PO ROZPOCZĘCIU JAZDY',14,70);
   attitude.textContent='Pochylenie — · przechył —';load.textContent='Siły kontaktu —';
   for(const row of rows){delete row.dataset.contact;row.removeAttribute('title');row.querySelectorAll('td').forEach(td=>td.textContent='—');}return;
  }
  draw(d);
  const degrees=x=>(x*RAD).toFixed(1);
  attitude.textContent=`Pochylenie ${degrees(d.pitch)}° · przechył ${degrees(d.roll)}°`;
  rows.forEach((row,n)=>{const w=d.wheels[ORDER[n]],values=[Math.round(w.compression*1000),degrees(w.steer),degrees(w.camber),Math.round(w.rpm),w.speed.toFixed(1)];row.dataset.contact=String(w.contact);row.title=`${w.contact?'Kontakt':'W powietrzu'} · N ${(w.support/1000).toFixed(1)} kN · napęd/ham. ${(w.longitudinal/1000).toFixed(1)} kN · boczna ${(w.lateral/1000).toFixed(1)} kN`;row.querySelectorAll('td').forEach((td,i)=>td.textContent=values[i]);});
  load.textContent=`N ${(d.support/1000).toFixed(1)} kN · mg ${(d.weight/1000).toFixed(1)} kN · kontakt ${d.contacts}/4`;
 }};
}

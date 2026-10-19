import {FrameStats} from './frame-stats.js';
const STORAGE_KEY='dust-runner-stats-v1';
export function createStatsOverlay({game,toggle,getDiagnostics,onInteract}){
 let saved={};try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)??'{}')??{};}catch{}
 let visible=typeof saved.visible==='boolean'?saved.visible:true,collapsed=typeof saved.collapsed==='boolean'?saved.collapsed:matchMedia('(max-width:720px)').matches;
 let position=saved.position&&Number.isFinite(saved.position.x)&&Number.isFinite(saved.position.y)?{x:Math.max(0,Math.min(1,saved.position.x)),y:Math.max(0,Math.min(1,saved.position.y))}:null;
 const panel=document.createElement('aside');panel.id='performance-stats';panel.className='performance-stats';panel.setAttribute('aria-label','FPS i statystyki gry');
 panel.innerHTML=`<div class="stats-heading" title="Przeciągnij, aby przenieść okienko"><strong><span id="stats-fps">—</span> <small>FPS</small></strong><button id="stats-collapse" aria-controls="stats-details" title="Zwiń / rozwiń statystyki">−</button><button id="stats-hide" aria-label="Ukryj statystyki" title="Ukryj; włącz ponownie w Menu → FPS i statystyki">×</button></div><div id="stats-details" class="stats-details"><dl><div><dt>Klatka / P95</dt><dd id="stats-frame">—</dd></div><div><dt title="Czas pętli JavaScript i zlecania renderowania, bez oczekiwania na kolejną klatkę. To nie jest pomiar czasu GPU.">CPU pętli</dt><dd id="stats-cpu">—</dd></div><div><dt>Fizyka</dt><dd id="stats-physics">—</dd></div><div><dt>Kroki fizyki</dt><dd id="stats-steps">—</dd></div><div><dt>Rysowanie</dt><dd id="stats-draw">—</dd></div><div><dt>Trójkąty</dt><dd id="stats-triangles">—</dd></div><div><dt>Geom. / tekst.</dt><dd id="stats-resources">—</dd></div><div><dt>Ciała aktywne</dt><dd id="stats-bodies">—</dd></div><div><dt>Prędkość</dt><dd id="stats-speed">—</dd></div><div><dt>Silnik</dt><dd id="stats-engine">—</dd></div><div><dt>Masa / kontakt</dt><dd id="stats-contact">—</dd></div><div><dt>Ruch pionowy</dt><dd id="stats-vertical">—</dd></div></dl><small id="stats-phase">GOTOWY · średnia ~2 s</small></div>`;
 game.append(panel);const $=selector=>panel.querySelector(selector),heading=$('.stats-heading'),tracker=new FrameStats();let lastPaint=0,drag=null;
 function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({visible,collapsed,position}));}catch{}}
 function place(){
  if(panel.hidden)return;
  const maxX=Math.max(0,game.clientWidth-panel.offsetWidth),maxY=Math.max(0,game.clientHeight-panel.offsetHeight);
  panel.style.right='auto';panel.style.left=Math.round(position?position.x*maxX:Math.max(0,maxX-(game.clientWidth<=720?12:18)))+'px';panel.style.top=Math.round(position?position.y*maxY:Math.min(maxY,game.clientWidth<=720?57:64))+'px';
 }
 function updateVisibility(){panel.hidden=!visible;panel.classList.toggle('stats-collapsed',collapsed);$('#stats-details').hidden=collapsed;$('#stats-collapse').textContent=collapsed?'+':'−';$('#stats-collapse').setAttribute('aria-label',collapsed?'Rozwiń statystyki':'Zwiń statystyki');$('#stats-collapse').setAttribute('aria-expanded',String(!collapsed));toggle.checked=visible;place();}
 $('#stats-collapse').onclick=()=>{collapsed=!collapsed;updateVisibility();persist();onInteract();};
 $('#stats-hide').onclick=()=>{visible=false;updateVisibility();persist();onInteract();};
 toggle.onchange=()=>{visible=toggle.checked;tracker.reset();lastPaint=0;updateVisibility();persist();};
 heading.addEventListener('keydown',event=>event.stopPropagation());
 heading.onpointerdown=event=>{
  if(event.target.closest('button')||event.button!==0)return;
  drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,left:panel.offsetLeft,top:panel.offsetTop};heading.setPointerCapture(event.pointerId);event.preventDefault();
 };
 heading.onpointermove=event=>{
  if(!drag||drag.pointer!==event.pointerId)return;
  const maxX=Math.max(0,game.clientWidth-panel.offsetWidth),maxY=Math.max(0,game.clientHeight-panel.offsetHeight),x=Math.max(0,Math.min(maxX,drag.left+event.clientX-drag.x)),y=Math.max(0,Math.min(maxY,drag.top+event.clientY-drag.y));
  position={x:maxX?x/maxX:0,y:maxY?y/maxY:0};place();
 };
 const endDrag=()=>{if(!drag)return;drag=null;persist();onInteract();};heading.onpointerup=heading.onpointercancel=endDrag;
 new ResizeObserver(place).observe(game);new ResizeObserver(place).observe(panel);
 document.addEventListener('visibilitychange',()=>{tracker.reset();lastPaint=0;});updateVisibility();
 const text=(selector,value)=>{$(selector).textContent=value;},compact=n=>n>=1000000?(n/1000000).toFixed(1)+' M':n>=1000?Math.round(n/1000)+' k':String(n);
 return {record(now,timing){
  if(!visible||document.hidden)return;
  tracker.record(now,timing);if(now-lastPaint<500)return;lastPaint=now;const stats=tracker.snapshot();if(!stats)return;
  text('#stats-fps',Math.round(stats.fps));panel.dataset.rate=stats.fps>=50?'good':stats.fps>=30?'fair':'slow';
  if(collapsed)return;
  const d=getDiagnostics();text('#stats-frame',stats.frameMs.toFixed(1)+' / '+stats.p95Ms.toFixed(1)+' ms');text('#stats-cpu',stats.cpuMs.toFixed(1)+' ms');text('#stats-physics',stats.physicsMs.toFixed(1)+' ms');text('#stats-steps',Math.round(stats.physicsHz)+'/s · '+stats.stepsPerFrame.toFixed(1)+'/kl.');
  text('#stats-draw',d.calls+' wywołań');text('#stats-triangles',compact(d.triangles));text('#stats-resources',d.geometries+' / '+d.textures);text('#stats-bodies',d.awake+' / '+d.bodies);text('#stats-speed',d.speed+' km/h');text('#stats-engine',d.gear+' · '+d.rpm+' RPM');text('#stats-contact',d.mass+' kg · '+d.contacts+'/4');text('#stats-vertical',d.vertical+' m/s');text('#stats-phase',d.phase+' · średnia ~2 s');
 }};
}

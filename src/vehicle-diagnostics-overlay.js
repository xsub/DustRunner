import {drawEngineAnatomy} from './engine-anatomy.js';
import {drawVehicleCutaway} from './vehicle-cutaway.js';
const KEY='dust-runner-vehicle-diagram-v1',RAD=180/Math.PI;
const ORDER=[0,2,1,3],NAMES=['LP','PP','LT','PT'];
export function createVehicleDiagnosticsOverlay({game,toggle,getDiagnostics,getEnginePreview,onInteract}){
 let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)??'{}')??{};}catch{}
 let visible=saved.visible!==false,collapsed=typeof saved.collapsed==='boolean'?saved.collapsed:matchMedia('(max-width:720px)').matches;
 let expanded=saved.expanded===true,view=saved.view==='engine'?'engine':'vehicle',enginePhase=0;
 let position=saved.position&&Number.isFinite(saved.position.x)&&Number.isFinite(saved.position.y)?saved.position:null,lastPaint=-Infinity,drag;
 const panel=document.createElement('aside');panel.id='vehicle-diagnostics';panel.className='vehicle-diagnostics';panel.setAttribute('aria-label','Przekroje auta, siły i praca zawieszenia');
 panel.innerHTML=`<div class="vehicle-diagram-heading" title="Przeciągnij okienko"><strong>SIŁY · ZAWIESZENIE</strong><button class="diagram-zoom" aria-label="Powiększ przekroje" title="Powiększ / pomniejsz rysunki techniczne" aria-pressed="false">⤢</button><button class="diagram-collapse" aria-controls="vehicle-diagram-details">−</button><button class="diagram-hide" aria-label="Ukryj przekroje auta" title="Włącz ponownie w Menu → Przekroje auta">×</button></div><div id="vehicle-diagram-details"><div class="diagram-viewbar"><button type="button" data-diagram-view="vehicle" aria-pressed="true">AUTO · ZAWIESZENIE</button><button type="button" data-diagram-view="engine" aria-pressed="false">SILNIK · OHV</button></div><canvas width="1440" height="760" role="img" aria-label="Przekroje z boku i od przodu: nadwozie, silnik, rama, mosty, amortyzatory, koła i wektory sił"></canvas><p class="diagram-engine-summary" hidden></p><p class="diagram-engine-source" hidden>Wzorce budowy: <a href="https://reman-engine.com/remanufactured-engines/ford/bronco/1978/8-351m-5.8l" target="_blank" rel="noopener">Reman 351M</a> · <a href="https://reman-engine.com/remanufactured-engines/ford/bronco/1978/8-400-6.6l" target="_blank" rel="noopener">400</a> · <a href="https://www.ford.com/cmslibs/content/dam/brand_ford/en_us/brand/resources/general/pdf/guides/20Towing_Ford_SuperDutyPU_r2_Dec17.pdf" target="_blank" rel="noopener">Ford 7.3</a></p><p class="diagram-attitude"></p><table aria-label="Telemetria czterech kół"><thead><tr><th>Koło</th><th title="Ugięcie względem długości spoczynkowej; minus oznacza rozprężenie">Δ mm</th><th>Skręt °</th><th title="Pochylenie osi względem nadwozia">Kąt °</th><th>RPM</th><th title="Prędkość obwodowa opony, ze znakiem obrotów">km/h</th></tr></thead><tbody>${ORDER.map((i,n)=>`<tr data-wheel="${i}"><th>${NAMES[n]}</th>${'<td>—</td>'.repeat(5)}</tr>`).join('')}</tbody></table><div class="diagram-legend"><span class="support">↑ N</span><span class="traction">→ napęd / ham.</span><span class="side">↔ boczna</span><span class="weight">↓ mg</span></div><p class="diagram-load"></p><small>LP/PP przód · LT/PT tył · szare = bez kontaktu<br>Siły kN · kreska = 5 kN · odczyt 10 Hz</small></div>`;
 game.append(panel);
 const heading=panel.querySelector('.vehicle-diagram-heading'),details=panel.querySelector('#vehicle-diagram-details'),collapse=panel.querySelector('.diagram-collapse'),canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d');
 const attitude=panel.querySelector('.diagram-attitude'),load=panel.querySelector('.diagram-load'),rows=ORDER.map(i=>panel.querySelector(`[data-wheel="${i}"]`));
 function save(){try{localStorage.setItem(KEY,JSON.stringify({visible,collapsed,expanded,view,position}));}catch{}}
 function place(){if(!visible)return;const x=Math.max(0,game.clientWidth-panel.offsetWidth),y=Math.max(0,game.clientHeight-panel.offsetHeight);panel.style.left=Math.round(position?Math.max(0,Math.min(1,position.x))*x:Math.min(x,12))+'px';panel.style.top=Math.round(position?Math.max(0,Math.min(1,position.y))*y:Math.min(y,game.clientWidth<=720?100:88))+'px';}
 function visibility(){panel.dataset.view=view;panel.querySelectorAll('[data-diagram-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.diagramView===view)));panel.querySelector('.diagram-engine-summary').hidden=view!=='engine';panel.querySelector('.diagram-engine-source').hidden=view!=='engine';panel.hidden=!visible;details.hidden=collapsed;panel.classList.toggle('diagram-collapsed',collapsed);panel.classList.toggle('diagram-expanded',expanded&&!collapsed);const zoom=panel.querySelector('.diagram-zoom');zoom.setAttribute('aria-pressed',String(expanded));zoom.setAttribute('aria-label',expanded?'Pomniejsz przekroje':'Powiększ przekroje');zoom.textContent=expanded?'⤡':'⤢';toggle.checked=visible;collapse.textContent=collapsed?'+':'−';collapse.setAttribute('aria-expanded',String(!collapsed));collapse.setAttribute('aria-label',collapsed?'Rozwiń przekroje auta':'Zwiń przekroje auta');lastPaint=-Infinity;place();}
 function resizePanel(change){
  const left=panel.offsetLeft,top=panel.offsetTop;change();visibility();
  const maxX=Math.max(0,game.clientWidth-panel.offsetWidth),maxY=Math.max(0,game.clientHeight-panel.offsetHeight);
  position={x:maxX?Math.max(0,Math.min(1,left/maxX)):0,y:maxY?Math.max(0,Math.min(1,top/maxY)):0};place();save();onInteract();
 }
 panel.querySelector('.diagram-zoom').onclick=()=>resizePanel(()=>{expanded=!expanded;collapsed=false;});
 collapse.onclick=()=>resizePanel(()=>{collapsed=!collapsed;});
 panel.querySelector('.diagram-hide').onclick=()=>{visible=false;visibility();save();onInteract();};
 toggle.onchange=()=>{visible=toggle.checked;visibility();save();};
 panel.querySelectorAll('[data-diagram-view]').forEach(button=>button.onclick=()=>resizePanel(()=>{view=button.dataset.diagramView;}));
 heading.addEventListener('keydown',event=>event.stopPropagation());
 heading.onpointerdown=e=>{if(e.button!==0||e.target.closest('button'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:panel.offsetLeft,top:panel.offsetTop};heading.setPointerCapture(e.pointerId);e.preventDefault();};
 heading.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;const x=Math.max(0,game.clientWidth-panel.offsetWidth),y=Math.max(0,game.clientHeight-panel.offsetHeight);position={x:x?Math.max(0,Math.min(x,drag.left+e.clientX-drag.x))/x:0,y:y?Math.max(0,Math.min(y,drag.top+e.clientY-drag.y))/y:0};place();};
 heading.onpointerup=heading.onpointercancel=()=>{if(!drag)return;drag=null;save();onInteract();};
 new ResizeObserver(place).observe(game);new ResizeObserver(place).observe(panel);visibility();
 function draw(data){ctx.setTransform(2,0,0,2,0,0);if(view==='engine')drawEngineAnatomy(ctx,data,enginePhase);else drawVehicleCutaway(ctx,data,{expanded});}
 // The overlay never integrates its own wheel motion or modifies the car.
 return {update(now){
  if(!visible||collapsed||document.hidden||now-lastPaint<100)return;
  const elapsed=Number.isFinite(lastPaint)?Math.min(.15,(now-lastPaint)/1000):0;lastPaint=now;const d=getDiagnostics()??(view==='engine'?getEnginePreview?.():null);
  if(!d){
   draw(null);panel.querySelector('.diagram-engine-summary').textContent='Uruchom jazdę, aby obejrzeć wybrany silnik.';
   attitude.textContent='Pochylenie — · przechył —';load.textContent='Siły kontaktu —';
   for(const row of rows){delete row.dataset.contact;row.removeAttribute('title');row.querySelectorAll('td').forEach(td=>td.textContent='—');}return;
  }
  if(view==='engine'&&d.running!==false)enginePhase=(enginePhase+(d.rpm??d.engine.idle)/60*Math.PI*2*elapsed/50)%(Math.PI*4);
  draw(d);
  if(view==='engine'){panel.querySelector('.diagram-engine-summary').textContent=`${d.engine.liters} L · ${d.engine.cylinders} CYL · OHV · ${Math.round(d.rpm)} RPM · animacja ×1/50`;return;}
  const degrees=x=>(x*RAD).toFixed(1);
  attitude.textContent=`Pochylenie ${degrees(d.pitch)}° · przechył ${degrees(d.roll)}°`;
  rows.forEach((row,n)=>{const w=d.wheels[ORDER[n]],values=[Math.round(w.compression*1000),degrees(w.steer),degrees(w.camber),Math.round(w.rpm),w.speed.toFixed(1)];row.dataset.contact=String(w.contact);row.title=`${w.contact?'Kontakt':'W powietrzu'} · N ${(w.support/1000).toFixed(1)} kN · napęd/ham. ${(w.longitudinal/1000).toFixed(1)} kN · boczna ${(w.lateral/1000).toFixed(1)} kN`;row.querySelectorAll('td').forEach((td,i)=>td.textContent=values[i]);});
  load.textContent=`N ${(d.support/1000).toFixed(1)} kN · mg ${(d.weight/1000).toFixed(1)} kN · kontakt ${d.contacts}/4`;
 }};
}

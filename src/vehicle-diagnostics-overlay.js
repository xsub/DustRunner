import {formatFixed,t as msg,tx as msgHTML} from './i18n.js';
import {drawEngineAnatomy} from './engine-anatomy.js';
import {drawVehicleCutaway} from './vehicle-cutaway.js';
const KEY='dust-runner-vehicle-diagram-v1',RAD=180/Math.PI;
const ORDER=[0,2,1,3],NAMES=[msg('vehicle.frontLeft'),msg('vehicle.frontRight'),msg('vehicle.rearLeft'),msg('vehicle.rearRight')];
export function createVehicleDiagnosticsOverlay({game,toggle,getDiagnostics,getEnginePreview,onInteract}){
 let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)??'{}')??{};}catch{}
 let visible=typeof saved.visible==='boolean'?saved.visible:false,collapsed=typeof saved.collapsed==='boolean'?saved.collapsed:matchMedia('(max-width:720px)').matches;
 let expanded=saved.expanded===true,view=saved.view==='engine'?'engine':'vehicle',enginePhase=0;
 let position=saved.position&&Number.isFinite(saved.position.x)&&Number.isFinite(saved.position.y)?saved.position:null,lastPaint=-Infinity,drag;
 const panel=document.createElement('aside');panel.id='vehicle-diagnostics';panel.className='vehicle-diagnostics';panel.setAttribute('aria-label',msg("vehicle_diagnostics_overlay.vehicle_cutaways_forces_and_suspension_motion"));
 panel.innerHTML=`<div class="vehicle-diagram-heading" title="${msgHTML("vehicle_diagnostics_overlay.drag_this_panel")}"><strong>${msgHTML("vehicle_diagnostics_overlay.forces_suspension")}</strong><button class="diagram-zoom" aria-label="${msgHTML("vehicle_diagnostics_overlay.enlarge_cutaways")}" title="${msgHTML("vehicle_diagnostics_overlay.enlarge_or_reduce_technical_diagrams")}" aria-pressed="false">⤢</button><button class="diagram-collapse" aria-controls="vehicle-diagram-details">−</button><button class="diagram-hide" aria-label="${msgHTML("vehicle_diagnostics_overlay.hide_vehicle_cutaways")}" title="${msgHTML("vehicle_diagnostics_overlay.show_again_in_menu_stats_car")}">×</button></div><div id="vehicle-diagram-details"><div class="diagram-viewbar"><button type="button" data-diagram-view="vehicle" aria-pressed="true">${msgHTML("vehicle_diagnostics_overlay.car_suspension")}</button><button type="button" data-diagram-view="engine" aria-pressed="false">${msgHTML("vehicle_diagnostics_overlay.engine_ohv")}</button></div><canvas width="1440" height="760" role="img" aria-label="${msgHTML("vehicle_diagnostics_overlay.side_and_front_cutaways_body_engine")}"></canvas><p class="diagram-engine-summary" hidden></p><p class="diagram-engine-source" hidden>${msgHTML("vehicle_diagnostics_overlay.construction_references")} <a href="https://reman-engine.com/remanufactured-engines/ford/bronco/1978/8-351m-5.8l" target="_blank" rel="noopener">${msgHTML("vehicle_diagnostics_overlay.reman_351m")}</a> · <a href="https://reman-engine.com/remanufactured-engines/ford/bronco/1978/8-400-6.6l" target="_blank" rel="noopener">400</a> · <a href="https://www.ford.com/cmslibs/content/dam/brand_ford/en_us/brand/resources/general/pdf/guides/20Towing_Ford_SuperDutyPU_r2_Dec17.pdf" target="_blank" rel="noopener">${msgHTML("vehicle_diagnostics_overlay.ford_7_3")}</a></p><p class="diagram-attitude"></p><table aria-label="${msgHTML("vehicle_diagnostics_overlay.four_wheel_telemetry")}"><thead><tr><th>${msgHTML("vehicle_diagnostics_overlay.wheel")}</th><th title="${msgHTML("vehicle_diagnostics_overlay.travel_relative_to_rest_length_negative")}">${msgHTML("vehicle_diagnostics_overlay.mm")}</th><th>${msgHTML("vehicle_diagnostics_overlay.steer")}</th><th title="${msgHTML("vehicle_diagnostics_overlay.axle_angle_relative_to_the_body")}">${msgHTML("vehicle_diagnostics_overlay.angle")}</th><th>${msgHTML("instrument_panel.rpm")}</th><th title="${msgHTML("vehicle_diagnostics_overlay.tire_circumference_speed_signed_by_rotation")}">${msgHTML("vehicle_diagnostics_overlay.km_h")}</th></tr></thead><tbody>${ORDER.map((i,n)=>`<tr data-wheel="${i}"><th>${NAMES[n]}</th>${`<td>—</td>`.repeat(5)}</tr>`).join('')}</tbody></table><div class="diagram-legend"><span class="support">${msgHTML("vehicle_diagnostics_overlay.n")}</span><span class="traction">${msgHTML("vehicle_diagnostics_overlay.drive_brake")}</span><span class="side">${msgHTML("vehicle_diagnostics_overlay.lateral")}</span><span class="weight">${msgHTML("vehicle_diagnostics_overlay.mg")}</span></div><p class="diagram-load"></p><small>${msgHTML("vehicle_diagnostics_overlay.fl_fr_front_rl_rr_rear")}<br>${msgHTML("vehicle_diagnostics_overlay.forces_in_kn_tick_5_kn")}</small></div>`;
 game.append(panel);
 const heading=panel.querySelector('.vehicle-diagram-heading'),details=panel.querySelector('#vehicle-diagram-details'),collapse=panel.querySelector('.diagram-collapse'),canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d');
 const attitude=panel.querySelector('.diagram-attitude'),load=panel.querySelector('.diagram-load'),rows=ORDER.map(i=>panel.querySelector(`[data-wheel="${i}"]`));
 function save(){try{localStorage.setItem(KEY,JSON.stringify({visible,collapsed,expanded,view,position}));}catch{}}
 function place(){if(!visible)return;const x=Math.max(0,game.clientWidth-panel.offsetWidth),y=Math.max(0,game.clientHeight-panel.offsetHeight);panel.style.left=Math.round(position?Math.max(0,Math.min(1,position.x))*x:Math.min(x,12))+'px';panel.style.top=Math.round(position?Math.max(0,Math.min(1,position.y))*y:Math.min(y,game.clientWidth<=720?100:88))+'px';}
 function visibility(){panel.dataset.view=view;panel.querySelectorAll('[data-diagram-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.diagramView===view)));panel.querySelector('.diagram-engine-summary').hidden=view!=='engine';panel.querySelector('.diagram-engine-source').hidden=view!=='engine';panel.hidden=!visible;details.hidden=collapsed;panel.classList.toggle('diagram-collapsed',collapsed);panel.classList.toggle('diagram-expanded',expanded&&!collapsed);const zoom=panel.querySelector('.diagram-zoom');zoom.setAttribute('aria-pressed',String(expanded));zoom.setAttribute('aria-label',expanded?msg("vehicle_diagnostics_overlay.reduce_cutaways"):msg("vehicle_diagnostics_overlay.enlarge_cutaways"));zoom.textContent=expanded?'⤡':'⤢';toggle.checked=visible;collapse.textContent=collapsed?'+':'−';collapse.setAttribute('aria-expanded',String(!collapsed));collapse.setAttribute('aria-label',collapsed?msg("vehicle_diagnostics_overlay.expand_vehicle_cutaways"):msg("vehicle_diagnostics_overlay.collapse_vehicle_cutaways"));lastPaint=-Infinity;place();}
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
   draw(null);panel.querySelector('.diagram-engine-summary').textContent=msg("vehicle_diagnostics_overlay.start_driving_to_inspect_the_selected");
   attitude.textContent=msg("vehicle_diagnostics_overlay.pitch_roll");load.textContent=msg("vehicle_diagnostics_overlay.contact_forces");
   for(const row of rows){delete row.dataset.contact;row.removeAttribute('title');row.querySelectorAll('td').forEach(td=>td.textContent='—');}return;
  }
  if(view==='engine'&&d.running!==false)enginePhase=(enginePhase+(d.rpm??d.engine.idle)/60*Math.PI*2*elapsed/50)%(Math.PI*4);
  draw(d);
  if(view==='engine'){panel.querySelector('.diagram-engine-summary').textContent=msg("vehicle_diagnostics_overlay.l_cyl_ohv_rpm_motion_1",{v0:(d.engine.liters),v1:(d.engine.cylinders),v2:(Math.round(d.rpm))});return;}
  const degrees=x=>formatFixed(x*RAD,1);
  attitude.textContent=msg("vehicle_diagnostics_overlay.pitch_roll_2",{v0:(degrees(d.pitch)),v1:(degrees(d.roll))});
  rows.forEach((row,n)=>{const w=d.wheels[ORDER[n]],values=[Math.round(w.compression*1000),degrees(w.steer),degrees(w.camber),Math.round(w.rpm),formatFixed(w.speed,1)];row.dataset.contact=String(w.contact);row.title=msg("vehicle_diagnostics_overlay.n_kn_drive_brake_kn_lateral",{v0:(w.contact?msg('common.contact'):msg("vehicle_diagnostics_overlay.airborne")),v1:(formatFixed(w.support/1000,1)),v2:(formatFixed(w.longitudinal/1000,1)),v3:(formatFixed(w.lateral/1000,1))});row.querySelectorAll('td').forEach((td,i)=>td.textContent=values[i]);});
  load.textContent=msg("vehicle_diagnostics_overlay.n_kn_mg_kn_contact_4",{v0:(formatFixed(d.support/1000,1)),v1:(formatFixed(d.weight/1000,1)),v2:(d.contacts)});
 }};
}

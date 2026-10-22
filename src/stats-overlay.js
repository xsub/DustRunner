import {formatFixed,t as msg,tx as msgHTML} from './i18n.js';
import {FrameStats} from './frame-stats.js';
const STORAGE_KEY='dust-runner-stats-v1';
export function createStatsOverlay({game,toggle,getDiagnostics,onInteract}){
 let saved={};try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)??'{}')??{};}catch{}
 let visible=typeof saved.visible==='boolean'?saved.visible:false,collapsed=typeof saved.collapsed==='boolean'?saved.collapsed:matchMedia('(max-width:720px)').matches;
 let position=saved.position&&Number.isFinite(saved.position.x)&&Number.isFinite(saved.position.y)?{x:Math.max(0,Math.min(1,saved.position.x)),y:Math.max(0,Math.min(1,saved.position.y))}:null;
 const panel=document.createElement('aside');panel.id='performance-stats';panel.className='performance-stats';panel.setAttribute('aria-label',msg("stats_overlay.frame_rate_and_game_statistics"));
 panel.innerHTML=`<div class="stats-heading" title="${msgHTML("stats_overlay.drag_to_move_this_panel")}"><strong><span id="stats-fps">—</span> <small>${msgHTML("race_benchmark.fps")}</small></strong><button id="stats-collapse" aria-controls="stats-details" title="${msgHTML("stats_overlay.collapse_or_expand_statistics")}">−</button><button id="stats-hide" aria-label="${msgHTML("stats_overlay.hide_statistics")}" title="${msgHTML("stats_overlay.show_again_in_menu_stats_performance")}">×</button></div><div id="stats-details" class="stats-details"><dl><div><dt title="${msgHTML("stats_overlay.average_of_the_slowest_1_of")}">${msgHTML("stats_overlay.fps_1_low")}</dt><dd id="stats-low">—</dd></div><div><dt>${msgHTML("stats_overlay.frame_p95")}</dt><dd id="stats-frame">—</dd></div><div><dt title="${msgHTML("stats_overlay.javascript_loop_and_render_submission_time")}">${msgHTML("stats_overlay.cpu_loop")}</dt><dd id="stats-cpu">—</dd></div><div><dt>${msgHTML("stats_overlay.physics")}</dt><dd id="stats-physics">—</dd></div><div><dt>${msgHTML("stats_overlay.physics_steps")}</dt><dd id="stats-steps">—</dd></div><div><dt title="${msgHTML("stats_overlay.physics_catch_up_budget_per_frame")}">${msgHTML("stats_overlay.physics_budget")}</dt><dd id="stats-budget">—</dd></div><div><dt title="${msgHTML("stats_overlay.visible_snakes_animate_at_up_to")}">${msgHTML("stats_overlay.scenery_30_hz")}</dt><dd id="stats-background">—</dd></div><div><dt>${msgHTML("stats_overlay.draw_calls")}</dt><dd id="stats-draw">—</dd></div><div><dt title="${msgHTML("stats_overlay.adaptive_rendering_resolution_targeting_60_fps")}">${msgHTML("stats_overlay.image_target_60")}</dt><dd id="stats-resolution">—</dd></div><div><dt>${msgHTML("stats_overlay.triangles")}</dt><dd id="stats-triangles">—</dd></div><div><dt>${msgHTML("stats_overlay.geom_textures")}</dt><dd id="stats-resources">—</dd></div><div><dt>${msgHTML("stats_overlay.active_bodies")}</dt><dd id="stats-bodies">—</dd></div><div><dt title="${msgHTML("stats_overlay.moving_tires_and_cones_10_limit")}">${msgHTML("stats_overlay.moving_markers")}</dt><dd id="stats-markers">—</dd></div><div><dt>${msgHTML("stats_overlay.speed")}</dt><dd id="stats-speed">—</dd></div><div><dt>${msgHTML("stats_overlay.engine")}</dt><dd id="stats-engine">—</dd></div><div><dt>${msgHTML("stats_overlay.mass_contact")}</dt><dd id="stats-contact">—</dd></div><div><dt>${msgHTML("stats_overlay.vertical_speed")}</dt><dd id="stats-vertical">—</dd></div></dl><small id="stats-phase">${msgHTML("stats_overlay.ready_2_s_average")}</small></div>`;
 game.append(panel);const $=selector=>panel.querySelector(selector),heading=$('.stats-heading'),tracker=new FrameStats();let lastPaint=0,drag=null;
 function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({visible,collapsed,position}));}catch{}}
 function place(){
  if(panel.hidden)return;
  const maxX=Math.max(0,game.clientWidth-panel.offsetWidth),maxY=Math.max(0,game.clientHeight-panel.offsetHeight);
  panel.style.right='auto';panel.style.left=Math.round(position?position.x*maxX:Math.max(0,maxX-(game.clientWidth<=720?12:18)))+'px';panel.style.top=Math.round(position?position.y*maxY:Math.min(maxY,game.clientWidth<=720?57:64))+'px';
 }
 function updateVisibility(){panel.hidden=!visible;panel.classList.toggle('stats-collapsed',collapsed);$('#stats-details').hidden=collapsed;$('#stats-collapse').textContent=collapsed?'+':'−';$('#stats-collapse').setAttribute('aria-label',collapsed?msg("stats_overlay.expand_statistics"):msg("stats_overlay.collapse_statistics"));$('#stats-collapse').setAttribute('aria-expanded',String(!collapsed));toggle.checked=visible;place();}
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
 const text=(selector,value)=>{$(selector).textContent=value;},compact=n=>n>=1000000?formatFixed(n/1000000,1)+' M':n>=1000?Math.round(n/1000)+' k':String(n);
 return {record(now,timing){
  if(!visible||document.hidden)return;
  tracker.record(now,timing);if(now-lastPaint<500)return;lastPaint=now;const stats=tracker.snapshot();if(!stats)return;
  text('#stats-fps',Math.round(stats.fps));panel.dataset.rate=stats.fps>=50?'good':stats.fps>=30?'fair':'slow';
  if(collapsed)return;
  const d=getDiagnostics();text('#stats-low',Math.round(stats.lowFps));text('#stats-frame',formatFixed(stats.frameMs,1)+' / '+formatFixed(stats.p95Ms,1)+' ms');text('#stats-cpu',formatFixed(stats.cpuMs,1)+' ms');text('#stats-physics',formatFixed(stats.physicsMs,1)+' ms');text('#stats-steps',msg('stats.step_rate',{hz:Math.round(stats.physicsHz),steps:formatFixed(stats.stepsPerFrame,1)}));
  text('#stats-budget',d.physicsBudget+(" "+msg("stats_overlay.ms")+" ")+d.limitedFrames+'×');text('#stats-background',d.background+(" "+msg("stats_overlay.snakes")));text('#stats-draw',d.calls+(" "+msg("stats_overlay.calls")));text('#stats-resolution',d.resolution);text('#stats-triangles',compact(d.triangles));text('#stats-resources',d.geometries+' / '+d.textures);text('#stats-bodies',d.awake+' / '+d.bodies);text('#stats-markers',msg('stats.marker_counts',{moving:d.movingMarkers,limit:d.markerBudget,visible:d.visibleMarkers}));text('#stats-speed',d.speed+' km/h');text('#stats-engine',d.gear+' · '+d.rpm+(" "+msg("instrument_panel.rpm")));text('#stats-contact',d.mass+(" "+msg("stats_overlay.kg")+" ")+d.contacts+'/4');text('#stats-vertical',d.vertical+' m/s');text('#stats-phase',d.phase+(" "+msg("stats_overlay.2_s_average")));
 }};
}

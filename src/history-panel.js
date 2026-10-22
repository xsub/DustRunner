import {formatFixed,t as msg,tx as msgHTML} from './i18n.js';
import {isCompactBody} from './body-types.js';
import {tuningRevision} from './tuning.js';
import {ENGINES} from './engines.js';
import {GENERATIONS} from './heritage.js';
import {benchmarkEngine} from './performance.js';

export function createHistoryPanel({getPlayer,canFit,fitEngine}){
 const dialog=document.querySelector('#history-menu'),bodySelect=dialog.querySelector('#comparison-body');
 const rows=dialog.querySelector('#generation-rows'),results=dialog.querySelector('#performance-rows');
 const cache=new Map();let generation=null,cachedRevision=-1;
 rows.innerHTML=GENERATIONS.map(g=>`<tr data-generation-row="${g.id}"><th scope="row"><button data-generation="${g.id}" aria-pressed="false">${msgHTML("history_panel.gen",{v2:(g.id)})} <span>↘</span></button></th><td>${g.years}</td><td>${g.layouts}</td><td>${g.fuel}</td></tr>`).join('');
 function render(){
  if(cachedRevision!==tuningRevision()){cache.clear();cachedRevision=tuningRevision();}
  const body=bodySelect.value;
  if(!cache.has(body))cache.set(body,new Map(ENGINES.map(e=>[e.id,benchmarkEngine(e,body)])));
  const metrics=cache.get(body),player=getPlayer(),allowed=canFit();
  const engines=generation?ENGINES.filter(e=>generation.engines.includes(e.id)):ENGINES;
  rows.querySelectorAll('[data-generation]').forEach(button=>{const selected=Number(button.dataset.generation)===generation?.id;button.setAttribute('aria-pressed',String(selected));button.closest('tr').classList.toggle('active',selected);});
  dialog.querySelector('#heritage-story-title').textContent=generation?msg("history_panel.text",{v0:(generation.years),v1:(generation.title)}):msg("history_panel.five_generations_one_off_road_lineage");
  dialog.querySelector('#heritage-story').textContent=generation?.story??msg("history_panel.select_a_generation_in_the_table");
  dialog.querySelector('#comparison-scope').textContent=generation?msg("history_panel.gen_engine_profiles",{v0:(generation.id),v1:(engines.length)}):msg("history_panel.all_generations_engine_profiles",{v0:(engines.length)});
  dialog.querySelector('#history-all').hidden=!generation;
  dialog.querySelector('#fit-status').textContent=allowed?msg("history_panel.choose_fit_to_hot_swap_the"):msg("history_panel.engine_swapping_is_currently_unavailable");
  results.innerHTML=engines.map(e=>{
   const p=metrics.get(e.id),selected=e.id===player.engineId;
   return `<tr class="${selected?'fitted':''}"><th scope="row">${e.name}${selected?`<small>${msgHTML("history_panel.your_engine")}</small>`:''}</th><td>${formatFixed(p.powerKw,0)} <small>${msgHTML("history_panel.hp",{v4:(formatFixed(p.powerHp,0))})}</small></td><td>${p.peakTorque}</td><td>${p.zeroTo50===null?'—':formatFixed(p.zeroTo50,2)+' s'}</td><td>${formatFixed(p.speedKmh,1)}</td><td><button data-fit-engine="${e.id}" ${selected||!allowed?'disabled':''} aria-label="${selected?msg("history_panel.already_fitted"):allowed?msg('common.fit'):msg("history_panel.finish_the_race_to_fit")} ${e.name}">${selected?msg("history_panel.fitted"):msg("history_panel.fit")}</button></td></tr>`;
  }).join('');
 }
 rows.addEventListener('click',event=>{const button=event.target.closest('[data-generation]');if(!button)return;generation=GENERATIONS.find(g=>g.id===Number(button.dataset.generation));render();});
 dialog.querySelector('#history-all').onclick=()=>{generation=null;render();};
 bodySelect.onchange=render;
 results.addEventListener('click',event=>{
  const button=event.target.closest('[data-fit-engine]');if(!button||button.disabled||!canFit())return;
  fitEngine(button.dataset.fitEngine);dialog.close();
 });
 const close=()=>dialog.close();dialog.querySelector('#history-close').onclick=close;
 dialog.addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();close();});
 dialog.addEventListener('keydown',event=>event.stopPropagation());
 return {open(){generation=null;bodySelect.value=isCompactBody(getPlayer().style)?'classic':'fullsize';render();dialog.showModal();}};
}

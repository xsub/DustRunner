import {ENGINES} from './engines.js';
import {GENERATIONS} from './heritage.js';
import {benchmarkEngine} from './performance.js';

export function createHistoryPanel({getPlayer,canFit,fitEngine}){
 const dialog=document.querySelector('#history-menu'),bodySelect=dialog.querySelector('#comparison-body');
 const rows=dialog.querySelector('#generation-rows'),results=dialog.querySelector('#performance-rows');
 const cache=new Map();let generation=null;
 rows.innerHTML=GENERATIONS.map(g=>`<tr data-generation-row="${g.id}"><th scope="row"><button data-generation="${g.id}" aria-pressed="false">GEN ${g.id} <span>↘</span></button></th><td>${g.years}</td><td>${g.layouts}</td><td>${g.fuel}</td></tr>`).join('');
 function render(){
  const body=bodySelect.value;
  if(!cache.has(body))cache.set(body,new Map(ENGINES.map(e=>[e.id,benchmarkEngine(e,body)])));
  const metrics=cache.get(body),player=getPlayer(),allowed=canFit();
  const engines=generation?ENGINES.filter(e=>generation.engines.includes(e.id)):ENGINES;
  rows.querySelectorAll('[data-generation]').forEach(button=>{const selected=Number(button.dataset.generation)===generation?.id;button.setAttribute('aria-pressed',String(selected));button.closest('tr').classList.toggle('active',selected);});
  dialog.querySelector('#heritage-story-title').textContent=generation?`${generation.years} · ${generation.title}`:'Five generations. One off-road lineage.';
  dialog.querySelector('#heritage-story').textContent=generation?.story??'Select a generation in the table to read its story and compare the matching engine profiles below. Engine swaps in the game are unrestricted; the history describes factory families.';
  dialog.querySelector('#comparison-scope').textContent=generation?`GEN ${generation.id} · ${engines.length} ENGINE PROFILES`:`ALL GENERATIONS · ${engines.length} ENGINE PROFILES`;
  dialog.querySelector('#history-all').hidden=!generation;
  dialog.querySelector('#fit-status').textContent=allowed?'Choose FIT to install an engine and return to the pit stop.':'Engine swaps are available between races. Close this panel to return to the paused pit stop.';
  results.innerHTML=engines.map(e=>{
   const p=metrics.get(e.id),selected=e.id===player.engineId;
   return `<tr class="${selected?'fitted':''}"><th scope="row">${e.name}${selected?'<small>YOUR ENGINE</small>':''}</th><td>${p.powerKw.toFixed(0)} <small>${p.powerHp.toFixed(0)} hp</small></td><td>${p.peakTorque}</td><td>${p.zeroTo50===null?'—':p.zeroTo50.toFixed(2)+' s'}</td><td>${p.speedKmh.toFixed(1)}</td><td><button data-fit-engine="${e.id}" ${selected||!allowed?'disabled':''} aria-label="${selected?'Already fitted':allowed?'Fit':'Finish the race to fit'} ${e.name}">${selected?'FITTED':'FIT ↗'}</button></td></tr>`;
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
 return {open(){generation=null;bodySelect.value=getPlayer().style==='classic'?'classic':'fullsize';render();dialog.showModal();}};
}

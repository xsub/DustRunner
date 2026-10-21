import {AI_LEVELS,MAX_OPPONENTS,normalizeRaceSetup} from './ai-drivers.js';
export function createRaceSetupPanel({container,getSetup,onApply}){
 const options=AI_LEVELS.map(level=>`<option value="${level.id}">${level.name}</option>`).join('');
 container.innerHTML=`<span class="section-label">PRZECIWNICY AI</span><label>Liczba automatycznych graczy <select id="opponent-count">${Array.from({length:MAX_OPPONENTS+1},(_,i)=>`<option value="${i}">${i} AI · ${i+1} ${i===0?'auto':i<4?'auta':'aut'} łącznie</option>`).join('')}</select></label><label>Ustaw wszystkim <select id="opponent-all"><option value="mixed">Mieszane umiejętności</option>${options}</select></label><div id="opponent-skills"></div><p>Poziom zmienia tempo, wybór linii, przygotowanie do zakrętów i użycie nitro. Każde auto korzysta z tej samej fizyki.</p><button id="opponents-apply" type="button">ZASTOSUJ · RESTART POZIOMU</button><p id="opponents-status" role="status"></p>`;
 const count=container.querySelector('#opponent-count'),all=container.querySelector('#opponent-all'),rows=container.querySelector('#opponent-skills');let draft;
 function draw(){count.value=draft.count;rows.innerHTML=Array.from({length:draft.count},(_,i)=>`<label>AI ${i+1}<select data-ai-slot="${i}">${options}</select></label>`).join('');rows.querySelectorAll('select').forEach((select,i)=>{select.value=draft.skills[i];select.onchange=()=>{draft.skills[i]=select.value;all.value='mixed';};});}
 count.onchange=()=>{draft.count=Number(count.value);draw();};all.onchange=()=>{draft.skills=draft.skills.map((_,i)=>all.value==='mixed'?AI_LEVELS[i%5].id:all.value);draw();};
 container.querySelector('#opponents-apply').onclick=()=>{onApply(normalizeRaceSetup(draft));container.querySelector('#opponents-status').textContent=`Zastosowano ${draft.count} AI · ${draft.count+1} aut.`;};
 function sync(){draft=normalizeRaceSetup(getSetup());all.value='mixed';draw();}sync();return {sync};
}

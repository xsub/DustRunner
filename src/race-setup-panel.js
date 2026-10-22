import {t as msg,tx as msgHTML} from './i18n.js';
import {AI_LEVELS,MAX_OPPONENTS,normalizeRaceSetup} from './ai-drivers.js';
export function createRaceSetupPanel({container,getSetup,onApply,onDraftChange=()=>{}}){
 const options=AI_LEVELS.map(level=>`<option value="${level.id}">${msgHTML("ai."+level.id)}</option>`).join('');
 container.innerHTML=`<span class="section-label">${msgHTML("race_setup_panel.ai_rivals")}</span><label>${msgHTML("race_setup_panel.number_of_ai_rivals")} <select id="opponent-count">${Array.from({length:MAX_OPPONENTS+1},(_,i)=>`<option value="${i}">${msgHTML("raceSetup.carCount",{ai:i,count:i+1})}</option>`).join('')}</select></label><label>${msgHTML("race_setup_panel.set_all_drivers")} <select id="opponent-all"><option value="mixed">${msgHTML("race_setup_panel.mixed_skill_levels")}</option>${options}</select></label><details class="individual-skills"><summary>${msgHTML("raceSetup.individual")}</summary><div id="opponent-skills"></div></details><p>${msgHTML("race_setup_panel.skill_changes_pace_racing_lines_corner")}</p><button id="opponents-apply" type="button">${msgHTML("race_setup_panel.apply_restart")}</button><p id="opponents-status" role="status"></p>`;
 const count=container.querySelector('#opponent-count'),all=container.querySelector('#opponent-all'),rows=container.querySelector('#opponent-skills');let draft;
 function draw(){count.value=draft.count;rows.innerHTML=Array.from({length:draft.count},(_,i)=>`<label>${msgHTML("race_setup_panel.ai",{v0:(i+1)})}<select data-ai-slot="${i}">${options}</select></label>`).join('');rows.querySelectorAll('select').forEach((select,i)=>{select.value=draft.skills[i];select.onchange=()=>{draft.skills[i]=select.value;all.value='mixed';notify();};});}
 count.onchange=()=>{draft.count=Number(count.value);draw();notify();};all.onchange=()=>{draft.skills=draft.skills.map((_,i)=>all.value==='mixed'?AI_LEVELS[i%5].id:all.value);draw();notify();};
 function hasChanges(){return JSON.stringify(normalizeRaceSetup(draft))!==JSON.stringify(normalizeRaceSetup(getSetup()));}
 function notify(){container.querySelector('#opponents-status').textContent=hasChanges()?msg('raceSetup.pending'):'';onDraftChange();}
 function applyDraft(){onApply(normalizeRaceSetup(draft));container.querySelector('#opponents-status').textContent=msg("raceSetup.applied",{ai:draft.count,count:draft.count+1});onDraftChange();}
 container.querySelector('#opponents-apply').onclick=applyDraft;
 function sync(){draft=normalizeRaceSetup(getSetup());all.value='mixed';draw();}sync();return {sync,hasChanges,applyDraft};
}

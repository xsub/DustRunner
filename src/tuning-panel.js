import {t as msg,tx as msgHTML,getLocale} from './i18n.js';
import {TUNING_FIELDS,DEFAULT_TUNING,tuning,validateTuning,tuningDocument,parseTuning,readPresets,storePreset,ACTIVE_TUNING_KEY,PRESETS_KEY,displayPresetName as presetLabel} from './tuning.js';

export function createTuningPanel({onOpen,onClose,onApply,getContext,getStats}){
 const dialog=document.createElement('dialog');dialog.id='tuning-menu';dialog.setAttribute('aria-labelledby','tuning-title');
 dialog.innerHTML=`<header class="tuning-heading"><div><span class="section-label">${msgHTML("tuning_panel.dust_runner_developer_mode")}</span><h1 id="tuning-title">${msgHTML("tuning_panel.developer_tuning")}</h1></div><button id="tuning-close" aria-label="${msgHTML("tuning_panel.close_developer_tuning")}">✕</button></header>
 <p class="tuning-lead">${msgHTML("tuning_panel.adjust_the_simulation_sliders_prepare_a")}</p>
 <div id="tuning-readout" class="tuning-readout" aria-label="${msgHTML("tuning_panel.live_simulation_readings")}"></div>
 <section class="tuning-presets" aria-label="${msgHTML("tuning_panel.saved_tuning_presets")}"><label>${msgHTML("tuning_panel.preset_name")}<input id="tuning-name" maxlength="80" value="${msgHTML("tuning.my_tune")}"></label><button id="tuning-save">${msgHTML("tuning_panel.save_preset")}</button><label>${msgHTML("tuning_panel.saved_in_this_browser")}<select id="tuning-presets"><option value="">${msgHTML("tuning_panel.choose_a_preset")}</option></select></label><button id="tuning-load">${msgHTML("tuning_panel.load")}</button><button id="tuning-delete">${msgHTML("tuning_panel.delete_preset")}</button></section>
 <p class="tuning-storage">${msgHTML("tuning_panel.saved_only_in_this_browser_for")}</p>
 <div class="tuning-tools"><button id="tuning-copy">${msgHTML("tuning_panel.copy_settings_json")}</button><button id="tuning-export">${msgHTML("tuning_panel.download_json")}</button><button id="tuning-defaults">${msgHTML("tuning_panel.defaults")}</button></div>
 <details class="tuning-transfer"><summary>${msgHTML("tuning_panel.paste_or_import_a_preset")}</summary><label for="tuning-json">${msgHTML("tuning_panel.settings_json_vehicle_and_track_context")}</label><textarea id="tuning-json" rows="6" spellcheck="false" placeholder="${msgHTML("tuning_panel.paste_a_tuning_preset_here")}"></textarea><button id="tuning-import">${msgHTML("tuning_panel.load_json_into_sliders")}</button><label class="tuning-file">${msgHTML("tuning_panel.or_choose_a_json_file")}<input id="tuning-file" type="file" accept="application/json,.json"></label></details>
 <label class="tuning-search">${msgHTML("tuning_panel.find_a_parameter")}<input id="tuning-search" type="search" placeholder="${msgHTML("tuning_panel.e_g_mass_ramps_braking")}"></label><div id="tuning-fields"></div>
 <footer class="tuning-footer"><p id="tuning-status" role="status">${msgHTML("tuning_panel.current_values_apply_your_changes_to")}</p><div><button id="tuning-apply">${msgHTML("tuning_panel.apply_restart")}</button><button id="tuning-drive" class="primary">${msgHTML("tuning_panel.apply_drive")}</button></div></footer>`;
 document.body.append(dialog);
 const $=s=>dialog.querySelector(s),storage=()=>window.localStorage;

 let draft={...tuning},presets=[],lastStats=0;
 const fields=new Map(),sections=new Map();
 const status=text=>{$('#tuning-status').textContent=text;};
 for(const field of TUNING_FIELDS){
  let section=sections.get(field.group);
  if(!section){section=document.createElement('details');section.className='tuning-group';section.open=sections.size<2;const summary=document.createElement('summary');summary.textContent=field.group;section.append(summary);$('#tuning-fields').append(section);sections.set(field.group,section);}
  const row=document.createElement('div');row.className='tuning-field';row.dataset.search=(field.label+' '+field.group+' '+field.key).toLocaleLowerCase(getLocale());
  const label=document.createElement('label');label.htmlFor='tune-'+field.key;label.textContent=field.label+(field.unit?' · '+field.unit:'');
  const range=document.createElement('input');range.type='range';range.id='tune-'+field.key;
  const number=document.createElement('input');number.type='number';number.setAttribute('aria-label',field.label+(" "+msg("tuning_panel.value")));
  for(const input of [range,number]){input.min=field.min;input.max=field.max;input.step=field.step;input.value=draft[field.key];}
  const reset=document.createElement('button');reset.textContent='↶';reset.title=(msg("tuning_panel.default_value")+" ")+field.value;reset.setAttribute('aria-label',(msg("tuning_panel.reset")+" ")+field.label);
  range.oninput=()=>{draft[field.key]=Number(range.value);number.value=range.value;status(msg("tuning_panel.slider_changes_are_waiting_to_be"));};
  number.oninput=()=>{draft[field.key]=number.value===''?NaN:Number(number.value);range.value=number.value;status(msg("tuning_panel.slider_changes_are_waiting_to_be"));};
  reset.onclick=()=>{draft[field.key]=field.value;range.value=number.value=field.value;status(msg("tuning_panel.parameter_reset_apply_to_use_it"));};
  row.append(label,number,range,reset);section.append(row);fields.set(field.key,{range,number,row});
 }
 function showDraft(parameters){draft=validateTuning(parameters);for(const [key,inputs] of fields){inputs.range.value=inputs.number.value=draft[key];}}
 function refreshPresets(selected=''){
  const select=$('#tuning-presets');select.replaceChildren(new Option(msg("tuning_panel.choose_a_preset"),''));
  presets.forEach((preset,i)=>select.add(new Option(presetLabel(preset.name),String(i))));select.value=selected;
  $('#tuning-load').disabled=$('#tuning-delete').disabled=select.value==='';
 }
 $('#tuning-presets').onchange=()=>{$('#tuning-load').disabled=$('#tuning-delete').disabled=$('#tuning-presets').value==='';};
 function documentFromDraft(){return tuningDocument(draft,$('#tuning-name').value,{...getContext(),applied:JSON.stringify(validateTuning(draft))===JSON.stringify(tuning)});}
 function transferText(){const text=JSON.stringify(documentFromDraft(),null,2);$('#tuning-json').value=text;return text;}
 const guard=action=>()=>{try{action();}catch(error){status(error.message);}};
 $('#tuning-save').onclick=guard(()=>{const doc=documentFromDraft();presets=storePreset(storage(),presets,doc);refreshPresets(String(presets.length-1));status(msg("tuning_panel.saved")+doc.name+msg("tuning_panel.in_this_browser"));});
 $('#tuning-load').onclick=guard(()=>{const doc=presets[Number($('#tuning-presets').value)];if(!doc)return;showDraft(doc.parameters);$('#tuning-name').value=presetLabel(doc.name);status(msg("tuning_panel.loaded")+doc.name+msg("tuning_panel.into_the_sliders_apply_to_start"));});
 $('#tuning-delete').onclick=guard(()=>{const index=Number($('#tuning-presets').value);const next=presets.filter((_,i)=>i!==index);storage().setItem(PRESETS_KEY,JSON.stringify(next));presets=next;refreshPresets();status(msg("tuning_panel.preset_deleted_from_this_browser"));});
 $('#tuning-copy').onclick=async()=>{
  try{const text=transferText();try{await navigator.clipboard.writeText(text);status(msg("tuning_panel.settings_json_copied"));}catch{$('.tuning-transfer').open=true;$('#tuning-json').focus();$('#tuning-json').select();status(msg("tuning_panel.clipboard_unavailable_copy_the_selected_json"));}}catch(error){status(error.message);}
 };
 $('#tuning-export').onclick=guard(()=>{const text=transferText(),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='dust-runner-tuning.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status(msg("tuning_panel.slider_settings_exported_as_json"));});
 function importText(text){const doc=parseTuning(text);showDraft(doc.parameters);$('#tuning-name').value=presetLabel(doc.name);status(msg("tuning_panel.import_complete_apply_the_slider_values"));}
 $('#tuning-import').onclick=guard(()=>importText($('#tuning-json').value));
 $('#tuning-file').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>100000)throw Error(msg("tuning_panel.the_file_exceeds_100_kb"));importText(await file.text());}catch(error){status(error.message);}finally{event.target.value='';}};
 $('#tuning-defaults').onclick=()=>{showDraft(DEFAULT_TUNING);$('#tuning-name').value=msg('tuning.defaults_name');status(msg("tuning_panel.defaults_loaded_into_the_sliders_apply"));};
 $('#tuning-search').oninput=()=>{const query=$('#tuning-search').value.trim().toLocaleLowerCase(getLocale());for(const {row} of fields.values())row.hidden=!row.dataset.search.includes(query);for(const section of sections.values()){section.hidden=![...section.querySelectorAll('.tuning-field')].some(row=>!row.hidden);if(query)section.open=true;}};
 async function apply(drive){
  try{
   const doc=documentFromDraft();onApply(doc.parameters);doc.context.applied=true;let stored=true;
   try{storage().setItem(ACTIVE_TUNING_KEY,JSON.stringify(doc));}catch{stored=false;}
   status(stored?msg("tuning_panel.tuning_applied_and_saved"):msg("tuning_panel.applied_but_browser_storage_is_unavailable"));
   if(drive&&stored){dialog.close();onClose(true);}
  }catch(error){status((msg("tuning_panel.not_applied")+" ")+error.message);}
 }
 $('#tuning-apply').onclick=()=>apply(false);$('#tuning-drive').onclick=()=>apply(true);
 function close(){dialog.close();onClose(false);}
 $('#tuning-close').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('keydown',event=>event.stopPropagation());
 return {
  open(){if(dialog.open)return;onOpen();showDraft(tuning);try{presets=readPresets(storage());const saved=storage().getItem(ACTIVE_TUNING_KEY);if(saved)$('#tuning-name').value=presetLabel(parseTuning(saved).name);}catch{presets=[];}refreshPresets();status(msg("tuning_panel.current_values_apply_your_changes_to"));dialog.showModal();},
  update(now){if(!dialog.open||now-lastStats<250)return;lastStats=now;const stats=getStats();$('#tuning-readout').textContent=msg("tuning_panel.kg_km_h_vertical_m_s",{v0:(stats.mass),v1:(stats.speed),v2:(stats.vertical),v3:(stats.contacts),v4:(stats.rpm)});},
 };
}

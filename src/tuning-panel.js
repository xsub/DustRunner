import {TUNING_FIELDS,DEFAULT_TUNING,tuning,validateTuning,tuningDocument,parseTuning,readPresets,storePreset,ACTIVE_TUNING_KEY,PRESETS_KEY} from './tuning.js';

export function createTuningPanel({onOpen,onClose,onApply,getContext,getStats}){
 const dialog=document.createElement('dialog');dialog.id='tuning-menu';dialog.setAttribute('aria-labelledby','tuning-title');
 dialog.innerHTML=`<header class="tuning-heading"><div><span class="section-label">DUST RUNNER · DEVELOPER MODE</span><h1 id="tuning-title">DEV / TUNNING</h1></div><button id="tuning-close" aria-label="Zamknij tryb developerski">✕</button></header>
 <p class="tuning-lead">Dostrój symulację. Suwaki przygotowują zmiany; zastosowanie przebuduje tor i zrestartuje próbę. Wszystkie auta korzystają z tych parametrów.</p>
 <div id="tuning-readout" class="tuning-readout" aria-label="Bieżące dane symulacji"></div>
 <section class="tuning-presets" aria-label="Zapisane zestawy tunning"><label>Nazwa tunningu<input id="tuning-name" maxlength="80" value="Mój tunning"></label><button id="tuning-save">ZAPISZ TUNNING</button><label>Zapisane w tej przeglądarce<select id="tuning-presets"><option value="">Wybierz zestaw…</option></select></label><button id="tuning-load">WCZYTAJ</button><button id="tuning-delete">USUŃ ZESTAW</button></section>
 <p class="tuning-storage">Zapis tylko w tej przeglądarce i pod tym adresem strony (localStorage). GitHub nie jest zmieniany. Kopia JSON pozwala przenieść tunning albo wkleić go do czatu. Zapis pod tą samą nazwą zastępuje lokalny zestaw.</p>
 <div class="tuning-tools"><button id="tuning-copy">KOPIUJ WARTOŚCI · JSON</button><button id="tuning-export">POBIERZ JSON</button><button id="tuning-defaults">FABRYCZNE</button></div>
 <details class="tuning-transfer"><summary>Wklej / importuj tunning</summary><label for="tuning-json">JSON ustawień (kontekst auta i toru jest informacyjny)</label><textarea id="tuning-json" rows="6" spellcheck="false" placeholder="Wklej tutaj skopiowany tunning…"></textarea><button id="tuning-import">WCZYTAJ JSON DO SUWAKÓW</button><label class="tuning-file">Lub wybierz plik JSON<input id="tuning-file" type="file" accept="application/json,.json"></label></details>
 <label class="tuning-search">Znajdź parametr<input id="tuning-search" type="search" placeholder="np. masa, rampy, hamowanie…"></label><div id="tuning-fields"></div>
 <footer class="tuning-footer"><p id="tuning-status" role="status">Bieżące wartości. Zmiany wymagają zastosowania.</p><div><button id="tuning-apply">ZASTOSUJ · RESTART</button><button id="tuning-drive" class="primary">ZASTOSUJ I JEDŹ ↗</button></div></footer>`;
 document.body.append(dialog);
 const $=s=>dialog.querySelector(s),storage=()=>window.localStorage;
 let draft={...tuning},presets=[],lastStats=0;
 const fields=new Map(),sections=new Map();
 const status=text=>{$('#tuning-status').textContent=text;};
 for(const field of TUNING_FIELDS){
  let section=sections.get(field.group);
  if(!section){section=document.createElement('details');section.className='tuning-group';section.open=sections.size<2;const summary=document.createElement('summary');summary.textContent=field.group;section.append(summary);$('#tuning-fields').append(section);sections.set(field.group,section);}
  const row=document.createElement('div');row.className='tuning-field';row.dataset.search=(field.label+' '+field.group+' '+field.key).toLocaleLowerCase('pl');
  const label=document.createElement('label');label.htmlFor='tune-'+field.key;label.textContent=field.label+(field.unit?' · '+field.unit:'');
  const range=document.createElement('input');range.type='range';range.id='tune-'+field.key;
  const number=document.createElement('input');number.type='number';number.setAttribute('aria-label',field.label+' — wartość');
  for(const input of [range,number]){input.min=field.min;input.max=field.max;input.step=field.step;input.value=draft[field.key];}
  const reset=document.createElement('button');reset.textContent='↶';reset.title='Wartość fabryczna: '+field.value;reset.setAttribute('aria-label','Przywróć: '+field.label);
  range.oninput=()=>{draft[field.key]=Number(range.value);number.value=range.value;status('Zmiany na suwakach czekają na zastosowanie.');};
  number.oninput=()=>{draft[field.key]=number.value===''?NaN:Number(number.value);range.value=number.value;status('Zmiany na suwakach czekają na zastosowanie.');};
  reset.onclick=()=>{draft[field.key]=field.value;range.value=number.value=field.value;status('Parametr przywrócony. Zastosuj, aby użyć go w grze.');};
  row.append(label,number,range,reset);section.append(row);fields.set(field.key,{range,number,row});
 }
 function showDraft(parameters){draft=validateTuning(parameters);for(const [key,inputs] of fields){inputs.range.value=inputs.number.value=draft[key];}}
 function refreshPresets(selected=''){
  const select=$('#tuning-presets');select.replaceChildren(new Option('Wybierz zestaw…',''));
  presets.forEach((preset,i)=>select.add(new Option(preset.name,String(i))));select.value=selected;
  $('#tuning-load').disabled=$('#tuning-delete').disabled=select.value==='';
 }
 $('#tuning-presets').onchange=()=>{$('#tuning-load').disabled=$('#tuning-delete').disabled=$('#tuning-presets').value==='';};
 function documentFromDraft(){return tuningDocument(draft,$('#tuning-name').value,{...getContext(),applied:JSON.stringify(validateTuning(draft))===JSON.stringify(tuning)});}
 function transferText(){const text=JSON.stringify(documentFromDraft(),null,2);$('#tuning-json').value=text;return text;}
 const guard=action=>()=>{try{action();}catch(error){status(error.message);}};
 $('#tuning-save').onclick=guard(()=>{const doc=documentFromDraft();presets=storePreset(storage(),presets,doc);refreshPresets(String(presets.length-1));status('Zapisano „'+doc.name+'” w tej przeglądarce.');});
 $('#tuning-load').onclick=guard(()=>{const doc=presets[Number($('#tuning-presets').value)];if(!doc)return;showDraft(doc.parameters);$('#tuning-name').value=doc.name;status('Wczytano „'+doc.name+'” do suwaków. Zastosuj, aby rozpocząć próbę.');});
 $('#tuning-delete').onclick=guard(()=>{const index=Number($('#tuning-presets').value);const next=presets.filter((_,i)=>i!==index);storage().setItem(PRESETS_KEY,JSON.stringify(next));presets=next;refreshPresets();status('Usunięto wybrany zestaw z tej przeglądarki.');});
 $('#tuning-copy').onclick=async()=>{
  try{const text=transferText();try{await navigator.clipboard.writeText(text);status('Skopiowano wartości JSON. Możesz wkleić je do czatu.');}catch{$('.tuning-transfer').open=true;$('#tuning-json').focus();$('#tuning-json').select();status('Schowek niedostępny. Skopiuj zaznaczony JSON klawiszami Ctrl/Cmd+C.');}}catch(error){status(error.message);}
 };
 $('#tuning-export').onclick=guard(()=>{const text=transferText(),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='dust-runner-tunning.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Wyeksportowano JSON z wartościami suwaków.');});
 function importText(text){const doc=parseTuning(text);showDraft(doc.parameters);$('#tuning-name').value=doc.name;status('Import poprawny. Wartości są na suwakach — zastosuj je przed jazdą.');}
 $('#tuning-import').onclick=guard(()=>importText($('#tuning-json').value));
 $('#tuning-file').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>100000)throw Error('Plik jest większy niż 100 KB.');importText(await file.text());}catch(error){status(error.message);}finally{event.target.value='';}};
 $('#tuning-defaults').onclick=()=>{showDraft(DEFAULT_TUNING);$('#tuning-name').value='Fabryczne';status('Fabryczne wartości na suwakach. Zastosuj, aby przywrócić grę.');};
 $('#tuning-search').oninput=()=>{const query=$('#tuning-search').value.trim().toLocaleLowerCase('pl');for(const {row} of fields.values())row.hidden=!row.dataset.search.includes(query);for(const section of sections.values()){section.hidden=![...section.querySelectorAll('.tuning-field')].some(row=>!row.hidden);if(query)section.open=true;}};
 async function apply(drive){
  try{
   const doc=documentFromDraft();onApply(doc.parameters);doc.context.applied=true;let stored=true;
   try{storage().setItem(ACTIVE_TUNING_KEY,JSON.stringify(doc));}catch{stored=false;}
   status(stored?'Zastosowano i zapamiętano aktywny tunning.':'Zastosowano, ale pamięć przeglądarki odmówiła zapisu. Skopiuj JSON, aby zachować ustawienia.');
   if(drive&&stored){dialog.close();onClose(true);}
  }catch(error){status('Nie zastosowano: '+error.message);}
 }
 $('#tuning-apply').onclick=()=>apply(false);$('#tuning-drive').onclick=()=>apply(true);
 function close(){dialog.close();onClose(false);}
 $('#tuning-close').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('keydown',event=>event.stopPropagation());
 return {
  open(){if(dialog.open)return;onOpen();showDraft(tuning);try{presets=readPresets(storage());const saved=storage().getItem(ACTIVE_TUNING_KEY);if(saved)$('#tuning-name').value=parseTuning(saved).name;}catch{presets=[];}refreshPresets();status('Bieżące wartości. Zmiany wymagają zastosowania.');dialog.showModal();},
  update(now){if(!dialog.open||now-lastStats<250)return;lastStats=now;const stats=getStats();$('#tuning-readout').textContent=`${stats.mass} kg · ${stats.speed} km/h · pion ${stats.vertical} m/s · koła na ziemi ${stats.contacts}/4 · ${stats.rpm} RPM`;},
 };
}

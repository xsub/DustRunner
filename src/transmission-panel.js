import {transmissionForEngine,transmissionMode,gearboxFor,gearLabel} from './transmissions.js';
import {selectTransmissionMode,shiftGear} from './powertrain.js';
export function createTransmissionPanel({getPlayer,onChange,onInteract}){
 const select=document.querySelector('#transmission-mode'),toggle=document.querySelector('#transmission-toggle'),info=document.querySelector('#transmission-info'),ratios=document.querySelector('#transmission-ratios'),readout=document.querySelector('#gearbox-readout'),notice=document.querySelector('#transmission-notice');
 let signature='';
 const changed=()=>{signature='';update();onChange();onInteract();};
 select.onchange=()=>{selectTransmissionMode(getPlayer(),select.value);changed();};
 toggle.onclick=()=>{const modes=['automatic','manual'];selectTransmissionMode(getPlayer(),modes[(modes.indexOf(transmissionMode(getPlayer()))+1)%3]);changed();};
 const shift=direction=>{const car=getPlayer();shiftGear(car,direction==='neutral'?0:(car.powertrain?.gear??1)+direction);changed();};
 document.querySelectorAll('[data-shift]').forEach(button=>button.onclick=()=>shift(button.dataset.shift==='neutral'?'neutral':Number(button.dataset.shift)));
 function update(){
  const car=getPlayer(),mode=transmissionMode(car),assigned=transmissionForEngine(car.engineId),box=gearboxFor(car),state=car.powertrain,gear=state?.engineId===car.engineId&&state.transmissionMode===mode?(state.gear??1):1;
  const key=JSON.stringify([car.engineId,mode,gear,state?.shiftNotice]);if(key===signature)return;signature=key;
  select.value=mode;toggle.textContent=mode==='arcade'?'ARCADE':mode==='manual'?'M · '+box.ratios.length:'A · '+box.ratios.length;
  info.textContent=assigned.name+' · przypisana na stałe do silnika. '+(mode==='arcade'?'Arcade używa dotychczasowych trzech przełożeń DEV.':'Wszystkie przełożenia tej skrzyni są aktywne; HI/LO nadal wybiera zakres reduktora.');
  ratios.textContent='R '+assigned.reverse.toFixed(3)+' · N · '+assigned.ratios.map((ratio,i)=>(i+1)+': '+ratio.toFixed(3)).join(' · ');
  readout.textContent=mode==='arcade'?'':gearLabel(car)+'/'+box.ratios.length+' · '+(gear===0?'luz':(gear<0?box.reverse:box.ratios[gear-1]).toFixed(2));
  document.querySelectorAll('[data-shift]').forEach(button=>button.disabled=mode!=='manual');
  notice.textContent=mode==='manual'?(state?.shiftNotice||''):'';
 }
 function shortcut(event){
  if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||transmissionMode(getPlayer())!=='manual')return false;
  if(!['KeyQ','KeyE','KeyB'].includes(event.code))return false;shift(event.code==='KeyQ'?-1:event.code==='KeyE'?1:'neutral');return true;
 }
 update();return {update,shortcut};
}

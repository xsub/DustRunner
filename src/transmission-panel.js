import {transmissionForEngine,transmissionMode,gearboxFor,gearLabel} from './transmissions.js';
import {selectTransmissionMode,shiftGear} from './powertrain.js';
import {drivingMode,cycleDrivingMode} from './driving-mode.js';
export function createTransmissionPanel({getPlayer,onChange,onInteract}){
 const select=document.querySelector('#transmission-mode'),toggles=document.querySelectorAll('[data-driving-mode-cycle]'),info=document.querySelector('#transmission-info'),ratios=document.querySelector('#transmission-ratios'),readout=document.querySelector('#gearbox-readout'),notice=document.querySelector('#transmission-notice');
 let signature='';
 const changed=()=>{signature='';update();onChange();onInteract();};
 select.onchange=()=>{selectTransmissionMode(getPlayer(),select.value);changed();};
 toggles.forEach(button=>button.onclick=()=>{cycleDrivingMode(getPlayer());changed();});
 const shift=direction=>{const car=getPlayer();shiftGear(car,direction==='neutral'?0:(car.powertrain?.gear??1)+direction);changed();};
 document.querySelectorAll('[data-shift]').forEach(button=>button.onclick=()=>shift(button.dataset.shift==='neutral'?'neutral':Number(button.dataset.shift)));
 function update(){
  const car=getPlayer(),mode=transmissionMode(car),assigned=transmissionForEngine(car.engineId),box=gearboxFor(car),state=car.powertrain,gear=state?.engineId===car.engineId&&state.transmissionMode===mode?(state.gear??1):1;
  const key=JSON.stringify([car.engineId,mode,gear,state?.shiftNotice,car.driveMode,state?.mode]);if(key===signature)return;signature=key;
  select.value=mode;
  toggles.forEach(button=>{
   const label=drivingMode(car)==='4x4'?'4×4':drivingMode(car),pending=car.driveMode!==state?.mode;
   button.textContent=label;button.classList.toggle('pending',pending);
   button.title=label+' · '+(pending?'Zwolnij poniżej 8 km/h · ':'')+'Kliknij: A → M → 4×4';
   button.setAttribute('aria-label','Tryb '+label+'. '+(pending?'Oczekuje: zwolnij poniżej 8 km/h. ':'')+'Zmień: A automat, M ręczna, 4×4 pełzanie');
  });
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

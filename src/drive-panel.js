import {transmissionMode} from './transmissions.js';
import {DRIVE_MODES,driveModeById} from './drive-modes.js';
import {selectDriveMode,selectTransmissionMode} from './powertrain.js';

export function createDrivePanel({getPlayer,onChange,onInteract}){
 const menu=document.querySelector('#drive-menu-modes'),hud=document.querySelector('#drive-hud-modes');
 const buttons=compact=>DRIVE_MODES.map((mode,i)=>`<button type="button" data-drive="${mode.id}" aria-pressed="false" aria-keyshortcuts="${i+1}" title="${mode.name} · klawisz ${i+1}" aria-label="Tryb ${mode.name}">${mode.label}${compact?'':`<small>${mode.name.split(' · ')[1]}</small>`}<kbd aria-hidden="true">${i+1}</kbd></button>`).join('');
 menu.innerHTML=buttons(false);hud.innerHTML=buttons(true);let signature='';
 const select=id=>{const car=getPlayer();if(id==='auto'||id==='4x4')selectTransmissionMode(car,'automatic');selectDriveMode(car,id);signature='';update();onChange();onInteract();};
 document.querySelectorAll('[data-drive]').forEach(button=>button.onclick=()=>select(button.dataset.drive));
 const toggleAxle=axle=>{
  const car=getPlayer();if(car.driveMode!=='4x4'||!['front','rear'].includes(axle))return;
  car.axleLocks??={front:true,rear:true};car.axleLocks[axle]=!car.axleLocks[axle];
  selectDriveMode(car,car.driveMode);signature='';update();onChange();onInteract();
 };
 document.querySelectorAll('[data-axle-lock]').forEach(button=>{const key=button.dataset.axleLock==='front'?'Z':'X';button.setAttribute('aria-keyshortcuts',key);const hint=document.createElement('kbd');hint.textContent=key;hint.setAttribute('aria-hidden','true');button.append(hint);button.onclick=()=>toggleAxle(button.dataset.axleLock);});
 function shortcut(event){
  if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return false;
  const digit=/^(?:Digit|Numpad)([1-4])$/.exec(event.code);
  if(digit){select(DRIVE_MODES[Number(digit[1])-1].id);return true;}
  if(event.code==='KeyZ'||event.code==='KeyX'){toggleAxle(event.code==='KeyZ'?'front':'rear');return true;}
  return false;
 }
 function update(){
  const car=getPlayer(),state=car.powertrain,requested=driveModeById(car.driveMode),active=driveModeById(state?.mode),locks=state?.locks??{};
  const key=JSON.stringify([requested.id,active.id,car.axleLocks,locks,transmissionMode(car)]);if(key===signature)return;signature=key;
  document.querySelectorAll('[data-drive]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.drive===active.id));button.classList.toggle('pending',requested.id!==active.id&&button.dataset.drive===requested.id);});
  document.querySelectorAll('[data-drive=auto]').forEach(button=>{button.firstChild.textContent='A';button.title='Wybierz automat · klawisz 1';button.setAttribute('aria-label',button.title);});
  let waiting=requested.id!==active.id;
  document.querySelectorAll('[data-axle-lock]').forEach(button=>{
   const axle=button.dataset.axleLock,wanted=car.axleLocks?.[axle]??true,pending=requested.id==='4x4'&&Boolean(locks[axle])!==wanted;
   button.disabled=requested.id!=='4x4';button.setAttribute('aria-pressed',String(Boolean(locks[axle])));button.classList.toggle('pending',pending);waiting||=pending;
   button.title=(locks[axle]?'Blokada włączona':'Blokada wyłączona')+(pending?' · oczekuje na prędkość poniżej 8 km/h':'')+' · klawisz '+(axle==='front'?'Z':'X');
  });
  document.querySelector('#drive-help').textContent=requested.description+(waiting?' Oczekuje: zwolnij poniżej 8 km/h i postaw koła na podłożu.':'');
  document.querySelector('#drive-range-status').textContent=waiting?`${active.id!==requested.id?active.label+' → '+requested.label:'BLOKADY'} · ZWOLNIJ <8 km/h`:`${active.label}${locks.front?' · PRZÓD 🔒':''}${locks.rear?' · TYŁ 🔒':''}`;
  const notice=document.querySelector('#drive-hud-status');notice.hidden=!waiting;notice.textContent=waiting?'ZWOLNIJ <8 km/h':'';
 }
 update();return {update,select,shortcut};
}

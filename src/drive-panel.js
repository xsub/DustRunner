import {DRIVE_MODES,driveModeById} from './drive-modes.js';
import {selectDriveMode} from './powertrain.js';

export function createDrivePanel({getPlayer,onChange,onInteract}){
 const menu=document.querySelector('#drive-menu-modes'),hud=document.querySelector('#drive-hud-modes');
 const buttons=compact=>DRIVE_MODES.map(mode=>`<button type="button" data-drive="${mode.id}" aria-pressed="false" title="${mode.name}" aria-label="Tryb ${mode.name}">${mode.label}${compact?'':`<small>${mode.name.split(' · ')[1]}</small>`}</button>`).join('');
 menu.innerHTML=buttons(false);hud.innerHTML=buttons(true);let signature='';
 const select=id=>{selectDriveMode(getPlayer(),id);signature='';update();onChange();onInteract();};
 document.querySelectorAll('[data-drive]').forEach(button=>button.onclick=()=>select(button.dataset.drive));
 document.querySelectorAll('[data-axle-lock]').forEach(button=>button.onclick=()=>{
  const car=getPlayer(),axle=button.dataset.axleLock;car.axleLocks??={front:true,rear:true};car.axleLocks[axle]=!car.axleLocks[axle];
  selectDriveMode(car,car.driveMode);signature='';update();onChange();onInteract();
 });
 function update(){
  const car=getPlayer(),state=car.powertrain,requested=driveModeById(car.driveMode),active=driveModeById(state?.mode),locks=state?.locks??{};
  const key=JSON.stringify([requested.id,active.id,car.axleLocks,locks]);if(key===signature)return;signature=key;
  document.querySelectorAll('[data-drive]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.drive===active.id));button.classList.toggle('pending',requested.id!==active.id&&button.dataset.drive===requested.id);});
  let waiting=requested.id!==active.id;
  document.querySelectorAll('[data-axle-lock]').forEach(button=>{
   const axle=button.dataset.axleLock,wanted=car.axleLocks?.[axle]??true,pending=requested.id==='4x4'&&Boolean(locks[axle])!==wanted;
   button.disabled=requested.id!=='4x4';button.setAttribute('aria-pressed',String(Boolean(locks[axle])));button.classList.toggle('pending',pending);waiting||=pending;
   button.title=(locks[axle]?'Blokada włączona':'Blokada wyłączona')+(pending?' · oczekuje na prędkość poniżej 8 km/h':'');
  });
  document.querySelector('#drive-help').textContent=requested.description+(waiting?' Oczekuje: zwolnij poniżej 8 km/h i postaw koła na podłożu.':'');
  document.querySelector('#drive-range-status').textContent=waiting?`${active.id!==requested.id?active.label+' → '+requested.label:'BLOKADY'} · ZWOLNIJ <8 km/h`:`${active.label}${locks.front?' · PRZÓD 🔒':''}${locks.rear?' · TYŁ 🔒':''}`;
  const notice=document.querySelector('#drive-hud-status');notice.hidden=!waiting;notice.textContent=waiting?'ZWOLNIJ <8 km/h':'';
 }
 update();return {update,select};
}

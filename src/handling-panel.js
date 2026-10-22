import {t as msg,tx as msgHTML} from './i18n.js';
import {HANDLING_PROFILES} from './handling.js';
const KEY='dust-runner-handling-v1';
export function createHandlingPanel({getPlayer,onChange,onInteract}){
 const select=document.querySelector('#handling-profile'),descent=document.querySelector('#hill-descent'),description=document.querySelector('#handling-help');
 const hud=document.createElement('div');hud.className='handling-hud';hud.innerHTML=`<small id="handling-badge"></small><button type="button" id="descent-hud" title="${msgHTML("handling_panel.descent_control_in_lo_44_h")}" aria-label="${msgHTML("handling_panel.hill_descent_control")}">${msgHTML("handling_panel.hdc")}</button>`;
 document.querySelector('#drive-hud-modes').before(hud);
 const badge=hud.querySelector('small'),button=hud.querySelector('button'),car=getPlayer();let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)??'{}')??{};}catch{}
 car.handlingProfile=HANDLING_PROFILES.includes(saved.profile)?saved.profile:'arcade';car.hillDescent=saved.hillDescent!==false;
 function save(){const c=getPlayer();try{localStorage.setItem(KEY,JSON.stringify({profile:c.handlingProfile,hillDescent:c.hillDescent}));}catch{}}
 let signature='';
 function update(){const c=getPlayer(),arcade=c.handlingProfile==='arcade',active=Boolean(c.hillDescent&&c.physics?.descentActive);
  const key=[c.handlingProfile,c.hillDescent,Boolean(active)].join(':');if(key===signature)return;signature=key;
  select.value=c.handlingProfile;descent.checked=c.hillDescent;descent.disabled=false;button.disabled=false;button.setAttribute('aria-pressed',String(Boolean(c.hillDescent)));button.classList.toggle('descent-active',Boolean(active));button.textContent=active?msg("handling_panel.hdc_2"):c.hillDescent?msg("handling_panel.hdc_on"):msg("handling_panel.hdc_off");badge.textContent=arcade?msg("handling_panel.arcade_44"):msg("handling_panel.classic");
  description.textContent=arcade?msg("handling_panel.3d_physics_with_driver_assistance_smoother"):msg("handling_panel.direct_steering_and_throttle_without_countersteer");
 }
 select.onchange=()=>{const c=getPlayer();if(!HANDLING_PROFILES.includes(select.value))return;c.handlingProfile=select.value;if(c.physics){c.physics.arcade={};c.physics.descentActive=false;}save();onChange();update();};
 function setDescent(enabled){const c=getPlayer();c.hillDescent=enabled;if(!enabled&&c.physics)c.physics.descentActive=false;save();update();}
 function toggleDescent(){setDescent(!getPlayer().hillDescent);onInteract();}
 descent.onchange=()=>setDescent(descent.checked);button.onclick=toggleDescent;
 update();return {update,toggleDescent};
}

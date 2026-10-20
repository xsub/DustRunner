import {HANDLING_PROFILES} from './handling.js';
const KEY='dust-runner-handling-v1';
export function createHandlingPanel({getPlayer,onChange,onInteract}){
 const select=document.querySelector('#handling-profile'),descent=document.querySelector('#hill-descent'),description=document.querySelector('#handling-help');
 const hud=document.createElement('div');hud.className='handling-hud';hud.innerHTML='<small id="handling-badge"></small><button type="button" id="descent-hud" title="Kontrola zjazdu w LO/4×4 · H" aria-label="Kontrola zjazdu HDC">HDC</button>';
 document.querySelector('#drive-hud-modes').before(hud);
 const badge=hud.querySelector('small'),button=hud.querySelector('button'),car=getPlayer();let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)??'{}')??{};}catch{}
 car.handlingProfile=HANDLING_PROFILES.includes(saved.profile)?saved.profile:'arcade';car.hillDescent=saved.hillDescent!==false;
 function save(){const c=getPlayer();try{localStorage.setItem(KEY,JSON.stringify({profile:c.handlingProfile,hillDescent:c.hillDescent}));}catch{}}
 let signature='';
 function update(){const c=getPlayer(),arcade=c.handlingProfile==='arcade',active=arcade&&c.physics?.descentActive;
  const key=[c.handlingProfile,c.hillDescent,Boolean(active)].join(':');if(key===signature)return;signature=key;
  select.value=c.handlingProfile;descent.checked=c.hillDescent;descent.disabled=!arcade;button.disabled=!arcade;button.setAttribute('aria-pressed',String(arcade&&c.hillDescent));button.classList.toggle('descent-active',Boolean(active));button.textContent=active?'HDC ↓':c.hillDescent&&arcade?'HDC ON':'HDC OFF';badge.textContent=arcade?'ARCADE 4×4':'KLASYCZNY';
  description.textContent=arcade?'Fizyka 3D + pomoc kierowcy. Kierownica reaguje na prędkość, gaz narasta płynnie. Auto center dodaje delikatną kontrę; tryb utrzymywanego kąta pozostawia pełną kontrolę kierowcy. Shift: ręczny na tylne koła. H: kontrola zjazdu w LO/4×4 po puszczeniu gazu.':'Dotychczasowa charakterystyka kierownicy i gazu, bez pomocy w kontrze i bez automatycznego hamowania na zjeździe. Masa, zawieszenie i napęd pozostają takie same.';
 }
 select.onchange=()=>{const c=getPlayer();if(!HANDLING_PROFILES.includes(select.value))return;c.handlingProfile=select.value;if(c.physics){c.physics.arcade={};c.physics.descentActive=false;}save();onChange();update();};
 function toggleDescent(){const c=getPlayer();if(c.handlingProfile!=='arcade')return;c.hillDescent=!c.hillDescent;save();update();onInteract();}
 descent.onchange=()=>{getPlayer().hillDescent=descent.checked;save();update();};button.onclick=toggleDescent;
 update();return {update,toggleDescent};
}

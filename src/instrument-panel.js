import {instrumentReading,instrumentStyle,INSTRUMENT_NAMES,INSTRUMENT_STYLES,loadGearColor} from './instrument-data.js';
const STORAGE_KEY='dust-runner-instruments-v1';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const point=(t,r)=>{const a=(135+t*270)*Math.PI/180;return [60+Math.cos(a)*r,60+Math.sin(a)*r];};
function makeGauge(label,unit,min,max,small=false,redline=Infinity){
 const element=document.createElement('div');element.className='instrument-gauge'+(small?' instrument-small':'');
 let ticks='';const count=small?8:32;
 for(let i=0;i<=count;i++){
  const t=i/count,a=point(t,49),b=point(t,i%4===0?42:46);
  ticks+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${min+t*(max-min)>=redline?'#e86a58':'#d9decd'}" stroke-width="${i%4===0?1.2:.6}"/>`;
  if(!small&&i%8===0&&i<count){const p=point(t,34);ticks+=`<text x="${p[0]}" y="${p[1]+3}" class="instrument-tick">${unit==='RPM'?Number(((min+t*(max-min))/1000).toFixed(1)):Math.round(min+t*(max-min))}</text>`;}
 }
 element.innerHTML=`<svg viewBox="0 0 120 120" role="img" aria-label="${label}"><circle class="instrument-bezel" cx="60" cy="60" r="57"/><circle class="instrument-face" cx="60" cy="60" r="53"/>${ticks}<g class="instrument-needle"><line x1="60" y1="67" x2="60" y2="19"/><circle cx="60" cy="60" r="3.5"/></g><text class="instrument-label" x="60" y="78">${label}</text><text class="instrument-value" x="60" y="96"></text><text class="instrument-unit" x="60" y="109">${small?'':unit==='RPM'?'RPM × 1000':unit}</text></svg>`;
 const needle=element.querySelector('.instrument-needle'),value=element.querySelector('.instrument-value'),svg=element.firstElementChild;
 return {element,update(n){const angle=-135+clamp((n-min)/(max-min),0,1)*270;needle.style.transform=`rotate(${angle}deg)`;value.textContent=small?`${Math.round(n)}${unit}`:Math.round(n);svg.setAttribute('aria-label',`${label}: ${Math.round(n)} ${unit}`);}};
}
export function createInstrumentPanel({getPlayer,onInteract}){
 const root=document.querySelector('.speed'),select=document.querySelector('#instrument-style'),caption=document.querySelector('#instrument-style-status'),gauges=document.querySelector('#instrument-gauges'),title=document.querySelector('#instrument-title'),loadLabel=document.querySelector('#instrument-load');
 let preference='six',signature='',items;
 try{const saved=localStorage.getItem(STORAGE_KEY);if(INSTRUMENT_STYLES.includes(saved))preference=saved;}catch{}
 select.value=preference;
 select.onchange=()=>{preference=INSTRUMENT_STYLES.includes(select.value)?select.value:'auto';try{localStorage.setItem(STORAGE_KEY,preference);}catch{}signature='';update();onInteract();};
 function update(){
  const car=getPlayer(),data=instrumentReading(car),style=instrumentStyle(preference,car.style),key=`${style}:${car.engineId}`;
  if(signature!==key){
   signature=key;root.dataset.instrumentStyle=style;title.textContent='BRONCO® · '+INSTRUMENT_NAMES[style].toUpperCase();
   const speed=makeGauge('PRĘDKOŚĆ','km/h',0,180),rpm=makeGauge('OBROTY','RPM',0,Math.ceil(data.redline/1000)*1000,false,data.redline*.9);
   speed.element.classList.add('instrument-speed');rpm.element.classList.add('instrument-rpm');
   const aux=document.createElement('div');aux.className='instrument-aux';
   items={speed,rpm,load:makeGauge('LOAD','%',0,100,true),nitro:makeGauge('NITRO','%',0,100,true),pitch:makeGauge('WZDŁUŻ','°',-90,90,true),roll:makeGauge('PRZECHYŁ','°',-180,180,true)};
   aux.append(items.load.element,items.nitro.element,items.pitch.element,items.roll.element);gauges.replaceChildren(speed.element,aux,rpm.element);
  }
  for(const [key,gauge] of Object.entries(items))gauge.update(data[key]);
  const gear=document.querySelector('#gear');gear.style.color=loadGearColor(data.gear,data.load);gear.classList.toggle('gear-reverse',data.gear<0);
  loadLabel.textContent=Math.round(data.load)+'% OBCIĄŻENIA';
  caption.textContent=(preference==='auto'?'AUTO · według nadwozia: ':'Wybrany zestaw: ')+INSTRUMENT_NAMES[style]+'. Zmiana działa podczas jazdy, bez restartu.';
  root.dataset.load=String(Math.round(data.load));root.dataset.pitch=data.pitch.toFixed(1);root.dataset.roll=data.roll.toFixed(1);
 }
 update();return {update};
}

import {BRONCO_STYLES} from './vehicle.js';
import {ENGINES} from './engines.js';
import {DEFAULT_TUNING,validateTuning} from './tuning.js';
import {DESERT_BOUNDS} from './desert.js';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const requireValue=(ok,message)=>{if(!ok)throw Error(message);};
const round=n=>Math.round(n*10)/10;
function point(p,heading=false){
 requireValue(Array.isArray(p)&&p.length===(heading?3:2)&&p.every(finite),'Nieprawidłowa pozycja.');
 requireValue(p[0]>=DESERT_BOUNDS.min.x&&p[0]<=DESERT_BOUNDS.max.x&&p[1]>=DESERT_BOUNDS.min.z&&p[1]<=DESERT_BOUNDS.max.z,'Pozycja poza pustynią.');
 if(heading)requireValue(Math.abs(p[2])<=Math.PI+1e-4,'Nieprawidłowy kierunek auta.');
 return [round(p[0]),round(p[1]),...(heading?[Math.round(p[2]*10000)/10000]:[])];
}
export function validateDesertShare(data){
 requireValue(data&&data.v===1,'Nieobsługiwana wersja zaproszenia.');const out={v:1};
 if(data.m!==undefined){requireValue(typeof data.m==='string'&&Object.hasOwn(BRONCO_STYLES,data.m),'Nieznany model auta.');out.m=data.m;}
 if(data.s!==undefined){
  const s=data.s;requireValue(s&&typeof s==='object','Nieprawidłowe ustawienia auta.');
  requireValue(ENGINES.some(e=>e.id===s.engineId)&&['auto','hi','lo','4x4'].includes(s.driveMode)&&['automatic','manual'].includes(s.transmissionMode)&&['arcade','classic'].includes(s.handlingProfile)&&['return','hold'].includes(s.steeringMode),'Nieprawidłowy napęd lub sterowanie.');
  requireValue(typeof s.hillDescent==='boolean'&&typeof s.frontLock==='boolean'&&typeof s.rearLock==='boolean','Nieprawidłowe blokady lub HDC.');
  requireValue(['engine','grip'].every(k=>Number.isInteger(s.upgrades?.[k])&&s.upgrades[k]>=0&&s.upgrades[k]<=3),'Nieprawidłowe ulepszenia.');
  // Full tuning snapshot also overrides different recipient defaults. Accept
  // missing future fields with defaults, but reject unknown/unsafe parameters.
  const tuning=validateTuning(s.tuning??DEFAULT_TUNING);
  out.s={engineId:s.engineId,driveMode:s.driveMode,transmissionMode:s.transmissionMode,handlingProfile:s.handlingProfile,steeringMode:s.steeringMode,hillDescent:s.hillDescent,frontLock:s.frontLock,rearLock:s.rearLock,upgrades:{engine:s.upgrades.engine,grip:s.upgrades.grip},tuning};
 }
 if(data.p!==undefined)out.p=point(data.p,true);
 if(data.r!==undefined){
  requireValue(Array.isArray(data.r)&&data.r.length>=2&&data.r.length<=22,'Ślad musi mieć 2–22 punkty.');out.r=data.r.map(p=>point(p));
  let length=0;for(let i=1;i<out.r.length;i++)length+=Math.hypot(out.r[i][0]-out.r[i-1][0],out.r[i][1]-out.r[i-1][1]);
  requireValue(length<=110,'Ślad jest za długi.');
 }
 return out;
}
const bytesToBase64=bytes=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');};
export async function encodeDesertShare(data,{compress=true}={}){
 const bytes=new TextEncoder().encode(JSON.stringify(validateDesertShare(data)));let kind='j',encoded=bytes;
 if(compress&&typeof CompressionStream!=='undefined'){
  const packed=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  if(packed.length<bytes.length){kind='g';encoded=packed;}
 }
 const result=kind+'.'+bytesToBase64(encoded);requireValue(result.length<=6000,'Za dużo danych do jednego linku.');return result;
}
export async function decodeDesertShare(url){
 const token=new URL(url).hash.slice(1);if(!token)return null;
 const value=new URLSearchParams(token).get('dr');if(!value)return null;
 requireValue(value.length<=6000&&/^[gj]\.[A-Za-z0-9_-]+$/.test(value),'Uszkodzony link do pustyni.');
 const raw=atob(value.slice(2).replaceAll('-','+').replaceAll('_','/'));let bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(value[0]==='g'){
  requireValue(typeof DecompressionStream!=='undefined','Ta przeglądarka nie obsługuje skompresowanego zaproszenia.');
  const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),chunks=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;requireValue(size<=24000,'Zaproszenie jest za duże.');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 }
 requireValue(bytes.length<=24000,'Zaproszenie jest za duże.');return validateDesertShare(JSON.parse(new TextDecoder().decode(bytes)));
}

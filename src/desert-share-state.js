import {t as msg} from './i18n.js';
import {BRONCO_STYLES} from './vehicle.js';
import {ENGINES} from './engines.js';
import {DEFAULT_TUNING,validateTuning} from './tuning.js';
import {DESERT_BOUNDS} from './desert.js';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const requireValue=(ok,message)=>{if(!ok)throw Error(message);};
const round=n=>Math.round(n*10)/10;
function point(p,heading=false){
 requireValue(Array.isArray(p)&&p.length===(heading?3:2)&&p.every(finite),msg("desert_share_state.invalid_position"));
 requireValue(p[0]>=DESERT_BOUNDS.min.x&&p[0]<=DESERT_BOUNDS.max.x&&p[1]>=DESERT_BOUNDS.min.z&&p[1]<=DESERT_BOUNDS.max.z,msg("desert_share_state.position_is_outside_the_desert"));
 if(heading)requireValue(Math.abs(p[2])<=Math.PI+1e-4,msg("desert_share_state.invalid_vehicle_heading"));
 return [round(p[0]),round(p[1]),...(heading?[Math.round(p[2]*10000)/10000]:[])];
}
export function validateDesertShare(data){
 requireValue(data&&data.v===1,msg("desert_share_state.this_invitation_version_is_not_supported"));const out={v:1};
 if(data.m!==undefined){requireValue(typeof data.m==='string'&&Object.hasOwn(BRONCO_STYLES,data.m),msg("desert_share_state.unknown_vehicle_model"));out.m=data.m;}
 if(data.s!==undefined){
  const s=data.s;requireValue(s&&typeof s==='object',msg("desert_share_state.invalid_vehicle_settings"));
  requireValue(ENGINES.some(e=>e.id===s.engineId)&&['auto','hi','lo','4x4'].includes(s.driveMode)&&['automatic','manual'].includes(s.transmissionMode)&&['arcade','classic'].includes(s.handlingProfile)&&['return','hold'].includes(s.steeringMode),msg("desert_share_state.invalid_drivetrain_or_controls"));
  requireValue(typeof s.hillDescent==='boolean'&&typeof s.frontLock==='boolean'&&typeof s.rearLock==='boolean',msg("desert_share_state.invalid_differential_lock_or_hdc_settings"));
  requireValue(['engine','grip'].every(k=>Number.isInteger(s.upgrades?.[k])&&s.upgrades[k]>=0&&s.upgrades[k]<=3),msg("desert_share_state.invalid_upgrades"));
  // Full tuning snapshot also overrides different recipient defaults. Accept
  // missing future fields with defaults, but reject unknown/unsafe parameters.
  const tuning=validateTuning(s.tuning??DEFAULT_TUNING);
  out.s={engineId:s.engineId,driveMode:s.driveMode,transmissionMode:s.transmissionMode,handlingProfile:s.handlingProfile,steeringMode:s.steeringMode,hillDescent:s.hillDescent,frontLock:s.frontLock,rearLock:s.rearLock,upgrades:{engine:s.upgrades.engine,grip:s.upgrades.grip},tuning};
 }
 if(data.p!==undefined)out.p=point(data.p,true);
 if(data.r!==undefined){
  requireValue(Array.isArray(data.r)&&data.r.length>=2&&data.r.length<=22,msg("desert_share_state.a_route_must_contain_222_points"));out.r=data.r.map(p=>point(p));
  let length=0;for(let i=1;i<out.r.length;i++)length+=Math.hypot(out.r[i][0]-out.r[i-1][0],out.r[i][1]-out.r[i-1][1]);
  requireValue(length<=110,msg("desert_share_state.the_route_is_too_long"));
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
 const result=kind+'.'+bytesToBase64(encoded);requireValue(result.length<=6000,msg("desert_share_state.too_much_data_for_one_link"));return result;
}
export async function decodeDesertShare(url){
 const token=new URL(url).hash.slice(1);if(!token)return null;
 const value=new URLSearchParams(token).get('dr');if(!value)return null;
 requireValue(value.length<=6000&&/^[gj]\.[A-Za-z0-9_-]+$/.test(value),msg("desert_share_state.this_desert_link_is_damaged"));
 const raw=atob(value.slice(2).replaceAll('-','+').replaceAll('_','/'));let bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(value[0]==='g'){
  requireValue(typeof DecompressionStream!=='undefined',msg("desert_share_state.this_browser_cannot_open_compressed_invitations"));
  const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),chunks=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;requireValue(size<=24000,msg("desert_share_state.this_invitation_is_too_large"));chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 }
 requireValue(bytes.length<=24000,msg("desert_share_state.this_invitation_is_too_large"));return validateDesertShare(JSON.parse(new TextDecoder().decode(bytes)));
}

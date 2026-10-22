import {normalizeDesertOptions,DESERT_VARIANTS} from './desert.js';
export const PUBLIC_GAME_URL='https://xsub.github.io/DustRunner/';
export function desertInvitation(options){
 const level=normalizeDesertOptions(options),profile=DESERT_VARIANTS.find(v=>v.id===level.variant),url=new URL(PUBLIC_GAME_URL);
 url.searchParams.set('mode','desert');url.searchParams.set('dunes',level.variant);url.searchParams.set('seed',String(level.seed));
 return {url:url.href,text:`Wskakuj do Dust Runner! 🏜️ Moja pustynia: ${profile.name.toLowerCase()}, ziarno ${level.seed}. Skoki z wydm i jazda 4×4 — spróbuj!\n${url.href}`};
}

export async function extendedDesertInvitation(options,state){
 const {encodeDesertShare}=await import('./desert-share-state.js');
 const invitation=desertInvitation(options),url=new URL(invitation.url);
 if(Object.keys(state).some(key=>key!=='v'))url.hash='dr='+await encodeDesertShare(state);
 const parts=[state.m?'samochód':null,state.s?'ustawienia auta':null,state.p?'miejsce startu':null,state.r?'ślad przejazdu':null].filter(Boolean);
 return {url:url.href,text:invitation.text.replace(invitation.url,(parts.length?'W zaproszeniu: '+parts.join(', ')+'.\n':'')+url.href)};
}

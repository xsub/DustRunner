import {t as msg,formatList,getLocale} from './i18n.js';
import {normalizeDesertOptions,DESERT_VARIANTS} from './desert.js';
export const PUBLIC_GAME_URL='https://xsub.github.io/DustRunner/';
export function desertInvitation(options){
 const level=normalizeDesertOptions(options),profile=DESERT_VARIANTS.find(v=>v.id===level.variant),url=new URL(PUBLIC_GAME_URL);
 url.searchParams.set('mode','desert');url.searchParams.set('dunes',level.variant);url.searchParams.set('seed',String(level.seed));
 if(getLocale()!=='en')url.searchParams.set('lang',getLocale());
 return {url:url.href,text:msg("desert_share.join_me_in_dust_runner_explore",{v0:(profile.name.toLowerCase()),v1:(level.seed),v2:(url.href)})};
}

export async function extendedDesertInvitation(options,state){
 const {encodeDesertShare}=await import('./desert-share-state.js');
 const invitation=desertInvitation(options),url=new URL(invitation.url);
 if(Object.keys(state).some(key=>key!=='v'))url.hash='dr='+await encodeDesertShare(state);
 const parts=[state.m?msg("desert_share.vehicle"):null,state.s?msg("desert_share.vehicle_settings"):null,state.p?msg("desert_share.starting_position"):null,state.r?msg("desert_share.recent_route"):null].filter(Boolean);
 return {url:url.href,text:invitation.text.replace(invitation.url,(parts.length?(msg("desert_share.included")+" ")+formatList(parts)+'.\n':'')+url.href)};
}

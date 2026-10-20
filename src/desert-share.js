import {normalizeDesertOptions,DESERT_VARIANTS} from './desert.js';
export const PUBLIC_GAME_URL='https://xsub.github.io/DustRunner/';
export function desertInvitation(options){
 const level=normalizeDesertOptions(options),profile=DESERT_VARIANTS.find(v=>v.id===level.variant),url=new URL(PUBLIC_GAME_URL);
 url.searchParams.set('mode','desert');url.searchParams.set('dunes',level.variant);url.searchParams.set('seed',String(level.seed));
 return {url:url.href,text:`Wskakuj do Dust Runner! 🏜️ Moja pustynia: ${profile.name.toLowerCase()}, ziarno ${level.seed}. Skoki z wydm i jazda 4×4 — spróbuj!\n${url.href}`};
}

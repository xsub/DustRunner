import {t as msg} from './i18n.js';
// Fourteen independent closed layouts. The opening five points form a runway;
// the remaining route varies coves, hairpins, chicanes and broad sweepers.
const layouts=[
 [msg("track_pack.canyon_run"),[1,.15],[.65,.95],[.05,.62],[-.65,1],[-1,.1]],
 [msg("track_pack.sidewinder"),[1,-.15],[.6,.15],[.95,.65],[.35,1],[-.1,.55],[-.6,1],[-1,.3]],
 [msg("track_pack.red_mesa"),[1,.05],[1,.9],[.35,1],[.3,-.15],[-.3,-.15],[-.35,1],[-1,1],[-1,-.1]],
 [msg("track_pack.thunder_basin"),[1,.6],[.4,1],[.15,.45],[-.2,.95],[-.7,.7],[-1,.1]],
 [msg("track_pack.scorpion"),[1,.1],[.55,-.1],[.55,.9],[.1,1],[-.1,-.1],[-.6,.05],[-.6,.95],[-1,.8],[-1,.1]],
 [msg("track_pack.high_desert"),[1,.4],[.7,1],[.15,.95],[-.2,.45],[-.65,.95],[-1,.5],[-.8,-.1]],
 [msg("track_pack.ravine_rush"),[.9,-.1],[.5,.1],[1,.6],[.4,1],[-.15,.6],[-.6,1],[-1,.4],[-.7,-.15]],
 [msg("track_pack.coyote_pass"),[1,.1],[.8,.9],[.35,.65],[0,1],[-.4,.5],[-.9,.95],[-1,.1]],
 [msg("track_pack.badlands"),[1,.65],[.45,1],[.45,-.25],[-.15,-.25],[-.2,.95],[-.7,1],[-1,.2]],
 [msg("track_pack.dune_express"),[1,.25],[.9,.9],[.4,1],[0,.75],[-.4,1],[-.95,.7],[-1,0]],
 [msg("track_pack.copper_ridge"),[.9,-.2],[.65,.3],[1,.85],[.25,1],[-.2,.4],[-.5,.95],[-1,.6],[-.9,-.2]],
 [msg("track_pack.twin_peaks"),[1,.3],[.5,1],[0,-.15],[-.5,1],[-1,.25]],
 [msg("track_pack.outlaw_loop"),[1,.5],[.65,1],[.25,.45],[-.15,.7],[-.5,.45],[-.9,.95],[-1,.1]],
 [msg("track_pack.king_of_the_dirt"),[1,.2],[.8,.95],[.35,.9],[.35,.1],[-.1,.05],[-.15,.95],[-.8,.95],[-1,.3],[-.85,-.15]],
];
export function extraTrackDefinitions(){
 return layouts.map(([name,...tail],i)=>{
  const sx=360+(i%4)*35,sz=240+(i%3)*25;
  const points=[[-.9,-.8],[-.5,-.8],[0,-.8],[.5,-.8],[.9,-.8],...tail].map(([x,z])=>[x*sx,z*sz]);
  return {name,points,roughness:1+(i%4)*.2,terrainStyle:i%4};
 });
}

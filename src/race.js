export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function angleDelta(target,current){return Math.atan2(Math.sin(target-current),Math.cos(target-current));}
export function advanceProgress(previous,next,checkpoint,lap,samples=600){
 const delta=(next-previous+samples)%samples;
 if(delta>samples/2)return {checkpoint,lap};
 const quarter=Math.floor(next/(samples/4));
 if(quarter===checkpoint+1)checkpoint=quarter;
 if(checkpoint===3&&next<samples/4&&previous>samples*.75){lap++;checkpoint=0;}
 return {checkpoint,lap};
}
export function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;}

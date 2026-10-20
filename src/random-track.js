// Ordered points around a broad, simple loop avoid random self-intersections.
// The five-point opening remains a straight runway for the grid and big jump.
export function normalizeTrackSeed(seed){const n=Number(seed);return Number.isFinite(n)?Math.trunc(n)>>>0:20261020;}
export function randomTrackDefinition(seed){
 seed=normalizeTrackSeed(seed);let state=seed;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const sx=430+random()*180,sz=280+random()*120,phase=random()*Math.PI*2;
 const points=[[-.85,-.8],[-.43,-.8],[0,-.8],[.43,-.8],[.85,-.8]].map(([x,z])=>[x*sx,z*sz]);
 const bends=12+Math.floor(random()*5);
 for(let i=0;i<=bends;i++){
  const angle=-.35+(Math.PI+.7)*i/bends,r=1+.20*Math.sin(angle*3+phase)+.10*Math.sin(angle*5+phase*.7)+.055*(random()-.5);
  points.push([Math.cos(angle)*sx*r,Math.sin(angle)*sz*r]);
 }
 return {name:`LOSOWY · #${seed}`,points,roughness:.8+random()*.5,terrainStyle:Math.floor(random()*4),rampCount:4+Math.floor(random()*7),seed};
}

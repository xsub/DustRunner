export const AI_LEVELS=Object.freeze([
 {id:'amateur',name:'Amateur',pace:.76,look:.8,steering:1.35,error:1.1,throttle:.82,brakeMargin:.4,boostBend:.08,boostAngle:.12},
 {id:'advanced',name:'Advanced',pace:.9,look:.9,steering:1.5,error:.65,throttle:.92,brakeMargin:.7,boostBend:.12,boostAngle:.16},
 {id:'seasoned',name:'Seasoned',pace:1,look:1,steering:1.6,error:.3,throttle:1,brakeMargin:1,boostBend:.18,boostAngle:.2},
 {id:'pro',name:'Pro',pace:1.1,look:1.12,steering:1.7,error:.12,throttle:1,brakeMargin:1.1,boostBend:.23,boostAngle:.25},
 {id:'master',name:'Master',pace:1.2,look:1.23,steering:1.8,error:0,throttle:1,brakeMargin:1.2,boostBend:.28,boostAngle:.3},
]);
export const MAX_OPPONENTS=11;
export const aiLevel=id=>AI_LEVELS.find(level=>level.id===id)??AI_LEVELS[2];
export function normalizeRaceSetup(value={}){
 const n=Number(value.count),count=Number.isFinite(n)?Math.max(0,Math.min(MAX_OPPONENTS,Math.round(n))):5;
 return {count,skills:Array.from({length:MAX_OPPONENTS},(_,i)=>aiLevel(value.skills?.[i]??AI_LEVELS[i%5].id).id)};
}
const KEY='dust-runner-opponents-v1';
export function readRaceSetup(storage){try{return normalizeRaceSetup(JSON.parse(storage.getItem(KEY)??'{}')??{});}catch{return normalizeRaceSetup();}}
export function saveRaceSetup(storage,setup){try{storage.setItem(KEY,JSON.stringify(normalizeRaceSetup(setup)));}catch{}}

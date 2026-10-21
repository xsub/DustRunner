import {tuning as cfg} from './tuning.js';
const box=(id,name,ratios,reverse,kind='automatic')=>Object.freeze({id,name,ratios:Object.freeze(ratios),reverse,kind,shiftTime:kind==='manual'?.26:.18});
export const TRANSMISSIONS=Object.freeze({
 i6:box('i6','Ford I6 · 3 biegi',[3.41,1.86,1],3.41,'manual'),
 rat:box('rat','Ford RAT/RAN · 3 biegi',[2.99,1.75,1],3.17,'manual'),
 c4:box('c4','Ford C4 · 3 biegi',[2.46,1.46,1],2.18),
 c6:box('c6','Ford C6 · 3 biegi',[2.46,1.46,1],2.18),
 np435:box('np435','NP435 · 4 biegi',[6.69,3.34,1.79,1],8,'manual'),
 aod:box('aod','Ford AOD · 4 biegi',[2.4,1.47,1,.67],2),
 e4od:box('e4od','Ford E4OD · 4 biegi',[2.71,1.538,1,.712],2.18),
 torqshift:box('torqshift','TorqShift 10R140 · 10 biegów',[4.615,2.919,2.132,1.773,1.519,1.277,1,.851,.687,.632],4.695),
});
// One chosen game pairing per engine, not every historical factory option.
export const ENGINE_TRANSMISSIONS=Object.freeze({'170':'i6','200':'i6','289':'rat','302':'c4','351m':'c6','400':'c6','300':'np435','300efi':'np435','302efi':'aod','351w':'c6','351wefi':'e4od','godzilla73':'torqshift'});
export const transmissionForEngine=id=>TRANSMISSIONS[ENGINE_TRANSMISSIONS[id]??'c4'];
export const TRANSMISSION_MODES=Object.freeze(['arcade','automatic','manual']);
export const transmissionMode=car=>TRANSMISSION_MODES.includes(car.transmissionMode)?car.transmissionMode:'arcade';
export const gearboxFor=car=>transmissionMode(car)==='arcade'?{id:'arcade',name:'Arcade · 3 biegi',ratios:[cfg.gear1,cfg.gear2,cfg.gear3],reverse:3.1,shiftTime:.14,kind:'automatic'}:transmissionForEngine(car.engineId);
export const gearLabel=car=>{const gear=car.powertrain?.gear??1;return gear<0?'R':gear===0?'N':(transmissionMode(car)==='manual'?'M':'D')+gear;};

// Use the assigned gearbox length so 3-, 4- and 10-speed boxes share endpoints.
export function gearColor(car){
 const gear=car.powertrain?.gear??1;
 if(gear<0)return '#000000';
 if(gear===0)return '#a0a5a0';
 const count=gearboxFor(car).ratios.length;
 const fraction=Math.max(0,Math.min(1,(gear-1)/Math.max(1,count-1)));
 return `hsl(${Math.round(fraction*120)} 80% 62%)`;
}

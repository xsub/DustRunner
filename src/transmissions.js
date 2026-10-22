import {t as msg} from './i18n.js';
import {tuning as cfg} from './tuning.js';
const box=(id,name,ratios,reverse,kind='automatic')=>Object.freeze({id,name,ratios:Object.freeze(ratios),reverse,kind,shiftTime:kind==='manual'?.26:.18});
export const TRANSMISSIONS=Object.freeze({
 i6:box('i6',msg("transmissions.ford_i6_3_speed"),[3.41,1.86,1],3.41,'manual'),
 rat:box('rat',msg("transmissions.ford_rat_ran_3_speed"),[2.99,1.75,1],3.17,'manual'),
 c4:box('c4',msg("transmissions.ford_c4_3_speed"),[2.46,1.46,1],2.18),
 c6:box('c6',msg("transmissions.ford_c6_3_speed"),[2.46,1.46,1],2.18),
 np435:box('np435',msg("transmissions.np435_4_speed"),[6.69,3.34,1.79,1],8,'manual'),
 aod:box('aod',msg("transmissions.ford_aod_4_speed"),[2.4,1.47,1,.67],2),
 e4od:box('e4od',msg("transmissions.ford_e4od_4_speed"),[2.71,1.538,1,.712],2.18),
 torqshift:box('torqshift',msg("transmissions.torqshift_10r140_10_speed"),[4.615,2.919,2.132,1.773,1.519,1.277,1,.851,.687,.632],4.695),
});
// One chosen game pairing per engine, not every historical factory option.
export const ENGINE_TRANSMISSIONS=Object.freeze({'170':'i6','200':'i6','289':'rat','302':'c4','351m':'c6','400':'c6','300':'np435','300efi':'np435','302efi':'aod','351w':'c6','351wefi':'e4od','godzilla73':'torqshift'});
export const transmissionForEngine=id=>TRANSMISSIONS[ENGINE_TRANSMISSIONS[id]??'c4'];
export const TRANSMISSION_MODES=Object.freeze(['arcade','automatic','manual']);
export const transmissionMode=car=>TRANSMISSION_MODES.includes(car.transmissionMode)?car.transmissionMode:'automatic';
export const savedTransmissionMode=value=>value==='manual'?'manual':'automatic';
export const gearboxFor=car=>transmissionMode(car)==='arcade'?{id:'arcade',name:msg("transmissions.arcade_3_speed"),ratios:[cfg.gear1,cfg.gear2,cfg.gear3],reverse:3.1,shiftTime:.14,kind:'automatic'}:transmissionForEngine(car.engineId);
export const gearLabel=car=>{const gear=car.powertrain?.gear??1;return gear<0?'R':gear===0?'N':(transmissionMode(car)==='manual'?'M':'A')+gear;};

import {t as msg} from './i18n.js';
import {REFERENCE_MODELS} from './vehicle-models.js';
// Engine families/availability follow the linked Bronco sources in ENGINE_NOTES.md.
// Curves, inertia and rev limits below are representative game calibrations,
// not factory dyno data or a comparison of SAE gross and net horsepower.
const make=(id,name,group,cylinders,liters,idle,redline,inertia,braking,curve,character)=>Object.freeze({id,name,group,cylinders,liters,idle,redline,inertia,braking,curve,character});
export const ENGINES=Object.freeze([
 make('170',msg("engines.170_2_8l_i6"),'1966–1977',6,2.8,700,4400,.24,1.3,[[700,128],[1400,185],[2400,215],[3200,190],[4400,105]],msg("engines.light_flywheel_modest_pull")),
 make('289',msg("engines.289_windsor_4_7l_v8"),'1966–1977',8,4.7,750,5400,.22,1.8,[[750,180],[1600,270],[3000,330],[4200,315],[5400,210]],msg("engines.eager_small_block_likes_revs")),
 make('302',msg("engines.302_windsor_4_9l_v8"),'1966–1977',8,4.9,700,5000,.28,2,[[700,205],[1600,290],[2800,335],[3800,300],[5000,200]],msg("engines.broad_torque_classic_v8")),
 make('200',msg("engines.200_3_3l_i6"),'1966–1977',6,3.3,650,4200,.31,1.5,[[650,145],[1600,222],[2400,215],[3200,178],[4200,112]],msg("engines.early_torque_relaxed_revs")),
 make('351m',msg("engines.351m_5_8l_v8"),'1978–1979',8,5.8,650,4500,.42,2.4,[[650,228],[1400,315],[2200,355],[3200,310],[4500,180]],msg("engines.heavy_flywheel_low_end_muscle")),
 make('400',msg("engines.400_6_6l_v8"),'1978–1979',8,6.6,625,4200,.48,2.8,[[625,265],[1200,350],[2000,376],[3000,330],[4200,190]],msg("engines.long_stroke_strongest_early_pull")),
 make('300',msg("engines.300_4_9l_i6_carb"),'1980–1996',6,4.9,650,4100,.40,2.2,[[650,215],[1400,295],[2000,305],[3000,248],[4100,145]],msg("engines.truck_six_low_rev_torque")),
 make('300efi',msg("engines.300_4_9l_i6_efi"),'1980–1996',6,4.9,700,4300,.36,2.2,[[700,235],[1400,325],[2200,359],[3200,285],[4300,165]],msg("engines.efi_response_smooth_low_end_pull")),
 make('302efi',msg("engines.302_5_0l_v8_efi"),'1980–1996',8,5,700,5200,.26,2,[[700,218],[1600,305],[3000,366],[4200,320],[5200,225]],msg("engines.efi_small_block_wider_power_band")),
 make('351w',msg("engines.351w_5_8l_v8_carb"),'1980–1996',8,5.8,700,5000,.35,2.5,[[700,240],[1600,345],[2800,390],[3900,355],[5000,235]],msg("engines.windsor_truck_v8_strong_midrange")),
 make('351wefi',msg("engines.351w_5_8l_v8_efi"),'1980–1996',8,5.8,700,5100,.32,2.5,[[700,260],[1600,365],[2800,425],[4000,385],[5100,260]],msg("engines.efi_torque_strongest_midrange")),
 make('godzilla73',msg("engines.godzilla_7_3l_v8_efi"),msg("engines.restomod_2020_swap"),8,7.3,650,6000,.46,3,[[650,390],[1500,510],[2500,600],[4000,644],[5500,557],[6000,470]],msg("engines.modern_ohv_swap_430_hp_644"))
]);
export const engineById=id=>ENGINES.find(e=>e.id===id)??ENGINES.find(e=>e.id==='302');
export function engineTorque(engine,rpm){
 const curve=engine.curve;
 if(rpm<=curve[0][0])return curve[0][1];
 for(let i=1;i<curve.length;i++)if(rpm<=curve[i][0]){const [x,y]=curve[i-1],[xx,yy]=curve[i];return y+(yy-y)*(rpm-x)/(xx-x);}
 return Math.max(0,curve.at(-1)[1]*(1-(rpm-engine.redline)/350));
}
export const defaultEngine=style=>REFERENCE_MODELS[style]?.engine??({classic:'302',ranger:'351m',sunset:'302efi',expedition:'300efi',sky:'302',crawler:'351w',copper78:'400',godzilla78:'godzilla73'}[style]??'302');

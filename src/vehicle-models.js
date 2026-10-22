import {t as msg} from './i18n.js';
// Original game-scale interpretations of the supplied custom-build photographs.
// Lift/tires are game calibrations, not claimed factory specifications.
const model=(name,color,options={})=>({name,color,roof:'#eee9d9',width:.99,rounded:.045,lights:'square',flares:color,era:1978,engine:'351m',bodyType:'wagon',wheelScale:1.12,wheelWidth:1.05,track:1.05,lift:.14,finish:'silver',wheelbase:options.compact?1:1.12,...options});
export const REFERENCE_MODELS={
 roadsterBlack:model(msg("vehicle_models.roadster_black_cage"),'#121715',{roof:'#202522',width:.89,lights:'round',era:1972,engine:'302',bodyType:'open',compact:true,fullCage:true,seat:'#ba754b',finish:'chrome',wheelScale:1.12,lift:.15,note:msg("vehicle_models.open_top_full_cage_tan_chrome")}),
 halfCabRed:model(msg("vehicle_models.half_cab_ruby"),'#b92324',{roof:'#b92324',width:.89,lights:'round',era:1970,engine:'302',bodyType:'halfCab',compact:true,flares:'#252b29',finish:'black',lift:.18,note:msg("vehicle_models.short_cab_open_bed_roll_bar")}),
 expeditionOrange:model(msg("vehicle_models.overland_ember"),'#d64b21',{roof:'#242a28',width:.89,lights:'round',era:1974,engine:'351w',compact:true,flares:'#333938',finish:'black',rack:true,bullbar:true,rivets:true,lift:.22,note:msg("vehicle_models.black_roof_rack_winch")}),
 highroller78:model(msg("vehicle_models.high_roller_78_mocha"),'#78563f',{roof:'#b9a88b',flares:'#b9a88b',engine:'400',wheelScale:1.4,wheelWidth:1.28,track:1.24,lift:.42,twoTone:'#ab9371',coils:true,note:msg("vehicle_models.lift_big_tires_red_springs")}),
 turf78:model(msg("vehicle_models.turf_giant_79_blue_ivory"),'#215969',{roof:'#e2dccb',engine:'400',wheelScale:1.55,wheelWidth:1.85,track:1.32,lift:.6,twoTone:'#dbd8c6',sunVisor:true,finish:'chrome',coils:true,note:msg("vehicle_models.balloon_tires_visor_two_tone")}),
 canyon78:model(msg("vehicle_models.ranger_79_orange_cream"),'#dc4825',{roof:'#e5e1d1',twoTone:'#e4dfcf',wheelScale:1.18,lift:.22,note:msg("vehicle_models.full_hardtop_wide_cream_stripe")}),
 softtop78:model(msg("vehicle_models.soft_trail_78_indigo"),'#253f78',{roof:'#202728',engine:'400',bodyType:'softtop',rounded:.11,flares:'#202728',wheelScale:1.22,wheelWidth:1.16,track:1.13,lift:.28,finish:'black',note:msg("vehicle_models.black_soft_top_mud_tires")}),
 bullnose80:model(msg("vehicle_models.bullnose_80_blue_white"),'#23638d',{roof:'#e6e7df',era:1980,engine:'302',width:1.02,rounded:.025,twoTone:'#dedfd5',wheelScale:1.17,lift:.22,note:msg("vehicle_models.bullnose_front_white_sides_hardtop")}),
 azure80:model(msg("vehicle_models.bullnose_82_turquoise"),'#16a2b3',{roof:'#e2dfce',era:1982,engine:'351w',width:1.02,rounded:.025,wheelScale:1.19,lift:.25,finish:'chrome',note:msg("vehicle_models.turquoise_square_grille_light_roof")}),
 forest80:model(msg("vehicle_models.forest_84_safari"),'#174d40',{roof:'#796c58',era:1984,engine:'351w',width:1.02,rounded:.025,wheelScale:1.27,wheelWidth:1.2,track:1.15,lift:.34,bullbar:true,fogLights:4,finish:'chrome',note:msg("vehicle_models.brown_hardtop_bullbar_four_spotlights")}),
 monster80:model(msg("vehicle_models.desert_beast_monster"),'#343b40',{roof:'#232a2c',era:1980,engine:'godzilla73',width:1.04,rounded:.025,flares:'#242a2b',wheelScale:1.65,wheelWidth:1.65,track:1.4,lift:.74,coils:true,finish:'black',note:msg("vehicle_models.monster_custom_huge_tires_7_3")}),
 midnight80:model(msg("vehicle_models.high_rider_85_cobalt"),'#253f77',{roof:'#253f77',era:1985,engine:'351w',width:1.02,rounded:.025,wheelScale:1.4,wheelWidth:1.35,track:1.25,lift:.47,roofLights:4,coils:true,note:msg("vehicle_models.high_lift_windshield_spotlights")}),
};
const STANDARD=Object.freeze({wheelScale:1,wheelWidth:1,track:1,wheelbase:1,lift:0});
export const vehicleProfile=style=>REFERENCE_MODELS[style]??STANDARD;
export const wheelConnectionY=style=>-.15-vehicleProfile(style).lift*1.4;

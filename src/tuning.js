import {t as msg} from './i18n.js';
// Versioned, browser-local simulation settings. Defaults reproduce the shipped tune.
const groups={
 [msg("tuning.world_mass")]:[
 ['gravity',msg("tuning.gravity"),20,3,20,.01,'m/s²'],['solverIterations',msg("tuning.contact_solver_iterations"),8,4,20,1],
 ['compactDryMass',msg("tuning.heritage_mass_without_engine"),2025,900,4000,25,'kg'],['fullDryMass',msg("tuning.full_size_mass_without_engine"),2525,1000,5000,25,'kg'],['engineMassScale',msg("tuning.engine_mass"),1,.5,2,.05],['frameY',msg("tuning.frame_mass_vertical_position"),-.95,-1.2,-.4,.01],['engineZ',msg("tuning.engine_front_rear_position"),-1.03,-1.5,-.5,.01],['inertiaScale',msg("tuning.rotational_inertia"),1,.5,3,.05],
 ],
 [msg("tuning.suspension_collisions")]:[
 ['spring',msg("tuning.spring_stiffness"),65,15,120,1],['compression',msg("tuning.compression_damping"),4.4,1,12,.1],['rebound',msg("tuning.rebound_damping"),7,1,16,.1],['restLength',msg("tuning.suspension_rest_length"),.55,.3,.9,.01],['suspensionTravel',msg("tuning.suspension_travel"),.42,.1,.8,.01],['suspensionForce',msg("tuning.spring_force_limit_mass"),24,5,40,.5],['linearDamping',msg("tuning.body_linear_damping"),.025,0,.4,.005],['angularDamping',msg("tuning.body_angular_damping"),.9,0,4,.05],['bodyBounce',msg("tuning.collision_restitution"),.02,0,.4,.01],['groundFriction',msg("tuning.ground_friction"),.75,.2,1.5,.05],
 ],
 [msg("tuning.tires_grip")]:[
 ['roadGrip',msg("tuning.track_grip"),1.35,.3,3,.05],['offroadGrip',msg("tuning.off_road_grip"),.8,.2,2,.05],['sideGrip',msg("tuning.tire_lateral_stiffness"),.8,.2,2,.05],['roadTraction',msg("tuning.track_traction_g"),1,.4,1.5,.05],['offroadTraction',msg("tuning.off_road_traction_g"),.7,.2,1.2,.05],['roadDrag',msg("tuning.track_rolling_resistance"),.06,.01,.3,.01],['offroadDrag',msg("tuning.off_road_rolling_resistance"),.3,.05,.8,.01],
 ],
 [msg("tuning.braking_steering")]:[
 ['brakeDeceleration',msg("tuning.brake_deceleration"),3,1,9,.1,'m/s²'],['brakeBuild',msg("tuning.brake_build_up_time"),.32,.05,1,.01,'s'],['brakeRelease',msg("tuning.brake_release_time"),.1,.02,.5,.01,'s'],['reverseDelay',msg("tuning.reverse_engagement_delay"),.45,.1,1.5,.05,'s'],['engineBraking',msg("tuning.engine_braking"),.55,0,1.5,.05],['steerLow',msg("tuning.low_speed_steering_angle"),.56,.2,.75,.01,'rad'],['steerHigh',msg("tuning.high_speed_steering_angle"),.12,.03,.3,.01,'rad'],['steerSlowSpeed',msg("tuning.full_steering_speed"),4,0,10,.5,'m/s'],['steerFastSpeed',msg("tuning.limited_steering_speed"),22,12,40,.5,'m/s'],['steerBuild',msg("tuning.steering_build_up_rate"),3.8,1,12,.1],['steerReturn',msg("tuning.steering_return_rate"),8,2,20,.5],['heldSteerRate',msg("tuning.held_angle_steering_rate"),.7,.1,2,.05,'rad/s'],
 ],
 [msg("tuning.arcade_44_driver_assistance")]:[
 ['arcadeThrottleBuild',msg("tuning.throttle_build_up_time"),.12,.04,.5,.01,'s'],['arcadeThrottleRelease',msg("tuning.throttle_release_time"),.07,.02,.3,.01,'s'],['arcadeSteerResponse',msg("tuning.arcade_steering_response"),5.5,2,12,.1],['arcadeLateralG',msg("tuning.target_cornering_acceleration"),.95,.5,1.5,.05,'g'],['arcadeCountersteer',msg("tuning.countersteer_assistance"),.32,0,.8,.02],['descentSpeed',msg("tuning.hill_descent_speed"),6,3,12,.5,'km/h'],['handbrakeDeceleration',msg("tuning.rear_handbrake_deceleration"),4,1,8,.1,'m/s²'],
 ],
 [msg("tuning.drivetrain_nitro")]:[
 ['torqueScale',msg("tuning.engine_torque"),1,.4,2,.05],['driveScale',msg("tuning.drive_force"),1.8,.6,3,.05],['topSpeedScale',msg("tuning.top_speed"),1,.5,1.5,.05],['boostScale',msg("tuning.nitro_power"),1.42,1,2,.02],['finalDrive',msg("tuning.final_drive_ratio"),4.7,3,7,.1],['gear1',msg("tuning.gear_1"),3,2,4.5,.05],['gear2',msg("tuning.gear_2"),1.75,1.2,2.5,.05],['gear3',msg("tuning.gear_3"),1,.7,1.3,.05],['driveRadius',msg("tuning.drivetrain_wheel_radius"),.34,.25,.55,.01],['shiftRpm',msg("tuning.shift_threshold_redline"),.78,.6,.95,.01],['nitroDrain',msg("tuning.nitro_consumption"),32,5,60,1,'%/s'],['nitroRecharge',msg("tuning.nitro_recharge"),7,0,20,.5,'%/s'],
 ],
 [msg("tuning.track_jumps")]:[
 ['roadWidth',msg("tuning.track_half_width"),7.75,6,12,.25],['shoulderWidth',msg("tuning.shoulder_width"),14,9,24,.5],['rampHeight',msg("tuning.main_ramp_height"),3.5,.5,7.5,.1],['rampRunup',msg("tuning.ramp_run_up_length"),30,20,50,1],['jumpGap',msg("tuning.gap_after_ramp"),10,0,20,.5],['landingLength',msg("tuning.landing_length"),40,20,60,1],['landingLow',msg("tuning.lower_landing_height"),.8,.2,3,.1],['landingSplit',msg("tuning.landing_height_difference"),1,0,3,.1],['whoopsScale',msg("tuning.whoops_height"),1,0,3,.1],['smallJumpHeight',msg("tuning.small_bump_height"),.65,0,2.5,.05],['dipDepth',msg("tuning.dip_depth"),.45,0,1.5,.05],['rollingScale',msg("tuning.rolling_terrain"),1,0,3,.1],['bankScale',msg("tuning.cross_slope"),1,0,3,.1],['rutScale',msg("tuning.small_surface_bumps"),1,0,3,.1],
 ],
 [msg("tuning.sand_ruffles")]: [
 ['sandRuffles',msg("tuning.ruffles_off_0_on_1"),0,0,1,1],['sandWaveSize',msg("tuning.sand_wave_spacing"),32,16,120,1,'m'],['sandWaveHeight',msg("tuning.sand_wave_height"),1,0,3,.05,'m'],
 ],
 [msg("tuning.trackside_tires_cones")]:[
 ['tireMass',msg("tuning.loose_tire_mass"),10,3,40,1,'kg'],['coneMass',msg("tuning.cone_mass"),3,.5,15,.5,'kg'],['tireFriction',msg("tuning.loose_tire_friction"),.35,.1,1,.05],['coneFriction',msg("tuning.cone_friction"),.4,.1,1,.05],['propBounce',msg("tuning.marker_restitution"),0,0,.3,.01],['propLinearDamping',msg("tuning.marker_linear_damping"),.35,0,2,.05],['propAngularDamping',msg("tuning.marker_angular_damping"),.45,0,3,.05],
 ],
 [msg("tuning.camera")]:[
 ['cameraLead',msg("tuning.camera_lead"),.7,.2,1.5,.05,'s'],['cameraScale',msg("tuning.camera_distance"),1,.7,1.5,.05],['cameraPan',msg("tuning.camera_follow_speed"),6,2,12,.5],
 ],
};
export const TUNING_FIELDS=Object.entries(groups).flatMap(([group,rows])=>rows.map(([key,label,value,min,max,step,unit=''])=>({key,label,value,min,max,step,unit,group})));
export const DEFAULT_TUNING=Object.freeze(Object.fromEntries(TUNING_FIELDS.map(f=>[f.key,f.value])));
export const tuning={...DEFAULT_TUNING};
let revision=0;
export const tuningRevision=()=>revision;
export const ACTIVE_TUNING_KEY='dust-runner-active-tunning-v1',PRESETS_KEY='dust-runner-tunnings-v1';
export function validateTuning(parameters){
 if(!parameters||typeof parameters!=='object'||Array.isArray(parameters))throw Error(msg("tuning.parameters_must_be_a_json_object"));
 const result={...DEFAULT_TUNING};
 for(const key of Object.keys(parameters)){
  const field=TUNING_FIELDS.find(f=>f.key===key),value=parameters[key];
  if(!field)throw Error(msg("tuning.unknown_parameter",{v0:(key)}));
  if(typeof value!=='number'||!Number.isFinite(value)||value<field.min||value>field.max)throw Error(msg("tuning.allowed_range",{v0:(field.label),v1:(field.min),v2:(field.max)}));
  if(field.step===1&&!Number.isInteger(value))throw Error(msg("tuning.enter_a_whole_number",{v0:(field.label)}));
  result[key]=value;
 }
 if(result.gear1<=result.gear2||result.gear2<=result.gear3)throw Error(msg("tuning.ratios_must_satisfy_gear_1_gear"));
 if(result.steerFastSpeed<=result.steerSlowSpeed)throw Error(msg("tuning.upper_steering_speed_must_exceed_lower"));
 return result;
}
export function setTuning(parameters){const next=validateTuning(parameters);Object.assign(tuning,next);revision++;return {...tuning};}
export function tuningDocument(parameters=tuning,name=msg("tuning.my_tune"),context={}){
 return {format:'dust-runner-tunning',version:1,name:String(name).trim().slice(0,80)||msg("tuning.my_tune"),parameters:validateTuning(parameters),context};
}
export function parseTuning(text){
 if(typeof text!=='string'||text.length>100000)throw Error(msg("tuning.paste_settings_json_maximum_100_kb"));
 let data;try{data=JSON.parse(text);}catch{throw Error(msg("tuning.invalid_json"));}
 if(data?.format!=='dust-runner-tunning'||data.version!==1)throw Error(msg("tuning.this_is_not_a_supported_dust"));
 const context={};for(const key of ['track','trackVariant','body','engineId','steeringMode','engineUpgrade','tireUpgrade','driveMode','transmissionMode','frontLock','rearLock','handlingProfile','hillDescent','applied']){const value=data.context?.[key];if(typeof value==='string'&&value.length<80||typeof value==='number'&&Number.isFinite(value)||typeof value==='boolean')context[key]=value;}
 return tuningDocument(data.parameters,data.name,context);
}
export function restoreTuning(storage){
 try{const saved=storage.getItem(ACTIVE_TUNING_KEY);if(saved)setTuning(parseTuning(saved).parameters);return true;}catch{return false;}
}
export function readPresets(storage){
 try{const data=JSON.parse(storage.getItem(PRESETS_KEY)??'[]');if(!Array.isArray(data))return [];return data.slice(0,50).flatMap(row=>{try{return [parseTuning(JSON.stringify(row))];}catch{return [];}});}catch{return [];}
}
export function storePreset(storage,presets,document){
 const next=presets.filter(p=>p.name!==document.name);next.push(document);
 if(next.length>50)throw Error(msg("tuning.limit_of_50_presets_delete_one"));
 storage.setItem(PRESETS_KEY,JSON.stringify(next));return next;
}

// Translate only known names generated by old versions. Never mutate stored
// documents or translate arbitrary user-authored preset names.
const legacyPresetNames=new Map([['M\u00f3j tunning','tuning.my_tune'],['Aktywne ustawienia','main.active_settings'],['Fabryczne','tuning.defaults_name']]);
export function displayPresetName(name){const key=legacyPresetNames.get(name);return key?msg(key):name;}

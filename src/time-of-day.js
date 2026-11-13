// Lighting moods for the open world. `day` reproduces the original studio-bright
// board lighting exactly; the others exist for the driver's-seat views.
// azimuth: compass direction the sunlight comes from, in world XZ (radians,
// 0 = +Z, π/2 = +X). elevation: degrees above the horizon.
// cloud / cloudLight: cloud body colour and how strongly the sun rims it.
// dust: multiplier for unlit dust, exhaust and tyre tracks so they dim with the light.
// sandSun: fixed sand slope-light vector; only `day` pins it, to match the original shader.
export const TIME_KEY='dust-runner-time';
export const DEFAULT_TIME='golden';
export const TIME_PRESETS=[
 {id:'morning',azimuth:2.2,elevation:27,sun:'#fff0dc',sunPower:3.1,skyLight:'#f1f2e6',groundLight:'#6d6646',ambient:2.2,zenith:'#3f7fc6',horizon:'#e9dcc2',haze:'#dccdb0',ground:'#b3a57e',exposure:1.1,clouds:.38,stars:0,range:1,cloud:'#ffffff',cloudLight:1,dust:'#dcd9d0'},
 {id:'day',azimuth:Math.atan2(-30,20),elevation:Math.atan2(55,Math.hypot(30,20))*180/Math.PI,sun:'#fff0cb',sunPower:3.2,skyLight:'#fff4d6',groundLight:'#69653e',ambient:2.6,zenith:'#2f72c0',horizon:'#d5dfdc',haze:'#cfc7a6',ground:'#a99a70',exposure:1.15,clouds:.3,stars:0,range:1,cloud:'#ffffff',cloudLight:1,dust:'#ffffff',sandSun:[-.8,.55]},
 {id:'golden',azimuth:-1.05,elevation:15,sun:'#ffc27c',sunPower:3.7,skyLight:'#ffe0b4',groundLight:'#6a5638',ambient:1.75,zenith:'#3a65a4',horizon:'#f6c489',haze:'#e0b785',ground:'#b08f5e',exposure:1.1,clouds:.36,stars:0,range:1,cloud:'#ffffff',cloudLight:1,dust:'#c4b39a'},
 {id:'dusk',azimuth:-1.35,elevation:4.5,sun:'#ff8a4c',sunPower:2.5,skyLight:'#c9a9c4',groundLight:'#4c3c38',ambient:1.5,zenith:'#232f63',horizon:'#f28a4d',haze:'#b9836a',ground:'#8a6a55',exposure:1.2,clouds:.5,stars:.25,range:.9,cloud:'#f3d9cf',cloudLight:.8,dust:'#937d7b'},
 {id:'night',azimuth:.7,elevation:48,sun:'#9db7ee',sunPower:.85,skyLight:'#5c74ad',groundLight:'#1d2230',ambient:.95,zenith:'#040813',horizon:'#18233d',haze:'#141d31',ground:'#141c2c',exposure:1.25,clouds:.2,stars:1,range:.75,cloud:'#27324a',cloudLight:.2,dust:'#555e6f',headlights:true},
];
export const timePreset=id=>TIME_PRESETS.find(p=>p.id===id)??TIME_PRESETS.find(p=>p.id===DEFAULT_TIME);
export const nextTime=(id,direction=1)=>{const i=TIME_PRESETS.indexOf(timePreset(id));return TIME_PRESETS[(i+direction+TIME_PRESETS.length)%TIME_PRESETS.length].id;};
// Unit vector pointing from the ground toward the sun (or moon).
export function sunDirection(preset){
 const elevation=preset.elevation*Math.PI/180,flat=Math.cos(elevation);
 return {x:Math.sin(preset.azimuth)*flat,y:Math.sin(elevation),z:Math.cos(preset.azimuth)*flat};
}
// The shadow light keeps a usable height even when the sun sits on the horizon.
export const SHADOW_MIN_ELEVATION=13,SHADOW_MAP={extent:110,size:2048};
export function shadowDirection(preset){
 return sunDirection({...preset,elevation:Math.max(preset.elevation,SHADOW_MIN_ELEVATION)});
}
// Shadow light distance, far plane and normal bias. High suns keep the original
// values exactly; low suns move the light back and widen the bias so the
// two-texel soft-shadow kernel cannot self-shadow the double-sided road.
export function shadowSetup(preset){
 const high=preset.elevation>40,reach=high?Math.hypot(30,55,20):120,elevation=Math.asin(shadowDirection(preset).y);
 return {reach,far:Math.round(reach+114.2),normalBias:high?.04:2.1*SHADOW_MAP.extent/SHADOW_MAP.size*Math.cos(elevation)};
}
// Sand slope-light vector in world XZ, scaled by how strong the sun is.
export function sandSlopeLight(preset){
 if(preset.sandSun)return {x:preset.sandSun[0],z:preset.sandSun[1]};
 const d=sunDirection(preset),flat=Math.hypot(d.x,d.z)||1,slope=.97*Math.min(1.1,preset.sunPower/3.2);
 return {x:d.x/flat*slope,z:d.z/flat*slope};
}

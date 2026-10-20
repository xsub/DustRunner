// Game presets combine automatic gearbox behavior and transfer-case ranges.
// 4WD alone does not reduce speed; the 4x4 preset uses a crawler reduction.
export const DRIVE_MODES=Object.freeze([
 {id:'auto',label:'A',name:'AUTO · szybka jazda',range:.9,pace:1,pedal:1,maxGear:3,boost:true,low:false,description:'Automatyczne biegi i wspomagany rozdział momentu. Uniwersalny tryb do wyścigów.'},
 {id:'hi',label:'HI',name:'HI · 4H / długi zakres',range:.78,pace:1.12,pedal:1,maxGear:3,boost:true,low:false,description:'Dłuższe przełożenie do szybkich prostych. Automatyczna skrzynia, napęd obu osi.'},
 {id:'lo',label:'LO',name:'LO · 4L / reduktor',range:2.2,pace:.43,pedal:.72,maxGear:3,boost:false,low:true,description:'Reduktor do podjazdów i wydm: więcej momentu na kołach, mniejsza prędkość. Bez nitro.'},
 {id:'4x4',label:'4×4',name:'4×4 · pełzanie + blokady',range:3,pace:0,pedal:.45,maxGear:1,boost:false,low:true,description:'Bardzo wolne pełzanie na pierwszym biegu. Osobne blokady przedniego i tylnego mechanizmu różnicowego. Bez nitro.'}
].map(Object.freeze));
export const driveModeById=id=>DRIVE_MODES.find(mode=>mode.id===id)??DRIVE_MODES[0];
export const RANGE_SHIFT_SPEED=8/3.6;

// Virtual raycast wheels have no physical differential joints. Model the
// important traction consequence: open axles lose pull with an unloaded wheel;
// locking sends that axle's available torque to the wheel still on the ground.
export function axleWheelForces(force,contacts,locks={front:false,rear:false},assisted=false){
 const result=[0,0,0,0];
 for(const [name,left,right] of [['front',0,2],['rear',1,3]]){
  const count=Number(Boolean(contacts[left]))+Number(Boolean(contacts[right]));
  if(count===2){result[left]=result[right]=force;continue;}
  if(count===1){
   const available=2*force*(locks[name]?1:assisted?.65:.04);
   result[contacts[left]?left:right]=available;
  }
 }
 return result;
}

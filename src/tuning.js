// Versioned, browser-local simulation settings. Defaults reproduce the shipped tune.
const groups={
 'Świat i masa':[
 ['gravity','Grawitacja',20,3,20,.01,'m/s²'],['solverIterations','Dokładność kontaktów',8,4,20,1],
 ['compactDryMass','Masa Heritage bez silnika',2025,900,4000,25,'kg'],['fullDryMass','Masa większego nadwozia bez silnika',2525,1000,5000,25,'kg'],['engineMassScale','Masa silnika ×',1,.5,2,.05],['frameY','Położenie masy ramy w pionie',-.95,-1.2,-.4,.01],['engineZ','Położenie silnika przód / tył',-1.03,-1.5,-.5,.01],['inertiaScale','Bezwładność obrotowa ×',1,.5,3,.05],
 ],
 'Zawieszenie i zderzenia':[
 ['spring','Sztywność sprężyn',65,15,120,1],['compression','Tłumienie ugięcia',4.4,1,12,.1],['rebound','Tłumienie odbicia',7,1,16,.1],['restLength','Długość zawieszenia',.55,.3,.9,.01],['suspensionTravel','Skok zawieszenia',.42,.1,.8,.01],['suspensionForce','Limit siły sprężyn / masa',24,5,40,.5],['linearDamping','Opór liniowy nadwozia',.025,0,.4,.005],['angularDamping','Tłumienie obrotów nadwozia',.9,0,4,.05],['bodyBounce','Sprężystość zderzeń',.02,0,.4,.01],['groundFriction','Tarcie podłoża',.75,.2,1.5,.05],
 ],
 'Opony i przyczepność':[
 ['roadGrip','Przyczepność na torze',1.35,.3,3,.05],['offroadGrip','Przyczepność poza torem',.8,.2,2,.05],['sideGrip','Sztywność boczna opon',.8,.2,2,.05],['roadTraction','Trakcja na torze × g',1,.4,1.5,.05],['offroadTraction','Trakcja poza torem × g',.7,.2,1.2,.05],['roadDrag','Opór toczenia na torze',.06,.01,.3,.01],['offroadDrag','Opór toczenia poza torem',.3,.05,.8,.01],
 ],
 'Hamulce i kierowanie':[
 ['brakeDeceleration','Siła hamowania',3,1,9,.1,'m/s²'],['brakeBuild','Czas narastania hamulca',.32,.05,1,.01,'s'],['brakeRelease','Czas puszczania hamulca',.1,.02,.5,.01,'s'],['reverseDelay','Pauza przed cofaniem',.45,.1,1.5,.05,'s'],['engineBraking','Hamowanie silnikiem ×',.55,0,1.5,.05],['steerLow','Skręt przy małej prędkości',.56,.2,.75,.01,'rad'],['steerHigh','Skręt przy dużej prędkości',.12,.03,.3,.01,'rad'],['steerSlowSpeed','Prędkość pełnego skrętu',4,0,10,.5,'m/s'],['steerFastSpeed','Prędkość ograniczonego skrętu',22,12,40,.5,'m/s'],['steerBuild','Tempo skręcania',3.8,1,12,.1],['steerReturn','Tempo prostowania kół',8,2,20,.5],['heldSteerRate','Tempo zmiany utrzymywanego kąta',.7,.1,2,.05,'rad/s'],
 ],
 'Arcade 4×4 · wspomaganie kierowcy':[
 ['arcadeThrottleBuild','Narastanie pedału gazu',.12,.04,.5,.01,'s'],['arcadeThrottleRelease','Puszczanie pedału gazu',.07,.02,.3,.01,'s'],['arcadeSteerResponse','Reakcja kierownicy Arcade',5.5,2,12,.1],['arcadeLateralG','Docelowe przyspieszenie w zakręcie',.95,.5,1.5,.05,'g'],['arcadeCountersteer','Pomoc w kontrze',.32,0,.8,.02],['descentSpeed','Prędkość kontroli zjazdu',6,3,12,.5,'km/h'],['handbrakeDeceleration','Siła ręcznego na tylnej osi',4,1,8,.1,'m/s²'],
 ],
 'Napęd i nitro':[
 ['torqueScale','Moment silnika ×',1,.4,2,.05],['driveScale','Siła napędu ×',1.8,.6,3,.05],['topSpeedScale','Prędkość maksymalna ×',1,.5,1.5,.05],['boostScale','Moc nitro ×',1.42,1,2,.02],['finalDrive','Przełożenie główne',4.7,3,7,.1],['gear1','Bieg 1',3,2,4.5,.05],['gear2','Bieg 2',1.75,1.2,2.5,.05],['gear3','Bieg 3',1,.7,1.3,.05],['driveRadius','Promień koła w modelu napędu',.34,.25,.55,.01],['shiftRpm','Próg zmiany biegu / czerwone pole',.78,.6,.95,.01],['nitroDrain','Zużycie nitro',32,5,60,1,'%/s'],['nitroRecharge','Regeneracja nitro',7,0,20,.5,'%/s'],
 ],
 'Tor i skoki':[
 ['roadWidth','Połowa szerokości toru',7.75,6,12,.25],['shoulderWidth','Szerokość pobocza',14,9,24,.5],['rampHeight','Wysokość głównej rampy',3.5,.5,7.5,.1],['rampRunup','Długość najazdu',30,20,50,1],['jumpGap','Przerwa po rampie',10,0,20,.5],['landingLength','Długość lądowania',40,20,60,1],['landingLow','Wysokość niższego lądowania',.8,.2,3,.1],['landingSplit','Różnica wysokości lądowań',1,0,3,.1],['whoopsScale','Wysokość muld ×',1,0,3,.1],['smallJumpHeight','Wysokość małych garbów',.65,0,2.5,.05],['dipDepth','Głębokość dołków',.45,0,1.5,.05],['rollingScale','Pofalowanie terenu ×',1,0,3,.1],['bankScale','Pochylenie poprzeczne ×',1,0,3,.1],['rutScale','Drobne nierówności ×',1,0,3,.1],
 ],
 'Piasek · Ruffles': [
 ['sandRuffles','Ruffles · wyłączone 0 / włączone 1',0,0,1,1],['sandWaveSize','Rozstaw fal piasku',32,16,120,1,'m'],['sandWaveHeight','Wysokość fali piasku',1,0,3,.05,'m'],
 ],
 'Opony i pachołki przy trasie':[
 ['tireMass','Masa luźnej opony',10,3,40,1,'kg'],['coneMass','Masa pachołka',3,.5,15,.5,'kg'],['tireFriction','Tarcie luźnych opon',.35,.1,1,.05],['coneFriction','Tarcie pachołków',.4,.1,1,.05],['propBounce','Sprężystość oznaczeń',0,0,.3,.01],['propLinearDamping','Opór ruchu oznaczeń',.35,0,2,.05],['propAngularDamping','Opór obrotu oznaczeń',.45,0,3,.05],
 ],
 'Kamera':[
 ['cameraLead','Wyprzedzenie kamery',.7,.2,1.5,.05,'s'],['cameraScale','Oddalenie kamery ×',1,.7,1.5,.05],['cameraPan','Szybkość podążania kamery',6,2,12,.5],
 ],
};
export const TUNING_FIELDS=Object.entries(groups).flatMap(([group,rows])=>rows.map(([key,label,value,min,max,step,unit=''])=>({key,label,value,min,max,step,unit,group})));
export const DEFAULT_TUNING=Object.freeze(Object.fromEntries(TUNING_FIELDS.map(f=>[f.key,f.value])));
export const tuning={...DEFAULT_TUNING};
let revision=0;
export const tuningRevision=()=>revision;
export const ACTIVE_TUNING_KEY='dust-runner-active-tunning-v1',PRESETS_KEY='dust-runner-tunnings-v1';
export function validateTuning(parameters){
 if(!parameters||typeof parameters!=='object'||Array.isArray(parameters))throw Error('Parametry muszą być obiektem JSON.');
 const result={...DEFAULT_TUNING};
 for(const key of Object.keys(parameters)){
  const field=TUNING_FIELDS.find(f=>f.key===key),value=parameters[key];
  if(!field)throw Error(`Nieznany parametr: ${key}`);
  if(typeof value!=='number'||!Number.isFinite(value)||value<field.min||value>field.max)throw Error(`${field.label}: dozwolony zakres ${field.min}–${field.max}.`);
  if(field.step===1&&!Number.isInteger(value))throw Error(`${field.label}: podaj liczbę całkowitą.`);
  result[key]=value;
 }
 if(result.gear1<=result.gear2||result.gear2<=result.gear3)throw Error('Przełożenia muszą spełniać: bieg 1 > bieg 2 > bieg 3.');
 if(result.steerFastSpeed<=result.steerSlowSpeed)throw Error('Górna prędkość kierowania musi być większa od dolnej.');
 return result;
}
export function setTuning(parameters){const next=validateTuning(parameters);Object.assign(tuning,next);revision++;return {...tuning};}
export function tuningDocument(parameters=tuning,name='Mój tunning',context={}){
 return {format:'dust-runner-tunning',version:1,name:String(name).trim().slice(0,80)||'Mój tunning',parameters:validateTuning(parameters),context};
}
export function parseTuning(text){
 if(typeof text!=='string'||text.length>100000)throw Error('Wklej JSON ustawień (maks. 100 KB).');
 let data;try{data=JSON.parse(text);}catch{throw Error('Nieprawidłowy JSON.');}
 if(data?.format!=='dust-runner-tunning'||data.version!==1)throw Error('To nie jest obsługiwany zestaw Dust Runner (wersja 1).');
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
 if(next.length>50)throw Error('Limit 50 zestawów. Usuń jeden przed zapisem.');
 storage.setItem(PRESETS_KEY,JSON.stringify(next));return next;
}

// Original game-scale interpretations of the supplied custom-build photographs.
// Lift/tires are game calibrations, not claimed factory specifications.
const model=(name,color,options={})=>({name,color,roof:'#eee9d9',width:.99,rounded:.045,lights:'square',flares:color,era:1978,engine:'351m',bodyType:'wagon',wheelScale:1.12,wheelWidth:1.05,track:1.05,lift:.14,finish:'silver',wheelbase:options.compact?1:1.12,...options});
export const REFERENCE_MODELS={
 roadsterBlack:model('ROADSTER · BLACK CAGE','#121715',{roof:'#202522',width:.89,lights:'round',era:1972,engine:'302',bodyType:'open',compact:true,fullCage:true,seat:'#ba754b',finish:'chrome',wheelScale:1.12,lift:.15,note:'OTWARTY · PEŁNA KLATKA · TAN / CHROM'}),
 halfCabRed:model('HALF-CAB · RUBY','#b92324',{roof:'#b92324',width:.89,lights:'round',era:1970,engine:'302',bodyType:'halfCab',compact:true,flares:'#252b29',finish:'black',lift:.18,note:'KRÓTKA KABINA · OTWARTA PAKA · PAŁĄK'}),
 expeditionOrange:model('OVERLAND · EMBER','#d64b21',{roof:'#242a28',width:.89,lights:'round',era:1974,engine:'351w',compact:true,flares:'#333938',finish:'black',rack:true,bullbar:true,rivets:true,lift:.22,note:'CZARNY DACH · BAGAŻNIK · WYCIĄGARKA'}),
 highroller78:model('HIGH ROLLER ’78 · MOCHA','#78563f',{roof:'#b9a88b',flares:'#b9a88b',engine:'400',wheelScale:1.4,wheelWidth:1.28,track:1.24,lift:.42,massExtra:160,twoTone:'#ab9371',coils:true,note:'LIFT · DUŻE KOŁA · CZERWONE SPRĘŻYNY'}),
 turf78:model('TURF GIANT ’79 · BLUE / IVORY','#215969',{roof:'#e2dccb',engine:'400',wheelScale:1.55,wheelWidth:1.85,track:1.32,lift:.6,massExtra:250,twoTone:'#dbd8c6',sunVisor:true,finish:'chrome',coils:true,note:'BALONOWE OPONY · DASZEK · DWUKOLOROWY'}),
 canyon78:model('RANGER ’79 · ORANGE / CREAM','#dc4825',{roof:'#e5e1d1',twoTone:'#e4dfcf',wheelScale:1.18,lift:.22,note:'PEŁNY HARDTOP · SZEROKI JASNY PAS'}),
 softtop78:model('SOFT TRAIL ’78 · INDIGO','#253f78',{roof:'#202728',engine:'400',bodyType:'softtop',rounded:.11,flares:'#202728',wheelScale:1.22,wheelWidth:1.16,track:1.13,lift:.28,finish:'black',note:'MIĘKKI CZARNY DACH · KOŁA MUD'}),
 bullnose80:model('BULLNOSE ’80 · BLUE / WHITE','#23638d',{roof:'#e6e7df',era:1980,engine:'302',width:1.02,rounded:.025,twoTone:'#dedfd5',wheelScale:1.17,lift:.22,note:'PRZÓD BULLNOSE · BIAŁE BOKI / HARDTOP'}),
 azure80:model('BULLNOSE ’82 · TURQUOISE','#16a2b3',{roof:'#e2dfce',era:1982,engine:'351w',width:1.02,rounded:.025,wheelScale:1.19,lift:.25,finish:'chrome',note:'TURKUS · KANCIASTY GRILL · JASNY DACH'}),
 forest80:model('FOREST ’84 · SAFARI','#174d40',{roof:'#796c58',era:1984,engine:'351w',width:1.02,rounded:.025,wheelScale:1.27,wheelWidth:1.2,track:1.15,lift:.34,massExtra:120,bullbar:true,fogLights:4,finish:'chrome',note:'BRĄZOWY HARDTOP · BULLBAR · 4 HALOGENY'}),
 monster80:model('DESERT BEAST · MONSTER','#343b40',{roof:'#232a2c',era:1980,engine:'godzilla73',width:1.04,rounded:.025,flares:'#242a2b',wheelScale:1.65,wheelWidth:1.65,track:1.4,lift:.74,massExtra:320,coils:true,finish:'black',note:'MONSTER CUSTOM · OGROMNE OPONY · 7.3 V8'}),
 midnight80:model('HIGH RIDER ’85 · COBALT','#253f77',{roof:'#253f77',era:1985,engine:'351w',width:1.02,rounded:.025,wheelScale:1.4,wheelWidth:1.35,track:1.25,lift:.47,massExtra:180,roofLights:4,coils:true,note:'WYSOKI LIFT · HALOGENY NAD SZYBĄ'}),
};
const STANDARD=Object.freeze({wheelScale:1,wheelWidth:1,track:1,wheelbase:1,lift:0,massExtra:0});
export const vehicleProfile=style=>REFERENCE_MODELS[style]??STANDARD;
export const wheelConnectionY=style=>-.15-vehicleProfile(style).lift*1.4;

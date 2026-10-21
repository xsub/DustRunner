export function exhaustLayout(style,width=.89){
 return [-1,1].map(side=>style==='godzilla78'?{from:[side*.43,.49,.18],tip:[side*(width+.18),.49,.18],direction:[side,0,0]}:{from:[side*.55,.46,1.22],tip:[side*.55,.46,1.87],direction:[0,0,1]});
}
export function exhaustEmission(car,history,dt){
 const phase=car.ignition?.phase??'running',power=car.powertrain??{},load=Math.max(0,Math.min(1,power.load??0)),throttle=power.throttle??0;
 const firing=phase==='running'||phase==='starting'&&(car.ignition.time??0)>.75;
 if(history.gear!==undefined&&history.gear!==power.gear&&firing)history.burst=.22;
 if((throttle-(history.throttle??throttle))/Math.max(.001,dt)>2&&firing)history.burst=.3;
 if(history.phase==='starting'&&phase==='running')history.burst=.5;
 history.phase=phase;history.gear=power.gear;history.throttle=throttle;history.burst=Math.max(0,(history.burst??0)-dt);
 const burst=history.burst>0?1:0;
 return {rate:firing?1.2+load*9+burst*14:0,load,burst,opacity:.11+load*.1+burst*.07};
}

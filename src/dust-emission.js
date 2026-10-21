const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));

// Visual churn estimate, not a replacement for the tire physics.
export function dustEmission(car,history,dt,{sand=false,handbrake=false}={}){
 const speed=Math.hypot(car.vx??0,car.vz??0),heading=car.heading??0;
 const lateral=Math.abs((car.vx??0)*Math.cos(heading)-(car.vz??0)*Math.sin(heading));
 const acceleration=history.speed===undefined?0:clamp((speed-history.speed)/Math.max(dt,.001),0,12);
 const landing=history.airborne&&!car.airborne?clamp((-(history.vertical??0)-1.5)/10):0;
 history.impact=Math.max(landing,(history.impact??0)*Math.exp(-dt*5));
 history.speed=speed;history.airborne=Boolean(car.airborne);history.vertical=car.vertical??0;
 const rolling=clamp((speed-.65)/22),slip=clamp(lateral/7),brake=clamp(car.physics?.controls?.brakePressure??0);
 const drive=clamp(car.powertrain?.load??0)*clamp(acceleration/6);
 const churn=clamp(slip*.8+brake*rolling*.65+drive*.35+(handbrake?rolling*.6:0)+(car.boosting?rolling*.2:0));
 return {rate:car.airborne||car.rollover?0:(rolling*9+churn*15+history.impact*32)*(sand?1.2:1),
  spread:.8+rolling*1.6+churn,opacity:.55+churn*.15+history.impact*.1,
  life:1.1+rolling*.65+churn*.35,sand};
}

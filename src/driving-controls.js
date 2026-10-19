export const BRAKE_DECELERATION=3.0,REVERSE_DELAY=.45;
export function rollingResistance(speed,onDirt=true){return Math.abs(speed)*(onDirt?.06:.3);}

export function drivingControls(state,input,speed,dt){
 const pressed=Boolean(input.brake);
 if(!pressed){state.reverse=false;state.stoppedTime=0;if((input.throttle??0)>0)state.reverseTravel=false;}
 else if(!input.airborne){
  if(speed>.6)state.reverse=false;
  if(speed<-.25&&state.reverseTravel)state.reverse=true;
  if(!state.reverse){
   state.stoppedTime=Math.abs(speed)<.18?(state.stoppedTime??0)+dt:0;
   if(state.stoppedTime>=REVERSE_DELAY){state.reverse=true;state.reverseTravel=true;}
  }
 }
 const target=pressed&&!state.reverse?1:0,tau=target>.5?.32:.10;
 state.brakePressure=(state.brakePressure??0)+(target-(state.brakePressure??0))*(1-Math.exp(-dt/tau));
 if(state.brakePressure<.0001)state.brakePressure=0;
 return {reverse:Boolean(state.reverse),reverseThrottle:1-state.brakePressure,brakePressure:state.brakePressure};
}

// Full lock for parking turns; reduce steering lock progressively at race pace.
export function steeringStep(current,input,speed,dt,ai=false,mode='return',center=false){
 const steer=Math.max(-1,Math.min(1,input??0));
 if(ai)return current+(steer*.38-current)*(1-Math.exp(-dt*9));
 if(center)return 0;
 // Held-angle mode moves the steering rack; release leaves it exactly there.
 if(mode==='hold')return Math.max(-.56,Math.min(.56,current+steer*.7*dt));
 const t=Math.max(0,Math.min(1,(Math.abs(speed)-4)/18)),blend=t*t*(3-2*t);
 const lock=.56+(.12-.56)*blend,target=steer*lock;
 const returning=steer===0||target*current<0;
 return current+(target-current)*(1-Math.exp(-dt*(returning?8:3.8)));
}

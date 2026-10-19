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

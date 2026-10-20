export function attractRunning({started,freeRide,phase,hidden,editing}){
 return !started&&!freeRide&&phase==='ready'&&!hidden&&!editing;
}
// Keep menu preferences intact, including a saved manual gearbox in neutral.
export function withDemoDrivetrain(car,step){
 const {driveMode,transmissionMode}=car;
 try{car.driveMode='auto';car.transmissionMode='auto';return step();}
 finally{car.driveMode=driveMode;car.transmissionMode=transmissionMode;}
}

export function attractRunning({started,freeRide,phase,hidden,editing}){
 return !started&&!freeRide&&phase==='ready'&&!hidden&&!editing;
}
// Keep menu preferences intact, including a saved manual gearbox in neutral.
export function withDemoDrivetrain(car,step){
 const {driveMode,transmissionMode}=car;
 try{car.driveMode='auto';car.transmissionMode='auto';return step();}
 finally{car.driveMode=driveMode;car.transmissionMode=transmissionMode;}
}

// Pace the front of the pack against the trailing car; chase cars use nitro.
export function rallyPace(car,cars,length){
 const progress=c=>c.demoDistance??0;
 const own=progress(car),front=Math.max(...cars.map(progress)),back=Math.min(...cars.map(progress));
 const gap=Math.max(0,Math.min(length/2,front-own));
 const leading=front-own<5,spread=front-back;
 return {pace:leading&&spread>28?1.05:Math.min(1.6,1.35+gap/100),catchup:gap>12};
}
export function packView(cars){
 const n=cars.length||1;
 return {x:cars.reduce((sum,c)=>sum+c.x,0)/n,z:cars.reduce((sum,c)=>sum+c.z,0)/n,vx:cars.reduce((sum,c)=>sum+(c.vx??0),0)/n,vz:cars.reduce((sum,c)=>sum+(c.vz??0),0)/n};
}

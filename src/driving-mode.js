import {transmissionMode} from './transmissions.js';
import {selectDriveMode,selectTransmissionMode} from './powertrain.js';
export function drivingMode(car){return car.driveMode==='4x4'?'4x4':transmissionMode(car)==='manual'?'M':'A';}
export function cycleDrivingMode(car){
 const next={A:'M',M:'4x4','4x4':'A'}[drivingMode(car)];
 selectTransmissionMode(car,next==='M'?'manual':'automatic');
 selectDriveMode(car,next==='4x4'?'4x4':'auto');
 return next;
}

export const PODIUM=[
 {medal:'ZŁOTO',color:'#ed454d',metal:'#e7bb42',reward:900,title:'FIRST PLACE!'},
 {medal:'SREBRO',color:'#53bd77',metal:'#cbd4dc',reward:600,title:'SECOND PLACE'},
 {medal:'BRĄZ',color:'#f28b38',metal:'#be8351',reward:400,title:'THIRD PLACE'},
 {medal:null,color:null,metal:'#8b997a',reward:300,title:'KEEP ON TRUCKIN’'},
];
export class RaceCompletion{
 constructor(){this.reset();}
 reset(){this.result=null;this.stoppedFor=0;this.closed=false;}
 record(rank,time){
  if(this.result)return null;
  this.result=Object.freeze({rank,time,...PODIUM[Math.max(0,Math.min(3,rank-1))]});return this.result;
 }
 interrupt(){this.stoppedFor=0;}
 tick(dt,{speed,vertical=0,airborne=false,driving=false,editing=false,active=true}){
  if(!this.result||this.closed)return false;
  if(!active||editing||driving||airborne||Math.abs(speed)>.25||Math.abs(vertical)>.5){this.interrupt();return false;}
  this.stoppedFor+=Math.max(0,dt);return this.stoppedFor>=10-1e-9;
 }
 close(){if(!this.result||this.closed)return false;this.closed=true;return true;}
}

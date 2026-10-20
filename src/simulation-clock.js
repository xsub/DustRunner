// Complete shared-world steps first, then leave time for presentation. Under
// overload discard overdue wall time rather than enlarging the physics dt.
export class SimulationClock{
 constructor({hz=120,budgetMs=4,maxSteps=4,now=()=>performance.now()}={}){
  this.dt=1/hz;this.budgetMs=budgetMs;this.maxSteps=maxSteps;this.now=now;this.accumulator=0;this.droppedSeconds=0;this.limitedFrames=0;
 }
 reset(clearStats=false){this.accumulator=0;if(clearStats){this.droppedSeconds=0;this.limitedFrames=0;}}
 advance(seconds,step){
  const elapsed=Number.isFinite(seconds)?Math.max(0,seconds):0;
  this.accumulator+=Math.min(elapsed,.1);let steps=0,dropped=Math.max(0,elapsed-.1);const started=this.now();
  while(this.accumulator+1e-10>=this.dt&&steps<this.maxSteps){
   step(this.dt);this.accumulator=Math.max(0,this.accumulator-this.dt);steps++;
   // Never interrupt a contact solve or skip a vehicle within a world step.
   if(this.now()-started>=this.budgetMs)break;
  }
  if(this.accumulator+1e-10>=this.dt){const overdue=Math.floor((this.accumulator+1e-10)/this.dt)*this.dt;this.accumulator=Math.max(0,this.accumulator-overdue);dropped+=overdue;}
  if(dropped>0){this.droppedSeconds+=dropped;this.limitedFrames++;}
  return {steps,alpha:Math.min(1,this.accumulator/this.dt),dropped,cpuMs:this.now()-started};
 }
}

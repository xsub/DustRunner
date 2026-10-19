// Sample real requestAnimationFrame intervals, independent of the physics dt cap.
export class FrameStats{
 constructor(windowMs=2000){this.windowMs=windowMs;this.reset();}
 reset(){this.last=null;this.samples=[];this.duration=0;}
 record(now,{cpuMs=0,physicsMs=0,steps=0}={}){
  if(!Number.isFinite(now))return;
  if(this.last===null){this.last=now;return;}
  const dt=now-this.last;if(dt<=0)return;this.last=now;
  this.samples.push({dt,cpuMs:Math.max(0,cpuMs),physicsMs:Math.max(0,physicsMs),steps:Math.max(0,steps)});this.duration+=dt;
  while(this.samples.length>1&&(this.duration-this.samples[0].dt>=this.windowMs||this.samples.length>600))this.duration-=this.samples.shift().dt;
 }
 snapshot(){
  if(!this.samples.length)return null;
  const n=this.samples.length,sum=key=>this.samples.reduce((total,sample)=>total+sample[key],0),sorted=this.samples.map(s=>s.dt).sort((a,b)=>a-b);
  return {fps:1000*n/this.duration,frameMs:this.duration/n,p95Ms:sorted[Math.ceil(n*.95)-1],cpuMs:sum('cpuMs')/n,physicsMs:sum('physicsMs')/n,physicsHz:sum('steps')*1000/this.duration,stepsPerFrame:sum('steps')/n};
 }
}

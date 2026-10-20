// Resolution only: vehicle geometry, contacts and the 120 Hz solver stay intact.
export class RenderBudget{
 constructor(){this.scale=1;this.reset();}
 reset(){this.frames=[];this.last=null;this.elapsed=0;}
 pixelRatio(width,height,deviceRatio=1){return Math.max(.25,Math.min(deviceRatio,1.5,Math.sqrt(2100000/Math.max(1,width*height)))*this.scale);}
 sample(now,cpuMs,active=true){
  if(!active){this.reset();return false;}
  if(this.last===null){this.last=now;return false;}
  const dt=now-this.last;this.last=now;
  // Ignore tab switches, startup and developer tools pauses.
  if(dt>250||dt<=0){this.frames=[];this.elapsed=0;return false;}
  this.frames.push({dt,cpuMs});this.elapsed+=dt;
  if(this.elapsed<2500)return false;
  const frames=this.frames,mean=this.elapsed/frames.length,sorted=frames.map(f=>f.dt).sort((a,b)=>a-b),p95=sorted[Math.ceil(sorted.length*.95)-1];
  const cpu=frames.reduce((sum,f)=>sum+f.cpuMs,0)/frames.length;
  this.frames=[];this.elapsed=0;const before=this.scale;
  if(mean>17.8&&p95>19)this.scale=Math.max(.6,this.scale*.88);
  else if(mean<13&&p95<15&&cpu<8)this.scale=Math.min(1,this.scale+.04);
  return Math.abs(before-this.scale)>.001;
 }
}

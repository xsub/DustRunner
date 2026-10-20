// A short 30 Hz canvas burst leaves driving controls and the game view usable.
export function createRaceCelebration(game){
 const canvas=document.createElement('canvas');canvas.className='race-confetti';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;game.append(canvas);
 const ctx=canvas.getContext('2d');let particles=[],elapsed=0,paintTime=0,width=0,height=0;
 return {reset(){particles=[];canvas.hidden=true;},burst(result){
  if(!result.color||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  width=game.clientWidth;height=game.clientHeight;const ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=width*ratio;canvas.height=height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);
  particles=Array.from({length:96},()=>({x:Math.random()*width,y:-20-Math.random()*height*.7,vx:(Math.random()-.5)*110,vy:70+Math.random()*90,angle:Math.random()*6,spin:(Math.random()-.5)*7,size:4+Math.random()*5}));elapsed=0;paintTime=0;canvas.hidden=false;canvas.dataset.color=result.color;
 },update(dt,active){
  if(!particles.length||!active)return;elapsed+=dt;paintTime+=dt;if(elapsed>6){particles=[];canvas.hidden=true;return;}
  if(paintTime<1/30)return;const step=Math.min(.1,paintTime);paintTime=0;ctx.clearRect(0,0,width,height);ctx.fillStyle=canvas.dataset.color;ctx.globalAlpha=Math.min(1,(6-elapsed)/1.3);
  for(const p of particles){p.x+=p.vx*step;p.y+=p.vy*step;p.angle+=p.spin*step;p.vy+=18*step;ctx.save();ctx.translate(p.x+Math.sin(elapsed*3+p.angle)*9,p.y);ctx.rotate(p.angle);ctx.fillRect(-p.size/2,-2,p.size,4);ctx.restore();}
 }};
}

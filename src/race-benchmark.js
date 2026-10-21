export function summarizeFrames(frames){
 if(!frames.length)return null;
 const sorted=frames.map(f=>f.dt).sort((a,b)=>a-b),sum=key=>frames.reduce((s,f)=>s+(f[key]??0),0),duration=sum('dt'),worst=sorted.at(-1),slow=sorted.slice(-Math.max(1,Math.ceil(sorted.length*.01)));
 let left=0,windowMs=0,minSecondFps=Infinity;
 for(let i=0;i<frames.length;i++){windowMs+=frames[i].dt;while(left<i&&windowMs-frames[left].dt>=1000)windowMs-=frames[left++].dt;if(windowMs>=1000)minSecondFps=Math.min(minSecondFps,(i-left+1)*1000/windowMs);}
 return {frames:frames.length,seconds:duration/1000,fps:1000*frames.length/duration,onePercentLow:1000/(slow.reduce((a,b)=>a+b,0)/slow.length),minSecondFps:Number.isFinite(minSecondFps)?minSecondFps:null,
  p95Ms:sorted[Math.ceil(sorted.length*.95)-1],p99Ms:sorted[Math.ceil(sorted.length*.99)-1],worstMs:worst,worstFrameFps:1000/worst,overBudgetPercent:100*frames.filter(f=>f.dt>1000/60).length/frames.length,over33Ms:frames.filter(f=>f.dt>33.3334).length,
  cpuMs:sum('cpuMs')/frames.length,physicsMs:sum('physicsMs')/frames.length,physicsHz:sum('steps')*1000/duration,meanDrawCalls:sum('calls')/frames.length,maxTriangles:frames.reduce((m,f)=>Math.max(m,f.triangles??0),0),visibleCarsMin:frames.reduce((m,f)=>Math.min(m,f.visibleCars??0),Infinity),visibleCarsMax:frames.reduce((m,f)=>Math.max(m,f.visibleCars??0),0),meetsStrict60:worst<=1000/60};
}
export class RaceBenchmark {
 constructor({load,onFinish=()=>{},onResult=()=>{},warmup=15,minimum=90,maximum=240,passes=2}={}){Object.assign(this,{load,onFinish,onResult,warmup,minimum,maximum,passes});this.running=false;this.report=null;}
 start(tracks,environment){
  if(this.running)return false;
  this.report={version:1,started:new Date().toISOString(),environment,protocol:{warmup:this.warmup,minimum:this.minimum,maximum:this.maximum,passes:this.passes,cars:6,coverageBins:64,fixedResolution:true},results:[],status:'running'};
  this.plan=Array.from({length:this.passes},(_,pass)=>tracks.map(track=>({...track,pass:pass+1}))).flat();this.index=0;this.running=true;this.pending=true;return true;
 }
 advance(){if(!this.running||!this.pending)return;this.pending=false;this.frames=[];this.coverage=new Set();this.started=null;this.last=null;this.stage='warmup';this.load(this.plan[this.index]);}
 record(now,timing,state){
  if(!this.running||this.pending)return;
  if(!state.active){this.cancel('Pomiar przerwany: utrata widoczności, fokus lub pauza.');return;}
  if(this.started===null){this.started=this.last=now;return;}
  const dt=now-this.last;this.last=now;if(dt<=0)return;
  const elapsed=(now-this.started)/1000;
  if(this.stage==='warmup'){
   if(elapsed<this.warmup)return;
   this.stage='measure';this.measuredAt=now;this.baseDropped=state.dropped;this.baseRecoveries=state.recoveries;return;
  }
  this.frames.push({dt,...timing});this.coverage.add(Math.max(0,Math.min(63,Math.floor(state.progress*64))));
  const measured=(now-this.measuredAt)/1000;
  if((measured>=this.minimum&&this.coverage.size===64)||measured>=this.maximum){
   this.report.results.push({...this.plan[this.index],...summarizeFrames(this.frames),coverage:this.coverage.size/64,completeCoverage:this.coverage.size===64,droppedSimulationSeconds:state.dropped-this.baseDropped,recoveries:state.recoveries-this.baseRecoveries});
   this.onResult(this.report);this.index++;
   if(this.index===this.plan.length)this.finish('complete');else this.pending=true;
  }
 }
 cancel(reason='Przerwano ręcznie.'){if(!this.running)return;this.report.reason=reason;this.finish('interrupted');}
 finish(status){this.running=false;this.report.status=status;this.report.completeCoverage=status==='complete'&&this.report.results.every(result=>result.completeCoverage);this.report.finished=new Date().toISOString();this.onFinish(this.report);}
 status(now){if(!this.running)return this.report?`${this.report.status==='complete'?'Zakończono':'Przerwano'} · ${this.report.results.length} pomiarów${this.report.reason?' · '+this.report.reason:''}`:'GOTOWY · pomiar jeszcze nieuruchomiony';const leg=this.plan[this.index];return `${this.index+1}/${this.plan.length} · ${leg.name} · próba ${leg.pass} · ${this.stage==='measure'?'POMIAR':'ROZGRZEWKA'} · ${this.started===null?0:Math.floor((now-this.started)/1000)} s · ${this.coverage?.size??0}/64 odcinków`;}
}
export function createBenchmarkPanel({container,game,onStart,onStop}){
 container.innerHTML='<span class="section-label">BENCHMARK · 6 AUT · WSZYSTKIE TRASY</span><p>16 torów + losowy tor (stałe ziarno 20261021), dwa przejazdy. Każdy: 15 s rozgrzewki, minimum 90 s pomiaru i cały tor; limit 240 s. Brak pełnego pokrycia będzie oznaczony w raporcie. Łącznie około 60–145 minut. Stała rozdzielczość, bez adaptacyjnego obniżania jakości. Kierowanie wszystkimi autami przejmuje AI. Test restartuje sesję; po zakończeniu wracają Twoje ustawienia przeciwników, trybu i toru.</p><p>Zamknij zbędne sesje i aplikacje. Pozostaw grę widoczną i na pierwszym planie. Utrata fokusu, zmiana rozmiaru lub pauza przerywa pomiar. Wynik obejmuje FPS, 1% low, najgorszą sekundę i klatkę, P95/P99, CPU (bez pomiaru czasu GPU), fizykę, utracony czas symulacji, widoczne auta i pokrycie trasy.</p><button id="benchmark-start" type="button">URUCHOM BENCHMARK PO ZAMKNIĘCIU INNYCH SESJI</button><button id="benchmark-export" type="button" disabled>POBIERZ RAPORT JSON</button><p id="benchmark-status" role="status">Przygotowany. Nie uruchamia się automatycznie.</p><details><summary>Wyniki ukończonych przejazdów</summary><table class="benchmark-results"><thead><tr><th>Tor / próba</th><th>FPS</th><th>1% low</th><th>P99 ms</th><th>Pokrycie</th></tr></thead><tbody id="benchmark-results-body"></tbody></table></details>';
 const banner=document.createElement('aside');banner.className='benchmark-progress';banner.hidden=true;banner.innerHTML='<span></span><button type="button">PRZERWIJ TEST</button>';game.append(banner);
 const start=container.querySelector('#benchmark-start'),download=container.querySelector('#benchmark-export'),status=container.querySelector('#benchmark-status');let report=null,lastPaint=0;
 const checkpoint=value=>{report=value;download.disabled=false;const rows=container.querySelector('#benchmark-results-body');rows.replaceChildren();for(const result of value.results){const row=document.createElement('tr');for(const text of [result.name+' / '+result.pass,result.fps.toFixed(1),result.onePercentLow.toFixed(1),result.p99Ms.toFixed(1),Math.round(result.coverage*100)+'%']){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}rows.append(row);}try{localStorage.setItem('dust-runner-benchmark-v1',JSON.stringify(value));}catch{}};
 try{const saved=JSON.parse(localStorage.getItem('dust-runner-benchmark-v1')??'null');if(saved?.version===1&&Array.isArray(saved.results)){if(saved.status==='running'){saved.status='interrupted';saved.reason='Raport częściowy odtworzony po zamknięciu strony.';}checkpoint(saved);}}catch{}
 start.onclick=()=>onStart();banner.querySelector('button').onclick=()=>onStop();
 download.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='dust-runner-six-cars-benchmark.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return {checkpoint,update(benchmark,now){if(now-lastPaint<500)return;lastPaint=now;banner.hidden=!benchmark.running;banner.querySelector('span').textContent=status.textContent=benchmark.status(now);start.disabled=benchmark.running;},finish(value){checkpoint(value);banner.hidden=true;start.disabled=false;status.textContent=`${value.status==='complete'?'Zakończono':'Przerwano'} · ${value.results.length} pomiarów. ${value.reason??''}`;}};
}

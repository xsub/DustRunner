import test from 'node:test';
import assert from 'node:assert/strict';
import {ENGINES,engineById,engineTorque} from '../src/engines.js';
import {powertrainStep,resetPowertrain,swapEngine} from '../src/powertrain.js';
import {arcadeMotion} from '../src/race.js';
const drive={throttle:1,steer:0,brake:false,boost:false,onDirt:true};
const car=(engineId='302')=>({engineId,style:'classic',speed:0,heading:0,x:0,z:0,vx:0,vz:0});
function run(c,input,seconds,hz=60){for(let i=0;i<seconds*hz;i++)arcadeMotion(c,input,1/hz);return c;}
test('all requested engine families and later EFI / Windsor variants are available',()=>{
 for(const id of ['170','200','289','302','351m','400','300','300efi','302efi','351w','351wefi'])assert.equal(engineById(id).id,id);
 for(const e of ENGINES){
  assert.equal(e.curve[0][0],e.idle);assert.equal(e.curve.at(-1)[0],e.redline);
  assert.equal(engineTorque(e,e.curve[2][0]),e.curve[2][1]);
  assert.ok(engineTorque(e,10000)===0);
 }
});
test('six-cylinder and V8 selections produce distinct acceleration and power bands',()=>{
 const small=run(car('170'),drive,5),v8=run(car('302'),drive,5);
 assert.ok(v8.speed>small.speed*1.2);
 const carb=run(car('300'),drive,5),efi=run(car('300efi'),drive,5);
 assert.ok(efi.speed>carb.speed+1);
 assert.ok(engineTorque(engineById('400'),1200)>engineTorque(engineById('351m'),1200));
 assert.ok(engineTorque(engineById('289'),5000)>engineTorque(engineById('400'),5000));
});
test('automatic transmission upshifts with RPM drop and downshifts after slowing',()=>{
 const c=car();let gear=1,drop=false,lastRpm=0;
 for(let i=0;i<600;i++){
  arcadeMotion(c,drive,1/60);
  if(c.powertrain.gear>gear){assert.ok(c.powertrain.shiftTime>0);assert.ok(c.powertrain.rpm<lastRpm);drop=true;}
  gear=c.powertrain.gear;lastRpm=c.powertrain.rpm;
 }
 assert.ok(drop);assert.equal(c.powertrain.gear,3);
 run(c,{...drive,throttle:0,brake:true},1.4);
 assert.ok(c.powertrain.gear<3);
});
test('every engine keeps bounded RPM and stable acceleration at 60 / 120 Hz',()=>{
 for(const e of ENGINES){
  const a=run(car(e.id),drive,8,60),b=run(car(e.id),drive,8,120);
  assert.ok(Math.abs(a.speed-b.speed)<.45,`${e.id} speed differs by ${a.speed-b.speed}`);
  assert.ok(a.powertrain.rpm>=e.idle&&a.powertrain.rpm<=e.redline+100);
  assert.ok(a.speed>10&&a.speed<(e.id==='godzilla73'?38:30));
 }
});
test('engine free-revs in flight while throttle, braking and nitro leave motion unchanged',()=>{
 for(const id of ['170','302','400']){
  const initial={...car(id),airborne:true,speed:20,vz:-20};
  const coast=run({...initial},{...drive,throttle:0},.5);
  const gas=run({...initial},{...drive,boost:true,steer:1},.5);
  assert.equal(gas.x,coast.x);assert.equal(gas.z,coast.z);assert.equal(gas.vz,coast.vz);assert.equal(gas.heading,0);
  assert.ok(gas.powertrain.rpm>coast.powertrain.rpm+1000);
  assert.ok(gas.powertrain.load<.15);
 }
});
test('brake overrides throttle with an installed engine and takes a progressive stopping path',()=>{
 const initial={...car(),speed:23,vz:-23};
 const brake=run({...initial},{...drive,throttle:0,brake:true},.5),both=run({...initial},{...drive,brake:true,boost:true},.5);
 assert.equal(brake.speed,both.speed);assert.equal(brake.z,both.z);
 const c={...initial};let time=0;
 while(c.speed>0&&time<4){arcadeMotion(c,{...drive,throttle:0,brake:true},1/60);time+=1/60;}
 assert.ok(time>1.4&&time<2);assert.ok(-c.z>15&&-c.z<23);
 const reverse=run(c,{...drive,throttle:0,brake:true},2);assert.ok(reverse.speed< -2);assert.equal(reverse.powertrain.gear,-1);
});
test('engine changes reset drivetrain state and upgrades increase installed engine output',()=>{
 const c=run(car('170'),drive,3);c.engineId='400';resetPowertrain(c);
 assert.equal(c.powertrain.rpm,engineById('400').idle);assert.equal(c.powertrain.gear,1);
 const stock=run(car(),drive,5),tuned=run(car(),{...drive,engine:3},5);
 assert.ok(tuned.speed>stock.speed);
 const coast=powertrainStep({...stock}, {...drive,throttle:0},1/60);assert.ok(coast.acceleration<0);
});
test('ending nitro preserves momentum instead of snapping to the engine speed ceiling',()=>{
 const c=run(car(),{...drive,boost:true},20),before=c.speed;
 arcadeMotion(c,{...drive,throttle:0},1/60);
 assert.ok(before>25);assert.ok(c.speed>before-.2);
});

test('sustained climbing load kicks down and holds the lower gear without hunting',()=>{
 const flat={...car(),speed:17},hill={...car(),speed:17};
 for(const c of [flat,hill]){resetPowertrain(c);c.powertrain.gear=3;c.powertrain.rpm=2244;}
 let changes=0,last=3;
 for(let i=0;i<120*15;i++){
  powertrainStep(flat,{...drive,slope:0},1/120);powertrainStep(hill,{...drive,slope:.3},1/120);
  if(hill.powertrain.gear!==last){changes++;last=hill.powertrain.gear;}
 }
 assert.equal(flat.powertrain.gear,3);assert.equal(hill.powertrain.gear,2);assert.equal(changes,1);
 assert.ok(hill.powertrain.rpm>flat.powertrain.rpm+500);
 assert.ok(Math.abs(hill.powertrain.rpm/flat.powertrain.rpm-1.46)<.02,'C4 second/third ratios set the RPM increase at fixed road speed');
 assert.ok(hill.powertrain.load>flat.powertrain.load);assert.ok(hill.powertrain.roadLoad>flat.powertrain.roadLoad+2);
});
test('constant road speed stays at a steady RPM rather than sweeping between idle and redline',()=>{
 const c={...car(),speed:22};resetPowertrain(c);c.powertrain.gear=3;
 for(let i=0;i<600;i++)powertrainStep(c,{...drive,slope:0},1/120);
 const rpm=c.powertrain.rpm;
 for(let i=0;i<1200;i++){powertrainStep(c,{...drive,slope:0},1/120);assert.equal(c.powertrain.gear,3);assert.ok(Math.abs(c.powertrain.rpm-rpm)<.01);}
});
test('closed governor and overrun reduce audible engine load',()=>{
 const pulling={...car(),speed:17},governed={...car(),speed:45},coast={...car(),speed:17};
 for(const c of [pulling,governed,coast]){resetPowertrain(c);c.powertrain.gear=3;}
 for(let i=0;i<360;i++){
  powertrainStep(pulling,drive,1/120);powertrainStep(governed,drive,1/120);powertrainStep(coast,{...drive,throttle:0},1/120);
 }
 assert.ok(pulling.powertrain.load>.7);assert.ok(governed.powertrain.load<.01);assert.ok(coast.powertrain.load<.01);
});

test('hot-swap matches gear and RPM at speed without resetting race or control state',()=>{
 const c={...car('302'),speed:22,x:13,z:40,nitro:37,lap:2,index:1700};resetPowertrain(c);
 const state=swapEngine(c,'170');assert.equal(c.engineId,'170');assert.equal(state.gear,3);assert.ok(state.rpm>1000&&state.rpm<=engineById('170').redline);
 assert.deepEqual([c.speed,c.x,c.z,c.nitro,c.lap,c.index],[22,13,40,37,2,1700]);assert.equal(state.shiftTime,0);
});
test('hot-swap preserves reverse, handles a stationary vehicle and rejects an invalid engine',()=>{
 const c=car();resetPowertrain(c);c.powertrain.gear=-1;c.speed=-3;assert.equal(swapEngine(c,'400').gear,-1);
 c.speed=0;c.powertrain.gear=1;assert.equal(swapEngine(c,'200').rpm,engineById('200').idle);assert.equal(c.powertrain.gear,1);
 assert.throws(()=>swapEngine(c,'not-an-engine'));assert.equal(c.engineId,'200');
});

// Engine families/availability follow the linked Bronco sources in ENGINE_NOTES.md.
// Curves, inertia and rev limits below are representative game calibrations,
// not factory dyno data or a comparison of SAE gross and net horsepower.
const make=(id,name,group,cylinders,liters,idle,redline,inertia,braking,curve,character)=>Object.freeze({id,name,group,cylinders,liters,idle,redline,inertia,braking,curve,character});
export const ENGINES=Object.freeze([
 make('170','170 · 2.8L I6','1966–1977',6,2.8,700,4400,.24,1.3,[[700,128],[1400,185],[2400,215],[3200,190],[4400,105]],'Light flywheel · modest pull'),
 make('289','289 Windsor · 4.7L V8','1966–1977',8,4.7,750,5400,.22,1.8,[[750,180],[1600,270],[3000,330],[4200,315],[5400,210]],'Eager small block · likes revs'),
 make('302','302 Windsor · 4.9L V8','1966–1977',8,4.9,700,5000,.28,2,[[700,205],[1600,290],[2800,335],[3800,300],[5000,200]],'Broad torque · classic V8'),
 make('200','200 · 3.3L I6','1966–1977',6,3.3,650,4200,.31,1.5,[[650,145],[1600,222],[2400,215],[3200,178],[4200,112]],'Early torque · relaxed revs'),
 make('351m','351M · 5.8L V8','1978–1979',8,5.8,650,4500,.42,2.4,[[650,228],[1400,315],[2200,355],[3200,310],[4500,180]],'Heavy flywheel · low-end muscle'),
 make('400','400 · 6.6L V8','1978–1979',8,6.6,625,4200,.48,2.8,[[625,265],[1200,350],[2000,376],[3000,330],[4200,190]],'Long stroke · strongest early pull'),
 make('300','300 · 4.9L I6 CARB','1980–1996',6,4.9,650,4100,.40,2.2,[[650,215],[1400,295],[2000,305],[3000,248],[4100,145]],'Truck six · low-rev torque'),
 make('300efi','300 · 4.9L I6 EFI','1980–1996',6,4.9,700,4300,.36,2.2,[[700,235],[1400,325],[2200,359],[3200,285],[4300,165]],'EFI response · smooth low-end pull'),
 make('302efi','302 · 5.0L V8 EFI','1980–1996',8,5,700,5200,.26,2,[[700,218],[1600,305],[3000,366],[4200,320],[5200,225]],'EFI small block · wider power band'),
 make('351w','351W · 5.8L V8 CARB','1980–1996',8,5.8,700,5000,.35,2.5,[[700,240],[1600,345],[2800,390],[3900,355],[5000,235]],'Windsor truck V8 · strong midrange'),
 make('351wefi','351W · 5.8L V8 EFI','1980–1996',8,5.8,700,5100,.32,2.5,[[700,260],[1600,365],[2800,425],[4000,385],[5100,260]],'EFI torque · strongest midrange')
]);
export const engineById=id=>ENGINES.find(e=>e.id===id)??ENGINES.find(e=>e.id==='302');
export function engineTorque(engine,rpm){
 const curve=engine.curve;
 if(rpm<=curve[0][0])return curve[0][1];
 for(let i=1;i<curve.length;i++)if(rpm<=curve[i][0]){const [x,y]=curve[i-1],[xx,yy]=curve[i];return y+(yy-y)*(rpm-x)/(xx-x);}
 return Math.max(0,curve.at(-1)[1]*(1-(rpm-engine.redline)/350));
}
export const defaultEngine=style=>({classic:'302',ranger:'351m',sunset:'302efi',expedition:'300efi'}[style]??'302');

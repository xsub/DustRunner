// Last 100 metres of actual planar movement. Sampling is independent of FPS.
export class DesertRoute {
 constructor(){this.clear();}
 clear(){this.points=[];this.previous=null;this.travel=0;this.next=5;}
 sample(x,z){
  const current=[x,z];if(!Number.isFinite(x)||!Number.isFinite(z))return;
  if(!this.previous){this.previous=current;this.points=[{point:current,at:0}];return;}
  let [px,pz]=this.previous,segment=Math.hypot(x-px,z-pz);
  if(segment>20){this.clear();this.sample(x,z);return;} // recovery / teleport
  const start=this.travel;this.travel+=segment;
  while(segment>0&&this.next<=this.travel){const t=(this.next-start)/segment;this.points.push({point:[px+(x-px)*t,pz+(z-pz)*t],at:this.next});this.next+=5;}
  this.previous=current;this.points=this.points.filter(p=>p.at>=this.travel-100);
 }
 snapshot(){
  const points=this.points.map(p=>[...p.point]);if(!this.previous)return [];
  if(!points.length||Math.hypot(points.at(-1)[0]-this.previous[0],points.at(-1)[1]-this.previous[1])>.1)points.push([...this.previous]);
  return points.slice(-22);
 }
}

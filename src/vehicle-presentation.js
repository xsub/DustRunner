// Interpolate the 60 Hz gameplay poses at the display refresh rate. Rapier
// remains at 120 Hz; presentation never writes positions back to physics.
export class VehiclePresentation{
 constructor(car){
  this.mesh=car.mesh;
  const nodes=[car.mesh,...car.wheels.flatMap(w=>[w.pivot,w.spin]),...car.axles.map(a=>a.group)];
  this.poses=nodes.map(node=>({node,previousPosition:node.position.clone(),position:node.position.clone(),previousRotation:node.quaternion.clone(),rotation:node.quaternion.clone()}));
 }
 capture(snap=false){for(const p of this.poses){p.previousPosition.copy(p.position);p.previousRotation.copy(p.rotation);p.position.copy(p.node.position);p.rotation.copy(p.node.quaternion);if(snap){p.previousPosition.copy(p.position);p.previousRotation.copy(p.rotation);}}}
 render(alpha){for(const p of this.poses){p.node.position.lerpVectors(p.previousPosition,p.position,alpha);p.node.quaternion.slerpQuaternions(p.previousRotation,p.rotation,alpha);}}
}

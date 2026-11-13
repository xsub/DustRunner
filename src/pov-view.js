// Driver's point-of-view camera logic. Pure math only: no Three.js, no DOM.
// The Bronco model faces −Z, is left-hand drive and uses its own model units
// (VEHICLE_SCALE converts them to world meters).
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

export const VIEW_MODES=['cockpit','hood','chase','board'];
export const DEFAULT_VIEW='cockpit';
export const VIEW_KEY='dust-runner-view';
export const normalizeView=view=>VIEW_MODES.includes(view)?view:DEFAULT_VIEW;
export const nextView=(view,direction=1)=>VIEW_MODES[(VIEW_MODES.indexOf(normalizeView(view))+direction+VIEW_MODES.length)%VIEW_MODES.length];
export const isPerspective=view=>normalizeView(view)!=='board';

// Seated eye point and bonnet camera, in model units relative to the truck.
export function eyePoint(view,cabin={}){
 const roofY=cabin.roofY??2.36,wheelbase=cabin.wheelbase??1;
 if(view==='hood')return {x:0,y:2.02,z:-.86*wheelbase,pitch:-.05};
 return {x:-.39,y:Math.min(2.1,roofY-.25),z:.07*wheelbase,pitch:-.085};
}

// Cabin furniture, placed relative to the seated eye so every roof height keeps
// the same sight lines: road, then dials, then the top of the wheel rim.
export const WHEEL={radius:.15,tube:.0135,rake:-.4};
export const GAUGE_FACE={width:.222,height:.074,tilt:-.46};
export const MIRROR={width:.16,height:.045,yaw:-.42};
export function cockpitLayout(cabin={}){
 const eye=eyePoint('cockpit',cabin),wheelbase=cabin.wheelbase??1,roofY=cabin.roofY??2.36,front=cabin.front??-.35;
 // A raked windshield brings the mirror closer; slide it toward the driver so its far edge stays in view.
 const reach=MIRROR.width/2,mirrorZ=(front+.05)*wheelbase,mirrorX=Math.min(-.2,eye.x+.9*(eye.z-mirrorZ+reach*Math.sin(MIRROR.yaw))-reach*Math.cos(MIRROR.yaw));
 return {
  eye,
  column:{x:eye.x,y:eye.y-.291,z:-.14*wheelbase},
  binnacle:{x:eye.x,y:eye.y-.152,z:-.33*wheelbase},
  pod:{x:-.1,y:eye.y-.18,z:-.34*wheelbase},
  // Just behind the windshield's top edge. The stalk runs from inside the housing up
  // into the roof slab (thinner on bimini tops) or, on open bodies, the roll-cage header.
  mirror:{x:mirrorX,y:roofY-.165,z:mirrorZ},
  stalk:cabin.bimini?.089:.084,
 };
}

// Trackside cones and tyre stacks only simulate while they are "seen". From the
// driver's seat the ground just ahead of the bumper is below the windshield, so
// the truck's own surroundings always count as seen, exactly as on the board.
export const MARKER_NEAR=45,MARKER_FAR=140;
export function markerView(player,inFrustum,{near=MARKER_NEAR,far=MARKER_FAR}={}){
 return position=>{
  const dx=position.x-player.x,dz=position.z-player.z,distance=dx*dx+dz*dz;
  return distance<near*near||(distance<far*far&&Boolean(inFrustum(position)));
 };
}

export const LOOK_LIMITS={yaw:2.25,up:.5,down:.62,zoomIn:.62,zoomOut:1.2};
// Glance with IJKL or a drag; the head eases back to the road when released.
export class HeadLook{
 constructor(){this.reset();this.zoom=1;}
 reset(){this.yaw=0;this.pitch=0;this.hold=0;this.held=false;}
 adjust(yaw=0,pitch=0,zoom=1){
  this.yaw=clamp(this.yaw+yaw,-LOOK_LIMITS.yaw,LOOK_LIMITS.yaw);
  this.pitch=clamp(this.pitch+pitch,-LOOK_LIMITS.down,LOOK_LIMITS.up);
  this.zoom=clamp(this.zoom*zoom,LOOK_LIMITS.zoomIn,LOOK_LIMITS.zoomOut);
  if(yaw||pitch)this.hold=1.4;
 }
 step(keys,dt){
  const horizontal=Number(keys.has('KeyJ'))-Number(keys.has('KeyL')),vertical=Number(keys.has('KeyI'))-Number(keys.has('KeyK'));
  const zoom=Number(keys.has('Minus')||keys.has('NumpadSubtract'))-Number(keys.has('Equal')||keys.has('NumpadAdd'));
  if(horizontal||vertical){this.adjust(horizontal*dt*2.6,vertical*dt*1.3);this.hold=.12;}
  // `held` is set while a mouse button or finger is down: a steady drag keeps its angle.
  else if(!this.held&&(this.hold-=dt)<=0){const keep=Math.exp(-dt*6);this.yaw*=keep;this.pitch*=keep;this.hold=0;}
  if(zoom)this.adjust(0,0,Math.exp(zoom*dt*.8));
 }
}

// Vertical field of view: a steady ~92° horizontal sweep on wide screens,
// widening slightly with speed. Portrait phones keep a usable vertical range.
// `floor` is the least vertical angle: the seated view needs 60° so the wheel rim
// and the dials stay on screen on ultrawide monitors and phones in landscape.
export const COCKPIT_FOV_FLOOR=60;
export function povFov(aspect,speed=0,zoom=1,floor=50){
 const horizontal=92*Math.PI/180,vertical=2*Math.atan(Math.tan(horizontal/2)/Math.max(.3,aspect))*180/Math.PI;
 return clamp((clamp(vertical,floor,84)+7*clamp(Math.abs(speed)/38,0,1))*zoom,28,100);
}

// The driver's head lags behind hard acceleration, braking and landings.
// `acceleration` is in the truck's own frame (world units/s²); offsets are model units.
export function headSpringStep(state,acceleration,dt,{gain=.0021,limit=.05,stiffness=170,damping=21}={}){
 const next={...state};
 for(const axis of ['x','y','z']){
  const target=clamp(-(acceleration[axis]??0)*gain,-limit,limit);
  let position=state[axis]??0,velocity=state['v'+axis]??0,remaining=clamp(dt,0,.1);
  while(remaining>1e-6){const h=Math.min(remaining,1/120);velocity+=((target-position)*stiffness-velocity*damping)*h;position+=velocity*h;remaining-=h;}
  next[axis]=clamp(position,-limit*1.5,limit*1.5);next['v'+axis]=velocity;
 }
 return next;
}

// How much of the body's pitch and roll the eyes follow. A real driver keeps
// their head closer to level; upside down, the view simply follows the cabin.
export function horizonStabilization(upY){return .22*clamp((upY-.35)/.45,0,1);}

// Third-person camera: trails the heading with a soft yaw lag and rises with speed.
export function chaseStep(state,target,dt,snap=false){
 const follow=snap||state.yaw===undefined?1:1-Math.exp(-dt*3.4),lift=snap||state.y===undefined?1:1-Math.exp(-dt*5);
 const yaw=wrap((state.yaw??target.heading)+wrap(target.heading-(state.yaw??target.heading))*follow);
 const speed=Math.abs(target.speed??0),distance=9.2+clamp(speed*.07,0,3.2),height=3.3+clamp(speed*.02,0,.9);
 const view=yaw+(target.lookYaw??0);
 const x=target.x+Math.sin(view)*distance,z=target.z+Math.cos(view)*distance;
 const floor=(target.groundAt?.(x,z)??-Infinity)+1.1,wantedY=Math.max(target.y+height,floor);
 const y=Math.max(floor,(state.y??wantedY)+(wantedY-(state.y??wantedY))*lift);
 return {yaw,x,y,z,look:{x:target.x-Math.sin(view)*4.5,y:target.y+1.5,z:target.z-Math.cos(view)*4.5}};
}

// Slow showroom orbit used before the first start.
export function showcaseOrbit(time,target,groundAt,scale=1){
 const angle=.9+time*.11,radius=(9.4+Math.sin(time*.07)*1.6)*scale;
 const x=target.x+Math.sin(angle)*radius,z=target.z+Math.cos(angle)*radius;
 const y=Math.max(target.y+(1.9+Math.sin(time*.05)*.7)*scale*scale,(groundAt?.(x,z)??-Infinity)+.9);
 return {x,y,z,look:{x:target.x,y:target.y+1.25,z:target.z}};
}

// Ground footprint of what the driver sees, for the north-up minimap.
export function viewWedge(origin,yaw,horizontalFov,range=150){
 const half=horizontalFov/2,point=angle=>({x:origin.x-Math.sin(yaw+angle)*range,y:0,z:origin.z-Math.cos(yaw+angle)*range});
 return [{x:origin.x,y:0,z:origin.z},point(half),point(0),point(-half)];
}

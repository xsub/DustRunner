import {vehicleProfile} from './vehicle-models.js';
export const isOpenBody=style=>style==='sky'||style==='crawler'||vehicleProfile(style).bodyType==='open';
export const isCompactBody=style=>style==='classic'||style==='sky'||style==='crawler'||Boolean(vehicleProfile(style).compact);
export const isBiminiBody=style=>style==='copper78'||style==='godzilla78';
// Model-space tubes shared by visual cages and physical rollover contacts.
export function rollCageSegments(style,width=.89){
 const x=width-.065,top=2.30,hoop=.39,segments=[];
 for(const side of [-1,1]){
  segments.push([[side*width,1.59,-.54],[side*x,top,-.35]]);
  segments.push([[side*width,1.55,hoop],[side*x,top,hoop]]);
  segments.push([[side*x,top,hoop],[side*(width-.1),1.56,1.38]]);
  if(style==='crawler'||vehicleProfile(style).fullCage)segments.push([[side*x,top,-.35],[side*x,top,1.35]],[[side*width,1.55,1.4],[side*x,top,1.35]]);
 }
 segments.push([[-x,top,-.35],[x,top,-.35]],[[-x,top,hoop],[x,top,hoop]]);
 if(style==='crawler'||vehicleProfile(style).fullCage)segments.push([[-x,top,1.35],[x,top,1.35]],[[-x,1.62,1.4],[x,top,1.35]]);
 return segments;
}

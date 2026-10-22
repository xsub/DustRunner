// Only the world canvas receives gestures; driving buttons keep their own pointers.
export function bindTouchCamera(canvas,{orbit,enabled,onChange=()=>{}}){
 const pointers=new Map();
 const distance=()=>{const [a,b]=[...pointers.values()];return b?Math.hypot(b.x-a.x,b.y-a.y):0;};
 function clear(){const ids=[...pointers.keys()];pointers.clear();for(const id of ids)if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
 canvas.addEventListener('pointerdown',event=>{
  if(!enabled()||pointers.size>=2)return;
  event.preventDefault();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});canvas.setPointerCapture(event.pointerId);
 });
 canvas.addEventListener('pointermove',event=>{
  const previous=pointers.get(event.pointerId);if(!previous)return;
  if(!enabled()){clear();return;}event.preventDefault();
  const before=distance();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size===1){
   const rect=canvas.getBoundingClientRect();
   orbit.adjust(-(event.clientX-previous.x)/Math.max(1,rect.width)*Math.PI*2,(event.clientY-previous.y)/Math.max(1,rect.height)*Math.PI);
  }else{const after=distance();if(before>8&&after>8)orbit.adjust(0,0,before/after);}
  onChange();
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,event=>{
  pointers.delete(event.pointerId);if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
 });
 return {clear};
}

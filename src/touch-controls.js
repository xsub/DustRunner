// Track pointers separately: lifting one thumb must not release the other.
export function bindTouchControls(buttons,{keys,enabled,onHandbrake=()=>{}}){
 const held=new Map();
 const release=id=>{
  const button=held.get(id);if(!button)return;
  held.delete(id);button.classList.toggle('touch-held',[...held.values()].includes(button));
  const key=button.dataset.key;
  if(![...held.values()].some(b=>b.dataset.key===key)){keys.delete(key);if(key==='ShiftLeft')onHandbrake(false);}
 };
 for(const button of buttons){
  button.addEventListener('pointerdown',event=>{
   event.preventDefault();if(!enabled())return;
   button.setPointerCapture(event.pointerId);held.set(event.pointerId,button);
   keys.add(button.dataset.key);button.classList.add('touch-held');
   if(button.dataset.key==='ShiftLeft')onHandbrake(true);
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,event=>release(event.pointerId));
  button.addEventListener('contextmenu',event=>event.preventDefault());
 }
 return {clear(){for(const id of [...held.keys()])release(id);}};
}

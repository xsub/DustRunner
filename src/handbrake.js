export class Handbrake {
 constructor(){this.reset();}
 reset(){this.latched=false;this.cancelHold();}
 cancelHold(){this.held=false;this.heldFor=0;this.releasePress=false;}
 press(){if(this.held)return;this.releasePress=this.latched;if(this.latched)this.latched=false;this.heldFor=0;this.held=true;}
 release(){this.held=false;this.heldFor=0;this.releasePress=false;}
 update(pressed,dt){
  pressed=Boolean(pressed);
  if(pressed&&!this.held)this.press();
  if(!pressed)this.release();
  else if(!this.releasePress){this.heldFor=Math.min(2,this.heldFor+Math.max(0,dt));if(this.heldFor+1e-9>=2)this.latched=true;}
  return this.active;
 }
 get active(){return this.latched||(this.held&&!this.releasePress);}
 get progress(){return this.latched?1:this.heldFor/2;}
}

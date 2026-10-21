export class Handbrake {
 constructor(){this.reset();}
 reset(){this.latched=false;this.cancelHold();}
 cancelHold(){this.held=false;this.heldFor=0;}
 press(){this.held=true;}
 release(){this.held=false;this.heldFor=0;}
 toggle(){this.latched=!this.latched;return this.latched;}
 update(pressed,dt){this.held=Boolean(pressed);this.heldFor=this.held?this.heldFor+Math.max(0,dt):0;return this.active;}
 get active(){return this.latched||this.held;}
 get progress(){return this.active?1:0;}
}

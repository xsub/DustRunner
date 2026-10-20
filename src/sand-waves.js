import {tuning} from './tuning.js';
// Wavelength is in world meters; height is the trough-to-crest difference.
export function sandWavePhase(x,z,size=tuning.sandWaveSize){return (x*.77+z*.64+5*Math.sin(z*.025))*2*Math.PI/size;}
export function sandWaveHeight(x,z,options=tuning){return options.sandRuffles?options.sandWaveHeight*(.5+.5*Math.sin(sandWavePhase(x,z,options.sandWaveSize))):0;}

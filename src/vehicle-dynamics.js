// Loaded game calibrations, not certified curb weights of photographed customs.
// dryMass includes chassis, tires, axles, equipment and driver, excluding engine.
const tune=(dryMass,{wheelShare=.17,frameDrop=0,spring=1,compression=1,rebound=1,travel=1}={})=>Object.freeze({dryMass,wheelShare,frameDrop,spring,compression,rebound,travel});
export const VEHICLE_DYNAMICS=Object.freeze({
 classic:tune(2025),ranger:tune(2525),sunset:tune(2575),sky:tune(1935),crawler:tune(2215),expedition:tune(2625),copper78:tune(2580),godzilla78:tune(2685),
 roadsterBlack:tune(2055),halfCabRed:tune(1955),expeditionOrange:tune(2325),
 highroller78:tune(3150,{wheelShare:.24,frameDrop:.65,spring:.88,compression:1.25,rebound:1.7,travel:1.2}),
 turf78:tune(3800,{wheelShare:.27,frameDrop:1.05,spring:.85,compression:1.3,rebound:1.9,travel:1.35}),
 canyon78:tune(2600,{frameDrop:.08,compression:1.05,rebound:1.1}),
 softtop78:tune(2680,{wheelShare:.20,frameDrop:.15,compression:1.1,rebound:1.2,travel:1.1}),
 bullnose80:tune(2455,{frameDrop:.08,compression:1.05,rebound:1.1}),
 azure80:tune(2510,{frameDrop:.1,compression:1.05,rebound:1.1}),
 forest80:tune(2850,{wheelShare:.22,frameDrop:.4,spring:.94,compression:1.15,rebound:1.4,travel:1.15}),
 monster80:tune(4485,{wheelShare:.29,frameDrop:1.4,spring:.82,compression:1.35,rebound:2,travel:1.45}),
 midnight80:tune(3350,{wheelShare:.25,frameDrop:.8,spring:.88,compression:1.25,rebound:1.75,travel:1.25}),
});
export const vehicleDynamics=style=>VEHICLE_DYNAMICS[style]??VEHICLE_DYNAMICS.classic;

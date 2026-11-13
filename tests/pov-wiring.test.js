import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// src/main.js needs a browser, so it cannot be imported here. These checks pin the handful
// of lines that connect the tested modules to the game loop; each one guards a fixed defect.
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),style=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
const body=(name,source=main)=>{const start=source.indexOf('function '+name+'(');assert.ok(start>=0,name+' exists');const end=source.indexOf('\nfunction ',start+1);return source.slice(start,end<0?undefined:end);};

test('perspective views keep the truck\'s surroundings solid and use the seated field of view',()=>{
 const pov=body('updatePovCamera');
 assert.match(pov,/physics\?\.setMarkerVisibility\(markerView\(player,markerIsVisible\)\)/,'markers near the truck stay simulated');
 assert.match(pov,/povFov\(aspect,player\.speed,headLook\.zoom,seat\?COCKPIT_FOV_FLOOR:50\)/,'only the seat gets the taller view');
 assert.match(pov,/cockpit\.setVisible\(seat\)/);
 const board=body('updateCamera');assert.match(board,/physics\?\.setMarkerVisibility\(markerIsVisible\)/,'the board view keeps its original rule');
});

test('view, time and body changes restore what they touch',()=>{
 const view=body('setView');
 assert.match(view,/headLook\.reset\(\);syncHeld\(\);/,'a held drag survives a view change');assert.match(view,/warmShaders\(true\)/,'both light sets are compiled for the new view');
 assert.match(main,/if\(e\.code==='KeyO'\)\{if\(!e\.repeat\)\{[^}]*headLook\.reset\(\);syncHeld\(\);/,'and a camera reset');
 assert.match(main,/onPointers:count=>\{pointersDown=count;syncHeld\(\);\}/);
 const time=body('applyTime');
 assert.match(time,/if\(persist\)try\{localStorage\.setItem\(TIME_KEY,timeId\);\}catch\{\}/,'only a user action saves the time of day');
 for(const pool of ['dustPool','exhaustPool','sandTrails'])assert.match(time,new RegExp(pool+'\\.setTint\\(preset\\.dust\\)'),pool+' is tinted');
 assert.match(time,/desertWind\?\.setTint\(preset\.dust\)/);assert.match(time,/headlight\.visible=Boolean\(preset\.headlights\)/);assert.match(time,/sun\.shadow\.normalBias=normalBias/);
 assert.equal(main.match(/desertWind=createDesertWind\([^;]*\);desertWind\.setTint\(timePreset\(timeId\)\.dust\);/g)?.length,2,'a rebuilt world\'s wind takes the current tint, in both world types');
 assert.match(body('selectPlayerModel'),/unmountPlayerExtras\(\);scene\.remove\(player\.mesh\);player\.dispose\(\);/,'the rig is detached before the old body is disposed');
 assert.match(body('rebuildTrack'),/warmShaders\(true\)/);
 // V and T never take Shift (the handbrake) as a modifier.
 assert.match(main,/if\(e\.code==='KeyV'\)setView\(nextView\(viewMode\)\);else applyTime\(nextTime\(timeId\),\{announce:true,persist:true\}\);/);
});

test('the benchmark is pinned to the board view at midday and puts the time of day back',()=>{
 assert.match(main,/benchmarkRestore=\{time:timeId,/);assert.match(main,/cameraOrbit\.reset\(\);applyTime\('day'\);/);assert.match(main,/applyTime\(saved\.time\);/);
 assert.match(main,/view:'board',timeOfDay:'day'/,'both are recorded in the report');
 assert.match(body('effectiveView'),/benchmark\?\.running\?'board':viewMode/);
 assert.equal(main.match(/\.onclick=\(\)=>\{if\(benchmark\?\.running\)return;/g)?.length,2,'neither toolbar button works during a run');
});

test('circuits are walled where the dunes end, and the stats count the mirror pass',()=>{
 assert.equal(body('makeWorld').match(/physics\.addBoundary\(/g)?.length,4,'four walls around the dune rectangle');
 assert.match(main,/calls:info\.render\.calls\+\(cockpit\.visible\?cockpit\.mirrorStats\.calls:0\)/);assert.match(main,/mirror:cockpit\.visible\?\{\.\.\.cockpit\.mirrorStats\}:null/);
 assert.match(main,/cockpit\.update\(now,trucks\[0\]\.physics\?\.steer\?\?0,cockpitReading\)/,'the wheel turns in every view');
 assert.match(body('cockpitReading'),/roll:tilt\.roll,pitch:tilt\.pitch/,'the inclinometer reads the body, not the ground');
});

test('the vignette and the relocated buttons stay out of the way of the HUD',()=>{
 assert.match(style,/#game:not\(\[data-view=board\]\)::before\{[^}]*pointer-events:none[^}]*\}/);assert.doesNotMatch(style,/#game:not\(\[data-view=board\]\)::(before|after)\{[^}]*z-index/,'no z-index: it paints under every HUD panel');
 assert.match(style,/#game\.mobile-layout:not\(\.prestart\) \.game-tools #view-toggle\{right:calc\(100vw - var\(--edge-left\) - var\(--edge-right\) - 96px\)\}/);
 assert.match(style,/@media\(max-width:720px\)\{#game:not\(\.mobile-layout\) \.game-tools #view-toggle,#game:not\(\.mobile-layout\) \.game-tools #time-toggle\{position:absolute;top:43px/);
});

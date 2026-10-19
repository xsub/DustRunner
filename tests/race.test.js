import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceProgress,angleDelta,formatTime} from '../src/race.js';
test('complete lap requires all quarters and a forward line crossing',()=>{let cp=0,lap=0;for(const [a,b] of [[140,160],[290,310],[440,460],[590,10]]){({checkpoint:cp,lap}=advanceProgress(a,b,cp,lap));}assert.equal(lap,1);assert.equal(cp,0);});
test('line oscillation and skipping checkpoints do not award laps',()=>{assert.equal(advanceProgress(590,10,0,0).lap,0);assert.equal(advanceProgress(10,590,3,0).lap,0);assert.equal(advanceProgress(10,310,0,0).checkpoint,0);});
test('steering uses the shortest angle across wrap',()=>{assert.ok(Math.abs(angleDelta(-Math.PI+.1,Math.PI-.1)-.2)<1e-10);});
test('race time formats minutes and hundredths',()=>assert.equal(formatTime(65.123),'01:05.12'));

import test from 'node:test';
import assert from 'node:assert/strict';
import {ENGINES,engineById,engineTorque} from '../src/engines.js';
import {curvePerformance,benchmarkEngine} from '../src/performance.js';

test('reported power includes peaks between torque-curve control points',()=>{
 for(const engine of ENGINES){
  const actual=curvePerformance(engine);let sampled=0;
  for(let rpm=engine.idle;rpm<=engine.redline;rpm++)sampled=Math.max(sampled,rpm*engineTorque(engine,rpm)/9549);
  assert.ok(Math.abs(actual.powerKw-sampled)<.001);
  assert.ok(actual.powerRpm>=engine.idle&&actual.powerRpm<=engine.redline);
 }
});
test('common-chassis comparison exposes engine and mass effects while keeping power consistent',()=>{
 const v8=engineById('302'),six=engineById('170');
 const compact=benchmarkEngine(v8),heavy=benchmarkEngine(v8,'fullsize'),small=benchmarkEngine(six);
 assert.ok(compact.zeroTo50<heavy.zeroTo50);
 assert.equal(compact.powerKw,heavy.powerKw);assert.equal(compact.peakTorque,heavy.peakTorque);
 assert.ok(small.zeroTo50>compact.zeroTo50&&small.speedKmh<compact.speedKmh);
});
test('benchmarks start fresh and leave engine definitions unchanged',()=>{
 const before=JSON.stringify(ENGINES),engine=engineById('400');
 assert.deepEqual(benchmarkEngine(engine),benchmarkEngine(engine));
 assert.equal(JSON.stringify(ENGINES),before);
});

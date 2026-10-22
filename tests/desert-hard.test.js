import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DESERT_VARIANTS,normalizeDesertOptions,createDesertHeight,buildDesert} from '../src/desert.js';
import {desertInvitation} from '../src/desert-share.js';
test('hard dunes restore the pre-playground generator while keeping the accessible default',()=>{
 assert.equal(normalizeDesertOptions().variant,'ridges');assert.equal(DESERT_VARIANTS.find(v=>v.id==='hard').name,'TRUDNE WYDMY');
 assert.deepEqual(normalizeDesertOptions({variant:'hard'}),{variant:'hard',seed:1947});
 const h=createDesertHeight({variant:'hard',seed:1947});
 // Recorded from the previous steep generator (af792eb), not a rescaled new map.
 for(const [x,z,expected] of [[0,0,6.509697193626498],[200,100,36.38575001263378],[-420,180,28.370862052580613],[380,0,30.894851606070972],[900,-200,30.706571064379645]])assert.ok(Math.abs(h(x,z)-expected)<1e-10);
 assert.ok(h(200,100)>createDesertHeight()(200,100)+15);
 const terrain=buildDesert({variant:'hard'});assert.equal(terrain.jumps.length,0);assert.equal(terrain.protectedAreas.length,1);assert.equal(terrain.regions.at(-1).label,'WYSOKIE');assert.equal(terrain.bounds.max.x,1200);
});
test('hard terrain shares its exact variant and seed, and another seed changes the hills',()=>{
 const url=new URL(desertInvitation({variant:'hard',seed:123}).url),options=normalizeDesertOptions({variant:url.searchParams.get('dunes'),seed:url.searchParams.get('seed')});
 assert.deepEqual(options,{variant:'hard',seed:123});assert.equal(createDesertHeight(options)(200,100),createDesertHeight({variant:'hard',seed:123})(200,100));assert.notEqual(createDesertHeight(options)(200,100),createDesertHeight({variant:'hard',seed:456})(200,100));
});

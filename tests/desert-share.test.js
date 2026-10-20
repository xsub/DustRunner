import {test} from 'node:test';
import assert from 'node:assert/strict';
import {desertInvitation} from '../src/desert-share.js';
import {normalizeDesertOptions,createDesertHeight} from '../src/desert.js';
test('shared invitation uses the public playable site and contains the exact random seed',()=>{
 for(const seed of [0,20261020,4294967295]){
  const invitation=desertInvitation({variant:'random',seed}),url=new URL(invitation.url);
  assert.equal(url.origin,'https://xsub.github.io');assert.equal(url.pathname,'/DustRunner/');assert.equal(url.searchParams.get('mode'),'desert');assert.equal(url.searchParams.get('dunes'),'random');assert.equal(Number(url.searchParams.get('seed')),seed);
  assert.ok(invitation.text.includes(invitation.url)&&invitation.text.includes('Wskakuj do Dust Runner!'));assert.ok(!invitation.text.includes('localhost'));
  const restored=normalizeDesertOptions({variant:url.searchParams.get('dunes'),seed:url.searchParams.get('seed')});assert.deepEqual(restored,{variant:'random',seed});
  const a=createDesertHeight({variant:'random',seed}),b=createDesertHeight(restored);for(const [x,z] of [[0,0],[110,-60],[-420,180]])assert.equal(a(x,z),b(x,z));
 }
});
test('preset dunes can also be shared and do not leak unrelated browser parameters',()=>{
 for(const variant of ['ridges','stars']){const link=new URL(desertInvitation({variant,seed:71}).url);assert.deepEqual([...link.searchParams.keys()],['mode','dunes','seed']);assert.equal(link.searchParams.get('dunes'),variant);}
});

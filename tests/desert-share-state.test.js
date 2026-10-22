import test from 'node:test';
import assert from 'node:assert/strict';
import {extendedDesertInvitation} from '../src/desert-share.js';
import {encodeDesertShare,decodeDesertShare,validateDesertShare} from '../src/desert-share-state.js';
import {DEFAULT_TUNING} from '../src/tuning.js';
import {DesertRoute} from '../src/desert-route.js';
const configuration=()=>({engineId:'godzilla73',driveMode:'lo',transmissionMode:'manual',handlingProfile:'classic',steeringMode:'hold',hillDescent:false,frontLock:true,rearLock:false,upgrades:{engine:2,grip:3},tuning:{...DEFAULT_TUNING,gravity:12,spring:82}});
test('all sixteen checkbox combinations round-trip independently; plain terrain links stay unchanged',async()=>{
 for(let bits=0;bits<16;bits++){
  const state={v:1};if(bits&1)state.m='monster80';if(bits&2)state.s=configuration();if(bits&4)state.p=[72.3,-156.7,-1.2345];if(bits&8)state.r=Array.from({length:21},(_,i)=>[i*5,12]);
  const invitation=await extendedDesertInvitation({variant:'random',seed:42},state),url=new URL(invitation.url);
  assert.equal(url.searchParams.get('seed'),'42');assert.equal(url.searchParams.get('dunes'),'random');assert.ok(invitation.text.includes(url.href));
  assert.deepEqual(await decodeDesertShare(url.href),bits?state:null);assert.ok(url.href.length<3000,`${url.href.length} characters`);
 }
});
test('plain JSON fallback and compressed fragments preserve full DEV settings and coordinates',async()=>{
 const state={v:1,m:'turf78',s:configuration(),p:[100,200,Math.PI],r:[[95,200],[100,200]]};
 for(const compress of [false,true]){
  const token=await encodeDesertShare(state,{compress});assert.equal(token[0],compress?'g':'j');
  const decoded=await decodeDesertShare('https://xsub.github.io/DustRunner/?mode=desert#dr='+token);
  assert.deepEqual(decoded,validateDesertShare(state));assert.equal(decoded.s.tuning.gravity,12);
 }
});
test('unsafe, oversized, corrupted and unsupported invite contents are rejected',async()=>{
 for(const state of [{v:2},{v:1,m:'unknown'},{v:1,m:['classic']},{v:1,p:[Infinity,0,0]},{v:1,p:[2000,0,0]},{v:1,r:[[0,0],[200,0]]},{v:1,s:{...configuration(),tuning:{gravity:100}}},{v:1,s:{...configuration(),upgrades:{engine:20,grip:0}}}])assert.throws(()=>validateDesertShare(state));
 for(const value of ['g.corrupted','j.'+'a'.repeat(6100),'z.whatever','j.bm90IGpzb24'])await assert.rejects(()=>decodeDesertShare('https://example.com/#dr='+value));
 const packed=new Uint8Array(await new Response(new Blob([' '.repeat(50000)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
 const bomb='g.'+btoa(String.fromCharCode(...packed)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
 await assert.rejects(()=>decodeDesertShare('https://example.com/#dr='+bomb),/too large/);
 assert.equal(await decodeDesertShare('https://example.com/#unrelated'),null);
});
test('last 100m route sampling is distance-based, bounded, and clears teleport jumps',()=>{
 const a=new DesertRoute(),b=new DesertRoute();
 for(let x=0;x<=200;x++)a.sample(x,0);for(let x=0;x<=200;x+=.25)b.sample(x,0);
 assert.deepEqual(a.snapshot(),b.snapshot());assert.equal(a.snapshot().length,21);assert.deepEqual(a.snapshot()[0],[100,0]);assert.deepEqual(a.snapshot().at(-1),[200,0]);
 a.sample(202,0);assert.equal(a.snapshot().length,21);assert.deepEqual(a.snapshot().at(-1),[202,0]);
 a.sample(500,200);assert.deepEqual(a.snapshot(),[[500,200]]);a.clear();assert.deepEqual(a.snapshot(),[]);
});
test('curved route and reverse movement retain shape rather than a straight line shortcut',()=>{
 const r=new DesertRoute();for(let x=0;x<=30;x++)r.sample(x,0);for(let z=1;z<=30;z++)r.sample(30,z);for(let x=29;x>=0;x--)r.sample(x,30);
 const points=r.snapshot();assert.ok(points.some(([x,z])=>x===30&&z===0));assert.ok(points.some(([x,z])=>x===30&&z===30));assert.deepEqual(points.at(-1),[0,30]);assert.ok(points.length<=22);
});

import {displayPresetName} from '../src/tuning.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createTranslator,t,tx,escapeHTML,getLocale} from '../src/i18n.js';
import en from '../src/locales/en.js';
import {catalogues} from '../src/locales/index.js';

test('English is the only shipped language and unsupported languages fall back to English',()=>{
 assert.equal(getLocale(),'en');assert.deepEqual(Object.keys(catalogues),['en']);
 const i=createTranslator(catalogues,'pl');assert.equal(i.locale,'en');assert.equal(i.t('pit_stop_menu.player'),'Player');
});
test('future partial catalogues fall back by key and interpolate values without reinterpreting them',()=>{
 const i=createTranslator({en:{welcome:'Hello, {name}',fallback:'English fallback',literal:'{value}'},fr:{welcome:'Bonjour, {name}'}},'fr');
 assert.equal(i.t('welcome',{name:'Sam'}),'Bonjour, Sam');assert.equal(i.t('fallback'),'English fallback');
 assert.equal(i.t('literal',{value:'{name}'}),'{name}');assert.equal(i.t('constructor'),'[missing: constructor]');
 assert.equal(i.setLocale('unknown'),'en');assert.equal(i.t('welcome',{name:'Sam'}),'Hello, Sam');
});
test('quantity grammar and number/list formatting belong to the locale',()=>{
 const i=createTranslator({en,fr:{}},'en');
 assert.equal(i.t('raceSetup.carCount',{ai:0,count:1}),'0 AI · 1 car total');
 assert.equal(i.t('raceSetup.carCount',{ai:5,count:6}),'5 AI · 6 cars total');
 assert.equal(i.number(1234.5,{minimumFractionDigits:1}),'1,234.5');
 i.setLocale('fr');assert.equal(i.number(12.5),'12,5');assert.equal(i.list(['A','B']),'A et B');
});
test('HTML translations escape markup and user-supplied substitutions',()=>{
 assert.equal(escapeHTML('<img src="x" onerror=\'x\'>&'),'&lt;img src=&quot;x&quot; onerror=&#39;x&#39;&gt;&amp;');
 assert.equal(tx('vehicle.matches',{count:'<script>'}),'&lt;script&gt; models');
 assert.equal(t('vehicle.matches',{count:1}),'1 model');
});
test('all static source bindings resolve and no Polish copy remains in shipped interface sources',()=>{
 const files=[...readdirSync(new URL('../src/',import.meta.url)).filter(n=>n.endsWith('.js')).map(n=>'src/'+n),'index.html','garage.html','gallery.html'];
 for(const file of files){
  const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.ok(!/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]|\/kl\.| wid\.|Zaproszenie:|['"]Tryb |['"]Zapisano /.test(source),file+' contains Polish copy');
  for(const match of source.matchAll(/\b(?:msg|msgHTML|t|tx)\(["']([^"']+)["']/g)){
   // Dynamic family keys such as ai.<skill> are checked below.
   if(match[1].endsWith('.'))continue;
   assert.ok(Object.hasOwn(en,match[1]),file+': '+match[1]);
  }
  for(const match of source.matchAll(/data-i18n(?:-[a-z-]+)?="([^"{][^"]*)"/g))assert.ok(Object.hasOwn(en,match[1]),file+': '+match[1]);
 }
 for(const file of ['index.html','garage.html','gallery.html']){
  const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  for(const match of source.matchAll(/data-i18n-nodes="([^"]*)"/g)){
   const nodes=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
   for(const key of Object.values(nodes))assert.ok(Object.hasOwn(en,key),file+': '+key);
  }
 }
 for(const level of ['amateur','advanced','seasoned','pro','master'])assert.ok(en['ai.'+level]);
 for(const [key,message] of Object.entries(en)){
  const forms=typeof message==='string'?[message]:Object.values(message);
  if(typeof message!=='string')assert.ok(message.other,key+' needs an other plural');
  for(const text of forms){assert.equal(typeof text,'string',key);assert.ok(!/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]|__P\d+__|PENDING/.test(text),key);}
 }
});

test('old generated preset names translate for display while custom names remain untouched',()=>{
 assert.equal(displayPresetName('Aktywne ustawienia'),'Active settings');
 assert.equal(displayPresetName('M\u00f3j tunning'),'My tune');
 for(const name of ['My custom trail tune','M\u00f3j zestaw pustynny','toString','__proto__'])assert.equal(displayPresetName(name),name);
});

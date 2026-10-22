import {catalogues} from './locales/index.js';
export const DEFAULT_LOCALE='en';
export function createTranslator(messages=catalogues,requested=DEFAULT_LOCALE){
 let locale=Object.hasOwn(messages,requested)?requested:DEFAULT_LOCALE;
 const formats=new Map(),plurals=new Map();
 function t(key,params={}){
  let message=Object.hasOwn(messages[locale]??{},key)?messages[locale][key]:Object.hasOwn(messages[DEFAULT_LOCALE]??{},key)?messages[DEFAULT_LOCALE][key]:undefined;
  if(message===undefined)return `[missing: ${key}]`;
  if(typeof message==='object'){
   const count=Number(params.count??0);if(!plurals.has(locale))plurals.set(locale,new Intl.PluralRules(locale));
   const category=plurals.get(locale).select(count),fallback=messages[DEFAULT_LOCALE]?.[key];
   message=message[category]??message.other??(typeof fallback==='object'?fallback[category]??fallback.other:fallback);
  }
  return String(message).replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,(_,name)=>Object.hasOwn(params,name)?typeof params[name]==='number'?number(params[name],{useGrouping:false,maximumFractionDigits:12}):String(params[name]):`{${name}}`);
 }
 function number(value,options={}){const key=locale+JSON.stringify(options);if(!formats.has(key))formats.set(key,new Intl.NumberFormat(locale,options));return formats.get(key).format(value);}
 return {t,number,get locale(){return locale;},setLocale(code){locale=Object.hasOwn(messages,code)?code:DEFAULT_LOCALE;return locale;},list(values){return new Intl.ListFormat(locale,{style:'long',type:'conjunction'}).format(values);}};
}
const requested=typeof location==='undefined'?DEFAULT_LOCALE:new URLSearchParams(location.search).get('lang')??DEFAULT_LOCALE;
const translator=createTranslator(catalogues,requested);
export const t=translator.t;
export const formatNumber=translator.number;
export const formatFixed=(value,digits=0)=>translator.number(value,{minimumFractionDigits:digits,maximumFractionDigits:digits,useGrouping:false});
export const formatList=translator.list;
export const getLocale=()=>translator.locale;
export const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
// Use tx in HTML templates; use t with textContent, canvas, options or errors.
export const tx=(key,params)=>escapeHTML(t(key,params));
export function translateDOM(root=document){
 root.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
 root.querySelectorAll('[data-i18n-nodes]').forEach(el=>{
  const texts=[...el.childNodes].filter(node=>node.nodeType===3),keys=JSON.parse(el.dataset.i18nNodes);
  for(const [index,key] of Object.entries(keys)){const node=texts[index];if(!node)continue;const prefix=node.textContent.match(/^\s*/)[0],suffix=node.textContent.match(/\s*$/)[0];node.textContent=prefix+t(key)+suffix;}
 });
 for(const attr of ['aria-label','title','placeholder','alt','content','data-mobile-start-hint'])root.querySelectorAll('[data-i18n-'+attr+']').forEach(el=>el.setAttribute(attr,t(el.getAttribute('data-i18n-'+attr))));
 // Carry an explicitly supported language between the game's HTML pages.
 if(getLocale()!==DEFAULT_LOCALE){root.querySelectorAll('a[href]').forEach(link=>{const url=new URL(link.getAttribute('href'),location.href);if(url.origin===location.origin&&(/\.html$/.test(url.pathname)||url.pathname.endsWith('/'))){url.searchParams.set('lang',getLocale());link.href=url.href;}});}
 document.documentElement.lang=getLocale();
}

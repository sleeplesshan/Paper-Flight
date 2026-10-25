import {japanese} from './locales/ja';
export type Language='ko'|'ja';
export const LANGUAGE_KEY='yujun-paper-flight-language';
export function readLanguage():Language{try{if(typeof window==='undefined')return 'ko';return globalThis.localStorage?.getItem(LANGUAGE_KEY)==='ja'?'ja':'ko'}catch{return 'ko'}}
export const language=readLanguage();
export const gameFont=language==='ja'?'NotoSansJP':'Paperlogy';
const pattern=new RegExp(Object.keys(japanese).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
// Translate static copy only. Template values (HTML, numbers and state) stay intact.
export function translate(text:string,locale:Language):string{return locale==='ja'?(japanese[text]??text.replace(pattern,key=>japanese[key])):text;}
export function t(text:string):string{return translate(text,language)}
export function msg(parts:readonly string[],...values:unknown[]):string{return parts.map((p,i)=>t(p)+(i<values.length?String(values[i]):'')).join('')}
export function persistLanguage(value:Language){localStorage.setItem(LANGUAGE_KEY,value)}
export function initializeLanguage(){document.documentElement.lang=language;document.title=t(document.title);const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node:Node|null;while((node=walker.nextNode())){if(!['SCRIPT','STYLE'].includes(node.parentElement?.tagName??''))node.textContent=t(node.textContent??'');}document.querySelectorAll<HTMLElement>('[aria-label],[alt]').forEach(el=>{for(const a of ['aria-label','alt'])if(el.hasAttribute(a))el.setAttribute(a,t(el.getAttribute(a)!))});const description=document.querySelector<HTMLMetaElement>('meta[name="description"]');if(description)description.content=t(description.content);}

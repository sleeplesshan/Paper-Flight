import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

function worker(){
 const handlers=new Map<string,(event:any)=>void>(),timers:(()=>void)[]=[];let now=1000;
 const context=createContext({self:{addEventListener:(type:string,handler:(event:any)=>void)=>handlers.set(type,handler)},Date:{now:()=>now},setTimeout:(callback:()=>void)=>timers.push(callback)});
 runInContext(readFileSync('public/sw.js','utf8').replace("'__VERSION__'","'audit-fixture'"),context);
 return {timers,message:(id:string,value:boolean)=>handlers.get('message')!({source:{id},data:{type:'PLAYING',value}}),quiet:()=>runInContext('waitForQuiet()',context) as Promise<void>,advance:()=>{now+=5001}};
}
test('one idle tab cannot lift the offline download pause owned by another playing tab',async()=>{
 const w=worker();w.message('playing-tab',true);w.message('menu-tab',false);let completed=false;const pending=w.quiet().then(()=>completed=true);await Promise.resolve();
 assert.equal(completed,false);assert.equal(w.timers.length,1);
 w.message('playing-tab',false);w.timers.shift()!();await pending;assert.equal(completed,true);
});
test('a closed tab pause expires without hanging offline preparation',async()=>{
 const w=worker();w.message('closed-tab',true);const pending=w.quiet();assert.equal(w.timers.length,1);w.advance();w.timers.shift()!();await pending;
});

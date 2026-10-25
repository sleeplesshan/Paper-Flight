import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {initialSave,newRun} from '../src/data';
import {offerReward} from '../src/cards';
const KEY='yujun-paper-flight-v1';

test('real Web Audio voices reserve important feedback, steal ordinary voices first, and stop on mute',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'출격하기',exact:true})).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {AudioManager}=await import('/src/audio.ts' as string);
  const manager=new AudioManager() as any,context=new AudioContext();
  // Use real browser nodes with a long silent decoded-buffer fixture. Production sounds
  // are too short to reliably fill the pool; this deliberately holds all voices active.
  manager.context=context;manager.enabled=true;
  const silent=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
  const keys=['pop-pencil-launch','pop-metal-launch','pop-wood-launch','pop-paper-launch','pop-wind-launch','pop-water-launch','pop-star-launch','pop-fire-launch','pop-ice-launch','warning','clear-triumph','hit','ultimate-ready','ultimate-1','ultimate-2','ultimate-3','ultimate-4'];
  for(const key of keys)manager.buffers.set(key,silent);
  let starts=0,stops=0;
  const create=context.createBufferSource.bind(context);
  context.createBufferSource=()=>{const source=create(),start=source.start.bind(source),stop=source.stop.bind(source);source.start=(...args:Parameters<AudioBufferSourceNode['start']>)=>{starts++;return start(...args);};source.stop=(...args:Parameters<AudioBufferSourceNode['stop']>)=>{stops++;return stop(...args);};return source;};
  const launch=(weapon:string)=>manager.feedback({kind:'launch',craft:'3',weapon,level:3,x:500,y:300});
  for(const key of ['pencil','fork','leaf','arrow','wind','drop'])launch(key);
  const ordinary=manager.voices.map((v:{priority:number})=>v.priority);
  manager.effect('warning');manager.effect('clear-triumph');
  const reserved=manager.voices.map((v:{priority:number})=>v.priority);
  launch('star');manager.effect('hit');
  const afterSteal=manager.voices.map((v:{priority:number})=>v.priority);
  for(const key of ['ultimate-ready','ultimate-1','ultimate-2','ultimate-3','ultimate-4'])key==='ultimate-ready'?manager.effect(key):manager.ultimateIntro(key.slice(9));
  const fullCritical=manager.voices.map((v:{priority:number})=>v.priority),beforeLow=starts;
  launch('firebomb');const afterLow=starts;
  manager.setVolumes(.2,0);
  const muted={voices:manager.voices.length,starts,stops};
  launch('icebomb');manager.effect('warning');const attemptsWhileMuted=starts;
  manager.setVolumes(.2,.5);launch('icebomb');const unmuted=manager.voices.length;
  manager.pause(true);const paused={voices:manager.voices.length,starts,stops};
  launch('wind');const attemptsWhilePaused=starts;
  if(manager.fadeTimer)clearInterval(manager.fadeTimer);
  manager.music.pause();await context.close();
  return {ordinary,reserved,afterSteal,fullCritical,beforeLow,afterLow,muted,attemptsWhileMuted,unmuted,paused,attemptsWhilePaused};
 });
 expect(result.ordinary).toHaveLength(6);expect(result.ordinary.every((p:number)=>p===10)).toBe(true);
 expect(result.reserved).toHaveLength(8);expect(result.reserved).toContain(95);expect(result.reserved).toContain(85);
 expect(result.afterSteal).toHaveLength(8);expect(result.afterSteal).toEqual(expect.arrayContaining([95,85,100]));
 expect(result.fullCritical).toHaveLength(8);expect(result.fullCritical.every((p:number)=>p>=70)).toBe(true);
 expect(result.afterLow).toBe(result.beforeLow);
 expect(result.muted.voices).toBe(0);expect(result.muted.stops).toBe(result.muted.starts);expect(result.attemptsWhileMuted).toBe(result.muted.starts);
 expect(result.unmuted).toBe(1);expect(result.paused.voices).toBe(0);expect(result.paused.stops).toBe(result.paused.starts);expect(result.attemptsWhilePaused).toBe(result.paused.starts);
});

test('all 36 actual feedback WAV files decode without missing assets, clipping, or duration drift',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'출격하기',exact:true})).toBeVisible();
 const result=await page.evaluate(async()=>{
  const context=new AudioContext(),manifest=await fetch('/assets/sfx/pop-manifest-v9.json').then(r=>{if(!r.ok)throw Error('Missing audio manifest');return r.json();});
  const rows=[];
  for(const asset of manifest.assets){
   const response=await fetch(asset.url);if(!response.ok)throw Error(`${asset.file}: HTTP ${response.status}`);
   const bytes=await response.arrayBuffer(),buffer=await context.decodeAudioData(bytes);
   let peak=0,finite=true;for(let channel=0;channel<buffer.numberOfChannels;channel++)for(const v of buffer.getChannelData(channel)){if(!Number.isFinite(v))finite=false;peak=Math.max(peak,Math.abs(v));}
   rows.push({file:asset.file,channels:buffer.numberOfChannels,duration:buffer.duration,expected:asset.duration,peak,finite});
  }
  await context.close();return rows;
 });
 expect(result).toHaveLength(36);
 for(const item of result){expect(item.finite,item.file).toBe(true);expect(item.channels,item.file).toBe(1);expect(Math.abs(item.duration-item.expected),item.file).toBeLessThan(.002);expect(item.peak,item.file).toBeGreaterThan(.1);expect(item.peak,item.file).toBeLessThan(.50);}
 mkdirSync('validation-results',{recursive:true});writeFileSync(`validation-results/feedback-audio-${test.info().project.name}.json`,JSON.stringify({method:'Native AudioContext decode of all deployed WAV files; channel count, duration and peak checked. Silent fixture in separate test verifies voice priority and stop behavior. Not an iPad speaker listening test.',assets:result},null,2));
});

test('card-detail preview keeps music advancing, and the real SFX slider mutes requested preview feedback',async({page})=>{
 const save=initialSave();save.music=.25;save.sfx=.4;save.remaining=600;save.run=newRun(1,'3');offerReward(save.run,'mini');save.run.cards=['basic','special1','shield'];
 await page.addInitScript(({key,save})=>{
  localStorage.setItem(key,JSON.stringify(save));
  const state={music:null as HTMLMediaElement|null,pauses:0,starts:0};(window as any).__feedbackAudio=state;
  const play=HTMLMediaElement.prototype.play,pause=HTMLMediaElement.prototype.pause,start=AudioBufferSourceNode.prototype.start;
  HTMLMediaElement.prototype.play=function(){if(this.src.includes('/assets/music/'))state.music=this;return play.call(this);};
  HTMLMediaElement.prototype.pause=function(){if(this===state.music)state.pauses++;return pause.call(this);};
  AudioBufferSourceNode.prototype.start=function(...args:Parameters<AudioBufferSourceNode['start']>){state.starts++;return start.apply(this,args);};
 },{key:KEY,save});
 const missing:string[]=[];page.on('response',r=>{if(r.url().includes('/assets/')&&r.status()>=400)missing.push(`${r.status()} ${r.url()}`);});
 await page.goto('/');await page.getByRole('button',{name:'이어하기',exact:true}).click();await page.locator('[data-card="basic"]').click();
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__feedbackAudio.music&&!(window as any).__feedbackAudio.music.paused)).toBe(true);
 const initial=await page.evaluate(()=>{const a=(window as any).__feedbackAudio;return {time:a.music.currentTime,src:a.music.src,pauses:a.pauses};});
 await page.getByRole('button',{name:'크게 보기',exact:true}).click();await expect(page.locator('dialog.card-detail')).toBeVisible();
 const starts=await page.evaluate(()=>(window as any).__feedbackAudio.starts);
 await page.getByRole('button',{name:'소리 듣기',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__feedbackAudio.starts)).toBe(starts+1);
 await expect.poll(()=>page.evaluate(()=>(window as any).__feedbackAudio.music.currentTime)).toBeGreaterThan(initial.time+.2);
 await page.locator('#detail-back').click();await page.locator('#settings').click();
 await page.locator('#sfx-volume').fill('0');await page.locator('#sfx-volume').dispatchEvent('input');await page.locator('#close-dialog').click();
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),KEY);expect(saved.sfx).toBe(0);expect(saved.music).toBe(.25);
 await page.getByRole('button',{name:'크게 보기',exact:true}).click();
 const mutedStarts=await page.evaluate(()=>(window as any).__feedbackAudio.starts);
 await page.getByRole('button',{name:'소리 듣기',exact:true}).click();await page.waitForTimeout(300);
 const after=await page.evaluate(()=>{const a=(window as any).__feedbackAudio;return {starts:a.starts,src:a.music.src,paused:a.music.paused,pauses:a.pauses,time:a.music.currentTime};});
 expect(after.starts).toBe(mutedStarts);expect(after.src).toBe(initial.src);expect(after.paused).toBe(false);expect(after.pauses).toBe(initial.pauses);expect(after.time).toBeGreaterThan(initial.time+.3);expect(missing).toEqual([]);
});

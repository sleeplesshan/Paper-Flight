import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {initialSave,newRun,aircraft} from '../src/data';
import {growthCaps} from '../src/arsenal';
import {Engine} from '../src/engine';
const KEY='yujun-paper-flight-v1';

test('all eight maximal builds include cast creation, ultimate dispatch, and tails in the 24-enemy stress window',async({browser})=>{
 test.setTimeout(240000);
 const results:unknown[]=[];
 try{
  for(const craft of aircraft){
   const context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:2});
   try{
    const page=await context.newPage(),errors:string[]=[],hotUpdates:string[]=[];let navigations=0;
    page.on('framenavigated',f=>{if(f===page.mainFrame())navigations++;});
    page.on('console',m=>{if(m.text().includes('[vite]')&&/reload|updated/.test(m.text()))hotUpdates.push(m.text());});
    page.on('pageerror',e=>errors.push(e.message));
    const save=initialSave();save.gems=[1,2,3,4,5,6,7,8,9,10];save.completions=20;save.music=0;save.sfx=.35;
    save.run=newRun(10,craft.id);
    const run=save.run;run.mode='playing';run.growth={...growthCaps};run.ultimate.charge=100;run.supply.clock=2.5;run.phase=1;run.auto=true;run.invuln=999;
    const engine=new Engine(run);
    for(let i=0;i<24;i++){
     engine.add('small',200+i%6*100);const e=run.enemies.at(-1)!;
     e.y=20+Math.floor(i/6)*60;e.hp=e.max=100000;e.frozen=30;e.shooter=i<6;
    }
    for(let i=0;i<18;i++)run.bullets.push({x:250+i%6*100,y:30+Math.floor(i/6)*40,vx:0,vy:75,r:6,enemy:true,source:'small'});
    await page.addInitScript(({key,value})=>{
     if(!sessionStorage.getItem('stress-seeded')){sessionStorage.setItem('stress-seeded','1');localStorage.setItem(key,value);}
     const w=window as any,nativeRAF=requestAnimationFrame.bind(window);
     // The native heartbeat runs once per browser frame. Multiple application RAF callbacks
     // contribute to one CPU bucket, and cannot introduce artificial zero-ms frame gaps.
     const timing={active:false,start:0,end:0,last:0,frames:new Map<number,{cpu:number,gap:number}>(),input:[] as {action:string,cpu:number,at:number}[],marks:[] as {name:string,at:number}[]};
     w.__stressTiming=timing;
     const frame=(timestamp:number)=>{let f=timing.frames.get(timestamp);if(!f){f={cpu:0,gap:timing.last?timestamp-timing.last:0};timing.frames.set(timestamp,f);timing.last=timestamp;}return f;};
     const beat=(timestamp:number)=>{if(timing.active)frame(timestamp);nativeRAF(beat);};nativeRAF(beat);
     window.requestAnimationFrame=callback=>nativeRAF(timestamp=>{
      if(!timing.active){callback(timestamp);return;}
      const bucket=frame(timestamp),start=performance.now();try{callback(timestamp);}finally{bucket.cpu+=performance.now()-start;}
     });
    },{key:KEY,value:JSON.stringify(save)});
    await page.goto('/');await page.getByRole('button',{name:'이어하기',exact:true}).click();
    await expect(page.locator('#game')).toHaveAttribute('data-mode','playing');await expect(page.locator('#notice')).toBeHidden({timeout:15000});
    await expect(page.locator('#ultimate')).toBeEnabled();
    const beforeMeasurementNavigation=navigations;
    await page.evaluate(()=>{
     const p=(window as any).__stressTiming;p.frames.clear();p.last=0;p.input=[];p.marks=[];p.start=performance.now();p.last=p.start;p.active=true;
     // Invoke the genuine button click handlers synchronously for a deliberate worst-case
     // burst. UI touch correctness is tested separately; this measures the creation cost.
     const click=(selector:string,action:string)=>{const t=performance.now();document.querySelector<HTMLButtonElement>(selector)!.click();p.input.push({action,cpu:performance.now()-t,at:t-p.start});};
     for(let i=0;i<3;i++){click('[data-action="fire"]','special1-'+(i+1));click('[data-action="ice"]','special2-'+(i+1));}
     click('#ultimate','ultimate-profile');p.marks.push({name:'all input handlers returned',at:performance.now()-p.start});
    });
    await expect(page.locator('[data-action="fire"] b')).toHaveText('0');await expect(page.locator('[data-action="ice"] b')).toHaveText('0');
    await expect(page.locator('.ultimate-cinematic')).toBeVisible();
    await expect(page.locator('.ultimate-cinematic')).toBeHidden({timeout:5000});
    await page.evaluate(()=>{const p=(window as any).__stressTiming;p.marks.push({name:'ultimate dispatched',at:performance.now()-p.start});});
    // No reset here: the one-second cut-in, ultimate creation callback, delayed children,
    // timed supply and periodic saves all belong to the same measured interval.
    await page.waitForTimeout(5500);
    const timing=await page.evaluate(key=>{
     const p=(window as any).__stressTiming;p.active=false;p.end=performance.now();
     const frames=Array.from(p.frames.values()) as {cpu:number,gap:number}[],cpu=frames.map(f=>f.cpu),gaps=frames.map(f=>f.gap).filter(g=>g>0);
     const quant=(v:number[],q:number)=>{const a=[...v].sort((a,b)=>a-b);return a[Math.max(0,Math.ceil(a.length*q)-1)]??0;};
     let streak=0,longest=0;for(const gap of gaps){streak=gap>100?streak+1:0;longest=Math.max(longest,streak);}
     const r=JSON.parse(localStorage.getItem(key)!).run;
     return {samples:frames.length,elapsedMs:p.end-p.start,cpuP95:quant(cpu,.95),cpuP99:quant(cpu,.99),cpuMax:Math.max(0,...cpu),rafGapP95:quant(gaps,.95),rafGapP99:quant(gaps,.99),rafGapMax:Math.max(0,...gaps),longFramesOver50:gaps.filter(g=>g>50).length,longFrameOver50Proportion:gaps.filter(g=>g>50).length/Math.max(1,gaps.length),consecutiveGapsOver100:longest,inputCpu:p.input,marks:p.marks,attacks:r.attacks.length,scheduled:r.scheduled.length,groups:r.groups.length,enemyCount:r.enemies.length,enemyBullets:r.bullets.filter((b:{enemy:boolean})=>b.enemy).length,capsules:r.capsules.length,ultimatePending:r.ultimate.pending};
    },KEY);
    results.push({craft:craft.id,...timing,navigationsDuringMeasurement:navigations-beforeMeasurementNavigation,hotUpdates});
    expect(navigations-beforeMeasurementNavigation,`${craft.id} measurement must not be reset by navigation or HMR`).toBe(0);
    expect(hotUpdates,`${craft.id} no hot updates during measurement`).toEqual([]);
    expect.soft(timing.samples,`${craft.id} real browser samples`).toBeGreaterThanOrEqual(30);
    expect.soft(timing.rafGapP95,`${craft.id} desktop frame-gap P95`).toBeLessThanOrEqual(40);
    expect.soft(timing.consecutiveGapsOver100,`${craft.id} sustained >100ms stalls`).toBeLessThanOrEqual(1);
    expect(timing.inputCpu).toHaveLength(7);expect(timing.ultimatePending).toBe(false);
    expect(timing.marks.find((m:{name:string})=>m.name==='ultimate dispatched')?.at).toBeGreaterThan(500);
    const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).run,KEY);
    expect(before.fire,`${craft.id} fire before reload`).toBe(0);expect(before.ice,`${craft.id} ice before reload`).toBe(0);
    await page.reload();await page.getByRole('button',{name:'이어하기',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('data-mode','playing');
    const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).run,KEY);
    expect(after.id).toBe(before.id);expect(after.growth).toEqual(before.growth);expect(after.fire).toBe(0);expect(after.ice).toBe(0);expect(errors).toEqual([]);
   }finally{await context.close();}
  }
 }finally{
  mkdirSync('validation-results',{recursive:true});
  writeFileSync(`validation-results/browser-stress-${test.info().project.name}.json`,JSON.stringify({method:'Isolated desktop browser DPR2. 24 durable frozen enemies, 18 slow enemy bullets, every upgrade, 6 synchronous real button-handler special casts and final ultimate, timed supply and saves. Measurement starts BEFORE casts and continues through ultimate dispatch plus 5.5 seconds of attack tails. CPU is RAF callback aggregate plus separately recorded synchronous input-handler cost, not GPU or iPad FPS. Native RAF heartbeat records actual browser gaps. No post-creation reset.',acceptance:{samples:30,rafGapP95MaxMs:40,maxConsecutiveGapsOver100:1},results},null,2));
  console.log(JSON.stringify(results,null,2));
 }
});

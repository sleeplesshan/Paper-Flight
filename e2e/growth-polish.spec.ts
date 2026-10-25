import {mkdirSync} from 'node:fs';
import {test,expect,type Page} from '@playwright/test';
import {initialSave,newRun} from '../src/data';
import {offerReward} from '../src/cards';
const KEY='yujun-paper-flight-v1';
mkdirSync('validation-results/growth-polish',{recursive:true});
async function openCards(page:Page){
 const save=initialSave();save.remaining=600;save.music=.2;save.sfx=.4;save.gems=[1,2,3,4,5,6,7,8,9,10];save.run=newRun(2,'7');
 save.run.growth.basic=1;save.run.growth.special1=2;save.run.growth.friend=2;save.run.growth.shield=3;offerReward(save.run,'mini');save.run.cards=['special1','friend','shield'];
 await page.addInitScript(({key,save})=>{if(!sessionStorage.getItem('polish-seeded')){sessionStorage.setItem('polish-seeded','1');localStorage.setItem(key,JSON.stringify(save));}
  const state={music:null as HTMLMediaElement|null,pauses:0,starts:0};(window as any).__polishAudio=state;
  const play=HTMLMediaElement.prototype.play,pause=HTMLMediaElement.prototype.pause,start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args:Parameters<AudioBufferSourceNode['start']>){state.starts++;return start.apply(this,args);};
  HTMLMediaElement.prototype.play=function(){if(this.src.includes('/assets/music/'))state.music=this;return play.call(this);};
  HTMLMediaElement.prototype.pause=function(){if(this===state.music)state.pauses++;return pause.call(this);};
 },{key:KEY,save});
 await page.goto('/');await page.getByRole('button',{name:'이어하기',exact:true}).click();await expect(page.locator('.upgrade-card')).toHaveCount(3);
}

test('iPad card comparison is large, isolated, audible only on request, and applies directly to battle',async({page})=>{
 await page.setViewportSize({width:1194,height:834});await openCards(page);
 await page.screenshot({path:`validation-results/growth-polish/choices-${test.info().project.name}.png`});
 await page.locator('[data-card="special1"]').click();
 const sizes=await page.locator('.upgrade-screen .card-preview canvas').evaluateAll(canvases=>canvases.map(c=>{const r=c.getBoundingClientRect();return {width:r.width,height:r.height};}));
 expect(sizes).toHaveLength(2);expect(sizes[0].height).toBeGreaterThanOrEqual(180);expect(sizes[0]).toEqual(sizes[1]);
 const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).run,KEY);
 await page.getByRole('button',{name:'크게 보기',exact:true}).click();await expect(page.locator('dialog.card-detail')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__polishAudio.music&&!(window as any).__polishAudio.music.paused)).toBe(true);
 const music=await page.evaluate(()=>{const a=(window as any).__polishAudio;return {src:a.music.src,pauses:a.pauses};});
 await page.screenshot({path:`validation-results/growth-polish/card-${test.info().project.name}.png`});
 const soundCount=await page.evaluate(()=>(window as any).__polishAudio.starts);
 await page.getByRole('button',{name:'소리 듣기',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__polishAudio.starts)).toBe(soundCount+1);
 await page.waitForTimeout(1100);
 await page.screenshot({path:`validation-results/growth-polish/tree-${test.info().project.name}.png`});
 await page.waitForTimeout(4600);
 expect(await page.evaluate(()=>(window as any).__polishAudio.starts)).toBe(soundCount+1);
 const during=await page.evaluate(key=>({run:JSON.parse(localStorage.getItem(key)!).run,music:{src:(window as any).__polishAudio.music.src,pauses:(window as any).__polishAudio.pauses}}),KEY);
 expect(during.run.growth).toEqual(before.growth);expect(during.run.attacks).toEqual(before.attacks);expect(during.run.claimedRewards).toEqual(before.claimedRewards);expect(during.music).toEqual(music);
 await page.screenshot({path:`validation-results/growth-polish/detail-${test.info().project.name}.png`});
 await page.evaluate(()=>{(window as any).__postPickCanvases=0;new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node instanceof Element)(window as any).__postPickCanvases+=Number(node.matches('canvas'))+node.querySelectorAll('canvas').length;}).observe(document.querySelector('#overlay')!,{childList:true,subtree:true});});
 await page.locator('#detail-pick').click();await expect(page.locator('#game')).toHaveAttribute('data-mode','playing');await expect(page.locator('#overlay canvas')).toHaveCount(0);
 await expect(page.locator('.applied-paper')).toHaveCount(0);
 const after=await page.evaluate(key=>({run:JSON.parse(localStorage.getItem(key)!).run,canvases:(window as any).__postPickCanvases}),KEY);
 expect(after.run.growth.special1).toBe(3);expect(after.run.claimedRewards).toHaveLength(1);expect(after.canvases).toBe(0);
 await page.locator('#menu').click();await expect(page.locator('dialog')).toBeVisible();expect(await page.evaluate(()=>(window as any).__polishAudio.music.paused)).toBe(false);
});

test('all 152 upgrade lessons finish their real attacks, including friend volleys and reflected shield shots',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'출격하기',exact:true})).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {PreviewPlayback,previewBounds}=await import('/src/preview-model.ts' as string),{newRun}=await import('/src/data.ts' as string),{growthCaps}=await import('/src/arsenal.ts' as string);
  const failures:string[]=[];let count=0,lateChildren=0,friendVolleys=0,reflections=0,maxDuration=0;
  for(const craft of ['3','4','6','7','1','2','5','6b'])for(const [track,cap] of Object.entries(growthCaps))for(let level=0;level<Number(cap);level++){
   const source=newRun(2,craft);source.growth[track]=level;const original=JSON.stringify(source),p=new PreviewPlayback(source,track),bounds=previewBounds(source,track);let sounds=0;p.onAfterStart(()=>sounds++);
   const name=`${craft}/${track}/${level}`;
   if(JSON.stringify(p.engines[0].r.enemies)!==JSON.stringify(p.engines[1].r.enemies))failures.push(name+': different targets');
   while(!p.finished&&p.elapsed<10){p.step(1/60);for(const e of p.engines){if(p.elapsed>2.2)lateChildren+=e.r.attacks.filter((s:any)=>s.child).length;if(track==='shield')reflections+=e.r.attacks.filter((s:any)=>s.key==='windblade'||s.key==='star').length;}}
   if(!p.finished||p.engines.some((e:any)=>e.r.attacks.length||e.r.scheduled.length||e.r.bullets.length||e.r.effects.length))failures.push(name+': truncated');
   if(sounds!==1)failures.push(name+': sound repeated');
   if(JSON.stringify(source)!==original)failures.push(name+': changed real run');
   if(track==='friend'&&level>=2)friendVolleys=Math.max(friendVolleys,p.engines[1].r.friendVolley);
   if(!Object.values(bounds).every(v=>Number.isFinite(v))||bounds.left>=bounds.right||bounds.top>=bounds.bottom)failures.push(name+': invalid camera');
   maxDuration=Math.max(maxDuration,p.elapsed);count++;
  }
  return {count,failures,lateChildren,friendVolleys,reflections,maxDuration};
 });
 expect(result.count).toBe(152);expect(result.failures).toEqual([]);expect(result.lateChildren).toBeGreaterThan(0);expect(result.friendVolleys).toBeGreaterThanOrEqual(3);expect(result.reflections).toBeGreaterThan(0);expect(result.maxDuration).toBeGreaterThan(3.5);
});

test('short landscape scrolls the outer paper and keeps the comparison and confirmation reachable',async({page})=>{
 await page.setViewportSize({width:844,height:390});await openCards(page);await page.locator('[data-card="friend"]').click();
 const state=await page.locator('#overlay').evaluate(el=>({scrolls:el.scrollHeight>el.clientHeight,overflow:getComputedStyle(el).overflowY,touch:getComputedStyle(el.querySelector('.upgrade-card')!).touchAction,body:document.documentElement.scrollWidth<=innerWidth}));
 expect(state).toEqual({scrolls:true,overflow:'auto',touch:'pan-y',body:true});
 await page.getByRole('button',{name:'크게 보기',exact:true}).click();await expect(page.locator('dialog.card-detail')).toBeVisible();
 await page.getByRole('button',{name:'다른 카드도 볼래',exact:true}).click();await page.getByRole('button',{name:'이걸로 할래!',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('data-mode','playing');
});

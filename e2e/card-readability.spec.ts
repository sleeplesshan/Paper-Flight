import {test,expect,type Page} from '@playwright/test';
import {initialSave,newRun} from '../src/data';
import {offerReward} from '../src/cards';
const KEY='yujun-paper-flight-v1';
async function cards(page:Page,remaining=300){
 const s=initialSave();s.remaining=remaining;s.music=.25;s.sfx=0;s.run=newRun(1,'6');offerReward(s.run,'mini');
 await page.addInitScript(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:KEY,s});
 await page.goto('/');await page.getByRole('button',{name:'이어하기',exact:true}).click();
 await expect(page.locator('#game')).toHaveAttribute('data-mode','cards');
}
test('all 152 growth cards keep actual Korean glyphs inside the paper on landscape screens',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'출격하기',exact:true}).waitFor();
 for(const size of [{width:1024,height:600},{width:1194,height:834},{width:844,height:390}]){
  await page.setViewportSize(size);
  const failures=await page.evaluate(async()=>{
   // Use the game's renderer, definitions, font, and styles rather than a test template.
   const {cardChoiceHTML}=await import('/src/presentation.ts' as string);
   const {newRun}=await import('/src/data.ts' as string);
   const {growthCaps}=await import('/src/arsenal.ts' as string);
   const overlay=document.querySelector('#overlay')!;overlay.className='upgrade-screen';
   overlay.innerHTML='<div class="upgrade-cards"></div>';
   const grid=overlay.firstElementChild!;let html='';
   for(const craft of ['3','4','6','7','1','2','5','6b'])for(const [track,cap] of Object.entries(growthCaps))for(let level=1;level<=Number(cap);level++){
    const r=newRun(1,craft);r.growth[track]=level-1;r.growth.friend=track==='friend'?level-1:1;
    html+=cardChoiceHTML(r,track,level%2===0);
   }
   grid.innerHTML=html;await document.fonts.ready;
   const bad:string[]=[];
   for(const columns of [1,2,3]){(grid as HTMLElement).style.gridTemplateColumns=`repeat(${columns},minmax(0,1fr))`;
   for(const card of grid.children){const box=card.getBoundingClientRect();for(const copy of card.querySelectorAll('strong,:scope>span')){
    const range=document.createRange();range.selectNodeContents(copy);
    const glyphs=Array.from(range.getClientRects()).filter(r=>r.width>0&&r.height>0);
    // The transparent paper image's inner outline is inset from the button box.
    if(glyphs.some(r=>r.left<box.left+box.width*.10||r.right>box.left+box.width*.89||r.top<box.top+box.height*.04||r.bottom>box.top+box.height*.97))bad.push(copy.textContent||'');
    if(copy.scrollWidth>copy.clientWidth+1)bad.push('overflow: '+copy.textContent);
    if(parseFloat(getComputedStyle(copy).fontSize)<(copy.tagName==='STRONG'?28:22))bad.push('too small: '+copy.textContent);
   }}}
   return {count:grid.children.length,bad};
  });
  expect(failures.count).toBe(152);expect(failures.bad,JSON.stringify(size)).toEqual([]);
 }
});
test('large card preview keeps the same music playing and resumes it after background or rotation',async({page})=>{
 await page.addInitScript(()=>{
  const state={music:null as HTMLMediaElement|null,pauseCalls:0};(window as any).__cardAudio=state;
  const play=HTMLMediaElement.prototype.play,pause=HTMLMediaElement.prototype.pause;
  HTMLMediaElement.prototype.play=function(){if(this.src.includes('/assets/music/'))state.music=this;return play.call(this)};
  HTMLMediaElement.prototype.pause=function(){if(this===state.music)state.pauseCalls++;return pause.call(this)};
 });
 await cards(page);await page.locator('[data-card="basic"]').click();
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__cardAudio.music&&!(window as any).__cardAudio.music.paused)).toBe(true);
 const before=await page.evaluate(()=>{const s=(window as any).__cardAudio;return {src:s.music.src,time:s.music.currentTime,calls:s.pauseCalls}});
 await page.getByRole('button',{name:'크게 보기',exact:true}).click();
 await expect(page.locator('dialog.card-detail')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=> (window as any).__cardAudio.music.currentTime)).toBeGreaterThan(before.time+.3);
 const during=await page.evaluate(()=>{const s=(window as any).__cardAudio;return {src:s.music.src,calls:s.pauseCalls,paused:s.music.paused}});
 expect(during).toEqual({src:before.src,calls:before.calls,paused:false});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});
 expect(await page.evaluate(()=> (window as any).__cardAudio.music.paused)).toBe(true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});
 await expect.poll(()=>page.evaluate(()=> (window as any).__cardAudio.music.paused)).toBe(false);
 await page.setViewportSize({width:600,height:1024});await expect.poll(()=>page.evaluate(()=> (window as any).__cardAudio.music.paused)).toBe(true);
 await page.setViewportSize({width:1024,height:600});await expect.poll(()=>page.evaluate(()=> (window as any).__cardAudio.music.paused)).toBe(false);
 await page.screenshot({path:`test-results/card-detail-music-${test.info().project.name}.png`});
 await page.getByRole('button',{name:'다른 카드도 볼래',exact:true}).click();
 await page.screenshot({path:`test-results/cards-readable-${test.info().project.name}.png`});
 await page.locator('#menu').click();await expect(page.locator('dialog:not(.card-detail)')).toBeVisible();
 expect(await page.evaluate(()=> (window as any).__cardAudio.music.paused)).toBe(false);
});

test('time expiry during large preview still stops music and blocks card confirmation',async({page})=>{
 await page.addInitScript(()=>{
  const play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){if(this.src.includes('/assets/music/'))(window as any).__previewMusic=this;return play.call(this)};
 });
 await cards(page,5);await page.locator('[data-card="basic"]').click();
 await page.getByRole('button',{name:'크게 보기',exact:true}).click();
 await expect(page.locator('dialog.card-detail')).toBeVisible();
 await expect(page.locator('#pin')).toBeVisible({timeout:10000});
 expect(await page.evaluate(()=> (window as any).__previewMusic.paused)).toBe(true);
 await expect(page.locator('dialog.card-detail')).toHaveCount(0);
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),KEY);
 expect(saved.remaining).toBe(0);expect(saved.run.growth.basic).toBe(0);expect(saved.run.reward.status).toBe('offered');
});

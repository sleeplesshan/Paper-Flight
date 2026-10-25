import {test,expect} from '@playwright/test';
import {initialSave,newRun} from '../src/data';
import {offerReward} from '../src/cards';
test('all 152 growth cards keep actual Japanese glyphs inside the paper on landscape screens',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('yujun-paper-flight-language','ja'));await page.goto('/');await page.getByRole('button',{name:'出発する',exact:true}).waitFor();
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
test('start selector persists Japanese without starting or resetting an adventure',async({page})=>{
 const save=initialSave();save.points=1234;save.gems=[1,2,3];save.completions=1;save.remaining=500;save.run=newRun(4,'7');save.run.adventureScore=400;
 await page.addInitScript(s=>{if(!localStorage.getItem('language-test-seeded')){localStorage.setItem('yujun-paper-flight-v1',JSON.stringify(s));localStorage.setItem('language-test-seeded','1')}},save);
 await page.goto('/');await page.getByRole('button',{name:'이어하기',exact:true}).waitFor();
 await page.getByRole('button',{name:'日本語',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','ja');
 await expect(page.locator('#game')).toHaveAttribute('data-mode','start');
 await expect(page.getByRole('button',{name:'続きから',exact:true})).toBeVisible();
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('yujun-paper-flight-v1')!));
 expect(state.gems).toEqual([1,2,3]);expect(state.completions).toBe(1);expect(state.points).toBeGreaterThanOrEqual(1234);expect(state.run.stage).toBe(4);expect(state.run.craft).toBe('7');expect(state.remaining).toBeLessThanOrEqual(500);expect(state.remaining).toBeGreaterThan(485);
 expect(await page.evaluate(()=>document.fonts.check('18px NotoSansJP','日本語冒険'))).toBe(true);
 expect((await page.locator('body').innerText()).replace('한국어','')).not.toMatch(/[가-힣]/); // Language option is intentionally Korean.
});
test('Japanese selection, card detail, medals and guardian UI contain translated copy',async({page})=>{
 const s=initialSave();s.run=newRun(1,'7');offerReward(s.run,'mini');s.remaining=500;
 await page.addInitScript(s=>{localStorage.setItem('yujun-paper-flight-language','ja');localStorage.setItem('yujun-paper-flight-v1',JSON.stringify(s))},s);
 await page.goto('/');await page.getByRole('button',{name:'続きから',exact:true}).click();
 await expect(page.locator('#game')).toHaveAttribute('data-mode','cards');
 await page.locator('[data-card="basic"]').click();await page.getByRole('button',{name:'大きく見る',exact:true}).click();
 await expect(page.locator('dialog.card-detail')).toBeVisible();expect(await page.locator('dialog').innerText()).not.toMatch(/[가-힣]/);
 await page.getByRole('button',{name:'他のカードも見る',exact:true}).click();
 await page.getByRole('button',{name:'これにする！',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('data-mode','playing');
 await page.locator('#menu').click();await page.getByRole('button',{name:'タイトル画面',exact:true}).click();
 await page.getByRole('button',{name:'新しく出発',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('data-mode','select');
 expect(await page.locator('#overlay').innerText()).not.toMatch(/[가-힣]/);await page.locator('#menu').click();
 await page.locator('[data-gem="1"]').click();expect(await page.locator('dialog').innerText()).not.toMatch(/[가-힣]/);await page.getByRole('button',{name:'閉じる',exact:true}).click();
 await page.locator('#timer').click();await expect(page.locator('#pin')).toHaveAttribute('aria-label','保護者のパスワード');
 await page.screenshot({path:`test-results/japanese-${test.info().project.name}.png`});
});

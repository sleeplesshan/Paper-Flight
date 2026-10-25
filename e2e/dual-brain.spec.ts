import {test,expect,type Page} from '@playwright/test';
import {newRun,initialSave} from '../src/data';
const KEY='yujun-paper-flight-v1';
async function seed(page:Page,mode:'cards'|'clear'='cards',craft='4'){
 const s=initialSave();s.gems=[1,2,3,4,5,6,7,8,9,10];s.reached=10;s.remaining=500;s.music=s.sfx=0;s.run=newRun(5,craft);Object.assign(s.run,{mode,growth:{basic:2,special1:1,special2:1,friend:2,shield:2},cards:['basic','special1','shield'],pendingCard:'basic',cardDone:mode==='clear',rewarded:true});
 await page.addInitScript(({KEY,s})=>localStorage.setItem(KEY,JSON.stringify(s)),{KEY,s});await page.goto('/');await page.getByRole('button',{name:'이어하기',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('data-mode',mode);
}
test('readable card text fits and confirmation remains reachable on shorter landscape viewports',async({page})=>{
 await seed(page);await expect(page.locator('.card-preview canvas').first()).toHaveCSS('object-fit','fill');
 for(const size of [{width:1180,height:700},{width:1024,height:700},{width:1024,height:600}]){
  await page.setViewportSize(size);await expect.poll(()=>page.locator('#game').evaluate(el=>{const r=el.getBoundingClientRect();return {width:Math.round(r.width),height:Math.round(r.height)}})).toEqual(size);
  // The renderer fits artwork uniformly in a canvas sized to its displayed rectangle.
  await expect.poll(()=>page.locator('.card-preview canvas').evaluateAll(canvases=>canvases.length===2&&canvases.every(el=>{const c=el as HTMLCanvasElement,r=c.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);return Math.abs(c.width-Math.round(r.width*dpr))<=1&&Math.abs(c.height-Math.round(r.height*dpr))<=1}))).toBe(true);
  const result=await page.evaluate(()=>{
   const overlay=document.querySelector('#overlay')!,preview=document.querySelector('.card-preview')!;
   return {overflowY:getComputedStyle(overlay).overflowY,cards:[...document.querySelectorAll('.upgrade-card')].map(card=>{
    const box=card.getBoundingClientRect();return {overflow:card.scrollHeight-card.clientHeight,bottom:box.bottom,previewTop:preview.getBoundingClientRect().top,childrenFit:[...card.children].every(el=>{const b=el.getBoundingClientRect();return b.left>=box.left&&b.right<=box.right&&b.top>=box.top&&b.bottom<=box.bottom})};
   })};
  });
  expect(result.overflowY).toBe('auto');
  for(const card of result.cards){expect(card.overflow,JSON.stringify({size,card})).toBeLessThanOrEqual(2);expect(card.childrenFit).toBe(true);expect(card.bottom).toBeLessThanOrEqual(card.previewTop)}
  await page.locator('[data-do="pick-card"]').scrollIntoViewIfNeeded();
  const reach=await page.locator('[data-do="pick-card"]').evaluate(el=>{const b=el.getBoundingClientRect(),o=document.querySelector('#overlay')!.getBoundingClientRect();return {bottom:b.bottom-o.bottom,top:o.top-b.top}});
  expect(reach.bottom).toBeLessThanOrEqual(2);expect(reach.top).toBeLessThanOrEqual(2);
  await page.screenshot({path:`test-results/dual-cards-${size.width}x${size.height}-${test.info().project.name}.png`});
 }
});
test('changing aircraft starts selection at the aircraft that just cleared',async({page})=>{await seed(page,'clear','7');await page.getByRole('button',{name:'기체 바꾸기',exact:true}).click();await expect(page.locator('.craft-name')).toHaveText('날개 달린 배');await page.locator('#menu').click();await expect(page.locator('#game')).toHaveAttribute('data-mode','clear');});
test('opening settings during asset preparation cannot commit a hidden departure',async({page})=>{
 await page.goto('/');let release!:()=>void;const blocked=new Promise<void>(r=>release=r);let requested!:()=>void;const incoming=new Promise<void>(r=>requested=r);
 await page.route('**/players/3-sheet.webp',async route=>{requested();await blocked;await route.continue()});await page.getByRole('button',{name:'출격하기',exact:true}).click();await page.locator('[data-action="ice"]').click();await incoming;await page.locator('#settings').click();await expect(page.locator('dialog')).toBeVisible();release();await page.waitForTimeout(1000);expect(await page.locator('#game').getAttribute('data-mode')).toBe('select');expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).run,KEY)).toBeNull();await page.getByRole('button',{name:'돌아가기',exact:true}).click();await page.locator('[data-action="ice"]').click();await expect(page.locator('#game')).toHaveAttribute('data-mode','playing',{timeout:10000});
});
test('a card save failure recovers to clear exactly once',async({page})=>{
 await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if((window as any).failSave)throw Error('Test quota');return original.call(this,k,v)}});await seed(page);const previous=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).run.growth.basic,KEY);
 await page.evaluate(()=>{(window as any).failSave=true;(document.querySelector('[data-do="pick-card"]') as HTMLElement).click()});await expect(page.locator('#retry-save')).toBeVisible();await page.evaluate(()=>(window as any).failSave=false);await page.locator('#retry-save').click();await expect(page.locator('#game')).toHaveAttribute('data-mode','clear');await expect(page.getByRole('button',{name:'다음 스테이지',exact:true})).toBeVisible();expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).run.growth.basic,KEY)).toBe(previous+1);
});

test('closing a dialog before loading completes still cancels that earlier departure',async({page})=>{
 await page.goto('/');let release!:()=>void;const blocked=new Promise<void>(r=>release=r);let requested!:()=>void;const incoming=new Promise<void>(r=>requested=r);
 await page.route('**/players/3-sheet.webp',async route=>{requested();await blocked;await route.continue()});await page.getByRole('button',{name:'출격하기',exact:true}).click();await page.locator('[data-action="ice"]').click();await incoming;await expect(page.locator('[data-action="ice"]')).toBeDisabled();await page.locator('#settings').click();await page.getByRole('button',{name:'돌아가기',exact:true}).click();release();await expect(page.locator('[data-action="ice"]')).toBeEnabled();expect(await page.locator('#game').getAttribute('data-mode')).toBe('select');expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).run,KEY)).toBeNull();
});

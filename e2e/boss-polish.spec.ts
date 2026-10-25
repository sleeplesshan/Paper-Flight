import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {initialSave,newRun,stages} from '../src/data';
const key='yujun-paper-flight-v1';
test.use({deviceScaleFactor:2});
async function fixture(page:Page,mode='playing',stage=4,intro=true,craft='6'){
 const save=initialSave();save.gems=[1,2,3,4,5,6,7,8,9,10];save.reached=10;save.remaining=300;save.music=save.sfx=0;
 const r=save.run=newRun(stage,craft);Object.assign(r,{mode,phase:1,spawn:999,invuln:999});
 if(intro)r.bossIntro={kind:'boss',duration:2,remaining:2};
 if(mode==='cards'){r.bossIntro=null;r.growth={basic:1,special1:1,special2:1,friend:1,shield:1};r.cards=['basic','special2','shield'];}
 await page.addInitScript(({key,save})=>{if(!sessionStorage.getItem('polish-seeded')){localStorage.setItem(key,JSON.stringify(save));sessionStorage.setItem('polish-seeded','1')}},{key,save});
 await page.goto('/');await page.getByRole('button',{name:'이어하기',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('data-mode',mode);
}
const saved=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
test('warning freezes input and combat, persists countdown and never traps a new departure',async({page})=>{
 mkdirSync('validation-results/boss-polish',{recursive:true});await fixture(page);
 await expect(page.locator('.boss-warning')).toHaveText('WARNING');
 await expect(page.locator('.boss-profile h1')).toHaveText('스핑크스 비행선');
 await expect(page.locator('[data-action="gun"]')).toBeDisabled();
 await page.waitForTimeout(350);await page.screenshot({path:`validation-results/boss-polish/warning-${test.info().project.name}.png`});await page.locator('#menu').click();const before=await saved(page);
 expect(before.run.time).toBe(0);expect(before.run.bossIntro.remaining).toBeLessThan(2);expect(before.remaining).toBeLessThan(300);
 await page.reload();await page.getByRole('button',{name:'이어하기',exact:true}).click();await expect(page.locator('.boss-warning')).toBeVisible();
 await page.locator('#menu').click();const after=await saved(page);expect(after.run.bossIntro.remaining).toBeLessThanOrEqual(before.run.bossIntro.remaining);expect(after.run.time).toBe(0);
 await page.screenshot({path:`validation-results/boss-polish/warning-pause-${test.info().project.name}.png`});
 await page.getByRole('button',{name:'처음 화면',exact:true}).click();await page.getByRole('button',{name:'새로 출격',exact:true}).click();
 await expect(page.locator('[data-action="ice"]')).toBeEnabled();
});
test('long card text stays inside, touch scrolling works and large comparison preserves selection until confirmed',async({page,context,browserName})=>{
 await page.setViewportSize({width:1024,height:600});await fixture(page,'cards',5,false);
 const text=await page.locator('.upgrade-card').evaluateAll(cards=>cards.map(card=>{const box=card.getBoundingClientRect();return [...card.querySelectorAll('strong,:scope>span')].every(el=>{const b=el.getBoundingClientRect();return b.left>=box.left&&b.right<=box.right&&b.top>=box.top&&b.bottom<=box.bottom})}));expect(text.every(Boolean)).toBe(true);
 const touch=await page.locator('.upgrade-card strong').first().evaluate(el=>{const e=new Event('touchmove',{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:[{}]});el.dispatchEvent(e);return {blocked:e.defaultPrevented,action:getComputedStyle(el).touchAction}});expect(touch.blocked).toBe(false);expect(touch.action).toBe('pan-y');
 if(browserName==='chromium'){const cdp=await context.newCDPSession(page),box=await page.locator('#overlay').boundingBox();const x=box!.x+box!.width/2,y=box!.y+box!.height*.65;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*26}]});await page.waitForTimeout(30)}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect(await page.locator('#overlay').evaluate(el=>el.scrollTop)).toBeGreaterThan(30);await cdp.detach();}
 await page.locator('[data-card="special2"]').click();const before=await saved(page);await page.getByRole('button',{name:'크게 보기',exact:true}).click();
 await expect(page.locator('dialog.card-detail')).toBeVisible();await expect(page.locator('.card-detail-help')).toContainText('숟가락/포크/칼 부채');
 const header=(await page.locator('.card-detail header').boundingBox())!,comparison=(await page.locator('.detail-comparison').boundingBox())!;expect(comparison.width).toBeGreaterThan(800);expect(comparison.y).toBeGreaterThanOrEqual(header.y+header.height);
 await page.waitForTimeout(900);const after=await saved(page);expect(after.run.growth).toEqual(before.run.growth);expect(after.run.time).toBe(before.run.time);expect(after.remaining).toBeLessThan(before.remaining);
 await page.screenshot({path:`validation-results/boss-polish/card-detail-${test.info().project.name}.png`});
 await page.getByRole('button',{name:'다른 카드도 볼래',exact:true}).click();await expect(page.locator('[data-card="special2"]')).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'크게 보기',exact:true}).click();await page.locator('#detail-pick').click();await expect(page.locator('#game')).toHaveAttribute('data-mode','clear');expect((await saved(page)).run.growth.special2).toBe(2);
});
test('all ten boss profiles load and high-density canvas retains logical player size',async({page})=>{
 await fixture(page,'playing',1,false);const loaded=await page.evaluate(async()=>{const result=[];for(let n=1;n<=10;n++){const im=new Image();im.src=`/assets/bosses/stage${n}-profile.webp`;await im.decode();result.push({n,w:im.naturalWidth,h:im.naturalHeight})}return result});expect(loaded).toHaveLength(10);expect(loaded.every(i=>i.w>200&&i.h>200&&Math.max(i.w,i.h)<=(i.n===6?524:512))).toBe(true);
 const canvas=await page.locator('#screen>canvas').evaluate((el:HTMLCanvasElement)=>({w:el.width,h:el.height,ratio:el.width/1000}));expect(canvas.ratio).toBeGreaterThan(1.5);expect(canvas.ratio).toBeLessThanOrEqual(2);expect(Math.abs(canvas.h-560*canvas.ratio)).toBeLessThanOrEqual(1);
});

test('every boss profile, name and tip fits the shorter landscape introduction',async({page})=>{
 await page.setViewportSize({width:1024,height:600});await fixture(page,'playing',10,true);
 await page.addInitScript(key=>{const stage=Number(new URL(location.href).searchParams.get('boss-stage'));if(!stage)return;const s=JSON.parse(localStorage.getItem(key)!);s.run.stage=stage;s.run.mode='playing';s.run.time=0;s.run.bossIntro={kind:'boss',duration:2,remaining:2};localStorage.setItem(key,JSON.stringify(s))},key);
 for(let stage=1;stage<=10;stage++){
  // Inject after pagehide has flushed the previous live snapshot.
  await page.goto(`/?boss-stage=${stage}`);await page.getByRole('button',{name:'이어하기',exact:true}).click();await expect(page.locator('.boss-warning')).toBeVisible();await expect(page.locator('.boss-profile h1')).toHaveText(stages[stage-1].boss);
  const fit=await page.locator('.boss-profile').evaluate(el=>{const bounds=document.querySelector('#overlay')!.getBoundingClientRect();return [...el.querySelectorAll('img,h1,p')].every(item=>{const b=item.getBoundingClientRect();return b.left>=bounds.left&&b.right<=bounds.right&&b.top>=bounds.top&&b.bottom<=bounds.bottom})});expect(fit,`stage ${stage}`).toBe(true);
  if([1,6,10].includes(stage))await page.screenshot({path:`validation-results/boss-polish/short-warning-${stage}-${test.info().project.name}.png`});
 }
});

import {test,expect,type Page} from '@playwright/test';
import {initialSave,newRun,type Run} from '../src/data';
import {Engine} from '../src/engine';
import {offerReward} from '../src/cards';
import {mkdirSync} from 'node:fs';
const KEY='yujun-paper-flight-v1';
const stored=(p:Page)=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)!),KEY);
async function fixture(p:Page,kind:'meter'|'mini-card'|'clear-card'|'mini-death'|'boss-death',charge=63){
 const s=initialSave(),r=s.run=newRun(4,'3');s.music=s.sfx=0;s.remaining=300;
 Object.assign(r,{mode:'playing',phase:kind==='mini-death'?1:3,spawn:999,invuln:999,auto:false});r.ultimate.charge=charge;
 if(kind==='mini-card'||kind==='clear-card'){offerReward(r,kind==='mini-card'?'mini':'clear');r.phase=2;r.cards=['basic','special1','friend'];}
 if(kind.endsWith('death')){r.enemies=[{id:77,x:500,y:130,hp:0,max:300,kind:kind==='mini-death'?'mini':'boss',variant:0,t:0,fire:999,frozen:0,hit:0,originX:500,targetX:500,warning:0}];new Engine(r).step(.01,{x:0,y:0});}
 await p.addInitScript(({k,s})=>{if(!sessionStorage.getItem('seed-v5')){localStorage.setItem(k,JSON.stringify(s));sessionStorage.setItem('seed-v5','1');}},{k:KEY,s});
 await p.goto('/');await p.getByRole('button',{name:'이어하기',exact:true}).click();await expect(p.locator('#game')).toHaveAttribute('data-mode',r.mode);return s;
}
test('charge bar sits above its fixed button slot with no control or screen overlap',async({page})=>{
 await fixture(page,'meter',100);await expect(page.locator('#ultimate')).toBeVisible();await expect(page.locator('#ultimate-meter')).toHaveAttribute('aria-valuenow','100');
 mkdirSync('validation-results/v5',{recursive:true});
 for(const size of [{width:1024,height:600},{width:1194,height:834},{width:1366,height:1024}]){await page.setViewportSize(size);
 const fit=await page.evaluate(()=>{const b=(q:string)=>document.querySelector(q)!.getBoundingClientRect(),g=b('#ultimate-meter'),u=b('#ultimate'),m=b('#menu'),s=b('#screen'),f=b('footer');return {above:g.bottom<=u.top+1,separate:u.bottom<=m.top+1,inPaper:g.top>=f.top&&m.bottom<=f.bottom,offScreen:g.top>=s.bottom-1}});expect(fit).toEqual({above:true,separate:true,inPaper:true,offScreen:true});
 await page.screenshot({path:`validation-results/v5/gauge-${size.width}-${test.info().project.name}.png`});}
 await expect(page.locator('#ultimate')).toBeEnabled();await page.locator('#ultimate').click();await expect(page.locator('#ultimate-meter')).toHaveAttribute('aria-valuenow','0');await expect(page.locator('#ultimate')).toBeHidden();
});
for(const kind of ['mini-card','clear-card'] as const)test(`${kind} confirmation removes all previews immediately and applies once`,async({page})=>{
 await fixture(page,kind);await page.locator('[data-card="basic"]').click();await page.getByRole('button',{name:'크게 보기',exact:true}).click();
 await page.evaluate(()=>{(window as any).replayedPreview=false;new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n instanceof Element&&(n.matches('.card-preview')||n.querySelector('.card-preview')))(window as any).replayedPreview=true;}).observe(document.querySelector('#overlay')!,{childList:true,subtree:true});});
 await page.locator('#detail-pick').click();await expect(page.locator('#game')).toHaveAttribute('data-mode',kind==='mini-card'?'playing':'clear');await expect(page.locator('#overlay .card-preview')).toHaveCount(0);await expect(page.locator('dialog')).not.toBeVisible();await expect(page.locator('.applied-paper strong')).toHaveText('세 줄 총알');
 await page.waitForTimeout(600);expect(await page.evaluate(()=>(window as any).replayedPreview)).toBe(false);const s=await stored(page);expect(s.run.growth.basic).toBe(1);expect(s.run.reward.status).toBe('done');expect(s.run.claimedRewards).toHaveLength(1);
 if(kind==='clear-card'){await expect(page.getByRole('button',{name:'다음 스테이지',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'기체 바꾸기',exact:true})).toBeVisible();}
 await page.reload();await page.getByRole('button',{name:'이어하기',exact:true}).click();expect((await stored(page)).run.growth.basic).toBe(1);await expect(page.locator('#overlay .card-preview')).toHaveCount(0);
});
test('miniboss explosion pauses and resumes before the same-stage card without stage clear',async({page})=>{
 await fixture(page,'mini-death');await page.locator('#menu').click();await expect(page.locator('dialog')).toBeVisible();const before=await stored(page);expect(before.run.bossDefeat.kind).toBe('mini');await page.waitForTimeout(400);expect((await stored(page)).run.bossDefeat.elapsed).toBe(before.run.bossDefeat.elapsed);expect(before.run.reward).toBeNull();expect(before.gems).toEqual([]);
 await page.getByRole('button',{name:'계속 비행',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('data-mode','cards',{timeout:5000});const after=await stored(page);expect(after.run.reward.kind).toBe('mini');expect(after.run.phase).toBe(2);expect(after.gems).toEqual([]);expect(after.completions).toBe(0);await expect(page.locator('.clear-cinematic')).toHaveCount(0);
});
test('boss explosion and ship ascent restore before clear, with one reward',async({page})=>{
 await fixture(page,'boss-death');await page.locator('#menu').click();await expect(page.locator('dialog')).toBeVisible();const first=await stored(page);expect(first.run.bossDefeat.kind).toBe('boss');expect(first.run.adventureScore).toBe(500);expect(first.gems).toEqual([]);
 await page.reload();await page.getByRole('button',{name:'이어하기',exact:true}).click();
 await expect.poll(async()=>{const s=await stored(page);return s.run.bossDefeat?.elapsed??99;},{intervals:[30],timeout:5000}).toBeGreaterThan(1.35);
 await page.locator('#menu').click();await expect(page.locator('dialog')).toBeVisible();const ascent=await stored(page);expect(ascent.run.bossDefeat.elapsed).toBeLessThan(2);expect(ascent.run.y).toBeLessThan(first.run.y);expect(ascent.gems).toEqual([]);await page.screenshot({path:`validation-results/v5/boss-ascent-${test.info().project.name}.png`});
 await page.reload();await page.getByRole('button',{name:'이어하기',exact:true}).click();await expect(page.locator('.clear-cinematic')).toBeVisible({timeout:5000});await expect(page.locator('.clear-cinematic .eyebrow')).toHaveText('STAGE 4 CLEAR');await expect(page.locator('#game')).toHaveAttribute('data-mode','cards',{timeout:6000});
 const done=await stored(page);expect(done.run.adventureScore).toBe(500);expect(done.points).toBe(500);expect(done.gems).toEqual([4]);expect(done.run.y).toBeLessThan(0);expect(done.run.reward.kind).toBe('clear');
});
test('card application text and particles pause on the same saved clock',async({page})=>{
 await fixture(page,'mini-card');await page.locator('[data-card="basic"]').click();await page.getByRole('button',{name:'이걸로 할래!',exact:true}).click();await page.locator('#menu').click();await expect(page.locator('dialog')).toBeVisible();
 const before=await stored(page),style=await page.locator('.applied-paper').getAttribute('style');expect(before.run.cardApply.remaining).toBeGreaterThan(0);
 await page.waitForTimeout(650);expect((await stored(page)).run.cardApply.remaining).toBe(before.run.cardApply.remaining);expect(await page.locator('.applied-paper').getAttribute('style')).toBe(style);
 await page.getByRole('button',{name:'계속 비행',exact:true}).click();await expect(page.locator('.card-apply')).toBeHidden({timeout:3000});await expect(page.locator('#game')).toHaveAttribute('data-mode','playing');
});
test('preparation ignores held keyboard and joystick input until a fresh gesture',async({page})=>{
 await fixture(page,'meter',50);await expect(page.locator('[data-action="gun"]')).toBeDisabled();const before=await stored(page);
 await page.keyboard.down('ArrowRight');await page.mouse.move(150,520);await page.mouse.down();await page.mouse.move(230,520);await expect(page.locator('#joystick')).toBeHidden();
 await expect(page.locator('[data-action="gun"]')).toBeEnabled({timeout:4000});await page.waitForTimeout(600);expect((await stored(page)).run.x).toBe(before.run.x);
 await page.mouse.up();await page.keyboard.up('ArrowRight');await page.mouse.move(150,520);await page.mouse.down();await page.mouse.move(230,520);await expect(page.locator('#joystick')).toBeVisible();await page.waitForTimeout(600);expect((await stored(page)).run.x).toBeGreaterThan(before.run.x);await page.mouse.up();
});

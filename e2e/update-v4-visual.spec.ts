import {test,expect,type BrowserContext,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {initialSave,newRun,aircraft,type Save} from '../src/data';
import {Engine} from '../src/engine';
import {offerReward} from '../src/cards';
import {growthCaps,ultimateFor} from '../src/arsenal';
import {KEY} from '../src/storage';

// Desktop browser evidence, not physical-iPad or balance evidence. The frozen,
// durable targets deliberately keep the attack silhouettes visible after impact.
const epoch=new Date('2026-10-11T03:00:00Z');
function visualSave(craft:string):Save {
 const save=initialSave();save.gems=[1,2,3,4,5,6,7,8,9,10];save.remaining=600;save.music=save.sfx=0;
 const r=save.run=newRun(4,craft);r.mode='playing';r.phase=1;r.auto=false;r.invuln=999;r.x=500;r.y=490;
 r.growth={...growthCaps};r.ultimate={charge:100,pending:false,level:2};r.supply.clock=999;r.encounter.support=999;
 const engine=new Engine(r);
 for(const y of [100,200,300])for(const x of [260,380,500,620,740]){
  engine.add('small',x);const e=r.enemies.at(-1)!;
  Object.assign(e,{x,originX:x,y,hp:2000,max:2000,frozen:999,fire:999,shooter:false,drift:0});
 }
 return save;
}
async function visualPage(context:BrowserContext,save:Save,failures:string[]) {
 const page=await context.newPage();await page.setViewportSize({width:1194,height:834});
 page.on('pageerror',e=>failures.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.startsWith('/assets/'))failures.push(`${r.status()} ${r.url()}`);});
 await page.clock.resume();
 await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key:KEY,save});
 await page.goto('/');
 await expect(page.getByRole('button',{name:'이어하기',exact:true})).toBeVisible();
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 return page;
}
async function imageIntegrity(page:Page) {
 const broken=await page.locator('img:visible').evaluateAll(async images=>{
  await Promise.all(images.map(i=>(i as HTMLImageElement).decode().catch(()=>{})));
  return images.filter(i=>!(i as HTMLImageElement).naturalWidth).map(i=>(i as HTMLImageElement).src);
 });
 expect(broken,'Visible portraits, medals, and card art must decode').toEqual([]);
}
async function snapshot(page:Page,path:string){await imageIntegrity(page);await page.screenshot({path,animations:'disabled'});}
async function durableState(page:Page) {
 // Exercise the application's existing lifecycle save path, without reaching
 // into its engine or changing its combat state.
 return page.evaluate(key=>{window.dispatchEvent(new Event('pagehide'));return JSON.parse(localStorage.getItem(key)!);},KEY);
}

test('final ultimate silhouettes and late upgrade comparisons — desktop visual evidence',async({context},info)=>{
 test.setTimeout(180_000);
 await context.clock.install({time:epoch});
 const dir=`validation-results/v4-visual/${info.project.name}`;mkdirSync(dir,{recursive:true});
 const failures:string[]=[],evidence:Record<string,unknown>[]=[];
 for(const craft of aircraft){
  const page=await visualPage(context,visualSave(craft.id),failures);
  await page.getByRole('button',{name:'이어하기',exact:true}).click({force:true});
  await expect(page.locator('#game')).toHaveAttribute('data-mode','playing');
  await page.clock.runFor(2112); // Existing resume preparation completes first.
  await expect(page.locator('#ultimate')).toBeVisible();
  await page.locator('#ultimate').click({force:true});
  await expect(page.locator('.ultimate-cinematic h1')).toHaveText(ultimateFor(craft.id).name);
  await page.clock.runFor(192);
  await snapshot(page,`${dir}/${craft.id}-cutin.png`);
  const cut=await durableState(page);
  expect(cut.run.ultimate).toMatchObject({charge:0,pending:true,level:2});
  expect(cut.run.cinematic.remaining).toBeGreaterThan(0);
  expect(cut.run.groups.filter((g:any)=>g.source==='ultimate')).toHaveLength(0);
  await page.clock.runFor(832); // 1.024 s total: logic releases the real attack.
  await expect(page.locator('.ultimate-cinematic')).toHaveCount(0);
  await expect(page.locator('#overlay')).toBeEmpty();
  await page.clock.runFor(400);
  await snapshot(page,`${dir}/${craft.id}-attack-040.png`);
  const early=await durableState(page);
  await page.clock.runFor(496);
  await snapshot(page,`${dir}/${craft.id}-attack-090.png`);
  const late=await durableState(page);
  expect(late.run.ultimate).toMatchObject({charge:0,pending:false});
  await expect(page.locator('#ultimate')).toBeHidden();
  const groups=late.run.groups.filter((g:any)=>g.source==='ultimate');
  expect(groups,'One UI activation creates one shared damage group').toHaveLength(1);
  expect(groups[0].id).toBe(early.run.groups.find((g:any)=>g.source==='ultimate').id);
  for(const damage of Object.values(groups[0].hits))expect(Number(damage)).toBeLessThanOrEqual(76.00001);
  expect(late.run.adventureScore).toBe(0);expect(late.points).toBe(0);
  expect(late.run.enemies).toHaveLength(15);
  evidence.push({craft:craft.id,name:ultimateFor(craft.id).name,source:'real UI activation',targetFixture:'15 stationary enemies, 2000 HP; blue freeze appearance is fixture-only',charge:late.run.ultimate.charge,group:groups[0].id,attacksAt040:early.run.attacks.length,attacksAt090:late.run.attacks.length,maxDamage:Math.max(0,...Object.values(groups[0].hits).map(Number))});
  await page.close();
 }
 for(const craft of ['6','7']){
  const save=visualSave(craft),r=save.run!;r.ultimate.charge=0;r.growth.ultimate=1;
  offerReward(r,'mini');r.cards=['ultimate'];
  const page=await visualPage(context,save,failures);
  await page.getByRole('button',{name:'이어하기',exact:true}).click({force:true});
  await expect(page.locator('#game')).toHaveAttribute('data-mode','cards');
  await page.locator('[data-card="ultimate"]').click({force:true});
  await page.getByRole('button',{name:'크게 보기',exact:true}).click({force:true});
  await page.clock.runFor(896);
  await snapshot(page,`${dir}/${craft}-card-comparison-090.png`);
  const frames=await page.locator('.card-detail canvas').evaluateAll(canvases=>canvases.map(c=>(c as HTMLCanvasElement).toDataURL()));
  expect(frames).toHaveLength(2);expect(frames[0],'Before/after must visibly differ after the descendants appear').not.toBe(frames[1]);
  await page.clock.runFor(496);
  await snapshot(page,`${dir}/${craft}-card-comparison-140.png`);
  const state=await durableState(page);expect(state.run.growth.ultimate).toBe(1);expect(state.run.reward.status).toBe('offered');
  // Inspect the same craft's base ability through the actual selection tabs.
  await page.getByRole('button',{name:'다른 카드도 볼래',exact:true}).click({force:true});
  await page.locator('#menu').click({force:true});
  await page.getByRole('button',{name:'처음 화면',exact:true}).click({force:true});
  await page.getByRole('button',{name:'새로 출격',exact:true}).click({force:true});
  for(let i=0;i<(craft==='6'?2:3);i++)await page.locator('[data-action="gun"]').click({force:true});
  await page.locator('[data-ability="ultimate"]').click({force:true});
  await expect(page.locator('.selection-weapons h2')).toHaveText(ultimateFor(craft).name);
  // Wait for an actual painted preview; network-idle cannot settle reliably
  // while the browser clock is paused and the service worker prepares assets.
  await expect.poll(async()=>{await page.clock.runFor(16);return page.locator('.ability-canvas').evaluate(c=>(c as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,1,1).data[3]);}).toBe(255);
  await page.clock.runFor(880);
  await snapshot(page,`${dir}/${craft}-selection-ultimate-090.png`);
  await page.close();
 }
 expect(failures,'No browser exception or missing runtime art is acceptable').toEqual([]);
 writeFileSync(`${dir}/evidence.json`,JSON.stringify({device:'Desktop automated browser; not physical iPad',timing:'Paused browser clock, 16 ms battle steps; 0.4/0.9 s captures are within one animation frame of the logical launch. CSS transitions are completed for stable screenshot poses; Canvas combat is not fast-forwarded by screenshot capture.',evidence},null,2));
});

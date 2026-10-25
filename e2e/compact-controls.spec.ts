import {test,expect} from '@playwright/test';
import {initialSave,newRun} from '../src/data';
test('compact panel grows combat area and keeps charged controls separate and inside paper',async({page})=>{
 const saved=initialSave();saved.run=newRun(6,'4');saved.run.mode='playing';saved.run.ultimate.charge=100;
 await page.addInitScript(saved=>{localStorage.setItem('yujun-paper-flight-v1',JSON.stringify(saved));Object.defineProperty(navigator,'platform',{value:'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{value:5});Object.defineProperty(navigator,'standalone',{value:true})},saved);
 await page.goto('/');await page.getByRole('button',{name:'이어하기',exact:true}).click();await expect(page.locator('#ultimate')).toBeVisible();
 for(const size of [{width:1194,height:800},{width:1024,height:768},{width:844,height:390}]){
  await page.setViewportSize(size);
  await expect.poll(()=>page.evaluate(()=>Math.round(document.querySelector('#game')!.getBoundingClientRect().bottom))).toBe(size.height);
  const result=await page.evaluate(async()=>{
   const rect=(s:string)=>{const r=document.querySelector(s)!.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,width:r.width}};
   return {game:rect('#game'),screen:rect('#screen'),panel:rect('footer'),meter:rect('#ultimate-meter'),ultimate:rect('#ultimate'),menu:rect('#menu'),actions:[...document.querySelectorAll('.action')].map(a=>({height:a.getBoundingClientRect().height,overflow:a.scrollHeight>a.clientHeight+1})),copy:[...document.querySelectorAll('.action span,.action b')].map(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom}))};
  });
  expect(result.game.bottom).toBeLessThanOrEqual(size.height+.5);
  expect(result.screen.bottom).toBeLessThanOrEqual(result.panel.top+.5);
  expect(result.game.bottom-result.panel.bottom).toBeGreaterThanOrEqual(5.5);
  expect(result.game.bottom-result.panel.bottom).toBeLessThanOrEqual(14.5);
  expect(result.meter.top).toBeGreaterThanOrEqual(result.panel.top-.5);
  expect(result.meter.bottom).toBeLessThanOrEqual(result.ultimate.top+.5);
  expect(result.ultimate.bottom).toBeLessThanOrEqual(result.menu.top+.5);
  expect(result.menu.bottom).toBeLessThanOrEqual(result.panel.bottom+.5);
  expect(result.menu.height).toBeGreaterThanOrEqual(44);expect(result.ultimate.height).toBeGreaterThanOrEqual(44);
  for(const a of result.actions){expect(a.height).toBeGreaterThanOrEqual(44);expect(a.overflow).toBe(false)}
  for(const c of result.copy){expect(c.top).toBeGreaterThanOrEqual(result.panel.top-.5);expect(c.bottom).toBeLessThanOrEqual(result.panel.bottom+.5)}
  if(size.width>1000){expect(result.panel.height/result.game.height).toBeLessThan(.21);expect(result.screen.height/result.game.height).toBeGreaterThan(.71)}
  await page.screenshot({path:`test-results/compact-${size.width}-${test.info().project.name}.png`});
 }
});

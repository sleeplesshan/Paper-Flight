import {test,expect,type Page} from '@playwright/test';
import {initialSave,newRun} from '../src/data';
const KEY='yujun-paper-flight-v1';
async function seed(page:Page){const s=initialSave();s.music=s.sfx=0;s.remaining=300;const r=s.run=newRun(1,'3');r.mode='playing';r.phase=1;r.spawn=999;r.invuln=999;r.ultimate.charge=100;
 await page.addInitScript(({key,s})=>{localStorage.setItem(key,JSON.stringify(s));const original=Storage.prototype.setItem;(window as any).auditQuota=false;Storage.prototype.setItem=function(k,v){if(k===key&&(window as any).auditQuota)throw new DOMException('audit','QuotaExceededError');return original.call(this,k,v)};},{key:KEY,s});
 await page.goto('/');await page.getByRole('button',{name:'이어하기',exact:true}).click();await expect(page.locator('#ultimate')).toBeEnabled();
}
const disabled=()=>[...document.querySelectorAll<HTMLButtonElement>('.action,#ultimate')].map(b=>b.disabled);
test('opening a modal disables every attack immediately, then preparation keeps them blocked',async({page})=>{
 await seed(page);const state=await page.evaluate(()=>{(document.querySelector('#settings') as HTMLButtonElement).click();return [...document.querySelectorAll<HTMLButtonElement>('.action,#ultimate')].map(b=>b.disabled)});expect(state).toEqual([true,true,true,true]);
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();expect(await page.evaluate(disabled)).toEqual([true,true,true,true]);await expect(page.locator('#ultimate')).toBeEnabled();expect(await page.evaluate(disabled)).toEqual([false,false,false,false]);
});
test('storage failure disables attacks before replacing a dialog and restores them only after retry',async({page})=>{
 await seed(page);const state=await page.evaluate(()=>{(window as any).auditQuota=true;(document.querySelector('#settings') as HTMLButtonElement).click();return [...document.querySelectorAll<HTMLButtonElement>('.action,#ultimate')].map(b=>b.disabled)});expect(state).toEqual([true,true,true,true]);await expect(page.locator('#retry-save')).toBeVisible();
 await page.evaluate(()=>{(document.querySelector('[data-action="gun"]') as HTMLButtonElement).click();(window as any).auditQuota=false;});await page.locator('#retry-save').click();await expect(page.locator('#ultimate')).toBeEnabled();await page.locator('#menu').click();const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),KEY);expect(saved.run.auto).toBe(false);expect(saved.run.ultimate.charge).toBe(100);
});
test('portrait blocks all attack controls and returning to landscape keeps a fresh preparation',async({page})=>{
 await seed(page);await page.setViewportSize({width:700,height:1000});await expect(page.locator('#rotate')).toBeVisible();
 // WebKit paints CSS orientation before dispatching the MediaQueryList change.
 await expect.poll(()=>page.evaluate(disabled),{timeout:1000}).toEqual([true,true,true,true]);
 await page.setViewportSize({width:1194,height:834});await expect(page.locator('#rotate')).toBeHidden();
 await expect.poll(()=>page.evaluate(disabled),{timeout:1000}).toEqual([true,true,true,true]);await expect(page.locator('#ultimate')).toBeEnabled();
});

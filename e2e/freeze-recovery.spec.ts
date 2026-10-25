import {test,expect,type Page} from '@playwright/test';
import {initialSave,newRun} from '../src/data';
import {Engine} from '../src/engine';
const KEY='yujun-paper-flight-v1';
async function resume(page:Page,fire:number){
 const s=initialSave(),r=s.run=newRun(6,'1');s.gems=[1,2,3,4,5];s.points=7850;s.remaining=268;s.music=s.sfx=0;
 Object.assign(r,{mode:'playing',phase:0,phaseTime:10,spawn:999,invuln:999,auto:false,adventureScore:7850,creditedScore:7850});r.ultimate.charge=100;
 const e=new Engine(r);e.add('small',350);Object.assign(r.enemies[0],{y:-200,fire,shooter:true,variant:0});
 await page.addInitScript(({s,key})=>{if(!sessionStorage.getItem('freeze-seed')){localStorage.setItem(key,JSON.stringify(s));sessionStorage.setItem('freeze-seed','1');}},{s,key:KEY});
 await page.goto('/');await page.getByRole('button',{name:'이어하기',exact:true}).click();
}
const snapshot=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),KEY);
test('saved overdue offscreen enemy does not freeze preparation, ship rendering or resume',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await resume(page,-1.2);
 await expect(page.locator('[data-action="gun"]')).toBeEnabled({timeout:5000});
 const before=await snapshot(page);await expect.poll(async()=>(await snapshot(page)).run.time).toBeGreaterThan(before.run.time+.3);
 await page.locator('#menu').click();await page.getByRole('button',{name:'계속 비행',exact:true}).click();await expect(page.locator('[data-action="gun"]')).toBeEnabled();
 await page.reload();await page.getByRole('button',{name:'이어하기',exact:true}).click();await expect(page.locator('[data-action="gun"]')).toBeEnabled();
 expect(errors).toEqual([]);const after=await snapshot(page);expect(after.points).toBe(7850);expect(after.gems).toEqual([1,2,3,4,5]);expect(after.run.craft).toBe('1');
});
test('offscreen shooter enters with a visible warning instead of an overdue shot',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await resume(page,.1);
 await expect(page.locator('[data-action="gun"]')).toBeEnabled();await page.waitForTimeout(4500);
 expect(errors).toEqual([]);expect((await snapshot(page)).run.time).toBeGreaterThan(3);
});
test('one failed drawing frame cannot strand the animation loop or menu resume',async({page})=>{
 await resume(page,5);await expect(page.locator('[data-action="gun"]')).toBeEnabled();
 const before=await snapshot(page);
 await page.evaluate(()=>{const original=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args:any[]){CanvasRenderingContext2D.prototype.drawImage=original;throw new Error('injected one-frame drawing failure');};});
 await expect.poll(async()=>(await snapshot(page)).run.time).toBeGreaterThan(before.run.time+.5);
 await page.locator('#menu').click();await page.getByRole('button',{name:'계속 비행',exact:true}).click();await expect(page.locator('[data-action="gun"]')).toBeEnabled();
 const after=await snapshot(page);await expect.poll(async()=>(await snapshot(page)).run.time).toBeGreaterThan(after.run.time+.3);
});

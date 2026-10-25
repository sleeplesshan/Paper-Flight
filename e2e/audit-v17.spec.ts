import {test,expect} from '@playwright/test';
import {initialSave,newRun} from '../src/data';
const KEY='yujun-paper-flight-v1';

test('common friend/shield materials and five interface cues preload and decode',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'출격하기',exact:true})).toBeVisible();
 const result=await page.evaluate(async()=>{
  const {AudioManager}=await import('/src/audio.ts' as string),a=new AudioManager() as any;
  a.unlock();a.pause(true);a.prepare('7');
  const keys=['pop-pencil-hit','pop-wind-hit','ui-confirm','ui-back','ui-toggle-on','ui-toggle-off','ui-unavailable'];
  for(let i=0;i<80&&keys.some(k=>!a.buffers.has(k));i++)await new Promise(r=>setTimeout(r,50));
  const values=keys.map(k=>{const b=a.buffers.get(k) as AudioBuffer|undefined;let peak=0;if(b)for(const v of b.getChannelData(0))peak=Math.max(peak,Math.abs(v));return {key:k,duration:b?.duration??0,peak};});
  a.music.pause();await a.context.close();return values;
 });
 for(const cue of result){expect(cue.duration,cue.key).toBeGreaterThan(.025);expect(cue.duration,cue.key).toBeLessThan(.6);expect(cue.peak,cue.key).toBeGreaterThan(.01);expect(cue.peak,cue.key).toBeLessThan(1);}
});

test('ultimate portrait follows saved time and stays still behind pause',async({page})=>{
 const save=initialSave();save.music=save.sfx=0;save.remaining=600;save.run=newRun(2,'3');
 Object.assign(save.run,{mode:'playing',phase:1,spawn:999,invuln:999});
 save.run.cinematic={kind:'ultimate',duration:1,remaining:.75};save.run.ultimate.pending=true;
 await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key:KEY,save});
 await page.goto('/');await page.getByRole('button',{name:'이어하기',exact:true}).click();
 await expect(page.locator('.ultimate-profile')).toBeVisible();await page.locator('#menu').click();
 const style=await page.locator('.ultimate-profile').getAttribute('style');
 await page.waitForTimeout(500);expect(await page.locator('.ultimate-profile').getAttribute('style')).toBe(style);
 await page.getByRole('button',{name:'계속 비행',exact:true}).click();
 await expect(page.locator('.ultimate-cinematic')).toBeHidden({timeout:5000});
});

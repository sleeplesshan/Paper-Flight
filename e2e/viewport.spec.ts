import {test,expect} from '@playwright/test';
test('paper fills landscape viewport through resizing and return from background',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'출격하기',exact:true}).waitFor();
 await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveCount(0);
 await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveCount(0);
 await expect(page.locator('#game')).toHaveCSS('filter','none');
 await expect(page.locator('body')).toHaveCSS('background-image','none');
 for(const size of [{width:1194,height:834},{width:1194,height:780},{width:1024,height:768},{width:834,height:1194},{width:1194,height:834}]){
  await page.setViewportSize(size);
  await expect.poll(()=>page.evaluate(()=>{const r=document.querySelector('#game')!.getBoundingClientRect();return {width:Math.round(r.width),bottom:Math.round(r.bottom)}})).toEqual({width:size.width,bottom:size.height});
 }
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 const bounds=await page.evaluate(()=>{const r=document.querySelector('header')!.getBoundingClientRect();return {top:r.top,bottom:r.bottom}});
 expect(bounds.top).toBeGreaterThanOrEqual(0);expect(bounds.bottom).toBeLessThan(834);
 await page.screenshot({path:`test-results/viewport-${test.info().project.name}.png`});
});
test('safe top and visual viewport offsets are not double-counted; bottom stays filled',async({page})=>{
 await page.addInitScript(()=>{
  const vv=Object.assign(new EventTarget(),{width:1194,height:834,offsetTop:0,offsetLeft:0,scale:1});
  Object.defineProperty(window,'visualViewport',{value:vv,configurable:true});(window as any).__viewport=vv;
 });
 await page.setViewportSize({width:1194,height:834});await page.goto('/');await page.getByRole('button',{name:'출격하기',exact:true}).waitFor();
 await page.evaluate(()=>document.documentElement.style.setProperty('--safe-top','44px'));
 await expect.poll(()=>page.evaluate(()=>Math.round(document.querySelector('#game')!.getBoundingClientRect().top))).toBe(44);
 for(const v of [{height:790,offsetTop:44},{height:530,offsetTop:80},{height:834,offsetTop:0}]){
  await page.evaluate(v=>{Object.assign((window as any).__viewport,v);(window as any).__viewport.dispatchEvent(new Event('resize'));(window as any).__viewport.dispatchEvent(new Event('scroll'))},v);
  await expect.poll(()=>page.evaluate(()=>{const r=document.querySelector('#game')!.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom)}})).toEqual({top:Math.max(44,v.offsetTop),bottom:v.height+v.offsetTop});
  const h=await page.locator('#game>header').boundingBox();expect(h!.y).toBeGreaterThanOrEqual(Math.max(44,v.offsetTop));
 }
 await page.getByRole('button',{name:'출격하기',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('data-mode','select');
 await page.locator('#menu').click();await expect(page.locator('#game')).toHaveAttribute('data-mode','start');
});
test('installed iPad keeps its complete frame within the visible area even when legacy vh is taller',async({page})=>{
 await page.setViewportSize({width:1194,height:834});
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'platform',{value:'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{value:5});Object.defineProperty(navigator,'standalone',{value:true});
  Object.defineProperty(window,'innerHeight',{get:()=>800});
  const vv=Object.assign(new EventTarget(),{width:1194,height:800,offsetTop:0,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{value:vv});(window as any).__viewport=vv;
 });
 await page.goto('/');await page.getByRole('button',{name:'출격하기',exact:true}).waitFor();
 await page.evaluate(()=>{Object.defineProperty(document.documentElement,'clientHeight',{get:()=>800});(window as any).__viewport.dispatchEvent(new Event('resize'))});
 await expect(page.locator('html')).toHaveClass(/apple-installed/);
 const bounds=()=>page.evaluate(()=>{const r=document.querySelector('#game')!.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom)}});
 await expect.poll(bounds).toEqual({top:32,bottom:800});
 const header=await page.locator('#game>header').boundingBox();expect(header!.y).toBeGreaterThanOrEqual(32);expect(header!.y).toBeLessThan(40);
 // A real editable field must still fit the smaller keyboard viewport.
 await page.locator('#timer').click();await page.locator('#pin').focus();
 await page.evaluate(()=>{(window as any).__viewport.height=500;(window as any).__viewport.dispatchEvent(new Event('resize'))});
 await expect.poll(bounds).toEqual({top:32,bottom:500});
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 await page.evaluate(()=>{(window as any).__viewport.height=800;(window as any).__viewport.dispatchEvent(new Event('resize'))});
 await expect.poll(bounds).toEqual({top:32,bottom:800});
 await page.screenshot({path:`test-results/ipad-installed-${test.info().project.name}.png`});
});
test('installed iPad intersects stale visual bounds and settles after returning without another resize',async({page})=>{
 await page.setViewportSize({width:1194,height:834});
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'platform',{value:'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{value:5});Object.defineProperty(navigator,'standalone',{value:true});
  (window as any).__layoutHeight=800;
  Object.defineProperty(window,'innerHeight',{get:()=>(window as any).__layoutHeight});
  const vv=Object.assign(new EventTarget(),{width:1194,height:834,offsetTop:0,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{value:vv});
 });
 await page.goto('/');await page.getByRole('button',{name:'출격하기',exact:true}).waitFor();
 await expect(page.locator('#fullscreen-toggle')).toHaveCount(0);
 const bounds=()=>page.evaluate(()=>{const r=document.querySelector('#game')!.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom)}});
 await expect.poll(bounds).toEqual({top:32,bottom:800});
 await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));setTimeout(()=>{(window as any).__layoutHeight=780},60)});
 await expect.poll(bounds).toEqual({top:32,bottom:780});
 const footer=await page.locator('#game>footer').boundingBox();expect(footer!.y+footer!.height).toBeLessThan(780);
 await page.screenshot({path:`test-results/ipad-v18-${test.info().project.name}.png`});
});
test('installed frame fills dynamic shell while controls remain above the smaller visible boundary',async({page})=>{
 await page.setViewportSize({width:1194,height:834});
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'platform',{value:'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{value:5});Object.defineProperty(navigator,'standalone',{value:true});
  Object.defineProperty(window,'innerHeight',{get:()=>800});
  const vv=Object.assign(new EventTarget(),{width:1194,height:800,offsetTop:0,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{value:vv});
 });
 await page.goto('/');await page.getByRole('button',{name:'출격하기',exact:true}).waitFor();
 await expect.poll(()=>page.evaluate(()=>{const game=document.querySelector('#game')!;const r=game.getBoundingClientRect();const s=getComputedStyle(game,'::before');return {top:Math.round(r.top),frameBottom:Math.round(r.top+parseFloat(s.height)),controlsBottom:Math.round(document.querySelector('#actions')!.getBoundingClientRect().bottom)}})).toMatchObject({top:32,frameBottom:834});
 const actions=await page.locator('#actions').boundingBox();expect(actions!.y+actions!.height).toBeLessThan(800);
 await expect.poll(()=>page.evaluate(()=>Math.round(document.body.getBoundingClientRect().height))).toBe(834);
 await expect(page.locator('meta[name=application-version]')).toHaveAttribute('content','23');
 await page.screenshot({path:`test-results/frame-fill-v22-${test.info().project.name}.png`});
 await page.locator('#timer').click();await page.locator('#pin').focus();
 await expect(page.locator('html')).toHaveClass(/viewport-editing/);
 await expect.poll(()=>page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('#game')!,'::before').bottom))).toBe(0);
});

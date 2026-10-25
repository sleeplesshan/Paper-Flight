import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {test,expect} from '@playwright/test';
import {initialSave} from '../src/data';

test('old offline preview switches to live dev source without erasing game records',async({page})=>{
 let development=false;
 const oldHTML='<html><body><h1>old preview</h1><script>navigator.serviceWorker.register("/sw.js")</script></body></html>';
 const oldWorker=`self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open('paper-flight-old-preview');await c.put('/',new Response(${JSON.stringify(oldHTML)},{headers:{'Content-Type':'text/html'}}));await self.skipWaiting()})()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(caches.match('/'))});`;
 const devWorker=await readFile('public/sw.js','utf8');
 const server=createServer(async(req,res)=>{
  try{
   if(req.url==='/sw.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(development?devWorker:oldWorker);return}
   if(!development){res.writeHead(200,{'Content-Type':'text/html'});res.end(oldHTML);return}
   const response=await fetch('http://localhost:4173'+req.url);res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')||'application/octet-stream','Cache-Control':'no-store'});res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end()}
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 try{
  await page.goto(origin);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const fixture=initialSave();fixture.gems=[1,2];fixture.points=321;
  await page.evaluate(async save=>{localStorage.setItem('yujun-paper-flight-v1',JSON.stringify(save));const other=await caches.open('unrelated-test-cache');await other.put('/other',new Response('keep'));},fixture);
  await page.reload();await expect(page.locator('h1')).toHaveText('old preview');
  development=true;
  await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration())!.update()});
  await expect(page.locator('#ultimate-meter')).toHaveCount(1,{timeout:45000});
  await expect(page.getByRole('button',{name:'출격하기',exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(async()=>({worker:!!(await navigator.serviceWorker.getRegistration()),caches:await caches.keys()}))).toEqual({worker:false,caches:['unrelated-test-cache']});
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('yujun-paper-flight-v1')!));expect(saved.gems).toEqual([1,2]);expect(saved.points).toBe(321);
  expect(await page.locator('script[src="/@vite/client"]').count()).toBe(1);
 }finally{server.closeAllConnections();server.close()}
});

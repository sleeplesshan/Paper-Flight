import {test,expect} from '@playwright/test';

test('all eight aircraft resume, load manifest frames, move and fire without drawing errors',async({page})=>{
 test.setTimeout(90000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const craft=new URL(location.href).searchParams.get('craft')||'3';
  localStorage.setItem('yujun-paper-flight-v1',JSON.stringify({version:1,gems:[1,2,3,4,5,6,7,8,9,10],points:0,reached:10,remaining:500,music:0,sfx:0,lastReward:null,
   run:{id:'sprite-qa',stage:1,craft,mode:'playing',time:0,phase:0,phaseTime:0,spawn:99,shot:0,auto:false,hearts:10,fire:3,ice:3,x:500,y:450,invuln:3,enemies:[],bullets:[],bombs:[],capsules:[],effects:[],seed:1,nextId:1,kills:0,transition:0,rewarded:false}}));
  (window as any).playerDraws=0;
  const draw=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(...args:any[]){
   const source=args[0];if(source instanceof HTMLCanvasElement&&source.width===184&&source.height===184&&args.length===5&&args[3]===92&&args[4]===92)(window as any).playerDraws++;
   return (draw as any).apply(this,args);
  };
 });
 for(const craft of ['1','2','3','4','5','6','6b','7']){
  await page.goto(`/?craft=${craft}`);await page.getByRole('button',{name:'이어하기',exact:true}).click();
  await expect(page.locator('#game')).toHaveAttribute('data-mode','playing');
  await page.waitForTimeout(2600);
  const metadata=await page.evaluate(async id=>{
   const im=new Image();im.src=`/assets/players/${id}-sheet.webp`;await im.decode();
   const m=await fetch(`/assets/players/${id}-sheet.json`).then(r=>r.json());
   return {width:im.width,height:im.height,rows:Object.keys(m.frame_layout.rows),frames:Object.values(m.frame_layout.rows).map((r:any)=>r.length)};
  },craft);
  expect(metadata).toEqual({width:1024,height:768,rows:['idle','move_left','move_right'],frames:[4,4,4]});
  await page.locator('[data-action="gun"]').click();
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(250);await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');
  await page.locator('[data-action="ice"]').click();await page.waitForTimeout(600);
  const state=await page.evaluate(()=>({draws:(window as any).playerDraws,run:JSON.parse(localStorage.getItem('yujun-paper-flight-v1')!).run}));
  expect(state.draws).toBeGreaterThan(10);expect(state.run.craft).toBe(craft);expect(state.run.auto).toBe(true);expect(state.run.ice).toBe(2);expect(state.run.hearts).toBe(10);
  if(['1','2','5'].includes(craft))await page.screenshot({path:`test-results/sprite-${craft}-${test.info().project.name}.png`});
 }
 expect(errors).toEqual([]);
});

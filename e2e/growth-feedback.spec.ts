import {test,expect,type Page} from '@playwright/test';
import {initialSave,newRun} from '../src/data';import {offerReward} from '../src/cards';
const KEY='yujun-paper-flight-v1';
async function fixture(page:Page,tree=false){const s=initialSave();s.music=s.sfx=0;s.remaining=300;s.gems=[1,2,3,4,5,6,7,8,9,10];s.run=newRun(2,'7');s.run.growth.special1=tree?2:1;s.run.growth.special2=2;offerReward(s.run,'mini');s.run.cards=['special2','friend','special1'];await page.addInitScript(({key,s})=>{if(sessionStorage.getItem('growth-seed'))return;sessionStorage.setItem('growth-seed','1');localStorage.setItem(key,JSON.stringify(s))},{key:KEY,s});await page.goto('/');await page.getByRole('button',{name:'이어하기',exact:true}).click();await expect(page.locator('.upgrade-card')).toHaveCount(3);}
test('friend card content is centered and every glyph remains in its paper',async({page})=>{
 await page.setViewportSize({width:1092,height:764});await fixture(page);
 const layout=await page.locator('[data-card="friend"]').evaluate(card=>{
  const b=card.getBoundingClientRect(),parts=[...card.querySelectorAll(':scope>img,strong,:scope>span')].map(el=>el.getBoundingClientRect());
  return {center:(parts[0].top+parts.at(-1)!.bottom)/2,cardCenter:(b.top+b.bottom)/2,fit:parts.every(r=>r.top>b.top&&r.bottom<b.bottom),height:b.height};
 });expect(layout.fit).toBe(true);expect(Math.abs(layout.center-layout.cardCenter)).toBeLessThan(5);
 await page.screenshot({path:`test-results/growth-cards-${test.info().project.name}.png`});
});
for(const [track,tree] of [['special1',false],['special2',false],['special1',true]] as const)test(`${track}${tree?'-tree':''} preview shows distinct physical evolution`,async({page})=>{
 await fixture(page,tree);await page.locator(`[data-card="${track}"]`).click();await page.getByRole('button',{name:'크게 보기',exact:true}).click();
 await expect(page.locator('.card-detail-help')).toContainText(tree?'왕 나뭇잎 열두':track==='special1'?'옆 가지 여섯':'두 친구');
 // Draw a synchronized mid-attack frame using the identical combat and renderer.
 const result=await page.evaluate(async ({track,tree})=>{
  const {createPreviewPair}=await import('/src/preview-model.ts' as string),{draw,preload,attackAssetPaths}=await import('/src/render.ts' as string);
  const source=JSON.parse(localStorage.getItem('yujun-paper-flight-v1')!).run;
  // Native dialogs are in the top layer, above even the isolated proof canvas.
  document.querySelectorAll('dialog').forEach(d=>d.close());
  const {stages}=await import('/src/data.ts' as string);await preload([...attackAssetPaths(source.craft),stages[source.stage-1].background,`/assets/players/${source.craft}-sheet.webp`,...['small0','small1','mini'].map(k=>`/assets/enemies/${source.stage}-${k}.webp`)]);
  const pair=createPreviewPair(source,track),root=document.createElement('div');root.id='growth-proof';root.style.cssText='position:fixed;inset:0;background:#f9f5e8;z-index:100;padding:30px;display:flex;gap:20px;align-items:center';
  const canvases:HTMLCanvasElement[]=[],emittedLeaves=[0,0];
  for(const [i,e] of pair.entries()){
   // Count births: a real target can consume a leaf before the screenshot sample.
   const shot=e.combat.shot.bind(e.combat);e.combat.shot=(...args:any[])=>{const s=shot(...args);if(s.key==='leaf')emittedLeaves[i]++;return s};
   e.bomb(track==='special1'?'fire':'ice');for(let frame=0;frame<(tree?69:40);frame++)e.step(1/60,{x:0,y:0});
   const column=document.createElement('div');column.style.cssText='flex:1;min-width:0;text-align:center';const label=document.createElement('h2');label.textContent=i?'고르면 이렇게!':'지금';column.append(label);const c=document.createElement('canvas');c.width=1000;c.height=560;c.style.cssText='width:100%;height:auto';draw(c.getContext('2d')!,e.r,e.r.stage,0,true);column.append(c);root.append(column);canvases.push(c);
  }
  document.body.append(root);
  const pixels=canvases.map(c=>c.getContext('2d')!.getImageData(0,0,1000,560).data);let difference=0;for(let p=0;p<pixels[0].length;p+=4)if(Math.abs(pixels[0][p]-pixels[1][p])+Math.abs(pixels[0][p+1]-pixels[1][p+1])+Math.abs(pixels[0][p+2]-pixels[1][p+2])>35)difference++;
  return {difference,emittedLeaves:emittedLeaves[1],branchCount:pair[1].r.attacks.filter((s:any)=>s.child&&s.key==='root').length,logCount:pair[1].r.attacks.filter((s:any)=>s.key==='log').length,leafCount:pair[1].r.attacks.filter((s:any)=>s.key==='leaf').length};
 },{track,tree});
 expect(result.difference).toBeGreaterThan(10000);if(track==='special1')expect(result.branchCount).toBe(6);else expect(result.logCount).toBe(5);
 if(tree){expect(result.emittedLeaves).toBe(12);expect(result.leafCount).toBeGreaterThan(0);}
 await expect(page.locator('#growth-proof')).toBeVisible();
 await page.locator('#growth-proof').screenshot({path:`test-results/growth-${track}${tree?'-tree':''}-${test.info().project.name}.png`});
});
test('shields render at full opacity even while contact counterattacks are cooling down',async({page})=>{
 await fixture(page);const result=await page.evaluate(async()=>{
  const {draw,preload,attackAssetPaths}=await import('/src/render.ts' as string),{newRun}=await import('/src/data.ts' as string),{shieldPosition}=await import('/src/combat.ts' as string);
  const r=newRun(2,'7');r.mode='playing';r.growth.shield=1;r.shields=[.65,.65];await preload(attackAssetPaths(r.craft));const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=560;const ctx=canvas.getContext('2d')!;const alphas:number[]=[],positions=r.shields.map((_:number,i:number)=>shieldPosition(r,i)),original=ctx.drawImage.bind(ctx);
  // The artwork preserves its aspect ratio inside a 44px box. Identify each orbit by its center.
  ctx.drawImage=((...args:any[])=>{if(args.length===5&&Math.abs(Math.max(args[3],args[4])-44)<.01&&positions.some((p:any)=>Math.abs(args[1]+args[3]/2-p.x)<.01&&Math.abs(args[2]+args[4]/2-p.y)<.01))alphas.push(ctx.globalAlpha);(original as any)(...args)}) as typeof ctx.drawImage;
  draw(ctx,r,2,0,true);return alphas;
 });expect(result).toEqual([1,1]);
});

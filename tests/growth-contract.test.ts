import test from 'node:test';
import assert from 'node:assert/strict';
import {aircraft,type Enemy,type Run} from '../src/data';
import {Combat} from '../src/combat';
import {growthCaps,tracks,type Track} from '../src/arsenal';
import {castGrowth,growthRun,previewGrowth,runGrowthAudit,sampleGrowth} from '../scripts/check-growth';

function tick(r:Run,combat:Combat,frames:number){for(let frame=0;frame<frames;frame++){r.time+=1/60;combat.update(1/60);}}
function enemy(id:number,x:number,y:number):Enemy{return {id,x,y,hp:10000,max:10000,kind:'small',variant:0,t:0,fire:999,frozen:999,hit:0,originX:x,warning:0,targetX:x};}

test('all 152 growth transitions retain actual damage at near/far center and side lanes, improve an outcome, and keep caps',()=>{
 const audit=runGrowthAudit();
 assert.equal(audit.transitions,152);
 assert.equal(audit.comparisons,64896);
 assert.deepEqual(audit.regressions,[]);
 assert.equal(audit.capFailures,0);
 assert.equal(audit.previewRegressions,0);
 assert.ok(audit.rows.every(row=>Number(row.improved)>0),'Every transition must improve at least one measured outcome');
 assert.ok(audit.maxAttacks<=80,'A single fully evolved cast must remain bounded');
});

test('missile tiers retain the old straight lanes without spreading a fixed damage total thinner',()=>{
 for(const kind of ['small','mini','boss'] as const){let previous=0;for(let level=0;level<=3;level++){
  const sample=sampleGrowth('4','special2',level,500,150,kind).damage.at(-1)!;
  assert.ok(sample>=previous-1e-7,`${kind}/${level}: ${sample} < ${previous}`);previous=sample;
 }}
 const r=growthRun('4','special2',3),combat=new Combat(r);combat.special(1);
 const shots=[...r.attacks,...r.scheduled.map(item=>item.shot)];assert.equal(shots.length,8);
 for(const shot of shots){assert.equal(shot.vx,0);assert.equal(shot.vy,-520);assert.equal(shot.pierce,1);assert.equal(shot.radius,0);assert.equal(shot.style,'linear');assert.equal(shot.split,0);}
 assert.deepEqual(r.scheduled.map(item=>item.shot.x),[486,514]);
 assert.equal(previewGrowth('4','special2',3).kills[1],1);
});

test('final sound keeps the full rings and adds forward crescents',()=>{
 const r=growthRun('4','special1',3),combat=new Combat(r);combat.special(0);tick(r,combat,40);
 const waves=r.attacks.filter(shot=>shot.style==='wave');
 assert.ok(waves.some(shot=>!shot.behavior&&shot.vy===0));
 assert.ok(waves.some(shot=>shot.behavior==='curve'&&shot.vy<0));
 // The shared practice targets now survive the earlier damage tier.
 assert.deepEqual(previewGrowth('4','special1',3).kills,[0,3]);
});

test('rain curtain, fan piercers and vortex preserve inherited lanes when final flourishes appear',()=>{
 const rain=growthRun('6b','special2',3);new Combat(rain).special(1);
 const rainShots=[...rain.attacks,...rain.scheduled.map(item=>item.shot)];
 assert.equal(rainShots.filter(shot=>shot.vx===0&&shot.zig===0).length,15);
 assert.equal(rainShots.filter(shot=>shot.behavior==='curve').length,6);
 for(const craft of ['1','2','5','6']){const r=growthRun(craft,'special2',3);new Combat(r).special(1);
  const inherited=r.scheduled.filter(item=>item.due===.3&&item.shot.vx===0&&item.shot.y===415&&item.shot.pierce===3);
  assert.ok([460,500,540].every(x=>inherited.some(item=>item.shot.x===x)),`${craft}: old piercer missing`);
 }
 const vortex=growthRun('2','special1',3);new Combat(vortex).special(0);
 assert.deepEqual(vortex.attacks.map(shot=>shot.x),[500,480,520]);
 assert.ok(vortex.scheduled.some(item=>item.shot.x===500&&!item.shot.behavior));
 assert.equal(vortex.scheduled.filter(item=>item.shot.behavior==='helix').length,2);
});

test('triangle friends retain both side trajectories and cadence, adding a separate crossing aircraft',()=>{
 for(const craft of aircraft){assert.ok(previewGrowth(craft.id,'friend',4).kills[1]>=previewGrowth(craft.id,'friend',4).kills[0]);}
 const r=growthRun('3','friend',4),combat=new Combat(r);r.auto=true;tick(r,combat,1);
 assert.equal(r.friendShot,.9);
 assert.deepEqual(r.attacks.filter(shot=>shot.vx===0).map(shot=>shot.x),[435,565]);
 assert.ok(r.attacks.some(shot=>shot.x===500&&shot.vx!==0));
});

test('already-hit once-group targets do not absorb any descendant or spend its penetration',()=>{
 for(const key of ['firebomb','icebomb','fork','star','drop','spear']){
  const r=growthRun('3','special1',2),combat=new Combat(r);r.enemies=[enemy(1,500,380),enemy(2,500,260)];
  const group=combat.group(20,true);r.groups[0].hits[1]=20;
  const child=combat.shot(group,key,500,450,{child:true,damage:20,pierce:1,life:1.2});
  tick(r,combat,8);assert.ok(r.attacks.includes(child),`${key}: blocked by a previously hit target`);assert.equal(child.hits.length,0);
  tick(r,combat,30);assert.equal(r.enemies[0].hp,10000);assert.equal(r.enemies[1].hp,9980);assert.equal(r.attacks.includes(child),false);
 }
});

test('every attack tier and friend cadence resumes identically through delayed volleys and descendants',()=>{
 for(const craft of aircraft)for(const track of tracks.filter(track=>track!=='shield') as Track[])for(let level=0;level<=growthCaps[track];level++){
  const r=growthRun(craft.id,track,level);r.enemies=[enemy(1,500,150),enemy(2,350,220),enemy(3,650,220)];
  const combat=new Combat(r);castGrowth(r,combat,track);tick(r,combat,22);
  const restored=JSON.parse(JSON.stringify(r)) as Run;tick(r,combat,210);tick(restored,new Combat(restored),210);
  assert.deepEqual(restored,r,`${craft.id}/${track}/${level}`);
 }
});

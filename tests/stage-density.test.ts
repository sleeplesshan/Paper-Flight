import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyGrowth,encounterProfile} from '../src/arsenal';
import {Engine} from '../src/engine';
import {newRun} from '../src/data';
import {spawnFormation,formationPositions} from '../src/encounters';

function game(stage:number){const r=newRun(stage,'3');r.mode='playing';r.invuln=999;return new Engine(r);}
test('every stage increases target supply at the same growth, without increasing firing budgets',()=>{
 for(let basic=0;basic<=3;basic++)for(let friend=0;friend<=4;friend++){
  const growth={...emptyGrowth(),basic,friend};let density=0,support=Infinity;
  for(let stage=1;stage<=10;stage++){
   const p=encounterProfile(stage,growth);
   assert.ok(p.count/p.interval>density,`${stage}/${basic}/${friend}`);density=p.count/p.interval;
   assert.ok(p.supportInterval<support);support=p.supportInterval;
   assert.ok(p.count<=9&&p.interval>=4);assert.equal(p.shooters,6);assert.equal(p.smallBullets,18);
   assert.equal(p.limit,24);assert.equal(encounterProfile(stage,growth,true).limit,12);
  }
 }
});
test('later stages actually emit more targets in the opening section, even without upgrades',()=>{
 const totals=[1,5,10].map(stage=>{
  const e=game(stage);let total=0;
  // Simulate efficient clearing, allowing the next scheduled formation to enter.
  for(let i=0;i<36*60;i++){e.step(1/60,{x:0,y:0});total+=e.r.enemies.length;e.r.enemies=[];e.r.bullets=[];}
  return total;
 });
 assert.ok(totals[1]>totals[0]);assert.ok(totals[2]>totals[1]);
});
test('late formations retain capacity, top entry and a clear corridor when targets survive',()=>{
 const e=game(10);e.r.growth={...emptyGrowth(),basic:3,friend:4};
 for(let i=0;i<10;i++)spawnFormation(e.r,()=>e.rand(),(k,x)=>e.add(k,x));
 assert.equal(e.r.enemies.length,18);assert.ok(e.r.enemies.every(n=>n.y<0));assert.ok(e.r.enemies.filter(n=>n.shooter).length<=6);
 e.r.phase=3;const before=e.r.enemies.length;assert.equal(spawnFormation(e.r,()=>e.rand(),(k,x)=>e.add(k,x)),false);assert.equal(e.r.enemies.length,before);
 for(const tag of ['spread','pierce','split','area','friends','leader','gentle'] as const)for(const side of [0,1]){
  const p=formationPositions(9,tag,side);assert.ok(side?Math.min(...p.map(n=>n.x))-39>=160:1000-Math.max(...p.map(n=>n.x))-39>=160);
 }
});
test('dense late waves still allow the fixed 40-second boss transition',()=>{
 for(const phase of [0,2]){const e=game(10);e.r.phase=phase;e.r.phaseTime=39.95;e.r.growth.basic=3;spawnFormation(e.r,()=>e.rand(),(k,x)=>e.add(k,x));
  e.step(.05,{x:0,y:0});assert.equal(e.r.phase,phase+1);assert.equal(e.r.enemies.filter(n=>n.kind===(phase===0?'mini':'boss')).length,1);assert.equal(e.r.encounter.support,8.4);
 }
});
test('boss support defers through strong warnings, then resets the stage-specific timer once',()=>{
 const e=game(10);e.r.phase=3;e.r.encounter.support=0;e.add('boss');const boss=e.r.enemies[0];boss.y=110;boss.fire=999;boss.warning=.5;boss.pattern=6;
 e.step(.1,{x:0,y:0});assert.equal(e.r.encounter.formation,0);
 boss.warning=0;e.step(.1,{x:0,y:0});assert.equal(e.r.encounter.formation,1);assert.equal(e.r.encounter.support,8.4);
 const restored=new Engine(JSON.parse(JSON.stringify(e.r)));
 for(let i=0;i<60;i++){e.step(1/60,{x:0,y:0});restored.step(1/60,{x:0,y:0});}
 assert.deepEqual(restored.r,e.r);assert.equal(e.r.encounter.formation,1);
});
test('a revive still grants four seconds without a catch-up burst',()=>{
 const e=game(10);e.r.phase=0;e.r.spawn=0;e.revive();
 for(let i=0;i<180;i++)e.step(1/60,{x:0,y:0});assert.equal(e.r.encounter.formation,0);
 for(let i=0;i<66;i++)e.step(1/60,{x:0,y:0});assert.equal(e.r.encounter.formation,1);
});

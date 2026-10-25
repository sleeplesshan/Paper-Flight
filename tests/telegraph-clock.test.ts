import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newRun,normalizeRun} from '../src/data';
import {Engine} from '../src/engine';
import {canTelegraph} from '../src/combat';
import {spawnFormation} from '../src/encounters';
test('deep formations never count down offscreen and receive a warning after entry',()=>{
 for(let stage=1;stage<=10;stage++)for(const tag of ['pierce','spread','split','friends','area','leader'] as const){
  const r=newRun(stage,'1');Object.assign(r,{mode:'playing',phase:1,spawn:999,invuln:999});r.growth.basic=3;r.growth.friend=4;const engine=new Engine(r);
  spawnFormation(r,()=>.5,(kind,x)=>engine.add(kind,x),tag);
  for(let frame=0;frame<600;frame++){engine.step(1/60,{x:0,y:0});for(const e of r.enemies){assert.ok(e.fire>=0);if(e.y<=30)assert.equal(canTelegraph(e,0),false);}}
 }
});
test('legacy negative countdown snapshot recovers without removing enemies or progress',()=>{
 const r=newRun(6,'1');Object.assign(r,{mode:'playing',phase:1,spawn:999,invuln:999,adventureScore:7850});const engine=new Engine(r);engine.add('small',500);const enemy=r.enemies[0];Object.assign(enemy,{y:-200,fire:-9,shooter:true});
 assert.equal(canTelegraph(enemy,0),false);const restored=new Engine(normalizeRun(JSON.parse(JSON.stringify(r))));restored.step(.05,{x:0,y:0});assert.equal(restored.r.enemies.length,1);assert.ok(restored.r.enemies[0].fire>=.65);assert.equal(restored.r.adventureScore,7850);
 Object.assign(enemy,{y:100,fire:-9});assert.equal(canTelegraph(enemy,0),false);enemy.fire=.5;assert.equal(canTelegraph(enemy,0),true);assert.equal(canTelegraph(enemy,18),false);
});

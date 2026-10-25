import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../src/engine.ts';
import {newRun,normalizeRun,type Enemy} from '../src/data.ts';
import {shieldConfig} from '../src/arsenal.ts';
import {shieldPosition} from '../src/combat.ts';

function game(stage=1){const r=newRun(stage,'3');r.mode='playing';r.phase=1;r.spawn=999;r.invuln=999;return new Engine(r)}
function advance(e:Engine,seconds:number){for(let t=0;t<seconds-1e-8;t+=.01)e.step(.01,{x:0,y:0})}
function stationary(e:Engine,x:number,y:number,kind:Enemy['kind']='small'){e.add(kind,x);const n=e.r.enemies.at(-1)!;Object.assign(n,{x,originX:x,y,fire:999,frozen:99,hp:100,max:100});return n}

test('both boss introductions spawn once, freeze the complete battlefield and resume exactly from save',()=>{
 for(const phase of [0,2]){
  const a=game();Object.assign(a.r,{phase,phaseTime:39.99,auto:true,shot:0,invuln:1});
  const enemy=stationary(a,80,120);a.r.bullets.push({x:90,y:130,vx:0,vy:100,enemy:true,r:6});
  a.step(.01,{x:1,y:1});assert.equal(a.r.bossIntro?.kind,phase===0?'mini':'boss');assert.equal(a.r.phase,phase+1);
  const frozen=JSON.stringify({...a.r,bossIntro:null});assert.equal(a.bomb('fire'),false);assert.equal(a.combat.special(1),false);
  assert.equal(a.r.fire,3);assert.equal(a.r.ice,3);assert.equal(enemy.y,120);
  advance(a,.7);assert.equal(JSON.stringify({...a.r,bossIntro:null}),frozen);
  const b=new Engine(JSON.parse(JSON.stringify(a.r)));advance(a,1.4);advance(b,1.4);assert.deepEqual(a.r,b.r);
  assert.equal(a.r.bossIntro,null);assert.equal(a.r.enemies.filter(n=>n.kind===(phase===0?'mini':'boss')).length,1);
  assert.ok(a.r.time>0);assert.ok(a.r.bullets[0].y>130);
 }
});

test('old runs gain no retroactive intro and missing third shield cooldown is safe',()=>{
 const r=newRun(4,'7');delete r.bossIntro;r.shields=[3,1];const n=normalizeRun(r);
 assert.equal(n.bossIntro,null);assert.deepEqual(n.shields,[.65,.65,0,0]);
});

test('desert miniboss and boss align, dash and return without teleportation or extra fire',()=>{
 for(const kind of ['mini','boss'] as const){
  const a=game(4);a.r.x=850;a.add(kind);const n=a.r.enemies[0];Object.assign(n,{x:200,y:110,fire:99});
  a.attack(n);assert.equal(n.chargeState,'align');assert.ok(n.warning>=1.1);assert.equal(n.targetX,850);
  const firstX=n.x;advance(a,.5);assert.ok(n.x>firstX&&n.x<n.targetX);assert.equal(n.y,110);
  const b=new Engine(JSON.parse(JSON.stringify(a.r)));let last={x:n.x,y:n.y};let sawDash=false,sawReturn=false;
  for(let i=0;i<550;i++){
   a.step(.01,{x:0,y:0});b.step(.01,{x:0,y:0});
   assert.ok(Math.abs(n.x-last.x)<=4.7,`${kind} jumped x`);assert.ok(Math.abs(n.y-last.y)<=3,`${kind} jumped y`);
   if(String(n.chargeState)==='dash'){sawDash=true;assert.equal(n.x,850);assert.equal(n.warning,0)}
   if(String(n.chargeState)==='return')sawReturn=true;
   last={x:n.x,y:n.y};
  }
  assert.ok(sawDash&&sawReturn);assert.equal(n.chargeState,undefined);assert.equal(a.r.bullets.length,0);assert.deepEqual(a.r,b.r);
 }
});

test('ice pauses desert movement and its warning timer, then permits the same saved charge to resume',()=>{
 const a=game(4);a.r.x=760;a.add('boss');const n=a.r.enemies[0];Object.assign(n,{x:300,y:110,fire:999});a.attack(n);advance(a,.25);
 n.frozen=2;const x=n.x,y=n.y,timer=n.chargeTimer,warning=n.warning;advance(a,1.5);
 assert.equal(n.x,x);assert.equal(n.y,y);assert.equal(n.chargeTimer,timer);assert.equal(n.warning,warning);
 const b=new Engine(JSON.parse(JSON.stringify(a.r)));advance(a,1);advance(b,1);assert.deepEqual(a.r,b.r);assert.ok(n.x>x);
});

test('legacy desert warning and active dash restore without snapping to their target lane',()=>{
 for(const charge of [0,1.2]){
  const a=game(4);a.add('boss');const n=a.r.enemies[0];Object.assign(n,{x:200,y:110,fire:99,pattern:4,targetX:850,warning:charge?0:.8,charge});
  a.step(.01,{x:0,y:0});assert.ok(n.x<205);assert.equal(n.chargeState,charge?'dash':'align');
 }
});

test('first shield card provides two orbiters and later tiers use three equally spaced orbiters',()=>{
 const a=game();assert.deepEqual([0,1,2,3].map(level=>shieldConfig(level).count),[0,2,3,3]);
 a.r.growth.shield=1;assert.equal(Math.round(Math.hypot(shieldPosition(a.r,0).x-shieldPosition(a.r,1).x,shieldPosition(a.r,0).y-shieldPosition(a.r,1).y)),120);
 a.r.growth.shield=2;const p=[0,1,2].map(i=>shieldPosition(a.r,i));for(let i=0;i<3;i++)assert.ok(Math.abs(Math.hypot(p[i].x-p[(i+1)%3].x,p[i].y-p[(i+1)%3].y)-60*Math.sqrt(3))<1e-7);
});

test('shield ramming has a short cooldown and cannot reflect or hurt on every frame',()=>{
 const a=game();a.r.growth.shield=3;const p=shieldPosition(a.r,0),n=stationary(a,p.x,p.y);
 const previous={x:n.x,y:n.y,time:a.r.time,playerX:a.r.x,playerY:a.r.y};
 assert.equal(a.combat.shieldEnemy(n,previous),true);assert.equal(n.hp,100-shieldConfig(3).damage);assert.equal(a.r.shields[0],.65);
 assert.equal(a.combat.shieldEnemy(n,previous),false);assert.equal(a.r.attacks.length,0);
 advance(a,.1);assert.ok(a.r.shields[0]<.65&&a.r.shields[0]>.45);
 const b=new Engine(JSON.parse(JSON.stringify(a.r)));advance(a,1);advance(b,1);assert.deepEqual(a.r,b.r);
});

test('swept shield collision catches a fast crossing and a destroyed rammer cannot hit the player',()=>{
 const a=game();a.r.growth.shield=1;const p=shieldPosition(a.r,0);
 assert.equal(a.combat.shieldHit(p.x+100,p.y,6,{x:p.x-100,y:p.y,time:0,playerX:a.r.x,playerY:a.r.y}),true);
 const b=game();b.r.growth.shield=1;b.r.invuln=0;const q=shieldPosition(b.r,0);const n=stationary(b,q.x-35,q.y);n.hp=2;n.frozen=0;n.originX=n.x;n.variant=0;
 b.step(.01,{x:0,y:0});assert.equal(b.r.hearts,10);assert.equal(b.r.enemies.length,0);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {Engine} from '../src/engine';import {normalizeRun,newRun,type Shot} from '../src/data';
import {shieldPosition} from '../src/combat';import {shieldConfig} from '../src/arsenal';
import {createPreviewPair} from '../src/preview-model';
function flight(){const r=newRun(1,'7');r.mode='playing';r.phase=1;r.spawn=999;r.invuln=999;return new Engine(r);}
function target(e:Engine,x:number,y:number){e.add('small',x);const n=e.r.enemies.at(-1)!;Object.assign(n,{x,originX:x,y,hp:1000,max:1000,frozen:100});return n;}
function advance(e:Engine,seconds:number){for(let i=0;i<Math.round(seconds*60);i++)e.step(1/60,{x:0,y:0});}
test('root garden grows six visible side branches before the tip leaves the battlefield',()=>{
 const before=flight(),after=flight();before.r.growth.special1=1;after.r.growth.special1=2;
 const b=target(before,740,240),a=target(after,740,240);before.bomb('fire');after.bomb('fire');
 advance(after,.15);assert.equal(after.r.attacks.filter(s=>s.child).length,0);assert.equal(a.hp,1000);
 advance(after,.2);assert.equal(after.r.attacks.filter(s=>s.child).length,2);assert.ok(after.r.attacks.filter(s=>s.child).every(s=>s.sy===315));assert.equal(a.hp,1000);
 const copy=new Engine(normalizeRun(JSON.parse(JSON.stringify(after.r))));advance(after,.5);advance(copy,.5);assert.deepEqual(after.r,copy.r);
 advance(before,.85);assert.equal(b.hp,1000);assert.equal(a.hp,1000-26*1.7);
 assert.equal(after.r.attacks.filter(s=>s.child&&s.style==='root').length,6);
 advance(after,1);assert.equal(a.hp,1000-26*1.7);assert.equal(after.r.attacks.length,0);
});
test('root garden preview shows additional side kills using the real combat',()=>{
 const r=newRun(1,'7');r.growth.special1=1;const [before,after]=createPreviewPair(r,'special1');
 before.bomb('fire');after.bomb('fire');advance(before,.9);advance(after,.9);
 assert.ok(after.r.kills>=before.r.kills+2);assert.equal(r.growth.special1,1);assert.equal(r.kills,0);
});
test('tree path retains garden coverage, grows broader branches and launches twelve large leaves',()=>{
 const before=flight(),after=flight();before.r.growth.special1=2;after.r.growth.special1=3;
 const emitted:Shot[]=[],spawn=after.combat.shot.bind(after.combat);after.combat.shot=(...args)=>{const s=spawn(...args);if(s.key==='leaf')emitted.push(s);return s;};
 const oldTargets=[],newTargets=[];for(const y of [90,220,350])for(let x=100;x<=900;x+=100){oldTargets.push(target(before,x,y));newTargets.push(target(after,x,y));}
 before.bomb('fire');after.bomb('fire');advance(after,.6);
 const copy=new Engine(normalizeRun(JSON.parse(JSON.stringify(after.r))));advance(after,.55);advance(copy,.55);assert.deepEqual(after.r,copy.r);
 assert.equal(emitted.length,12);assert.ok(emitted.every(s=>s.child&&s.split===0&&s.size===144&&s.vy<0&&s.group===after.r.attacks[0].group));
 advance(after,2);advance(before,3.15);let newLanes=0;
 for(let i=0;i<oldTargets.length;i++){const b=oldTargets[i],a=newTargets[i];if(b.hp<1000)assert.ok(a.hp<=b.hp,`tree lost garden lane at ${a.x},${a.y}`);else if(a.hp<1000)newLanes++;assert.ok(1000-a.hp<=26*1.95+1e-6);}
 assert.ok(newLanes>=2);assert.equal(after.r.attacks.length,0);
});
test('final log keeps all earlier lanes, does more damage, and sends two logs out from its edges',()=>{
 const before=flight(),after=flight();before.r.growth.special2=2;after.r.growth.special2=3;
 const oldTargets=[],newTargets=[];for(const y of [120,250,370])for(let x=25;x<=975;x+=50){oldTargets.push(target(before,x,y));newTargets.push(target(after,x,y));}
 before.bomb('ice');after.bomb('ice');assert.equal(after.r.attacks.length,3);
 advance(after,.33);const branches=after.r.attacks.filter(s=>s.child);assert.equal(branches.length,2);assert.ok(branches.every(s=>Math.abs(s.sx-after.r.x)>250&&s.damage===24*1.95));
 const copy=new Engine(normalizeRun(JSON.parse(JSON.stringify(after.r))));advance(after,2);advance(copy,2);assert.deepEqual(after.r,copy.r);advance(before,2.33);
 for(let i=0;i<oldTargets.length;i++){const b=oldTargets[i],a=newTargets[i];if(b.hp<1000)assert.ok(a.hp<=b.hp,`lost lane or damage at ${a.x},${a.y}`);assert.ok(1000-a.hp<=24*1.95+1e-6);}
});
test('tree leaves travel past enemies already struck by the parent tree and hit a new target once',()=>{
 const e=flight(),a=target(e,500,370),b=target(e,500,210),group=e.combat.group(50,true);
 e.r.groups[0].hits[a.id]=50;e.combat.shot(group,'leaf',500,450,{child:true,damage:50,size:144,r:44,vy:-280,life:1.55});
 advance(e,.25);assert.equal(a.hp,1000);assert.equal(e.r.attacks.length,1);const restored=new Engine(normalizeRun(JSON.parse(JSON.stringify(e.r))));
 advance(e,1);advance(restored,1);assert.deepEqual(e.r,restored.r);assert.equal(a.hp,1000);assert.equal(b.hp,950);
});
test('permanent shields block during the counterattack cooldown and keep ramming damage bounded',()=>{
 const e=flight();e.r.growth.shield=3;const p=shieldPosition(e.r,0);assert.equal(e.combat.shieldHit(p.x,p.y),true);assert.equal(e.r.attacks.length,3);
 for(let i=0;i<20;i++)assert.equal(e.combat.shieldHit(p.x,p.y),true);assert.equal(e.r.attacks.length,3);
 const n=target(e,p.x,p.y),previous={x:p.x,y:p.y,time:e.r.time,playerX:e.r.x,playerY:e.r.y};
 assert.equal(e.combat.shieldEnemy(n,previous),false);assert.equal(n.hp,1000);
 e.r.shields[0]=0;assert.equal(e.combat.shieldEnemy(n,previous),true);const health=n.hp;
 for(let i=0;i<60;i++)assert.equal(e.combat.shieldEnemy(n,previous),false);assert.equal(n.hp,health);
 assert.equal(e.combat.shieldHit(p.x,p.y),true);
 const old=JSON.parse(JSON.stringify(e.r));old.shields=[8,8];const restored=normalizeRun(old);assert.equal(restored.shields[0],shieldConfig(3).recharge);
 const copy=new Engine(JSON.parse(JSON.stringify(e.r)));advance(e,.7);advance(copy,.7);assert.deepEqual(e.r,copy.r);
});

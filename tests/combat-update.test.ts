import test from 'node:test';
import assert from 'node:assert/strict';
import {newRun,aircraft,type Enemy,type Run} from '../src/data';
import {Combat,shieldPosition} from '../src/combat';
import {cardFor,growthCaps,tracks,weapon,ultimateCap,specialScale,encounterProfile} from '../src/arsenal';
const target=(id:number,x=500,y=150,hp=1000):Enemy=>({id,x,y,hp,max:hp,kind:'boss',variant:0,t:0,fire:10,frozen:0,hit:0,originX:x,warning:0,targetX:x});
function flight(craft:string){const r=newRun(1,craft);r.mode='playing';return r;}
function tick(r:Run,combat:Combat,seconds:number){for(let n=0;n<Math.round(seconds*60);n++){r.time+=1/60;combat.update(1/60)}}
test('19-card tuning exposes a named, short, actual final form for every aircraft and path',()=>{
 assert.equal(Object.values(growthCaps).reduce((a,b)=>a+b,0),19);
 for(const c of aircraft)for(const t of tracks)for(let level=1;level<=growthCaps[t];level++){
  const card=cardFor(c.id,t,level);assert.ok(card.title&&card.description,`${c.id}/${t}/${level}`);assert.ok(!/왼쪽 기술|가운데 기술/.test(card.title+card.description));assert.ok(card.description.length<35);
 }
});
test('eight ultimates travel, respect per-enemy budget, attribute kills, and restore every moving state',()=>{
 for(const c of aircraft)for(let level=0;level<=2;level++){
  const r=flight(c.id);r.ultimate.level=level;r.enemies=[target(1),target(2,370,90),target(3,640,110)];const combat=new Combat(r);combat.ultimate();
  assert.equal(r.enemies[0].hp,1000,`instant damage ${c.id}/${level}`);assert.ok(r.attacks.length>0);assert.equal(r.groups[0].source,'ultimate');
  tick(r,combat,.35);const loaded=JSON.parse(JSON.stringify(r)) as Run,other=new Combat(loaded);tick(r,combat,3);tick(loaded,other,3);
  assert.deepEqual(loaded,r,`resume ${c.id}/${level}`);
  for(const enemy of r.enemies)assert.ok(1000-enemy.hp<=ultimateCap[level]+1e-7,`cap ${c.id}/${level}`);
  assert.ok(r.enemies[0].hp<1000,`central lane ${c.id}/${level}`);
  const killRun=flight(c.id);killRun.ultimate.level=level;killRun.enemies=[target(1,500,150,.05)];const killer=new Combat(killRun);killer.ultimate();tick(killRun,killer,3);
  assert.equal(killRun.enemies[0].killSource,'ultimate',`kill attribution ${c.id}/${level}`);
 }
});
test('final special forms stay bounded, ice-only, and deterministic across branch and cloud creation',()=>{
 for(const c of aircraft)for(const slot of [0,1] as const){const r=flight(c.id),w=weapon(c.id).specials[slot];r.growth[slot===0?'special1':'special2']=3;r.enemies=[target(1),target(2,370,80),target(3,640,90)];const combat=new Combat(r);assert.equal(combat.special(slot),true);assert.equal(r.enemies[0].hp,1000);
  tick(r,combat,.25);const loaded=JSON.parse(JSON.stringify(r)) as Run;tick(r,combat,3.5);tick(loaded,new Combat(loaded),3.5);assert.deepEqual(loaded,r,`${c.id}/${slot}`);
  for(const enemy of r.enemies){assert.ok(1000-enemy.hp<=w.cap*specialScale[3]+1e-6);if(w.key!=='icebomb')assert.equal(enemy.frozen,0);}
  assert.ok(r.enemies[0].hp<1000,`central final ${c.id}/${slot}`);
 }
});
test('final missiles retain their queued center pair within eight straight non-piercing projectiles',()=>{
 const r=flight('4');r.growth.special2=3;const combat=new Combat(r);combat.special(1);const shots=[...r.attacks,...r.scheduled.map(p=>p.shot)];assert.equal(shots.length,8);
 assert.deepEqual(r.scheduled.map(p=>p.shot.x),[486,514]);
 for(const s of shots){assert.equal(s.vx,0);assert.equal(s.vy,-520);assert.equal(s.pierce,1);assert.equal(s.radius,0);assert.equal(s.style,'linear');assert.equal(s.split,0);}
});
test('triangle friends stay near five DPS and final shield fires exactly one non-piercing wing',()=>{
 const r=flight('3');r.growth.friend=4;r.auto=true;const combat=new Combat(r);let budget=0;const create=combat.group.bind(combat);combat.group=(cap,once,source)=>{budget+=cap;return create(cap,once,source)};tick(r,combat,30);assert.ok(budget/30<=5.2);assert.ok(budget/30>=4.5);
 r.growth.shield=4;r.attacks=[];const p=shieldPosition(r,3);assert.equal(combat.shieldHit(p.x,p.y),true);assert.equal(r.attacks.length,1);assert.equal(r.attacks[0].key,'windblade');assert.equal(r.attacks[0].damage,3);assert.equal(r.attacks[0].pierce,1);assert.equal(r.shields[3],.65);
});
test('special, shield and ultimate growth alone never increases ordinary formation density',()=>{
 const r=flight('3'),plain=encounterProfile(8,r.growth);r.growth.special1=3;r.growth.special2=3;r.growth.shield=4;r.growth.ultimate=2;assert.deepEqual(encounterProfile(8,r.growth),plain);r.growth.friend=4;assert.ok(Number.isFinite(encounterProfile(8,r.growth).count));
});

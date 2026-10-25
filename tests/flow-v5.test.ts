import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialSave,newRun,normalizeRun} from '../src/data';
import {Engine,grantReward,settleScore,BOSS_DEFEAT_TIMING} from '../src/engine';
import {chooseCard,offerReward,rollCards,tickCardApply} from '../src/cards';

function game(){const r=newRun(1,'3');r.mode='playing';r.phase=1;r.auto=true;r.invuln=0;return new Engine(r);}
function tick(e:Engine,seconds:number){for(let t=0;t<seconds-1e-8;t+=.01)e.step(.01,{x:1,y:1});}
function kill(e:Engine,kind:'mini'|'boss'){e.add(kind);const n=e.r.enemies.at(-1)!;n.x=460;n.y=130;n.hp=0;e.removeDead();}

test('mini explosion freezes combat before awarding a card and never awards a stage gem',()=>{
 const e=game(),r=e.r,s=initialSave();s.run=r;r.capsules=[{kind:'fire',x:100,y:100},{kind:'fire',x:200,y:100}];kill(e,'mini');
 assert.equal(r.mode,'playing');assert.equal(r.reward,null);assert.equal(r.phase,1);assert.equal(r.adventureScore,200);assert.equal(r.ultimate.charge,25);
 const x=r.x,y=r.y,time=r.time;assert.equal(e.bomb('fire'),false);e.damage();assert.equal(r.hearts,10);
 tick(e,.5);assert.equal(r.x,x);assert.equal(r.y,y);assert.equal(r.time,time);assert.equal(grantReward(s),false);
 const resumed=new Engine(JSON.parse(JSON.stringify(r)));tick(e,.41);tick(resumed,.41);assert.deepEqual(resumed.r,r);
 assert.equal(r.mode,'cards');assert.equal(r.phase,2);assert.equal(r.bossDefeat,null);assert.equal(normalizeRun(r).reward?.kind,'mini');assert.equal(r.capsules.length,2);assert.deepEqual(r.capsules.map(c=>c.kind),['fire','ice']);assert.equal(r.auto,true);
 assert.equal(grantReward(s),false);settleScore(s);settleScore(s);assert.equal(s.points,200);assert.deepEqual(s.gems,[]);assert.equal(s.completions,0);
});

test('final boss explodes, holds, then flies the player out before clear rewards',()=>{
 const e=game(),r=e.r,s=initialSave();s.run=r;r.phase=3;kill(e,'boss');const startY=r.y;
 assert.equal(r.mode,'playing');assert.equal(r.bossDefeat?.kind,'boss');assert.equal(r.enemies.length,0);assert.equal(r.adventureScore,500);assert.equal(r.ultimate.charge,40);
 tick(e,BOSS_DEFEAT_TIMING.bossExplosion+.1);assert.equal(r.y,startY);assert.equal(grantReward(s),false);assert.equal(e.events.includes('clear'),false);
 tick(e,.3);assert.ok(r.y<startY&&r.y>-100);assert.equal(r.mode,'playing');assert.equal(grantReward(s),false);
 tick(e,.6);assert.equal(r.y,-100);assert.equal(r.mode,'clear');assert.equal(r.cinematic?.kind,'clear');assert.equal(r.bossDefeat,null);assert.equal(e.events.filter(x=>x==='clear').length,1);
 assert.equal(grantReward(s),true);assert.equal(grantReward(JSON.parse(JSON.stringify(s))),false);assert.equal(s.points,500);assert.deepEqual(s.gems,[1]);
});

test('explosion and departure snapshots resume their exact remaining phase without repeat scoring',()=>{
 for(const elapsed of [.4,1.6,1.98]){const e=game();e.r.phase=3;kill(e,'boss');tick(e,elapsed);const copy=new Engine(JSON.parse(JSON.stringify(e.r)));tick(e,2.1-elapsed);tick(copy,2.1-elapsed);assert.deepEqual(copy.r,e.r);assert.equal(copy.r.adventureScore,500);assert.equal(copy.r.kills,1);assert.equal(copy.events.filter(x=>x==='clear').length,1);copy.removeDead();assert.equal(copy.r.adventureScore,500);assert.equal(copy.r.ultimate.charge,40);}
});

test('confirmed cards return directly to their battlefield destination with one application effect',()=>{
 for(const kind of ['mini','clear'] as const){const e=game(),r=e.r;r.mode=kind==='clear'?'clear':'playing';offerReward(r,kind);rollCards(r,()=>.1);const track=r.cards[0];assert.ok(chooseCard(r,track));assert.equal(r.mode,kind==='mini'?'playing':'clear');assert.equal(r.reward?.status,'done');assert.deepEqual(r.cards,[]);assert.equal(r.pendingCard,null);assert.equal(r.cardApply?.track,track);assert.equal(r.cardApply?.duration,.45);assert.equal(chooseCard(r,track),false);assert.equal(r.growth[track],1);const copy=normalizeRun(JSON.parse(JSON.stringify(r)));tickCardApply(r,.2);tickCardApply(copy,.2);assert.deepEqual(copy,r);tickCardApply(r,.3);assert.equal(r.cardApply,null);assert.equal(r.claimedRewards.length,1);if(kind==='mini'){assert.equal(r.auto,true);assert.equal(r.invuln,2);assert.equal(r.encounter.pause,4);}}
});

test('saved legacy card showcase completes without replay, recharge, or a second acquisition',()=>{
 for(const kind of ['mini','clear'] as const){const r=newRun(1,'3');r.mode='cards';r.growth.basic=1;r.lastCard='basic';r.cardDone=true;r.cards=['basic'];r.reward={id:r.id+':'+kind,kind,status:'showcase',remaining:.6};const restored=normalizeRun(r);assert.equal(restored.mode,kind==='mini'?'playing':'clear');assert.equal(restored.reward?.status,'done');assert.equal(restored.growth.basic,1);assert.equal(restored.cardApply,null);assert.equal(chooseCard(restored,'basic'),false);assert.equal(restored.claimedRewards.length,1);normalizeRun(restored);assert.equal(restored.claimedRewards.length,1);}
});

test('old run defaults and invalid transition fields preserve the existing run safely',()=>{
 const completedLegacy=newRun(1,'3') as any;completedLegacy.mode='cards';completedLegacy.cardDone=true;delete completedLegacy.reward;normalizeRun(completedLegacy);assert.equal(completedLegacy.mode,'clear');assert.equal(completedLegacy.reward.status,'done');
 const r=newRun(3,'7') as any;delete r.bossDefeat;delete r.cardApply;normalizeRun(r);assert.equal(r.bossDefeat,null);assert.equal(r.cardApply,null);r.bossDefeat={kind:'boss',x:NaN,y:0,elapsed:0,playerX:500,playerY:450};r.cardApply={track:'bogus',remaining:1,duration:1};normalizeRun(r);assert.equal(r.bossDefeat,null);assert.equal(r.cardApply,null);assert.equal(r.stage,3);assert.equal(r.craft,'7');
});

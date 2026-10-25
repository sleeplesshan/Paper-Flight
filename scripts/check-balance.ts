import {writeFileSync,mkdirSync} from 'node:fs';
import {Engine} from '../src/engine.ts';import {newRun,aircraft} from '../src/data.ts';import {emptyGrowth,type Growth,type Track} from '../src/arsenal.ts';import {offerReward,rollCards,chooseCard,finishCard} from '../src/cards.ts';
const orders:Record<string,Track[]>={journey:['basic','friend','special1','shield','ultimate','special2'],offense:['basic','friend','ultimate','special1','special2','shield'],shield:['shield','ultimate','special2','friend','basic','special1'],special:['special1','special2','ultimate','shield','basic','friend'],friend:['friend','basic','ultimate','shield','special1','special2'],base:[]};
const rows:any[]=[];
for(const [build,order] of Object.entries(orders))for(const craft of aircraft){let growth=emptyGrowth(),charge=0,totalScore=0,choices=0;
for(let stage=1;stage<=10;stage++){
 const r=newRun(stage,craft.id);r.mode='playing';r.growth={...growth};r.ultimate.charge=charge;r.adventureScore=totalScore;r.seed=7127+stage;const e=new Engine(r);let drops=0,hits=0,revives=0,peakEnemies=0,peakShots=0,peakBullets=0,fireAt=6,iceAt=9,bossAt=0,miniAt=0,miniDuration=0,lastPhase=0;
 const pick=()=>{rollCards(r,()=>e.rand());if(build==='base'){r.reward!.status='done';r.mode=r.reward!.kind==='mini'?'playing':'clear';return;}const sorted=[...r.cards].sort((a,b)=>order.indexOf(a)-order.indexOf(b));const t=sorted[0];if(t&&chooseCard(r,t)){choices++;finishCard(r);}};
 const step=1/60;for(let t=0;t<340&&r.mode!=='clear';t+=step){if(r.mode==='cards')pick();if(r.mode==='promise'){e.revive();revives++}r.auto=true;
 const boss=r.enemies.find(n=>n.kind!=='small'),nearest=boss??r.enemies.filter(n=>n.y>0&&n.y<410).sort((a,b)=>b.y-a.y)[0];let targetX=nearest?.x??500,targetY=420;
 const capsule=r.capsules.filter(c=>r[c.kind]<2).sort((a,b)=>Math.hypot(a.x-r.x,a.y-r.y)-Math.hypot(b.x-r.x,b.y-r.y))[0];if(capsule){targetX=capsule.x;targetY=Math.min(465,Math.max(160,capsule.y+10));}
 const imminent=r.bullets.find(b=>b.enemy&&b.y>r.y-100&&b.y<r.y+15&&Math.abs(b.x-r.x)<25);if(imminent&&!capsule)targetX=r.x+(r.x>500?-85:85);
 if(r.time>=fireAt&&r.enemies.some(n=>n.y>30)){e.bomb('fire');fireAt=r.time+7}if(r.time>=iceAt&&r.enemies.some(n=>n.y>30)){e.bomb('ice');iceAt=r.time+9}if(build!=='base'&&r.ultimate.charge===100&&r.enemies.some(n=>n.y>20))e.ultimate();
 const existingCapsules=new Set(r.capsules);e.step(step,{x:Math.max(-1,Math.min(1,(targetX-r.x)/30)),y:Math.max(-1,Math.min(1,(targetY-r.y)/30))});drops+=r.capsules.filter(c=>!existingCapsules.has(c)).length;hits+=e.events.filter(v=>v==='hit').length;e.events=[];
 if(r.phase!==lastPhase){if(r.phase===1)miniAt=r.time;if(r.phase===2)miniDuration=r.time-miniAt;if(r.phase===3)bossAt=r.time;lastPhase=r.phase;}
 peakEnemies=Math.max(peakEnemies,r.enemies.filter(n=>n.kind==='small').length);peakShots=Math.max(peakShots,r.attacks.length+r.scheduled.length);peakBullets=Math.max(peakBullets,r.bullets.filter(b=>b.source==='small').length);
 }
 const clear=r.mode==='clear';if(clear&&stage<10&&offerReward(r,'clear'))pick();
 growth={...r.growth};charge=r.ultimate.charge;totalScore=r.adventureScore;
 rows.push({build,craft:craft.id,stage,clear,choices,growth:{...growth},seconds:+r.time.toFixed(1),bossSeconds:bossAt?+(r.time-bossAt).toFixed(1):null,miniSeconds:+miniDuration.toFixed(1),kills:r.kills,hits,revives,drops,peakEnemies,peakShots,peakSmallBullets:peakBullets});
}}
mkdirSync('validation-results',{recursive:true});writeFileSync('validation-results/balance-v4.json',JSON.stringify({method:'60Hz actual attacks/collision; real reward offers and selected-card growth carried across ten stages; scripted aim, capsule collection, simple dodge, allowed promise revivals. Base deliberately skips cards and ultimates as a lower-bound. Not a human playtest.',rows},null,2));
for(const build of Object.keys(orders)){const a=rows.filter(r=>r.build===build);console.log(JSON.stringify({build,cases:a.length,clear:a.filter(r=>r.clear).length,min:Math.min(...a.map(r=>r.seconds)),max:Math.max(...a.map(r=>r.seconds)),mean:+(a.reduce((n,r)=>n+r.seconds,0)/a.length).toFixed(1),bossMin:Math.min(...a.map(r=>r.bossSeconds??999)),bossMax:Math.max(...a.map(r=>r.bossSeconds??0)),cardsAtFinal:[...new Set(a.filter(r=>r.stage===10).map(r=>r.choices))],revives:a.reduce((n,r)=>n+r.revives,0),peakEnemies:Math.max(...a.map(r=>r.peakEnemies)),peakShots:Math.max(...a.map(r=>r.peakShots)),peakSmallBullets:Math.max(...a.map(r=>r.peakSmallBullets)),failed:a.filter(r=>!r.clear).map(r=>[r.craft,r.stage])}));}

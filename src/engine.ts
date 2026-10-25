import type {CombatFeedback} from './feedback';
import {offerReward} from './cards';
import {advanceCampaign} from './medals';
import {W,H,BOSS_DEFEAT_TIMING,type Run,type Enemy,type Save,type Bomb,normalizeRun} from './data';
import {Combat} from './combat';
import {encounterProfile} from './arsenal';
import {spawnFormation,showcaseTag} from './encounters';
export type GameEvent='gun'|'fire'|'ice'|'hit'|'destroy'|'pickup'|'clear'|'warning'|'ultimate-ready'|`ultimate-${string}`;
export {BOSS_DEFEAT_TIMING} from './data';
export const bossHealth=[220,260,310,360,410,460,520,580,640,720];
export class Engine{
 events:GameEvent[]=[];
 feedback:CombatFeedback[]=[];
 combat:Combat;
 constructor(public r:Run,public options:{preview?:boolean}={}){normalizeRun(r);this.combat=new Combat(r,e=>this.events.push(e),e=>{if(this.feedback.length<80)this.feedback.push(e)})}
 rand(){let n=this.r.seed;n^=n<<13;n^=n>>>17;n^=n<<5;this.r.seed=n>>>0;return this.r.seed/4294967296}
 add(kind:Enemy['kind'],x?:number){let r=this.r;const hp=kind==='boss'?bossHealth[r.stage-1]:kind==='mini'?35+r.stage*5:2+Math.floor(r.stage/4);const px=x??(130+this.rand()*740);r.enemies.push({id:r.nextId++,x:kind==='small'?px:500,y:kind==='small'?-50:-120,hp,max:hp,kind,variant:Math.floor(this.rand()*2),t:0,fire:2+this.rand()*2,frozen:0,hit:0,originX:px,warning:0,targetX:r.x})}
 damage(){let r=this.r;if(r.invuln>0||r.mode!=='playing'||r.bossIntro||r.bossDefeat)return;this.events.push('hit');r.effects.push({x:r.x,y:r.y,kind:'hit',t:0});if(r.hearts>0){r.hearts--;r.invuln=1.5}else{r.mode='promise';r.auto=false;r.effects.push({x:r.x,y:r.y,kind:'destroy',t:0})}}
 revive(){let r=this.r;r.hearts=10;r.fire=r.ice=3;r.invuln=3;r.bullets=r.bullets.filter(b=>!b.enemy);r.mode='playing';r.auto=false;r.encounter.pause=4;r.attacks=[];r.scheduled=[];r.groups=[]}
 bomb(kind:'fire'|'ice'){if(this.r.bossIntro||this.r.bossDefeat||this.r.cinematic)return false;return this.combat.special(kind==='fire'?0:1)}

 explode(b:Bomb){const r=this.r,radius=b.kind==='fire'?210:240;this.events.push(b.kind);r.effects.push({x:b.x,y:b.y,kind:b.kind,t:0});for(const e of r.enemies)if(Math.hypot(e.x-b.x,e.y-b.y)<radius+(e.kind==='small'?24:70)){e.hp-=b.kind==='fire'?30:8;e.hit=.2;if(b.kind==='ice')e.frozen=2}}

 ultimate(){const r=this.r;if(r.mode!=='playing'||r.bossIntro||r.bossDefeat||r.cinematic||r.ultimate.charge<100||r.ultimate.pending)return false;r.ultimate={charge:0,pending:true,level:r.growth.ultimate};r.cinematic={kind:'ultimate',remaining:1,duration:1};return true;}
 removeDead(){const r=this.r;let destroyed=false;for(const e of r.enemies){if(e.hp>0)continue;destroyed=true;r.kills++;this.feedback.push({kind:'destroy',craft:r.craft,weapon:'paper',level:0,x:e.x,y:e.y,target:e.kind});
 if(!this.options.preview){r.adventureScore+=e.kind==='boss'?500:e.kind==='mini'?200:e.leader?20:10;
 if(e.killSource!=='ultimate'){const before=r.ultimate.charge;r.ultimate.charge=Math.min(100,before+(e.kind==='boss'?40:e.kind==='mini'?25:e.leader?8:5));if(before<100&&r.ultimate.charge===100)this.events.push('ultimate-ready');}}
 if((this.options.preview||e.kind==='small')&&r.effects.length<50)r.effects.push({x:e.x,y:e.y,kind:'destroy',t:0});
 if(!this.options.preview&&e.kind==='small'&&r.kills%5===0&&r.encounter.dropCooldown<=0&&r.capsules.length<2){r.capsules.push({x:e.x,y:e.y,kind:Math.floor(r.kills/5)%2?'fire':'ice'});r.encounter.dropCooldown=12;}
 if(!this.options.preview&&e.kind!=='small'&&!r.bossDefeat){
  r.bossDefeat={kind:e.kind,x:e.x,y:e.y,variant:e.variant,elapsed:0,playerX:r.x,playerY:r.y};
  r.bossIntro=null;r.supply.pending=null;r.cinematic=null;r.ultimate.pending=false;
  // Only the stored defeat snapshot is rendered; it cannot be hit or scored again.
  r.bullets=[];r.bombs=[];r.attacks=[];r.scheduled=[];r.groups=[];
  if(e.kind==='boss'){r.auto=false;r.capsules=[];}
 }}
 if(destroyed)this.events.push('destroy');r.enemies=r.enemies.filter(e=>e.hp>0);
 }
 /** A saved logical clock owns destruction and departure, independently of video playback. */
 advanceDefeat(dt:number){const r=this.r,d=r.bossDefeat;if(!d)return;
  d.elapsed+=dt;
  if(d.kind==='mini'){
   if(d.elapsed<BOSS_DEFEAT_TIMING.miniExplosion)return;
   r.bossDefeat=null;r.phase=2;r.phaseTime=0;
   // Guaranteed mini rewards replace remaining drops, retaining the two-capsule cap.
   r.capsules=[{x:420,y:Math.max(40,r.y-140),kind:'fire'},{x:580,y:Math.max(40,r.y-140),kind:'ice'}];
   offerReward(r,'mini');return;
  }
  const exitStart=BOSS_DEFEAT_TIMING.bossExplosion+BOSS_DEFEAT_TIMING.hold;
  const progress=Math.max(0,Math.min(1,(d.elapsed-exitStart)/BOSS_DEFEAT_TIMING.departure));
  r.x=d.playerX;r.y=d.playerY+(-100-d.playerY)*progress*progress;
  if(progress<1)return;
  r.bossDefeat=null;r.mode='clear';r.cinematic={kind:'clear',remaining:1.8,duration:1.8};this.events.push('clear');
 }
 /** Combat-time supply, bounded and never accumulated after a skipped opportunity. */
 updateSupply(dt:number){const r=this.r;if(this.options.preview||!(r.phase===1||r.phase===3))return;
 const s=r.supply;s.clock-=dt;if(s.pending){const danger=r.enemies.some(e=>e.kind!=='small'&&(e.warning>0||!!e.chargeState));if(danger&&s.delayed<3){s.delayed+=dt;return;}s.pending.remaining-=dt;if(s.pending.remaining<=0){if(r.capsules.length<2&&r.encounter.dropCooldown<=6){r.capsules.push({x:s.pending.x,y:s.pending.y,kind:s.pending.kind,speed:100});}s.pending=null;s.delayed=0;}return;}
 if(s.clock>0)return;
 const danger=r.enemies.some(e=>e.kind!=='small'&&(e.warning>0||!!e.chargeState));
 if(danger&&s.delayed<3){s.delayed+=dt;return;}
 const delayed=s.delayed;s.clock=12;s.delayed=0;
 if(r.fire===3&&r.ice===3||r.capsules.length>=2||r.encounter.dropCooldown>6||r.encounter.pause>0)return;
 const left=Math.max(70,r.x-150),right=Math.min(930,r.x+150),y=Math.max(30,r.y-140);
 const hazard=(x:number)=>r.enemies.reduce((n,e)=>n+(Math.abs(e.x-x)<100?1:0),0)+r.bullets.filter(b=>b.enemy&&Math.abs(b.x-x)<90&&Math.abs(b.y-y)<180).length;
 const x=hazard(left)<=hazard(right)?left:right;s.delayed=delayed;s.pending={x,y,kind:r.fire<=r.ice?'fire':'ice',remaining:.6};
 }
 attack(e:Enemy){let r=this.r;const stage=r.stage===10?[2,3,6,7,9][Math.floor(e.t/8)%5]:r.stage;e.pattern=stage;let count=e.kind==='small'?1:stage===1?3:3+Math.floor(stage/3);let speed=e.kind==='small'?95:105+stage*3;
 const emit=(a:number)=>r.bullets.push({x:e.x,y:e.y+30,vx:Math.sin(a)*speed,vy:Math.cos(a)*speed,enemy:true,r:6,source:e.kind==='small'?'small':'boss'});
 if(e.kind==='small'){emit(0);return}
 if(stage===4){e.targetX=Math.max(100,Math.min(W-100,r.x));e.chargeState='align';e.chargeTimer=0;e.chargeDuration=Math.max(1.1,Math.abs(e.targetX-e.x)/360);e.chargeFromX=e.x;e.chargeFromY=e.y;e.warning=e.chargeDuration;e.charge=0;return}
 if(stage===6||stage===7){e.targetX=stage===7?(150+((Math.floor(e.t/3)%3)*350)):r.x;e.warning=.9;return}
 if(stage===9){for(let i=0;i<10;i++){if(i===2||i===3||i===7)continue;emit(i*Math.PI/5)}return}
 const offset=stage===3?(Math.floor(e.t/3)%2?-.3:.3):stage===8?Math.sin(e.t)*.4:0;
 for(let i=0;i<count;i++)emit((i-(count-1)/2)*.32+offset);

 }
 /** Saved state moves visibly into the marked lane, dives, then returns. */
 moveDesert(e:Enemy,dt:number){
  if(!e.chargeState&&e.pattern===4&&e.warning>0){e.chargeState='align';e.chargeTimer=0;e.chargeDuration=Math.max(e.warning,Math.abs(e.targetX-e.x)/360);e.chargeFromX=e.x;e.chargeFromY=e.y;}
  if(!e.chargeState&&(e.charge??0)>0){e.chargeState='dash';e.chargeTimer=0;e.chargeDuration=e.charge;}
  if(!e.chargeState)return false;
  e.chargeTimer=(e.chargeTimer??0)+dt;
  const duration=e.chargeDuration??(e.chargeState==='align'?1.1:1.4),t=Math.min(1,e.chargeTimer/duration);
  if(e.chargeState==='align'){
   e.x=(e.chargeFromX??e.x)+(e.targetX-(e.chargeFromX??e.x))*t;
   e.y=e.chargeFromY??e.y;e.warning=Math.max(0,duration-e.chargeTimer);
   if(t===1){e.chargeState='dash';e.chargeTimer=0;e.chargeDuration=1.4;e.charge=1.4;e.warning=0;}
  }else if(e.chargeState==='dash'){
   e.y+=230*Math.min(dt,Math.max(0,duration-(e.chargeTimer-dt)));e.charge=Math.max(0,duration-e.chargeTimer);
   if(t===1){e.chargeState='return';e.chargeTimer=0;e.chargeDuration=1.4;e.chargeFromX=e.x;e.chargeFromY=e.y;e.charge=0;}
  }else{
   e.x=(e.chargeFromX??e.x)+(W/2-(e.chargeFromX??e.x))*t;
   e.y=(e.chargeFromY??e.y)+(110-(e.chargeFromY??e.y))*t;
   if(t===1){e.chargeState=undefined;e.chargeTimer=0;e.warning=0;e.charge=0;}
  }
  return true;
 }
 step(dt:number,input:{x:number,y:number}){let r=this.r;if(r.mode!=='playing')return;
 if(r.bossDefeat){this.advanceDefeat(dt);return;}
 if(r.cinematic?.kind==='ultimate'){r.cinematic.remaining=Math.max(0,r.cinematic.remaining-dt);if(r.cinematic.remaining===0){r.cinematic=null;if(r.ultimate.pending){r.ultimate.pending=false;this.combat.ultimate();this.events.push(`ultimate-${r.craft}`);}}return;}
 if(r.bossIntro){r.bossIntro.remaining=Math.max(0,r.bossIntro.remaining-dt);if(r.bossIntro.remaining===0)r.bossIntro=null;return;}
 if(!this.options.preview&&(r.phase===0||r.phase===2)&&r.phaseTime+dt>=40){r.phase++;r.phaseTime=0;const kind=r.phase===1?'mini':'boss';this.add(kind);r.encounter.support=encounterProfile(r.stage,r.growth,true).supportInterval;r.supply={clock:10,delayed:0,pending:null};this.events.push('warning');r.bossIntro={kind,remaining:2,duration:2};return;}
 const previous={time:r.time,playerX:r.x,playerY:r.y};r.time+=dt;r.phaseTime+=dt;r.invuln=Math.max(0,r.invuln-dt);r.x=Math.max(30,Math.min(W-30,r.x+input.x*290*dt));r.y=Math.max(60,Math.min(H-30,r.y+input.y*290*dt));
 r.encounter.dropCooldown=Math.max(0,r.encounter.dropCooldown-dt);r.encounter.pause=Math.max(0,r.encounter.pause-dt);
 r.shot-=dt;if(r.auto&&r.shot<=0){r.shot=.8;this.combat.basic();}
 if(!this.options.preview&&(r.phase===0||r.phase===2)){r.spawn-=dt;const showcase=!!r.lastCard&&!r.encounter.showcaseDone&&r.phaseTime>=6;
 if(r.encounter.pause<=0&&(showcase||r.spawn<=0)){spawnFormation(r,()=>this.rand(),(kind,x)=>this.add(kind,x),showcase?showcaseTag(r):undefined);if(showcase)r.encounter.showcaseDone=true;r.spawn=encounterProfile(r.stage,r.growth).interval;if(r.lastCard&&!r.encounter.showcaseDone)r.spawn=Math.max(r.spawn,Math.max(0,6-r.phaseTime));}
 }
 if(!this.options.preview&&r.phase===3){r.encounter.support-=dt;if(r.encounter.pause<=0&&r.encounter.support<=0&&!r.enemies.some(e=>e.warning>0||(e.charge??0)>0||!!e.chargeState)){spawnFormation(r,()=>this.rand(),(kind,x)=>this.add(kind,x));r.encounter.support=encounterProfile(r.stage,r.growth,true).supportInterval;}}
 let shooterCount=0;for(const e of r.enemies)if(e.kind==='small'){e.shooter=(e.shooter??true)&&shooterCount<6;if(e.shooter)shooterCount++;}
 const smallBullets=r.bullets.filter(b=>b.enemy&&b.source==='small').length;let shotSlots=Math.max(0,18-smallBullets);

 for(const e of r.enemies){if(e.hp<=0)continue;const enemyPrevious={...previous,x:e.x,y:e.y};e.hit=Math.max(0,e.hit-dt);if(e.frozen>0){e.frozen=Math.max(0,e.frozen-dt);this.combat.shieldEnemy(e,enemyPrevious);continue}e.t+=dt;const charging=e.kind!=='small'&&this.moveDesert(e,dt);if(e.y<=30)e.fire=Math.max(.65,Number.isFinite(e.fire)?e.fire:.65);
 if(!charging&&e.y>30&&(e.kind!=='small'||(e.shooter&&shotSlots>0)))e.fire=Math.max(0,e.fire-dt);
 if(e.kind==='small'){e.y+=(e.variant===0?65:80)*dt;e.x=e.originX+Math.sin(e.t*(e.variant===0?.65:1.2))*(e.drift??(e.variant===0?40:110))}else if(!charging){e.y+=(110-e.y)*Math.min(1,dt*1.2);const targetX=W/2+Math.sin(e.t*.45)*(r.stage===1?130:230);e.x+=(targetX-e.x)*Math.min(1,dt*1.8)}
 if(e.warning>0&&!charging){e.warning-=dt;if(e.warning<=0){if(e.pattern===4){e.charge=1.4}else for(let i=-1;i<=1;i++)r.bullets.push({x:e.targetX+i*35,y:0,vx:0,vy:135,enemy:true,r:8})}}
 if(!charging&&e.fire<=0&&e.y>30&&(e.kind!=='small'||(e.shooter&&shotSlots>0))){this.attack(e);if(e.kind==='small')shotSlots--;e.fire=e.kind==='small'?4.5:3.2}
 this.combat.shieldEnemy(e,enemyPrevious);if(e.hp<=0)continue;
 if(Math.hypot(e.x-r.x,e.y-r.y)<(e.kind==='small'?33:75)){this.damage();if(r.mode!=='playing')return;}}
 for(const b of r.bullets){const bx=b.x,by=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.enemy){if(this.combat.shieldHit(b.x,b.y,b.r,{...previous,x:bx,y:by})){b.y=999;continue}if(Math.hypot(b.x-r.x,b.y-r.y)<18+b.r){b.y=999;this.damage();if(r.mode!=='playing')return}}else{const hit=r.enemies.find(e=>Math.hypot(e.x-b.x,e.y-b.y)<(e.kind==='small'?25:e.kind==='mini'?48:70));if(hit){hit.hp-=b.damage??2;hit.hit=.1;b.y=-999}}}
 r.bullets=r.bullets.filter(b=>b.y>-60&&b.y<H+30&&b.x>-40&&b.x<W+40);r.enemies=r.enemies.filter(e=>e.y<H+80);
 for(const c of r.capsules){c.y+=(c.speed??42)*dt;if(Math.hypot(c.x-r.x,c.y-r.y)<42){r[c.kind]=3;const slot=c.kind==='fire'?0:1;this.feedback.push({kind:'pickup',craft:r.craft,weapon:c.kind,level:0,x:c.x,y:c.y,slot});if(r.effects.length<50)r.effects.push({x:c.x,y:c.y,kind:'pickup',t:0,slot});c.y=999;this.events.push('pickup')}}r.capsules=r.capsules.filter(c=>c.y<H+30);
 for(const b of r.bombs){b.elapsed+=dt;const t=Math.min(1,b.elapsed/b.duration);b.x=b.startX+(b.targetX-b.startX)*t;b.y=b.startY+(b.targetY-b.startY)*t;if(t===1)this.explode(b)}r.bombs=r.bombs.filter(b=>b.elapsed<b.duration);
 this.updateSupply(dt);this.combat.update(dt);
 for(const fx of r.effects)fx.t+=dt;r.effects=r.effects.filter(f=>f.t<(f.kind==='gun'?.14:f.kind==='contact'||f.kind==='block'?.24:f.kind==='pickup'?.55:f.kind==='destroy'||f.kind==='burst'?.4:1));this.removeDead();
 }
}
/** Persist this with the run snapshot, so a reload cannot credit the same kill twice. */
export function settleScore(save:Save){const r=save.run;if(!r)return;const delta=Math.max(0,r.adventureScore-r.creditedScore);save.points+=delta;r.creditedScore=r.adventureScore;}
export function grantReward(save:Save){const r=save.run;if(!r||!(r.mode==='clear'||(r.mode==='cards'&&r.reward?.kind==='clear'))||r.rewarded||save.lastReward===r.id)return false;if(save.gems.includes(r.stage))r.adventureScore+=100;else save.gems.push(r.stage);save.gems.sort((a,b)=>a-b);save.reached=Math.min(10,Math.max(save.reached,r.stage+1));advanceCampaign(save,r);r.rewarded=true;save.lastReward=r.id;settleScore(save);return true}
export function spendTime(save:Save,seconds:number,visible:boolean){if(visible)save.remaining=Math.max(0,save.remaining-seconds);return save.remaining===0}

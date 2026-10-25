import {Engine} from './engine';
import {newRun,W,H,type Run,type Shot} from './data';
import {basicTag,specialTag,basicCap,weapon,specialScale,ultimateCap,type AttackTag,type Track} from './arsenal';

/** Both views receive the same targets, health and seed. Only the chosen ability changes. */
export function previewTargets(tag:AttackTag){
 switch(tag){
  case 'pierce':return [[500,380],[500,320],[500,260]];
  case 'split':return [[500,380],[460,285],[500,265],[540,285]];
  case 'area':return [[270,310],[500,320],[730,310]];
  case 'friends':return [[435,310],[565,310],[435,265],[565,265]];
  case 'leader':return [[500,290]];
  case 'gentle':return [[440,350]];
  default:return [[500,365],[455,280],[545,280]];
 }
}
// Small, fixed practice formations expose side routes and the third friend's
// crossing lane. The two simulations always receive the exact same lesson.
const lessonLanes=[[400,340],[500,340],[600,340],[300,220],[400,220],[500,220],[600,220],[700,220]];
const lessonFriends=[[435,310],[565,310],[500,265],[400,190],[435,190],[565,190],[600,190]];
const lessonClose=[[435,370],[500,370],[565,370],[400,280],[500,240],[600,280]];
// Durable targets make the extra ultimate hit/wing visible instead of both
// sides clearing the same fragile center target. Values are practice health,
// not a change to any enemy's campaign health or to the attack itself.
const ultimateLessons:Record<string,{health:[number,number],lanes?:boolean}>={
 '3':{health:[24,32]},'4':{health:[58,24]},'6':{health:[24,32],lanes:true},
 '1':{health:[44,58]},'5':{health:[58,48]},'6b':{health:[8,48]},
};
function previewHealth(source:Run,track:Track){
 const next=source.growth[track]+1;
 if(track==='ultimate')return ultimateLessons[source.craft]?.health[Math.min(1,next-1)]??(source.craft==='2'&&next===2?48:Math.ceil(ultimateCap[Math.min(2,next)]*.6));
 if(track==='friend')return next===3?5:3;
 if(track==='shield')return 4;
 if(track==='basic')return Math.max(3,Math.min(4,Math.ceil(basicCap[Math.min(3,next)]/2)));
 const special=weapon(source.craft).specials[track==='special1'?0:1];
 if(special.key==='root')return Math.max(5,Math.ceil(special.damage*.75));
 // Halfway between the real adjacent tiers keeps damage growth visible.
 return Math.ceil((special.style==='missile'?special.cap:special.damage)*(specialScale[next-1]+specialScale[next])/2);
}
function lessonTargets(source:Run,track:Track,tag:AttackTag){
 const next=source.growth[track]+1;
 if(track==='friend'&&next===4)return lessonLanes;
 if(track==='ultimate'){
  const lesson=ultimateLessons[source.craft];
  if(lesson)return lesson.lanes||(['4','1'].includes(source.craft)&&next===2)?lessonLanes:lessonFriends;
  if(source.craft==='2'&&next===2)return lessonLanes;
 }
 if(track.startsWith('special')){
  const key=weapon(source.craft).specials[track==='special1'?0:1].key;
  if(key==='fork'||key==='rain')return lessonLanes;
  if(['star','shuriken','windblade'].includes(key))return lessonClose;
 }
 return previewTargets(tag);
}
export function createPreviewPair(source:Run,track:Track){
 const next={...source.growth,[track]:source.growth[track]+1};
 const tag=track==='friend'?'friends':track==='shield'?'gentle':track==='ultimate'?'area':track.startsWith('special')?specialTag(source.craft,track==='special1'?0:1,next):basicTag(source.craft,next);
 const health=previewHealth(source,track);
 return [0,1].map(upgraded=>{
  const r=newRun(source.stage,source.craft);r.mode='playing';r.seed=73;r.growth={...source.growth};if(upgraded)r.growth[track]++;r.ultimate.level=r.growth.ultimate;
  // Unrelated companions and orbiters must not steal this ability's targets.
  if(track!=='friend')r.growth.friend=0;if(track!=='shield')r.growth.shield=0;
  r.spawn=1e6;r.phase=1;r.invuln=999;r.auto=track==='basic'||track==='friend';
  if(track==='friend')r.shot=1e6;
  const engine=new Engine(r,{preview:true});
  const targets=source.craft==='7'&&track==='special1'?[[500,360],[390,280],[610,280],[260,240],[740,240],[280,120],[720,120]]:source.craft==='7'&&track==='special2'?[[260,320],[500,320],[740,320],[170,240],[830,240]]:track==='shield'?[[440,270],[500,220],[560,270]]:lessonTargets(source,track,tag);
  if(source.craft==='7'&&track==='special1'&&next.special1===3)targets.push([100,90],[900,90]);
  targets.forEach(([x,y],i)=>{engine.add(tag==='leader'?'mini':'small',x);const e=r.enemies.at(-1)!;e.x=e.originX=x;e.y=y;e.variant=i%2;e.hp=e.max=tag==='leader'?Math.max(45,health):health;e.frozen=999;e.fire=999;e.shooter=false;e.drift=0;});
  return engine;
 });
}

export type PreviewBounds={left:number;top:number;right:number;bottom:number};
const openingDelay=.3,quietHold=.65;

/** Finish after the last real child/projectile/effect, not an arbitrary movie length. */
export class PreviewPlayback {
 engines:Engine[];elapsed=0;started=false;finished=false;
 private quiet=0;private shieldShots=0;private sound:(()=>void)|undefined;
 constructor(readonly source:Run,readonly track:Track,readonly compare=true){
  this.engines=createPreviewPair(source,track).slice(0,compare?2:1);
  this.engines.forEach(e=>{e.r.auto=false;});
 }
 get emissionDuration(){return this.track==='friend'?3.3:this.track==='basic'?2.6:this.track==='shield'?2.7:0;}
 onAfterStart(callback:()=>void){this.sound=callback;}
 step(dt:number){
  if(this.finished)return;
  this.elapsed+=dt;
  if(!this.started&&this.elapsed>=openingDelay){
   this.started=true;
   this.engines.forEach((e,i)=>{
    if(this.track==='ultimate')e.combat.ultimate();
    else if(this.track.startsWith('special'))e.bomb(this.track==='special1'?'fire':'ice');
    else e.r.auto=this.track==='basic'||this.track==='friend';
    // Automatic loops are silent. A gesture arms exactly the upgraded side once.
    if(i===(this.compare?1:0)){this.sound?.();this.sound=undefined;}
   });
  }
  const age=this.elapsed-openingDelay;
  if(this.started&&age>=this.emissionDuration)this.engines.forEach(e=>{e.r.auto=false;});
  if(this.track==='shield'&&this.started&&age<this.emissionDuration){
   const count=Math.floor(age/.3)+1;
   while(this.shieldShots<count){const x=500+[-42,0,42][this.shieldShots%3];
    for(const e of this.engines)e.r.bullets.push({x,y:170,vx:0,vy:280,r:6,enemy:true});
    this.shieldShots++;
   }
  }
  for(const e of this.engines){e.step(dt,{x:0,y:0});e.events.length=0;e.feedback.length=0;}
  const active=this.engines.some(e=>e.r.attacks.length||e.r.scheduled.length||e.r.bullets.length||e.r.effects.length);
  if(this.started&&age>=this.emissionDuration&&!active)this.quiet+=dt;else this.quiet=0;
  this.finished=this.quiet>=quietHold;
 }
}

function include(bounds:PreviewBounds,x:number,y:number,halfWidth:number,halfHeight=halfWidth,apron=false){
 // A practice-board apron reveals live branch tips at the battlefield edge.
 // This changes the shared camera only, never positions, timing or collision.
 const edge=apron?180:0,bottom=apron?H+80:H;
 if(x+halfWidth<-edge||x-halfWidth>W+edge||y+halfHeight<-edge||y-halfHeight>bottom)return;
 bounds.left=Math.min(bounds.left,Math.max(-edge,x-halfWidth));bounds.right=Math.max(bounds.right,Math.min(W+edge,x+halfWidth));
 bounds.top=Math.min(bounds.top,Math.max(-edge,y-halfHeight));bounds.bottom=Math.max(bounds.bottom,Math.min(bottom,y+halfHeight));
}
function includeShot(bounds:PreviewBounds,s:Shot){
 if(s.style==='root'){include(bounds,(s.sx+s.x)/2,(s.sy+s.y)/2,Math.abs(s.x-s.sx)/2+s.r,Math.abs(s.y-s.sy)/2+s.r,true);return;}
 if(s.style==='wave'){include(bounds,s.x,s.y,s.radius);return;}
 const halfWidth=(s.width??s.size)/2,halfHeight=(s.height??s.size*(s.key==='pencil'||s.key==='spear'?1.7:1))/2;
 const diagonal=s.spin?Math.hypot(halfWidth,halfHeight):0;
 include(bounds,s.x,s.y,diagonal||halfWidth,diagonal||halfHeight,s.key==='log'||(s.key==='leaf'&&s.size>=100));
}
const boundsCache=new Map<string,PreviewBounds>();
/** Scout both real simulations once, then hold one camera for their complete visible paths. */
export function previewBounds(source:Run,track:Track,compare=true):PreviewBounds {
 const key=JSON.stringify([source.stage,source.craft,source.growth,track,compare]),cached=boundsCache.get(key);if(cached)return cached;
 const bounds:PreviewBounds={left:420,top:320,right:580,bottom:510},playback=new PreviewPlayback(source,track,compare);
 for(const e of playback.engines)for(const target of e.r.enemies)include(bounds,target.x,target.y,target.kind==='mini'?76:39);
 // Existing attacks expire. Ten seconds guards against a future accidental infinite emitter.
 for(let frame=0;frame<600&&!playback.finished;frame++){
  playback.step(1/60);
  for(const e of playback.engines){for(const shot of e.r.attacks)includeShot(bounds,shot);for(const b of e.r.bullets)include(bounds,b.x,b.y,b.r);}
 }
 bounds.left=Math.max(-200,bounds.left-22);bounds.right=Math.min(W+200,bounds.right+22);bounds.top=Math.max(-200,bounds.top-30);bounds.bottom=Math.min(H+100,bounds.bottom+18);
 if(boundsCache.size>=32)boundsCache.delete(boundsCache.keys().next().value!);
 boundsCache.set(key,bounds);return bounds;
}

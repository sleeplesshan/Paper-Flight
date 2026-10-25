import type {CombatFeedback} from './feedback';
import {H,W,type Run,type Shot,type Enemy,type AttackGroup} from './data';
import {weapon,basicSpreadPower,basicCap,specialScale,utensilSize,rootGrowth,logGrowth,shieldConfig,ultimateCap} from './arsenal';
export function segmentDistance(px:number,py:number,x:number,y:number,xx:number,yy:number){const dx=xx-x,dy=yy-y,t=Math.max(0,Math.min(1,((px-x)*dx+(py-y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(px-x-t*dx,py-y-t*dy)}
/** First contact of a moving circle against a target circle, in [0, 1]. */
export function segmentEntry(px:number,py:number,radius:number,x:number,y:number,xx:number,yy:number):number|null {
 const dx=xx-x,dy=yy-y,ox=x-px,oy=y-py,c=ox*ox+oy*oy-radius*radius;
 if(c<=0)return 0;const a=dx*dx+dy*dy;if(a===0)return null;
 const b=2*(ox*dx+oy*dy),disc=b*b-4*a*c;if(disc<0)return null;
 const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:null;
}
/** Swept horizontal capsule: long logs keep a stable silhouette and collision area. */
function rectangleEntry(left:number,top:number,right:number,bottom:number,x:number,y:number,xx:number,yy:number){
 let enter=0,exit=1;for(const [p,d,min,max] of [[x,xx-x,left,right],[y,yy-y,top,bottom]]){if(Math.abs(d)<1e-10){if(p<min||p>max)return null;continue}const a=(min-p)/d,b=(max-p)/d;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));if(enter>exit)return null}return enter;
}
export function shotEntry(e:Enemy,s:Shot,x:number,y:number){
 if(!s.width||!s.height)return segmentEntry(e.x,e.y,enemyRadius(e)+s.r,x,y,s.x,s.y);
 const height=s.height,width=s.width,horizontal=width>=height,radius=Math.min(width,height)/2+enemyRadius(e),half=Math.abs(width-height)/2;
 const candidates=(horizontal?[rectangleEntry(e.x-half,e.y-radius,e.x+half,e.y+radius,x,y,s.x,s.y),segmentEntry(e.x-half,e.y,radius,x,y,s.x,s.y),segmentEntry(e.x+half,e.y,radius,x,y,s.x,s.y)]:[rectangleEntry(e.x-radius,e.y-half,e.x+radius,e.y+half,x,y,s.x,s.y),segmentEntry(e.x,e.y-half,radius,x,y,s.x,s.y),segmentEntry(e.x,e.y+half,radius,x,y,s.x,s.y)]).filter((t):t is number=>t!==null);
 return candidates.length?Math.min(...candidates):null;
}
function contacts(enemies:Enemy[],s:Shot,x:number,y:number){
 const hits:{e:Enemy,t:number,d:number}[]=[];
 for(const e of enemies){if(e.hp<=0||s.hits.includes(e.id))continue;const t=shotEntry(e,s,x,y);if(t!==null)hits.push({e,t,d:(e.x-x)**2+(e.y-y)**2});}
 return hits.sort((a,b)=>a.t-b.t||a.d-b.d||a.e.id-b.e.id);
}
export function canTelegraph(e:Enemy,smallBulletCount:number){return e.y>30&&e.y<H+35&&Number.isFinite(e.fire)&&e.fire>=0&&e.fire<.65&&e.frozen<=0&&(e.kind!=='small'||(e.shooter&&smallBulletCount<18));}
export class Combat {
 constructor(public r:Run,private emit:(name:'gun'|'fire'|'ice')=>void=()=>{},private feedback:(event:CombatFeedback)=>void=()=>{}){}
 signal(kind:CombatFeedback['kind'],key:string,level:number,x:number,y:number,target?:CombatFeedback['target']){this.feedback({kind,weapon:key,craft:this.r.craft,level,x,y,target})}
 group(cap:number,once=false,source:'normal'|'ultimate'='normal'){const g:AttackGroup={id:this.r.nextAttackId++,cap,hits:{},once,kills:0,source};this.r.groups.push(g);return g.id}
 shot(group:number,key:string,x:number,y:number,over:Partial<Shot>={},delay=0){const s:Shot={id:this.r.nextAttackId++,group,key,ultimate:this.r.groups.find(g=>g.id===group)?.source==='ultimate',style:'linear',x,y,sx:x,sy:y,vx:0,vy:-500,age:0,life:2,damage:4,r:10,size:26,pierce:1,hits:[],angle:0,spin:0,zig:0,period:.7,split:0,child:false,freeze:0,radius:0,level:0,range:260,targetX:x,targetY:y-260,triggered:false,...over};for(const key of Object.keys(s) as (keyof Shot)[])if(s[key]===undefined)delete s[key];if(delay)this.r.scheduled.push({due:this.r.time+delay,shot:s,originX:this.r.x,originY:this.r.y});else this.r.attacks.push(s);return s}
 basic(x=this.r.x,y=this.r.y-35,friend=false){const r=this.r,w=weapon(r.craft),level=friend?0:r.growth.basic;
 if(friend){const evolved=r.growth.friend>=3,third=r.growth.friend===4&&x===r.x,volley=evolved&&!third&&r.friendVolley%3===0;
 const group=this.group(volley?2.4:1.2),cross=third?(r.friendVolley%2?.14:-.14):0;
 for(const a of volley?[-.12,0,.12]:[cross])this.shot(group,evolved?w.key:'pencil',x,y,{vx:Math.sin(a)*500,vy:-Math.cos(a)*500,damage:volley&&a!==0?.6:1.2,size:evolved&&r.craft==='6'?40:18});return}

 const group=this.group(basicCap[level]),budget=basicSpreadPower[level],pierce=level>=2&&['3','4','6','2'].includes(r.craft)?3:1;
 let count=level===0?1:level===3?(['4','2'].includes(r.craft)?3:5):(['4','1','2','6b'].includes(r.craft)?2:3);
 const split=level>=2&&['7','1','5','6b'].includes(r.craft)?(r.craft==='5'?2:3):0;
 const big=level>=2;let angles:number[];
 if(r.craft==='6'){count=level===3?9:3;angles=level===3?[-.36,-Math.PI/10,-.18,-.09,0,.09,.18,Math.PI/10,.36]:[-Math.PI/10,0,Math.PI/10];}
 else angles=Array.from({length:count},(_,i)=>(i-(count-1)/2)*(['4','1','2','6b'].includes(r.craft)?0:.13));
 const cycles=r.craft==='6'&&level>0&&level<3?2:1;
 for(let cycle=0;cycle<cycles;cycle++)angles.forEach((a,i)=>{
 const key=r.craft==='6'?['fork','knife','spoon'][i%3]:w.key,center=i===Math.floor(count/2),single=count===1;
 // Keep the central lane at least as strong as its previous form, while side lanes gain coverage.
 const parallel=['4','1','2','6b'].includes(r.craft),offset=parallel&&level>0?(level===3?(count===3?[-10,0,10]:[-30,-10,0,10,30])[i]:[-10,10][i]):0;
 let damage=single?budget:r.craft==='6'?(level===0?(center?2.4:.8):center?(level===3?6:level===1?2.4:3):level===3?(Math.abs(a)===Math.PI/10?1.6:2.8/6):.8):parallel?(level===3&&Math.abs(offset)===30?2:4):(center?4:(budget-4)/(count-1));
 this.shot(group,key,x+offset,y,{vx:Math.sin(a)*w.speed,vy:-Math.cos(a)*w.speed,damage,size:r.craft==='6'?utensilSize(level):big?42:parallel&&level===1?30:26,r:r.craft==='6'?(big?18:12):big?16:parallel&&level===1?12:10,pierce,spin:['propeller','star','wind'].includes(key)?6:0,zig:key==='leaf'||(key==='star'&&level===3&&Math.abs(offset)===30)?12:0,split,level,life:2.5},cycle*.14);
 });this.emit('gun');this.signal('launch',w.key,level,x,y);
 }
 special(slot:0|1){const r=this.r,ammo=slot===0?'fire':'ice';if(r.mode!=='playing'||r.bossIntro||r.cinematic||r[ammo]<=0)return false;r[ammo]--;
 const s=weapon(r.craft).specials[slot],level=r.growth[slot===0?'special1':'special2'],scale=specialScale[level],once=['blast','root','line'].includes(s.style),group=this.group(s.cap*scale,once),x=r.x,y=r.y-35;
 const base:Partial<Shot>={damage:s.damage*scale,r:s.key==='fork'?14:s.width/2,size:s.width,level,radius:s.radius,freeze:s.key==='icebomb'?2:0,vy:-s.speed,life:2,art:level===3&&s.key!=='fork'?`/assets/attacks/final-${s.key}.webp`:undefined};
 if(s.style==='blast'){
 const count=s.key==='icebomb'?1:s.key==='soundbomb'?(level>=2?3:1):level>0?3:1;
 let targetX=x,targetY=Math.max(15,y-260);if(s.key==='firebomb'||s.key==='icebomb'){let nearest:Enemy|undefined,dist=Infinity;for(const e of r.enemies){const d=Math.hypot(e.x-x,e.y-y);if(e.y>=0&&e.y<y-10&&d<dist){nearest=e;dist=d}}if(nearest){targetX=nearest.x;targetY=nearest.y}}
 // Keep the original tray's arrival time as well as the twin trays' side paths.
 const offsets=s.key==='tray'&&level>0?[0,-45,45]:Array.from({length:count},(_,i)=>(i-(count-1)/2)*90);
 for(const offset of offsets){const tx=Math.max(30,Math.min(W-30,targetX+offset)),ty=targetY,life=Math.max(.45,Math.min(.95,Math.hypot(tx-x,ty-y)/s.speed));this.shot(group,s.key,x,y,{...base,style:'bomb',targetX:tx,targetY:ty,life,spin:s.key==='tray'?4:0,behavior:level===3&&s.key==='meteor'?'constellation':undefined,radius:s.key==='soundbomb'&&level>0?s.radius*1.25:s.radius});}
 }else if(s.style==='missile'){
 // Each tier retains the earlier lanes and their damage. The shared per-enemy
 // cap, rather than division by projectile count, bounds a concentrated salvo.
 const lanes=level===0?[-14,14]:level===3?[-70,-42,-14,14,42,70]:[-42,-14,14,42];
 for(const dx of lanes)this.shot(group,s.key,x+dx,y,{...base,life:2});
 if(level>=2)for(const dx of [-14,14])this.shot(group,s.key,x+dx,y,{...base,life:2},.18);
 }else if(s.style==='root'){
 const shape=rootGrowth[level];for(const a of shape.angles)this.shot(group,s.key,x,r.y+15,{...base,style:'root',angle:a,life:shape.life,range:560,vy:-700,spin:0,r:shape.width/2,size:shape.width});
 }else if(s.key==='log'){
 for(const shape of logGrowth[level])this.shot(group,s.key,x+shape.x,y+shape.y,{...base,width:shape.width,height:shape.height,size:shape.width,r:shape.height/2,pierce:99,spin:0,life:2,behavior:level===3&&shape.x===0?'phoenix':undefined});
 }else if(s.style==='line'){
 if(s.key==='vortex'){
  for(const dx of level?[0,-20,20]:[0])this.shot(group,s.key,x+dx,y,{...base,pierce:99,spin:5});
  if(level>=2)this.shot(group,s.key,x,y,{...base,pierce:99,spin:5},.18);
  if(level===3)for(const side of [-1,1])this.shot(group,s.key,x+side*45,y,{...base,pierce:99,spin:5,size:s.width*1.5,behavior:'helix',angle:side<0?0:Math.PI,zig:55,period:.85},.36);
 }else{const count=level?3:1;for(let i=0;i<count;i++){const angle=(i-(count-1)/2)*.16;this.shot(group,s.key,x,y,{...base,vx:Math.sin(angle)*s.speed,vy:-Math.cos(angle)*s.speed,pierce:99,split:level>=2?2:0,range:180,size:level===3?s.width*1.5:s.width,behavior:level===3?'crane':undefined});}}
 }else{
 const rain=s.style==='rain',count=rain?(level?5:3):s.count,cycles=rain?(level>=2?3:2):level?2:1;
 for(let k=0;k<cycles;k++)for(let i=0;i<count;i++){const a=rain?0:(i-(count-1)/2)*(count===7?.2327:.19)+(k%2?.045:-.045),key=s.key==='fork'?['fork','knife','spoon'][i%3]:s.key;this.shot(group,key,x+(rain?(i-(count-1)/2)*35:0),y,{...base,vx:Math.sin(a)*s.speed,vy:-Math.cos(a)*s.speed,spin:['star','shuriken'].includes(key)?5:0,angle:a},k*.2)}
 if(level>=2&&!rain)for(let i=-1;i<=1;i++)this.shot(group,s.key==='fork'?['fork','knife','spoon'][i+1]:s.key,x+i*40,y,{...base,size:s.width*1.7,r:s.width*.7,pierce:3,spin:s.key==='star'?5:0},.3);
 if(level===3){
  if(rain){for(let k=0;k<cycles;k++)for(const side of [-1,1])this.shot(group,s.key,x+side*105,y,{...base,vx:side*75,behavior:'curve',zig:side*18,period:1.3},k*.2);}
  else{
   for(let i=-1;i<=1;i++)this.shot(group,s.key==='fork'?['fork','knife','spoon'][i+1]:s.key,x+i*70,y+Math.abs(i)*28,{...base,size:s.width*(i===0?2.65:1.85),r:s.width*(i===0?.9:.7),vx:i*90,pierce:3,spin:s.key==='star'?5:0},.3);
   if(['star','shuriken','windblade'].includes(s.key))for(let i=0;i<count;i++){const a=(i-(count-1)/2)*.19;this.shot(group,s.key,x,y,{...base,vx:Math.sin(a)*s.speed,vy:-Math.cos(a)*s.speed,spin:s.key==='windblade'?0:5,behavior:s.key==='windblade'?'curve':'orbit',releaseAge:.3,angle:a,zig:s.key==='windblade'?30:0,period:1.3});}
  }
 }
 }
 this.emit(slot===0?'fire':'ice');this.signal('launch',s.key,level,x,y);return true;
 }
 /** The cut-in consumes the gauge in Engine; this method only creates traveling attacks. */
 ultimate(){
  const r=this.r,level=Math.max(0,Math.min(2,r.ultimate.level)),cap=ultimateCap[level],group=this.group(cap,false,'ultimate'),x=r.x,y=r.y-30;
  const common:Partial<Shot>={damage:cap*.55,level,ultimate:true,art:`/assets/ultimates/${r.craft}-attack.webp`,pierce:99,life:2.1,vy:-330,size:160,r:58};
  const fire=(key:string,dx:number,over:Partial<Shot>={},delay=0)=>this.shot(group,key,x+dx,y,{...common,...over},delay);
  if(r.craft==='3'){
   fire('pencil',0,{damage:cap,width:74,height:160,size:96,vy:-400,behavior:level===2?'crane':undefined,range:180});
   if(level)for(const side of [-1,1])fire('pencil',side*72,{damage:cap*.45,width:38,height:110,size:62,vy:-400});
  }else if(r.craft==='4'){
   fire('propeller',0,{spin:5,damage:cap,behavior:level===2?'constellation':undefined,radius:105});
   if(level)for(const side of [-1,1])fire('propeller',side*70,{damage:cap*.35,size:72,r:29,spin:-7,zig:48,period:.8,angle:side<0?0:Math.PI,behavior:'helix'});
  }else if(r.craft==='6'){
   fire('tray',0,{damage:cap*.45,width:level?440:310,height:100,size:level?440:310,r:50,vy:-245,behavior:'cloud',life:1.6});
  }else if(r.craft==='7'){
   fire('log',0,{damage:cap*.7,width:560+level*60,height:115,size:560+level*60,r:57,vy:-260,behavior:level?'phoenix':undefined});
   fire('root',0,{style:'root',damage:cap*.3,angle:0,size:120,r:60,range:560,life:1.3,vy:-700,art:undefined});
  }else if(r.craft==='1'){
   for(const dx of level?[-115,0,115]:[0])fire('star',dx,{damage:cap*.55,size:dx?86:155,r:dx?32:58,spin:2,behavior:'constellation',radius:75});
  }else if(r.craft==='2'){
   for(const dx of level===2?[-115,0,115]:[0])fire('vortex',dx,{damage:cap*.65,spin:4,behavior:level===2?'constellation':undefined,radius:100});
   if(level)for(const side of [-1,1])fire('windblade',side*80,{size:84,r:31,damage:cap*.25,zig:65,period:.95,angle:side<0?0:Math.PI,behavior:'helix'});
  }else if(r.craft==='5'){
   fire('arrow',0,{damage:cap*.25,size:85,r:30,vy:-410,behavior:'crane',range:120});
  }else{
   const count=level===2?3:1;
   for(let i=0;i<count;i++)fire('bubble',0,{style:'bomb',damage:cap*.4,size:110,r:45,targetX:x+(i-(count-1)/2)*180,targetY:y-230,life:.65,radius:105,behavior:'cloud'});
  }
  return group;
 }
 /** Descendants inherit the attack group and its damage budget, including after save/restore. */
 child(parent:Shot,key:string,over:Partial<Shot>={}){
  return this.shot(parent.group,key,parent.x,parent.y,{damage:parent.damage,level:parent.level,child:true,ultimate:parent.ultimate,life:1.2,art:undefined,...over});
 }
 trail(s:Shot){
  const r=this.r,isUltimate=!!s.ultimate;
  // Pulse counts are persisted. Resuming mid-flight cannot create the same branches twice.
  if(s.behavior==='constellation'){
   const every=.24,max=isUltimate?4:3,amount=Math.min(max,Math.floor(s.age/every));
   if(amount>(s.pulse??0)){s.pulse=amount;
    if(s.key==='meteor'||s.key==='star'){
     const step=Math.min(80,s.age*Math.abs(s.vy||330));
     this.child(s,'star',{style:'root',sx:s.x,sy:s.y+step,x:s.x,y:s.y+step,angle:0,range:step,size:30,r:15,life:.35,damage:isUltimate?s.damage*.35:s.damage,spin:0});
     if(isUltimate&&s.level===2)for(const a of [-.28,.28])this.child(s,'star',{damage:s.damage*.4,size:33,r:12,vx:Math.sin(a)*410,vy:-Math.cos(a)*410,spin:5});
    }else this.child(s,'wind',{style:'wave',radius:s.radius||90,damage:s.damage*.4,life:.4,triggered:true});
   }
  }
  if(s.behavior==='cloud'&&s.style==='linear'){
   const every=.3,count=s.ultimate&&s.level>0?5:3,max=4,amount=Math.min(max,Math.floor(s.age/every));
   if(amount>(s.pulse??0)){s.pulse=amount;
    for(let i=0;i<count;i++){
     const utensil=s.key==='tray',angle=(i-(count-1)/2)*.19,key=utensil?['spoon','fork','knife'][i%3]:'drop',curve=!utensil&&s.ultimate&&s.level>0&&Math.abs(i-(count-1)/2)>1;
     this.child(s,key,{damage:s.damage*.38,size:utensil?76:35,r:utensil?17:12,vx:Math.sin(angle)*420,vy:-Math.cos(angle)*420,spin:utensil?1.5:0,life:1.6,behavior:curve?'curve':undefined,zig:curve?22:0,period:1.2});
    }
    if(s.key==='tray'&&s.ultimate&&s.level===2)for(const side of [-1,1]){const x=s.x+side*(s.width??440)*.3,angle=-side*.32;this.child(s,['spoon','fork','knife'][(amount+(side>0?1:0))%3],{x,sx:x,damage:s.damage*.38,size:76,r:17,vx:Math.sin(angle)*420,vy:-Math.cos(angle)*420,spin:1.5,life:1.6});}
   }
  }
  if(s.behavior==='phoenix'&&!s.triggered&&s.age>=.32){
   s.triggered=true;
   if(s.key==='log')for(const sign of [-1,1]){const x=s.x+sign*(s.width??s.size)*.38,y=s.y+35;this.child(s,'log',{x,sx:x,y,sy:y,damage:s.ultimate?s.damage*.65:s.damage,width:320,height:78,size:320,r:39,vx:sign*95,vy:s.vy,life:1.5,pierce:99});}
   else for(let i=-3;i<=3;i++)this.child(s,s.key,{damage:s.damage,size:50,r:17,vx:Math.sin(i*.26)*330,vy:-Math.cos(i*.26)*330,behavior:'curve',zig:18,period:1.2});
  }
  if(s.behavior==='crane'&&!s.triggered&&Math.hypot(s.x-s.sx,s.y-s.sy)>=s.range){
   s.triggered=true;
   if(isUltimate&&r.craft==='5'){
    const count=s.level?5:3;
    for(let i=0;i<count;i++){const a=(i-(count-1)/2)*.16;this.child(s,'spear',{damage:s.damage*3,size:i===Math.floor(count/2)?145:100,r:30,vx:Math.sin(a)*340,vy:-Math.cos(a)*340,pierce:3,art:s.art,behavior:s.level===2?'phoenix':undefined,triggered:false});}
    s.age=s.life+1;
   }else if(isUltimate&&r.craft==='3'){
    for(let i=-3;i<=3;i++)this.child(s,'pencil',{damage:s.damage*.35,size:38,r:11,vx:Math.sin(i*.18)*460,vy:-Math.cos(i*.18)*460,pierce:3});
   }else for(const side of [-1,1])this.child(s,'spear',{damage:s.damage,size:80,r:24,vx:side*170,vy:-420,pierce:3,art:s.art});
  }
 }
 damage(s:Shot,e:Enemy){if(e.hp<=0||s.hits.includes(e.id))return false;const g=this.r.groups.find(g=>g.id===s.group);if(!g)return false;const previous=g.hits[e.id]??0;if(g.once&&previous>0)return false;const amount=Math.max(0,Math.min(s.damage,g.cap-previous));if(amount<=0)return false;s.hits.push(e.id);g.hits[e.id]=previous+amount;e.hp-=amount;e.hit=.12;this.signal(s.freeze&&e.frozen<=0?'freeze':'impact',s.key,s.level,e.x,e.y,e.kind);if(this.r.effects.length<50)this.r.effects.push({x:e.x,y:e.y,kind:'contact',t:0,size:e.kind==='small'?42:60,color:weapon(this.r.craft).color});if(s.freeze)e.frozen=Math.max(e.frozen,s.freeze);if(e.hp<=0){e.killedBy=g.id;e.killSource=g.source??'normal';g.kills++;if(g.kills>=3)this.r.combo={count:g.kills,t:.7};}return true;}
 bloom(s:Shot){const r=this.r;this.emit(s.key==='icebomb'?'ice':'fire');this.signal('branch',s.key,s.level,s.x,s.y);
 this.child(s,s.key,{...s,id:r.nextAttackId++,style:'wave',sx:s.x,sy:s.y,x:s.x,y:s.y,age:0,life:s.key==='soundbomb'?.45:.4,hits:[],vx:0,vy:0,triggered:true,spin:0,behavior:undefined});
 if(s.key==='soundbomb'&&s.level===3)this.child(s,s.key,{style:'wave',radius:s.radius,damage:s.damage,life:.6,vy:-240,triggered:true,behavior:'curve'});
 if(r.effects.length<50)r.effects.push({x:s.x,y:s.y,kind:s.key==='icebomb'?'ice':'burst',t:0,size:s.radius*2});
 if(s.key==='icebomb'&&s.level>0){for(let i=0;i<6;i++){const a=i*Math.PI/3;this.child(s,'icebomb',{damage:s.damage,size:20,r:9,vx:Math.sin(a)*230,vy:Math.cos(a)*230,life:.45,freeze:2,level:s.level,radius:55});}}
 else if(s.key==='bubble'&&(s.level===3||s.ultimate)){
  this.child(s,'drop',{size:s.ultimate?150:105,r:25,vy:-45,damage:s.damage,life:1.5,behavior:'cloud',art:s.ultimate?s.art:'/assets/attacks/final-bubble.webp',pierce:99});
 }
 if(!s.ultimate&&s.level>=2&&['firebomb','tray','meteor','bubble'].includes(s.key)){
  const key=s.key==='tray'?'fork':s.key==='meteor'?'star':s.key==='bubble'?'drop':'firebomb';
  for(let i=0;i<5;i++){const a=(i-2)*.3;this.child(s,s.key==='tray'?['spoon','fork','knife'][i%3]:key,{damage:s.damage,size:s.key==='tray'?58:s.level===3?44:22,vx:Math.sin(a)*350,vy:-Math.cos(a)*350,life:1.3});}
  if(s.level===3&&s.key==='firebomb')for(const a of [-.76,-.38,.38,.76])this.child(s,key,{damage:s.damage,size:44,vx:Math.sin(a)*350,vy:-Math.cos(a)*350,life:1.3,behavior:'curve',zig:25,period:1.2});
  if(s.level===3&&s.key==='tray')this.child(s,'tray',{damage:s.damage,width:420,height:100,size:420,r:50,vy:-230,pierce:99,life:1.2,art:s.art,behavior:'cloud'});
 }
 }

 split(s:Shot,exclude?:number){this.signal('branch',s.key,s.level,s.x,s.y);const n=s.split;s.split=0;for(let i=0;i<n;i++){const a=(i-(n-1)/2)*.3,key=s.key==='leaf'?'seed':s.key;this.shot(s.group,key,s.x,s.y,{damage:s.damage*.5,size:17,r:7,vx:Math.sin(a)*430,vy:-Math.cos(a)*430,life:1.3,hits:exclude?[exclude]:[],child:true,level:0});}}
 update(dt:number){const r=this.r;
 for(const p of r.scheduled)if(p.due<=r.time){if(p.originX!==undefined&&p.originY!==undefined){const dx=r.x-p.originX,dy=r.y-p.originY;p.shot.x+=dx;p.shot.sx+=dx;p.shot.targetX+=dx;p.shot.y+=dy;p.shot.sy+=dy;p.shot.targetY+=dy;}r.attacks.push(p.shot);}r.scheduled=r.scheduled.filter(p=>p.due>r.time);
 const active=[...r.attacks];for(const s of active){const oldX=s.x,oldY=s.y;s.age+=dt;
 if(s.style==='bomb'){const t=Math.min(1,s.age/s.life);s.x=s.sx+(s.targetX-s.sx)*t;s.y=s.sy+(s.targetY-s.sy)*t;const contact=!['firebomb','icebomb'].includes(s.key)?contacts(r.enemies,s,oldX,oldY)[0]:undefined;if((t===1||contact)&&!s.triggered){if(contact){s.x=oldX+(s.x-oldX)*contact.t;s.y=oldY+(s.y-oldY)*contact.t;}s.triggered=true;this.bloom(s);s.age=s.life+1;}else this.trail(s);continue}
 if(s.style==='wave'){s.y=s.sy+s.vy*s.age;const radius=s.key==='soundbomb'?s.radius*Math.min(1,s.age/s.life):s.radius;for(const e of r.enemies)if(e.hp>0&&(s.behavior!=='curve'||e.y<=s.y+enemyRadius(e))&&Math.hypot(e.x-s.x,e.y-s.y)<radius+enemyRadius(e))this.damage(s,e);continue}
 if(s.style==='root'){
 const length=Math.min(s.range,s.age*700),tx=s.sx+Math.sin(s.angle)*length,ty=s.sy-Math.cos(s.angle)*length;s.x=tx;s.y=ty;
 for(const e of r.enemies)if(segmentDistance(e.x,e.y,s.sx,s.sy,tx,ty)<s.r+enemyRadius(e))this.damage(s,e);
 // Side branches must start inside the battlefield, not at the offscreen tip.
 // Only the central trunk branches: at most six branches per use, all sharing hits.
 if(s.key==='root'&&!s.child&&s.angle===0&&(s.level>=2||(s.ultimate&&s.level>=1))){
  const shape=rootGrowth[s.ultimate?3:s.level];
  const amount=shape.branchSteps.filter(step=>length>=step).length;
  for(let i=s.pulse??0;i<amount;i++){
   const distance=shape.branchSteps[i],x=s.sx,y=s.sy-distance;
   for(const sign of [-1,1])this.child(s,'root',{x,y,sx:x,sy:y,style:'root',angle:sign*shape.branchAngle,range:shape.branchLength,damage:s.damage,r:shape.branchWidth/2,size:shape.branchWidth,life:.95,art:undefined});
  }
  s.pulse=amount;
 }
 if(s.key==='root'&&s.child&&(s.level===3||(s.ultimate&&s.level===2))&&length===s.range&&!s.triggered){s.triggered=true;for(const a of [-.35,.35])this.child(s,'leaf',{damage:s.damage,size:144,r:44,vx:Math.sin(a)*280,vy:-Math.cos(a)*280,life:1.55,level:0,zig:18,art:'/assets/attacks/leaf-evolved.webp'});}
 continue}

 if(s.behavior==='orbit'){
  const release=s.releaseAge??.3,wait=Math.min(s.age,release),travel=Math.max(0,s.age-release),a=s.angle+wait*5;
  s.x=s.sx+Math.sin(a)*45*(wait/release)+s.vx*travel;s.y=s.sy-Math.cos(a)*45*(wait/release)+s.vy*travel;
 }else{
  const phase=s.behavior==='helix'?s.angle:0;
  s.x=s.sx+s.vx*s.age+(s.zig?(Math.sin(s.age*2*Math.PI/s.period+phase)-Math.sin(phase))*s.zig:0);s.y=s.sy+s.vy*s.age;
 }
 this.trail(s);
 if(s.key==='spear'&&s.split&&Math.hypot(s.x-s.sx,s.y-s.sy)>=s.range&&!s.triggered){s.triggered=true;const n=s.split;s.split=0;for(let i=0;i<n;i++){const a=Math.atan2(s.vx,-s.vy)+(i-.5)*.3;this.shot(s.group,'spear',s.x,s.y,{damage:s.damage,vx:Math.sin(a)*550,vy:-Math.cos(a)*550,size:28,r:12,pierce:99,child:true,life:1});}}
 const endX=s.x,endY=s.y;for(const {e,t} of contacts(r.enemies,s,oldX,oldY)){
  // Descendants pass a target already struck by their once-per-use group.
  // A forbidden repeat hit must not consume their lifetime or penetration.
  const group=s.child?r.groups.find(g=>g.id===s.group):undefined;
  if(group?.once&&(group.hits[e.id]??0)>0)continue;
  s.x=oldX+(endX-oldX)*t;s.y=oldY+(endY-oldY)*t;const dealt=this.damage(s,e);if(dealt&&s.split)this.split(s,e.id);if(!s.hits.includes(e.id))s.hits.push(e.id);if(s.hits.length>=s.pierce){s.age=s.life+1;break;}s.x=endX;s.y=endY;
 }
 if(s.key==='icebomb'&&s.child&&s.level>=2&&s.age>=s.life&&!s.triggered){s.triggered=true;this.child(s,'icebomb',{style:'wave',radius:55,damage:s.damage,freeze:2,life:.4,triggered:true});if(s.level===3)for(const a of [-.65,.65])this.child(s,'icebomb',{style:'root',angle:a,range:130,size:34,r:17,freeze:2,life:.4,triggered:true,damage:s.damage,art:'/assets/attacks/final-icebomb.webp'});}
 }
 r.attacks=r.attacks.filter(s=>s.age<=s.life&&(s.style==='wave'||s.style==='root'||(s.x>-150&&s.x<W+150&&s.y>-180&&s.y<H+150)));
 const live=new Set(r.attacks.map(s=>s.group));for(const p of r.scheduled)live.add(p.shot.group);r.groups=r.groups.filter(g=>live.has(g.id));
 if(r.growth.friend&&r.auto){r.friendShot-=dt;if(r.friendShot<=0){r.friendShot=.9;r.friendVolley++;this.basic(r.x-65,r.y-5,true);if(r.growth.friend>=2)this.basic(r.x+65,r.y-5,true);if(r.growth.friend===4)this.basic(r.x,r.y-65,true)}}
 for(let i=0;i<shieldConfig(r.growth.shield).count;i++)r.shields[i]=Math.max(0,(r.shields[i]??0)-dt);
 if(r.combo){r.combo.t-=dt;if(r.combo.t<=0)r.combo=null;}
 }
 /** Keep the shield visible and blocking; throttle its counterattack and ramming. */
 consumeShield(i:number,reflect:boolean){
  const r=this.r,config=shieldConfig(r.growth.shield),p=shieldPosition(r,i);
  r.shields[i]=config.recharge;if(reflect&&r.growth.shield>=3)this.signal('reflect','shield',r.growth.shield,p.x,p.y);
  if(reflect&&r.growth.shield===4){const g=this.group(3);this.shot(g,'windblade',p.x,p.y,{vy:-470,damage:3,size:54,r:16,pierce:1,art:'/assets/attacks/shield-petal.webp'});}
  else if(reflect&&r.growth.shield===3){const g=this.group(3);for(const a of [-.2,0,.2])this.shot(g,'star',p.x,p.y,{vx:Math.sin(a)*450,vy:-Math.cos(a)*450,damage:1,size:18});}
 }
 shieldHit(x:number,y:number,bulletRadius=0,previous?:{x:number,y:number,time:number,playerX:number,playerY:number}){
  const r=this.r,config=shieldConfig(r.growth.shield);
  for(let i=0;i<config.count;i++){
   const p=shieldPosition(r,i),old=previous?shieldPosition(r,i,previous.time,previous.playerX,previous.playerY):p;
   const ox=previous?.x??x,oy=previous?.y??y;
   if(segmentEntry(0,0,config.radius+bulletRadius,ox-old.x,oy-old.y,x-p.x,y-p.y)!==null){this.signal('block','shield',r.growth.shield,p.x,p.y);if(r.effects.length<50)r.effects.push({x:p.x,y:p.y,kind:'block',t:0,size:40});if((r.shields[i]??0)<=0)this.consumeShield(i,true);return true;}
  }
  return false;
 }
 shieldEnemy(e:Enemy,previous:{x:number,y:number,time:number,playerX:number,playerY:number}){
  if(e.hp<=0)return false;const r=this.r,config=shieldConfig(r.growth.shield);
  for(let i=0;i<config.count;i++){
   if((r.shields[i]??0)>0)continue;
   const p=shieldPosition(r,i),old=shieldPosition(r,i,previous.time,previous.playerX,previous.playerY);
   if(segmentEntry(0,0,config.radius+enemyRadius(e),previous.x-old.x,previous.y-old.y,e.x-p.x,e.y-p.y)===null)continue;
   e.hp-=config.damage;e.hit=.12;this.signal('impact','shield',r.growth.shield,p.x,p.y,e.kind);if(e.hp<=0)e.killSource='normal';this.consumeShield(i,false);
   if(r.effects.length<50)r.effects.push({x:p.x,y:p.y,kind:'hit',t:0,size:36});
   return true;
  }
  return false;
 }

}
export const enemyRadius=(e:Enemy)=>e.kind==='small'?25:e.kind==='mini'?48:70;
export function shieldPosition(r:Run,i:number,time=r.time,x=r.x,y=r.y){const count=shieldConfig(r.growth.shield).count||2,a=time*Math.PI*2/2.4+i*Math.PI*2/count;return {x:x+Math.cos(a)*60,y:y+Math.sin(a)*60}}

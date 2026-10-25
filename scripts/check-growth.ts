import {pathToFileURL} from 'node:url';
import {aircraft,newRun,type Enemy,type Run} from '../src/data.ts';
import {Combat,shieldPosition} from '../src/combat.ts';
import {basicCap,growthCaps,shieldConfig,specialScale,tracks,ultimateCap,weapon,type Track} from '../src/arsenal.ts';
import {createPreviewPair} from '../src/preview-model.ts';

export type GrowthSample={damage:number[],peakAttacks:number,capExceeded:boolean};
const frames=[24,48,96,210];
const friendFrames=[54,108,162,324];
const target=(x:number,y:number,kind:Enemy['kind']):Enemy=>({id:1,x,y,hp:10000,max:10000,kind,variant:0,t:0,fire:999,frozen:999,hit:0,originX:x,warning:0,targetX:x});
export function growthRun(craft:string,track:Track,level:number){
 const r=newRun(1,craft);r.mode='playing';r.growth[track]=level;r.ultimate.level=r.growth.ultimate;
 if(track==='basic'&&level>=3)r.growth.friend=1;
 if(track==='friend'&&level>=3)r.growth.basic=1;
 if(track==='shield'&&level>=3)r.growth.special1=1;
 return r;
}
export function castGrowth(r:Run,combat:Combat,track:Track){
 if(track==='basic')combat.basic();
 else if(track==='ultimate')combat.ultimate();
 else if(track==='friend')r.auto=true;
 else if(track==='special1'||track==='special2')combat.special(track==='special1'?0:1);
}
/** Durable isolated targets expose damage differences that two-HP previews hide. */
export function sampleGrowth(craft:string,track:Track,level:number,x=500,y=150,kind:Enemy['kind']='boss'):GrowthSample{
 const r=growthRun(craft,track,level),enemy=target(x,y,kind);r.enemies=[enemy];
 const combat=new Combat(r),damage:number[]=[],sampleFrames=track==='friend'?friendFrames:frames;
 let peakAttacks=0,capExceeded=false;
 castGrowth(r,combat,track);
 const limit=track==='basic'?basicCap[level]:track==='ultimate'?ultimateCap[level]:track.startsWith('special')?weapon(craft).specials[track==='special1'?0:1].cap*specialScale[level]:Infinity;
 for(let frame=1;frame<=sampleFrames.at(-1)!;frame++){
  r.time+=1/60;combat.update(1/60);peakAttacks=Math.max(peakAttacks,r.attacks.length+r.scheduled.length);
  if(10000-enemy.hp>limit+1e-7)capExceeded=true;
  if(sampleFrames.includes(frame))damage.push(10000-enemy.hp);
 }
 return {damage,peakAttacks,capExceeded};
}
/** Actual contact/reflect/block probes; permanent shields must block during recharge. */
function shieldSample(craft:string,level:number){
 const r=growthRun(craft,'shield',level),combat=new Combat(r);
 let blocked=0,contactDamage=0,reflectedDamage=0;
 for(let i=0;i<shieldConfig(level).count;i++){
  const p=shieldPosition(r,i),enemy=target(p.x,p.y,'small');r.shields.fill(0);
  combat.shieldEnemy(enemy,{...p,time:r.time,playerX:r.x,playerY:r.y});contactDamage+=10000-enemy.hp;
  if(combat.shieldHit(p.x,p.y,6))blocked++;
  r.shields.fill(0);r.attacks=[];combat.shieldHit(p.x,p.y,6);reflectedDamage+=r.attacks.reduce((sum,s)=>sum+s.damage,0);
 }
 return {blocked,contactDamage,reflectedDamage};
}
export function previewGrowth(craft:string,track:Track,level:number){
 const source=growthRun(craft,track,level-1);
 // Recipes must be available before the proposed pick, including basic 2→3.
 if(track==='basic'&&level===3)source.growth.friend=1;
 if(track==='friend'&&level>=3)source.growth.basic=1;
 if(track==='shield'&&level>=3)source.growth.special1=1;
 const before=JSON.stringify(source),pair=createPreviewPair(source,track);
 for(const engine of pair){
  if(track==='ultimate')engine.combat.ultimate();
  if(track.startsWith('special'))engine.bomb(track==='special1'?'fire':'ice');
  if(track==='shield')engine.r.bullets.push({x:542,y:390,vx:0,vy:340,r:6,enemy:true});
  for(let frame=0;frame<132;frame++)engine.step(1/60,{x:0,y:0});
 }
 return {kills:pair.map(e=>e.r.kills),isolated:JSON.stringify(source)===before};
}
type Regression={craft:string,track:Track,level:number,scenario:string,before:number,after:number};
export function runGrowthAudit(){
 const regressions:Regression[]=[],rows:Record<string,unknown>[]=[],cache=new Map<string,GrowthSample>();
 let comparisons=0,capFailures=0,previewRegressions=0,previewImprovements=0,maxAttacks=0;
 const sample=(craft:string,track:Track,level:number,x:number,y:number,kind:Enemy['kind'])=>{
  const key=[craft,track,level,x,y,kind].join('/');let found=cache.get(key);
  if(!found){found=sampleGrowth(craft,track,level,x,y,kind);cache.set(key,found);if(found.capExceeded)capFailures++;maxAttacks=Math.max(maxAttacks,found.peakAttacks);}return found;
 };
 for(const craft of aircraft)for(const track of tracks)for(let level=1;level<=growthCaps[track];level++){
  let rowComparisons=0,rowImproved=0;
  const compare=(scenario:string,before:number,after:number)=>{comparisons++;rowComparisons++;if(after>before+1e-7)rowImproved++;if(after+1e-7<before)regressions.push({craft:craft.id,track,level,scenario,before,after});};
  if(track==='shield'){
   const before=shieldSample(craft.id,level-1),after=shieldSample(craft.id,level);
   for(const key of ['blocked','contactDamage','reflectedDamage'] as const)compare(key,before[key],after[key]);
  }else{
   for(const kind of ['small','mini','boss'] as const)for(const y of [100,250,390])for(let x=150;x<=850;x+=50){
    const before=sample(craft.id,track,level-1,x,y,kind),after=sample(craft.id,track,level,x,y,kind);
    before.damage.forEach((value,index)=>compare(`${kind}@${x},${y}/${(track==='friend'?friendFrames:frames)[index]/60}s`,value,after.damage[index]));
   }
  }
  const preview=previewGrowth(craft.id,track,level);
  if(!preview.isolated)throw Error(`Preview mutated ${craft.id}/${track}/${level}`);
  if(preview.kills[1]<preview.kills[0])previewRegressions++;
  if(preview.kills[1]>preview.kills[0])previewImprovements++;
  rows.push({craft:craft.id,track,level,comparisons:rowComparisons,improved:rowImproved,previewKills:preview.kills});
 }
 return {method:'Real Combat at 60 Hz, isolated 10000-HP targets: 15 columns × 3 distances × 3 hull sizes, four finite damage windows. Friend-only volleys use 0.9–5.4s. Shield probes exercise contact, blocking during recharge and reflection. All 152 real previews run 2.2s. This is not moving-enemy balance or device performance evidence.',transitions:rows.length,comparisons,capFailures,previewRegressions,previewImprovements,maxAttacks,regressions,rows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=runGrowthAudit();console.log(JSON.stringify(report,null,2));
 if(report.regressions.length||report.capFailures||report.previewRegressions||report.rows.some(row=>!row.improved))process.exitCode=1;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {Combat} from '../src/combat';
import {specialScale,weapon,type Track} from '../src/arsenal';
import {type Enemy} from '../src/data';
import {growthRun} from '../scripts/check-growth';

function trace(craft:string,track:Track,level:number,x:number,y:number,kind:Enemy['kind'],moving=false){
 const r=growthRun(craft,track,level),enemy:Enemy={id:1,x,y,originX:x,hp:10000,max:10000,kind,variant:1,t:0,fire:999,frozen:0,hit:0,warning:0,targetX:x};
 r.enemies=[enemy];const combat=new Combat(r);combat.special(track==='special1'?0:1);const damage:number[]=[];
 for(let frame=1;frame<=210;frame++){
  r.time+=1/60;
  if(moving){enemy.x=x+Math.sin(r.time*1.2)*110;enemy.y=y+80*r.time;}
  combat.update(1/60);damage.push(10000-enemy.hp);
 }
 return damage;
}

test('tray, vortex and log upgrades never delay inherited hits, including the first moving-target volley',()=>{
 for(const [craft,track,start] of [['6','special1',0],['2','special1',0],['7','special2',1]] as const)
 for(let level=start+1;level<=3;level++)for(const moving of [false,true])
 for(const kind of ['small','mini','boss'] as const)for(const y of [100,250,390])for(const x of [150,300,480,500,520,700,850]){
  const before=trace(craft,track,level-1,x,y,kind,moving),after=trace(craft,track,level,x,y,kind,moving);
  const cap=weapon(craft).specials[track==='special1'?0:1].cap*specialScale[level];
  after.forEach((amount,frame)=>{
   assert.ok(amount+1e-7>=before[frame],`${craft}/${track}/${level} ${kind}@${x},${y} moving=${moving} frame=${frame+1}: ${amount} < ${before[frame]}`);
   assert.ok(amount<=cap+1e-7,`${craft}/${track}/${level}: cap ${amount} > ${cap}`);
  });
 }
});

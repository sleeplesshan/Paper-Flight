import {type Run,type Enemy} from './data';
import {encounterProfile,basicTag,specialTag,type AttackTag} from './arsenal';
export function attackTags(r:Run):AttackTag[]{const result:AttackTag[]=[basicTag(r.craft,r.growth)];if(r.fire>0)result.push(specialTag(r.craft,0,r.growth));if(r.ice>0)result.push(specialTag(r.craft,1,r.growth));if(r.growth.friend)result.push('friends');return [...new Set(result)]}
export function showcaseTag(r:Run):AttackTag{if(r.lastCard==='friend')return 'friends';if(r.lastCard==='shield')return 'gentle';if(r.lastCard==='ultimate')return ['3','7','2'].includes(r.craft)?'pierce':'area';if(r.lastCard==='special1'&&r.fire>0)return specialTag(r.craft,0,r.growth);if(r.lastCard==='special2'&&r.ice>0)return specialTag(r.craft,1,r.growth);return basicTag(r.craft,r.growth)}
export function formationPositions(count:number,tag:AttackTag,side:number){const points:{x:number,y:number}[]=[];for(let i=0;i<count;i++){
 let x=0,y=0;
 if(tag==='pierce'){x=(i%2)*100;y=Math.floor(i/2)*80;}
 else if(tag==='split'||tag==='area'){x=i===0?100:40+((i-1)%3)*60;y=i===0?0:70+Math.floor((i-1)/3)*60;}
 else if(tag==='friends'){x=i%2?330:70;x+=Math.floor(i/2)*22;y=Math.floor(i/2)*65;}
 else if(tag==='leader'){x=i===0?220:70+((i-1)%4)*85;y=i===0?0:95+Math.floor((i-1)/4)*65;}
 else{x=i*65;y=Math.abs(i-(count-1)/2)*38;}
 points.push({x:(side?310:85)+x,y:-60-y});
 }return points;
}
export function spawnFormation(r:Run,rand:()=>number,add:(kind:Enemy['kind'],x?:number)=>void,forced?:AttackTag){const boss=r.phase>=2,p=encounterProfile(r.stage,r.growth,boss),small=r.enemies.filter(e=>e.kind==='small');if(small.length+p.count>p.limit)return false;
 const tags=attackTags(r),tag=forced??(rand()<.6?tags[r.encounter.rotation++%tags.length]:['spread','pierce','split','friends'][Math.floor(rand()*4)] as AttackTag),number=tag==='gentle'?Math.min(3,p.count):p.count;
 const id=++r.encounter.formation,positions=formationPositions(number,tag,r.stage%2);let slots=Math.max(0,6-small.filter(e=>e.shooter).length);
 positions.forEach((pos,i)=>{add('small',pos.x);const e=r.enemies.at(-1)!;e.y=pos.y;e.formation=id;e.drift=tag==='pierce'?5:14;e.variant=i%2;e.shooter=slots>0&&(tag==='gentle'||i%3===0);if(e.shooter)slots--;e.fire=2.5+i*.18;if(i===0&&tag==='leader'){e.hp*=2;e.max=e.hp;e.leader=true;}});return true;
}

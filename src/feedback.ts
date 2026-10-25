import type {Track} from './arsenal';
export type Material='pencil'|'metal'|'wood'|'paper'|'wind'|'water'|'star'|'fire'|'ice';
export type CombatFeedback={kind:'launch'|'impact'|'branch'|'freeze'|'block'|'reflect'|'destroy'|'pickup',craft:string,weapon:string,level:number,x:number,y:number,target?:'small'|'mini'|'boss',slot?:0|1};
export function materialFor(key:string):Material{
 if(['firebomb','phoenix'].includes(key))return 'fire';if(key==='icebomb')return 'ice';
 if(['fork','knife','spoon','tray'].includes(key))return 'metal';
 if(['leaf','seed','root','log'].includes(key))return 'wood';
 if(['propeller','wind','vortex','windblade','soundbomb'].includes(key))return 'wind';
 if(['drop','rain','bubble'].includes(key))return 'water';if(['star','meteor'].includes(key))return 'star';
 if(['arrow','spear','shuriken','shield','companion','missile'].includes(key))return 'paper';return 'pencil';
}
export function feedbackSound(e:CombatFeedback){
 if(e.kind==='destroy')return `pop-${e.target??'small'}-destroy`;
 if(e.kind==='pickup')return `pop-pickup${(e.slot??0)+1}`;
 if(e.kind==='block')return 'pop-shield';if(e.kind==='reflect')return 'pop-reflect';
 return `pop-${e.kind==='freeze'?'ice':materialFor(e.weapon)}-${e.kind==='launch'?'launch':'hit'}`;
}
export function soundPriority(key:string){return key==='hit'?100:key==='warning'?95:key.startsWith('ultimate-')?90:key.includes('boss-destroy')?85:key.includes('clear')?85:key.includes('pickup')?75:key.includes('mini-destroy')?70:key.includes('shield')||key.includes('reflect')?55:key.includes('destroy')?45:key.includes('hit')?30:10;}
export function chooseVoiceVictim(voices:readonly {priority:number,started:number}[],priority:number){
 // Two of eight voices belong to readable hazards, pickups and major rewards.
 const limit=priority>=70?8:6;if(voices.length<limit)return -1;
 let index=-1;for(let i=0;i<voices.length;i++)if(voices[i].priority<=priority&&(index<0||voices[i].priority<voices[index].priority||(voices[i].priority===voices[index].priority&&voices[i].started<voices[index].started)))index=i;
 return index<0?-2:index;
}
export const previewWeapon=(track:Track)=>track==='shield'?'shield':track==='friend'?'companion':undefined;

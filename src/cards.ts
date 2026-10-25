import {type Run} from './data';
import {tracks,eligible,cardFor,type Track} from './arsenal';
/** A reward belongs to a specific defeated boss, never to the menu itself. */
export function offerReward(r:Run,kind:'mini'|'clear'){
 const id=`${r.id}:${kind}`;
 if(r.claimedRewards.includes(id)||(r.reward?.id===id))return false;
 if(kind==='clear'&&r.stage===10)return false;
 r.reward={id,kind,status:'offered',remaining:0};r.cards=[];r.pendingCard=null;r.cardDone=false;r.mode='cards';return true;
}
export function rollCards(r:Run,rand:()=>number){if(r.cards.length||r.cardDone||r.reward?.status==='showcase'||r.reward?.status==='done')return;
 const candidates=tracks.filter(t=>eligible(r.growth,t)),offered:Track[]=[];
 for(const group of [['basic'],['special1','special2'],['friend','shield','ultimate']] as Track[][]){const available=group.filter(t=>candidates.includes(t));if(!available.length)continue;const evolution=available.find(t=>cardFor(r.craft,t,r.growth[t]+1).evolution&&!r.offeredEvolutions.includes(t));offered.push(evolution??available[Math.min(available.length-1,Math.floor(rand()*available.length))]);}
 while(offered.length<3){const rest=candidates.filter(t=>!offered.includes(t));if(!rest.length)break;offered.push(rest[Math.min(rest.length-1,Math.floor(rand()*rest.length))]);}
 r.cards=offered;for(const t of offered)if(cardFor(r.craft,t,r.growth[t]+1).evolution&&!r.offeredEvolutions.includes(t))r.offeredEvolutions.push(t);
}
export function chooseCard(r:Run,track:Track){if(r.mode!=='cards'||r.cardDone||r.reward?.status==='showcase'||!r.cards.includes(track)||!eligible(r.growth,track))return false;
 r.growth[track]++;r.lastCard=track;r.pendingCard=null;r.cardDone=true;
 r.reward??={id:`${r.id}:clear`,kind:'clear',status:'offered',remaining:0};
 if(!r.claimedRewards.includes(r.reward.id))r.claimedRewards.push(r.reward.id);
 r.cardApply={track,remaining:.45,duration:.45};finishCard(r);return true;
}
export function finishCard(r:Run){if(!r.reward||r.reward.status==='done')return;r.reward.status='done';r.reward.remaining=0;r.cards=[];r.pendingCard=null;
 if(r.reward.kind==='mini'){r.mode='playing';r.invuln=Math.max(2,r.invuln);r.encounter.pause=4;r.encounter.showcaseDone=false;r.spawn=6;}else r.mode='clear';
}
export function earnedCards(r:Run){return tracks.filter(t=>r.growth[t]>0).map(t=>cardFor(r.craft,t,r.growth[t]))}

/** Tick only with the visible game's logical clock, never from wall time. */
export function tickCardApply(r:Run,dt:number){if(!r.cardApply)return;r.cardApply.remaining=Math.max(0,r.cardApply.remaining-dt);if(r.cardApply.remaining===0)r.cardApply=null;}

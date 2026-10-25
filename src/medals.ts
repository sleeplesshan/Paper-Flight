import {t as localize,msg} from './i18n';
import type {Save,Run} from './data';

export const REVEAL_DURATION=4.8;
export function normalizeMedalReveal(value:Run['medalReveal']):Run['medalReveal']{
 if(!value||!Number.isSafeInteger(value.from)||value.from<0||value.to!==value.from+1||!Number.isFinite(value.elapsed))return null;
 return {from:value.from,to:value.to,elapsed:Math.max(0,Math.min(REVEAL_DURATION,value.elapsed))};
}

export const medalRanks=[
 localize('종이 그림'),localize('동색'),localize('은색'),localize('금색'),localize('반짝 동색'),localize('반짝 은색'),localize('반짝 금색'),
 localize('루비'),localize('사파이어'),localize('다이아몬드'),localize('자수정'),localize('에메랄드'),localize('황금 토파즈'),localize('장미 수정'),
 localize('달빛 진주'),localize('무지개 오팔'),localize('오로라 수정'),localize('은하수 수정'),localize('무지개 다이아'),localize('별빛 왕관')
];
export function medalLevel(completions:number){return Math.min(20,Math.max(1,Math.floor(completions)||1))}
export function medalName(completions:number){return medalRanks[medalLevel(completions)-1]}
export function medalImage(stage:number,completions:number){const level=medalLevel(completions);return level===1?`/assets/gems/${stage}.webp`:`/assets/medals/${level}/${stage}.webp`}
// Before the first full completion, show the next distinct material (bronze).
// The dialog labels this as the second completion; rewards still follow 1=paper.
export function medalPreviewRank(completions:number){return Math.max(2,completions+1)}
export function beginCampaign(save:Save,run:Run){
 if(run.stage!==1)throw Error(localize('새 모험은 1단계부터 시작합니다'));
 save.campaign={id:run.id,cleared:[]};run.campaignId=run.id;
}
// Reward and campaign advancement share one persisted transaction in grantReward.
export function advanceCampaign(save:Save,run:Run){
 const campaign=save.campaign;
 if(!campaign||campaign.id!==run.campaignId||run.stage!==campaign.cleared.length+1)return false;
 campaign.cleared.push(run.stage);
 if(campaign.cleared.length!==10)return false;
 const from=save.completions;save.completions++;save.campaign=null;run.medalReveal={from,to:save.completions,elapsed:0};return true;
}
export function normalizeMedalSave(save:Save,legacy:boolean){
 const valid=Array.from(new Set(save.gems.filter(n=>Number.isInteger(n)&&n>=1&&n<=10))).sort((a,b)=>a-b);
 save.gems=valid;
 // Old versions never recorded repeat completions; preserve a complete collection as rank 1.
 save.completions=legacy?(valid.length===10?1:0):Number.isSafeInteger(save.completions)&&save.completions>=0?save.completions:0;
 const c=save.campaign;
 if(c&&typeof c.id==='string'&&Array.isArray(c.cleared)&&c.cleared.length<10&&c.cleared.every((n,i)=>n===i+1)){
  save.campaign={id:c.id,cleared:[...c.cleared]};
 }else save.campaign=null;
 if(legacy&&save.run&&save.completions===0){
  const r=save.run,n=r.stage-1;
  if(n>=0&&n<10&&Array.from({length:n},(_,i)=>i+1).every(s=>valid.includes(s))){
   save.campaign={id:r.id,cleared:Array.from({length:n},(_,i)=>i+1)};r.campaignId=r.id;
   if(r.rewarded&&valid.includes(r.stage))advanceCampaign(save,r);
  }
 }
 return save;
}

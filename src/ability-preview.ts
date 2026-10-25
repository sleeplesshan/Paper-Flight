import {t as localize,msg} from './i18n';
import {newRun} from './data';
import {drawPreview} from './preview';
import {PreviewPlayback,previewBounds,type PreviewBounds} from './preview-model';
import {weapon,ultimateFor} from './arsenal';
export const craftFeatures:Record<string,string>={'3':localize('곧게 뚫고, 불과 얼음으로 팡!'),'4':localize('빙글빙글 날개와 힘센 미사일!'),'6':localize('숟가락·포크·칼로 신나는 잔치!'),'7':localize('뿌리가 자라고 통나무가 데굴데굴!'),'1':localize('작은 별이 커다란 은하수로!'),'2':localize('바람을 모아 하늘을 휘감아요!'),'5':localize('접은 종이가 날개를 펼쳐요!'),'6b':localize('물방울이 모여 무지개 소나기!')};
export type Ability='basic'|'special1'|'special2'|'ultimate';
export function abilityInfo(craft:string,ability:Ability){const w=weapon(craft);if(ability==='ultimate')return {name:ultimateFor(craft).name,description:localize('적을 쓰러뜨려 힘을 모아, 멋진 필살기를 써요!')};if(ability==='basic')return {name:w.name,description:localize('발사 버튼을 누르면 계속 나가요. 한 번 더 누르면 멈춰요.')};const index=ability==='special1'?0:1,s=w.specials[index];return {name:s.name,description:s.key==='icebomb'?localize('얼음폭탄이 날아가 터져요. 적을 2초 동안 얼려요.'):s.key==='missile'?localize('큰 미사일이 곧게 날아가요. 처음 맞은 적에게 강해요.'):s.key==='root'?localize('굵은 뿌리가 앞으로 쭉! 닿은 길의 적을 공격해요.'):s.key==='log'?localize('긴 통나무가 데굴데굴! 넓은 길을 쓸고 가요.'):s.style==='blast'?localize('앞으로 날아가 펑! 가까이 모인 적을 공격해요.'):localize('앞으로 펼쳐지는 공격! 캡슐을 먹으면 3개가 가득 차요.')};}
/** Uses the same complete-life playback and steady camera as the upgrade lesson. */
export class AbilityPreview{
 private playback:PreviewPlayback;private bounds:PreviewBounds;private source;
 constructor(craft:string,private ability:Ability,private canvas:HTMLCanvasElement,stage=1){
  this.source=newRun(stage,craft);this.bounds=previewBounds(this.source,ability,false);this.playback=new PreviewPlayback(this.source,ability,false);
 }
 get engine(){return this.playback.engines[0];}
 get elapsed(){return this.playback.elapsed;}
 step(dt:number){if(this.playback.finished)this.playback=new PreviewPlayback(this.source,this.ability,false);this.playback.step(dt);drawPreview(this.canvas,this.engine.r,this.bounds);}
}

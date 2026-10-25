import {t as localize,msg} from './i18n';
import {stages,type Run} from './data';
import {weapon,cardFor,type Track} from './arsenal';
const miniNames=[localize('순찰정'),localize('풍차 기체'),localize('도토리 헬기'),localize('피라미드 기체'),localize('얼음 썰매'),localize('용암 비행선'),localize('시계탑 기체'),localize('번개 기체'),localize('토성 비행선'),localize('쌍둥이 수호기')];
const bossTips=[localize('느린 총알 사이로 날아요'),localize('벌어진 총알 사이를 찾아요'),localize('왼쪽과 오른쪽을 잘 봐요'),localize('빨간 길을 보고 옆으로 피해요'),localize('얼음 총알 사이로 날아요'),localize('빨간 길 밖으로 피해요'),localize('공격할 길을 먼저 보여줘요'),localize('파도 사이 빈 곳으로 날아요'),localize('동그란 총알의 빈틈을 찾아요'),localize('지금까지 배운 길을 찾아요')];
export function bossIntroductionHTML(r:Run){const kind=r.bossIntro!.kind,name=kind==='mini'?miniNames[r.stage-1]:stages[r.stage-1].boss;return msg(["<div class=\"boss-profile\"><p class=\"boss-warning\">WARNING</p><p class=\"boss-kind\">","</p><img src=\"","\" alt=\""," 프로필\"><div><h1>","</h1><p>","</p></div></div>"], kind==='mini'?localize('중간보스 등장!'):localize('보스 등장!'), kind==='mini'?`/assets/enemies/${r.stage}-mini.webp`:`/assets/bosses/stage${r.stage}-profile.webp`, name, name, bossTips[r.stage-1]);}
export function cardExplanation(craft:string,track:Track,level:number){const card=cardFor(craft,track,level);
 if(track==='ultimate')return card.description+localize(' 적을 쓰러뜨리면 힘이 차요. 필살기 버튼이 펼쳐지면 눌러 봐요!');
 if(track==='shield'&&level===4)return localize('네 장의 날개방패가 계속 돌아요. 총알을 막으면 날개탄도 나가요. 방패는 사라지지 않아요.');
 if(track==='friend'&&level===4)return localize('양옆 친구는 그대로 쏴요. 앞의 새 친구가 엇갈려 쏘며 함께 지켜줘요.');
 if(track==='shield')return level===3?localize('방패 셋이 빙글! 닿은 적도 아프게 해요. 총알을 막으면 반짝탄도 나가요.'):localize('방패 ')+(level===1?localize('둘'):localize('셋'))+localize('이 계속 돌아요. 총알을 막고, 닿은 적도 아프게 해요. 방패는 사라지지 않아요.');
 if(track==='friend')return localize('친구가 옆에서 함께 쏴요. 발사 버튼을 켜면 같이 공격해요.');
 if(craft==='7'&&track==='special2'&&level===3)return localize('왕 통나무와 두 친구가 넓게 쓸고 가요. 왕 통나무 옆에서 작은 통나무도 벌어져요! 통나무 버튼으로 써요.');
 if(craft==='7'&&track==='special1'&&level===2)return localize('굵은 뿌리가 자라며 옆 가지 여섯 개가 펼쳐져요. 양옆에 있는 적도 쓸어 줘요! 뿌리 버튼으로 써요.');
 if(craft==='7'&&track==='special1'&&level===3)return localize('뿌리 정원이 커다란 나무 길로 변해요! 넓게 뻗은 가지 끝에서 왕 나뭇잎 열두 장이 날아가요. 뿌리 버튼으로 써요.');
 if(track.startsWith('special'))return card.description+' '+weapon(craft).specials[track==='special1'?0:1].name.replace('\n',' ')+localize(' 버튼으로 써요. 캡슐을 먹으면 다시 가득!');
 return card.description+localize(' 발사 버튼을 켜면 새 모습으로 계속 나가요.');
}
// Optional breaks between utensil names keep each Korean word intact.
function cardCopy(text:string){return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/([·/])/g,'$1<wbr>');}
export function cardChoiceHTML(r:Run,track:Track,chosen=false){const c=cardFor(r.craft,track,r.growth[track]+1);return `<button class="upgrade-card ${chosen?'chosen':''} ${c.evolution?'evolution':''}" data-card="${c.track}" aria-pressed="${chosen}"><img src="${c.image}" alt=""><strong>${cardCopy(c.title)}</strong><span>${cardCopy(c.description)}</span>${c.evolution?localize('<small>특별 진화 ✨</small>'):''}${c.recipe.length?`<div class="recipe-icons" aria-label="${c.recipe.join(' + ')}"><img src="/assets/attacks/${c.track==='basic'?weapon(r.craft).key:c.track==='friend'?'companion':'shield'}.webp" alt="${c.recipe[0]}"><span>＋</span><img src="/assets/attacks/${c.track==='basic'?(r.growth.friend?'companion':'shield'):c.track==='friend'?weapon(r.craft).key:weapon(r.craft).specials[r.growth.special1?0:1].key}.webp" alt="${c.recipe[1]}"></div>`:''}</button>`;}
export function cardDetailHTML(r:Run,track:Track){const level=r.growth[track]+1,card=cardFor(r.craft,track,level);return msg(["<header><img src=\"","\" alt=\"\"><div><h2>","</h2><p>","</p></div></header><div class=\"card-preview detail-comparison\"><div><span>지금</span><canvas width=\"600\" height=\"320\"></canvas></div><div><span>고르면 이렇게!</span><canvas width=\"600\" height=\"320\"></canvas></div></div><p class=\"card-detail-help\">","</p><div class=\"row\"><button class=\"paper-button preview-sound\" id=\"detail-sound\" type=\"button\">소리 듣기</button><button class=\"paper-button\" id=\"detail-back\">다른 카드도 볼래</button><button class=\"paper-button primary\" id=\"detail-pick\">이걸로 할래!</button></div>"], card.image, cardCopy(card.title), cardCopy(card.description), cardCopy(cardExplanation(r.craft,track,level)));}

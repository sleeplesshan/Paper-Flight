import {t as localize,msg} from './i18n';
import {medalImage,medalLevel,medalName} from './medals';
import {stages,type Run} from './data';

export {REVEAL_DURATION} from './medals';
export function medalCollectionHTML(count:number,from=count){return `<div class="medal-collection">${stages.map((s,i)=>`<div class="medal-tile" data-medal="${i}"><div class="medal-art"><img class="medal-before" src="${medalImage(s.id,from)}" alt=""><img class="medal-after" src="${medalImage(s.id,count)}" alt="${medalName(count)} ${s.gem}"><span class="medal-rays" aria-hidden="true">✦</span></div><span>${s.gem}</span></div>`).join('')}</div>`}
export function medalRevealHTML(reveal:NonNullable<Run['medalReveal']>){
 const changed=medalLevel(reveal.from)!==medalLevel(reveal.to);
 return msg(["<p class=\"eyebrow\">10 STAGES COMPLETE</p><h1 class=\"reveal-title\">","</h1><p class=\"reveal-material\">","<strong>","</strong></p>","<p class=\"reveal-caption\" role=\"status\" aria-live=\"polite\">새 메달을 펼치는 중…</p><div class=\"row\"><button class=\"paper-button primary\" data-do=\"next\">모험 완료</button><button class=\"paper-button\" data-do=\"exit\">나가기</button></div>"], reveal.from===0?localize('첫 완주! 메달 열 개를 모았어!'):changed?localize('메달 열 개가 함께 진화해요!'):localize('또 해냈어! 별빛 왕관이 반짝!'), changed?`${medalName(reveal.from)} <span aria-hidden="true">→</span> `:'', medalName(reveal.to), medalCollectionHTML(reveal.to,reveal.from));
}

import {t as localize,msg} from './i18n';
/** All weapon/card tuning lives here; no rendering or browser state. */
export type Track='basic'|'special1'|'special2'|'friend'|'shield'|'ultimate';
export type Growth=Record<Track,number>;
export const emptyGrowth=():Growth=>({basic:0,special1:0,special2:0,friend:0,shield:0,ultimate:0});
export const tracks:Track[]=['basic','special1','special2','friend','shield','ultimate'];
export const growthCaps:Growth={basic:3,special1:3,special2:3,friend:4,shield:4,ultimate:2};
export type Special={key:string,name:string,damage:number,cap:number,radius:number,width:number,speed:number,count:number,style:'blast'|'fan'|'line'|'root'|'missile'|'rain'};
const sp=(key:string,name:string,damage:number,cap:number,radius:number,width:number,speed:number,count:number,style:Special['style']):Special=>({key,name,damage,cap,radius,width,speed,count,style});
export const weapons:Record<string,{key:string,name:string,color:string,speed:number,specials:[Special,Special],basicNames:string[],basicDescriptions:string[]}>= {
 '3':{key:'pencil',name:localize('총발사'),color:'#ae843d',speed:500,specials:[sp('firebomb',localize('불폭탄'),30,30,210,30,420,1,'blast'),sp('icebomb',localize('얼음폭탄'),8,8,240,30,420,1,'blast')],basicNames:[localize('세 줄 총알'),localize('쭉쭉 연필탄'),localize('연필 폭풍')],basicDescriptions:[localize('총알이 세 줄로 나가요'),localize('긴 총알이 적을 뚫어요'),localize('다섯 줄로 쭉쭉 나가요')]},
 '4':{key:'propeller',name:localize('프로펠러'),color:'#7085ae',speed:500,specials:[sp('soundbomb',localize('소리폭탄'),26,26,190,30,420,1,'blast'),sp('missile',localize('쌍미사일'),20,40,0,24,520,2,'missile')],basicNames:[localize('쌍둥이 프로펠러'),localize('커다란 프로펠러'),localize('프로펠러 행진')],basicDescriptions:[localize('두 개가 빙글 날아요'),localize('큰 날개가 적을 뚫어요'),localize('세 개씩 줄지어 날아요')]},
 '6':{key:'fork',name:localize('숟가락/포크/칼\n발사'),color:'#a08a79',speed:500,specials:[sp('tray',localize('식판'),28,28,170,45,420,1,'blast'),sp('fork',localize('숟가락/포크/칼\n부채'),6,18,0,56,430,7,'fan')],basicNames:[localize('두 번 숟가락·포크·칼'),localize('왕 숟가락·포크·칼'),localize('숟가락·포크·칼 행진')],basicDescriptions:[localize('세 가지가 두 번 나가요'),localize('왕 숟가락·포크·칼이 뚫어요'),localize('아홉 개가 크게 펼쳐져요')]},
 '7':{key:'leaf',name:localize('나뭇잎'),color:'#6e916a',speed:420,specials:[sp('root',localize('뿌리'),26,26,0,96,700,1,'root'),sp('log',localize('통나무'),24,24,0,420,300,1,'line')],basicNames:[localize('세 갈래 잎'),localize('씨앗이 팡!'),localize('숲속 행진')],basicDescriptions:[localize('나뭇잎이 셋으로 퍼져요'),localize('맞은 잎에서 씨앗이 나와요'),localize('다섯 잎에서 씨앗이 팡!')]},
 '1':{key:'star',name:localize('별발사'),color:'#ba9c4c',speed:500,specials:[sp('meteor',localize('별똥별'),30,30,160,40,420,1,'blast'),sp('star',localize('별꽃'),7,21,0,26,430,5,'fan')],basicNames:[localize('쌍둥이 별'),localize('별조각 팡!'),localize('은하수 물결')],basicDescriptions:[localize('별 두 개가 나란히 날아요'),localize('맞은 별이 조각으로 퍼져요'),localize('별 다섯 개가 물결쳐요')]},
 '2':{key:'wind',name:localize('바람고리'),color:'#72a4af',speed:500,specials:[sp('vortex',localize('회오리'),24,24,0,90,300,1,'line'),sp('windblade',localize('바람날개'),10,20,0,50,430,3,'fan')],basicNames:[localize('쌍둥이 바람'),localize('커다란 바람'),localize('바람 터널')],basicDescriptions:[localize('바람 고리가 두 개 나가요'),localize('큰 고리가 적을 뚫어요'),localize('큰 고리 셋이 쭉 나가요')]},
 '5':{key:'arrow',name:localize('종이화살'),color:'#9b79a9',speed:500,specials:[sp('spear',localize('종이창'),30,30,0,32,550,1,'line'),sp('shuriken',localize('종이별'),7,21,0,26,430,5,'fan')],basicNames:[localize('세 갈래 화살'),localize('펼쳐지는 화살'),localize('종이 제비떼')],basicDescriptions:[localize('종이 화살이 셋으로 퍼져요'),localize('맞은 화살이 둘로 갈라져요'),localize('다섯 화살이 제비처럼 날아요')]},
 '6b':{key:'drop',name:localize('물방울'),color:'#659eba',speed:420,specials:[sp('bubble',localize('큰 비눗방울'),28,28,190,45,320,1,'blast'),sp('rain',localize('빗방울'),5,20,0,22,420,3,'rain')],basicNames:[localize('쌍둥이 물방울'),localize('물방울 톡톡!'),localize('무지개 물방울')],basicDescriptions:[localize('물방울 두 개가 나가요'),localize('맞은 물방울이 셋으로 갈라져요'),localize('다섯 방울이 톡톡 퍼져요')]}
};
const specialCards:Record<string,{names:string[],descriptions:string[]}>= {
 firebomb:{names:[localize('세 갈래 불폭탄'),localize('불꽃 꽃밭'),localize('불새의 날개')],descriptions:[localize('불폭탄 셋이 퍼져요'),localize('도착한 불꽃이 꽃잎처럼 퍼져요'),localize('불꽃이 새의 날개처럼 펼쳐져요')]},
 icebomb:{names:[localize('눈꽃 얼음폭탄'),localize('눈꽃 정원'),localize('얼음 결정 숲')],descriptions:[localize('얼음폭탄에서 조각이 퍼져요'),localize('얼음조각이 눈꽃을 피워요'),localize('얼음 가지가 쭉쭉 뻗어요')]},
 soundbomb:{names:[localize('커다란 소리폭탄'),localize('세 갈래 소리폭탄'),localize('초승달 소리물결')],descriptions:[localize('소리폭탄이 넓게 울려요'),localize('소리 고리 셋이 겹쳐 울려요'),localize('초승달 소리가 앞으로 흘러요')]},
 missile:{names:[localize('네 발 미사일'),localize('미사일 행진'),localize('날개 미사일 편대')],descriptions:[localize('미사일 네 발이 나가요'),localize('미사일 여섯 발이 줄지어 나가요'),localize('날개 편대 여덟 발이 쭉 나가요')]},
 tray:{names:[localize('식판 편대'),localize('식판 잔치'),localize('펼쳐지는 왕 식탁')],descriptions:[localize('가운데와 양옆 식판이 빙글 날아가요'),localize('숟가락·포크·칼이 퍼져요'),localize('넓은 식탁에서 도구가 나가요')]},
 fork:{names:[localize('교차 도구 부채'),localize('왕 도구 부채'),localize('숟가락·포크·칼 왕관')],descriptions:[localize('숟가락·포크·칼이 엇갈려요'),localize('왕 숟가락·포크·칼이 뚫어요'),localize('큰 도구들이 왕관처럼 펼쳐져요')]},
 root:{names:[localize('갈라지는 뿌리'),localize('뿌리 정원'),localize('자라나는 나무 길')],descriptions:[localize('굵은 뿌리가 세 갈래로 자라요'),localize('앞으로 자라며 옆 가지가 펼쳐져요'),localize('큰 가지에서 왕 나뭇잎이 날아요')]},
 log:{names:[localize('쌍둥이 통나무'),localize('통나무 행진'),localize('왕 통나무 숲 행진')],descriptions:[localize('긴 통나무 둘이 쓸고 가요'),localize('왕 통나무와 둘이 쓸고 가요'),localize('왕 통나무 편대에서 또 벌어져요')]},
 meteor:{names:[localize('별똥별 세 친구'),localize('별똥별 축제'),localize('이어지는 별자리 길')],descriptions:[localize('별똥별 셋이 날아가요'),localize('별똥별에서 조각이 퍼져요'),localize('날아간 별들이 반짝 길을 이어요')]},
 star:{names:[localize('겹겹 별꽃'),localize('커다란 별꽃'),localize('빙글 별꽃 왕관')],descriptions:[localize('별꽃이 두 번 펼쳐져요'),localize('큰 별꽃이 적을 뚫어요'),localize('별꽃 왕관이 빙글 펼쳐져요')]},
 vortex:{names:[localize('회오리 편대'),localize('회오리 기차'),localize('꼬이는 나선 회오리')],descriptions:[localize('회오리 셋이 함께 날아가요'),localize('회오리 편대가 이어서 나가요'),localize('두 바람이 꼬이며 앞으로 가요')]},
 windblade:{names:[localize('두 겹 바람날개'),localize('큰 바람날개'),localize('굽이치는 바람 물결')],descriptions:[localize('바람날개가 두 번 나가요'),localize('큰 바람날개가 적을 뚫어요'),localize('바람날개가 곡선을 그리며 가요')]},
 spear:{names:[localize('세 갈래 종이창'),localize('펼쳐지는 종이창'),localize('날개 펴는 종이학 창')],descriptions:[localize('종이창 셋이 날아가요'),localize('종이창 끝이 둘로 펼쳐져요'),localize('종이창이 학처럼 날개를 펴요')]},
 shuriken:{names:[localize('두 겹 종이별'),localize('왕 종이별'),localize('종이 바람개비')],descriptions:[localize('종이별이 두 번 나가요'),localize('큰 종이별이 적을 뚫어요'),localize('빙글 모인 별들이 앞으로 퍼져요')]},
 bubble:{names:[localize('비눗방울 세 친구'),localize('비눗방울 잔치'),localize('비구름 비눗방울')],descriptions:[localize('비눗방울 셋이 날아가요'),localize('작은 비눗방울이 퍼져요'),localize('방울이 터진 곳에 비구름이 생겨요')]},
 rain:{names:[localize('넓어진 빗방울'),localize('빗방울 커튼'),localize('무지개 빗방울 아치')],descriptions:[localize('빗방울이 넓게 나가요'),localize('빗방울이 세 번 나가요'),localize('빗방울이 무지개처럼 펼쳐져요')]}
};
export const ultimates:Record<string,{name:string,description:string,names:[string,string],descriptions:[string,string]}>= {
 '3':{name:localize('왕 연필 질주'),description:localize('왕 연필이 길을 쭉 뚫어요'),names:[localize('날개 달린 왕 연필'),localize('왕 연필 부채')],descriptions:[localize('왕 연필 옆에 연필날이 생겨요'),localize('왕 연필 앞에서 부채가 펼쳐져요')]},
 '4':{name:localize('프로펠러 태풍'),description:localize('큰 프로펠러가 빙글 전진해요'),names:[localize('프로펠러 태풍 친구들'),localize('프로펠러 바람길')],descriptions:[localize('작은 프로펠러도 함께 돌아요'),localize('지나간 자리에 바람 고리가 생겨요')]},
 '6':{name:localize('왕 식판 잔치'),description:localize('왕 식판에서 도구들이 나가요'),names:[localize('날개 펼친 왕 식판'),localize('숟가락·포크·칼 큰 잔치')],descriptions:[localize('왕 식판 양옆에 날개가 생겨요'),localize('큰 식탁에서 도구들이 엇갈려요')]},
 '7':{name:localize('숲의 대행진'),description:localize('왕 통나무와 뿌리가 쓸고 가요'),names:[localize('가지 잇는 숲 행진'),localize('나뭇잎 숲 대행진')],descriptions:[localize('굵은 가지가 길을 이어요'),localize('가지 끝에서 큰 잎들이 나가요')]},
 '1':{name:localize('은하수 별길'),description:localize('큰 별이 반짝 길을 만들어요'),names:[localize('세 갈래 은하수'),localize('은하수 조각 물결')],descriptions:[localize('별길이 양옆에도 생겨요'),localize('별길에서 별조각이 흘러요')]},
 '2':{name:localize('하늘 용오름'),description:localize('큰 회오리가 앞으로 나가요'),names:[localize('날개 달린 용오름'),localize('세 줄 하늘 터널')],descriptions:[localize('나선 바람날개가 함께 날아요'),localize('바람 터널 셋에 고리가 퍼져요')]},
 '5':{name:localize('종이학 출격'),description:localize('종이 화살이 학 셋으로 펼쳐져요'),names:[localize('종이학 다섯 친구'),localize('종이학 깃털 축제')],descriptions:[localize('종이학 다섯 마리가 날아요'),localize('큰 학에서 종이 깃털이 퍼져요')]},
 '6b':{name:localize('무지개 소나기'),description:localize('큰 방울이 터져 비가 내려요'),names:[localize('반짝 무지개 빗줄기'),localize('세 구름 비 커튼')],descriptions:[localize('무지개 빗줄기가 펼쳐져요'),localize('구름 셋이 넓은 비 커튼을 만들어요')]}
};
export const ultimateFor=(craft:string)=>ultimates[craft]??ultimates['3'];
export const ultimateCap=[45,60,76];
export const weapon=(craft:string)=>weapons[craft]??weapons['3'];
export type Card={track:Track,level:number,title:string,description:string,image:string,evolution:boolean,recipe:string[]};
export function cardFor(craft:string,track:Track,level:number):Card {
 const w=weapon(craft);let title='',description='',key=w.key,recipe:string[]=[];
 if(track==='basic'){title=w.basicNames[level-1];description=w.basicDescriptions[level-1];if(level===3)recipe=[localize('기본 공격 두 번'),localize('친구 또는 방패')];}
 else if(track==='special1'||track==='special2'){const s=w.specials[track==='special1'?0:1],cards=specialCards[s.key];title=cards.names[level-1];description=cards.descriptions[level-1];key=s.key;}
 else if(track==='friend'){title=[localize('친구 비행기'),localize('친구 편대'),localize('합동 발사!'),localize('삼각 종이 편대')][level-1];description=[localize('옆에서 같이 쏴요'),localize('양옆에서 같이 쏴요'),localize('친구도 같은 총알을 쏴요'),localize('친구 셋이 엇갈려 같이 쏴요')][level-1];key='companion';if(level===3)recipe=[localize('친구 편대'),localize('기본 공격 한 번')];}
 else if(track==='shield'){title=[localize('빙글 방패'),localize('방패 친구들'),localize('반짝 방패'),localize('펼쳐지는 날개방패')][level-1];description=[localize('방패 둘이 계속 돌아요'),localize('방패 셋이 빙글 지켜줘요'),localize('총알을 막으면 반짝탄이 나가요'),localize('네 방패가 막으면 날개탄이 나가요')][level-1];key='shield';if(level===3)recipe=[localize('방패 친구들'),localize('특수 공격 한 번')];}
 else {const u=ultimateFor(craft);title=u.names[level-1];description=u.descriptions[level-1];key='ultimate';}
 const image=`/assets/cards/${craft}-${track}-${level}.webp`;
 return {track,level,title,description,image,evolution:level===growthCaps[track],recipe};
}
export function eligible(g:Growth,track:Track){const n=g[track]+1;if(n>growthCaps[track])return false;if(n!==3)return true;if(track==='basic')return g.friend>0||g.shield>0;if(track==='friend')return g.basic>0;if(track==='shield')return g.special1>0||g.special2>0;return true;}
export function normalizeGrowth(value:Partial<Growth>|undefined):Growth{const g=emptyGrowth();for(const t of tracks)g[t]=Math.max(0,Math.min(growthCaps[t],Math.floor(Number(value?.[t])||0)));return g;}
// Spread-pattern allocation; extra inherited lanes do not dilute old shots.
// The actual per-enemy limit is basicCap, not a universal sum of projectile power.
export const basicSpreadPower=[4,6,8,12];
export const basicBudget=basicSpreadPower; // legacy audit import
export const basicCap=[4,5.2,6.4,8],specialScale=[1,1.35,1.7,1.95];
export type AttackTag='spread'|'pierce'|'split'|'area'|'friends'|'leader'|'gentle';
export function basicTag(craft:string,g:Growth):AttackTag {if(g.basic>=2)return ['3','4','6','2'].includes(craft)?'pierce':'split';return 'spread'}
export function specialTag(craft:string,slot:0|1,g?:Growth):AttackTag{const s=weapon(craft).specials[slot];if(s.key==='log'||(s.key==='root'&&(g?.special1??0)>0))return 'spread';return s.style==='blast'?'area':s.style==='line'||s.style==='root'?'pierce':s.style==='missile'?'leader':'spread'}
// More targets in later stages, independently of cards; gunfire and capacity stay bounded.
export const stageEncounters=[
 {count:3,interval:6.3,support:12},
 {count:3,interval:6.2,support:11.6},
 {count:4,interval:6.05,support:11.2},
 {count:4,interval:5.9,support:10.8},
 {count:5,interval:5.75,support:10.4},
 {count:5,interval:5.6,support:10},
 {count:6,interval:5.45,support:9.6},
 {count:7,interval:5.3,support:9.2},
 {count:8,interval:5.15,support:8.8},
 {count:9,interval:5,support:8.4},
];
export function encounterProfile(stage:number,g:Growth,boss=false){const tuning=stageEncounters[Math.max(0,Math.min(9,Math.floor(stage)-1))],power=Math.min(2,[0,.45,.95,1.45][g.basic]+[0,.2,.4,.55,.55][g.friend]);return {power,count:Math.min(9,Math.round(tuning.count*(1+.6*power))),interval:Math.max(4,tuning.interval/(1+.12*power)),supportInterval:tuning.support,limit:boss?12:24,shooters:6,smallBullets:18};}

/** Geometry stays in attack tuning so later cards can adjust width without hidden render changes. */
export const utensilSize=(level:number)=>level>=2?80:58;
/** Shields stay present. Only ramming and reflected shots have a short cooldown. */
export function shieldConfig(level:number){return {count:[0,2,3,3,4][Math.max(0,Math.min(4,level))],damage:level===1?4:6,radius:22,recharge:.65};}
export const rootGrowth=[
 {width:96,angles:[0],branchWidth:0,branchLength:0,branchSteps:[],branchAngle:0,life:1.35},
 {width:112,angles:[-.26,0,.26],branchWidth:0,branchLength:0,branchSteps:[],branchAngle:0,life:1.35},
 {width:144,angles:[-.26,0,.26],branchWidth:90,branchLength:250,branchSteps:[150,270,390],branchAngle:1.18,life:1.65},
 {width:220,angles:[-.26,0,.26],branchWidth:138,branchLength:360,branchSteps:[150,270,390],branchAngle:1.18,life:2.05}
];
export const logGrowth=[
 [{x:0,y:0,width:420,height:84}],
 [{x:-120,y:0,width:420,height:84},{x:120,y:0,width:420,height:84}],
 [{x:0,y:0,width:660,height:116},{x:-330,y:70,width:300,height:72},{x:330,y:70,width:300,height:72}],
 [{x:0,y:0,width:740,height:130},{x:-335,y:70,width:320,height:78},{x:335,y:70,width:320,height:78}]
];

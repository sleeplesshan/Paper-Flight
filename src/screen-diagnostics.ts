export type ScreenMode='current'|'reference'|'header';
const MODE_KEY='paper-flight-screen-mode';
export function setScreenMode(mode:ScreenMode):boolean{
 if(!['current','reference','header'].includes(mode))return false;
 try{localStorage.setItem(MODE_KEY,mode)}catch{return false}
 document.documentElement.dataset.screenMode=mode;
 try{window.top!.document.documentElement.dataset.screenMode=mode;window.top!.dispatchEvent(new Event('resize'))}catch{}
 window.dispatchEvent(new Event('resize'));
 return true;
}
/** Read-only device evidence. Never clears or exports player saves. */
export function screenDiagnostics():string{
 const rows:string[]=[];
 const inspect=(label:string,w:Window)=>{
  const d=w.document,r=d.documentElement;
  const surface=d.getElementById('status-surface'),s=surface?w.getComputedStyle(surface):null;
  const box=surface?.getBoundingClientRect();
  const probe=d.createElement('div');probe.style.cssText='position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);pointer-events:none';d.body.append(probe);
  const ps=w.getComputedStyle(probe),safe=`${ps.paddingTop} / ${ps.paddingBottom}`;probe.remove();
  const n=w.navigator as Navigator&{standalone?:boolean};
  rows.push(`${label}: v${d.querySelector('meta[name="application-version"]')?.getAttribute('content')??'?'}`,
   `화면 방식: ${r.dataset.screenMode??'current'}`,
   `설치형: ${w.matchMedia('(display-mode: standalone)').matches} / ${n.standalone??'없음'}`,
   `화면: ${w.screen.width}×${w.screen.height} · 배율 ${w.devicePixelRatio}`,
   `내부: ${w.innerWidth}×${w.innerHeight} · 문서 ${r.clientWidth}×${r.clientHeight}`,
   `보이는 영역: ${w.visualViewport?.width}×${w.visualViewport?.height} · 위 ${w.visualViewport?.offsetTop}`,
   `안전 여백 위/아래: ${safe}`,
   `상단 보정: ${s?.display??'없음'} · y ${box?.top??'-'} · 높이 ${box?.height??'-'} · ${s?.backgroundClip??'-'}`,
   `상태줄 설정: ${d.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.getAttribute('content')??'미지정'}`);
 };
 try{inspect('바깥 화면',window.top!)}catch{rows.push('바깥 화면: 접근 불가')}
 if(window.top!==window)inspect('게임',window);
 return rows.join('\n');
}

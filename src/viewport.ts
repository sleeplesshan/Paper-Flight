/** Keep the game in Safari's visible viewport, including keyboard/chrome changes.
 * Updates are event-driven, not part of the combat animation loop. */
export function setupViewport(onChange:()=>void){
 const root=document.documentElement,vv=window.visualViewport;
 const installed=matchMedia('(display-mode: standalone)');
 const apple=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const diagnostic=new URLSearchParams(location.search).has('screen-check')?document.createElement('pre'):null;
 if(diagnostic){diagnostic.style.cssText='position:fixed;z-index:9999;bottom:20px;left:10px;margin:0;padding:8px;background:#fffef2;color:#222;font:12px monospace;pointer-events:none;white-space:pre-wrap';document.body.append(diagnostic)}
 let frame=0,last='';
 let settleTimers:number[]=[];
 const update=()=>{
  frame=0;
  // A pinch-zoomed viewport must not shrink/reposition the game's layout.
  const visible=vv&&Math.abs(vv.scale-1)<.01&&vv.width>0&&vv.height>0?vv:null;
  const standalone=apple&&(installed.matches||(navigator as Navigator&{standalone?:boolean}).standalone===true);
  root.classList.toggle('apple-installed',standalone);
  root.classList.toggle('status-surface-active',standalone&&window.top===window);
  const editing=!!document.activeElement?.matches('input,textarea,[contenteditable=true]');
  root.classList.toggle('viewport-editing',editing);
  // Fit only the visible area. A larger legacy vh can extend behind native chrome.
  const left=Math.max(0,visible?.offsetLeft||0),top=Math.max(0,visible?.offsetTop||0);
  // Installed WebKit can temporarily report a visual viewport taller than its layout.
  // Intersect positive current bounds; never enlarge from legacy vh or screen size.
  const positiveMin=(...values:number[])=>Math.min(...values.filter(v=>Number.isFinite(v)&&v>0));
  const width=standalone?positiveMin(visible?.width||0,window.innerWidth-left,root.clientWidth-left):(visible?.width||window.innerWidth);
  const height=standalone?positiveMin(visible?.height||0,window.innerHeight-top,root.clientHeight-top):(visible?.height||window.innerHeight);
  const values=[width,height,left,top].map(n=>Math.round(n*100)/100),key=values.join(',')+standalone;
  if(key===last)return;last=key;
  ['--view-width','--view-height','--view-left','--view-top'].forEach((name,i)=>root.style.setProperty(name,values[i]+'px'));
  // Layout has changed before the callback reads the canvas dimensions.
  onChange();
  if(diagnostic){const box=document.querySelector('#game')?.getBoundingClientRect();diagnostic.textContent=`v26 | installed iOS: ${standalone} | keyboard field: ${editing}\ninner: ${innerWidth} x ${innerHeight} | layout: ${root.clientHeight}\nvisual: ${vv?.width} x ${vv?.height} | offset: ${vv?.offsetTop} | scale: ${vv?.scale}\ngame: y=${box?.top} bottom=${box?.bottom}`;}

 };
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};
 const settle=()=>{schedule();settleTimers.forEach(clearTimeout);settleTimers=[120,350,800].map(ms=>window.setTimeout(schedule,ms))};
 window.addEventListener('resize',schedule);window.addEventListener('orientationchange',settle);
 window.addEventListener('pageshow',settle);document.addEventListener('visibilitychange',settle);
 document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);installed.addEventListener('change',schedule);
 vv?.addEventListener('resize',schedule);vv?.addEventListener('scroll',schedule);
 settle();
 return ()=>{settleTimers.forEach(clearTimeout);diagnostic?.remove();root.classList.remove('apple-installed','viewport-editing','status-surface-active');document.removeEventListener('focusin',schedule);document.removeEventListener('focusout',schedule);installed.removeEventListener('change',schedule);cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);window.removeEventListener('orientationchange',settle);window.removeEventListener('pageshow',settle);document.removeEventListener('visibilitychange',settle);vv?.removeEventListener('resize',schedule);vv?.removeEventListener('scroll',schedule)};
}

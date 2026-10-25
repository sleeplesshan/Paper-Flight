import {readFile,writeFile} from 'node:fs/promises';
// Keep the entire game on the same origin so existing saves and SW scope survive.
const game=await readFile('dist/index.html','utf8');
await writeFile('dist/play.html',game);
await writeFile('dist/index.html',`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="application-version" content="26"><script>try{document.documentElement.dataset.screenMode=localStorage.getItem('paper-flight-screen-mode')||'current'}catch{}</script><title>유준이의 종이 비행</title><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icon.png"><link rel="stylesheet" href="/status-surface.css"><style>
:root{color-scheme:light;background:#eeeae0}*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html,body{margin:0;width:100%;min-height:100%;height:100vh;overflow:hidden;background:#eeeae0;overscroll-behavior:none}#game-shell{position:fixed;inset:0;width:100%;height:100vh;height:max(100vh,100dvh);overflow:hidden;background:#eeeae0}#game-frame{display:block;width:100%;height:100%;border:0;background:#eeeae0;touch-action:none}noscript{position:fixed;inset:0;background:#eeeae0;padding:40px}
/* Reference app outer geometry; opt-in so the confirmed bottom fix stays available. */
html[data-screen-mode=reference],html[data-screen-mode=reference] body{height:auto;min-height:100%;touch-action:manipulation;overscroll-behavior:auto}
html[data-screen-mode=reference] #game-shell{height:100dvh;touch-action:manipulation}
html[data-screen-mode=reference] #game-frame{touch-action:manipulation;-webkit-user-drag:none}
</style></head><body><div id="status-surface" aria-hidden="true"></div><main id="game-shell"><iframe id="game-frame" src="/play.html" title="유준이의 종이 비행" allow="autoplay" loading="eager"></iframe><noscript>게임을 실행하려면 JavaScript를 켜주세요.</noscript></main><script>
const installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const apple=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
document.documentElement.classList.toggle('status-surface-active',installed&&apple);
const frame=document.getElementById('game-frame'),shell=document.getElementById('game-shell');
if(location.search)frame.src='/play.html'+location.search;
function fitKeyboard(){const editable=frame.contentDocument?.activeElement?.matches('input,textarea,[contenteditable=true]');shell.style.height=editable?Math.min(innerHeight,visualViewport?.height||innerHeight)+'px':'';}
frame.addEventListener('load',()=>{const doc=frame.contentDocument;if(!doc)return;doc.addEventListener('focusin',fitKeyboard);doc.addEventListener('focusout',()=>setTimeout(fitKeyboard,0));fitKeyboard()});
window.visualViewport?.addEventListener('resize',fitKeyboard);window.addEventListener('resize',fitKeyboard);
</script></body></html>`);

/* ── THEME ── */
function toggleTheme(){
  const l=document.body.classList.toggle('light');
  document.getElementById('themeBtn').textContent=l?'☾ Dark':'☀ Light';
}

/* ── TAB NAVIGATION ── */
const langMap={about:'TypeScript',skills:'JSON',playwright:'TypeScript',metrics:'JSON',experience:'YAML',contact:'JSON'};

function openTab(el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.fi.sub').forEach(f=>f.classList.remove('active'));
  el.classList.add('active');
  const id=el.dataset.panel;
  document.getElementById('panel-'+id).classList.add('active');
  document.getElementById('winTitle').textContent=el.textContent.replace('✕','').trim();
  document.getElementById('sbLang').textContent=langMap[id]||'Text';
  // sync sidebar
  document.querySelectorAll('.fi.sub').forEach(f=>{
    if(f.getAttribute('onclick')&&f.getAttribute('onclick').includes("'"+id+"'"))f.classList.add('active');
  });
  // trigger KPI counter when metrics tab opens
  if(id==='metrics')triggerKpi();
}

function openTabById(id){
  const tab=document.querySelector(`.tab[data-panel="${id}"]`);
  if(tab)openTab(tab);
  closeSidebar(); // referme le tiroir mobile après sélection
}

/* ── TIROIR MOBILE (hamburger) ── */
function setSidebar(open){
  const sb=document.getElementById('sidebar'),sc=document.getElementById('scrim'),hb=document.getElementById('hamburger');
  if(!sb)return;
  sb.classList.toggle('open',open);
  if(sc)sc.classList.toggle('show',open);
  if(hb)hb.setAttribute('aria-expanded',open?'true':'false');
}
function toggleSidebar(){setSidebar(!document.getElementById('sidebar').classList.contains('open'));}
function closeSidebar(){setSidebar(false);}
// Échap ferme le tiroir ; repasser en desktop le réinitialise
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSidebar();});
window.addEventListener('resize',()=>{if(window.innerWidth>780)closeSidebar();});

/* ── KPI COUNTER ── */
let kpiDone=false;
function triggerKpi(){
  if(kpiDone)return;
  kpiDone=true;
  document.querySelectorAll('.kpiv[data-target]').forEach(el=>{
    const target=+el.dataset.target,suffix=el.dataset.suffix||'';
    let cur=0;const step=target/(1400/16);
    const t=setInterval(()=>{cur=Math.min(cur+step,target);el.textContent=Math.round(cur)+suffix;if(cur>=target)clearInterval(t);},16);
  });
}

/* ── SIMULATOR ── */
const tests=[
  {name:'auth.spec.ts › login success',fail:.10},
  {name:'auth.spec.ts › login failure',fail:.10},
  {name:'cart.spec.ts › add product',fail:.15},
  {name:'cart.spec.ts › remove product',fail:.08},
  {name:'checkout.spec.ts › payment success',fail:.20},
  {name:'checkout.spec.ts › payment failure',fail:.10},
  {name:'checkout.spec.ts › validate order',fail:.12},
  {name:'profile.spec.ts › update user',fail:.08},
  {name:'search.spec.ts › search results',fail:.10},
  {name:'api.spec.ts › GET /products',fail:.08},
  {name:'api.spec.ts › POST /order',fail:.12},
  {name:'e2e.spec.ts › full customer journey',fail:.25},
];

function renderTestList(){
  const el=document.getElementById('testList');
  el.innerHTML='';
  tests.forEach((t,i)=>{
    const d=document.createElement('div');
    d.className='stest';d.id='st-'+i;
    d.innerHTML=`<span class="si" id="si-${i}">○</span><span>${t.name}</span>`;
    el.appendChild(d);
  });
}

function setState(i,s){
  const item=document.getElementById('st-'+i),ic=document.getElementById('si-'+i);
  if(!item)return;
  item.className='stest '+s;
  ic.textContent={pass:'✔',fail:'✖',running:'◌'}[s]||'○';
}

function log(txt,c){
  const logs=document.getElementById('logs');
  const s=document.createElement('span');
  s.style.color={pass:'#4ec9b0',fail:'#f44747',info:'#569cd6',warn:'#febc2e',dim:'#6a9955'}[c]||'#abb2bf';
  s.textContent=txt+'\n';logs.appendChild(s);logs.scrollTop=logs.scrollHeight;
}

function ts(){return new Date().toLocaleTimeString('fr-FR');}
let running=false;

function runTests(){
  if(running)return;
  running=true;
  document.getElementById('runBtn').disabled=true;
  document.getElementById('screenshotBox').style.display='none';
  document.getElementById('progressFill').style.width='0%';
  document.getElementById('statPass').textContent='✔ 0';
  document.getElementById('statFail').textContent='✖ 0';
  document.getElementById('logs').innerHTML='';
  renderTestList();
  let passed=0,failed=0,idx=0;
  log(`[${ts()}]  Running Playwright v1.44.0`,'info');
  log(`[${ts()}]  Suite: ${tests.length} tests`,'info');
  log('','');

  function next(){
    if(idx>=tests.length){
      const pct=Math.round(passed/tests.length*100);
      log('','');log('  ───────────────────────────────────','dim');
      log(`  ✔ Passed    ${passed}`,'pass');
      log(`  ✖ Failed    ${failed}`,failed>0?'fail':'pass');
      log(`  Rate        ${pct}%  ${pct>=80?'(healthy)':'(needs attention)'}`,pct>=80?'pass':'warn');
      log(`  Duration    ${(tests.length*.35).toFixed(1)}s`,'dim');
      document.getElementById('runBtn').disabled=false;
      running=false;return;
    }
    const t=tests[idx];
    setState(idx,'running');
    log(`[${ts()}]  ▶  ${t.name}`,'info');
    setTimeout(()=>{
      if(Math.random()<t.fail){
        log('             ↻ retry 1/2…','warn');
        setTimeout(()=>{
          if(Math.random()<.5){
            log('             ✔ passed (retry)','pass');setState(idx,'pass');passed++;
          }else{
            log('             ✖ FAILED — screenshot captured','fail');setState(idx,'fail');failed++;
            document.getElementById('screenshotImg').src=`https://dummyimage.com/600x180/0d0d0d/f44747.png&text=FAIL+%7C+${encodeURIComponent(t.name.split(' › ')[1]||t.name)}`;
            document.getElementById('screenshotMsg').textContent='✖ '+t.name;
            document.getElementById('screenshotBox').style.display='block';
          }
          document.getElementById('statPass').textContent='✔ '+passed;
          document.getElementById('statFail').textContent='✖ '+failed;
          document.getElementById('progressFill').style.width=((idx+1)/tests.length*100)+'%';
          idx++;setTimeout(next,280);
        },480);
      }else{
        log('             ✔ passed','pass');setState(idx,'pass');passed++;
        document.getElementById('statPass').textContent='✔ '+passed;
        document.getElementById('progressFill').style.width=((idx+1)/tests.length*100)+'%';
        idx++;setTimeout(next,260);
      }
    },380);
  }
  next();
}

renderTestList();

/* ── INDICE DE SCROLL DES ONGLETS (mobile) ── */
(function tabScrollHint(){
  const wrap=document.getElementById('tabwrap'),bar=document.getElementById('tabbar');
  if(!wrap||!bar)return;
  const update=()=>{
    const scrollable=bar.scrollWidth>bar.clientWidth+2;
    const atEnd=bar.scrollLeft+bar.clientWidth>=bar.scrollWidth-2;
    wrap.classList.toggle('scrollable',scrollable&&!atEnd);
  };
  bar.addEventListener('scroll',update,{passive:true});
  window.addEventListener('resize',update);
  update();
})();

/* ── HINT TOAST ── */
function closeHint(){
  const h=document.getElementById('hint');
  if(!h)return;
  h.classList.add('hide');
  try{sessionStorage.setItem('hintSeen','1');}catch(e){}
  setTimeout(()=>h.remove(),320);
}
(function initHint(){
  let seen=false;
  try{seen=sessionStorage.getItem('hintSeen')==='1';}catch(e){}
  if(seen){const h=document.getElementById('hint');if(h)h.remove();return;}
  setTimeout(closeHint,7000); // auto-masquage
})();

/* ── ACCESSIBILITÉ CLAVIER (onglets) ── */
(function enhanceTabsA11y(){
  const tabs=[...document.querySelectorAll('.tab')];
  tabs.forEach(tab=>{
    tab.setAttribute('role','tab');
    tab.setAttribute('tabindex',tab.classList.contains('active')?'0':'-1');
    tab.setAttribute('aria-selected',tab.classList.contains('active')?'true':'false');
    const panel=document.getElementById('panel-'+tab.dataset.panel);
    if(panel){panel.setAttribute('role','tabpanel');panel.setAttribute('aria-label',tab.textContent.replace('✕','').trim());}
    tab.addEventListener('keydown',e=>{
      let target=null;
      if(e.key==='ArrowRight')target=tabs[(tabs.indexOf(tab)+1)%tabs.length];
      else if(e.key==='ArrowLeft')target=tabs[(tabs.indexOf(tab)-1+tabs.length)%tabs.length];
      else if(e.key==='Home')target=tabs[0];
      else if(e.key==='End')target=tabs[tabs.length-1];
      else if(e.key==='Enter'||e.key===' '){e.preventDefault();openTab(tab);return;}
      if(target){e.preventDefault();openTab(target);target.focus();}
    });
  });
  // garde l'état ARIA synchronisé à chaque changement d'onglet
  const _openTab=window.openTab;
  window.openTab=function(el){
    _openTab(el);
    tabs.forEach(t=>{
      const on=t.classList.contains('active');
      t.setAttribute('aria-selected',on?'true':'false');
      t.setAttribute('tabindex',on?'0':'-1');
    });
  };
})();

/* ── WIRING DES ÉVÉNEMENTS (remplace les handlers inline — requis par la CSP stricte) ── */
(function wireEvents(){
  const on=(el,ev,fn)=>{if(el)el.addEventListener(ev,fn);};
  on(document.getElementById('themeBtn'),'click',toggleTheme);
  on(document.getElementById('hamburger'),'click',toggleSidebar);
  on(document.getElementById('scrim'),'click',closeSidebar);
  on(document.querySelector('.sb-close'),'click',closeSidebar);
  on(document.getElementById('runBtn'),'click',runTests);
  on(document.querySelector('.hint .hclose'),'click',closeHint);
  document.querySelectorAll('.tab').forEach(t=>on(t,'click',()=>openTab(t)));
  document.querySelectorAll('[data-open]').forEach(el=>on(el,'click',()=>openTabById(el.dataset.open)));
  const av=document.querySelector('.avatar');
  if(av){
    const fail=()=>{av.style.display='none';const fb=document.getElementById('avatar-fallback');if(fb)fb.style.display='flex';};
    if(av.complete&&av.naturalWidth===0)fail(); // image déjà en échec avant l'attache du listener
    else av.addEventListener('error',fail);
  }
})();

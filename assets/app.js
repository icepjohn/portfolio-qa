(function(){
'use strict';

/* ───────── DÉVERROUILLAGE : à exécuter avant tout ce qui peut planter ─────────
   .js active les styles « JS disponible » (préloader + reveals).
   unlock() rend la page utilisable quoi qu'il arrive ensuite : il est armé sur
   un timer ET sur window.onerror, donc une exception plus bas ne peut plus
   laisser le visiteur devant un écran vide. */
document.documentElement.classList.add('js');
let lint=null;
function unlock(){
  if(lint){clearInterval(lint);lint=null;}
  const l=document.getElementById('loader');
  if(l) l.classList.add('gone');
  document.body.classList.remove('lock');
}
const failsafe=setTimeout(unlock,4200);
window.addEventListener('error',unlock);

const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const HAS_GSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
if (HAS_GSAP) gsap.registerPlugin(ScrollTrigger);
const $  = (s,c)=> (c||document).querySelector(s);
const $$ = (s,c)=> Array.from((c||document).querySelectorAll(s));
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

/* ───────── SMOOTH SCROLL ───────── */
let lenis=null;
if (typeof window.Lenis !== 'undefined' && !RM){
  lenis = new Lenis({duration:1.15, easing:t=>Math.min(1,1.001-Math.pow(2,-10*t)), smoothWheel:true});
  if (HAS_GSAP){
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t=>lenis.raf(t*1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf=t=>{lenis.raf(t);requestAnimationFrame(raf);};requestAnimationFrame(raf);
  }
}
$$('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const t=document.querySelector(a.getAttribute('href'));
    if(!t) return;
    e.preventDefault();
    closeDrawer({restoreFocus:false});
    if(lenis) lenis.scrollTo(t,{offset:-20});
    else t.scrollIntoView({behavior:'smooth'});
    // sans ça le focus reste sur le lien : au Tab suivant on repart de la nav
    // au lieu de continuer dans la section qu'on vient d'atteindre
    t.setAttribute('tabindex','-1');
    t.focus({preventScroll:true});
  });
});

/* ───────── PRELOADER ───────── */
const lbar=$('#loaderBar');
let lp=0, booted=false;
lint=setInterval(()=>{lp=Math.min(100,lp+Math.random()*18+6);lbar.style.width=lp+'%';},110);
function bootDone(){
  if(booted) return; booted=true;
  clearTimeout(failsafe);          // le filet n'a plus lieu d'être
  clearInterval(lint); lint=null;
  lbar.style.width='100%';
  setTimeout(()=>{
    unlock();
    if(HAS_GSAP) ScrollTrigger.refresh();
  },420);
}
window.addEventListener('load',()=>setTimeout(bootDone,520));

/* ───────── NAV ───────── */
const nav=$('#nav'), drawer=$('#drawer'), burger=$('#burger');
const FOCUSABLE='a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

function setDrawer(open,opts){
  drawer.classList.toggle('open',open);
  document.body.classList.toggle('lock',open);
  burger.setAttribute('aria-expanded',String(open));
  burger.setAttribute('aria-label',open?'Fermer le menu':'Ouvrir le menu');
  // fermé, le tiroir n'est que translaté hors écran : ses liens restaient dans
  // l'ordre de tabulation sur desktop, où le tiroir n'apparaît jamais.
  drawer.inert = !open;
  drawer.setAttribute('aria-hidden',String(!open));
  if(open){
    const first=drawer.querySelector(FOCUSABLE);
    if(first) first.focus();
  } else if(!opts || opts.restoreFocus!==false){
    burger.focus();
  }
}
function closeDrawer(opts){ if(drawer.classList.contains('open')) setDrawer(false,opts); }
burger.addEventListener('click',()=>setDrawer(!drawer.classList.contains('open')));

document.addEventListener('keydown',e=>{
  if(!drawer.classList.contains('open')) return;
  if(e.key==='Escape'){e.preventDefault();setDrawer(false);return;}
  if(e.key!=='Tab') return;
  // piège de focus : on boucle sur les liens du tiroir tant qu'il est ouvert
  const items=$$(FOCUSABLE,drawer).filter(el=>el.offsetParent!==null);
  if(!items.length) return;
  const first=items[0], last=items[items.length-1];
  if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
});
setDrawer(false,{restoreFocus:false});
let lastY=0;
const toneEls=$$('[data-tone]');
function navUpdate(){
  const y=window.scrollY;
  nav.classList.toggle('hide', y>lastY+8 && y>420 && !drawer.classList.contains('open'));
  if(Math.abs(y-lastY)>4) lastY=y;
  // tonalité de la section située sous la nav
  let tone='dark';
  for(const s of toneEls){
    const r=s.getBoundingClientRect();
    if(r.top<=52 && r.bottom>52){ tone=s.dataset.tone; break; }
  }
  nav.classList.toggle('on-light', tone==='paper');
}
window.addEventListener('scroll',navUpdate,{passive:true});
navUpdate();

/* ───────── REVEALS ───────── */
if(HAS_GSAP && !RM){
  $$('.rv').forEach(el=>{
    gsap.fromTo(el,{opacity:0,y:34},{opacity:1,y:0,duration:1,ease:'power3.out',
      scrollTrigger:{trigger:el,start:'top 88%',once:true}});
  });
} else {
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.12});
  $$('.rv').forEach(el=>io.observe(el));
}

/* ───────── TITRES QUI SE REMPLISSENT MOT PAR MOT ───────── */
$$('[data-fill]').forEach(h=>{
  const walk=node=>{
    Array.from(node.childNodes).forEach(n=>{
      if(n.nodeType===3){
        const frag=document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part=>{
          if(!part.trim()){frag.appendChild(document.createTextNode(part));return;}
          const s=document.createElement('span'); s.className='w'; s.textContent=part; frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if(n.nodeType===1 && !n.classList.contains('w')) walk(n);
    });
  };
  walk(h);
  const words=$$('.w',h);
  if(!words.length) return;
  if(RM){words.forEach(w=>w.classList.add('lit'));return;}
  if(HAS_GSAP){
    ScrollTrigger.create({
      trigger:h, start:'top 82%', end:'bottom 46%', scrub:true,
      onUpdate:st=>{
        const k=Math.round(st.progress*words.length);
        words.forEach((w,i)=>w.classList.toggle('lit',i<k));
      }
    });
  } else {
    new IntersectionObserver(es=>es.forEach(e=>{
      if(e.isIntersecting) words.forEach((w,i)=>setTimeout(()=>w.classList.add('lit'),i*45));
    }),{threshold:.4}).observe(h);
  }
});

/* ═════════════════════════════════════════════
   HERO — animation cinématique scrubée au scroll
   ═════════════════════════════════════════════ */
(function heroScene(){
  const cv=$('#heroCanvas'); if(!cv) return;
  const ctx=cv.getContext('2d');
  let W=0,H=0,dpr=1;
  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    W=cv.clientWidth; H=cv.clientHeight;
    cv.width=W*dpr; cv.height=H*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize',()=>{resize();draw(P);});

  // grille de "cas de tests"
  const COLS=16, ROWS=11, cells=[];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    cells.push({c,r,d:(r*0.55+c*0.35)/((ROWS+COLS)*0.6)+Math.random()*0.18, fail:Math.random()<0.055});
  }
  let P=0;

  function bg(p){
    const g=ctx.createLinearGradient(0,0,0,H);
    if(p<0.34){
      const k=p/0.34;
      g.addColorStop(0, mix('#1A2A2E','#0A1F1A',k));
      g.addColorStop(0.55, mix('#C98A4B','#0E2B24',k));
      g.addColorStop(1, mix('#EAB877','#0A1F1A',k));
    } else {
      g.addColorStop(0,'#0A1F1A'); g.addColorStop(1,'#050F0C');
    }
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  }
  function mix(a,b,t){
    const pa=[1,3,5].map(i=>parseInt(a.substr(i,2),16));
    const pb=[1,3,5].map(i=>parseInt(b.substr(i,2),16));
    return '#'+pa.map((v,i)=>Math.round(lerp(v,pb[i],clamp(t,0,1))).toString(16).padStart(2,'0')).join('');
  }

  // phase 1 : "convoi" — une longue barre de livraison qui traverse
  function convoy(p){
    const k=clamp(p/0.30,0,1);
    const x=lerp(W*1.25,-W*0.55,ease(k));
    const y=H*0.62, hh=Math.min(H*0.26,170), ww=Math.min(W*0.62,760);
    ctx.save();
    ctx.globalAlpha=clamp(1-(p-0.24)/0.10,0,1);
    // sol
    ctx.fillStyle='rgba(4,10,8,.92)'; ctx.fillRect(0,y+hh*0.5,W,H);
    // remorque
    ctx.fillStyle='rgba(6,14,11,.96)';
    ctx.strokeStyle='rgba(237,237,236,.30)'; ctx.lineWidth=1;
    rr(x,y-hh*0.5,ww,hh,6); ctx.fill(); ctx.stroke();
    // cabine
    rr(x+ww+10,y-hh*0.34,hh*1.15,hh*0.84,10); ctx.fill(); ctx.stroke();
    // roues
    ctx.fillStyle='rgba(3,8,6,1)';
    [x+ww*0.12,x+ww*0.24,x+ww*0.86,x+ww*0.97,x+ww+hh*0.85].forEach(wx=>{
      ctx.beginPath(); ctx.arc(wx,y+hh*0.5,hh*0.15,0,7); ctx.fill();
    });
    // liseré acide qui progresse : "la livraison est validée"
    ctx.strokeStyle='rgba(195,245,60,'+(k*0.85)+')'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x,y-hh*0.5); ctx.lineTo(x+ww*k,y-hh*0.5); ctx.stroke();
    ctx.restore();
  }
  function rr(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }

  // phases 2-4 : la grille isométrique de tests
  function yard(p){
    const k=clamp((p-0.22)/0.78,0,1);
    const appear=clamp((p-0.22)/0.14,0,1);
    if(appear<=0) return;
    const s=lerp(26,64,ease(k));
    const ox=W/2, oy=H*(0.60-0.10*ease(k));
    const runK=clamp((p-0.46)/0.34,0,1);   // exécution
    const scanY=lerp(-0.2,1.25,clamp((p-0.44)/0.42,0,1));
    ctx.save();
    ctx.globalAlpha=appear;
    cells.forEach(cell=>{
      const gx=cell.c-(COLS-1)/2, gy=cell.r-(ROWS-1)/2;
      const px=ox+(gx-gy)*s*1.06;
      const py=oy+(gx+gy)*s*0.50;
      if(px<-140||px>W+140||py<-90||py>H+90) return;
      const w=s*0.92, h=s*0.44;
      const done = runK > cell.d;
      const prog = clamp((runK-cell.d)*7,0,1);
      ctx.beginPath();
      ctx.moveTo(px,py-h/2); ctx.lineTo(px+w/2,py); ctx.lineTo(px,py+h/2); ctx.lineTo(px-w/2,py); ctx.closePath();
      if(done && !cell.fail){
        ctx.fillStyle='rgba(195,245,60,'+(0.10+0.36*prog)+')';
        ctx.strokeStyle='rgba(195,245,60,'+(0.28+0.55*prog)+')';
      } else if(done && cell.fail){
        ctx.fillStyle='rgba(255,107,94,'+(0.14+0.3*prog)+')';
        ctx.strokeStyle='rgba(255,107,94,.75)';
      } else {
        ctx.fillStyle='rgba(237,237,236,.025)';
        ctx.strokeStyle='rgba(237,237,236,.16)';
      }
      ctx.lineWidth=1; ctx.fill(); ctx.stroke();
      // élévation "conteneur" pour les cellules déjà passées
      if(done && prog>0.4){
        const e=lerp(0,s*0.42,(prog-0.4)/0.6);
        ctx.globalAlpha=appear*0.55;
        ctx.beginPath();
        ctx.moveTo(px-w/2,py); ctx.lineTo(px,py+h/2); ctx.lineTo(px,py+h/2-e); ctx.lineTo(px-w/2,py-e); ctx.closePath();
        ctx.fillStyle=cell.fail?'rgba(120,40,34,.75)':'rgba(24,58,44,.85)'; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px+w/2,py); ctx.lineTo(px,py+h/2); ctx.lineTo(px,py+h/2-e); ctx.lineTo(px+w/2,py-e); ctx.closePath();
        ctx.fillStyle=cell.fail?'rgba(90,28,24,.75)':'rgba(16,42,32,.85)'; ctx.fill();
        ctx.globalAlpha=appear;
      }
    });
    // ligne de scan
    if(p>0.44 && p<0.90){
      const sy=scanY*H;
      const g=ctx.createLinearGradient(0,sy-70,0,sy+8);
      g.addColorStop(0,'rgba(195,245,60,0)'); g.addColorStop(1,'rgba(195,245,60,.30)');
      ctx.fillStyle=g; ctx.fillRect(0,sy-70,W,78);
      ctx.fillStyle='rgba(195,245,60,.65)'; ctx.fillRect(0,sy,W,1);
    }
    ctx.restore();
  }

  // vignette + poussière
  const dust=Array.from({length:70},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.6+.3,s:Math.random()*.4+.1}));
  function overlay(p){
    ctx.save();
    ctx.globalAlpha=clamp((p-0.18)/0.2,0,1)*0.5;
    dust.forEach(d=>{
      const y=(d.y+p*d.s)%1;
      ctx.fillStyle='rgba(237,237,236,.5)';
      ctx.beginPath(); ctx.arc(d.x*W,y*H,d.r,0,7); ctx.fill();
    });
    ctx.restore();
    const v=ctx.createRadialGradient(W/2,H/2,H*0.25,W/2,H/2,H*0.95);
    v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(0,0,0,.62)');
    ctx.fillStyle=v; ctx.fillRect(0,0,W,H);
  }

  function draw(p){
    P=p;
    if(!W) return;
    bg(p); convoy(p); yard(p); overlay(p);
  }

  // slides de texte
  const slides=[$('#hs1'),$('#hs2'),$('#hs3')];
  function slidesUpdate(p){
    let idx = p<0.30?0 : p<0.62?1 : 2;
    slides.forEach((s,i)=>s.classList.toggle('on',i===idx));
  }

  resize();
  draw(0); slidesUpdate(0);

  if(HAS_GSAP && !RM){
    ScrollTrigger.create({
      trigger:'#hero', start:'top top', end:'bottom bottom', scrub:0.6,
      onUpdate:st=>{draw(st.progress);slidesUpdate(st.progress);},
      onRefresh:()=>{resize();draw(P);}
    });
  } else {
    const hero=$('#hero');
    const upd=()=>{
      const r=hero.getBoundingClientRect();
      const p=clamp(-r.top/(hero.offsetHeight-window.innerHeight),0,1);
      draw(p); slidesUpdate(p);
    };
    window.addEventListener('scroll',upd,{passive:true}); upd();
  }
})();

/* ═════════════════════════════════════════════
   VISUELS GÉNÉRÉS (cartes + piliers)
   ═════════════════════════════════════════════ */
(function vizEngine(){
  const canvases=$$('canvas[data-viz]');
  const states=canvases.map(cv=>{
    const ctx=cv.getContext('2d');
    return {cv,ctx,t:Math.random()*100,vis:false,kind:cv.dataset.viz,seed:Math.random()*1000};
  });
  function fit(s){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=s.cv.clientWidth||300, h=s.cv.clientHeight||200;
    s.cv.width=w*dpr; s.cv.height=h*dpr; s.ctx.setTransform(dpr,0,0,dpr,0,0);
    s.w=w; s.h=h;
  }
  states.forEach(fit);
  window.addEventListener('resize',()=>states.forEach(fit));
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    const s=states.find(x=>x.cv===e.target); if(s){s.vis=e.isIntersecting; if(e.isIntersecting) fit(s);}
  }),{threshold:.05});
  states.forEach(s=>io.observe(s.cv));

  const AC='rgba(195,245,60,', LN='rgba(237,237,236,';

  function render(s,dt){
    const {ctx,w,h}=s; s.t+=dt;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#061511'; ctx.fillRect(0,0,w,h);
    const t=s.t;
    switch(s.kind){
      case 'grid':{ // grille de tests qui passent au vert
        const cols=9, rows=6, gap=4;
        const cw=(w-gap*(cols+1))/cols, ch=(h-gap*(rows+1))/rows;
        for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
          const i=r*cols+c, ph=(t*0.5+i*0.06)%2;
          const on=ph<1.1;
          ctx.fillStyle= on? AC+(0.14+0.5*Math.max(0,1-Math.abs(ph-0.4)*1.6))+')' : LN+'.06)';
          ctx.fillRect(gap+c*(cw+gap), gap+r*(ch+gap), cw, ch);
        }
        break;
      }
      case 'wave':{ // stabilité : bruit qui se calme
        ctx.strokeStyle=LN+'.10)'; ctx.lineWidth=1;
        for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(0,h*i/4);ctx.lineTo(w,h*i/4);ctx.stroke();}
        ctx.beginPath(); ctx.lineWidth=2; ctx.strokeStyle=AC+'.85)';
        for(let x=0;x<=w;x+=3){
          const k=x/w;
          const amp=lerp(h*0.30,h*0.03,k);
          const y=h/2+Math.sin(x*0.09+t*2)*amp*Math.sin(x*0.31+t)*0.9;
          x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.stroke();
        break;
      }
      case 'pipe':{ // pipeline CI
        const stages=5, pad=26, sw=(w-pad*2)/(stages-1);
        ctx.strokeStyle=LN+'.16)'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(pad,h/2); ctx.lineTo(w-pad,h/2); ctx.stroke();
        const prog=(t*0.28)%1.3;
        ctx.strokeStyle=AC+'.9)'; ctx.beginPath();
        ctx.moveTo(pad,h/2); ctx.lineTo(pad+(w-pad*2)*clamp(prog,0,1),h/2); ctx.stroke();
        for(let i=0;i<stages;i++){
          const x=pad+sw*i, done=prog>i/(stages-1);
          ctx.beginPath(); ctx.arc(x,h/2,done?9:6,0,7);
          ctx.fillStyle=done?AC+'1)':'#0B241D'; ctx.fill();
          ctx.strokeStyle=done?AC+'1)':LN+'.28)'; ctx.lineWidth=1.5; ctx.stroke();
        }
        break;
      }
      case 'nodes':{ // réseau de tests
        const N=26; ctx.save();
        const pts=[];
        for(let i=0;i<N;i++){
          const a=i*2.399+t*0.12, rad=(0.16+0.36*((i*37%100)/100))*Math.min(w,h);
          pts.push([w/2+Math.cos(a)*rad*1.5, h/2+Math.sin(a)*rad]);
        }
        ctx.lineWidth=1;
        pts.forEach((p,i)=>pts.forEach((q,j)=>{
          if(j<=i) return;
          const d=Math.hypot(p[0]-q[0],p[1]-q[1]);
          if(d<w*0.20){ctx.strokeStyle=LN+(0.16*(1-d/(w*0.20)))+')';ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();}
        }));
        pts.forEach((p,i)=>{
          const on=((t*0.6+i*0.4)%4)<1.4;
          ctx.beginPath(); ctx.arc(p[0],p[1],on?4:2.4,0,7);
          ctx.fillStyle=on?AC+'.95)':LN+'.34)'; ctx.fill();
        });
        ctx.restore();
        break;
      }
      case 'shift':{ // coût du bug selon la phase
        const bars=6, pad=30, bw=(w-pad*2)/bars*0.6, gap=(w-pad*2)/bars;
        for(let i=0;i<bars;i++){
          const target=Math.pow(1.72,i)/Math.pow(1.72,bars-1);
          const k=clamp((t*0.5)%4-i*0.16,0,1);
          const bh=(h-70)*target*ease(k);
          const x=pad+gap*i+(gap-bw)/2;
          ctx.fillStyle= i<2? AC+'.85)' : LN+(0.14+i*0.03)+')';
          ctx.fillRect(x,h-40-bh,bw,bh);
        }
        ctx.strokeStyle=LN+'.2)'; ctx.beginPath(); ctx.moveTo(pad*0.6,h-40); ctx.lineTo(w-pad*0.6,h-40); ctx.stroke();
        ctx.fillStyle=LN+'.4)'; ctx.font='9px "JetBrains Mono",monospace';
        ctx.fillText('REFINEMENT',pad-4,h-24); ctx.fillText('PROD',w-pad-24,h-24);
        break;
      }
      case 'pipeline':{ // commits -> jobs
        const rows=5, pad=18, rh=(h-pad*2)/rows;
        for(let r=0;r<rows;r++){
          const y=pad+rh*r+rh/2;
          ctx.strokeStyle=LN+'.10)'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(w-pad,y); ctx.stroke();
          const seg=((t*0.35+r*0.19)%1.35);
          const x0=pad, len=(w-pad*2)*clamp(seg,0,1);
          ctx.strokeStyle=AC+(seg>1?Math.max(0,(1.35-seg)/0.35):1)+')'; ctx.lineWidth=2.5;
          ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x0+len,y); ctx.stroke();
          if(seg<1){ctx.fillStyle=AC+'1)';ctx.beginPath();ctx.arc(x0+len,y,3.4,0,7);ctx.fill();}
        }
        break;
      }
      case 'chart':{ // courbe de qualité
        const pad=26, n=34;
        ctx.strokeStyle=LN+'.09)';
        for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(pad,pad+(h-pad*2)*i/4);ctx.lineTo(w-pad,pad+(h-pad*2)*i/4);ctx.stroke();}
        const val=i=>{const k=i/(n-1);return 0.72-0.5*k+0.07*Math.sin(k*11+t*0.6)+0.04*Math.sin(k*23);};
        ctx.beginPath();
        for(let i=0;i<n;i++){
          const x=pad+(w-pad*2)*i/(n-1), y=pad+(h-pad*2)*clamp(val(i),0,1);
          i?ctx.lineTo(x,y):ctx.moveTo(x,y);
        }
        ctx.lineTo(w-pad,h-pad); ctx.lineTo(pad,h-pad); ctx.closePath();
        const g=ctx.createLinearGradient(0,0,0,h);
        g.addColorStop(0,AC+'.28)'); g.addColorStop(1,AC+'0)');
        ctx.fillStyle=g; ctx.fill();
        ctx.beginPath();
        for(let i=0;i<n;i++){
          const x=pad+(w-pad*2)*i/(n-1), y=pad+(h-pad*2)*clamp(val(i),0,1);
          i?ctx.lineTo(x,y):ctx.moveTo(x,y);
        }
        ctx.strokeStyle=AC+'.95)'; ctx.lineWidth=2; ctx.stroke();
        break;
      }
    }
    // liseré de grille
    ctx.strokeStyle=LN+'.07)'; ctx.lineWidth=1;
    for(let x=0;x<w;x+=34){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  }

  let last=performance.now();
  function loop(now){
    const dt=Math.min((now-last)/1000,0.05); last=now;
    states.forEach(s=>{if(s.vis && !RM) render(s,dt); else if(s.vis && RM && !s.done){render(s,0);s.done=true;}});
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* ═════════════════════════════════════════════
   CALCULATEUR ROI
   ═════════════════════════════════════════════ */
(function calc(){
  const ids=['cCamp','cCas','cDur','cTx','cAuto'];
  const el={}; ids.forEach(i=>el[i]=document.getElementById(i));
  const eur=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
  const num=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(n);
  /* Les min/max du HTML ne bornent pas la saisie clavier : on relit la valeur
     en la ramenant dans l'intervalle déclaré sur le champ, sinon un « 999999 »
     ou un nombre négatif produit un résultat aberrant mais crédible. */
  function val(id){
    const e=el[id];
    const n=parseFloat(e.value);
    if(!isFinite(n)) return 0;
    const min=parseFloat(e.min), max=parseFloat(e.max);
    return clamp(n, isFinite(min)?min:0, isFinite(max)?max:Infinity);
  }
  function run(){
    const camp=val('cCamp'), cas=val('cCas'), dur=val('cDur'), tx=val('cTx');
    const auto=val('cAuto')/100;
    document.getElementById('cAutoV').textContent=Math.round(auto*100)+' %';
    const hManual = camp*cas*dur/60;
    const costNow = hManual*tx;
    const hAfter  = camp*(cas*(1-auto)*dur/60 + cas*auto*dur/60*0.03);
    const buildH  = cas*auto*0.75;               // ~45 min de dev par test, amorti sur 1 an
    const costAfter = (hAfter+buildH)*tx;
    const save = costNow-costAfter;
    const pct = costNow>0 ? save/costNow*100 : 0;
    document.getElementById('rSave').textContent   = eur(Math.max(0,save));
    document.getElementById('rPct').textContent    = Math.max(0,Math.round(pct))+' %';
    document.getElementById('rNow').textContent    = eur(costNow);
    document.getElementById('rAfter').textContent  = eur(costAfter);
    document.getElementById('rHours').textContent  = num(Math.max(0,hManual-hAfter-buildH))+' h';
    document.getElementById('rDays').textContent   = num(Math.max(0,(hManual-hAfter-buildH)/7))+' j';
  }
  ids.forEach(i=>{
    el[i].addEventListener('input',run);
    // au commit (blur / Entrée), on recale le champ sur la valeur réellement
    // utilisée pour que l'affichage et le résultat ne se contredisent pas
    el[i].addEventListener('change',()=>{
      if(el[i].value!=='') el[i].value=val(i);
      run();
    });
  });
  run();
})();

/* ═════════════════════════════════════════════
   RAIL À ONGLETS
   ═════════════════════════════════════════════ */
(function rail(){
  const rail=document.getElementById('rail');
  const tabs=$$('#railTabs .tab-b');
  const cards=$$('.rcard',rail);
  tabs.forEach(b=>b.addEventListener('click',()=>{
    tabs.forEach(x=>x.classList.remove('active')); b.classList.add('active');
    const c=cards[+b.dataset.i]; if(c) rail.scrollTo({left:c.offsetLeft-rail.offsetLeft,behavior:'smooth'});
  }));
  rail.addEventListener('scroll',()=>{
    let best=0,bd=1e9;
    cards.forEach((c,i)=>{const d=Math.abs(c.offsetLeft-rail.offsetLeft-rail.scrollLeft);if(d<bd){bd=d;best=i;}});
    tabs.forEach((x,i)=>x.classList.toggle('active',i===best));
  },{passive:true});
})();

/* ═════════════════════════════════════════════
   COMPTEURS
   ═════════════════════════════════════════════ */
(function counters(){
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting) return; io.unobserve(e.target);
    const el=e.target, target=+el.dataset.count, pre=el.dataset.prefix||'', suf=el.dataset.suffix||'';
    const dur=1500, t0=performance.now();
    const fmt=n=>new Intl.NumberFormat('fr-FR').format(n);
    (function step(now){
      const k=clamp((now-t0)/dur,0,1);
      el.textContent=pre+fmt(Math.round(target*(1-Math.pow(1-k,3))))+suf;
      if(k<1) requestAnimationFrame(step);
    })(t0);
  }),{threshold:.4});
  $$('[data-count]').forEach(el=>io.observe(el));
})();

/* ═════════════════════════════════════════════
   PARCOURS
   ═════════════════════════════════════════════ */
(function timeline(){
  const jobs=[
    {d:'Avr 2025 – Mar 2026', t:'QA Engineer', co:'Decathlon — SPARK (PLM)',
     li:['Analyse & conception de 1 200 cas de tests','Rédaction d\'environ 100 scénarios E2E','Analyse des processus métier PLM (Centric vs SPO/PACE)','Campagnes de recette & de non-régression','Automatisation d\'environ 50 tests'],
     s:['Playwright','Xray','Jira','GitHub','Cucumber','Bruno']},
    {d:'Mar 2024 – Fév 2025', t:'QA Lead Automation', co:'ADEO',
     li:['Mise en place du Shift Left testing','Automatisation TNR transverse (~500 tests)','Priorisation & stratégie de tests','Préparation des jeux de données','Reporting qualité produit'],
     s:['Playwright','BDD','Xray','Jira','GitHub','Vault']},
    {d:'Juil 2021 – Mar 2024', t:'QA Automation Engineer', co:'ADEO — POPS',
     li:['Automatisation avec Cerberus & Cypress','Tests UI / API / performance','Gestion des anomalies & non-régression','Tests E2E & 2A2, méthodologie ISTQB'],
     s:['Cypress','Postman','Sonar','Xray']},
    {d:'2020 – 2021', t:'QA & Support', co:'Proch\'Orientation',
     li:['Gestion des tickets de bugs & évolutions','Analyse fonctionnelle & recette'],
     s:['VueJS','Java','Selenium','Postman']},
    {d:'2019 – 2020', t:'QA Tester', co:'Symbol-IT',
     li:['Tests manuels & non-régression','Suivi des anomalies'],
     s:['Selenium','Postman','API REST']}
  ];
  const box=document.getElementById('tl');
  jobs.forEach((j,i)=>{
    const d=document.createElement('div');
    const open=i===0, panelId='job-panel-'+i;
    d.className='job rv'+(open?' open':'');
    // le "+" est un vrai <button> : c'est lui qui porte l'état et rend
    // l'accordéon utilisable au clavier (Entrée / Espace natifs).
    d.innerHTML=`
      <div class="job-date">${j.d}</div>
      <div class="job-t"><h3>${j.t}</h3><div class="co">${j.co}</div></div>
      <button type="button" class="job-plus" aria-expanded="${open}" aria-controls="${panelId}"><span aria-hidden="true">+</span><span class="sr-only">Détails du poste ${j.t} chez ${j.co}</span></button>
      <div class="job-d" id="${panelId}">
        <ul>${j.li.map(x=>`<li>${x}</li>`).join('')}</ul>
        <div class="stack">${j.s.map(x=>`<span>${x}</span>`).join('')}</div>
      </div>`;
    const btn=d.querySelector('.job-plus');
    const toggle=()=>{
      const now=d.classList.toggle('open');
      btn.setAttribute('aria-expanded',String(now));
      if(HAS_GSAP)setTimeout(()=>ScrollTrigger.refresh(),650);
    };
    btn.addEventListener('click',toggle);
    // la carte entière reste cliquable à la souris, sans double bascule
    d.addEventListener('click',e=>{ if(!e.target.closest('.job-plus')) toggle(); });
    box.appendChild(d);
  });
  if(HAS_GSAP && !RM){
    $$('.job',box).forEach(el=>gsap.fromTo(el,{opacity:0,y:26},{opacity:1,y:0,duration:.8,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 90%',once:true}}));
  } else {
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.1});
    $$('.job',box).forEach(el=>io.observe(el));
  }
})();

/* ═════════════════════════════════════════════
   RUNNER PLAYWRIGHT (simulation)
   ═════════════════════════════════════════════ */
(function runner(){
  const tests=[
    {n:'auth.spec.ts › login success',f:.10},
    {n:'auth.spec.ts › login failure',f:.10},
    {n:'cart.spec.ts › add product',f:.15},
    {n:'cart.spec.ts › remove product',f:.08},
    {n:'checkout.spec.ts › payment success',f:.20},
    {n:'checkout.spec.ts › payment failure',f:.10},
    {n:'checkout.spec.ts › validate order',f:.12},
    {n:'profile.spec.ts › update user',f:.08},
    {n:'search.spec.ts › search results',f:.10},
    {n:'api.spec.ts › GET /products',f:.08},
    {n:'api.spec.ts › POST /order',f:.12},
    {n:'e2e.spec.ts › full customer journey',f:.25}
  ];
  const list=document.getElementById('testList'), term=document.getElementById('term');
  const prog=document.getElementById('prog'), sP=document.getElementById('sPass'), sF=document.getElementById('sFail'), sT=document.getElementById('sTime');
  const btn=document.getElementById('runBtn'), status=document.getElementById('runStatus');
  let busy=false;
  function paint(){
    list.innerHTML=tests.map((t,i)=>`<div class="rt" id="rt${i}"><span class="ic">○</span><span>${t.n}</span></div>`).join('');
  }
  function state(i,s){
    const el=document.getElementById('rt'+i); if(!el) return;
    el.className='rt '+s;
    el.querySelector('.ic').textContent={pass:'✔',fail:'✖',running:'◌'}[s]||'○';
  }
  const COL={pass:'#C3F53C',fail:'#FF6B5E',info:'#7FA9C9',warn:'#E9C46A',dim:'#5C7A6F'};
  function log(txt,c){
    const s=document.createElement('span');
    s.style.color=COL[c]||'#9FB3AC'; s.textContent=txt+'\n';
    term.appendChild(s); term.scrollTop=term.scrollHeight;
  }
  const now=()=>new Date().toLocaleTimeString('fr-FR');
  paint();
  btn.addEventListener('click',()=>{
    if(busy) return; busy=true;
    btn.disabled=true; btn.setAttribute('aria-busy','true'); btn.style.opacity=.5;
    status.textContent='Exécution de la suite en cours, '+tests.length+' tests.';
    paint(); term.textContent=''; prog.style.width='0%';
    sP.textContent='✔ 0'; sF.textContent='✖ 0'; sT.textContent='';
    let pass=0,fail=0,i=0;
    const t0=performance.now();
    log('['+now()+']  Running Playwright v1.44.0 — chromium','info');
    log('['+now()+']  Suite: '+tests.length+' tests, 4 workers','info');
    log('','');
    (function next(){
      if(i>=tests.length){
        const pct=Math.round(pass/tests.length*100);
        log(''); log('  ─────────────────────────────','dim');
        log('  ✔ Passed    '+pass,'pass');
        log('  ✖ Failed    '+fail, fail?'fail':'pass');
        log('  Rate        '+pct+' %  '+(pct>=80?'(healthy)':'(needs attention)'), pct>=80?'pass':'warn');
        log('  Duration    '+((performance.now()-t0)/1000).toFixed(1)+'s','dim');
        sT.textContent=((performance.now()-t0)/1000).toFixed(1)+'s';
        status.textContent='Suite terminée : '+pass+' tests réussis, '+fail+' en échec sur '+tests.length+', en '+((performance.now()-t0)/1000).toFixed(1)+' secondes.';
        btn.disabled=false; btn.removeAttribute('aria-busy'); btn.style.opacity=1; busy=false; return;
      }
      const t=tests[i];
      state(i,'running');
      log('['+now()+']  ▶  '+t.n,'info');
      setTimeout(()=>{
        const flaky=Math.random()<t.f;
        const finish=(ok,msg,col)=>{
          log(msg,col);
          state(i,ok?'pass':'fail');
          ok?pass++:fail++;
          sP.textContent='✔ '+pass; sF.textContent='✖ '+fail;
          i++; prog.style.width=(i/tests.length*100)+'%';
          setTimeout(next,90);
        };
        if(flaky){
          log('             ↻ retry 1/2…','warn');
          setTimeout(()=>{
            Math.random()<.55
              ? finish(true,'             ✔ passed (retry)','pass')
              : finish(false,'             ✖ FAILED — trace + screenshot capturés','fail');
          },420);
        } else {
          finish(true,'             ✔ passed ('+(120+Math.random()*680|0)+'ms)','pass');
        }
      },240+Math.random()*180);
    })();
  });
})();

document.getElementById('yr').textContent=new Date().getFullYear();
})();

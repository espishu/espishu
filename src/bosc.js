/* ===== Espishu · El bosc =====
   Lògica i dibuix del progrés. Sense dependències. Origen: docs/v5/espishu-v2-fase1/codi/bosc.js,
   amb aquests canvis: 60 llocs per a arbres (més d'un per setmana de l'any) i
   una setmana fallada asseca un arbre viu a l'atzar en lloc d'afegir-ne un de sec.
   - Cada setmana completada (objectiu de sessions assolit): planta un arbre nou,
     o bé cura l'arbre sec més antic si n'hi ha.
   - Cada setmana fallada: s'asseca un arbre viu qualsevol (sempre el mateix per a la mateixa
     història, perquè el bosc es torna a calcular cada vegada). Si no n'hi ha cap de viu, res.
   - Setmana en curs: plançó (o arbre sec curant-se) que avança amb les sessions.
   - Cada 1 de gener comença una vall nova; les anteriors es guarden. */
const Bosc=(()=>{
  const f=n=>n.toFixed(1);
  const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  const U=(r,a,b)=>a+(b-a)*r();

  /* ---------- estat a partir de l'historial ---------- */
  // weeks: array cronològic de setmanes tancades de la vall actual, true = objectiu complert
  // current: {done, goal} de la setmana en curs
  function state(weeks,current,{seed=4}={}){
    const trees=[]; // {born, status:'viu'|'sec', healedAt, driedAt}
    weeks.forEach((ok,w)=>{
      if(ok){
        const dry=trees.find(t=>t.status==='sec');
        if(dry){dry.status='viu';dry.healedAt=w;}
        else trees.push({born:w,status:'viu'});
      } else {
        // L'arbre no recorda de quina setmana és: se n'asseca un de viu a l'atzar.
        const vius=trees.filter(t=>t.status==='viu');
        if(vius.length){const t=vius[Math.floor(rng(seed*7919+w*104729)()*vius.length)];t.status='sec';t.driedAt=w;}
      }
    });
    const p=current?Math.min(1,current.done/Math.max(1,current.goal)):0;
    const dryNow=trees.find(t=>t.status==='sec');
    const pending=dryNow?{type:'cura',tree:dryNow,progress:p}:{type:'planço',progress:p};
    if(dryNow) dryNow.healing=p;
    const alive=trees.filter(t=>t.status==='viu').length;
    const ms=new Set();
    if(alive>=4) ms.add('ocells');
    if(alive>=12) ms.add('aigua');
    if(alive>=24){ms.add('cervol');ms.add('cami');}
    if(alive>=40){ms.add('cabana');ms.add('cuques');}
    return {trees,pending,alive,dry:trees.filter(t=>t.status==='sec').length,week:weeks.length,ms};
  }

  /* ---------- valls ---------- */
  const VALLS={
    riu:{nom:'Vall del riu',sky:'#1E2B2A',mtn:['#2C3D3B','#344A47','#3F5A54'],prat:'#26302B',boira:'#A9BFB4',aigua:'riu',pal:['#5C7A6E','#6A8B6F','#587364','#7A9A6E','#4E6B5E'],neu:false},
    estany:{nom:"Vall de l'estany",sky:'#1A2433',mtn:['#2B3A4A','#33465A','#3D5468'],prat:'#25323A',boira:'#B4C6D6',aigua:'estany',pal:['#5F8A86','#6E9A8C','#557A7A','#7FA394'],neu:true},
    costa:{nom:'Vall de la costa',sky:'#22283A',mtn:['#2F3546','#3A3F52','#46566A'],prat:'#2C3230',boira:'#C9C3B4',aigua:'mar',pal:['#6E8A5E','#7E9A62','#5E7A52','#8AA36A'],neu:false},
    cims:{nom:'Vall dels cims',sky:'#1C1F2C',mtn:['#3A3746','#45404F','#504A5A'],prat:'#2A2B2A',boira:'#C8C2D6',aigua:'rierol',pal:['#4E6B5E','#5C7A6E','#3F5C50','#6A8B6F'],neu:true}
  };
  const ORDRE=['riu','estany','costa','cims'];
  const vallDeLAny=any=>VALLS[ORDRE[((any-2026)%ORDRE.length+ORDRE.length)%ORDRE.length]];

  /* ---------- arbres ---------- */
  function pine(x,y,s,col,trunk){const hh=110*s,w=hh*.42;let o=`<rect x="${f(x-hh*.035)}" y="${f(y-hh*.2)}" width="${f(hh*.07)}" height="${f(hh*.2)}" fill="${trunk}"/>`;
    for(let i=0;i<4;i++){const t=i/4,yy=y-hh*.16-t*hh*.68,ww=w*(1-t*.68);o+=`<path d="M${f(x-ww)} ${f(yy)}L${f(x)} ${f(yy-hh*.36)}L${f(x+ww)} ${f(yy)}Z" fill="${col}"/>`;}return o;}
  function fir(x,y,s,col,trunk){const hh=120*s;return `<rect x="${f(x-hh*.03)}" y="${f(y-hh*.15)}" width="${f(hh*.06)}" height="${f(hh*.15)}" fill="${trunk}"/><path d="M${f(x)} ${f(y-hh)}C${f(x+hh*.12)} ${f(y-hh*.6)} ${f(x+hh*.3)} ${f(y-hh*.2)} ${f(x+hh*.26)} ${f(y-hh*.12)}H${f(x-hh*.26)}C${f(x-hh*.3)} ${f(y-hh*.2)} ${f(x-hh*.12)} ${f(y-hh*.6)} ${f(x)} ${f(y-hh)}Z" fill="${col}"/>`;}
  function oak(x,y,s,col,trunk){const hh=90*s;let o=`<path d="M${f(x-hh*.05)} ${f(y)}L${f(x-hh*.03)} ${f(y-hh*.45)}H${f(x+hh*.03)}L${f(x+hh*.05)} ${f(y)}Z" fill="${trunk}"/>`;
    for(const [dx,dy,r] of [[-.22,-.55,.24],[.2,-.58,.26],[0,-.78,.3],[-.05,-.5,.22]]) o+=`<circle cx="${f(x+dx*hh)}" cy="${f(y+dy*hh)}" r="${f(r*hh)}" fill="${col}"/>`;return o;}
  // arbre sec: només tronc i branques nues
  function bare(x,y,s,kind){
    const hh=(kind==='oak'?90:112)*s, c='#6E6257', w=Math.max(1.2,hh*.035);
    let d=`M${f(x)} ${f(y)}L${f(x)} ${f(y-hh*.9)}`;
    const br=kind==='oak'?[[.45,-.3,.28],[.55,.32,.3],[.7,-.22,.2],[.78,.2,.18]]:[[.3,-.28,.18],[.3,.28,.18],[.5,-.22,.14],[.5,.22,.14],[.68,-.15,.1],[.68,.15,.1]];
    for(const [t,dx,l] of br){const yy=y-hh*t;d+=`M${f(x)} ${f(yy)}L${f(x+dx*hh)} ${f(yy-l*hh*(kind==='oak'?1:.5))}`;}
    return `<path d="${d}" stroke="${c}" stroke-width="${f(w)}" stroke-linecap="round" fill="none"/><ellipse cx="${f(x)}" cy="${f(y+1)}" rx="${f(hh*.22)}" ry="${f(hh*.03)}" fill="#5A4636" opacity=".5"/>`;
  }
  function sapling(x,y,p){const h=14+16*p;return `<circle cx="${f(x)}" cy="${f(y-16)}" r="26" fill="#E8C27A" opacity="${f(.06+.1*p)}"/><path d="M${f(x)} ${f(y)}V${f(y-h)}" stroke="#7E9A6C" stroke-width="3"/><path d="M${f(x)} ${f(y-h*.5)}Q${f(x-12)} ${f(y-h*.9)} ${f(x-14)} ${f(y-h*1.15)}Q${f(x-2)} ${f(y-h)} ${f(x)} ${f(y-h*.58)}Z" fill="#8DB36A"/><path d="M${f(x)} ${f(y-h*.75)}Q${f(x+12)} ${f(y-h*1.15)} ${f(x+14)} ${f(y-h*1.4)}Q${f(x+2)} ${f(y-h*1.25)} ${f(x)} ${f(y-h*.83)}Z" fill="#8DB36A"/>`;}

  /* ---------- escena ---------- */
  function render(st,vall,{W=390,H=844,seed=4}={}){
    const V=typeof vall==='string'?VALLS[vall]:vall, r=rng(seed);
    let o=`<rect width="${W}" height="${H}" fill="${V.sky}"/>`;
    for(let i=0;i<46;i++) o+=`<circle cx="${f(U(r,0,W))}" cy="${f(U(r,150,400))}" r="${f(U(r,.6,1.4))}" fill="#E8E2CC" opacity="${f(U(r,.3,.8))}"/>`;
    o+=`<circle cx="${W-72}" cy="250" r="20" fill="#E8C27A"/><circle cx="${W-63}" cy="244" r="18" fill="${V.sky}"/>`;
    [[400,34],[440,24],[480,16]].forEach(([base,amp],li)=>{
      const pts=[[0,H]];for(let i=0;i<=W+20;i+=20) pts.push([i,base-amp*Math.sin(i/57+base)-U(r,0,amp*.6)]);pts.push([W,H]);
      if(V.aigua==='mar'&&li===2){o+=`<rect x="0" y="${base-20}" width="${W}" height="60" fill="#2E4A5C"/><path d="M0 ${base-8}H${W}" stroke="#7FA6B8" stroke-width="1.5" opacity=".5"/>`;return;}
      o+=`<path d="M${pts.map(([a,b])=>f(a)+' '+f(b)).join('L')}Z" fill="${V.mtn[li]}"/>`;
      if(V.neu&&li===0) for(const [a,b] of pts.slice(1,-1)) if(b<base-amp*.7) o+=`<path d="M${f(a-8)} ${f(b+6)}L${f(a)} ${f(b)}L${f(a+8)} ${f(b+6)}Z" fill="#DCE3E0" opacity=".8"/>`;
      for(let i=0;i<10;i++) o+=pine(U(r,0,W),base+U(r,10,40),U(r,.16,.26),V.mtn[li],V.mtn[li]);
    });
    o+=`<rect x="0" y="470" width="${W}" height="30" fill="${V.boira}" opacity=".1"/><path d="M0 500Q${W/2} 470 ${W} 498V${H}H0Z" fill="${V.prat}"/>`;
    if(st.ms.has('aigua')){
      if(V.aigua==='riu'||V.aigua==='rierol') o+=`<path d="M250 500C230 560 300 600 220 660C160 700 200 760 140 844H${V.aigua==='riu'?210:180}C250 770 230 720 280 680C350 620 290 570 ${V.aigua==='riu'?300:280} 500Z" fill="#3E5F68"/><path d="M262 520C250 560 300 600 236 650" stroke="#9CC3C9" stroke-width="2" fill="none" opacity=".5"/>`;
      else if(V.aigua==='estany') o+=`<ellipse cx="270" cy="545" rx="96" ry="20" fill="#4E7488"/><ellipse cx="270" cy="541" rx="70" ry="6" fill="#9CC3C9" opacity=".25"/>`;
      else o+=`<path d="M0 520Q120 505 200 520T390 515V540Q300 548 200 538T0 545Z" fill="#D9CDB0" opacity=".25"/>`;
    }
    if(st.ms.has('cami')) o+=`<path d="M60 844C90 780 70 730 130 690C170 664 150 620 190 590" stroke="#3B4436" stroke-width="18" fill="none" stroke-linecap="round"/>`;
    // posicions: s'omple primer la franja central, després el fons i finalment davant
    // Primer les quatre fileres originals (30 llocs); després, quatre més entremig (60 en total).
    const rows=[[620,.68,6],[570,.54,8],[670,.82,6],[525,.4,10],[548,.47,9],[596,.61,8],[645,.75,7],[688,.88,6]], slots=[];
    for(const [y,s,k] of rows){const xs=[];for(let i=0;i<k;i++) xs.push((i+.5)*W/k+U(r,-14,14));
      for(let i=xs.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[xs[i],xs[j]]=[xs[j],xs[i]];}
      for(const x of xs) slots.push([x,y+U(r,-8,8),s]);}
    const avoid=(x,y)=>st.ms.has('aigua')&&V.aigua!=='mar'&&V.aigua!=='estany'&&Math.abs(x-(y<600?250:y<700?215:175))<40?(x<250?x-50:x+50):x;
    const items=[];
    st.trees.forEach((t,i)=>{
      const [sx,y,s]=slots[i%slots.length], x=avoid(sx,y), kind=['pine','fir','oak'][i%3];
      // Un arbre que s'asseca i es cura conserva la mida que tenia.
      const age=st.week-t.born, g=Math.min(1,.45+age*.12);
      items.push({y,draw:()=>{
        if(t.status==='viu') return ({pine,fir,oak})[kind](x,y,s*g,V.pal[i%V.pal.length],'#3A2E26');
        let d=bare(x,y,s*g,kind);
        if(t.healing>0) d+=`<g opacity="${f(t.healing)}">${({pine,fir,oak})[kind](x,y,s*g*(.6+.4*t.healing),'#8DB36A','#3A2E26')}</g>`;
        return d;}});
    });
    if(st.pending.type==='planço'){const [sx,y]=slots[st.trees.length%slots.length];items.push({y,draw:()=>sapling(avoid(sx,y),y,st.pending.progress)});}
    items.sort((a,b)=>a.y-b.y).forEach(it=>o+=it.draw());
    if(st.ms.has('ocells')) for(const [bx,by] of [[90,330],[110,322],[126,334]]) o+=`<path d="M${bx-6} ${by}Q${bx} ${by-5} ${bx} ${by}Q${bx} ${by-5} ${bx+6} ${by}" stroke="${V.boira}" stroke-width="1.6" fill="none"/>`;
    if(st.ms.has('cervol')){const x=318,y=640;o+=`<g fill="#8A6A4E"><ellipse cx="${x}" cy="${y-26}" rx="20" ry="11"/><rect x="${x-16}" y="${y-20}" width="4" height="22"/><rect x="${x+12}" y="${y-20}" width="4" height="22"/><path d="M${x+16} ${y-30}L${x+26} ${y-50}L${x+34} ${y-48}L${x+24} ${y-26}Z"/><ellipse cx="${x+32}" cy="${y-50}" rx="7" ry="5"/></g><path d="M${x+30} ${y-56}L${x+26} ${y-70}M${x+28} ${y-64}L${x+20} ${y-68}M${x+34} ${y-56}L${x+40} ${y-70}M${x+38} ${y-64}L${x+46} ${y-66}" stroke="#C7A27A" stroke-width="2" stroke-linecap="round"/>`;}
    if(st.ms.has('cabana')){const x=96,y=600;o+=`<path d="M${x-30} ${y}V${y-30}L${x} ${y-54}L${x+30} ${y-30}V${y}Z" fill="#4A3A2E"/><path d="M${x-36} ${y-28}L${x} ${y-58}L${x+36} ${y-28}" stroke="#2E241D" stroke-width="5" fill="none"/><rect x="${x-12}" y="${y-24}" width="12" height="11" fill="#E8C27A"/><circle cx="${x-6}" cy="${y-18}" r="26" fill="#E8C27A" opacity=".12"/>`;}
    if(st.ms.has('cuques')) for(let i=0;i<16;i++) o+=`<circle cx="${f(U(r,20,W-20))}" cy="${f(U(r,560,800))}" r="1.8" fill="#F2E18A" opacity="${f(U(r,.5,1))}"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${o}</svg>`;
  }
  return {state,render,VALLS,ORDRE,vallDeLAny};
})();
export default Bosc;

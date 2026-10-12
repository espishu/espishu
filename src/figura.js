/* ===== Espishu · figura i animacions (vista de perfil + frontal) =====
   Motor + exercicis (EX, ORDER). Origen: docs/v5/espishu-v2-fase1/codi/figura.js (no es modifica;
   només s'hi ha afegit l'export del final). Les pantalles el fan servir a través de src/animacio.js. */
/* ===== Espishu · motor de figura v2 (vista de perfil) =====
   Cada pose es descriu amb el maluc, l'angle de la pelvis, la corba de l'esquena,
   i les extremitats: o bé "plantades" (mà o turmell fix a un punt) o bé lliures (angles).
   Les plantades es resolen amb IK de dos ossos respectant el sentit natural de genoll i colze. */
const LEN={th:92,sh:88,ua:60,fa:54,sp:[26,30,30,26],neck:13};
const FLOOR=262;
const R=d=>d*Math.PI/180, D=r=>r*180/Math.PI;
const dir=a=>[Math.cos(R(a)),Math.sin(R(a))];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1]], mul=(a,k)=>[a[0]*k,a[1]*k];
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const ang=(a,b)=>D(Math.atan2(b[1]-a[1],b[0]-a[0]));
const perp=v=>[-v[1],v[0]];
const nrm=a=>((a%360)+540)%360-180;
const f=n=>n.toFixed(1);
const DIAG={float:0,limits:[]};

/* IK de dos ossos. sign=+1: el segon os gira en sentit horari respecte el primer (genoll); -1: antihorari (colze) */
function ik2(root,target,l1,l2,sign){
  const d0=dist(root,target);
  DIAG.float=Math.max(DIAG.float,d0-(l1+l2-0.2));
  const d=Math.max(Math.abs(l1-l2)+0.5,Math.min(d0,l1+l2-0.2));
  const base=Math.atan2(target[1]-root[1],target[0]-root[0]);
  const A=Math.acos(Math.max(-1,Math.min(1,(l1*l1+d*d-l2*l2)/(2*l1*d))));
  let best=null;
  for(const s of [1,-1]){
    const a1=D(base+s*A), j=add(root,mul(dir(a1),l1)), a2=ang(j,target);
    const flex=nrm(a2-a1)*sign;
    if(!best||flex>best.flex) best={a1,a2,flex};
  }
  return best;
}

function spinePts(root,pelvis,curve){
  const a=[pelvis,pelvis+.3*curve,pelvis+.7*curve,pelvis+curve];
  const p=[root]; for(let i=0;i<4;i++) p.push(add(p[i],mul(dir(a[i]),LEN.sp[i])));
  return {p,a};
}
const shoulderOf=(sp)=>add(sp.p[4],mul(dir(sp.a[3]),-11));

function skeleton(pose){
  let root=pose.root?pose.root.slice():[0,0];
  if(pose.kneeAnchor){const k=pose.kneeAnchor; root=add(k.at,mul(dir(k.thigh+180),LEN.th));}
  let pelvis=pose.pelvis;
  if(pose.solve){ // la pelvis s'ajusta (de forma contínua) perquè l'espatlla quedi a la distància justa de la mà plantada
    const g=q=>{let r=root; if(pose.shoulderAnchor){const t=spinePts([0,0],q,pose.curve);r=sub(pose.shoulderAnchor,shoulderOf(t));}
      return dist(shoulderOf(spinePts(r,q,pose.curve)),pose.solve.hand)-pose.solve.d;};
    let a=null,b=null;
    for(let k=0;k<=60&&a===null;k++) for(const sgn of [1,-1]){const q0=pelvis+sgn*k, q1=q0+sgn; if(Math.sign(g(q0))!==Math.sign(g(q1))){a=q0;b=q1;break;}}
    if(a!==null){let ga=g(a); for(let it=0;it<40;it++){const m=(a+b)/2,gm=g(m); if(Math.sign(gm)===Math.sign(ga)){a=m;ga=gm;} else b=m;} pelvis=(a+b)/2;}
  }
  if(pose.shoulderAnchor){const t=spinePts([0,0],pelvis,pose.curve);root=sub(pose.shoulderAnchor,shoulderOf(t));}
  const sp=spinePts(root,pelvis,pose.curve);
  const s={root,pelvis,sp:sp.p,sa:sp.a,far:pose.far||[-5,-3]};
  s.shoulder=shoulderOf(sp);
  const top=sp.a[3];
  s.neckA=top+pose.neck; s.neckEnd=add(sp.p[4],mul(dir(s.neckA),LEN.neck));
  s.headA=pose.headAbs!==undefined?pose.headAbs:s.neckA+(pose.head||0);
  s.head=add(s.neckEnd,mul(dir(s.headA),18));
  const legs=(spec,hip,off)=>{
    let a1,a2;
    if(spec.ankle){const r=ik2(hip,add(spec.ankle,off),LEN.th,LEN.sh,1);a1=r.a1;a2=r.a2;}
    else if(spec.kneeAt){const k=add(spec.kneeAt,off);a1=ang(hip,k);DIAG.float=Math.max(DIAG.float,Math.abs(dist(hip,k)-LEN.th));a2=spec.shin;}
    else {a1=spec.thigh;a2=spec.thigh+spec.knee;}
    const knee=add(hip,mul(dir(a1),LEN.th)), ank=add(knee,mul(dir(a2),LEN.sh));
    const footA=spec.footAbs!==undefined?spec.footAbs:a2-90+(spec.foot||0);
    return {hip,knee,ank,a1,a2,footA};
  };
  const arms=(spec,sh,off)=>{
    let a1,a2;
    if(spec.hand){const r=ik2(sh,add(spec.hand,off),LEN.ua,LEN.fa,-1);a1=r.a1;a2=r.a2;}
    else {a1=spec.up;a2=spec.up-spec.el;}
    const el=add(sh,mul(dir(a1),LEN.ua)), wr=add(el,mul(dir(a2),LEN.fa));
    const handA=spec.handAbs!==undefined?spec.handAbs:a2+(spec.wrist||0);
    return {sh,el,wr,a1,a2,handA};
  };
  s.legF=legs(pose.legF,add(root,s.far),s.far);
  s.legN=legs(pose.legN,root,[0,0]);
  s.armF=arms(pose.armF,add(s.shoulder,s.far),s.far);
  s.armN=arms(pose.armN,s.shoulder,[0,0]);
  // límits d'articulació (per a la comprovació automàtica)
  for(const L of [s.legN,s.legF]){const k=nrm(L.a2-L.a1); if(k<-1||k>155) DIAG.limits.push('genoll '+k.toFixed(0));
    const h=nrm(L.a1-(pelvis+180)); if(h<-172||h>30) DIAG.limits.push('maluc '+h.toFixed(0));}
  for(const A of [s.armN,s.armF]){const e=nrm(A.a1-A.a2); if(e<-1||e>150) DIAG.limits.push('colze '+e.toFixed(0));}
  return s;
}

/* ===== Formes ===== */
function capsule(A,B,rA,rB){ // càpsula afuada amb tangents exactes
  const d=dist(A,B)||0.001, u=mul(sub(B,A),1/d), n=perp(u);
  const s=Math.max(-0.99,Math.min(0.99,(rA-rB)/d)), c=Math.sqrt(1-s*s);
  const t1=add(mul(u,s),mul(n,c)), t2=add(mul(u,s),mul(n,-c));
  const a1=add(A,mul(t1,rA)), b1=add(B,mul(t1,rB)), a2=add(A,mul(t2,rA)), b2=add(B,mul(t2,rB));
  return `<path d="M${f(a1[0])} ${f(a1[1])}L${f(b1[0])} ${f(b1[1])}A${f(rB)} ${f(rB)} 0 0 0 ${f(b2[0])} ${f(b2[1])}L${f(a2[0])} ${f(a2[1])}A${f(rA)} ${f(rA)} 0 0 0 ${f(a1[0])} ${f(a1[1])}Z"/>`;
}
const circle=(c,r)=>`<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(r)}"/>`;
const ellipse=(c,rx,ry,rot)=>`<ellipse cx="${f(c[0])}" cy="${f(c[1])}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${f(rot)} ${f(c[0])} ${f(c[1])})"/>`;
function smoothClosed(pts){
  const n=pts.length,g=i=>pts[(i+n)%n];
  let d=`M${f(pts[0][0])} ${f(pts[0][1])}`;
  for(let i=0;i<n;i++){const p0=g(i-1),p1=g(i),p2=g(i+1),p3=g(i+2);
    d+=`C${f(p1[0]+(p2[0]-p0[0])/6)} ${f(p1[1]+(p2[1]-p0[1])/6)} ${f(p2[0]-(p3[0]-p1[0])/6)} ${f(p2[1]-(p3[1]-p1[1])/6)} ${f(p2[0])} ${f(p2[1])}`;}
  return d+'Z';
}
const local=(o,a)=>{const u=dir(a),n=perp(u);return (x,y)=>add(o,add(mul(u,x),mul(n,y)));};
/* perfil d'una extremitat: amplades al costat anterior (a) i posterior (p) en 6 punts del segment */
const TS=[0,.18,.42,.66,.86,1];
function limbShape(A,B,aw,pw){
  const u=dir(ang(A,B)), n=perp(u), Ld=dist(A,B);
  const ant=TS.map((t,i)=>add(add(A,mul(u,Ld*t)),mul(n,-aw[i])));
  const pos=TS.map((t,i)=>add(add(A,mul(u,Ld*t)),mul(n,pw[i])));
  const capA=add(A,mul(u,-(aw[0]+pw[0])*.42)), capB=add(B,mul(u,(aw[5]+pw[5])*.42));
  return `<path d="${smoothClosed([capA,...ant,capB,...pos.reverse()])}"/>`;
}
const HS=1.0;
function footShape(L){ // peu d'adult: taló, arc i punta
  const P=local(L.ank,L.footA);
  const pts=[[-9,-7],[-13,1],[-10,10],[2,11.5],[22,11.5],[34,10],[38,6],[33,1.5],[18,-3],[5,-8]].map(([x,y])=>P(x,y));
  return `<path d="${smoothClosed(pts)}"/>`;
}
function soleLine(L){const P=local(L.ank,L.footA),a=P(-8,9),b=P(33,8.5);return `<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" stroke="var(--line)" stroke-opacity=".35" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;}
function handShape(A){ // mà d'adult: palmell pla, dits llargs i polze separat
  const P=local(A.wr,A.handA);
  const hand=[[-1,-5],[8,-5.5],[16,-4.8],[27,-3.6],[31,-1.6],[31.5,1],[28,3],[16,4.6],[7,5.2],[-1,5]].map(([x,y])=>P(x,y));
  return `<path d="${smoothClosed(hand)}"/>`+capsule(P(6,-4.5),P(15,-9),3.3,2.4);
}
function handLines(A){
  const P=local(A.wr,A.handA), st='stroke="var(--line)" stroke-opacity=".3" stroke-width="1.2" stroke-linecap="round" fill="none"';
  let d=''; for(const [x0,x1] of [[17,27],[18,29.5]]){const yy=x0===17?-1.6:1.2;const a=P(x0,yy),b=P(x1,yy*.7);d+=`M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;}
  return `<path ${st} d="${d}"/>`;
}
function legShapes(L){
  return limbShape(L.hip,L.knee,[17,19.5,19,16,12,10.5],[18,17.5,16,13.5,10.5,10])+circle(L.knee,10.5)
    +limbShape(L.knee,L.ank,[10,9,8,7,5.8,5.4],[10,13.5,12.5,8.5,6.2,5.6])+circle(L.ank,5.6)
    +footShape(L);
}
function armShapes(A){
  return circle(A.sh,13.5)+limbShape(A.sh,A.el,[11,11.5,12,10.5,8.5,7.6],[11.5,12.5,12,10,8.2,7.6])+circle(A.el,7.6)
    +limbShape(A.el,A.wr,[7.6,9,8,6.3,5,4.6],[7.6,8.6,7.6,5.8,4.9,4.6])+circle(A.wr,4.6)+handShape(A);
}
const FRONT=[20,18,20,26,14], BACK=[19,18,19,23,17];
function torsoShape(s,breath){
  const dirs=[s.sa[0],(s.sa[0]+s.sa[1])/2,(s.sa[1]+s.sa[2])/2,(s.sa[2]+s.sa[3])/2,s.sa[3]];
  const fr=s.sp.map((p,i)=>add(p,mul(perp(dir(dirs[i])),FRONT[i]+((i===2||i===3)?breath:0))));
  const bk=s.sp.map((p,i)=>add(p,mul(perp(dir(dirs[i])),-BACK[i])));
  const loop=[...fr,add(s.sp[4],mul(dir(s.sa[3]),5)),...bk.slice().reverse(),add(s.sp[0],mul(dir(s.sa[0]),-12))];
  return `<path d="${smoothClosed(loop)}"/>`;
}
function glute(s){const back=mul(perp(dir(s.sa[0])),-1);return {c:add(add(s.root,mul(back,8)),mul(dir(s.legN.a1),7)),rot:s.legN.a1};}
const headFrame=s=>{const L0=local(s.head,s.headA);return (x,y)=>L0(x*1.22,y*1.22);};
function headShape(s){
  const H=headFrame(s);
  return ellipse(s.head,23,19,s.headA)+ellipse(H(-7,6),12,11,s.headA)+circle(H(-1,15.6),4.3)
    +capsule(s.sp[4],s.neckEnd,10.5,9.5);
}
function headDetails(s,id){
  const H=headFrame(s), eye=H(3,9.5), ear=H(-1,-2), b0=H(6.5,6.5), b1=H(6,12.5), m0=H(-9.5,9), m1=H(-9.5,13);
  return `<clipPath id="${id}">${ellipse(s.head,21.4,17.4,s.headA)}</clipPath>`
   +`<g clip-path="url(#${id})"><g fill="var(--hair)">${ellipse(H(6.5,-6),19.5,17,s.headA)}</g></g>`
   +`<g fill="none" stroke="var(--line)" stroke-linecap="round"><ellipse cx="${f(ear[0])}" cy="${f(ear[1])}" rx="3.9" ry="5.6" transform="rotate(${f(s.headA)} ${f(ear[0])} ${f(ear[1])})" stroke-opacity=".5" stroke-width="1.5"/>`
   +`<path d="M${f(b0[0])} ${f(b0[1])}L${f(b1[0])} ${f(b1[1])}" stroke-opacity=".6" stroke-width="1.7"/><path d="M${f(m0[0])} ${f(m0[1])}L${f(m1[0])} ${f(m1[1])}" stroke-opacity=".35" stroke-width="1.5"/></g>`
   +`<g fill="var(--line)">${circle(eye,2.3)}</g>`;
}
let UID=0;
function group(shapes,fill,inner){
  const id='k'+(UID++);
  let o=`<g fill="var(--line)" stroke="var(--line)" stroke-width="4" stroke-linejoin="round">${shapes}</g><g fill="${fill}">${shapes}</g>`;
  if(inner) o+=`<clipPath id="${id}">${shapes}</clipPath><g clip-path="url(#${id})">${inner}</g>`;
  return o;
}
/* músculs: el·lipse a un costat d'un segment. side +1 = costat posterior de cames/braços, costat davanter del tronc */
function lens(A,B,t,len,side,depth,off,fill){
  const a=ang(A,B),u=dir(a),n=mul(perp(u),side),Ld=dist(A,B);
  const c=add(add(A,mul(u,Ld*t)),mul(n,off));
  return `<g fill="${fill}">${ellipse(c,Ld*len/2,depth,a)}</g>`;
}
function band(s,o){ // franja muscular que segueix la corba de l'esquena
  const W=o.side>0?FRONT:BACK, dirs=[s.sa[0],(s.sa[0]+s.sa[1])/2,(s.sa[1]+s.sa[2])/2,(s.sa[2]+s.sa[3])/2,s.sa[3]];
  const out=[],inn=[], n=o.to-o.from;
  for(let i=o.from;i<=o.to;i++){
    const k=(i-o.from)/n, taper=Math.sin(Math.PI*(0.12+0.76*k));
    const nv=mul(perp(dir(dirs[i])),o.side);
    out.push(add(s.sp[i],mul(nv,W[i]+1)));
    inn.push(add(s.sp[i],mul(nv,W[i]+1-o.depth*taper)));
  }
  return `<path fill="var(--m${o.lvl})" d="${smoothOpen([...out,...inn.reverse()])}"/>`;
}
function smoothOpen(pts){return smoothClosed(pts);}
function muscleSVG(s,o){
  if(o.part==='band') return band(s,o);
  const col=`var(--m${o.lvl})`;
  const seg={thigh:[s.legN.hip,s.legN.knee,13],shin:[s.legN.knee,s.legN.ank,8],up:[s.armN.sh,s.armN.el,8],fore:[s.armN.el,s.armN.wr,6]};
  if(o.part==='spine'){const A=s.sp[o.i],B=s.sp[o.i+1],w=(o.side>0?FRONT:BACK)[o.i];return lens(A,B,o.t||.5,o.len||1.1,o.side,o.depth||7,w-(o.depth||7)*.55,col);}
  const [A,B,w]=seg[o.part]; return lens(A,B,o.t||.5,o.len||.75,o.side,o.depth||6,w-(o.depth||6)*.5,col);
}
function shade(s){
  let o='';
  for(let i=0;i<4;i++) o+=lens(s.sp[i],s.sp[i+1],.5,1.3,-1,6,BACK[i]-2,'rgba(0,0,0,.08)');
  o+=lens(s.legN.hip,s.legN.knee,.5,1.1,1,6,11,'rgba(0,0,0,.08)')+lens(s.legN.knee,s.legN.ank,.45,1.1,1,5,6,'rgba(0,0,0,.08)');
  return o;
}
function defLines(s){
  const st='fill="none" stroke="var(--line)" stroke-opacity=".22" stroke-width="1.4" stroke-linecap="round"';
  const T=(i,t,side,o)=>{const A=s.sp[i],B=s.sp[i+1],p=add(A,mul(sub(B,A),t));return add(p,mul(perp(dir(ang(A,B))),side*o));};
  const pecA=T(3,.0,1,8),pecB=T(3,.1,1,24),pecC=T(2,.55,1,18);
  const abA=T(0,.6,1,10),abB=T(2,.4,1,12);
  const sc0=T(3,.05,-1,15),sc1=T(3,.75,-1,13),scC=T(3,.45,-1,25);
  const lat0=T(3,.1,-1,6),lat1=T(1,.4,-1,12),latC=T(2,.4,-1,18);
  const er0=T(0,.2,-1,13),er1=T(2,.6,-1,13);
  const tr0=add(s.sp[4],mul(perp(dir(s.sa[3])),-10)),tr1=T(3,.6,-1,19);
  const L=s.legN, q1=add(add(L.hip,mul(sub(L.knee,L.hip),.25)),mul(perp(dir(L.a1)),-12)), q2=add(add(L.hip,mul(sub(L.knee,L.hip),.85)),mul(perp(dir(L.a1)),-7));
  return `<path ${st} d="M${f(pecA[0])} ${f(pecA[1])}Q${f(pecC[0])} ${f(pecC[1])} ${f(pecB[0])} ${f(pecB[1])}"/>`
   +`<path ${st} d="M${f(abA[0])} ${f(abA[1])}L${f(abB[0])} ${f(abB[1])}"/>`
   +`<path ${st} d="M${f(q1[0])} ${f(q1[1])}L${f(q2[0])} ${f(q2[1])}"/>`
   +`<path ${st} d="M${f(sc0[0])} ${f(sc0[1])}Q${f(scC[0])} ${f(scC[1])} ${f(sc1[0])} ${f(sc1[1])}"/>`
   +`<path ${st} d="M${f(lat0[0])} ${f(lat0[1])}Q${f(latC[0])} ${f(latC[1])} ${f(lat1[0])} ${f(lat1[1])}"/>`
   +`<path ${st} d="M${f(er0[0])} ${f(er0[1])}L${f(er1[0])} ${f(er1[1])}"/>`
   +`<path ${st} d="M${f(tr0[0])} ${f(tr0[1])}L${f(tr1[0])} ${f(tr1[1])}"/>`;
}
function details(s){ // rótula, colze i línies de definició
  const L=s.legN,A=s.armN;
  const kv=add(dir(L.a1),dir(L.a2)), ka=D(Math.atan2(kv[1],kv[0])), kp=add(L.knee,mul(perp(dir(ka)),-5));
  return `<g fill="none" stroke="var(--line)" stroke-linecap="round"><circle cx="${f(kp[0])}" cy="${f(kp[1])}" r="4.5" stroke-opacity=".3" stroke-width="1.4"/></g>`;
}
function renderFigure(s,muscles,breath){
  muscles=muscles||[];
  let svg=group(legShapes(s.legF),'var(--body-far)')+group(armShapes(s.armF),'var(--body-far)');
  const g=glute(s);
  const body=torsoShape(s,breath)+headShape(s)+ellipse(g.c,16,13.5,g.rot)+legShapes(s.legN);
  let inner=shade(s)+defLines(s);
  muscles.filter(o=>o.part==='glute').forEach(o=>inner+=`<g fill="var(--m${o.lvl})">${ellipse(g.c,14,11.5,g.rot)}</g>`);
  muscles.filter(o=>['spine','thigh','shin','band'].includes(o.part)).forEach(o=>inner+=muscleSVG(s,o));
  svg+=group(body,'var(--body)',inner)+soleLine(s.legN)+headDetails(s,'h'+(UID++))+details(s);
  let arm='';
  muscles.filter(o=>['up','fore'].includes(o.part)).forEach(o=>arm+=muscleSVG(s,o));
  muscles.filter(o=>o.part==='delt').forEach(o=>arm+=`<g fill="var(--m${o.lvl})">${circle(s.armN.sh,9)}</g>`);
  svg+=group(armShapes(s.armN),'var(--body)',arm)+handLines(s.armN);
  return svg;
}


/* ===== Vista frontal (cercles de braços) ===== */
function renderFront(t,muscles){
  const cx=200, T=1.3, th=2*Math.PI*t/T, R=16;
  const shY=-20, hipY=82, ankY=FLOOR-11;
  let svg='';
  const legs=[], arms=[];
  for(const sgn of [-1,1]){
    const hip=[cx+sgn*17,hipY], knee=[cx+sgn*18,hipY+LEN.th], ank=[cx+sgn*19,ankY];
    legs.push(limbShape(hip,knee,[17,19,18,15,12,10.5],[17,19,18,15,12,10.5])+circle(knee,10.5)
      +limbShape(knee,ank,[10,11.5,11,8,6.2,5.6],[10,11.5,11,8,6.2,5.6])
      +`<path d="${smoothClosed([[ank[0]-11,ank[1]-2],[ank[0]+11,ank[1]-2],[ank[0]+sgn*4+12,ank[1]+9],[ank[0]+sgn*4,ank[1]+12],[ank[0]+sgn*4-12,ank[1]+9]])}"/>`);
    const sh=[cx+sgn*42,shY];
    const handC=[sh[0]+sgn*(LEN.ua+LEN.fa-4), sh[1]+4];
    const hp=[handC[0]+R*Math.cos(sgn>0?th:Math.PI-th), handC[1]+R*Math.sin(sgn>0?th:Math.PI-th)];
    const a=ang(sh,hp), d=dist(sh,hp), el=add(sh,mul(dir(a),d*LEN.ua/(LEN.ua+LEN.fa)));
    const P=(x,y)=>add(hp,add(mul(dir(a),x),mul(perp(dir(a)),y*sgn)));
    const hand=[[-1,-5],[8,-5.5],[16,-4.8],[26,-3.4],[29,0],[26,3.4],[16,4.8],[8,5.5],[-1,5]].map(([x,y])=>P(x,y));
    arms.push({sh,el,hp,a,shape:circle(sh,13.5)+limbShape(sh,el,[11,12,12,10.5,8.5,7.6],[11,12,12,10.5,8.5,7.6])+circle(el,7.6)
      +limbShape(el,hp,[7.6,8.8,7.8,6,5,4.6],[7.6,8.8,7.8,6,5,4.6])+`<path d="${smoothClosed(hand)}"/>`});
  }
  const torso=`<path d="${smoothClosed([[cx-48,shY-4],[cx-40,shY+14],[cx-35,shY+40],[cx-27,shY+80],[cx-31,hipY-6],[cx-24,hipY+12],[cx,hipY+16],[cx+24,hipY+12],[cx+31,hipY-6],[cx+27,shY+80],[cx+35,shY+40],[cx+40,shY+14],[cx+48,shY-4],[cx+20,shY-12],[cx,shY-10],[cx-20,shY-12]])}"/>`;
  const neck=capsule([cx,shY-6],[cx,shY-24],11,10);
  const hc=[cx,shY-48];
  const head=`<ellipse cx="${hc[0]}" cy="${hc[1]}" rx="21" ry="25"/>`+ellipse([cx-21,hc[1]+2],4.5,7,0)+ellipse([cx+21,hc[1]+2],4.5,7,0);
  const st='fill="none" stroke="var(--line)" stroke-opacity=".22" stroke-width="1.4" stroke-linecap="round"';
  let inner=`<path ${st} d="M${cx-30} ${shY+24}Q${cx-14} ${shY+36} ${cx-2} ${shY+26}M${cx+30} ${shY+24}Q${cx+14} ${shY+36} ${cx+2} ${shY+26}M${cx} ${shY+40}V${shY+86}"/>`;
  inner+=`<g fill="var(--m2)"><path d="M${cx-12} ${shY-12}Q${cx-30} ${shY-10} ${cx-42} ${shY-2}L${cx-30} ${shY+4}Q${cx-20} ${shY-2} ${cx-10} ${shY-4}Z"/><path d="M${cx+12} ${shY-12}Q${cx+30} ${shY-10} ${cx+42} ${shY-2}L${cx+30} ${shY+4}Q${cx+20} ${shY-2} ${cx+10} ${shY-4}Z"/></g>`;
  svg+=group(legs.join('')+torso+neck+head,'var(--body)',inner);
  const hid='hf'+(UID++);
  svg+=`<clipPath id="${hid}"><ellipse cx="${hc[0]}" cy="${hc[1]}" rx="19.6" ry="23.6"/></clipPath><g clip-path="url(#${hid})"><ellipse fill="var(--hair)" cx="${cx}" cy="${hc[1]-17}" rx="24" ry="15"/></g>`;
  svg+=`<g fill="var(--line)"><circle cx="${cx-8}" cy="${hc[1]+2}" r="2.3"/><circle cx="${cx+8}" cy="${hc[1]+2}" r="2.3"/></g><path d="M${cx} ${hc[1]+5}V${hc[1]+11}M${cx-6} ${hc[1]+16}H${cx+6}" ${st.replace('.22','.5')}/>`;
  for(const A of arms) svg+=group(A.shape,'var(--body)',`<g fill="var(--m1)">${circle(add(A.sh,mul(dir(A.a),3)),9)}</g>`);
  return svg;
}

/* ===== Línia de temps: poses clau amb corbes Hermite (sense desfasaments que es tallin) ===== */
function leaves(o,path=[],out=[]){
  if(typeof o==='number') out.push(path);
  else if(Array.isArray(o)) o.forEach((v,i)=>leaves(v,[...path,i],out));
  else if(o&&typeof o==='object') for(const k in o) leaves(o[k],[...path,k],out);
  return out;
}
const getP=(o,p)=>p.reduce((a,k)=>a[k],o);
function setP(o,p,v){let a=o;for(let i=0;i<p.length-1;i++)a=a[p[i]];a[p[p.length-1]]=v;}
function prep(ex){
  ex.paths=leaves(ex.poses[ex.keys[0].p]); ex.T=ex.keys[ex.keys.length-1].at;
  ex.vals=ex.keys.map(k=>ex.paths.map(p=>getP(ex.poses[k.p],p)));
}
function sample(ex,time){
  const K=ex.keys,n=K.length,out=JSON.parse(JSON.stringify(ex.poses[K[0].p]));
  const tt=((time%ex.T)+ex.T)%ex.T; let k=0; while(k<n-2&&tt>=K[k+1].at) k++;
  const dt=K[k+1].at-K[k].at, u=dt>0?(tt-K[k].at)/dt:0, u2=u*u,u3=u2*u;
  const tan=(i,j)=>{if(K[j].hold) return 0; const jp=j===0?n-2:j-1, jn=j===n-1?1:j+1;
    const tp=j===0?K[n-2].at-ex.T:K[jp].at, tn=j===n-1?K[1].at+ex.T:K[jn].at; return (ex.vals[jn][i]-ex.vals[jp][i])/(tn-tp)*.85;};
  ex.paths.forEach((p,i)=>setP(out,p,(2*u3-3*u2+1)*ex.vals[k][i]+(u3-2*u2+u)*dt*tan(i,k)+(-2*u3+3*u2)*ex.vals[k+1][i]+(u3-u2)*dt*tan(i,k+1)));
  return out;
}
/* ===== Exercicis ===== */
const FL=FLOOR;
const ANK=[182,FL-10.5];
const sqLegs={legN:{ankle:ANK,footAbs:0},legF:{ankle:ANK,footAbs:0}};
const SHB=[150,241];
const kneeP=[128,250], handP=[296,FL-5];
const fxPose=(th,neck)=>({kneeAnchor:{at:kneeP,thigh:th},pelvis:th-180,curve:0,neck:neck,head:0,far:[-5,-3],
  legN:{kneeAt:kneeP,shin:-150,footAbs:-165},legF:{kneeAt:kneeP,shin:-150,footAbs:-165},
  armN:{hand:handP,handAbs:0},armF:{hand:handP,handAbs:0}});
const gatBase={kneeAnchor:{at:[112,FL-10],thigh:90},far:[-5,-4],solve:{hand:[214,FL-5],d:104},
  legN:{kneeAt:[112,FL-10],shin:180,footAbs:180},legF:{kneeAt:[112,FL-10],shin:180,footAbs:180},
  armN:{hand:[214,FL-5],handAbs:0},armF:{hand:[214,FL-5],handAbs:0}};
const dbS={shoulderAnchor:SHB,pelvis:180,curve:0,neck:0,headAbs:180,far:[-5,-3]};
const tableLeg={thigh:-90,knee:90,foot:25}, extLeg={thigh:-16,knee:3,foot:0};
const upArm={up:-90,el:2,wrist:0}, overArm={up:-170,el:4,wrist:0};

const EX={
  esquat:{title:"Esquat a la cadira",dose:"3 × 10",vb:"40 -105 340 380",
    props:()=>`<line x1="20" y1="${FL+3}" x2="360" y2="${FL+3}" stroke="var(--floor)" stroke-width="5" stroke-linecap="round"/>
      <g fill="var(--prop)" stroke="var(--prop-dark)" stroke-width="2" stroke-linejoin="round">
      <rect x="62" y="172" width="84" height="9" rx="3"/><rect x="68" y="181" width="7" height="${FL-181}"/>
      <rect x="134" y="181" width="7" height="${FL-181}"/><rect x="62" y="90" width="7" height="84"/><rect x="58" y="94" width="15" height="42" rx="4"/></g>`,
    poses:{
      A:{root:[177,81],pelvis:-90,curve:0,neck:0,headAbs:-90,far:[-6,-3],...sqLegs,armN:{up:-3,el:4,wrist:2},armF:{up:-5,el:4,wrist:2}},
      M:{root:[160,114],pelvis:-68,curve:3,neck:-10,headAbs:-84,far:[-6,-3],...sqLegs,armN:{up:-8,el:5,wrist:3},armF:{up:-10,el:5,wrist:3}},
      B:{root:[131,155],pelvis:-50,curve:6,neck:-22,headAbs:-78,far:[-6,-3],...sqLegs,armN:{up:-14,el:6,wrist:4},armF:{up:-16,el:6,wrist:4}},
      U:{root:[157,110],pelvis:-66,curve:3,neck:-12,headAbs:-84,far:[-6,-3],...sqLegs,armN:{up:-9,el:5,wrist:3},armF:{up:-11,el:5,wrist:3}}
    },
    keys:[{at:0,p:'A'},{at:.75,p:'M'},{at:1.5,p:'B'},{at:2.1,p:'U'},{at:2.8,p:'A'}],
    muscles:[{part:'thigh',side:-1,lvl:1,depth:7},{part:'glute',lvl:1},{part:'thigh',side:1,lvl:2,depth:6}],
    tags:[['Força','t'],['Quàdriceps','p'],['Glutis','p'],['Isquiotibials','s']]},

  pont:{title:"Pont de glutis",dose:"3 × 12",vb:"70 120 330 160",
    props:()=>`<rect x="80" y="${FL-2}" width="300" height="8" rx="4" fill="var(--mat)" stroke="var(--mat-line)" stroke-width="1.5"/>`,
    poses:{
      B:{shoulderAnchor:SHB,pelvis:180,curve:0,neck:0,headAbs:180,far:[-5,-3],legN:{ankle:[322,FL-10.5],footAbs:0},legF:{ankle:[322,FL-10.5],footAbs:0},
        armN:{hand:[254,FL-5],handAbs:0},armF:{hand:[254,FL-5],handAbs:0}},
      T:{shoulderAnchor:SHB,pelvis:151,curve:29,neck:0,headAbs:180,far:[-5,-3],legN:{ankle:[322,FL-10.5],footAbs:0},legF:{ankle:[322,FL-10.5],footAbs:0},
        armN:{hand:[254,FL-5],handAbs:0},armF:{hand:[254,FL-5],handAbs:0}}
    },
    keys:[{at:0,p:'B',hold:1},{at:1.2,p:'T',hold:1},{at:3.2,p:'T',hold:1},{at:4.5,p:'B',hold:1},{at:4.8,p:'B',hold:1}],
    muscles:[{part:'glute',lvl:1},{part:'thigh',side:1,lvl:2,depth:6},{part:'band',from:0,to:2,side:-1,lvl:2,depth:7}],
    tags:[['Força','t'],['Glutis','p'],['Isquiotibials','s'],['Lumbars','s']]},

  flexions:{title:"Flexions de genolls",dose:"3 × 6–8",vb:"0 70 400 205",
    props:()=>`<rect x="10" y="${FL-2}" width="380" height="8" rx="4" fill="var(--mat)" stroke="var(--mat-line)" stroke-width="1.5"/>
      <rect x="106" y="${FL-13}" width="40" height="13" rx="6" fill="var(--prop)" stroke="var(--prop-dark)" stroke-width="1.5"/>`,
    poses:{T:fxPose(149,2),B:fxPose(164,6)},
    keys:[{at:0,p:'T'},{at:1.4,p:'B'},{at:2.5,p:'T'}],
    muscles:[{part:'band',from:2,to:4,side:1,lvl:1,depth:10},{part:'up',side:1,lvl:1,depth:5},{part:'delt',lvl:2},{part:'band',from:0,to:2,side:1,lvl:2,depth:7}],
    tags:[['Força','t'],['Pit','p'],['Tríceps','p'],['Espatlles','s'],['Core','s']]},

  gat:{title:"Gat-camell",dose:"8 repeticions",vb:"0 70 340 205",
    props:()=>`<rect x="6" y="${FL-2}" width="320" height="8" rx="4" fill="var(--mat)" stroke="var(--mat-line)" stroke-width="1.5"/>`,
    poses:{
      N:{...gatBase,pelvis:-4,curve:6,neck:4,head:0},
      V:{...gatBase,pelvis:-4,curve:-30,neck:-30,head:-10},
      C:{...gatBase,pelvis:-4,curve:42,neck:36,head:12}
    },
    keys:[{at:0,p:'N'},{at:1.4,p:'V'},{at:2.8,p:'N'},{at:4.2,p:'C'},{at:5.6,p:'N'}],
    muscles:[{part:'band',from:0,to:4,side:-1,lvl:1,depth:9},{part:'band',from:0,to:3,side:1,lvl:2,depth:8}],
    tags:[['Escalfament','t'],['Esquena','p'],['Core','s']]},

  deadbug:{title:"Dead bug",dose:"3 × 8 per costat",vb:"20 20 440 255",
    props:()=>`<rect x="40" y="${FL-2}" width="340" height="8" rx="4" fill="var(--mat)" stroke="var(--mat-line)" stroke-width="1.5"/>`,
    poses:{
      S:{...dbS,legN:{...tableLeg},legF:{...tableLeg},armN:{...upArm},armF:{...upArm}},
      A:{...dbS,legN:{...tableLeg},legF:{...extLeg},armN:{...overArm},armF:{...upArm}},
      B:{...dbS,legN:{...extLeg},legF:{...tableLeg},armN:{...upArm},armF:{...overArm}}
    },
    keys:[{at:0,p:'S'},{at:1.3,p:'A'},{at:2.6,p:'S'},{at:3.9,p:'B'},{at:5.2,p:'S'}],
    muscles:[{part:'band',from:0,to:3,side:1,lvl:1,depth:10}],
    tags:[['Força','t'],['Core','p'],['Flexors de maluc','s']]}
};
for(const k in EX) prep(EX[k]);

/* ----- més exercicis de la rutina ----- */
EX.superman={title:"Superman",dose:"3 × 10",vb:"-70 120 520 160",
  props:()=>`<rect x="-55" y="${FL-2}" width="465" height="8" rx="4" fill="var(--mat)" stroke="var(--mat-line)" stroke-width="1.5"/>`,
  poses:{
    D:{root:[150,FL-21],pelvis:0,curve:0,neck:4,head:0,far:[-4,-3],legN:{thigh:180,knee:2,footAbs:180},legF:{thigh:180,knee:2,footAbs:180},armN:{up:1,el:3,wrist:0},armF:{up:2,el:3,wrist:0}},
    U:{root:[150,FL-21],pelvis:0,curve:-16,neck:6,head:0,far:[-4,-3],legN:{thigh:190,knee:3,footAbs:186},legF:{thigh:189,knee:3,footAbs:185},armN:{up:-13,el:4,wrist:0},armF:{up:-12,el:4,wrist:0}}
  },
  keys:[{at:0,p:'D',hold:1},{at:1.3,p:'U',hold:1},{at:3.3,p:'U',hold:1},{at:4.6,p:'D',hold:1},{at:4.9,p:'D',hold:1}],
  muscles:[{part:'band',from:0,to:4,side:-1,lvl:1,depth:9},{part:'glute',lvl:1},{part:'thigh',side:1,lvl:2,depth:6}],
  tags:[['Força','t'],['Esquena','p'],['Glutis','p'],['Isquiotibials','s']]};

EX.isquios={title:"Estirament d'isquiotibials",dose:"30 s per cama",vb:"40 30 380 245",
  props:()=>`<rect x="50" y="${FL-2}" width="360" height="8" rx="4" fill="var(--mat)" stroke="var(--mat-line)" stroke-width="1.5"/>`,
  after:(s)=>{const L=s.legN,P=(x,y)=>add(L.ank,add(mul(dir(L.footA),x),mul([-dir(L.footA)[1],dir(L.footA)[0]],y)));const b=P(18,12);
    const h=s.armN.wr,h2=s.armF.wr;return `<path d="M${f(h[0])} ${f(h[1])}L${f(b[0])} ${f(b[1])}L${f(h2[0])} ${f(h2[1])}" fill="none" stroke="var(--towel)" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`;},
  poses:{
    A:{shoulderAnchor:SHB,pelvis:180,curve:0,neck:0,headAbs:180,far:[-5,-3],legN:{thigh:-50,knee:4,foot:-8},legF:{thigh:0,knee:3,foot:0},
      armN:{hand:[234,174],handAbs:-60},armF:{hand:[234,174],handAbs:-60}},
    B:{shoulderAnchor:SHB,pelvis:180,curve:0,neck:0,headAbs:180,far:[-5,-3],legN:{thigh:-74,knee:3,foot:-12},legF:{thigh:0,knee:3,foot:0},
      armN:{hand:[214,160],handAbs:-80},armF:{hand:[214,160],handAbs:-80}}
  },
  keys:[{at:0,p:'A',hold:1},{at:1.8,p:'B',hold:1},{at:3.8,p:'B',hold:1},{at:5.4,p:'A',hold:1},{at:5.8,p:'A',hold:1}],
  muscles:[{part:'thigh',side:1,lvl:1,depth:7},{part:'shin',side:1,lvl:2,depth:5}],
  tags:[['Estirament','t'],['Isquiotibials','p'],['Bessons','s']]};

const FLK=[150,FL-12];
EX.flexor={title:"Estirament del flexor del maluc",dose:"30 s per costat",vb:"30 -60 340 330",
  props:()=>`<rect x="20" y="${FL-2}" width="320" height="8" rx="4" fill="var(--mat)" stroke="var(--mat-line)" stroke-width="1.5"/><rect x="128" y="${FL-12}" width="44" height="13" rx="6" fill="var(--prop)" stroke="var(--prop-dark)" stroke-width="1.5"/>`,
  poses:{
    A:{kneeAnchor:{at:FLK,thigh:92},pelvis:-90,curve:0,neck:0,headAbs:-90,far:[3,-3],legN:{kneeAt:FLK,shin:180,footAbs:180},legF:{ankle:[268,FL-10.5],footAbs:0},armN:{up:96,el:24,wrist:0},armF:{up:94,el:22,wrist:0}},
    B:{kneeAnchor:{at:FLK,thigh:114},pelvis:-93,curve:-4,neck:2,headAbs:-90,far:[3,-3],legN:{kneeAt:FLK,shin:180,footAbs:180},legF:{ankle:[268,FL-10.5],footAbs:0},armN:{up:98,el:26,wrist:0},armF:{up:96,el:24,wrist:0}}
  },
  keys:[{at:0,p:'A',hold:1},{at:1.8,p:'B',hold:1},{at:3.8,p:'B',hold:1},{at:5.4,p:'A',hold:1},{at:5.8,p:'A',hold:1}],
  muscles:[{part:'thigh',side:-1,t:.25,len:.45,lvl:1,depth:7},{part:'band',from:0,to:1,side:1,lvl:1,depth:7},{part:'thigh',side:-1,t:.65,len:.55,lvl:2,depth:6}],
  tags:[['Estirament','t'],['Flexors de maluc','p'],['Quàdriceps','s']]};

const NK=[125,FL-10];
const nenBase={far:[-5,-4],legN:{kneeAt:NK,shin:180,footAbs:180},legF:{kneeAt:NK,shin:180,footAbs:180},armN:{hand:[256,FL-5],handAbs:0},armF:{hand:[256,FL-5],handAbs:0}};
EX.nen={title:"Postura del nen",dose:"30 s",vb:"0 70 330 205",
  props:()=>`<rect x="6" y="${FL-2}" width="320" height="8" rx="4" fill="var(--mat)" stroke="var(--mat-line)" stroke-width="1.5"/>`,
  poses:{
    A:{...nenBase,kneeAnchor:{at:NK,thigh:90},pelvis:-4.1,curve:6,neck:4,head:0},
    B:{...nenBase,kneeAnchor:{at:NK,thigh:42},pelvis:14,curve:14,neck:8,head:0}
  },
  keys:[{at:0,p:'A',hold:1},{at:2,p:'B',hold:1},{at:4,p:'B',hold:1},{at:5.8,p:'A',hold:1},{at:6.2,p:'A',hold:1}],
  muscles:[{part:'band',from:0,to:4,side:-1,lvl:1,depth:9},{part:'glute',lvl:2}],
  tags:[['Estirament','t'],['Esquena','p'],['Glutis','s']]};

EX.cercles={title:"Cercles de braços",dose:"20 s endavant i enrere",vb:"-20 -110 440 380",front:true,
  props:()=>`<line x1="40" y1="${FL+3}" x2="360" y2="${FL+3}" stroke="var(--floor)" stroke-width="5" stroke-linecap="round"/>`,
  tags:[['Escalfament','t'],['Espatlles','p'],['Trapezi','s']]};
for(const k of ['superman','isquios','flexor','nen']) prep(EX[k]);
const ORDER=['cercles','gat','esquat','pont','flexions','superman','deadbug','isquios','flexor','nen'];

export { skeleton, sample, renderFigure, renderFront, EX, ORDER };

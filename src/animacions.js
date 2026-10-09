/*
 * animacions.js — il·lustracions animades dels exercicis (SVG generat per codi)
 * ESPISHU. NO cal redibuixar res: fes servir l'API del final del fitxer.
 * Requereix les variables CSS de colors definides a PLA.md (secció "Aspecte visual").
 */

/* ================= Figura articulada (vista de perfil) ================= */
const LEN={thigh:92,shin:88,foot:28,up:60,fore:52,hand:15,spine:[38,40,34],neck:15};
const FLOOR=262;
const FRONT_W=[21,17,24,15], BACK_W=[19,17,20,17];
const R=d=>d*Math.PI/180, D=r=>r*180/Math.PI;
const P=(p,a,l)=>[p[0]+l*Math.cos(R(a)),p[1]+l*Math.sin(R(a))];
const AN=(a,b)=>D(Math.atan2(b[1]-a[1],b[0]-a[0]));
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]], mul=(a,k)=>[a[0]*k,a[1]*k];
const unit=a=>[Math.cos(R(a)),Math.sin(R(a))];
const perp=v=>[-v[1],v[0]];
const f=n=>n.toFixed(1);
let uid=0;

function ik(root,target,l1,l2,bend){
  const dx=target[0]-root[0],dy=target[1]-root[1];
  const d=Math.min(Math.hypot(dx,dy),l1+l2-0.5);
  const base=Math.atan2(dy,dx);
  const A=Math.acos(Math.max(-1,Math.min(1,(l1*l1+d*d-l2*l2)/(2*l1*d))));
  const a1=base+bend*A, j=[root[0]+l1*Math.cos(a1),root[1]+l1*Math.sin(a1)];
  return [D(a1),AN(j,target)];
}
function lerpPose(a,b,t){
  if(typeof a==='number') return a+(b-a)*t;
  if(Array.isArray(a)) return a.map((v,i)=>lerpPose(v,b[i],t));
  if(a&&typeof a==='object'){const o={};for(const k in a) o[k]=lerpPose(a[k],b[k],t);return o;}
  return a;
}
function limb(root,spec,l1,l2,l3){
  let a1,a2;
  if(spec.ik)[a1,a2]=ik(root,spec.ik,l1,l2,spec.bend); else {a1=spec.a[0];a2=spec.a[1];}
  const j=P(root,a1,l1), e=P(j,a2,l2), tip=P(e,spec.end,l3);
  return {root,j,e,tip,a1,a2,a3:spec.end};
}
function skeleton(pose){
  const s={};
  // si hi ha "knee", el genoll proper queda fix i el maluc es calcula des d'ell
  const p0=pose.knee?P(pose.knee,pose.legN.a[0]+180,LEN.thigh):pose.hip;
  let a=pose.spine[0];
  const p1=P(p0,a,LEN.spine[0]); const a0=a;
  a+=pose.spine[1]; const p2=P(p1,a,LEN.spine[1]); const a1=a;
  a+=pose.spine[2]; const p3=P(p2,a,LEN.spine[2]); const a2=a;
  s.spine=[p0,p1,p2,p3]; s.sa=[a0,a1,a2];
  const na=a2+pose.neck; s.neckEnd=P(p3,na,LEN.neck);
  s.ha=na+pose.head; s.head=P(s.neckEnd,s.ha,16);
  s.shoulder=P(p3,a2+180,10);
  s.legN=limb(p0,pose.legN,LEN.thigh,LEN.shin,LEN.foot);
  s.legF=limb(add(p0,pose.farOff),pose.legF,LEN.thigh,LEN.shin,LEN.foot);
  s.armN=limb(s.shoulder,pose.armN,LEN.up,LEN.fore,LEN.hand);
  s.armF=limb(add(s.shoulder,pose.farOff),pose.armF,LEN.up,LEN.fore,LEN.hand);
  return s;
}

/* ---- formes ---- */
function segShape(A,B,wA,wB,bF,bB,side){
  const a=AN(A,B),u=unit(a),n=mul(perp(u),side),L=Math.hypot(B[0]-A[0],B[1]-A[1]);
  const M=add(A,mul(u,L*0.45)),wm=(wA+wB)/2;
  const a1=add(A,mul(n,wA/2)),b1=add(B,mul(n,wB/2)),c1=add(M,mul(n,wm/2+bF*2));
  const a2=add(A,mul(n,-wA/2)),b2=add(B,mul(n,-wB/2)),c2=add(M,mul(n,-(wm/2+bB*2)));
  return `<path d="M${f(a1[0])} ${f(a1[1])}Q${f(c1[0])} ${f(c1[1])} ${f(b1[0])} ${f(b1[1])}L${f(b2[0])} ${f(b2[1])}Q${f(c2[0])} ${f(c2[1])} ${f(a2[0])} ${f(a2[1])}Z"/>`
   +`<circle cx="${f(A[0])}" cy="${f(A[1])}" r="${f(wA/2)}"/><circle cx="${f(B[0])}" cy="${f(B[1])}" r="${f(wB/2)}"/>`;
}
const ellipse=(c,rx,ry,rot)=>`<ellipse cx="${f(c[0])}" cy="${f(c[1])}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${f(rot)} ${f(c[0])} ${f(c[1])})"/>`;
const circle=(c,r)=>`<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(r)}"/>`;
function smooth(pts){
  const n=pts.length,g=i=>pts[(i+n)%n];
  let d=`M${f(pts[0][0])} ${f(pts[0][1])}`;
  for(let i=0;i<n;i++){
    const p0=g(i-1),p1=g(i),p2=g(i+1),p3=g(i+2);
    const c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];
    d+=`C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d+'Z';
}
function torsoShape(s){
  const sa=s.sa, dirs=[sa[0],(sa[0]+sa[1])/2,(sa[1]+sa[2])/2,sa[2]];
  const fr=s.spine.map((p,i)=>add(p,mul(perp(unit(dirs[i])),FRONT_W[i])));
  const bk=s.spine.map((p,i)=>add(p,mul(perp(unit(dirs[i])),-BACK_W[i])));
  const loop=[...fr,P(s.spine[3],sa[2],6),...bk.slice().reverse(),P(s.spine[0],sa[0]+180,13)];
  return `<path d="${smooth(loop)}"/>`;
}
function glutePos(s){
  const back=mul(perp(unit(s.sa[0])),-1);
  return {c:add(add(s.spine[0],mul(back,11)),mul(unit(s.legN.a1),9)),rot:s.legN.a1};
}
function headFrame(s){const u=unit(s.ha),n=perp(u);return {u,n,at:(a,b)=>add(add(s.head,mul(u,a)),mul(n,b))};}
function headShape(s){
  const h=headFrame(s);
  return ellipse(s.head,19,15.5,s.ha)
    + ellipse(h.at(-7,5),10,9,s.ha)          // mandíbula
    + circle(h.at(-1,15.2),3.6)               // nas
    + segShape(s.spine[3],s.neckEnd,15,13,0,0,1);
}
function kneePoint(L){
  const v=add(unit(L.a1),unit(L.a2)); const a=D(Math.atan2(v[1],v[0]));
  return add(L.j,mul(perp(unit(a)),-6.5));  // davant del genoll
}
function legShapes(L){
  return segShape(L.root,L.j,30,19,6,4,-1)
       + segShape(L.j,L.e,19,11,1,6,-1)
       + circle(kneePoint(L),8)
       + segShape(L.e,L.tip,12,7,0,1,-1);
}
function armShapes(A,delt){
  return (delt?circle(A.root,11):'')
       + segShape(A.root,A.j,17,13,3,2,-1)
       + segShape(A.j,A.e,13,9,2,1,-1)
       + ellipse(add(A.e,mul(unit(A.a3),LEN.hand*0.55)),LEN.hand*0.62,5.5,A.a3);
}
function group(shapes,fill,inner){
  const id='c'+(uid++);
  let out=`<g fill="var(--line)" stroke="var(--line)" stroke-width="4.5" stroke-linejoin="round">${shapes}</g><g fill="${fill}">${shapes}</g>`;
  if(inner) out+=`<clipPath id="${id}">${shapes}</clipPath><g clip-path="url(#${id})">${inner}</g>`;
  return out;
}
/* el·lipse enganxada a un costat d'un segment (múscul o ombra) */
function lensAt(A,B,t,len,side,depth,w,sideSign,fill,op){
  const a=AN(A,B),u=unit(a),L=Math.hypot(B[0]-A[0],B[1]-A[1]),n=mul(perp(u),side*sideSign);
  const c=add(add(A,mul(u,L*t)),mul(n,w/2));
  return `<g fill="${fill}"${op?` fill-opacity="${op}"`:''}>${ellipse(c,L*len/2,depth,a)}</g>`;
}
function fibers(A,B,t,len,side,w,sideSign,depth){
  const a=AN(A,B),u=unit(a),L=Math.hypot(B[0]-A[0],B[1]-A[1]),n=mul(perp(u),side*sideSign);
  let d='';
  for(const k of [0.3,0.65]){
    const off=w/2-depth*k;
    const s0=add(add(A,mul(u,L*(t-len*0.3))),mul(n,off)), s1=add(add(A,mul(u,L*(t+len*0.3))),mul(n,off));
    d+=`M${f(s0[0])} ${f(s0[1])}L${f(s1[0])} ${f(s1[1])}`;
  }
  return `<path d="${d}" stroke="var(--line)" stroke-opacity=".2" stroke-width="1.1" fill="none"/>`;
}
const SEG_W={thigh:26,shin:16,up:15,fore:11};
function segOf(s,part){
  const L=s.legN, A=s.armN;
  return {thigh:[L.root,L.j],shin:[L.j,L.e],up:[A.root,A.j],fore:[A.j,A.e]}[part];
}
function muscleSVG(s,o){
  const col=`var(--m${o.lvl})`;
  if(o.part==='spine'){
    const A=s.spine[o.i],B=s.spine[o.i+1], w=(o.side<0?BACK_W:FRONT_W)[o.i]*2;
    return lensAt(A,B,o.t,o.len,o.side,o.depth,w,1,col)+fibers(A,B,o.t,o.len,o.side,w,1,o.depth);
  }
  const [A,B]=segOf(s,o.part), w=SEG_W[o.part];
  return lensAt(A,B,o.t,o.len,o.side,o.depth,w,-1,col)+fibers(A,B,o.t,o.len,o.side,w,-1,o.depth);
}
function shading(s){ // ombra suau al costat d'esquena i darrere de les extremitats
  let sh='';
  for(let i=0;i<3;i++) sh+=lensAt(s.spine[i],s.spine[i+1],.5,1.3,-1,7,BACK_W[i]*2,1,'var(--line)',.07);
  const L=s.legN;
  sh+=lensAt(L.root,L.j,.5,1.1,-1,6,26,-1,'var(--line)',.07)+lensAt(L.j,L.e,.45,1.1,-1,5,16,-1,'var(--line)',.07);
  return sh;
}
function headDetails(s){
  const h=headFrame(s), id='hc'+(uid++);
  const eye=h.at(3,9.5), ear=h.at(-1,-2), brow0=h.at(6.5,6.5), brow1=h.at(6,12.5);
  return `<clipPath id="${id}">${ellipse(s.head,17.5,14,s.ha)}</clipPath>`
    +`<g clip-path="url(#${id})"><g fill="var(--line)" fill-opacity=".82">${ellipse(h.at(6,-6),16,14,s.ha)}</g></g>`
    +`<g fill="none" stroke="var(--line)" stroke-linecap="round">`
    +`<ellipse cx="${f(ear[0])}" cy="${f(ear[1])}" rx="3.2" ry="4.6" transform="rotate(${f(s.ha)} ${f(ear[0])} ${f(ear[1])})" stroke-opacity=".5" stroke-width="1.5"/>`
    +`<path d="M${f(brow0[0])} ${f(brow0[1])}L${f(brow1[0])} ${f(brow1[1])}" stroke-opacity=".55" stroke-width="1.6"/></g>`
    +`<g fill="var(--line)">${circle(eye,1.9)}</g>`;
}
function kneeDetail(L){
  const k=kneePoint(L);
  return `<circle cx="${f(k[0])}" cy="${f(k[1])}" r="4.5" fill="none" stroke="var(--line)" stroke-opacity=".28" stroke-width="1.3"/>`;
}

function renderSide(ex,t){
  const pose=ex.poseAt?ex.poseAt(t):lerpPose(ex.start,ex.end,t), m=ex.muscles||[];
  let s=skeleton(pose);
  if(ex.ground){ // el peu més baix sempre toca a terra (caminar, córrer)
    const low=Math.max(...[s.legN,s.legF].flatMap(L=>[L.e[1]+6,L.tip[1]+3.5]));
    pose.hip=[pose.hip[0],pose.hip[1]+(FLOOR-low)]; s=skeleton(pose);
  }
  let svg=ex.props?ex.props(s,t):'';
  svg+=group(legShapes(s.legF),'var(--body-far)');
  svg+=group(armShapes(s.armF,false),'var(--body-far)');
  if(ex.mid) svg+=ex.mid(s,t);
  const g=glutePos(s);
  const bodyShapes=torsoShape(s)+headShape(s)+ellipse(g.c,19,15,g.rot)+legShapes(s.legN);
  let inner=shading(s);
  m.filter(o=>o.part==='glute').forEach(o=>{inner+=`<g fill="var(--m${o.lvl})">${ellipse(add(g.c,mul(perp(unit(s.sa[0])),-3)),19,13,g.rot)}</g>`;});
  m.filter(o=>['spine','thigh','shin'].includes(o.part)).forEach(o=>inner+=muscleSVG(s,o));
  svg+=group(bodyShapes,'var(--body)',inner);
  svg+=headDetails(s)+kneeDetail(s.legN);
  let arm='';
  m.filter(o=>['up','fore'].includes(o.part)).forEach(o=>arm+=muscleSVG(s,o));
  m.filter(o=>o.part==='delt').forEach(o=>{
    const c=add(s.armN.root,mul(perp(unit(s.sa[2])),o.side*4));
    arm+=`<g fill="var(--m${o.lvl})">${circle(c,8)}</g>`;
  });
  svg+=group(armShapes(s.armN,true),'var(--body)',arm);
  if(ex.after) svg+=ex.after(s,t);
  return svg;
}

/* ================= Vista de front (cercles de braços) ================= */
function renderFront(ex,t){
  const cx=200, ph=t*ex.cycles*2*Math.PI, r=13;
  const torsoR=[[40,-24],[37,-6],[33,18],[27,46],[30,66],[32,86],[10,100]];
  const pts=[...torsoR.map(p=>[cx+p[0],p[1]]),...torsoR.slice().reverse().map(p=>[cx-p[0],p[1]])];
  const head=[cx,-61];
  let body=`<path d="${smooth(pts)}"/>`
    +segShape([cx,-44],[cx,-22],17,19,0,0,1)
    +`<ellipse cx="${cx}" cy="-61" rx="15.5" ry="19"/>`
    +circle([cx-15.5,-59],4.5)+circle([cx+15.5,-59],4.5);
  for(const sg of [-1,1]){
    const hip=[cx+16*sg,84], knee=[cx+15*sg,170], ank=[cx+14*sg,252];
    body+=segShape(hip,knee,32,19,4,4,1)+segShape(knee,ank,19,12,3,3,1)+circle(knee,8.5)
        +`<ellipse cx="${cx+19*sg}" cy="257" rx="11" ry="6"/>`;
  }
  // trapezi (secundari) dins el cos
  const inner=`<g fill="var(--m2)">${ellipse([cx-22,-26],15,6,18)}${ellipse([cx+22,-26],15,6,-18)}</g>`
    +`<path d="M${cx} -6V58M${cx-30} 6Q${cx-14} 14 ${cx} 6Q${cx+14} 14 ${cx+30} 6" fill="none" stroke="var(--line)" stroke-opacity=".18" stroke-width="1.3"/>`;
  let svg=`<line x1="40" y1="${FLOOR+3}" x2="360" y2="${FLOOR+3}" stroke="var(--floor)" stroke-width="5" stroke-linecap="round"/>`;
  svg+=group(body,'var(--body)',inner);
  // cara
  svg+=`<clipPath id="fh${uid}"><ellipse cx="${cx}" cy="-61" rx="14" ry="17.5"/></clipPath><g clip-path="url(#fh${uid})"><g fill="var(--line)" fill-opacity=".82"><ellipse cx="${cx}" cy="-78" rx="18" ry="12"/></g></g>`;
  uid++;
  svg+=`<g fill="var(--line)">${circle([cx-6,-61],1.9)}${circle([cx+6,-61],1.9)}</g>`
     +`<path d="M${cx-9} -66.5h5M${cx+4} -66.5h5M${cx} -59l1.5 5.5h-2.5M${cx-4.5} -48.5Q${cx} -46 ${cx+4.5} -48.5" fill="none" stroke="var(--line)" stroke-opacity=".55" stroke-width="1.5" stroke-linecap="round"/>`;
  for(const sg of [-1,1]){
    const sh=[cx+41*sg,-19];
    const dy=-r*Math.sin(ph), k=1-0.05*(1+Math.cos(ph))/2;      // amunt-avall + escurçament (profunditat)
    const ang=D(Math.atan2(dy,sg*110)), a1=ang, a2=ang;
    const LU=LEN.up*k, LF=LEN.fore*k;
    const j=P(sh,a1,LU), e=P(j,a2,LF);
    const shapes=circle(sh,12)+segShape(sh,j,17,13,2,2,1)+segShape(j,e,13,9,1,1,1)+ellipse(add(e,mul(unit(a2),8)),9.5,5.5,a2);
    svg+=group(shapes,'var(--body)',`<g fill="var(--m1)">${circle(add(sh,[sg*3,0]),11)}</g>`);
  }
  // traça del cercle per entendre el moviment
  for(const sg of [-1,1]){
    const c=[cx+41*sg+sg*(112+8),-19];
    svg+=`<ellipse cx="${f(c[0])}" cy="${f(c[1])}" rx="7" ry="${r+5}" fill="none" stroke="var(--m1)" stroke-opacity=".35" stroke-width="1.5" stroke-dasharray="3 4"/>`;
  }
  return svg;
}

/* ================= Exercicis ================= */
const MAT=(x,w)=>`<rect x="${x}" y="${FLOOR-2}" width="${w}" height="8" rx="4" fill="var(--mat)" stroke="var(--mat-line)" stroke-width="1.5"/>`;
const FLOORLINE=`<line x1="10" y1="${FLOOR+3}" x2="390" y2="${FLOOR+3}" stroke="var(--floor)" stroke-width="5" stroke-linecap="round"/>`;
const CUSHION=(x)=>`<rect x="${x-18}" y="${FLOOR-9}" width="36" height="12" rx="6" fill="var(--prop)" stroke="var(--prop-dark)" stroke-width="1.5"/>`;

const EX={
  cercles:{front:true, loop:true, cycles:3, ms:3600, vb:"18 -100 364 372"},

  gat:{vb:"0 100 330 175", props:()=>MAT(10,300),
    start:{hip:[128,160],spine:[4,-14,-14],neck:-18,head:-8,farOff:[-5,-4],
      legN:{a:[92,180],end:182},legF:{a:[92,180],end:182},
      armN:{ik:[229,256],bend:-1,end:0},armF:{ik:[223,254],bend:-1,end:0}},
    end:{hip:[128,160],spine:[-28,24,22],neck:40,head:12,farOff:[-5,-4],
      legN:{a:[92,180],end:182},legF:{a:[92,180],end:182},
      armN:{ik:[229,256],bend:-1,end:0},armF:{ik:[223,254],bend:-1,end:0}},
    muscles:[{part:'spine',i:0,t:.5,len:1.1,side:-1,depth:8,lvl:1},{part:'spine',i:1,t:.5,len:1.1,side:-1,depth:8,lvl:1},
      {part:'spine',i:2,t:.45,len:.9,side:-1,depth:7,lvl:1},{part:'spine',i:0,t:.7,len:1.2,side:1,depth:7,lvl:2},{part:'spine',i:1,t:.3,len:.9,side:1,depth:6,lvl:2}]},

  esquat:{vb:"40 -95 300 370",
    props:()=>FLOORLINE+`<g fill="var(--prop)" stroke="var(--prop-dark)" stroke-width="2" stroke-linejoin="round">
      <rect x="66" y="172" width="80" height="9" rx="3"/><rect x="72" y="181" width="7" height="${FLOOR-181}"/>
      <rect x="134" y="181" width="7" height="${FLOOR-181}"/><rect x="66" y="92" width="7" height="82"/><rect x="62" y="96" width="15" height="40" rx="4"/></g>`,
    start:{hip:[178,77],spine:[-90,0,0],neck:0,head:0,farOff:[-5,-3],
      legN:{ik:[178,256],bend:-1,end:0},legF:{ik:[172,254],bend:-1,end:0},
      armN:{a:[-2,-2],end:-2},armF:{a:[-4,-4],end:-4}},
    end:{hip:[140,156],spine:[-56,-6,-4],neck:-14,head:-6,farOff:[-5,-3],
      legN:{ik:[178,256],bend:-1,end:0},legF:{ik:[172,254],bend:-1,end:0},
      armN:{a:[-4,-4],end:-4},armF:{a:[-6,-6],end:-6}},
    muscles:[{part:'thigh',t:.5,len:.75,side:1,depth:8,lvl:1},{part:'glute',lvl:1},{part:'thigh',t:.5,len:.7,side:-1,depth:7,lvl:2}]},

  pont:{vb:"60 128 345 148", props:()=>MAT(70,320),
    start:{hip:[268,243],spine:[180,0,0],neck:0,head:-2,farOff:[-5,-3],
      legN:{ik:[358,252],bend:-1,end:-4},legF:{ik:[350,250],bend:-1,end:-4},
      armN:{ik:[281,254],bend:1,end:0},armF:{ik:[274,252],bend:1,end:0}},
    end:{hip:[268,200],spine:[140,15,23],neck:2,head:-2,farOff:[-5,-3],
      legN:{ik:[358,252],bend:-1,end:-4},legF:{ik:[350,250],bend:-1,end:-4},
      armN:{ik:[294,254],bend:1,end:0},armF:{ik:[287,252],bend:1,end:0}},
    muscles:[{part:'glute',lvl:1},{part:'thigh',t:.5,len:.75,side:-1,depth:8,lvl:2},{part:'spine',i:0,t:.6,len:1.4,side:-1,depth:7,lvl:2}]},

  flexions:{vb:"0 80 390 195", props:()=>MAT(10,370)+CUSHION(128),
    start:{knee:[128,246],hip:[0,0],spine:[-33.5,0,0],neck:2,head:0,farOff:[-5,-3],
      legN:{a:[146.5,178],end:178},legF:{a:[146.5,178],end:178},
      armN:{ik:[302,256],bend:1,end:0},armF:{ik:[296,254],bend:1,end:0}},
    end:{knee:[128,246],hip:[0,0],spine:[-14,0,0],neck:2,head:0,farOff:[-5,-3],
      legN:{a:[166,178],end:178},legF:{a:[166,178],end:178},
      armN:{ik:[302,256],bend:1,end:0},armF:{ik:[296,254],bend:1,end:0}},
    muscles:[{part:'spine',i:2,t:.45,len:1.1,side:1,depth:9,lvl:1},{part:'up',t:.5,len:.75,side:-1,depth:6,lvl:1},
      {part:'delt',side:1,lvl:2},{part:'spine',i:0,t:.6,len:1.3,side:1,depth:6,lvl:2}]},

  superman:{vb:"-75 150 475 125", props:()=>MAT(-70,465),
    start:{hip:[150,241],spine:[0,0,0],neck:4,head:0,farOff:[-4,-3],
      legN:{a:[180,180],end:180},legF:{a:[180,180],end:180},
      armN:{a:[2,2],end:2},armF:{a:[3,3],end:3}},
    end:{hip:[150,241],spine:[-2,-8,-12],neck:6,head:0,farOff:[-4,-3],
      legN:{a:[171,177],end:178},legF:{a:[171,177],end:178},
      armN:{a:[-16,-18],end:-18},armF:{a:[-15,-17],end:-17}},
    muscles:[{part:'spine',i:0,t:.5,len:1.3,side:-1,depth:8,lvl:1},{part:'glute',lvl:1},
      {part:'spine',i:2,t:.45,len:1,side:-1,depth:7,lvl:2},{part:'thigh',t:.5,len:.75,side:-1,depth:7,lvl:2}]},

  deadbug:{vb:"28 60 447 215", props:()=>MAT(60,410),
    start:{hip:[258,243],spine:[180,0,0],neck:0,head:-2,farOff:[-5,-3],
      legN:{a:[-90,0],end:-90},legF:{a:[-90,0],end:-90},
      armN:{a:[-88,-88],end:-88},armF:{a:[-92,-92],end:-92}},
    end:{hip:[258,243],spine:[180,0,0],neck:0,head:-2,farOff:[-5,-3],
      legN:{a:[-90,0],end:-90},legF:{a:[-12,-12],end:-80},
      armN:{a:[-148,-150],end:-150},armF:{a:[-92,-92],end:-92}},
    muscles:[{part:'spine',i:0,t:.5,len:1.3,side:1,depth:9,lvl:1},{part:'spine',i:1,t:.4,len:1,side:1,depth:8,lvl:1},
      {part:'thigh',t:.25,len:.5,side:1,depth:7,lvl:2}]},

  isquios:{vb:"60 50 345 225", props:()=>MAT(70,320),
    after(s){
      const L=s.legN, ball=P(L.e,L.a3,LEN.foot*0.7);
      const h=add(s.armN.e,mul(unit(s.armN.a3),8));
      const h2=add(s.armF.e,mul(unit(s.armF.a3),8));
      return `<path d="M${f(h[0])} ${f(h[1])}L${f(ball[0])} ${f(ball[1])}L${f(h2[0])} ${f(h2[1])}" fill="none" stroke="var(--towel)" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`;
    },
    start:{hip:[258,243],spine:[180,0,0],neck:0,head:-2,farOff:[-5,-3],
      legN:{a:[-38,-38],end:-128},legF:{a:[0,0],end:-90},
      armN:{ik:[236,176],bend:-1,end:-40},armF:{ik:[228,174],bend:-1,end:-40}},
    end:{hip:[258,243],spine:[180,0,0],neck:0,head:-2,farOff:[-5,-3],
      legN:{a:[-78,-78],end:-168},legF:{a:[0,0],end:-90},
      armN:{ik:[226,146],bend:-1,end:-70},armF:{ik:[218,144],bend:-1,end:-70}},
    muscles:[{part:'thigh',t:.5,len:.8,side:-1,depth:8,lvl:1},{part:'shin',t:.35,len:.6,side:-1,depth:6,lvl:2}]},

  flexor:{vb:"30 -20 330 295", props:()=>MAT(20,320)+CUSHION(150),
    start:{knee:[150,247],hip:[0,0],spine:[-90,0,0],neck:0,head:0,farOff:[2,-3],
      legN:{a:[90,180],end:180},legF:{ik:[262,256],bend:-1,end:0},
      armN:{a:[112,32],end:20},armF:{a:[108,30],end:20}},
    end:{knee:[150,247],hip:[0,0],spine:[-92,0,0],neck:0,head:0,farOff:[2,-3],
      legN:{a:[112,180],end:180},legF:{ik:[262,256],bend:-1,end:0},
      armN:{a:[114,34],end:22},armF:{a:[110,32],end:22}},
    muscles:[{part:'thigh',t:.18,len:.36,side:1,depth:8,lvl:1},{part:'spine',i:0,t:.25,len:.6,side:1,depth:7,lvl:1},
      {part:'thigh',t:.6,len:.6,side:1,depth:7,lvl:2}]},

  nen:{vb:"0 100 330 175", props:()=>MAT(10,300),
    start:{knee:[125,252],hip:[0,0],spine:[-6,0,-6],neck:-4,head:0,farOff:[-5,-4],
      legN:{a:[92,180],end:182},legF:{a:[92,180],end:182},
      armN:{ik:[238,256],bend:-1,end:0},armF:{ik:[232,254],bend:-1,end:0}},
    end:{knee:[125,252],hip:[0,0],spine:[8,4,0],neck:0,head:0,farOff:[-5,-4],
      legN:{a:[20,180],end:182},legF:{a:[20,180],end:182},
      armN:{ik:[238,256],bend:-1,end:0},armF:{ik:[232,254],bend:-1,end:0}},
    muscles:[{part:'spine',i:0,t:.5,len:1.2,side:-1,depth:8,lvl:1},{part:'spine',i:1,t:.5,len:1.1,side:-1,depth:7,lvl:2},
      {part:'spine',i:2,t:.45,len:.9,side:-1,depth:7,lvl:2},{part:'glute',lvl:2}]},


  /* ===== Activitats de fora (en bucle) ===== */
  caminar:{loop:true, ms:3600, cycles:3, ground:true, vb:"60 -100 290 375",
    props:(s,t)=>`<line x1="40" y1="${FLOOR+3}" x2="380" y2="${FLOOR+3}" stroke="var(--floor)" stroke-width="5" stroke-linecap="round" stroke-dasharray="22 14" stroke-dashoffset="${f(t*3*72)}"/>`,
    poseAt(t){
      const ph=t*3*2*Math.PI, leg=(p)=>{const th=90-22*Math.sin(p), fl=5+32*Math.pow(Math.max(0,Math.cos(p)),1.5);
        return {a:[th,th+fl],end:th+fl-90-6*Math.cos(p)};};
      const arm=(p)=>{const u=90+18*Math.sin(p);return {a:[u,u-14],end:u-14};};
      return {hip:[200,80],spine:[-88,0,-2],neck:2,head:0,farOff:[-4,-2],
        legN:leg(ph),legF:leg(ph+Math.PI),armN:arm(ph),armF:arm(ph+Math.PI)};
    },
    muscles:[{part:'thigh',t:.5,len:.75,side:1,depth:8,lvl:2},{part:'glute',lvl:2},{part:'shin',t:.35,len:.6,side:-1,depth:6,lvl:2}]},

  correr:{loop:true, ms:2700, cycles:3, ground:true, vb:"40 -100 320 375",
    props:(s,t)=>`<line x1="20" y1="${FLOOR+3}" x2="390" y2="${FLOOR+3}" stroke="var(--floor)" stroke-width="5" stroke-linecap="round" stroke-dasharray="22 14" stroke-dashoffset="${f(t*3*144)}"/>`,
    poseAt(t){
      const ph=t*3*2*Math.PI, leg=(p)=>{const th=88-34*Math.sin(p), fl=14+78*Math.pow(Math.max(0,Math.cos(p)),1.3);
        return {a:[th,th+fl],end:th+fl-90-10*Math.cos(p)};};
      const arm=(p)=>{const u=96+34*Math.sin(p);return {a:[u,u-88],end:u-88};};
      return {hip:[200,90],spine:[-80,0,-4],neck:4,head:0,farOff:[-4,-2],
        legN:leg(ph),legF:leg(ph+Math.PI),armN:arm(ph),armF:arm(ph+Math.PI)};
    },
    muscles:[{part:'thigh',t:.5,len:.75,side:1,depth:8,lvl:1},{part:'glute',lvl:1},{part:'thigh',t:.5,len:.7,side:-1,depth:7,lvl:2},{part:'shin',t:.35,len:.6,side:-1,depth:6,lvl:2}]},

  bici:{loop:true, ms:3600, cycles:3, vb:"40 -75 340 347",
    props(s,t){ // rodes amb radis que giren
      const rot=t*3*360*1.6; let w='';
      for(const c of [[98,214],[330,214]]){
        let sp=''; for(let i=0;i<8;i++){const a=rot+i*22.5, p1=P(c,a,44), p2=P(c,a+180,44); sp+=`M${f(p1[0])} ${f(p1[1])}L${f(p2[0])} ${f(p2[1])}`;}
        w+=`<circle cx="${c[0]}" cy="${c[1]}" r="47" fill="none" stroke="var(--prop-dark)" stroke-width="5"/>`
          +`<path d="${sp}" stroke="var(--prop)" stroke-width="1.3"/><circle cx="${c[0]}" cy="${c[1]}" r="4" fill="var(--prop-dark)"/>`;
      }
      return `<line x1="30" y1="${FLOOR+3}" x2="390" y2="${FLOOR+3}" stroke="var(--floor)" stroke-width="5" stroke-linecap="round"/>`+w;
    },
    mid(s,t){ // quadre, selló i manillar entre la cama del fons i el cos
      const ph=t*3*360, bb=[196,222], pf=P(bb,ph+180,18);
      return `<g fill="none" stroke="var(--prop-dark)" stroke-width="2.5" stroke-linecap="round"><path d="M${f(bb[0])} ${f(bb[1])}L${f(pf[0])} ${f(pf[1])}"/></g>`
        +`<g fill="none" stroke="var(--bike)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M196 222L98 214L170 100L196 222L306 122L300 94L170 100M306 122L330 214"/></g>
          <g fill="var(--prop-dark)"><path d="M148 92Q166 84 186 92L184 98Q166 95 150 98Z"/>
          <path d="M300 94L296 78" stroke="var(--prop-dark)" stroke-width="5" stroke-linecap="round"/><rect x="288" y="70" width="22" height="7" rx="3.5"/></g>`
        +`<circle cx="196" cy="222" r="9" fill="var(--prop)" stroke="var(--prop-dark)" stroke-width="2"/>`;
    },
    after(s,t){ // biela i pedal del costat proper
      const ph=t*3*360, bb=[196,222], pn=P(bb,ph,18), pf=P(bb,ph+180,18);
      return `<g stroke="var(--prop-dark)" stroke-width="3.5" stroke-linecap="round"><path d="M${f(bb[0])} ${f(bb[1])}L${f(pn[0])} ${f(pn[1])}"/></g>`
        +`<rect x="${f(pn[0]-8)}" y="${f(pn[1]-2)}" width="16" height="5" rx="2" fill="var(--prop-dark)"/>`
        +`<rect x="${f(pf[0]-8)}" y="${f(pf[1]-2)}" width="16" height="5" rx="2" fill="var(--prop-dark)" opacity=".6"/>`;
    },
    poseAt(t){
      const ph=t*3*360, bb=[196,222];
      const ped=a=>{const p=P(bb,a,18);return [p[0]-6,p[1]-9];};
      const footA=a=>12*Math.sin(R(a))-4;
      return {hip:[160,70],spine:[-42,2,2],neck:-26,head:-6,farOff:[-3,-2],
        legN:{ik:ped(ph),bend:-1,end:footA(ph)},legF:{ik:ped(ph+180),bend:-1,end:footA(ph+180)},
        armN:{ik:[296,72],bend:1,end:4},armF:{ik:[292,70],bend:1,end:4}};
    },
    muscles:[{part:'thigh',t:.5,len:.75,side:1,depth:8,lvl:1},{part:'glute',lvl:2},{part:'shin',t:.35,len:.6,side:-1,depth:6,lvl:2}]},

  crol:{loop:true, ms:4200, cycles:3, vb:"-55 25 455 255",
    props:()=>`<rect x="-90" y="152" width="520" height="150" fill="var(--water)" fill-opacity=".35"/>`,
    after(s,t){
      let d='M-90 152'; for(let x=-90;x<=410;x+=10) d+=`L${x} ${f(152+2.5*Math.sin(x/18+t*3*2*Math.PI*2))}`;
      return `<rect x="-90" y="154" width="520" height="150" fill="var(--water)" fill-opacity=".3"/><path d="${d}" fill="none" stroke="var(--water-line)" stroke-width="2"/>`;
    },
    poseAt(t){
      const ph=t*3*360;
      const arm=th=>{const b=28*Math.max(0,-Math.sin(R(th)));return {a:[th,th+b],end:th+b};};
      const kick=p=>{const k=7*Math.sin(R(p));return {a:[180+k,180+k*1.5],end:180+k};};
      return {hip:[160,152],spine:[0,0,0],neck:6,head:0,farOff:[-3,-3],
        legN:kick(ph*3),legF:kick(ph*3+180),armN:arm(ph),armF:arm(ph+180)};
    },
    muscles:[{part:'spine',i:1,t:.5,len:1.2,side:-1,depth:8,lvl:1},{part:'delt',side:-1,lvl:1},{part:'up',t:.5,len:.7,side:-1,depth:6,lvl:2}]},

  esquena:{loop:true, ms:4800, cycles:3, vb:"20 25 470 255",
    props:()=>`<rect x="-10" y="152" width="520" height="150" fill="var(--water)" fill-opacity=".35"/>`,
    after(s,t){
      let d='M-10 152'; for(let x=-10;x<=490;x+=10) d+=`L${x} ${f(152+2.5*Math.sin(x/18-t*3*2*Math.PI*2))}`;
      return `<rect x="-10" y="154" width="520" height="150" fill="var(--water)" fill-opacity=".3"/><path d="${d}" fill="none" stroke="var(--water-line)" stroke-width="2"/>`;
    },
    poseAt(t){
      const ph=t*3*360;
      const arm=th=>({a:[th,th],end:th});
      const kick=p=>{const k=7*Math.sin(R(p));return {a:[k,k*1.5],end:k-70};};
      return {hip:[262,150],spine:[180,0,0],neck:-4,head:0,farOff:[-3,-3],
        legN:kick(ph*3),legF:kick(ph*3+180),armN:arm(180-ph),armF:arm(-ph)};
    },
    muscles:[{part:'spine',i:1,t:.5,len:1.2,side:-1,depth:8,lvl:1},{part:'delt',side:-1,lvl:1},{part:'up',t:.5,len:.7,side:1,depth:6,lvl:2}]},

  /* guardat per més endavant (rem amb motxilla o peses més pesades) */
  rem:{vb:"15 40 380 232",
    props:()=>FLOORLINE+`<g fill="var(--prop)" stroke="var(--prop-dark)" stroke-width="2" stroke-linejoin="round">
      <rect x="282" y="168" width="78" height="9" rx="3"/><rect x="288" y="177" width="7" height="${FLOOR-177}"/>
      <rect x="348" y="177" width="7" height="${FLOOR-177}"/><rect x="350" y="96" width="7" height="74"/><rect x="346" y="100" width="15" height="34" rx="4"/></g>`,
    after(s){const h=add(s.armN.e,mul(unit(s.armN.a3),7));
      return `<g stroke="var(--prop-dark)" stroke-width="2" fill="var(--prop)"><circle cx="${f(h[0])}" cy="${f(h[1])}" r="11"/><circle cx="${f(h[0])}" cy="${f(h[1])}" r="4.5" fill="var(--prop-dark)"/></g>`;},
    start:{hip:[150,96],spine:[-14,-2,-2],neck:8,head:6,farOff:[-6,-3],legN:{a:[84,98],end:2},legF:{a:[100,86],end:2},armN:{a:[90,90],end:90},armF:{ik:[300,166],bend:1,end:10}},
    end:{hip:[150,96],spine:[-15,-2,-2],neck:8,head:6,farOff:[-6,-3],legN:{a:[84,98],end:2},legF:{a:[100,86],end:2},armN:{a:[170,95],end:95},armF:{ik:[300,166],bend:1,end:10}},
    muscles:[{part:'spine',i:1,t:.5,len:1.2,side:-1,depth:9,lvl:1},{part:'spine',i:2,t:.4,len:1,side:-1,depth:9,lvl:1},{part:'up',t:.5,len:.7,side:1,depth:6,lvl:2},{part:'delt',side:-1,lvl:2}]}
};

function render(key,t){
  const ex=EX[key];
  const inner=ex.front?renderFront(ex,t):renderSide(ex,t);
  return `<svg viewBox="${ex.vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
}


/* ================= API pública ================= */
/* id de l'app -> clau interna + nom a Free Exercise DB */
export const ANIMACIONS = {
  'cercles-bracos':   {clau:'cercles',  freeDb:'Arm Circles'},
  'gat-camell':       {clau:'gat',      freeDb:'Cat Stretch'},
  'esquat-cadira':    {clau:'esquat',   freeDb:'Bodyweight Squat'},
  'pont-glutis':      {clau:'pont',     freeDb:'Butt Lift (Bridge)'},
  'flexions-genolls': {clau:'flexions', freeDb:'Pushups'},
  'superman':         {clau:'superman', freeDb:'Superman'},
  'dead-bug':         {clau:'deadbug',  freeDb:'Dead Bug'},
  'isquios-tovallola':{clau:'isquios',  freeDb:'Hamstring Stretch'},
  'flexor-maluc':     {clau:'flexor',   freeDb:'Kneeling Hip Flexor'},
  'postura-nen':      {clau:'nen',      freeDb:"Child's Pose"},
  'rem-una-ma':       {clau:'rem',      freeDb:'One-Arm Dumbbell Row'},   // reserva (quan hi hagi pes)
  'caminar':          {clau:'caminar'},
  'correr':           {clau:'correr'},
  'bici':             {clau:'bici'},
  'natacio-crol':     {clau:'crol'},
  'natacio-esquena':  {clau:'esquena'}
};

export function teAnimacio(id){ return !!ANIMACIONS[id]; }
export function esBucle(id){ const e=EX[ANIMACIONS[id]?.clau]; return !!(e&&e.loop); }

/* SVG (string) de l'animació en l'instant t (0..1). t=0 és la posició inicial. */
export function renderAnimacio(id,t=0){
  const k=ANIMACIONS[id]?.clau; if(!k) throw new Error('Sense animació: '+id);
  return render(k,t);
}

/*
 * Munta l'animació dins d'un element (p. ex. un <button>) amb el comportament acordat:
 *  - mostra la posició inicial;
 *  - en tocar: va suaument a la posició final, s'hi queda un moment i torna a l'inici;
 *  - les activitats i els cercles de braços fan 3 cicles en bucle i s'aturen;
 *  - respecta prefers-reduced-motion.
 * Retorna una funció per desmuntar-la.
 */
export function muntaAnimacio(el,id,{onEstat}={}){
  const k=ANIMACIONS[id]?.clau, ex=EX[k];
  if(!ex){ el.textContent=''; return ()=>{}; }
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  let busy=false, raf=0, viu=true;
  el.innerHTML=render(k,0);
  const done=()=>{ if(!viu) return; el.innerHTML=render(k,0); busy=false; onEstat&&onEstat('repos'); };
  function play(){
    if(busy) return; busy=true; onEstat&&onEstat('moviment');
    const t0=performance.now();
    if(ex.loop){
      const ms=reduce?ex.ms*1.6:ex.ms;
      const fr=now=>{ if(!viu) return; const e=(now-t0)/ms; if(e>=1) return done(); el.innerHTML=render(k,e); raf=requestAnimationFrame(fr); };
      raf=requestAnimationFrame(fr); return;
    }
    const go=reduce?600:1100, hold=reduce?900:550;
    const fr=now=>{
      if(!viu) return;
      const e=now-t0; let t;
      if(e<go) t=reduce?(e<go/2?0:1):ease(e/go);
      else if(e<go+hold) t=1;
      else if(e<go*2+hold) t=reduce?(e<go*1.5+hold?1:0):1-ease((e-go-hold)/go);
      else return done();
      el.innerHTML=render(k,t); raf=requestAnimationFrame(fr);
    };
    raf=requestAnimationFrame(fr);
  }
  el.addEventListener('click',play);
  return ()=>{ viu=false; cancelAnimationFrame(raf); el.removeEventListener('click',play); };
}

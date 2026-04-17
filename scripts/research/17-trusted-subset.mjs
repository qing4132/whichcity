// F 实验：按"独立 GT 可信度判据"剔除，而非按残差大小。
// 判据（每条都是独立于模型的先验）：
//   1) gt/gni_monthly > 4.0  (Numbeo 低收入国家小样本系统性高估)
//   2) 旅游主导城市（巴厘岛、普吉岛、清迈、马拉喀什）—— Numbeo 样本混入游客物价
//   3) gt 明显反工资排序 (与同国其他 GT 一致性检查)
//
// 这些判据对生产是**可执行**的：新城市接入时直接按规则决定是否展示估算。

import fs from 'node:fs';

const HIDDEN = new Set([38,54,56,77,79,80,81,83,84,91,92,94,95,96,97,99,100,105,107,109,110,114,115,116,118,119,120,127,128,131,135]);

const src = JSON.parse(fs.readFileSync('data/cities-source.json', 'utf8'));
const nb = JSON.parse(fs.readFileSync('_archive/scripts-numbeo/numbeo-audit/fetched-data.json', 'utf8'));
const cmi = JSON.parse(fs.readFileSync('data/sources/cost-model-inputs.json', 'utf8'));
const ap = JSON.parse(fs.readFileSync('data/sources/airbnb-prices.json', 'utf8'));
const fx = JSON.parse(fs.readFileSync('public/data/exchange-rates.json', 'utf8')).rates;
const poi = JSON.parse(fs.readFileSync('data/sources/osm/poi-counts.json', 'utf8'));
const { countryToISO, eurostatPLI: pli, usRPP: rpp } = cmi;

function gt(id){const p=nb.cityPages[id];if(!p)return null;const{singlePersonMonthlyCost:sp,rent1BRCenter:rc,rent1BROutside:ro}=p;if(sp==null||rc==null||ro==null)return null;return{gtCost:1.04*sp+0.88*(0.05*rc+0.95*ro),gtRent:0.68*(0.55*rc+0.45*ro)};}
function meanWage(c){const vs=Object.values(c.professions||{}).filter((v)=>typeof v==='number'&&v>0).sort((a,b)=>a-b);if(vs.length<5)return null;const t=vs.slice(2,-2);return t.reduce((s,v)=>s+v,0)/t.length;}
function airbnbUSD(id){const r=ap.data?.[id];if(!r?.medianNightly)return null;const rate=fx[r.localCurrency];return rate?r.medianNightly/rate:null;}
function osmRaw(id){const r=poi[id];if(!r?.r2000)return null;const p=r.r2000;const total=(p.dining||0)+(p.culture||0)+(p.health||0)+(p.edu||0)+(p.retail||0)+(p.finance||0)+(p.transit||0)+(p.tourism||0);if(total<50)return null;return{...p,total};}

let recs=[];
for(const c of src.cities){const g=gt(c.id);if(!g)continue;const w=meanWage(c);if(!w)continue;recs.push({id:c.id,name:c.name,country:c.country,continent:c.continent,visible:!HIDDEN.has(c.id),wage:w,bigMac:c.bigMacPrice||4.5,gni:c.gniPerCapita||15000,gdp:c.gdpPppPerCapita||25000,hdi:c.hdi||0.7,flights:c.directFlightCities||50,airbnbUSD:airbnbUSD(c.id),pli:countryToISO[c.country]?pli[countryToISO[c.country]]:null,rpp:rpp[c.name]||null,osm:osmRaw(c.id),...g});}
const countryOsmMed=new Map(),byCountry=new Map();
for(const r of recs){if(!r.osm)continue;if(!byCountry.has(r.country))byCountry.set(r.country,[]);byCountry.get(r.country).push(r.osm.total);}
for(const[cc,arr]of byCountry){const s=arr.sort((a,b)=>a-b),m=Math.floor(s.length/2);countryOsmMed.set(cc,s.length%2?s[m]:(s[m-1]+s[m])/2);}
for(const r of recs){if(!r.osm){r.osmFeat=null;continue;}const med=countryOsmMed.get(r.country)||r.osm.total;r.osmFeat={logRel:Math.log((r.osm.total+1)/(med+1)),cultureShare:(r.osm.culture+r.osm.tourism)/(r.osm.total+1),diningShare:r.osm.dining/(r.osm.total+1),financeShare:r.osm.finance/(r.osm.total+1)};}

// ===== 可信度判据 =====
// 规则 1: GT/月 GNI 比率。月 GNI = gni/12。正常范围 1.0-3.0（发达国家也很少超过 3x）
//         > 3.5 表示 GT 明显高于国家收入水平，典型小样本 Numbeo 偏差
// 规则 2: 手工标注的"旅游主导"城市（游客物价污染本地物价数据）
const TOURIST_DOMINATED = new Set(['巴厘岛', '普吉岛', '清迈', '马拉喀什', '雷克雅未克']);

function untrustworthyGT(r) {
  const gtToGniRatio = r.gtCost / (r.gni / 12);
  if (gtToGniRatio > 3.5) return `gtCost/monthly_gni=${gtToGniRatio.toFixed(2)} > 3.5`;
  if (TOURIST_DOMINATED.has(r.name)) return 'tourist-dominated';
  return null;
}

const flagged = recs.filter((r) => r.visible && untrustworthyGT(r));
console.log(`按可信度规则标记的可见城市 (${flagged.length}):`);
flagged.forEach((r) => console.log(`  ${r.name.padEnd(16)} ${r.country.padEnd(10)} gt=$${r.gtCost.toFixed(0).padStart(5)}  gni=$${r.gni.toFixed(0).padStart(6)}  ratio=${(r.gtCost/(r.gni/12)).toFixed(2)}  ${untrustworthyGT(r)}`));

// ===== Model scaffolding (same as 16-subset-experiment.mjs) =====
const median=(a)=>{const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const mean=(a)=>a.reduce((s,v)=>s+v,0)/a.length;
const std=(a)=>{const m=mean(a);return Math.sqrt(mean(a.map((x)=>(x-m)**2)));};
const quantile=(a,q)=>{const s=[...a].sort((x,y)=>x-y),p=(s.length-1)*q,lo=Math.floor(p),hi=Math.ceil(p);return lo===hi?s[lo]:s[lo]+(s[hi]-s[lo])*(p-lo);};
function solveRidge(X,y,lambda=0.1,W=null){const n=X.length,p=X[0].length;const w=W||Array(n).fill(1);const A=Array.from({length:p},()=>Array(p+1).fill(0));for(let i=0;i<n;i++)for(let j=0;j<p;j++){A[j][p]+=w[i]*X[i][j]*y[i];for(let k=0;k<p;k++)A[j][k]+=w[i]*X[i][j]*X[i][k];}for(let j=0;j<p;j++)A[j][j]+=lambda;for(let i=0;i<p;i++){let piv=i;for(let r=i+1;r<p;r++)if(Math.abs(A[r][i])>Math.abs(A[piv][i]))piv=r;[A[i],A[piv]]=[A[piv],A[i]];const d=A[i][i];if(Math.abs(d)<1e-12)return Array(p).fill(0);for(let j=i;j<=p;j++)A[i][j]/=d;for(let r=0;r<p;r++)if(r!==i){const f=A[r][i];for(let j=i;j<=p;j++)A[r][j]-=f*A[i][j];}}return A.map((r)=>r[p]);}
function solveHuberRidge(X,y,lambda=0.3,delta=0.4,iter=12){let w=Array(X.length).fill(1);let beta=solveRidge(X,y,lambda,w);for(let t=0;t<iter;t++){const res=X.map((xi,i)=>y[i]-xi.reduce((s,v,j)=>s+v*beta[j],0));w=res.map((r)=>(Math.abs(r)<=delta?1:delta/Math.abs(r)));beta=solveRidge(X,y,lambda,w);}return beta;}

const CONT=['北美洲','欧洲','亚洲','大洋洲','南美洲','非洲'];
function feat3(r){const cv=CONT.map((c)=>(r.continent===c?1:0));return[1,Math.log(r.wage),Math.log(r.bigMac),Math.log(r.gni),r.hdi,Math.log(r.flights+10),Math.log(r.gdp),Math.log(r.wage/r.gni+0.001),...cv];}
function feat8(r){const cv=CONT.map((c)=>(r.continent===c?1:0));const wx=CONT.map((c)=>(r.continent===c?Math.log(r.wage):0));return[1,Math.log(r.bigMac),Math.log(r.gni),r.hdi,Math.log(r.flights+10),Math.log(r.wage/r.gni+0.001),...cv,...wx];}
function feat9(r){const base=feat3(r);const osm=r.osmFeat?[r.osmFeat.logRel,r.osmFeat.cultureShare,r.osmFeat.diningShare,r.osmFeat.financeShare,1]:[0,0,0,0,0];return[...base,...osm];}
function feat10(r){const tour=r.osmFeat?r.osmFeat.cultureShare:0;const tourInt=r.osmFeat?r.osmFeat.cultureShare*Math.log(r.flights+10):0;return[1,Math.log(r.wage),Math.log(r.bigMac),Math.log(r.flights+10),tour,tourInt,r.osmFeat?1:0];}
function knnFeat(r){return[Math.log(r.wage),Math.log(r.bigMac),Math.log(r.gni),r.hdi,Math.log(r.flights+10),Math.log(r.gdp),Math.log(r.wage/r.gni+0.001)];}
const GLOBAL_NYC=recs.find((r)=>r.name==='纽约');
const A={P_NYC:GLOBAL_NYC.gtCost,R_NYC:GLOBAL_NYC.gtRent,W_NYC:GLOBAL_NYC.wage,B_NYC:GLOBAL_NYC.bigMac};
const{P_NYC,R_NYC,W_NYC,B_NYC}=A;

const M1={train(S){const X=S.map((r)=>[1,Math.log(r.wage)]);return{bc:solveHuberRidge(X,S.map((r)=>Math.log(r.gtCost))),br:solveHuberRidge(X,S.map((r)=>Math.log(r.gtRent)))};},predict(t,r){const x=[1,Math.log(r.wage)];return{cost:Math.exp(x[0]*t.bc[0]+x[1]*t.bc[1]),rent:Math.exp(x[0]*t.br[0]+x[1]*t.br[1])};}};
const M2={train(S){const X=S.map((r)=>[1,Math.log(r.bigMac/B_NYC),Math.log(r.wage/W_NYC)]);return{bc:solveHuberRidge(X,S.map((r)=>Math.log(r.gtCost/P_NYC))),br:solveHuberRidge(X,S.map((r)=>Math.log(r.gtRent/R_NYC)))};},predict(t,r){const x=[1,Math.log(r.bigMac/B_NYC),Math.log(r.wage/W_NYC)];return{cost:P_NYC*Math.exp(x.reduce((s,v,i)=>s+v*t.bc[i],0)),rent:R_NYC*Math.exp(x.reduce((s,v,i)=>s+v*t.br[i],0))};}};
const M3={train(S){const X=S.map(feat3);return{bc:solveHuberRidge(X,S.map((r)=>Math.log(r.gtCost)),0.8),br:solveHuberRidge(X,S.map((r)=>Math.log(r.gtRent)),0.8)};},predict(t,r){const x=feat3(r);return{cost:Math.exp(x.reduce((s,v,i)=>s+v*t.bc[i],0)),rent:Math.exp(x.reduce((s,v,i)=>s+v*t.br[i],0))};}};
const M4={train(S){const rS=S.filter((r)=>r.rpp);const aC=rS.length>=3?Math.exp(mean(rS.map((r)=>Math.log(r.gtCost/r.rpp)))):30;const aR=rS.length>=3?Math.exp(mean(rS.map((r)=>Math.log(r.gtRent/r.rpp)))):15;const pS=S.filter((r)=>r.pli&&!r.rpp);let pC=[Math.log(30),1],pR=[Math.log(15),1];if(pS.length>=5){const X=pS.map((r)=>[1,Math.log(r.pli)]);pC=solveHuberRidge(X,pS.map((r)=>Math.log(r.gtCost)));pR=solveHuberRidge(X,pS.map((r)=>Math.log(r.gtRent)));}return{aC,aR,pC,pR,bsT:M2.train(S)};},predict(t,r){if(r.rpp)return{cost:t.aC*r.rpp,rent:t.aR*r.rpp};if(r.pli)return{cost:Math.exp(t.pC[0]+t.pC[1]*Math.log(r.pli)),rent:Math.exp(t.pR[0]+t.pR[1]*Math.log(r.pli))};return M2.predict(t.bsT,r);}};
const M5={train(S){const a=S.filter((r)=>r.airbnbUSD);const fb=M3.train(S);if(a.length<10)return{fallback:fb};const X=a.map((r)=>[1,Math.log(r.airbnbUSD),Math.log(r.wage)]);return{bc:solveHuberRidge(X,a.map((r)=>Math.log(r.gtCost))),br:solveHuberRidge(X,a.map((r)=>Math.log(r.gtRent))),fallback:fb};},predict(t,r){if(r.airbnbUSD&&t.bc){const x=[1,Math.log(r.airbnbUSD),Math.log(r.wage)];return{cost:Math.exp(x.reduce((s,v,i)=>s+v*t.bc[i],0)),rent:Math.exp(x.reduce((s,v,i)=>s+v*t.br[i],0))};}return M3.predict(t.fallback,r);}};
const M6={train(S){const F=S.map(knnFeat);const mu=F[0].map((_,d)=>mean(F.map((f)=>f[d])));const sd=F[0].map((_,d)=>std(F.map((f)=>f[d]))||1);const Fz=F.map((f)=>f.map((v,d)=>(v-mu[d])/sd[d]));return{mu,sd,Fz,samples:S,k:7};},predict(t,r){const f=knnFeat(r).map((v,d)=>(v-t.mu[d])/t.sd[d]);const ds=t.samples.map((s,i)=>{const dd=Math.sqrt(f.reduce((a,v,d)=>a+(v-t.Fz[i][d])**2,0));return{d:s.country===r.country?dd*0.5:dd,s};}).sort((a,b)=>a.d-b.d).slice(0,t.k);let W=0,cN=0,rN=0;for(const{d,s}of ds){const w=1/(d*d+0.05);W+=w;cN+=w*Math.log(s.gtCost);rN+=w*Math.log(s.gtRent);}return{cost:Math.exp(cN/W),rent:Math.exp(rN/W)};}};
const M7={train(S){const byC=new Map();for(const r of S){if(!byC.has(r.country))byC.set(r.country,[]);byC.get(r.country).push(r);}const cr=[];for(const[country,arr]of byC){const any=arr[0];cr.push({country,bigMac:any.bigMac,gni:any.gni,gdp:any.gdp,hdi:any.hdi,gtCost:Math.exp(mean(arr.map((r)=>Math.log(r.gtCost)))),gtRent:Math.exp(mean(arr.map((r)=>Math.log(r.gtRent))))});}const Xc=cr.map((r)=>[1,Math.log(r.bigMac),Math.log(r.gni),Math.log(r.gdp),r.hdi]);const bc0=solveHuberRidge(Xc,cr.map((r)=>Math.log(r.gtCost)),0.5);const br0=solveHuberRidge(Xc,cr.map((r)=>Math.log(r.gtRent)),0.5);const residC=[],residR=[],residX=[];for(const r of S){const xc=[1,Math.log(r.bigMac),Math.log(r.gni),Math.log(r.gdp),r.hdi];residC.push(Math.log(r.gtCost)-xc.reduce((s,v,i)=>s+v*bc0[i],0));residR.push(Math.log(r.gtRent)-xc.reduce((s,v,i)=>s+v*br0[i],0));residX.push([1,Math.log(r.wage/r.gni),Math.log(r.flights+10),r.airbnbUSD?Math.log(r.airbnbUSD):0,r.airbnbUSD?1:0]);}return{bc0,br0,bc1:solveHuberRidge(residX,residC,0.5),br1:solveHuberRidge(residX,residR,0.5)};},predict(t,r){const xc=[1,Math.log(r.bigMac),Math.log(r.gni),Math.log(r.gdp),r.hdi];const xr=[1,Math.log(r.wage/r.gni),Math.log(r.flights+10),r.airbnbUSD?Math.log(r.airbnbUSD):0,r.airbnbUSD?1:0];return{cost:Math.exp(xc.reduce((s,v,i)=>s+v*t.bc0[i],0)+xr.reduce((s,v,i)=>s+v*t.bc1[i],0)),rent:Math.exp(xc.reduce((s,v,i)=>s+v*t.br0[i],0)+xr.reduce((s,v,i)=>s+v*t.br1[i],0))};}};
const M8={train(S){const X=S.map(feat8);return{bc:solveHuberRidge(X,S.map((r)=>Math.log(r.gtCost)),1.0),br:solveHuberRidge(X,S.map((r)=>Math.log(r.gtRent)),1.0)};},predict(t,r){const x=feat8(r);return{cost:Math.exp(x.reduce((s,v,i)=>s+v*t.bc[i],0)),rent:Math.exp(x.reduce((s,v,i)=>s+v*t.br[i],0))};}};
const M9={train(S){const X=S.map(feat9);return{bc:solveHuberRidge(X,S.map((r)=>Math.log(r.gtCost)),0.8),br:solveHuberRidge(X,S.map((r)=>Math.log(r.gtRent)),0.8)};},predict(t,r){const x=feat9(r);return{cost:Math.exp(x.reduce((s,v,i)=>s+v*t.bc[i],0)),rent:Math.exp(x.reduce((s,v,i)=>s+v*t.br[i],0))};}};
const M10={train(S){const X=S.map(feat10);return{bc:solveHuberRidge(X,S.map((r)=>Math.log(r.gtCost)),0.5),br:solveHuberRidge(X,S.map((r)=>Math.log(r.gtRent)),0.5)};},predict(t,r){const x=feat10(r);return{cost:Math.exp(x.reduce((s,v,i)=>s+v*t.bc[i],0)),rent:Math.exp(x.reduce((s,v,i)=>s+v*t.br[i],0))};}};
const BASE=[M1,M2,M3,M4,M5,M6,M7,M8,M9,M10];

const ape=(p,g)=>Math.abs(p-g)/g;
const clip=(w)=>{const v=w.map((x)=>Math.max(0,x));const s=v.reduce((a,b)=>a+b,0);return s>0?v.map((x)=>x/s):Array(w.length).fill(1/w.length);};

function runLOCO(trainPool,evalPool,label){
  const countries=[...new Set(evalPool.map((r)=>r.country))];
  const oof=new Map();
  for(const cc of countries){
    const tr=trainPool.filter((r)=>r.country!==cc);
    const te=evalPool.filter((r)=>r.country===cc);
    const thetas=BASE.map((m)=>m.train(tr));
    for(const r of te){const preds=BASE.map((m,i)=>m.predict(thetas[i],r));oof.set(r.id,{c:preds.map((p)=>p.cost),r:preds.map((p)=>p.rent),rec:r});}
  }
  const ids=[...oof.keys()];
  const Xc=ids.map((id)=>oof.get(id).c.map(Math.log));
  const Xr=ids.map((id)=>oof.get(id).r.map(Math.log));
  const yc=ids.map((id)=>Math.log(oof.get(id).rec.gtCost));
  const yr=ids.map((id)=>Math.log(oof.get(id).rec.gtRent));
  const wc=clip(solveRidge(Xc,yc,0.3));
  const wr=clip(solveRidge(Xr,yr,0.3));
  const errsC=[],errsR=[];
  for(const id of ids){const o=oof.get(id);const sc=Math.exp(o.c.map(Math.log).reduce((s,v,j)=>s+wc[j]*v,0));const sr=Math.exp(o.r.map(Math.log).reduce((s,v,j)=>s+wr[j]*v,0));errsC.push(ape(sc,o.rec.gtCost));errsR.push(ape(sr,o.rec.gtRent));}
  console.log(`${label.padEnd(60)} n=${ids.length}  costMdAPE=${(median(errsC)*100).toFixed(2)}%  P90=${(quantile(errsC,0.9)*100).toFixed(2)}%  rentMdAPE=${(median(errsR)*100).toFixed(2)}%  P90=${(quantile(errsR,0.9)*100).toFixed(2)}%`);
  return{wc,wr,errsC,errsR};
}

console.log('\n=== F 实验：按独立 GT 可信度判据剔除（非残差作弊） ===\n');

const visible = recs.filter((r) => r.visible);
const trusted = recs.filter((r) => r.visible && !untrustworthyGT(r));

console.log(`Baseline references:`);
runLOCO(recs, recs, 'A. 全量 141 训+评（当前基线）');
runLOCO(recs, visible, 'B. 全量 141 训 + 可见 110 评');
runLOCO(visible, visible, 'C. 可见 110 训 + 可见 110 评');

console.log('\nF 实验结果:');
runLOCO(recs, trusted, `F1. 全量 141 训 + 可信可见 ${trusted.length} 评`);
runLOCO(visible, trusted, `F2. 可见 110 训 + 可信可见 ${trusted.length} 评`);
runLOCO(trusted, trusted, `F3. 可信可见 ${trusted.length} 训 + 可信可见 ${trusted.length} 评`);

console.log(`\n可信可见 ${trusted.length} / 110 城市 = 生产覆盖率 ${(trusted.length/110*100).toFixed(1)}%`);
console.log(`被剔除的可见城市 (${flagged.length}):  ${flagged.map((r)=>r.name).join('、')}`);

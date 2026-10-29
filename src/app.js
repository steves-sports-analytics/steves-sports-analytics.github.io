(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = (v, d = 1) => v == null || isNaN(v) ? "—" : Number(v).toFixed(d);
const sgn = (v, d = 1) => (v > 0 ? "+" : "") + fmt(v, d);
const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
};
const NS = "http://www.w3.org/2000/svg";
const el = (t, a = {}) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };

/* ================= DATA ================= */
const TEAMS = TEAM_ROWS.trim().split("\n").map(r => {
  const a = r.split("|"); const n = i => +a[i];
  return { rank:n(0), id:n(1), team:a[2], abbr:a[3], color:/^[0-9a-f]{6}$/i.test(a[4]) ? "#"+a[4] : "#556",
    g:n(5), w:n(6), l:n(7), adjO:n(8), adjD:n(9), adjEM:n(10), adjT:n(11), rawO:n(12), rawD:n(13),
    pyth:n(14), sos:n(15), rankO:n(16), rankD:n(17), rankT:n(18) };
});
const CB = (typeof CBB_META !== "undefined" && CBB_META) || {avg:108.57, avgT:68.88, label:"2025–26", backtest:{games:5752, acc:.752, mae:8.42, post_games:105, post_acc:.705}};
const AVG = CB.avg, AVGT = CB.avgT, NT = TEAMS.length;
const fmtDate = d => d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric"}) : "";
(() => { const bt = CB.backtest || {}; const set = (s, v) => document.querySelectorAll(s).forEach(e => e.textContent = v);
  const g = document.getElementById("tGames"); if (g) g.dataset.count = bt.games || 0;
  const t = document.getElementById("tTeams"); if (t) t.dataset.count = NT;
  const a = document.getElementById("tAcc"); if (a) a.dataset.count = ((bt.acc || 0) * 100).toFixed(1);
  set("#pAcc", ((bt.acc || 0) * 100).toFixed(1) + "%"); set("#pMae", (bt.mae || 0).toFixed(1));
  if (bt.post_games) set("#pPost", ((bt.post_acc || 0) * 100).toFixed(1) + "%"); else { set("#pPost", NT); set("#pPostT", "teams rated so far"); }
  set("#cGames", (bt.games || 0).toLocaleString()); set("#cAcc", ((bt.acc || 0) * 100).toFixed(1) + "%");
  set("#sTeams", NT); set("#sGames", (bt.games || 0).toLocaleString()); set("#sAcc", ((bt.acc || 0) * 100).toFixed(1) + "%");
  set(".cbb-season", CB.label || "2025–26"); set(".cbb-updated", CB.final ? "Final ratings · new season starts Nov 2" : "Updated " + fmtDate(CB.updated));
})();
const byRank = new Map(TEAMS.map(t => [t.rank, t]));
const P = DRAFT_ROWS.trim().split("\n").map(r => {
  const a = r.split("|"); const n = i => a[i] === "NaN" ? NaN : +a[i];
  return { pick:n(0), player:a[1], pos:a[2], school:a[3], team_rank:n(4), g:n(5), mpg:n(6), ppg:n(7), rpg:n(8), apg:n(9),
    pts40:n(10), reb40:n(11), ast40:n(12), stocks40:n(13), tov40:n(14), ts:n(15), tp:n(16), ft:n(17), sos:n(18), usg:n(19),
    z:{pts40:n(20), ts:n(21), reb40:n(22), ast40:n(23), stocks40:n(24), tov40:n(25), sos:n(26), usg_min:n(27)}, crank:n(28),
    grp:a[29] || "", age:n(30), blend:n(31), score0:n(32), mrank0:n(33), zage:n(34) };
});
const INTL = [
  {pick:21,player:"Karim Lopez",school:"Mexico (NZ Breakers)"},{pick:25,player:"Sergio De Larrea",school:"Spain (Valencia)"},
  {pick:39,player:"Jack Kayil",school:"Germany"},{pick:56,player:"Vsevolod Ishchenko",school:"Russia"},
  {pick:57,player:"Narcisse Ngoy",school:"France"},{pick:60,player:"Malique Lewis",school:"Spain"}];

/* ================= LOGOS ================= */
// ESPN CDN logos, keyed by the ESPN team IDs that come with the hoopR data
const NBA_TEAMS = {atl:"Hawks",bos:"Celtics",bkn:"Nets",cha:"Hornets",chi:"Bulls",cle:"Cavaliers",dal:"Mavericks",den:"Nuggets",det:"Pistons",
  gs:"Warriors",hou:"Rockets",lac:"Clippers",lal:"Lakers",mem:"Grizzlies",mia:"Heat",mil:"Bucks",min:"Timberwolves",no:"Pelicans",ny:"Knicks",
  okc:"Thunder",phi:"76ers",sac:"Kings",sa:"Spurs",tor:"Raptors",utah:"Jazz",wsh:"Wizards"};
// team each pick landed with after draft-night trades; T = acquired in a trade
const NBA_PICK = {1:"wsh",2:"utah",3:"mem",4:"chi",5:"lac",6:"bkn",7:"sac",8:"atl",9:"dal",10:"mil",11:"gs",12:"okc",13:"mil T",14:"cha",15:"chi",
  16:"okc T",17:"det T",18:"cha",19:"tor",20:"sa",22:"phi",23:"atl",24:"lal T",26:"sa T",27:"bos",28:"bkn T",29:"sac T",30:"dal",31:"hou T",32:"mem",
  33:"min T",34:"cle T",35:"den T",36:"lac",37:"okc",38:"chi",40:"bos",41:"mia",42:"sa",43:"bkn",44:"sa",45:"sac",46:"wsh T",47:"ny T",48:"dal",
  49:"den",50:"tor",51:"wsh",52:"atl T",53:"ny T",54:"gs",55:"hou T",58:"no",59:"min"};
const logoUrl = (lg, id, s = 80) => window.logoSrc(lg, id, s);   // embedded logo pack (src/logos.js), CDN only as a fallback
const logo = (lg, id, cls = "lg", s = 80) => `<img class="${cls}" src="${logoUrl(lg, id, s)}" data-lg="${lg}" data-id="${id}" alt="" loading="lazy" decoding="async" onerror="__lgFail(this)">`;
P.forEach(p => { const t = byRank.get(p.team_rank); p.tid = t ? t.id : null; const n = (NBA_PICK[p.pick] || "").split(" "); p.nba = n[0]; p.viaTrade = n[1] === "T"; p.nbaName = NBA_TEAMS[p.nba] || ""; });
// CURRENT team wins over draft night (added Oct 22, 2026): team in his latest NBA game > ESPN roster (data/nba_teams.json) > draft-night pick
const NBA_NOW = (typeof NBA_CUR !== "undefined" && NBA_CUR) || {};
Object.assign(NBA_TEAMS, NBA_NOW.teams || {});
const lastGameTeam = {}; ((typeof ROOKIES !== "undefined" && ROOKIES.rows) || []).forEach(r => { if (r.team) lastGameTeam[r.pick] = String(r.team).toLowerCase(); });
P.forEach(p => { p.draftNba = p.nba; const cur = lastGameTeam[p.pick] || (NBA_NOW.picks || {})[p.pick];
  if (cur && cur !== p.nba){ p.nba = cur; p.movedFrom = p.draftNba; p.viaTrade = true; }
  p.nbaName = NBA_TEAMS[p.nba] || p.nba.toUpperCase(); p.draftName = NBA_TEAMS[p.draftNba] || ""; });
window.__nbaTeams = P.filter(p => p.nba).map(p => ({pick: p.pick, shown: p.nba, game: lastGameTeam[p.pick] || null, roster: (NBA_NOW.picks || {})[p.pick] || null}));
window.__nbaRosterDate = NBA_NOW.fetched || null;
const nbaLogo = (p, cls = "lg") => p.nba ? logo("nba", p.nba, cls) : "";
const ncaaLogo = (id, cls = "lg") => id ? logo("ncaa", id, cls) : "";

let toastT;
function toast(msg){ const t = $("#toast"); if (!t) return; t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2400); }

/* ================= NAV ================= */
const secObs = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting){ $$("#nav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id)); }
}), {rootMargin:"-40% 0px -55% 0px"});
$$("main .entry[id], #fav, #about").forEach(s => secObs.observe(s));

/* ================= CBB SCATTER ================= */
let selectedTeam = null, zoomTop = false;
function niceTicks(a, b, step){ const out = []; for (let v = Math.ceil(a/step)*step; v <= b + 1e-9; v += step) out.push(v); return out; }
function drawScatter(){
  const box = $("#scatter"); const tip = $("#tip1");
  box.querySelector("svg")?.remove();
  const W = 640, H = 460, m = {l:46, r:14, t:14, b:42};
  const [x0, x1, y0, y1] = zoomTop ? [114, 137, 86, 101] : [85, 140, 84, 130];
  const inView = t => t.adjO >= x0 && t.adjO <= x1 && t.adjD >= y0 && t.adjD <= y1;
  const X = v => m.l + (v - x0)/(x1 - x0)*(W - m.l - m.r);
  const Y = v => m.t + (v - y0)/(y1 - y0)*(H - m.t - m.b); // lower D (better) at top
  const svg = el("svg", {viewBox:`0 0 ${W} ${H}`, role:"img", "aria-label":`Scatter plot of adjusted offense versus adjusted defense for ${NT} teams`});
  const g = el("g", {class:"grid"});
  const stp = zoomTop ? 5 : 10;
  niceTicks(x0, x1, stp).forEach(v => { g.appendChild(el("line",{x1:X(v),x2:X(v),y1:m.t,y2:H-m.b})); const t = el("text",{x:X(v),y:H-m.b+16,"text-anchor":"middle",class:"ax"}); t.textContent=v; svg.appendChild(t); });
  niceTicks(y0, y1, stp).forEach(v => { g.appendChild(el("line",{x1:m.l,x2:W-m.r,y1:Y(v),y2:Y(v)})); const t = el("text",{x:m.l-8,y:Y(v)+3,"text-anchor":"end",class:"ax"}); t.textContent=v; svg.appendChild(t); });
  svg.prepend(g);
  // average crosshair
  if (!zoomTop){
  svg.appendChild(el("line",{x1:X(AVG),x2:X(AVG),y1:m.t,y2:H-m.b,stroke:"var(--line2)","stroke-dasharray":"4 4"}));
  svg.appendChild(el("line",{x1:m.l,x2:W-m.r,y1:Y(AVG),y2:Y(AVG),stroke:"var(--line2)","stroke-dasharray":"4 4"}));
  const q = el("text",{x:W-m.r-6,y:Y(AVG)-8,"text-anchor":"end",class:"axt",fill:"var(--hi)"}); q.textContent="Elite both ways"; q.setAttribute("style","fill:var(--hi)"); svg.appendChild(q); }
  const tx = el("text",{x:(m.l+W-m.r)/2,y:H-4,"text-anchor":"middle",class:"axt"}); tx.textContent="Adjusted offense (pts / 100 poss) →"; svg.appendChild(tx);
  const ty = el("text",{x:-(m.t+H-m.b)/2,y:12,"text-anchor":"middle",class:"axt",transform:"rotate(-90)"}); ty.textContent="← Adjusted defense (lower is better)"; svg.appendChild(ty);
  const order = [...TEAMS].sort((a,b) => (a.rank <= 25) - (b.rank <= 25) || b.rank - a.rank);
  order.forEach(t => {
    if (!inView(t)) return;
    const top = t.rank <= 25, sel = selectedTeam === t.id;
    const c = el("circle",{cx:X(t.adjO),cy:Y(t.adjD),r:sel?8:(top?5.5:3.5),fill:sel?"#fff":(top?t.color:"#cfc7b6"),
      stroke:sel?"var(--hi)":(top?"#fff":"none"),"stroke-width":sel?3:(top?1.2:0),opacity:top||sel?1:.75});
    c.style.transition = "r .2s";
    const hit = el("circle",{cx:X(t.adjO),cy:Y(t.adjD),r:9,fill:"transparent",style:"cursor:pointer"});
    const show = () => {
      tip.innerHTML = `<span class="tiph">${ncaaLogo(t.id,"lg lg-md")}<span><b>${esc(t.team)}</b> · No. ${t.rank}</span></span>${t.w}-${t.l} · AdjEM ${sgn(t.adjEM)}<br>O ${fmt(t.adjO)} (#${t.rankO}) · D ${fmt(t.adjD)} (#${t.rankD})`;
      tip.style.borderLeftColor = t.color;
      const r = box.getBoundingClientRect(), s = svg.getBoundingClientRect(), k = s.width / W;
      let lx = X(t.adjO)*k + 14, ly = Y(t.adjD)*k - 10;
      tip.classList.add("on");
      if (lx + tip.offsetWidth > r.width) lx = X(t.adjO)*k - tip.offsetWidth - 14;
      tip.style.left = lx + "px"; tip.style.top = Math.max(0, ly) + "px";
      if (!top && !sel) c.setAttribute("r", 7);
    };
    hit.addEventListener("mouseenter", show);
    hit.addEventListener("mouseleave", () => { tip.classList.remove("on"); c.setAttribute("r", sel?17:(top?(zoomTop?16:12.5):3.5)); });
    hit.addEventListener("click", () => selectTeam(t.id, true));
    svg.append(c);
    if (top || sel){
      const s = sel ? 30 : (zoomTop ? 28 : 22);
      c.setAttribute("r", sel ? 17 : (zoomTop ? 16 : 12.5)); c.setAttribute("fill", "#fff"); c.setAttribute("stroke", sel ? "var(--ink)" : t.color); c.setAttribute("stroke-width", sel ? 3 : 2); c.setAttribute("opacity", 1);
      const im = el("image", {x:X(t.adjO)-s/2, y:Y(t.adjD)-s/2, width:s, height:s, href:logoUrl("ncaa", t.id, 60), "pointer-events":"none"});
      svg.appendChild(im); hit.setAttribute("r", sel ? 17 : (zoomTop ? 16 : 13));
    }
    svg.appendChild(hit);
    if (sel || t.rank === 1){
      const lb = el("text",{x:X(t.adjO)-16,y:Y(t.adjD)-16,"text-anchor":"end",style:"font:700 12px var(--f-cond);letter-spacing:.06em;fill:var(--ink);text-transform:uppercase;paint-order:stroke;stroke:var(--paper);stroke-width:4px"});
      lb.textContent = t.team + (t.rank === 1 ? " (No. 1)" : ""); svg.appendChild(lb);
    }
  });
  box.prepend(svg);
}
$("#zoomBtn").onclick = () => { zoomTop = !zoomTop; $("#zoomBtn").textContent = zoomTop ? `Show all ${NT}` : "Zoom to Top 25"; $("#zoomBtn").setAttribute("aria-pressed", zoomTop); drawScatter(); };
function selectTeam(id, scroll){
  selectedTeam = selectedTeam === id ? null : id;
  if (selectedTeam){
    const t = TEAMS.find(x => x.id === id);
    if (t.rank > 25 && !cbbAll){ cbbAll = true; $("#cbbAll").textContent = "Top 25 only"; }
    $("#cbbQ").value = "";
    toast(`${t.team}: No. ${t.rank} of ${NT}`);
  }
  drawScatter(); renderCBB();
  if (selectedTeam && scroll){
    const row = $("#cbbT tr.sel");
    if (row){ const w = $("#cbbWrap"); w.scrollTo({top: row.offsetTop - 80, behavior:"smooth"}); }
  }
}

/* ================= CBB TABLE ================= */
let cbbAll = false, cbbSort = {k:"rank", dir:1};
const CBB_COLS = [
  {k:"rank",h:"Rk"},{k:"team",h:"Team",l:true},{k:"w",h:"W-L"},{k:"adjEM",h:"AdjEM"},{k:"adjO",h:"AdjO"},{k:"adjD",h:"AdjD"},
  {k:"adjT",h:"Tempo"},{k:"sos",h:"SOS"},{k:"pyth",h:"Pyth"}];
function renderCBB(){
  const q = $("#cbbQ").value.trim().toLowerCase();
  let rows = TEAMS.filter(t => !q || t.team.toLowerCase().includes(q) || t.abbr.toLowerCase().includes(q));
  if (!q && !cbbAll) rows = rows.filter(t => t.rank <= 25);
  const k = cbbSort.k;
  rows = [...rows].sort((a,b) => (typeof a[k] === "string" ? a[k].localeCompare(b[k]) : a[k]-b[k]) * cbbSort.dir);
  $("#cbbCount").textContent = q ? `${rows.length} match${rows.length===1?"":"es"}` : (cbbAll ? `All ${NT} teams` : `Top 25 of ${NT}`);
  const head = "<thead><tr>" + CBB_COLS.map(c => `<th class="${c.l?"l":""}" data-k="${c.k}" ${cbbSort.k===c.k?`aria-sort="${cbbSort.dir>0?"ascending":"descending"}"`:""}>${c.h}${cbbSort.k===c.k?(cbbSort.dir>0?" ↑":" ↓"):""}</th>`).join("") + "</tr></thead>";
  const body = rows.map(t => `<tr class="${selectedTeam===t.id?"sel":""}" data-id="${t.id}">
    <td class="rk">${t.rank}</td><td class="l"><span class="tn"><i class="sw" style="background:${t.color}"></i>${ncaaLogo(t.id)}${esc(t.team)}</span></td>
    <td>${t.w}-${t.l}</td><td class="${t.adjEM>=0?"pos":"neg"}"><b>${sgn(t.adjEM)}</b></td>
    <td>${fmt(t.adjO)}<small class="r">${t.rankO}</small></td><td>${fmt(t.adjD)}<small class="r">${t.rankD}</small></td>
    <td>${fmt(t.adjT)}</td><td>${sgn(t.sos)}</td><td>${fmt(t.pyth,3).replace(/^0/,"")}</td></tr>`).join("");
  $("#cbbT").innerHTML = head + "<tbody>" + (body || `<tr><td colspan="9" class="l" style="color:var(--ink3)">No team matches that search.</td></tr>`) + "</tbody>";
  $$("#cbbT th").forEach(th => th.onclick = () => { const k = th.dataset.k; cbbSort = {k, dir: cbbSort.k === k ? -cbbSort.dir : (k==="team"||k==="rank"||k==="adjD" ? 1 : -1)}; renderCBB(); });
  $$("#cbbT tbody tr[data-id]").forEach(tr => tr.onclick = () => selectTeam(+tr.dataset.id, false));
}
$("#cbbQ").addEventListener("input", renderCBB);
$("#cbbAll").onclick = () => { cbbAll = !cbbAll; $("#cbbAll").textContent = cbbAll ? "Top 25 only" : `Show all ${NT}`; renderCBB(); };

/* ================= MATCHUP MACHINE ================= */
const alpha = [...TEAMS].sort((a,b) => a.team.localeCompare(b.team));
const opts = alpha.map(t => `<option value="${t.id}">${esc(t.team)} (No. ${t.rank})</option>`).join("");
$("#mmA").innerHTML = opts; $("#mmB").innerHTML = opts;
$("#mmA").value = 130; $("#mmB").value = 41;
let venue = 0;
$$("#venue button").forEach(b => b.onclick = () => { venue = +b.dataset.v; $$("#venue button").forEach(x => x.setAttribute("aria-pressed", x === b)); matchup(); });
$("#mmA").onchange = matchup; $("#mmB").onchange = matchup;
function phi(z){ // normal CDF
  const t = 1/(1+0.2316419*Math.abs(z)), d = 0.3989423*Math.exp(-z*z/2);
  const p = d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));
  return z > 0 ? 1-p : p;
}
function readable(hex){ const n = parseInt(hex.slice(1),16), r=n>>16, g=n>>8&255, b=n&255; return (0.299*r+0.587*g+0.114*b) > 170 ? "#000" : "#fff"; }
function matchup(){
  const A = TEAMS.find(t => t.id === +$("#mmA").value), B = TEAMS.find(t => t.id === +$("#mmB").value);
  const poss = A.adjT * B.adjT / AVGT;
  let oa = A.adjO * B.adjD / AVG, ob = B.adjO * A.adjD / AVG;
  if (venue === 1){ oa *= 1.014; ob *= 0.986; } else if (venue === -1){ oa *= 0.986; ob *= 1.014; }
  const pa = oa*poss/100, pb = ob*poss/100, margin = pa - pb, wa = A.id === B.id ? .5 : phi(margin/11);
  const side = (t, s, r) => `<div class="tm ${r?"r":""}" style="background:${t.color};color:${readable(t.color)}">${ncaaLogo(t.id,"lg lg-sb")}<span class="ab">${esc(t.abbr)}</span><span class="nm">${esc(t.team)} · ${t.w}-${t.l}</span><span class="sc">${Math.round(s)}</span></div>`;
  $("#sb").innerHTML = side(A, pa) + `<div class="mid"><b>Proj.</b>${venue===0?"Neutral":venue===1?"@ "+esc(A.abbr):"@ "+esc(B.abbr)}<span>${Math.round(poss)} poss</span></div>` + side(B, pb, true);
  $("#wp").innerHTML = `<div style="width:${wa*100}%;background:${A.color}"></div><div style="width:${(1-wa)*100}%;background:${B.color}"></div>`;
  const fav = margin >= 0 ? A : B;
  $("#wpl").innerHTML = `<span>${esc(A.abbr)} ${Math.round(wa*100)}%</span><span>${A.id===B.id?"Mirror match":esc(fav.team)+" by "+fmt(Math.abs(margin))}</span><span>${esc(B.abbr)} ${Math.round((1-wa)*100)}%</span>`;
}

/* ================= DRAFT ================= */
/* Model v2 is computed offline (draft_model/draft_model.py): position groups, prior-season blend, age. No sliders. */
let draftSort = {k:"mrank", dir:1};
const FULL = p => !(p.blend > 0) && p.g >= 15;   // full college season: only these can be called steals or reaches
function compute(){
  P.forEach(p => { p.score = p.score0; p.mrank = p.mrank0; p.mrankDefault = p.mrank0; p.d = p.crank - p.mrank; });
}
const D_COLS = [{k:"mrank",h:"Rk"},{k:"player",h:"Player",l:true},{k:"pick",h:"Pick"},{k:"nba",h:"Team",l:true},{k:"d",h:"Δ"},{k:"score",h:"Score",l:true},
  {k:"grp",h:"Group",l:true},{k:"age",h:"Age"},{k:"ppg",h:"PPG"},{k:"rpg",h:"RPG"},{k:"apg",h:"APG"},{k:"ts",h:"TS%"},{k:"stocks40",h:"Stl+Blk/40"},{k:"sos",h:"Team EM"}];
function renderDraft(){
  const rows = [...P].sort((a,b) => { const k = draftSort.k, av = a[k], bv = b[k]; return (typeof av === "string" ? av.localeCompare(bv) : av - bv) * draftSort.dir; });
  const head = "<thead><tr>" + D_COLS.map(c => `<th class="${c.l?"l":""}" data-k="${c.k}" ${draftSort.k===c.k?`aria-sort="${draftSort.dir>0?"ascending":"descending"}"`:""}>${c.h}${draftSort.k===c.k?(draftSort.dir>0?" ↑":" ↓"):""}</th>`).join("") + "</tr></thead>";
  const body = rows.map(p => `<tr><td class="rk">${p.mrank}</td><td class="l"><span class="tn">${ncaaLogo(p.tid,"lg lg-md")}<span class="pl">${esc(p.player)}<small>${esc(p.school)}${p.blend > 0 ? ` · ${p.g} games (injured), prior season blended in` : ""}</small></span></span></td>
    <td>${p.pick}</td><td class="l"><span class="tn" title="${esc(p.nbaName)}${p.movedFrom?` (drafted by the ${esc(p.draftName)}, traded)`:p.viaTrade?" (acquired in a draft-night trade)":""}">${nbaLogo(p)}<span>${p.nba.toUpperCase()}${p.viaTrade?'<sup class="tr">T</sup>':""}</span></span></td><td class="${p.d>0?"pos":p.d<0?"neg":""}">${p.d>0?"+":""}${p.d}</td>
    <td class="l"><span class="scorebar"><i style="width:${Math.max(2,p.score*.7)}px"></i>${fmt(p.score)}</span></td>
    <td class="l">${p.grp}</td><td>${fmt(p.age)}</td><td>${fmt(p.ppg)}</td><td>${fmt(p.rpg)}</td><td>${fmt(p.apg)}</td><td>${fmt(p.ts*100)}%</td><td>${fmt(p.stocks40)}</td><td>${sgn(p.sos)}</td></tr>`).join("");
  $("#draftT").innerHTML = head + "<tbody>" + body + "</tbody>";
  $$("#draftT th").forEach(th => th.onclick = () => { const k = th.dataset.k; draftSort = {k, dir: draftSort.k === k ? -draftSort.dir : (["mrank","player","pick","nba"].includes(k) ? 1 : -1)}; renderDraft(); });
}
// Steals/reaches shared by "What I found" and the chart labels.
// Gap is a ratio (log) of college pick order to model rank, so going 19th when the model says 2nd outweighs 51st vs. 24th.
// Steals: the two strongest cases picked after the top 10 with the model's top-15 grade, plus the best late-round value (pick 40+).
// Reaches: model has him 30th or lower. Full college seasons only.
function draftCalls(){
  const gapR = p => Math.log(p.crank / p.mrankDefault);
  const top = [...P].filter(p => FULL(p) && p.mrankDefault <= 15 && p.pick > 10).map(p => ({p, gap: gapR(p)})).filter(x => x.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 2);
  const late = [...P].filter(p => FULL(p) && p.pick >= 40 && !top.some(x => x.p === p)).map(p => ({p, gap: p.crank - p.mrankDefault})).sort((a, b) => b.gap - a.gap)[0];
  const steals = late ? [...top, late] : top;
  const reaches = [...P].filter(p => FULL(p) && p.mrankDefault >= 30).map(p => ({p, gap: gapR(p)})).filter(x => x.gap < 0).sort((a, b) => a.gap - b.gap).slice(0, 3);
  return {steals, reaches};
}
function drawVs(){
  const box = $("#vs"); if (!box || !P[0].mrank) return; const tip = $("#tip2");
  box.querySelector("svg")?.remove();
  const W = 640, H = 420, m = {l:44, r:14, t:14, b:40};
  const NN = P.length, X = v => m.l + (v-1)/(NN-1)*(W-m.l-m.r), Y = v => m.t + (v-1)/(NN-1)*(H-m.t-m.b);
  const svg = el("svg",{viewBox:`0 0 ${W} ${H}`,role:"img","aria-label":"Actual draft pick versus model rank"});
  const g = el("g",{class:"grid"});
  [1,10,20,30,40,NN].forEach(v => { g.appendChild(el("line",{x1:X(v),x2:X(v),y1:m.t,y2:H-m.b})); const t = el("text",{x:X(v),y:H-m.b+16,"text-anchor":"middle",class:"ax"}); t.textContent=v; svg.appendChild(t); });
  [1,10,20,30,40,NN].forEach(v => { g.appendChild(el("line",{x1:m.l,x2:W-m.r,y1:Y(v),y2:Y(v)})); const t = el("text",{x:m.l-8,y:Y(v)+3,"text-anchor":"end",class:"ax"}); t.textContent=v; svg.appendChild(t); });
  svg.appendChild(g);
  svg.appendChild(el("line",{x1:X(1),y1:Y(1),x2:X(NN),y2:Y(NN),stroke:"var(--ink3)","stroke-dasharray":"5 5"}));
  const tx = el("text",{x:(m.l+W-m.r)/2,y:H-4,"text-anchor":"middle",class:"axt"}); tx.textContent="Draft order among college players →"; svg.appendChild(tx);
  const ty = el("text",{x:-(m.t+H-m.b)/2,y:12,"text-anchor":"middle",class:"axt",transform:"rotate(-90)"}); ty.textContent="← Model rank"; svg.appendChild(ty);
  const calls = draftCalls(), ext = [...calls.steals, ...calls.reaches].map(x => x.p.player);
  P.forEach(p => {
    // damped ratio: near the top, 1st vs. 3rd is not a real disagreement; called steals/reaches always show their color
    const lr = Math.log((p.crank + 5) / (p.mrank + 5)), isS = calls.steals.some(x => x.p === p), isR = calls.reaches.some(x => x.p === p);
    const col = isS || (!isR && lr > 0.3) ? "var(--good)" : isR || lr < -0.3 ? "var(--bad)" : "#b9b2a4";
    const c = el("circle",{cx:X(p.crank),cy:Y(p.mrank),r:6,fill:col,opacity:.9,stroke:"#fff","stroke-width":1});
    c.style.transition = "cx .5s, cy .5s";
    const hit = el("circle",{cx:X(p.crank),cy:Y(p.mrank),r:10,fill:"transparent",style:"cursor:pointer"});
    hit.addEventListener("mouseenter", () => {
      tip.innerHTML = `<span class="tiph">${ncaaLogo(p.tid,"lg lg-md")}<b>${esc(p.player)}</b>${nbaLogo(p,"lg lg-md")}</span>${esc(p.school)} → ${esc(p.nbaName)}${p.movedFrom ? ` (drafted by ${esc(p.draftName)})` : ""} · Pick ${p.pick} (${ordn(p.crank)} college player taken)<br>Model rank ${p.mrank} · ${esc(p.grp)} · Score ${fmt(p.score)}`;
      const s = svg.getBoundingClientRect(), k = s.width / W, r = box.getBoundingClientRect();
      tip.classList.add("on"); let lx = X(p.crank)*k + 14; if (lx + tip.offsetWidth > r.width) lx = X(p.crank)*k - tip.offsetWidth - 14;
      tip.style.left = lx + "px"; tip.style.top = Math.max(0, Y(p.mrank)*k - 10) + "px"; c.setAttribute("r", 9);
    });
    hit.addEventListener("mouseleave", () => { tip.classList.remove("on"); c.setAttribute("r", 6); });
    svg.append(c, hit);
  });
  // labels for the biggest disagreements, nudged apart so they never overlap
  const labs = P.filter(p => ext.includes(p.player)).map(p => ({p, y:Y(p.mrank)+4})).sort((a,b) => a.y - b.y);
  for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i-1].y < 15 && Math.abs(X(labs[i].p.crank) - X(labs[i-1].p.crank)) < 160) labs[i].y = labs[i-1].y + 15;
  labs.forEach(({p, y}) => {
    const left = p.crank > 36;
    const lb = el("text",{x:X(p.crank)+(left?-12:12),y,"text-anchor":left?"end":"start",style:"font:700 12px var(--f-cond);letter-spacing:.05em;fill:var(--ink);paint-order:stroke;stroke:var(--paper);stroke-width:4px"});
    lb.textContent = p.player; svg.appendChild(lb);
  });
  box.prepend(svg);
}
function renderMovers(){
  if (!$("#movers")) return;
  const up = [...P].sort((a,b) => b.d - a.d).slice(0,3), dn = [...P].sort((a,b) => a.d - b.d).slice(0,3);
  const li = (p, good) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid var(--line)">
    <span class="tn" style="gap:10px"><span class="pair">${ncaaLogo(p.tid,"lg lg-lg")}<span class="arw">→</span>${nbaLogo(p,"lg lg-lg")}</span><span><b style="font-family:var(--f-cond);font-size:16px;letter-spacing:.04em;text-transform:uppercase">${esc(p.player)}</b><br><small style="color:var(--ink3)">${esc(p.school)} → ${esc(p.nbaName)} · went ${ord(p.pick)}, model No. ${p.mrank}</small></span></span>
    <span class="mono ${good?"pos":"neg"}" style="font-size:18px;align-self:center">${p.d>0?"+":""}${p.d}</span></div>`;
  $("#movers").innerHTML = `<div class="kick" style="color:var(--good)">Model says steal</div>${up.map(p => li(p,true)).join("")}
    <div class="kick" style="color:var(--bad);margin-top:16px">Model says reach</div>${dn.map(p => li(p,false)).join("")}`;
}
function ord(n){ const s = ["th","st","nd","rd"], v = n % 100; return n + (s[(v-20)%10] || s[v] || s[0]); }
function refreshDraft(){ compute(); renderDraft(); drawVs(); renderMovers(); }
$("#intl").textContent = INTL.map(p => `${p.player} (No. ${p.pick}, ${p.school})`).join(", ") + " played outside the NCAA, so there is no comparable box score data for them.";

/* ---------- player faces: headshot with team-logo badge; falls back to the logo alone ---------- */
const FC = (typeof FACES !== "undefined" && FACES) || {};
window.faceBox = (url, logoHtml, size = "sm") => url ? `<span class="pf pf-${size}"><img class="pf-hs" src="${url}" alt="" loading="lazy" onerror="this.parentNode.classList.add('nf')">${logoHtml}</span>` : logoHtml;
window.faceUrl = (lg, key) => { const id = FC[lg] && FC[lg][key]; if (!id) return null;
  return lg === "nhl" ? `https://assets.nhle.com/mugs/nhl/latest/${id}.png` : `https://a.espncdn.com/combiner/i?img=/i/headshots/${lg}/players/full/${id}.png&w=120&h=88`; };
const nbaFace = (pick, logoHtml, size) => faceBox(faceUrl("nba", pick), logoHtml, size);

/* ---------- history: 2-week hero hold, previous heroes, sparklines ---------- */
const HS = (typeof HIST !== "undefined" && HIST) || {heroes: [], nhl: {}};
// Weeks run Monday-Sunday: extra refreshes inside the same week never count as "another week" for the hold rule.
const weekOf = d => { const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); return t.toISOString().slice(0, 10); };
const heroLog = (sport, dataDate) => (HS.heroes || []).filter(r => r.sport === sport && (!dataDate || r.date < dataDate)).sort((a, b) => a.date < b.date ? -1 : 1);
// A new hero only takes over after leading two weekly refreshes in a row; otherwise last week's hero holds (if he still qualifies).
window.holdHero = (sport, cand, nameOf, findEligible, dataDate) => {
  if (!cand) return cand; const log = heroLog(sport, dataDate), last = log[log.length - 1], n = nameOf(cand);
  if (!last || last.hero === n) return cand;
  // the challenger takes over only if he was also the data's leader in a previous week (two weeks in a row)
  const prevWk = log.filter(r => weekOf(r.date) < weekOf(dataDate)), lw = prevWk[prevWk.length - 1];
  if (lw && lw.candidate === n) return cand;
  return findEligible(last.hero) || cand; };
window.prevHeroes = (sport, current, dataDate) => { const seen = new Set([current]), out = [];
  for (const r of heroLog(sport, dataDate).reverse()) { if (seen.has(r.hero)) continue; seen.add(r.hero); out.push(`${esc(r.hero)} <span>(${new Date(r.date + "T12:00:00").toLocaleDateString("en-US", {month: "short", day: "numeric"})})</span>`); if (out.length === 3) break; }
  const first = (HS.heroes || []).filter(r => r.sport === sport).map(r => r.date).sort()[0];
  return `<p class="h-prev">${out.length ? `Previous heroes: ${out.join(" · ")}` : `Hero log started ${first ? new Date(first + "T12:00:00").toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"}) : "this week"}. A new hero has to lead two weeks in a row to take over.`}</p>`; };
window.spark = (vals, label, fmtv) => { const v = vals.filter(x => x != null); if (v.length < 2) return "";
  const w = 84, h = 22, lo = Math.min(...v), hi = Math.max(...v), sp = hi - lo || 1;
  const pts = v.map((x, i) => `${(i * (w - 4) / (v.length - 1) + 2).toFixed(1)},${(h - 3 - (x - lo) / sp * (h - 6)).toFixed(1)}`);
  return `<span class="spk"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts.join(" ")}" fill="none" stroke="var(--p)" stroke-width="1.6"/><circle cx="${pts[pts.length - 1].split(",")[0]}" cy="${pts[pts.length - 1].split(",")[1]}" r="2.4" fill="var(--p)"/></svg><small>${label}: ${fmtv(v[0])} → ${fmtv(v[v.length - 1])}</small></span>`; };

/* ================= TALKING POINTS: CBB + DRAFT ================= */
const heroCard = (logoHtml, name, sub, stats, why) => `<div class="h-top">${logoHtml}<div><div class="h-name">${esc(name)}</div><div class="h-sub">${sub}</div></div></div>
  <div class="h-stats">${stats.map(([n, t]) => `<div><div class="n">${n}</div><div class="t">${t}</div></div>`).join("")}</div><p class="h-why">${why}</p>`;
const ordn = n => { const s = ["th","st","nd","rd"], v = n % 100; return n + (s[(v-20)%10] || s[v] || s[0]); };
function cbbVerdict(){
  const box = $("#vCBB"); if (!box) return;
  const T = TEAMS.map(t => ({...t, wp: t.w / Math.max(1, t.w + t.l)}));
  T.forEach(t => t.luck = t.wp - t.pyth);
  [...T].sort((a, b) => b.wp - a.wp || b.adjEM - a.adjEM).forEach((t, i) => t.recRank = i + 1);
  [...T].sort((a, b) => b.sos - a.sos).forEach((t, i) => t.sosRank = i + 1);
  // Well-known programs only (power conferences + Gonzaga, Memphis, San Diego State), so the names mean something to fans
  const BIG = new Set([150,153,97,258,2390,152,228,2567,259,52,24,154,25,183,87,221,59,103, 130,356,2509,127,158,2294,275,194,26,84,264,77,135,30,2483,164,120,213, 12,248,66,2641,252,2305,239,2628,2132,277,2116,9,197,38,2306,254, 57,333,238,2633,8,96,61,251,2,201,245,142,99,145,344,2579, 41,2599,222,2550,2507,2086,156,46,269,2752,305, 2250,235,21]);
  const known = T.filter(t => BIG.has(+t.id));
  const hyped = known.filter(t => t.recRank <= 75).sort((a, b) => (b.rank - b.recRank) - (a.rank - a.recRank)).slice(0, 3);
  const under = known.filter(t => t.rank <= 75).sort((a, b) => a.luck - b.luck).slice(0, 3);
  const h = hyped[0], u = under[0];
  const rec = t => `${t.w}-${t.l}`, xtra = t => Math.abs(t.luck * (t.w + t.l)).toFixed(1);
  const li = t => `<div class="cp">${ncaaLogo(t.id, "lg lg-md")}<span>${esc(t.team)}<small>${rec(t)} record · No.&nbsp;${t.rank} by efficiency<br>${ordn(t.sosRank)}-toughest schedule</small></span></div>`;
  $(".v-body", box).innerHTML = `<p>Records lie, a little. Soft schedules and close wins can make a team look better than it plays. Among the big-name programs, <b>${esc(h.team)}</b> went ${rec(h)} (No. ${h.recRank} by record) but played like the No. ${h.rank} team in the country. That's the team to be careful with when everyone's hyping them.</p>
    <p>The flip side: <b>${esc(u.team)}</b> (${rec(u)}) rates No. ${u.rank}. Close losses and a tough schedule made them look worse than they are.</p>
    <div class="v-list"><div><small style="color:var(--bad)">Record flatters them</small>${hyped.map(li).join("")}</div><div><small style="color:var(--good)">Better than their record</small>${under.map(li).join("")}</div></div>`;
  $(".v-upd", box).textContent = CB.final ? `${CB.label} final · new season starts Nov 2` : `Updated ${fmtDate(CB.updated)}`;
  const cand = known.filter(t => t.recRank - t.rank >= 25).sort((a, b) => a.rank - b.rank);
  const hero = holdHero("cbb", cand[0] || u, t => t.team, n => cand.find(t => t.team === n), CB.updated);
  box.dataset.candidate = (cand[0] || u).team; box.dataset.hero = hero.team;
  box.dataset.summary = `${h.team} (${rec(h)}) has the record most likely to fool you. ${hero.team} (${rec(hero)}) is better than its record: No. ${hero.rank} by efficiency.`;
  box.dataset.date = CB.final ? "" : CB.updated;
  $(".h-body", box).innerHTML = heroCard(ncaaLogo(hero.id, "lg"), hero.team, `${rec(hero)} · ${CB.label}`,
    [[`#${hero.rank}`, "Efficiency rank"], [`#${hero.recRank}`, "Record rank"], [`${hero.adjEM > 0 ? "+" : ""}${hero.adjEM.toFixed(1)}`, "AdjEM"], [`#${hero.sosRank}`, "Schedule strength"], [`#${hero.rankO}`, "Offense rank"], [`#${hero.rankD}`, "Defense rank"]],
    `The ratings say No. ${hero.rank}; the standings say No. ${hero.recRank}. Offense ranks ${ordn(hero.rankO)} and defense ${ordn(hero.rankD)} after adjusting for opponents. The kind of team that wins a game nobody saw coming.`);
  $(".h-body", box).insertAdjacentHTML("beforeend", prevHeroes("cbb", hero.team, CB.updated));
}
const RK = (typeof ROOKIES !== "undefined" && ROOKIES) || {status:"pre", rows:[]};
function spearman(a, b){ const n = a.length; if (n < 3) return NaN; const d2 = a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0); return 1 - 6 * d2 / (n * (n * n - 1)); }
function rankArr(vals, asc){ const idx = vals.map((v, i) => [v, i]).sort((x, y) => asc ? x[0] - y[0] : y[0] - x[0]); const r = Array(vals.length); idx.forEach(([, i], k) => r[i] = k + 1); return r; }
function draftVerdict(){
  const box = $("#vDraft"), rk = $("#rkBody"); if (!box) return;
  const byPick = new Map(P.map(p => [p.pick, p]));
  const rows = (RK.rows || []).filter(r => byPick.has(r.pick)).map(r => ({...r, p: byPick.get(r.pick)}));
  const live = RK.status !== "pre" && rows.length > 0;
  const tip = fmtDate(RK.tipoff || "2026-10-20");
  // The model-vs-scouts scoreboard needs a real sample. Until MINQ draftees have 3+ games, the card keeps the draft-board view
  // (steals/reaches + the model's late-round bet), so the card is never empty in the first week or two of the season.
  const MINQ = 5;
  const q = rows.filter(r => r.gp >= 3);
  const scoreboard = live && q.length >= MINQ;
  document.querySelectorAll(".rk-updated").forEach(e => e.textContent = live ? `Rookie Report updated ${fmtDate(RK.updated)}` : `Rookie Report starts ${tip}`);
  if (live) box.dataset.date = RK.updated;

  // ---- talking point ----
  let rM = NaN, rD = NaN;
  if (!scoreboard){
    const {steals, reaches} = draftCalls();
    const li = ({p}) => `<div class="cp">${nbaFace(p.pick, nbaLogo(p, "lg lg-md"))}<span>${esc(p.player)}<small>${p.grp} · went ${ordn(p.pick)} · model No. ${p.mrankDefault}</small></span></div>`;
    const top5 = P.filter(p => p.pick <= 5), agree = top5.filter(p => p.mrankDefault <= 10).length;
    const when = live
      ? `The season is under way, and the scoreboard starts once ${MINQ} draftees have played 3+ games (${q.length} so far). Until then, here's where the two disagree most (full college seasons only).`
      : `The scoreboard starts <b>${tip}</b>; until then, here's where the two disagree most (full college seasons only).`;
    $(".v-body", box).innerHTML = `<p>At the top, mostly yes. Comparing each player to his own position group (guards, wings, bigs) and giving credit for doing it young, the model has <b>${agree} of the first 5 picks</b> in its own top 10, including <b>AJ Dybantsa</b> and <b>Darryn Peterson</b>. The real disagreements are in the middle and late rounds. ${when}</p>
      <div class="v-list"><div><small style="color:var(--good)">Model says steal</small>${steals.map(li).join("")}</div><div><small style="color:var(--bad)">Model says reach</small>${reaches.map(li).join("")}</div></div>`;
  } else {
    const prod = rankArr(q.map(r => r.gmsc), false), draftR = rankArr(q.map(r => r.pick), true), modelR = rankArr(q.map(r => r.p.mrankDefault), true);
    rM = spearman(modelR, prod); rD = spearman(draftR, prod);
    const top = [...q].sort((a, b) => b.gmsc - a.gmsc).slice(0, 3);
    const li = r => `<div class="cp">${nbaFace(r.pick, logo("nba", r.team.toLowerCase(), "lg lg-md"))}<span>${esc(r.name)}<small>pick ${r.pick} · ${fmt(r.ppg)} ppg · ${fmt(r.gmsc)} GmSc</small></span></div>`;
    const winner = isNaN(rM) ? "" : rM > rD ? `<b>So far, the model is beating the scouts.</b> Its ranking lines up with rookie production better than draft order does (rank correlation ${rM.toFixed(2)} vs. ${rD.toFixed(2)}).` : `<b>So far, the scouts are winning.</b> Draft order lines up with rookie production better than the model does (rank correlation ${rD.toFixed(2)} vs. ${rM.toFixed(2)}).`;
    $(".v-body", box).innerHTML = `<p>${winner} It's early, and rookies' minutes swing a lot, so this will move week to week.</p><p>Production is measured with Game Score, a one-number box score summary, among rookies with 3+ games.</p><div class="v-list"><div><small style="color:var(--good)">Top rookie producers</small>${top.map(li).join("")}</div><div><small style="color:var(--ink3)">Sample</small><div class="cp"><span>${q.length} of 54 college draftees have played 3+ games</span></div></div></div>`;
  }

  // ---- unsung hero: a late pick out-producing his slot once the scoreboard is on; otherwise the model's biggest late-round bet ----
  const hrEl = scoreboard ? [...q].filter(r => r.pick >= 20).sort((a, b) => b.gmsc - a.gmsc) : [];
  if (hrEl.length){
    const hr = holdHero("nba", hrEl[0], r => r.name, n => hrEl.find(r => r.name === n), RK.updated);
    box.dataset.candidate = hrEl[0].name; box.dataset.hero = hr.name;
    $(".h-body", box).innerHTML = heroCard(nbaFace(hr.pick, logo("nba", hr.team.toLowerCase(), "lg"), "lg"), hr.name, `Pick ${hr.pick} · ${esc(hr.p.school)} · model No. ${hr.p.mrankDefault}`,
      [[fmt(hr.ppg), "PPG"], [fmt(hr.mpg), "MPG"], [fmt(hr.gmsc), "Game Score"], [hr.p36 == null ? "—" : fmt(hr.p36), "Points per 36"], [hr.ts == null ? "—" : fmt(hr.ts * 100) + "%", "True shooting"], [`#${hr.p.mrankDefault}`, "Model rank"]],
      `Taken ${ordn(hr.pick)}, he's out-producing most of the players picked ahead of him. Late picks rarely get minutes this early; this one earned them.`);
    $(".h-body", box).insertAdjacentHTML("beforeend", prevHeroes("nba", hr.name, RK.updated));
    box.dataset.summary = (isNaN(rM) ? "Rookie Report is live." : rM > rD ? "So far the model is beating the scouts at predicting rookie production." : "So far the scouts are beating the model at predicting rookie production.") + ` Late-pick standout: ${hr.name}.`;
  } else {
    const hpEl = [...P].filter(p => p.pick >= 30 && FULL(p)).sort((a, b) => a.mrankDefault - b.mrankDefault);
    const hp = holdHero("nba", hpEl[0], p => p.player, n => hpEl.find(p => p.player === n), RK.updated);
    box.dataset.candidate = hpEl[0].player; box.dataset.hero = hp.player;
    const mine = rows.find(r => r.pick === hp.pick);
    const watch = live ? (mine ? `So far: ${mine.gp} ${mine.gp === 1 ? "game" : "games"}, ${fmt(mine.mpg)} minutes and ${fmt(mine.ppg)} points a game.` : "He hasn't logged NBA minutes yet.") : "Watch his minutes once the season starts.";
    $(".h-body", box).innerHTML = heroCard(nbaFace(hp.pick, nbaLogo(hp, "lg"), "lg"), hp.player, `Pick ${hp.pick} · ${esc(hp.school)} → ${esc(hp.nbaName)}`,
      [[`#${hp.mrankDefault}`, "Model rank"], [hp.grp, "Position group"], [fmt(hp.age), "Age at draft"], [fmt(hp.ppg), "College PPG"], [fmt(hp.rpg), "College RPG"], [fmt(hp.apg), "College APG"]],
      `NBA teams let him slide to ${ordn(hp.pick)}. The model, which compares him to other ${hp.grp.toLowerCase()}s and factors in age, had him ${ordn(hp.mrankDefault)} of 54. ${watch}`);
    $(".h-body", box).insertAdjacentHTML("beforeend", prevHeroes("nba", hp.player, RK.updated));
    box.dataset.summary = scoreboard
      ? (isNaN(rM) ? "Rookie Report is live." : rM > rD ? "So far the model is beating the scouts at predicting rookie production." : "So far the scouts are beating the model at predicting rookie production.") + ` The model's biggest late-round bet: ${hp.player}.`
      : live ? `Rookie Report is live; the model-vs-scouts scoreboard starts once ${MINQ} draftees have 3+ games. The model's biggest late-round bet: ${hp.player}, picked ${ordn(hp.pick)} but ranked ${ordn(hp.mrankDefault)}.`
      : `Rookie Report starts ${tip}. The model's biggest late-round bet: ${hp.player}, picked ${ordn(hp.pick)} but ranked ${ordn(hp.mrankDefault)}.`;
  }
  $(".v-upd", box).textContent = live ? `Updated ${fmtDate(RK.updated)}` : "Rookie data begins after opening night";

  // ---- Rookie Report panel ----
  if (!live){
    const days = Math.max(0, Math.ceil((Date.parse((RK.tipoff || "2026-10-20") + "T23:00:00Z") - Date.now()) / 864e5));
    rk.innerHTML = `<div class="rk-pre"><div class="cd">${days ? days + (days === 1 ? " day" : " days") : "Tip-off!"}</div><p>The NBA season tips off <b>${tip}</b>. Every week after that, this tracks how all 54 college draftees are actually playing, so we can finally grade the model against the scouts.</p></div>`;
    return;
  }
  rk.innerHTML = `<div class="tw" style="max-height:460px"><table class="rk-tbl"><thead><tr><th>Rk</th><th class="l">Rookie</th><th>Pick</th><th>Model</th><th>GP</th><th>MPG</th><th>PPG</th><th>P/36</th><th>RPG</th><th>APG</th><th>TS%</th><th>GmSc</th></tr></thead><tbody>${[...rows].sort((a, b) => (b.gp >= 3) - (a.gp >= 3) || b.gmsc - a.gmsc).map((r, i) => `<tr><td class="rk">${i + 1}</td><td class="l"><span class="tn">${ncaaLogo(r.p.tid, "lg")}<span class="arw" style="color:var(--ink3)">→</span>${logo("nba", r.team.toLowerCase(), "lg")}<span class="pl">${esc(r.name)}</span></span></td><td>${r.pick}</td><td>${r.p.mrankDefault}</td><td>${r.gp}</td><td>${fmt(r.mpg)}</td><td>${fmt(r.ppg)}</td><td>${r.p36 == null ? "—" : fmt(r.p36)}</td><td>${fmt(r.rpg)}</td><td>${fmt(r.apg)}</td><td>${r.ts == null || isNaN(r.ts) ? "—" : fmt(r.ts * 100) + "%"}</td><td><b>${fmt(r.gmsc)}</b></td></tr>`).join("")}</tbody></table></div>`;
  $("#rkSub").textContent = `${rows.length} rookies have played · sorted by Game Score per game${scoreboard ? "" : ` · scoreboard starts at ${MINQ} draftees with 3+ games`}`;
}

/* ---------- model backtest text ---------- */
(() => { const el = document.getElementById("dmBacktest"); const B = (typeof DRAFT_BT !== "undefined" && DRAFT_BT) || null; if (!el || !B) return;
  const c = B.classes || {}, a = B.all || {};
  el.innerHTML = `<b>Does it work? I tested it on the last two drafts.</b> Ranking ${a.n} drafted college players from 2024 and 2025 against how they've actually played in the NBA (total Game Score), the new model's rank correlation is <b>${a.model_v2}</b>, up from <b>${a.model_v1}</b> for the first version (basically no signal). NBA draft order still does better at <b>${a.draft_order}</b>, since scouts see things box scores can't: workouts, medicals, fit. By class: 2024 ${c["2024"]?.model_v2} vs. draft ${c["2024"]?.draft_order}; 2025 ${c["2025"]?.model_v2} vs. draft ${c["2025"]?.draft_order}. So treat the model as a second opinion, not a replacement for scouting.`; })();
/* ================= INIT ================= */
renderCBB(); drawScatter(); matchup();
compute();
refreshDraft();
try { cbbVerdict(); } catch(e) { console.error(e); }
try { draftVerdict(); } catch(e) { console.error(e); }
let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { drawScatter(); drawVs(); }, 150); });
})();

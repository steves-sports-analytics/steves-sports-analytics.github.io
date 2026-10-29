(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const f = (v, d = 1) => v == null || isNaN(v) ? "—" : Number(v).toFixed(d);
const sg = (v, d = 1) => (v > 0 ? "+" : "") + f(v, d);
const NS = "http://www.w3.org/2000/svg";
const el = (t, a = {}) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
const lg = (league, id) => window.logoSrc(league, id, 60);   // embedded logo pack (src/logos.js)

/* ---------- ESPN logo codes ---------- */
const NFL_ESPN = {WAS:"wsh"};
const NHL_ESPN = {LAK:"la", NJD:"nj", SJS:"sj", TBL:"tb", UTA:"utah"};
const NFL_NAMES = {ARI:"Cardinals",ATL:"Falcons",BAL:"Ravens",BUF:"Bills",CAR:"Panthers",CHI:"Bears",CIN:"Bengals",CLE:"Browns",DAL:"Cowboys",DEN:"Broncos",DET:"Lions",GB:"Packers",HOU:"Texans",IND:"Colts",JAX:"Jaguars",KC:"Chiefs",LAC:"Chargers",LAR:"Rams",LV:"Raiders",MIA:"Dolphins",MIN:"Vikings",NE:"Patriots",NO:"Saints",NYG:"Giants",NYJ:"Jets",PHI:"Eagles",PIT:"Steelers",SEA:"Seahawks",SF:"49ers",TB:"Buccaneers",TEN:"Titans",WAS:"Commanders"};
const NHL_NAMES = {ANA:"Ducks",BOS:"Bruins",BUF:"Sabres",CAR:"Hurricanes",CBJ:"Blue Jackets",CGY:"Flames",CHI:"Blackhawks",COL:"Avalanche",DAL:"Stars",DET:"Red Wings",EDM:"Oilers",FLA:"Panthers",LAK:"Kings",MIN:"Wild",MTL:"Canadiens",NJD:"Devils",NSH:"Predators",NYI:"Islanders",NYR:"Rangers",OTT:"Senators",PHI:"Flyers",PIT:"Penguins",SEA:"Kraken",SJS:"Sharks",STL:"Blues",TBL:"Lightning",TOR:"Maple Leafs",UTA:"Mammoth",VAN:"Canucks",VGK:"Golden Knights",WPG:"Jets",WSH:"Capitals"};

/* ---------- data ---------- */
const NFL = {}, NHL = {};
for (const [yr, rows] of Object.entries(QUAD.nfl)) NFL[yr] = rows.map(r => ({name:r[0], team:r[1], pos:r[2], tgt:r[3], rec:r[4], yds:r[5], td:r[6], sep:r[7], cush:r[8], adot:r[9], catch:r[10], yac:r[11], xyac:r[12], yacoe:r[13], airshare:r[14], tshare:r[15], epat:r[16]}));
for (const [yr, rows] of Object.entries(QUAD.nhl)) NHL[yr] = rows.map(r => { const o = {name:r[0], team:r[1], gp:r[2], toi:r[3], toigp:r[4], xgf:r[5], xga:r[6], gf:r[7], ga:r[8], offf:r[9], offa:r[10], hdf:r[11], hda:r[12], pts:r[13], g:r[14], hits:r[15], blk:r[16], tk:r[17], gv:r[18]};
  o.xgf60 = o.xgf / o.toi * 60; o.xga60 = o.xga / o.toi * 60; o.pct = 100 * o.xgf / (o.xgf + o.xga); o.rel = o.pct - 100 * o.offf / (o.offf + o.offa); return o; });

const META = QUAD.meta || {nflWeeks: 0, nhlMaxGP: 0};
const NFLTR = QUAD.nflTrend || {}, NA = v => v == null || v !== v;
const nflSpark = (r, st) => { if (st.season !== "2026") return ""; const t = NFLTR[r.name] || [];
  return t.length >= 2 ? `<span class="spk-row">${spark(t.map(x => x[1]), "Separation by week", v => v.toFixed(2))}${spark(t.map(x => x[2]), "YAC over exp. by week", v => (v > 0 ? "+" : "") + v.toFixed(2))}</span>` : ""; };
const nhlSpark = (r, st) => { if (st.season !== "2026-27") return ""; const t = ((typeof HIST !== "undefined" && HIST.nhl) || {})[r.name] || [];
  return t.length >= 2 ? `<span class="spk-row">${spark(t.map(x => x[1]), "xG share by week", v => v.toFixed(1) + "%")}</span>` : `<span class="spk-row"><small style="color:var(--ink3)">Weekly trend starts with next week's update</small></span>`; };
$$('#nflQuad button[data-v="2026"]').forEach(b => b.textContent = `2026 · Wk 1–${META.nflWeeks}`);
document.querySelectorAll(".q-updated").forEach(e => e.textContent = META.updated ? `Updated ${new Date(META.updated + "T12:00:00").toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"})}` : "");
/* ---------- generic quadrant chart ---------- */
function niceStep(span){ const raw = span / 6, p = Math.pow(10, Math.floor(Math.log10(raw))); return [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw); }
function makeQuad(cfg){
  const root = $(cfg.root), box = $(".qchart", root), tip = $(".tip", root), st = {...cfg.state};
  // controls
  $$(".seg-ctl", root).forEach(g => $$("button", g).forEach(b => b.onclick = () => { st[g.dataset.k] = b.dataset.v; $$("button", g).forEach(x => x.setAttribute("aria-pressed", x === b)); if (cfg.onSeason && (g.dataset.k === "season" || g.dataset.k === "pos")) cfg.onSeason(st, root); draw(); }));
  $$(".seg-ctl", root).forEach(g => $$("button", g).forEach(b => b.setAttribute("aria-pressed", String(st[g.dataset.k]) === b.dataset.v)));
  const minI = $("input[data-k=min]", root); minI.oninput = () => { st.min = +minI.value; $("[data-out=min]", root).textContent = cfg.minText ? cfg.minText(st) : st.min; draw(); };
  const sel = $("select[data-k=team]", root); sel.innerHTML += Object.entries(cfg.teamNames).sort((a,b) => a[1].localeCompare(b[1])).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join(""); sel.onchange = () => { st.team = sel.value; draw(); };
  const q = $("input[data-k=q]", root); q.oninput = () => { st.q = q.value.trim().toLowerCase(); draw(); };
  function draw(){
    const rows = cfg.rows(st);
    box.querySelector("svg")?.remove();
    const W = 760, H = 560, m = {l:56, r:20, t:20, b:48};
    const xs = rows.map(cfg.x), ys = rows.map(cfg.y);
    if (!rows.length){ $("[data-out=note]", root).textContent = "No players meet that filter. Lower the minimum."; $(".corners", root).innerHTML = ""; return; }
    const px = (Math.max(...xs) - Math.min(...xs)) * .08 || 1, py = (Math.max(...ys) - Math.min(...ys)) * .08 || 1;
    let x0 = Math.min(...xs) - px, x1 = Math.max(...xs) + px, y0 = Math.min(...ys) - py, y1 = Math.max(...ys) + py;
    if (cfg.square){ const lo = Math.min(x0, y0), hi = Math.max(x1, y1); x0 = y0 = lo; x1 = y1 = hi; }
    const X = v => m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r);
    const Y = v => cfg.invertY ? m.t + (v - y0) / (y1 - y0) * (H - m.t - m.b) : H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
    const svg = el("svg", {viewBox:`0 0 ${W} ${H}`, role:"img", "aria-label":cfg.aria});
    const defs = el("defs"); const cp = el("clipPath", {id: cfg.id + "-clip"}); cp.appendChild(el("rect", {x:m.l, y:m.t, width:W - m.l - m.r, height:H - m.t - m.b})); defs.appendChild(cp); svg.appendChild(defs);
    const g = el("g", {class:"grid"});
    const sx = niceStep(x1 - x0), sy = niceStep(y1 - y0);
    for (let v = Math.ceil(x0 / sx) * sx; v <= x1; v += sx){ g.appendChild(el("line", {x1:X(v), x2:X(v), y1:m.t, y2:H - m.b})); const t = el("text", {x:X(v), y:H - m.b + 16, "text-anchor":"middle", class:"ax"}); t.textContent = +v.toFixed(2); svg.appendChild(t); }
    for (let v = Math.ceil(y0 / sy) * sy; v <= y1; v += sy){ g.appendChild(el("line", {x1:m.l, x2:W - m.r, y1:Y(v), y2:Y(v)})); const t = el("text", {x:m.l - 8, y:Y(v) + 3, "text-anchor":"end", class:"ax"}); t.textContent = +v.toFixed(2); svg.appendChild(t); }
    svg.prepend(g);
    // averages
    const ax = cfg.avgX(rows), ay = cfg.avgY(rows);
    svg.appendChild(el("line", {x1:X(ax), x2:X(ax), y1:m.t, y2:H - m.b, stroke:"var(--ink3)", "stroke-dasharray":"4 4", opacity:.7}));
    svg.appendChild(el("line", {x1:m.l, x2:W - m.r, y1:Y(ay), y2:Y(ay), stroke:"var(--ink3)", "stroke-dasharray":"4 4", opacity:.7}));
    if (cfg.diag){ const a = Math.max(x0, y0), b = Math.min(x1, y1); const dl = el("line", {x1:X(a), y1:Y(a), x2:X(b), y2:Y(b), stroke:"var(--ink3)", "stroke-width":1, opacity:.6, "clip-path":`url(#${cfg.id}-clip)`}); svg.appendChild(dl);
      const lx = a + (b - a) * 0.86, ang = Math.atan2(Y(b) - Y(a), X(b) - X(a)) * 180 / Math.PI;
      const dt = el("text", {x:X(lx), y:Y(lx) - 6, "text-anchor":"middle", class:"axt", style:"fill:var(--ink3)", transform:`rotate(${ang} ${X(lx)} ${Y(lx)})`}); dt.textContent = cfg.diag; svg.appendChild(dt); }
    // axis titles
    const tx = el("text", {x:(m.l + W - m.r) / 2, y:H - 6, "text-anchor":"middle", class:"axt"}); tx.textContent = cfg.xLabel; svg.appendChild(tx);
    const ty = el("text", {x:-(m.t + H - m.b) / 2, y:14, "text-anchor":"middle", class:"axt", transform:"rotate(-90)"}); ty.textContent = cfg.yLabel; svg.appendChild(ty);
    // corner pills
    const pill = (txt, x, y, anchor, good) => { const w = txt.length * 7.4 + 18, gx = anchor === "end" ? x - w : x; const gg = el("g"); gg.appendChild(el("rect", {x:gx, y:y - 14, width:w, height:22, rx:4, fill:"var(--paper)", stroke: good === 1 ? "var(--good)" : good === -1 ? "var(--bad)" : "var(--line2)", "stroke-width":1.25})); const t = el("text", {x:gx + w / 2, y:y + 1, "text-anchor":"middle", style:`font:700 11px var(--f-ui);letter-spacing:.08em;text-transform:uppercase;fill:${good === 1 ? "var(--good)" : good === -1 ? "var(--bad)" : "var(--ink2)"}`}); t.textContent = txt; gg.appendChild(t); svg.appendChild(gg); };
    pill(cfg.corners.tl, m.l + 8, m.t + 18, "start", 0); pill(cfg.corners.tr, W - m.r - 8, m.t + 18, "end", 1);
    pill(cfg.corners.bl, m.l + 8, H - m.b - 10, "start", -1); pill(cfg.corners.br, W - m.r - 8, H - m.b - 10, "end", 0);
    // z-scores (up/right = good)
    const sd = a => { const mu = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - mu) ** 2, 0) / a.length) || 1; };
    const sdx = sd(xs), sdy = sd(ys), dir = cfg.invertY ? -1 : 1;
    rows.forEach(r => { r._zx = (cfg.x(r) - ax) / sdx; r._zy = dir * (cfg.y(r) - ay) / sdy; });
    const hit = r => (st.team && r.team === st.team) || (st.q && r.name.toLowerCase().includes(st.q));
    const focus = st.team || st.q;
    const ordered = [...rows].sort((a, b) => hit(a) - hit(b));
    const dotG = el("g", {"clip-path":`url(#${cfg.id}-clip)`}); svg.appendChild(dotG);
    ordered.forEach(r => {
      const on = hit(r), dim = focus && !on, cx = X(cfg.x(r)), cy = Y(cfg.y(r)), s = on ? 26 : 20;
      const gg = el("g", {opacity: dim ? .18 : 1, style:"cursor:pointer"});
      gg.appendChild(el("circle", {cx, cy, r:s / 2 + 1, fill:"#fff", stroke: on ? "var(--ink)" : "var(--line2)", "stroke-width": on ? 2 : 1}));
      const im = el("image", {x:cx - s / 2 + 2, y:cy - s / 2 + 2, width:s - 4, height:s - 4, href:cfg.logo(r)}); gg.appendChild(im);
      gg.addEventListener("mouseenter", () => {
        tip.innerHTML = cfg.tip(r, st); tip.classList.add("on");
        const bb = svg.getBoundingClientRect(), k = bb.width / W, rb = box.getBoundingClientRect();
        let lx = cx * k + 16; if (lx + tip.offsetWidth > rb.width) lx = cx * k - tip.offsetWidth - 16;
        tip.style.left = Math.max(0, lx) + "px"; tip.style.top = Math.max(0, Math.min(cy * k - 20, rb.height - tip.offsetHeight)) + "px";
      });
      gg.addEventListener("mouseleave", () => tip.classList.remove("on"));
      dotG.appendChild(gg);
    });
    // labels: highlighted players, else the most extreme; skip overlaps
    const placed = [];
    const cand = focus ? rows.filter(hit) : [...rows].sort((a, b) => Math.hypot(b._zx, b._zy) - Math.hypot(a._zx, a._zy)).slice(0, cfg.labels || 14);
    cand.slice(0, 40).forEach(r => {
      const cx = X(cfg.x(r)), cy = Y(cfg.y(r)), txt = cfg.short(r), w = txt.length * 6.6;
      let lx = cx + 14, anchor = "start"; if (lx + w > W - m.r) { lx = cx - 14; anchor = "end"; }
      const bx = anchor === "start" ? lx : lx - w, by = cy - 6;
      if (placed.some(p => bx < p.x + p.w && bx + w > p.x && by < p.y + 13 && by + 13 > p.y)) return;
      placed.push({x:bx, y:by, w});
      const t = el("text", {x:lx, y:cy + 4, "text-anchor":anchor, style:"font:600 12px var(--f-ui);fill:var(--ink);paint-order:stroke;stroke:var(--paper);stroke-width:4px;pointer-events:none"}); t.textContent = txt; svg.appendChild(t);
    });
    box.prepend(svg);
    $("[data-out=note]", root).textContent = cfg.note(st, rows, ax, ay);
    // corner lists
    const C = [["tr", (r) => r._zx + r._zy, r => r._zx > 0 && r._zy > 0, 1], ["tl", r => -r._zx + r._zy, r => r._zx <= 0 && r._zy > 0, 0], ["br", r => r._zx - r._zy, r => r._zx > 0 && r._zy <= 0, 0], ["bl", r => -r._zx - r._zy, r => r._zx <= 0 && r._zy <= 0, -1]];
    $(".corners", root).innerHTML = C.map(([k, score, inQ, good]) => { const list = rows.filter(inQ).sort((a, b) => score(b) - score(a)).slice(0, 3);
      return `<div class="corner ${good === 1 ? "good" : good === -1 ? "bad" : ""}"><b>${esc(cfg.corners[k])}</b><small>${esc(cfg.cornerHelp[k])}</small>${list.map(r => `<div class="cp">${faceBox(faceUrl(cfg.lgk, r.name), `<img class="lg lg-md" src="${cfg.logo(r)}" alt="" loading="lazy">`)}<span>${esc(r.name)}<small>${cfg.line(r)}</small></span></div>`).join("") || "<small>Nobody here</small>"}</div>`; }).join("");
    // "What I found" + hero use the official weekly cut (the default view) only. Moving a slider or
    // switching season changes the chart, never the published verdict, so the answer stays put all week.
    if (cfg.verdict && !cfg._verdictDone) { cfg._verdictDone = true; try { cfg.verdict(rows, st, ax, ay); } catch(e) { console.error(e); } }
  }
  cfg.redraw = draw; if (cfg.onSeason) cfg.onSeason(st, root); draw();
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(draw, 150); });
  return cfg;
}
const ord = n => { const s = ["th","st","nd","rd"], v = n % 100; return n + (s[(v-20)%10] || s[v] || s[0]); };
const cpRow = (logoUrl, name, small, lgk) => `<div class="cp">${faceBox(lgk && faceUrl(lgk, name), `<img class="lg lg-md" src="${logoUrl}" alt="" loading="lazy">`)}<span>${esc(name)}<small>${small}</small></span></div>`;
const hero = (logoUrl, name, sub, stats, why, lgk) => `<div class="h-top">${faceBox(lgk && faceUrl(lgk, name), `<img class="lg" src="${logoUrl}" alt="">`, "lg")}<div><div class="h-name">${esc(name)}</div><div class="h-sub">${sub}</div></div></div><div class="h-stats">${stats.map(([n, t]) => `<div><div class="n">${n}</div><div class="t">${t}</div></div>`).join("")}</div><p class="h-why">${why}</p>`;
const tickOnce = {};
const tick = (k, html) => { if (tickOnce[k] || !window.__ticker) return; tickOnce[k] = 1; window.__ticker.splice(2, 0, html); window.__renderTicker(); };
const short = n => { const p = n.split(" "); return p.length > 1 ? p[0][0] + ". " + p.slice(1).join(" ") : n; };
const avg = (rows, fx, fw) => rows.reduce((s, r) => s + fx(r) * fw(r), 0) / rows.reduce((s, r) => s + fw(r), 0);

/* ---------- NFL ---------- */
makeQuad({
  root:"#nflQuad", id:"nflq", lgk:"nfl", state:{season:"2026", pos:"WR", min:20, team:"", q:""},
  rows: st => NFL[st.season].filter(r => r.pos === st.pos && r.tgt >= st.min),
  x: r => r.sep, y: r => r.yacoe, invertY:false,
  avgX: rows => avg(rows, r => r.sep, r => r.tgt), avgY: rows => avg(rows, r => r.yacoe, r => r.rec),
  xLabel:"Average separation at the catch point (yards) →", yLabel:"YAC over expected per catch (yards) →",
  aria:"Receivers: separation vs. yards after catch over expected",
  corners:{tr:"Open & Electric", tl:"Contested Grinders", br:"Open but Stuck", bl:"Covered & Capped"},
  cornerHelp:{tr:"Gets open AND makes people miss", tl:"Rarely open, still breaks tackles", br:"Wins on routes, goes down fast", bl:"Production leans on volume or scheme"},
  teamNames: NFL_NAMES, logo: r => lg("nfl", NFL_ESPN[r.team] || r.team.toLowerCase()), short: r => short(r.name), labels: 16,
  tip: (r, st) => `<span class="tiph">${faceBox(faceUrl("nfl", r.name), `<img class="lg lg-md" src="${lg("nfl", NFL_ESPN[r.team] || r.team.toLowerCase())}" alt="">`)}<b>${esc(r.name)}</b></span>${r.pos} · ${NFL_NAMES[r.team] || r.team}<br>${r.tgt} tgt · ${r.rec} rec · ${r.yds} yds · ${r.td} TD<br>Separation <b>${f(r.sep, 2)}</b> yds · cushion ${f(r.cush, 1)}<br>aDOT ${f(r.adot, 1)} · catch ${f(r.catch, 0)}%<br>YAC ${f(r.yac, 2)} vs ${f(r.xyac, 2)} expected → <b>${sg(r.yacoe, 2)}</b><br>Target share <b>${NA(r.tshare) ? "—" : f(r.tshare, 1) + "%"}</b> · EPA/target <b>${NA(r.epat) ? "—" : sg(r.epat, 2)}</b>${nflSpark(r, st)}`,
  line: r => `${r.team} · ${f(r.sep, 2)} sep · ${sg(r.yacoe, 2)} YACOE`,
  // Qualifier scales with games played: default 4 targets a game for WRs (3 for TEs), floor 3 (2). Keeps the chart to real roles, not 15-snap guys.
  nflGames: st => st.season === "2026" ? Math.max(1, META.nflWeeks || 1) : 17,
  minText: function(st){ const g = this.nflGames(st); return `${st.min} (${(st.min / g).toFixed(1)}/game)`; },
  onSeason: function(st, root){ const i = $("input[data-k=min]", root), g = this.nflGames(st), wr = st.pos === "WR";
    const d = (wr ? 4 : 3) * g; i.min = (wr ? 3 : 2) * g; i.max = (wr ? 9 : 7) * g; i.step = 1; i.value = d; st.min = d; $("[data-out=min]", root).textContent = this.minText(st); },
  verdict: (rows, st, ax, ay) => {
    const box = $("#vNFL"), P = st.pos === "WR" ? "receivers" : "tight ends", lg_ = r => lg("nfl", NFL_ESPN[r.team] || r.team.toLowerCase());
    const TR = rows.filter(r => r._zx > 0 && r._zy > 0), TL = rows.filter(r => r._zx <= 0 && r._zy > 0).sort((a, b) => b._zy - a._zy), BR = rows.filter(r => r._zx > 0 && r._zy <= 0).sort((a, b) => b._zx - a._zx);
    const tl = TL[0], br = BR[0];
    $(".v-body", box).innerHTML = `<p>Two numbers split a receiver's production from his quarterback's. <b>Separation</b> is how open he gets on his own route. <b>YAC over expected</b> is what he adds once the ball's in his hands. Only <b>${TR.length} of ${rows.length}</b> qualified ${P} beat the average at both.</p>
      ${tl ? `<p>Want proof a guy isn't QB-made? Look left. <b>${esc(tl.name)}</b> gets just ${f(tl.sep, 2)} yards of separation, so his QB throws into tight windows, and he still adds ${sg(tl.yacoe, 2)} yards per catch over expected. That production is his.</p>` : ""}
      ${br ? `<p>Flip side: <b>${esc(br.name)}</b> is wide open (${f(br.sep, 2)} yards) but ${br.yacoe < 0 ? `loses ${f(-br.yacoe, 2)} yards per catch vs. expected` : `adds only ${sg(br.yacoe, 2)} yards per catch over expected`} once he has the ball. The play design and QB are doing more of the work there.</p>` : ""}
      <div class="v-list"><div><small style="color:var(--good)">Creates on his own</small>${TL.slice(0, 3).map(r => cpRow(lg_(r), r.name, `${r.team} · ${f(r.sep, 2)} sep · ${sg(r.yacoe, 2)} YACOE`, "nfl")).join("")}</div><div><small style="color:var(--ink3)">Scheme helps most</small>${BR.slice(0, 3).map(r => cpRow(lg_(r), r.name, `${r.team} · ${f(r.sep, 2)} sep · ${sg(r.yacoe, 2)} YACOE`, "nfl")).join("")}</div></div>`;
    $(".v-upd", box).textContent = META.updated ? `Updated ${new Date(META.updated + "T12:00:00").toLocaleDateString("en-US", {month: "short", day: "numeric"})} · ${st.season === "2026" ? `through Week ${META.nflWeeks}` : "2025 season"}` : "";
    const med = [...rows].map(r => r.tgt).sort((a, b) => a - b)[Math.floor(rows.length / 2)] || 0;
    const cand = TR.filter(r => r.tgt <= med).sort((a, b) => (b._zx + b._zy) - (a._zx + a._zy))[0] || TR[0];
    const h = holdHero("nfl", cand, r => r.name, n => TR.find(r => r.name === n), META.updated);
    if (cand) { box.dataset.candidate = cand.name; box.dataset.hero = h.name; }
    const tgtRank = [...rows].sort((a, b) => b.tgt - a.tgt).indexOf(h) + 1;
    if (h) { $(".h-body", box).innerHTML = hero(lg_(h), h.name, `${h.pos} · ${NFL_NAMES[h.team] || h.team}`, [[f(h.sep, 2), "Separation (yds)"], [sg(h.yacoe, 2), "YAC over exp."], [h.tgt, "Targets"], [NA(h.tshare) ? "—" : f(h.tshare, 1) + "%", "Target share"], [NA(h.epat) ? "—" : sg(h.epat, 2), "EPA per target"], [h.yds, "Yards"]],
      `Only the ${ord(tgtRank)}-most targeted ${st.pos} on this chart, but he wins both ways: open on his routes and dangerous after the catch. If his targets go up, his production should follow.`, "nfl") + prevHeroes("nfl", h.name, META.updated);
      box.dataset.summary = `Only ${TR.length} of ${rows.length} qualified ${P} win on separation AND after the catch. Under-the-radar pick: ${h.name.replace(/\.$/, "")}.`; box.dataset.date = META.updated;
      tick("nfl", `Unsung hero (NFL): <b>${esc(h.name)}</b> · ${f(h.sep, 2)} yds separation, <em>${sg(h.yacoe, 2)}</em> YAC over expected`); }
  },
  note: (st, rows, ax, ay) => `${rows.length} ${st.pos}s with ${st.min}+ targets · ${st.season === "2026" ? `2026 season through Week ${META.nflWeeks}` : "2025 regular season"}. Dashed lines = average separation (${f(ax, 2)} yds) and YAC over expected (${sg(ay, 2)}). Hover a logo for the full line.`
});

/* ---------- NHL ---------- */
makeQuad({
  root:"#nhlQuad", id:"nhlq", lgk:"nhl", state:{season:"2026-27", min:18, team:"", q:""},
  // Qualifier: average ice time per game (all situations) AND dressed for at least half his team's games. Top-4 roles, not 10-minute guys.
  rows: st => { const R = NHL[st.season], g = Math.max(...R.map(r => r.gp)); return R.filter(r => r.toigp >= st.min && r.gp >= Math.ceil(g / 2)); },
  minText: st => `${st.min} min`,
  x: r => r.xgf60, y: r => r.xga60, invertY:true, diag:"50% xG share line",
  avgX: rows => avg(rows, r => r.xgf60, r => r.toi), avgY: rows => avg(rows, r => r.xga60, r => r.toi),
  xLabel:"Expected goals FOR per 60, 5v5 on-ice (offense) →", yLabel:"Expected goals AGAINST per 60 (fewer is better) →",
  aria:"Defensemen: on-ice expected goals for vs. against per 60 minutes",
  corners:{tr:"Two-Way Studs", tl:"Shutdown", br:"Rovers", bl:"Underwater"},
  cornerHelp:{tr:"Team creates more AND allows less", tl:"Quiet offense, locks it down", br:"Pushes play, leaks chances", bl:"Out-chanced at both ends"},
  teamNames: NHL_NAMES, logo: r => lg("nhl", NHL_ESPN[r.team] || r.team.toLowerCase()), short: r => short(r.name), labels: 14,
  tip: (r, st) => `<span class="tiph">${faceBox(faceUrl("nhl", r.name), `<img class="lg lg-md" src="${lg("nhl", NHL_ESPN[r.team] || r.team.toLowerCase())}" alt="">`)}<b>${esc(r.name)}</b></span>${NHL_NAMES[r.team] || r.team} · ${r.gp} GP · ${f(r.toigp, 1)} min/game<br>5v5: ${f(r.toi, 0)} min · xGF/60 <b>${f(r.xgf60, 2)}</b> · xGA/60 <b>${f(r.xga60, 2)}</b><br>xG share <b>${f(r.pct, 1)}%</b> · vs. team without him ${sg(r.rel, 1)}<br>Actual 5v5 goals on ice ${r.gf}–${r.ga} · ${r.pts} pts (${r.g} G)${NA(r.hits) ? "" : `<br>Blocks <b>${r.blk}</b> · takeaways <b>${r.tk}</b> · hits <b>${r.hits}</b> · giveaways ${r.gv}`}${nhlSpark(r, st)}`,
  line: r => `${r.team} · ${f(r.pct, 1)}% xG · ${sg(r.rel, 1)} rel`,
  onSeason: (st, root) => { const i = $("input[data-k=min]", root); i.min = 15; i.max = 24; i.step = 0.5; i.value = 18; st.min = 18; $("[data-out=min]", root).textContent = "18 min"; },
  verdict: (rows, st, ax, ay) => {
    const box = $("#vNHL"), lg_ = r => lg("nhl", NHL_ESPN[r.team] || r.team.toLowerCase());
    rows.forEach(r => r._ppg = r.pts / Math.max(1, r.gp));
    const above = rows.filter(r => r.pct >= 50).length;
    const byPct = [...rows].sort((a, b) => b.pct - a.pct), topPts = [...rows].sort((a, b) => b.pts - a.pts)[0];
    const best = [...rows].sort((a, b) => a.xga60 - b.xga60)[0];
    const bleed = rows.filter(r => r.pct < 50).sort((a, b) => b._ppg - a._ppg).slice(0, 3);
    const medP = [...rows].map(r => r._ppg).sort((a, b) => a - b)[Math.floor(rows.length / 2)] || 0;
    const quiet = rows.filter(r => r._ppg <= medP).sort((a, b) => b.pct - a.pct).slice(0, 3);
    $(".v-body", box).innerHTML = `<p>Above the diagonal, his team out-chances the other team while he's on the ice. <b>${above} of ${rows.length}</b> qualified defensemen clear it.</p>
      ${byPct.indexOf(topPts) < 10
        ? `<p>The top scorer here, <b>${esc(topPts.name)}</b> (${topPts.pts} point${topPts.pts === 1 ? "" : "s"}), also ranks ${ord(byPct.indexOf(topPts) + 1)} in expected-goal share, so his points are backed up by real two-way play. That's the exception: points alone still miss the guys who just shut things down. The stingiest is <b>${esc(best.name)}</b>, allowing just ${f(best.xga60, 2)} expected goals per 60 minutes.</p>`
        : `<p>Points don't tell you who defends. The top scorer here, <b>${esc(topPts.name)}</b> (${topPts.pts} point${topPts.pts === 1 ? "" : "s"}), ranks only ${ord(byPct.indexOf(topPts) + 1)} in expected-goal share. The stingiest is <b>${esc(best.name)}</b>: just ${f(best.xga60, 2)} expected goals against per 60 minutes.</p>`}
      <div class="v-list"><div><small style="color:var(--bad)">Scores, but bleeds chances</small>${bleed.map(r => cpRow(lg_(r), r.name, `${r.team} · ${r.pts} pts · ${f(r.pct, 1)}% xG`, "nhl")).join("")}</div><div><small style="color:var(--good)">Quiet, but wins his minutes</small>${quiet.map(r => cpRow(lg_(r), r.name, `${r.team} · ${r.pts} pts · ${f(r.pct, 1)}% xG`, "nhl")).join("")}</div></div>`;
    $(".v-upd", box).textContent = META.updated ? `Updated ${new Date(META.updated + "T12:00:00").toLocaleDateString("en-US", {month: "short", day: "numeric"})} · ${st.season === "2025-26" ? "2025–26 full season" : `2026–27, up to ${META.nhlMaxGP} games`}` : "";
    const elig = rows.filter(r => r._ppg <= medP && r.pct >= 50).sort((a, b) => a.xga60 - b.xga60);
    const h = holdHero("nhl", elig[0], r => r.name, n => elig.find(r => r.name === n), META.updated);
    if (elig[0]) { box.dataset.candidate = elig[0].name; box.dataset.hero = h.name; }
    if (h) { $(".h-body", box).innerHTML = `<div class="h-sub" style="color:var(--gold);font-weight:700;margin-bottom:8px">The Center Back Award</div>` + hero(lg_(h), h.name, `${NHL_NAMES[h.team] || h.team} · ${h.gp} GP`, [[f(h.xga60, 2), "xGA / 60"], [f(h.pct, 1) + "%", "xG share"], [sg(h.rel, 1), "vs. team without him"], [NA(h.blk) ? "—" : h.blk, "Blocked shots"], [NA(h.tk) ? "—" : h.tk, "Takeaways"], [h.pts, "Points"]],
      `Only ${h.pts} point${h.pts === 1 ? "" : "s"}, so he'll never make a highlight reel. But with him on the ice, opponents get almost nothing: ${ord([...rows].sort((a, b) => a.xga60 - b.xga60).indexOf(h) + 1)}-fewest chances allowed of ${rows.length}. In soccer terms, he's the center back. Nobody notices until he's gone.`, "nhl") + prevHeroes("nhl", h.name, META.updated);
      box.dataset.summary = `${byPct.indexOf(topPts) < 10 ? `Top scorer ${topPts.name} also ranks ${ord(byPct.indexOf(topPts) + 1)} in chance share.` : `The top-scoring defenseman ranks only ${ord(byPct.indexOf(topPts) + 1)} in chance share.`} Center Back Award: ${h.name}, ${f(h.xga60, 2)} xGA/60 with only ${h.pts} point${h.pts === 1 ? "" : "s"}.`; box.dataset.date = META.updated;
      tick("nhl", `Center Back Award (NHL): <b>${esc(h.name)}</b> · ${f(h.xga60, 2)} xGA/60, only ${h.pts} pts`); }
  },
  note: (st, rows, ax, ay) => `${rows.length} defensemen averaging ${st.min}+ minutes a game (and in at least half his team's games) · ${st.season === "2025-26" ? "full 2025–26 season" : `2026–27 so far (up to ${META.nhlMaxGP} games, small sample)`}. Dashed lines = average xGF/60 (${f(ax, 2)}) and xGA/60 (${f(ay, 2)}). Above the diagonal = his team out-chances opponents with him on.`
});
/* ---------- latest entries list ---------- */
(() => {
  const list = document.getElementById("entryList"); if (!list) return;
  const ent = [["vNFL", "nfl", "NFL", "Is he actually good, or does his quarterback make him look good?"],
               ["vNHL", "nhl", "NHL", "Who actually defends, not just scores?"],
               ["vDraft", "nba", "NBA", "Did NBA teams get it right?"],
               ["vCBB", "cbb", "College Basketball", "Is this team actually good, or just hyped?"]];
  const fmtD = d => d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", {month: "short", day: "numeric"}) : "";
  list.innerHTML = ent.map(([v, id, sport, q]) => { const b = document.getElementById(v) || {dataset: {}}; const d = b.dataset.date;
    return `<li><a href="#${id}"><span class="en-meta">${d ? fmtD(d) + " · " : ""}${sport}</span><span class="en-q">${q}</span><span class="en-a">${esc(b.dataset.summary || "")}</span></a></li>`; }).join("")
    + `<li class="soon"><span class="en-meta">Premier League</span><span class="en-q">Next entry, coming this season</span></li>`;
})();
})();

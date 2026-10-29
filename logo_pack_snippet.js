// Run in Chrome (javascript tool) on https://stevetrombetta-analytics-portfolio.netlify.app/ to fetch team logos
// from ESPN and save them as Downloads/portfolio_logos_add.json; then: python3 add_logos.py <that file>; python3 build.py
// KEYS = the "league/espnId" keys check_build.py reported as missing (league = ncaa, nba, nfl, nhl, soccer).
const KEYS = ["nhl/van"];
const S = 72;
async function get(k){ const [lg, id] = k.split("/");
  for (const u of [`https://a.espncdn.com/combiner/i?img=/i/teamlogos/${lg}/500/${id}.png&w=144&h=144`, `https://a.espncdn.com/i/teamlogos/${lg}/500/${id}.png`])
    for (let t = 0; t < 3; t++){ try { const r = await fetch(u, {cache: "reload"}); if (!r.ok) throw r.status; const bm = await createImageBitmap(await r.blob());
      const c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d"); const sc = Math.min(S / bm.width, S / bm.height);
      x.drawImage(bm, (S - bm.width * sc) / 2, (S - bm.height * sc) / 2, bm.width * sc, bm.height * sc); return c.toDataURL("image/webp", 0.9);
    } catch (e) { await new Promise(r => setTimeout(r, 500)); } }
  return null; }
const out = {}, fail = [];
for (const k of KEYS){ const d = await get(k); if (d) out[k] = d; else fail.push(k); }
const b = new Blob([JSON.stringify(out)], {type: "application/json"}); const a = document.createElement("a");
a.href = URL.createObjectURL(b); a.download = "portfolio_logos_add.json"; document.body.appendChild(a); a.click(); a.remove();
JSON.stringify({saved: Object.keys(out).length, fail});

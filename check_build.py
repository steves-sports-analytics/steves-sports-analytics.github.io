"""Pre-publish check: render dist/index.html (or the live URL) in headless Chromium and confirm every project rendered
and every Unsung Hero card is filled. Exit 0 = OK to publish, 1 = DO NOT publish.

Usage:  python3 check_build.py <path-to-index.html | https://...>  [--expect-nfl-weeks N] [--expect-nhl-gp N]
Prints one JSON line with the four candidates/heroes (used for the hero log).
"""
import json, sys, pathlib
from playwright.sync_api import sync_playwright

args = sys.argv[1:]
target = args[0]
exp = {}
for k in ("--expect-nfl-weeks", "--expect-nhl-gp"):
    if k in args: exp[k] = int(args[args.index(k) + 1])
url = target if target.startswith("http") else pathlib.Path(target).resolve().as_uri()

JS = r"""() => {
  const v = id => { const e = document.querySelector(id); return e ? {candidate: e.dataset.candidate || "", hero: e.dataset.hero || "",
      body: (e.querySelector('.v-body')?.innerText || '').trim().length,
      heroName: (e.querySelector('.h-name')?.innerText || '').trim(),
      emptyLists: [...e.querySelectorAll('.v-list > div')].filter(d => !d.querySelector('.cp')).length} : null; };
  const Q = (typeof QUAD !== 'undefined') ? QUAD.meta : null;
  return {nfl: !!document.querySelector('#nflQuad svg'), nhl: !!document.querySelector('#nhlQuad svg'),
          scatter: !!document.querySelector('#scatter svg'), hnames: document.querySelectorAll('.verdict .h-name').length,
          meta: Q, cbb: v('#vCBB'), nba: v('#vDraft'), nflV: v('#vNFL'), nhlV: v('#vNHL'),
          // every team logo must come from the embedded pack (data: URI); a CDN URL means that team is missing from data/logos.json
          cdnLogos: [...(window.__logoMiss || [])],
          brokenEmbedded: [...document.querySelectorAll('img')].filter(i => i.src.startsWith('data:') && i.complete && i.naturalWidth === 0).length,
          nbaTeams: window.__nbaTeams || [], nbaRosterDate: window.__nbaRosterDate || null,
          logoCount: (typeof LOGOS !== 'undefined') ? Object.keys(LOGOS).length : 0};
}"""

errors, problems = [], []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    # external fonts/headshots may be unreachable from the checker; that's fine (the page hides them). Team logos are embedded, so they must all render.
    pg.goto(url, wait_until="domcontentloaded", timeout=60000)
    pg.wait_for_timeout(3000)
    r = pg.evaluate(JS)
    b.close()

if errors: problems.append("JavaScript errors: " + " | ".join(errors[:3]))
for k in ("nfl", "nhl", "scatter"):
    if not r[k]: problems.append(f"#{ {'nfl':'nflQuad','nhl':'nhlQuad','scatter':'scatter'}[k]} chart missing")
if r["hnames"] != 4: problems.append(f"{r['hnames']} Unsung Hero names on page (need 4)")
for s in ("cbb", "nba", "nflV", "nhlV"):
    c = r[s]
    if not c: problems.append(f"{s} card missing"); continue
    if not c["candidate"] or not c["hero"]: problems.append(f"{s} card has no data-candidate/data-hero")
    if not c["heroName"]: problems.append(f"{s} hero card is empty")
    if c["body"] < 40: problems.append(f"{s} 'What I found' text is empty")
    if c["emptyLists"]: problems.append(f"{s} card has {c['emptyLists']} empty list(s)")
if r["logoCount"] < 400: problems.append(f"logo pack missing or too small ({r['logoCount']} logos); data/logos.json not built into the page")
if r["cdnLogos"]: problems.append("team logos missing from data/logos.json (add them with add_logos, see WEEKLY_UPDATE.md): " + ", ".join(sorted(r["cdnLogos"])))
if r["brokenEmbedded"]: problems.append(f"{r['brokenEmbedded']} embedded logo(s) failed to render")
# NBA draftees must show their CURRENT team (latest game, else ESPN roster), never a stale draft-night team
bad = [f"pick {t['pick']} shows {t['shown']} but {'played for' if t['game'] else 'roster says'} {t['game'] or t['roster']}" for t in r["nbaTeams"] if (t["game"] or t["roster"]) and t["shown"] != (t["game"] or t["roster"])]
if bad: problems.append("NBA team mismatch: " + "; ".join(bad))
import datetime as _d
rd = r.get("nbaRosterDate")
if not rd: problems.append("NBA roster data missing (data/nba_teams.json); run the nba_teams step")
elif (_d.datetime.now(_d.timezone.utc) - _d.datetime.fromisoformat(rd.replace("Z", "+00:00"))).days > 9: problems.append(f"NBA roster data is stale (fetched {rd[:10]}); run the nba_teams step")
m = r["meta"] or {}
if "--expect-nfl-weeks" in exp and m.get("nflWeeks") != exp["--expect-nfl-weeks"]: problems.append(f"page nflWeeks {m.get('nflWeeks')} != data {exp['--expect-nfl-weeks']}")
if "--expect-nhl-gp" in exp and m.get("nhlMaxGP") != exp["--expect-nhl-gp"]: problems.append(f"page nhlMaxGP {m.get('nhlMaxGP')} != data {exp['--expect-nhl-gp']}")

out = {"ok": not problems, "problems": problems, "meta": m,
       "heroes": {sp: {"candidate": (r[k] or {}).get("candidate"), "hero": (r[k] or {}).get("hero")} for sp, k in (("cbb","cbb"),("nba","nba"),("nfl","nflV"),("nhl","nhlV"))}}
print(json.dumps(out))
sys.exit(0 if out["ok"] else 1)

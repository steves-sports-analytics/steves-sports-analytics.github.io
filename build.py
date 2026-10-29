import pathlib, json
R = pathlib.Path(__file__).parent
css = (R/"src/style.css").read_text()
body = (R/"src/body.html").read_text()
js = (R/"src/logos.js").read_text() + "\n" + (R/"src/app.js").read_text() + "\n" + (R/"src/quad.js").read_text()
teams = (R/"data/teams.txt").read_text().strip()
draft = (R/"data/draft.txt").read_text().strip()
quad = (R/"data/quad.json").read_text()
cbbm = (R/"data/cbb.json").read_text()
rook = (R/"data/rookies.json").read_text()
# History for the page: hero log (2-week hold + "previous heroes") and NHL xG-share trend from weekly snapshots
import csv
hist = {"heroes": [], "nhl": {}}
hp = R/"data/history/heroes.csv"
if hp.exists(): hist["heroes"] = list(csv.DictReader(hp.open()))
import datetime as _dt
snaps = {}
for p in sorted(p for p in (R/"data/history").glob("20*") if (p/"quad.json").exists()):  # one snapshot per Mon-Sun week (the latest)
    dd = _dt.date.fromisoformat(p.name); snaps[dd - _dt.timedelta(days=dd.weekday())] = p
for d in [snaps[k] for k in sorted(snaps)]:
    rows = json.loads((d/"quad.json").read_text())["nhl"].get("2026-27", [])
    for r in rows:
        xf, xa = r[5], r[6]
        if xf + xa > 0: hist["nhl"].setdefault(r[0], []).append([d.name, round(100 * xf / (xf + xa), 1)])
hist_js = json.dumps(hist, separators=(",", ":"), ensure_ascii=False)
dbt = (R/"data/draft_backtest.json").read_text() if (R/"data/draft_backtest.json").exists() else "null"
nbacur = (R/"data/nba_teams.json").read_text() if (R/"data/nba_teams.json").exists() else "{}"
logos = (R/"data/logos.json").read_text() if (R/"data/logos.json").exists() else "{}"
faces = (R/"data/faces.json").read_text() if (R/"data/faces.json").exists() else "{}"
data = f"const LOGOS = {logos};\nconst NBA_CUR = {nbacur};\nconst QUAD = {quad};\nconst CBB_META = {cbbm};\nconst ROOKIES = {rook};\nconst FACES = {faces};\nconst DRAFT_BT = {dbt};\nconst HIST = {hist_js};\nconst TEAM_ROWS = {json.dumps(teams)};\nconst DRAFT_ROWS = {json.dumps(draft)};\n"
html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Steve Trombetta · Sports Analytics Notebook</title>
<meta name="description" content="Sports analytics portfolio of Steve Trombetta: college basketball efficiency ratings, a 2026 NBA draft board, and more.">
<meta name="theme-color" content="#f6f3ec">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='10' fill='%231f4e8c'/%3E%3Ctext x='32' y='44' font-family='Impact,sans-serif' font-size='34' fill='white' text-anchor='middle'%3EST%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,600&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body>
{body}
<script>
{data}{js}
</script>
</body>
</html>
"""
out = R/"dist/index.html"; out.parent.mkdir(exist_ok=True); out.write_text(html)
# GitHub Pages serves the site from docs/index.html
pg = R/"docs/index.html"; pg.parent.mkdir(exist_ok=True); pg.write_text(html)
print(out, len(html))

"""Weekly NBA Rookie Report: how the 2026 college draftees are playing.

Usage: python3 rookie_refresh.py --box player_box_2027.parquet
Writes data/rookies.json. Before opening night (no file / no games) it records status "pre".
"""
import argparse, json, pathlib, datetime, re, unicodedata
import pandas as pd

R = pathlib.Path(__file__).parent
ap = argparse.ArgumentParser(); ap.add_argument("--box"); ap.add_argument("--tipoff", default="2026-10-20")
a = ap.parse_args()
norm = lambda s: re.sub(r"\b(jr|sr|ii|iii|iv)\b", "", re.sub(r"[^a-z ]", "", unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower())).split()
key = lambda s: " ".join(norm(s))
draft = {}
for line in (R / "data/draft.txt").read_text().strip().split("\n"):
    f = line.split("|"); draft[key(f[1])] = (int(f[0]), f[1])
out = {"season": "2026-27", "status": "pre", "tipoff": a.tipoff, "updated": datetime.date.today().isoformat(), "rows": []}
if a.box and pathlib.Path(a.box).exists():
    b = pd.read_parquet(a.box)
    b = b[(b["season_type"] == 2) & (b["minutes"].fillna(0) > 0)]
    b = b[b["athlete_display_name"].map(key).isin(draft)]
    if len(b):
        b = b.sort_values("game_date")
        b["gmsc"] = (b.points + 0.4 * b.field_goals_made - 0.7 * b.field_goals_attempted - 0.4 * (b.free_throws_attempted - b.free_throws_made)
                     + 0.7 * b.offensive_rebounds + 0.3 * b.defensive_rebounds + b.steals + 0.7 * b.assists + 0.7 * b.blocks - 0.4 * b.fouls - b.turnovers)
        rows = []
        for name, g in b.groupby("athlete_display_name"):
            pick, dname = draft[key(name)]
            fga, fta, pts = g.field_goals_attempted.sum(), g.free_throws_attempted.sum(), g.points.sum()
            ts = pts / (2 * (fga + 0.44 * fta)) if (fga + fta) else float("nan")
            n = len(g)
            rows.append({"pick": pick, "name": dname, "team": str(g.team_abbreviation.iloc[-1]), "gp": n,
                "mpg": round(g.minutes.mean(), 1), "ppg": round(pts / n, 1), "rpg": round(g.rebounds.sum() / n, 1), "apg": round(g.assists.sum() / n, 1),
                "ts": round(ts, 3) if ts == ts else None, "gmsc": round(g.gmsc.mean(), 2),
                "p36": round(36 * pts / g.minutes.sum(), 1), "r36": round(36 * g.rebounds.sum() / g.minutes.sum(), 1), "a36": round(36 * g.assists.sum() / g.minutes.sum(), 1)})
        out.update(status="live", rows=sorted(rows, key=lambda r: -r["gmsc"]))
(R / "data/rookies.json").write_text(json.dumps(out))
print("Rookies:", out["status"], len(out["rows"]), "players")

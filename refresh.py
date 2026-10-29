"""Weekly refresh for the portfolio's live charts.

Usage:  python3 refresh.py --ngs ngs_receiving.csv.gz [--mp moneypuck_skaters_2026.csv]
Then:   python3 build.py   ->  dist/index.html

- NFL: Next Gen Stats receiving (nflverse release CSV). Rebuilds the 2025 and 2026 season rows.
- NHL: MoneyPuck 2026-27 skaters season summary (raw CSV). Rebuilds the current-season defensemen.
  The 2025-26 season is final and stays as stored.
"""
import argparse, json, pathlib, datetime
import pandas as pd

R = pathlib.Path(__file__).parent
ap = argparse.ArgumentParser()
ap.add_argument("--ngs", required=True)
ap.add_argument("--mp")
ap.add_argument("--stats", nargs="*", default=[], help="nflverse stats_player_reg_YYYY.parquet files (2025, 2026): official target share + receiving EPA")
a = ap.parse_args()

q = json.loads((R / "data/quad.json").read_text())
import copy; prev = copy.deepcopy(q)
meta = q.get("meta", {})

# ---- NFL ----
n = pd.read_csv(a.ngs)
n = n[(n.season_type == "REG") & (n.season.isin([2025, 2026])) & (n.player_position.isin(["WR", "TE"]))]
season_rows = n[n.week == 0]
# Target share + EPA per target, straight from nflverse's official season stats (same numbers fans see on nflverse-based sites)
usage, box = {}, {}  # box = official targets/catches/yards/TDs (match ESPN box scores; NGS counts can differ slightly)
for f in a.stats:
    ps = pd.read_parquet(f, columns=["season", "player_id", "targets", "target_share", "receiving_epa", "receptions", "receiving_yards", "receiving_tds"])
    for r in ps[ps.targets > 0].itertuples():
        usage[(int(r.season), r.player_id)] = (round(100 * r.target_share, 1) if r.target_share == r.target_share else None, round(r.receiving_epa / r.targets, 3))
        box[(int(r.season), r.player_id)] = (int(r.targets), int(r.receptions), int(r.receiving_yards), int(r.receiving_tds))
for yr, g in season_rows.groupby("season"):
    q["nfl"][str(yr)] = [[r.player_display_name, r.team_abbr, r.player_position,
        *(box.get((int(yr), r.player_gsis_id)) or (int(r.targets), int(r.receptions), int(r.yards), int(r.rec_touchdowns))),
        round(r.avg_separation, 2), round(r.avg_cushion, 2), round(r.avg_intended_air_yards, 2), round(r.catch_percentage, 1),
        round(r.avg_yac, 2), round(r.avg_expected_yac, 2), round(r.avg_yac_above_expectation, 2), round(r.percent_share_of_intended_air_yards, 1),
        *(usage.get((int(yr), r.player_gsis_id)) or (None, None))]   # [15] target share %, [16] EPA per target
        for r in g.itertuples()]
# Week-by-week trend (2026) for the hover sparkline: [week, separation, YAC over expected]
tr = {}
for r in n[(n.season == 2026) & (n.week > 0)].sort_values("week").itertuples():
    tr.setdefault(r.player_display_name, []).append([int(r.week), round(r.avg_separation, 2), round(r.avg_yac_above_expectation, 2)])
q["nflTrend"] = tr
wk = n[(n.season == 2026) & (n.week > 0)].week.value_counts()
full = wk[wk >= 40]  # a week counts once most teams have played
meta["nflWeeks"] = int(full.index.max()) if len(full) else 0
print("NFL 2026:", len(q["nfl"].get("2026", [])), "rows through week", meta["nflWeeks"])

# ---- NHL ----
if a.mp:
    raw = pathlib.Path(a.mp).read_bytes()
    try: text = raw.decode("utf-8")
    except UnicodeDecodeError: text = raw.decode("latin-1")
    from io import StringIO
    d = pd.read_csv(StringIO(text))
    d = d[d.position == "D"]
    ev = d[d.situation == "5on5"].set_index("playerId")
    al = d[d.situation == "all"].set_index("playerId")
    FIX = {"Martin Fehrvry": "Martin Fehérváry", "Olli Mtt": "Olli Määttä", "Olli Maatta": "Olli Määttä"}  # MoneyPuck drops accents
    rows = []
    for pid, r in ev.iterrows():
        if r.icetime < 1500: continue
        A = al.loc[pid] if pid in al.index else None
        toi_all = float(A.icetime) if A is not None else 0
        rows.append([FIX.get(r["name"], r["name"]), r.team, int(r.games_played), round(r.icetime / 60, 1), round(toi_all / 60 / r.games_played, 1) if r.games_played else 0,
            round(r.OnIce_F_scoreVenueAdjustedxGoals, 2), round(r.OnIce_A_scoreVenueAdjustedxGoals, 2), int(r.OnIce_F_goals), int(r.OnIce_A_goals),
            round(r.OffIce_F_xGoals, 2), round(r.OffIce_A_xGoals, 2), int(r.OnIce_F_highDangerShots), int(r.OnIce_A_highDangerShots),
            int(A.I_F_points) if A is not None else 0, int(A.I_F_goals) if A is not None else 0,
            *( [int(A.I_F_hits), int(A.shotsBlockedByPlayer), int(A.I_F_takeaways), int(A.I_F_giveaways)] if A is not None else [None] * 4 )])  # [15..18] hits, blocks, takeaways, giveaways
    q["nhl"]["2026-27"] = rows
    meta["nhlMaxGP"] = int(ev.games_played.max())
    print("NHL 2026-27:", len(rows), "defensemen, max GP", meta["nhlMaxGP"])

# ---- Headshot IDs (faces.json): NFL name -> ESPN id, NHL name -> NHL id. NBA draft ids are static. ----
fp = R / "data/faces.json"
faces = json.loads(fp.read_text()) if fp.exists() else {"nfl": {}, "nhl": {}, "nba": {}}
try:
    pl = pd.read_csv("https://github.com/nflverse/nflverse-data/releases/download/players/players.csv", usecols=["gsis_id", "espn_id"]).dropna()
    gsis2espn = dict(zip(pl.gsis_id, pl.espn_id.astype(int)))
    for r in n[n.week == 0].itertuples():
        if r.player_gsis_id in gsis2espn: faces["nfl"][r.player_display_name] = int(gsis2espn[r.player_gsis_id])
except Exception as e: print("NFL faces skipped:", e)
if a.mp:
    for pid, r in ev.iterrows(): faces["nhl"][FIX.get(r["name"], r["name"])] = int(pid)
fp.write_text(json.dumps(faces, separators=(",", ":"), ensure_ascii=False))
print("faces:", {k: len(v) for k, v in faces.items()})

meta["updated"] = datetime.date.today().isoformat()
q["meta"] = meta

# ---- Validation gate: if anything looks off, keep last week's data and stop ----
def validate(new, old):
    errs = []
    def chk(rows, label, idx, lo, hi):
        bad = [r[0] for r in rows if not (lo <= r[idx] <= hi)]
        if bad: errs.append(f"{label}: {len(bad)} values outside {lo}..{hi} (e.g. {bad[:3]})")
    for yr, rows in new["nfl"].items():
        names = [(r[0], r[1]) for r in rows]
        if len(names) != len(set(names)): errs.append(f"NFL {yr}: duplicate players")
        chk(rows, f"NFL {yr} separation", 7, 0.5, 8); chk(rows, f"NFL {yr} YAC over exp", 13, -8, 10)
        withU = [r for r in rows if len(r) > 16 and r[15] is not None]
        chk(withU, f"NFL {yr} target share", 15, 0, 60); chk(withU, f"NFL {yr} EPA/target", 16, -3, 3)
        if a.stats and len(withU) < 0.9 * len(rows): errs.append(f"NFL {yr}: only {len(withU)}/{len(rows)} receivers matched to play-by-play")
        before = len(old["nfl"].get(yr, []))
        if before and len(rows) < 0.8 * before: errs.append(f"NFL {yr}: rows dropped {before} -> {len(rows)}")
    for yr, rows in new["nhl"].items():
        chk(rows, f"NHL {yr} toi", 3, 0, 2500)
        for r in rows:
            m = r[3] / 60 if r[3] else 0
            if m and not (0 <= r[5] / m <= 10 and 0 <= r[6] / m <= 10): errs.append(f"NHL {yr}: xG/60 out of range for {r[0]}"); break
        before = len(old["nhl"].get(yr, []))
        if before and len(rows) < 0.8 * before: errs.append(f"NHL {yr}: rows dropped {before} -> {len(rows)}")
    if new["meta"].get("nflWeeks", 0) < old.get("meta", {}).get("nflWeeks", 0): errs.append("NFL week count went backwards")
    if new["meta"].get("nhlMaxGP", 0) < old.get("meta", {}).get("nhlMaxGP", 0): errs.append("NHL games played went backwards")
    return errs
errs = validate(q, prev)
if errs:
    print("VALIDATION FAILED - quad.json NOT updated:"); [print(" -", e) for e in errs]; raise SystemExit(1)
(R / "data/quad.json").write_text(json.dumps(q, separators=(",", ":"), ensure_ascii=False))
print("quad.json updated", meta)

# ---- Weekly snapshot: keep every week's data so history is never overwritten ----
import shutil
snap = R / "data/history" / meta["updated"]; snap.mkdir(parents=True, exist_ok=True)
for f in ["quad.json", "cbb.json", "rookies.json", "teams.txt", "draft.txt", "faces.json"]:
    if (R / "data" / f).exists(): shutil.copy2(R / "data" / f, snap / f)
print("snapshot saved:", snap)

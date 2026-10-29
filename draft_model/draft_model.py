"""NBA Draft model v2 (Oct 2026).

What changed from v1 and why (Steve's review, Oct 17 2026):
  1. Position groups. v1 compared every player to the whole class, so rebounding/blocks/TS% made bigs look best
     (all 4 centers in the top 12, only 3 of 24 guards in the top 15). v2 scores each player against his own
     group - Guards, Wings, Bigs - pooled across the 2024-2026 drafted college players for a stable baseline.
  2. Short/injured seasons. Under 450 minutes, the prior college season is blended in (weighted to fill the gap),
     so 4 games (Quaintance) can't sink a player. Blended players are never listed as steals or reaches.
  3. Age. Same production at a younger age scores higher. Age is ~29% of the score.
  4. Backtest. The same model is run on the 2024 and 2025 classes and checked against NBA production
     (total Game Score). Results are written to data/draft_backtest.json and shown on the site.

Inputs: sportsdataverse men's college player box scores 2023-2026 + NBA player box 2025-2026 (parquet paths below),
draft_model/bio.json (ESPN height + birth date), draft_model/drafts.py (2024/2025 draft orders), data/draft.txt (2026).
Usage: python3 draft_model/draft_model.py --box-dir ~/dm
"""
import argparse, json, os, re, sys, unicodedata, pathlib
import numpy as np, pandas as pd
from scipy.stats import spearmanr
R = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(R / "draft_model"))
from drafts import D2024, D2025
ap = argparse.ArgumentParser(); ap.add_argument("--box-dir", required=True); a = ap.parse_args()
BD = pathlib.Path(os.path.expanduser(a.box_dir))
def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\b(jr|sr|ii|iii|iv)\b\.?", "", s); return re.sub(r"[^a-z]", "", s)
lines = (R / "data/draft.txt").read_text().strip().split("\n")
base = {int(l.split("|")[0]): l.split("|") for l in lines}   # existing display fields (per-game stats etc.)
D2026 = [(p, f[1]) for p, f in base.items()]
bio = json.loads((R / "draft_model/bio.json").read_text())
STAT = ["minutes", "points", "field_goals_attempted", "free_throws_attempted", "three_point_field_goals_attempted",
        "rebounds", "assists", "steals", "blocks", "turnovers"]
def season(yr):
    b = pd.read_parquet(BD / f"mbb_pb_{yr}.parquet"); b = b[(b.minutes.fillna(0) > 0) & b.season_type.isin([2, 3])]
    mg = b.drop_duplicates(["game_id", "team_id"]).assign(m=lambda d: d.team_score.astype(float) - d.opponent_team_score.astype(float)).groupby("team_id").m.mean()
    s = b.groupby("athlete_id").agg(name=("athlete_display_name", "last"), pos=("athlete_position_abbreviation", "last"),
        team_id=("team_id", "last"), g=("game_id", "nunique"), **{c: (c, "sum") for c in STAT}).reset_index()
    s["margin"] = s.team_id.map(mg); s["key"] = s.name.map(norm); return s
SEAS = {y: season(y) for y in [2023, 2024, 2025, 2026]}
MIN_FULL = 450
rows = []
for yr, D in [(2024, D2024), (2025, D2025), (2026, D2026)]:
    cur, prev = SEAS[yr], SEAS[yr - 1]
    for pick, name in D:
        c = cur[cur.key == norm(name)].sort_values("minutes", ascending=False)
        if c.empty: continue
        c = c.iloc[0]; aid = str(int(c.athlete_id)); tot = {k: float(c[k]) for k in STAT}; blend = 0.0
        if tot["minutes"] < MIN_FULL:
            p = prev[prev.athlete_id == c.athlete_id]
            if len(p):
                p = p.iloc[0]; blend = min(1.0, (MIN_FULL - tot["minutes"]) / max(float(p.minutes), 1))
                tot = {k: tot[k] + blend * float(p[k]) for k in STAT}
        m = tot["minutes"]; b = bio.get(aid, {})
        rows.append(dict(cls=yr, pick=pick, player=name, espn_pos=c.pos, g=int(c.g), blend=round(blend, 2), height=b.get("in", np.nan),
            age=(pd.Timestamp(f"{yr}-06-25") - pd.Timestamp(b["dob"])).days / 365.25 if b.get("dob") else np.nan, margin=c.margin,
            pts40=40*tot["points"]/m, reb40=40*tot["rebounds"]/m, ast40=40*tot["assists"]/m, stocks40=40*(tot["steals"]+tot["blocks"])/m,
            blk40=40*tot["blocks"]/m, tov40=40*tot["turnovers"]/m, tpa40=40*tot["three_point_field_goals_attempted"]/m,
            ts=tot["points"]/(2*(tot["field_goals_attempted"]+0.44*tot["free_throws_attempted"])),
            usg=(tot["field_goals_attempted"]+0.44*tot["free_throws_attempted"]+tot["turnovers"])/m))
df = pd.DataFrame(rows)
def group(r):
    if r.espn_pos == "C" or r.height >= 84 or ((r.reb40 >= 11 or r.blk40 >= 2.0) and r.tpa40 < 4.5): return "Big"
    if r.espn_pos == "G" and (r.height <= 77 or r.ast40 >= 4.5): return "Guard"
    return "Wing"
df["grp"] = df.apply(group, axis=1)
df["age"] = df.age.fillna(df.age.mean())
W = {"pts40": 18, "ts": 18, "reb40": 12, "ast40": 12, "stocks40": 14, "tov40": 8, "margin": 10, "usg": 8}; AGE_W = 40
Z = {}
tot = 0
for k, w in W.items():
    g = df.groupby("grp")[k]; Z[k] = ((df[k] - g.transform("mean")) / g.transform("std")) * (-1 if k == "tov40" else 1)
    tot = tot + w * Z[k]
Z["age"] = -(df.age - df.age.mean()) / df.age.std()
df["raw"] = (tot + AGE_W * Z["age"]) / (sum(W.values()) + AGE_W)
# Baseline so other players (2027 prospects, future classes) can be scored on the exact same scale
BASELINE = {"weights": W, "age_w": AGE_W, "age_mean": float(df.age.mean()), "age_sd": float(df.age.std()), "min_full": MIN_FULL,
        "groups": {gname: {k: [float(x[k].mean()), float(x[k].std())] for k in W} for gname, x in df.groupby("grp")},
        "raw_pool": sorted(float(v) for v in df.raw)}   # every 2024-26 drafted college player's score -> percentiles
(R / "data/draft_model_baseline.json").write_text(json.dumps(BASELINE))
# ---- backtest vs NBA production ----
def nba(yr):
    n = pd.read_parquet(BD / f"nba_pb_{yr}.parquet"); n = n[(n.season_type == 2) & (n.minutes.fillna(0) > 0)]
    n["gs"] = (n.points + 0.4*n.field_goals_made - 0.7*n.field_goals_attempted - 0.4*(n.free_throws_attempted - n.free_throws_made)
               + 0.7*n.offensive_rebounds + 0.3*n.defensive_rebounds + n.steals + 0.7*n.assists + 0.7*n.blocks - 0.4*n.fouls - n.turnovers)
    return n.groupby(n.athlete_display_name.map(norm)).gs.sum()
N25, N26 = nba(2025), nba(2026); k = df.player.map(norm)
df["out"] = np.where(df.cls == 2024, k.map(N25).fillna(0) + k.map(N26).fillna(0), np.where(df.cls == 2025, k.map(N26).fillna(0), np.nan))
def old(d):
    t = 0
    for kk, w in W.items(): t = t + w * (d[kk] - d[kk].mean()) / d[kk].std() * (-1 if kk == "tov40" else 1)
    return t
bt = {"classes": {}, "note": "Spearman rank correlation between each ranking and NBA production (total Game Score: 2024 class over two seasons, 2025 class over one). 1.0 = perfect, 0 = no relationship."}
for c, x in df[df.cls < 2026].groupby("cls"):
    bt["classes"][str(c)] = {"n": int(len(x)), "draft_order": round(spearmanr(-x.pick, x.out)[0], 2),
        "model_v1": round(spearmanr(old(x), x.out)[0], 2), "model_v2": round(spearmanr(x.raw, x.out)[0], 2)}
t = df[df.cls < 2026]
bt["all"] = {"n": int(len(t)), "draft_order": round(spearmanr(-t.pick, t.out)[0], 2), "model_v1": round(spearmanr(pd.concat([old(x) for _, x in t.groupby("cls")]), t.out)[0], 2), "model_v2": round(spearmanr(t.raw, t.out)[0], 2)}
(R / "data/draft_backtest.json").write_text(json.dumps(bt))
print(json.dumps(bt))
# ---- write 2026 board ----
x = df[df.cls == 2026].copy()
x["score"] = 100 * (x.raw - x.raw.min()) / (x.raw.max() - x.raw.min()); x["mrank"] = x.raw.rank(ascending=False, method="first").astype(int)
zc = ["pts40", "ts", "reb40", "ast40", "stocks40", "tov40", "margin", "usg"]
out = []
for pick, f in sorted(base.items()):
    r = x[x.pick == pick]
    if r.empty: print("NOT SCORED:", f[1]); continue
    r = r.iloc[0]; i = r.name
    f = f[:20] + [f"{Z[k][i]:.3f}" for k in zc] + [f[28], r.grp, f"{r.age:.1f}", f"{r.blend:.2f}", f"{r.score:.1f}", str(r.mrank), f"{Z['age'][i]:.3f}"]
    out.append("|".join(f))
(R / "data/draft.txt").write_text("\n".join(out) + "\n")
print("draft.txt rewritten:", len(out), "players |", x.grp.value_counts().to_dict())

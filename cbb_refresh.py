"""Weekly college basketball refresh (same model as cbb_efficiency.py).

Usage: python3 cbb_refresh.py --box team_box_2027.parquet --season 2026-27
Keeps last season's final ratings until the median team has played MIN_SWITCH games,
then rewrites data/teams.txt and data/cbb.json with the new season.
"""
import argparse, json, pathlib, datetime
import numpy as np, pandas as pd

R = pathlib.Path(__file__).parent
ap = argparse.ArgumentParser(); ap.add_argument("--box", required=True); ap.add_argument("--season", default="2026-27")
a = ap.parse_args()
HCA, ITER, MIN_SWITCH = 0.014, 100, 5

tb = pd.read_parquet(a.box)
tb = tb[tb["season_type"].isin([2, 3])].copy()
if tb.empty: print("No games yet; keeping last season."); raise SystemExit(0)
tb["tov"] = tb["total_turnovers"].fillna(tb["turnovers"]) if "total_turnovers" in tb else tb["turnovers"]
tb["poss_est"] = tb["field_goals_attempted"] - tb["offensive_rebounds"] + tb["tov"] + 0.475 * tb["free_throws_attempted"]
opp = tb[["game_id", "team_id", "poss_est"]].rename(columns={"team_id": "opponent_team_id", "poss_est": "opp_poss_est"})
g = tb.merge(opp, on=["game_id", "opponent_team_id"], how="inner")
g["poss"] = (g["poss_est"] + g["opp_poss_est"]) / 2
g = g[g["poss"] > 40]
counts = g["team_id"].value_counts()
med = float(counts.median()) if len(counts) else 0
if med < MIN_SWITCH:
    print(f"Median team has {med:.0f} games (< {MIN_SWITCH}); keeping last season's final ratings."); raise SystemExit(0)
min_games = max(3, int(med * 0.6))
d1 = set(counts[counts >= min_games].index)
g = g[g["team_id"].isin(d1) & g["opponent_team_id"].isin(d1)].copy()
g["OE"] = 100 * g["team_score"] / g["poss"]; g["DE"] = 100 * g["opponent_team_score"] / g["poss"]
loc = g["team_home_away"].map({"home": 1, "away": -1}).fillna(0)
g["OE_n"] = g["OE"] / (1 + HCA * loc); g["DE_n"] = g["DE"] * (1 + HCA * loc)
d = pd.to_datetime(g["game_date"]); span = (d.max() - d.min()) or pd.Timedelta(days=1)
g["w"] = 1 + 0.5 * (d - d.min()) / span
avg = np.average(g["OE"], weights=g["w"]); avgT = g["poss"].mean()
adjO = g.groupby("team_id")["OE_n"].mean(); adjD = g.groupby("team_id")["DE_n"].mean(); adjT = g.groupby("team_id")["poss"].mean()
for _ in range(ITER):
    oppD = g["opponent_team_id"].map(adjD); oppO = g["opponent_team_id"].map(adjO); oppT = g["opponent_team_id"].map(adjT)
    g["aO"] = g["OE_n"] * avg / oppD; g["aD"] = g["DE_n"] * avg / oppO; g["aT"] = g["poss"] * avgT / oppT
    wsum = g.groupby("team_id")["w"].sum()
    wavg = lambda col: (g[col] * g["w"]).groupby(g["team_id"]).sum() / wsum
    newO, newD, newT = wavg("aO"), wavg("aD"), wavg("aT")
    newO *= avg / newO.mean(); newD *= avg / newD.mean(); newT *= avgT / newT.mean()
    delta = (newO - adjO).abs().max() + (newD - adjD).abs().max()
    adjO, adjD, adjT = newO, newD, newT
    if delta < 1e-4: break
info = (g.sort_values("game_date").groupby("team_id")
        .agg(team=("team_location", "last"), abbr=("team_abbreviation", "last"), color=("team_color", "last"),
             games=("game_id", "count"), wins=("team_winner", "sum"), rawO=("OE", "mean"), rawD=("DE", "mean")))
out = info.join(pd.DataFrame({"adjO": adjO, "adjD": adjD, "adjT": adjT}))
out["wins"] = out["wins"].astype(int); out["losses"] = out["games"] - out["wins"]
out["adjEM"] = out["adjO"] - out["adjD"]
out["pyth"] = out["adjO"] ** 11.5 / (out["adjO"] ** 11.5 + out["adjD"] ** 11.5)
g["oppEM"] = g["opponent_team_id"].map(out["adjEM"]); out["sos"] = g.groupby("team_id")["oppEM"].mean()
out = out.sort_values("adjEM", ascending=False).reset_index()
out["rank"] = np.arange(1, len(out) + 1)
out["rankO"] = out["adjO"].rank(ascending=False, method="min").astype(int)
out["rankD"] = out["adjD"].rank(ascending=True, method="min").astype(int)
out["rankT"] = out["adjT"].rank(ascending=False, method="min").astype(int)
em = out.set_index("team_id")["adjEM"]; tt = out.set_index("team_id")["adjT"]
bt = g[g["team_home_away"] == "home"].copy()
bt["pred"] = (bt["team_id"].map(em) - bt["opponent_team_id"].map(em)) * (bt["team_id"].map(tt) + bt["opponent_team_id"].map(tt)) / 200 + 3.0
bt["actual"] = bt["team_score"] - bt["opponent_team_score"]
bt["hit"] = np.sign(bt["pred"]) == np.sign(bt["actual"])
post = bt[bt["season_type"] == 3]
bts = {"games": int(len(bt)), "acc": round(float(bt["hit"].mean()), 3), "mae": round(float((bt["pred"] - bt["actual"]).abs().mean()), 2),
       "post_games": int(len(post)), "post_acc": round(float(post["hit"].mean()), 3) if len(post) else 0}
lines = []
for r in out.itertuples():
    color = str(r.color or "556677").replace("#", "")
    lines.append("|".join(str(x) for x in [r.rank, int(r.team_id), r.team, r.abbr, color, int(r.games), int(r.wins), int(r.losses),
        round(r.adjO, 2), round(r.adjD, 2), round(r.adjEM, 2), round(r.adjT, 2), round(r.rawO, 2), round(r.rawD, 2),
        round(r.pyth, 2), round(r.sos, 2), int(r.rankO), int(r.rankD), int(r.rankT)]))
(R / "data/teams.txt").write_text("\n".join(lines) + "\n")
label = a.season.replace("-", "–")
json.dump({"season": a.season, "label": label, "final": False, "avg": round(float(avg), 2), "avgT": round(float(avgT), 2),
           "backtest": bts, "updated": datetime.date.today().isoformat()}, open(R / "data/cbb.json", "w"))
print(f"CBB {a.season}: {len(out)} teams, median {med:.0f} games, No. 1 {out.iloc[0].team}, backtest {bts}")

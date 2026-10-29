"""Weekly: record each 2026 draftee's CURRENT NBA team from ESPN rosters, so trades after draft night show correctly.

Usage: python3 nba_teams.py <nba_rosters*.json from Downloads>
Get that file with nba_rosters_snippet.js in Chrome (on https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams).
Writes data/nba_teams.json {fetched, picks: {pick: espnTeamCode}, unsigned: [...]}.
The page uses: team in his latest NBA game (rookies.json) > this roster file > draft-night team (NBA_PICK in src/app.js).
Exits 1 (do not publish) if the roster file looks broken (not 30 teams / too few players)."""
import json, sys, re, unicodedata, pathlib, datetime
R = pathlib.Path(__file__).parent
src = json.loads(pathlib.Path(sys.argv[1]).read_text())
players, teams = src.get("players", {}), src.get("teams", {})
if len(teams) != 30 or len(players) < 400:
    sys.exit(f"ROSTER CHECK FAILED: {len(teams)} teams, {len(players)} players in {sys.argv[1]}; data/nba_teams.json left unchanged")
norm = lambda s: " ".join(re.sub(r"\b(jr|sr|ii|iii|iv)\b", "", re.sub(r"[^a-z ]", "", unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower())).split())
roster = {norm(n): t for n, t in players.items()}
app = (R / "src/app.js").read_text()
board = {int(k): v.split()[0] for k, v in re.findall(r'(\d+):"([a-z]+(?: T)?)"', re.search(r"const NBA_PICK = (\{.*?\});", app, re.S).group(1))}
picks, unsigned, moved = {}, [], []
for line in (R / "data/draft.txt").read_text().strip().split("\n"):
    f = line.split("|"); pick, name = int(f[0]), f[1]
    t = roster.get(norm(name))
    if t:
        picks[str(pick)] = t
        if board.get(pick) and board[pick] != t: moved.append(f"pick {pick} {name}: {board[pick]} -> {t}")
    else: unsigned.append(f"{pick} {name}")
out = {"fetched": src.get("fetched", datetime.date.today().isoformat()), "teams": teams, "picks": picks, "unsigned": unsigned}
(R / "data/nba_teams.json").write_text(json.dumps(out, indent=1))
print(f"NBA rosters: {len(picks)} draftees on NBA rosters, {len(unsigned)} not on a roster (stashed/unsigned/G League)")
for m in moved: print("  team changed since draft night:", m)

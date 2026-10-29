// Run in Chrome (javascript tool) while on https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams
// Saves Downloads/nba_rosters.json; then: python3 nba_teams.py "<newest nba_rosters*.json in Downloads>"
const t = JSON.parse(document.body.innerText); const teams = t.sports[0].leagues[0].teams.map(x => x.team); const out = {}, names = {};
await Promise.all(teams.map(async tm => { names[tm.abbreviation.toLowerCase()] = tm.name;
  const r = await (await fetch(`/apis/site/v2/sports/basketball/nba/teams/${tm.id}/roster`)).json();
  for (const a of (r.athletes || [])) out[a.fullName || a.displayName] = tm.abbreviation.toLowerCase(); }));
const b = new Blob([JSON.stringify({fetched: new Date().toISOString(), source: "ESPN NBA team rosters", teams: names, players: out})], {type: "application/json"});
const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "nba_rosters.json"; document.body.appendChild(a); a.click(); a.remove();
JSON.stringify({teams: teams.length, players: Object.keys(out).length});

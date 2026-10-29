# Weekly portfolio update (every Wednesday)

Live site: https://stevetrombetta-analytics-portfolio.netlify.app/
Netlify project: https://app.netlify.com/projects/stevetrombetta-analytics-portfolio/overview

## What updates
| Project | Source | Script | Notes |
| --- | --- | --- | --- |
| 01 College basketball | sportsdataverse team_box_2027.parquet | cbb_refresh.py | Waits until the median team has 5 games (mid-Nov); until then the 2025-26 final ratings stay up |
| 02 NBA draft board + Rookie Report | sportsdataverse player_box_2027.parquet | rookie_refresh.py | Season tips off Oct 20, 2026; before that the page shows a countdown |
| 03 NFL receivers | nflverse ngs_receiving.csv.gz | refresh.py --ngs | |
| 04 NHL defensemen | MoneyPuck skaters CSV (Chrome download) | refresh.py --mp | |

The "answer" text and Unsung Hero cards are computed on the page from the data, so they update on their own.

## Folder layout (Desktop > Project Portfolio > website source)
- src/        page pieces: body.html, style.css, app.js, quad.js
- data/       teams.txt + cbb.json (college), draft.txt (draft), rookies.json (rookie report), quad.json (NFL + NHL)
- data/teams_2025-26_final.txt  backup of last season's final college ratings
- build.py    stitches everything into dist/index.html (the file that gets published)

## Steps
1. Downloads (device shell has GitHub access):
   B=https://github.com/sportsdataverse/sportsdataverse-data/releases/download
   curl -sSL -o ~/team_box_2027.parquet $B/espn_mens_college_basketball_team_boxscores/team_box_2027.parquet
   curl -sSL -o ~/player_box_2027.parquet $B/espn_nba_player_boxscores/player_box_2027.parquet
   curl -sSL -o ~/ngs_receiving.csv.gz https://github.com/nflverse/nflverse-data/releases/download/nextgen_stats/ngs_receiving.csv.gz
   (A 404 / 9-byte file means that season hasn't started; skip that step.)
2. NHL: on moneypuck.com/data.htm in Chrome, fetch('/moneypuck/playerData/seasonSummary/2026/regular/skaters.csv') and save to Downloads.
3. pip install --user pyarrow   (if parquet reading fails)
4. python3 cbb_refresh.py --box ~/team_box_2027.parquet --season 2026-27
   python3 rookie_refresh.py --box ~/player_box_2027.parquet
   python3 refresh.py --ngs ~/ngs_receiving.csv.gz --mp <newest moneypuck_skaters_2026*.csv in Downloads>
   python3 build.py
5. Publish dist/index.html on Netlify ("Drop a folder, .zip, or HTML file"), then check the live site.

## Consistency rules (added Oct 15, 2026)
- refresh.py checks the new data before saving it (no duplicate players, values in sane ranges, row counts didn't collapse, weeks/games never go backwards). If it prints VALIDATION FAILED it exits without changing anything: DO NOT publish that week; report the reason.
- Every successful refresh saves a full copy of the data to data/history/YYYY-MM-DD/, so past weeks are never overwritten.
- "What I found" and the Unsung Hero cards are computed once from the official weekly cut (the default view: WRs 4+ targets per game, TEs 3+, defensemen 18+ min per game in half their team's games). Moving sliders or switching seasons only changes the chart, so the answer only changes when the weekly data changes.
- Hero log: data/history/heroes.csv (date,sport,candidate,hero). After publishing, append 4 lines (cbb, nba, nfl, nhl) using each '.verdict' box's data-candidate and data-hero attributes on the live page (#vCBB, #vDraft, #vNFL, #vNHL). The page uses this log for the 2-week hold rule (a new hero must lead two refreshes in a row) and the "Previous heroes" line.
- NFL target share and EPA per target come from nflverse's official season stats (stats_player_reg_2025/2026.parquet), passed to refresh.py with --stats. Yards per route run is NOT used: nflverse has no 2026 route (participation) data.
- NHL hits, blocks, takeaways and giveaways come from the same MoneyPuck file (current season only; 2025-26 shows a dash).
- The NHL hover trend line is built from the weekly snapshots in data/history, so it fills in one point per week.
- Build only from this folder. It is the single source of truth.

## Draft model v2 (Oct 17, 2026)
- The 2026 draft board is scored offline by draft_model/draft_model.py (position groups guards/wings/bigs, prior-season blend under 450 minutes, age = ~29% of score). It does not change weekly; rerun only if the method changes: python3 draft_model/draft_model.py --box-dir <folder with mbb_pb_2023-2026 + nba_pb_2025-2026 parquet>.
- Backtest on the 2024 + 2025 classes is saved to data/draft_backtest.json and shown on the site (v2 0.22 vs. v1 -0.02 vs. draft order 0.49).
- The old v1 board is kept at data/history/draft_v1_before_model_v2.txt. The NBA hero log was reset when the model changed.

## Pre-publish check + NBA early-season fix (Oct 22, 2026)
- NBA card: until 5 college draftees have 3+ NBA games, the card keeps the draft-board view (model steals/reaches) and the model's late-round hero, with that player's NBA games so far. After that it switches to the model-vs-scouts scoreboard. If no late pick (20+) has 3+ games yet, the hero falls back to the draft-board pick, so the card is never empty. Old version saved at data/history/app_before_2026-10-22.js.
- check_build.py renders dist/index.html in headless Chromium (run in the cloud container, which has Playwright) and fails if any chart is missing, any Unsung Hero card is empty, any list is empty, any card lacks data-candidate/data-hero, there are JS errors, or the page's NFL weeks / NHL games don't match data/quad.json. Never publish when it fails.
  python3 check_build.py dist/index.html --expect-nfl-weeks <N> --expect-nhl-gp <N>
- The weekly run always sends Steve a notification with the result.

## Self-hosted logos + image fallbacks (Oct 22, 2026)
- Why: on Oct 22 the Canucks logos showed as broken images because ESPN's logo CDN briefly failed in the visitor's browser.
- All team logos (365 college, 30 NBA, 32 NFL, 32 NHL, Arsenal) are now embedded in the page from data/logos.json (built in by build.py as LOGOS). The page no longer loads team logos from ESPN at all.
- src/logos.js: if any image still fails (headshots, or a team not in the pack), it retries once, then shows a neat team-code badge (logos) or falls back to the team logo / hides it (headshots). The browser's broken-image icon never shows.
- check_build.py now also fails if any team logo the page uses is missing from data/logos.json (e.g. a new team code), and lists the missing "league/id" keys.
  Fix: set KEYS in logo_pack_snippet.js to those keys, run it in Chrome on the live site (saves Downloads/portfolio_logos_add.json), then
  python3 add_logos.py "$HOME/mnt/Downloads/portfolio_logos_add.json" && python3 build.py, and re-run the check.
- Files before this change: data/history/before_logo_pack_2026-10-22/.

## NBA current teams (Oct 22, 2026)
- Why: the draft board used draft-night teams only, so players traded later showed the wrong team (Koa Peat showed Mavericks, he's on the Suns; 7 draftees in all).
- Each draftee's team is now: team in his latest NBA game (rookies.json) > ESPN current roster (data/nba_teams.json) > draft-night team (NBA_PICK in src/app.js). Traded players show "(drafted by X)".
- Weekly step (before build.py): in Chrome open https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams, run nba_rosters_snippet.js, then
  python3 nba_teams.py "<newest nba_rosters*.json in Downloads>"   (prints any team changes; exits 1 if the roster file looks broken)
- check_build.py fails if any draftee shows a team different from his latest game/roster, or if data/nba_teams.json is missing or more than 9 days old.

## Oct 29, 2026: back to the published version + moved to GitHub
- The Oct 25 brainstorm changes (college v2 + predictions, 2027 prospects, project index) were never published and are NOT part of the site. Steve decided to stay with the published (Oct 22) version and only update data.
- The source folder was rebuilt from the live page, so build.py reproduces the published site exactly. Brainstorm files are kept in "older site versions/brainstorm version 2026-10-25 (source)" and website source/brainstorm_only/ (not in the repo).
- College: cbb_refresh.py is the v1 script again: python3 cbb_refresh.py --box <team_box_2027.parquet> --season 2026-27 (keeps 2025-26 final until the median team has 5 games). No --sched, no prospects step.
- Hosting moved from Netlify (15 credits per publish) to GitHub Pages (free):
  Repo: https://github.com/steves-sports-analytics/steves-sports-analytics.github.io
  Site: https://steves-sports-analytics.github.io/
  build.py now also writes docs/index.html; GitHub Pages serves main branch /docs.
- Publishing = uploading the changed files to the repo (main branch) and committing; Pages republishes in about a minute. Try bigger changes on a separate branch first.
- The old Netlify site stays up with the Oct 22 data until Steve decides what to do with it.

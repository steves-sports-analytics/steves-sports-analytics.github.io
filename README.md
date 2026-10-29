# Steve Trombetta · Sports Analytics Notebook

Live site: https://steves-sports-analytics.github.io/

A one-page sports analytics portfolio that answers common sports talking points with data, refreshed weekly:

| Project | Question | Data |
| --- | --- | --- |
| College basketball | Is this team actually good, or just hyped? | ESPN box scores via sportsdataverse |
| 2026 NBA draft + Rookie Report | Did NBA teams get it right? | ESPN college + NBA box scores via sportsdataverse |
| NFL receivers | Is he actually good, or does his quarterback make him look good? | nflverse Next Gen Stats + season stats |
| NHL defensemen | Who actually defends, not just scores? | MoneyPuck |

## How it's built
- `src/` page pieces (HTML, CSS, JS); `data/` the weekly data the page reads.
- `*_refresh.py` / `refresh.py` pull and validate each week's data; `build.py` stitches everything into one self-contained page (`docs/index.html`, served by GitHub Pages).
- `check_build.py` renders the page in headless Chromium and fails on missing charts, empty cards or JS errors.
- `data/history/` keeps a snapshot of every weekly refresh plus the Unsung Hero log.
- Weekly process: see `WEEKLY_UPDATE.md`.

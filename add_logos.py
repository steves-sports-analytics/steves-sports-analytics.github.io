"""Merge newly downloaded team logos into data/logos.json (the embedded logo pack).
Usage: python3 add_logos.py <portfolio_logos*.json from Downloads>
Get that file by running logo_pack_snippet.js in Chrome on the live site (set KEYS to the missing "league/id" keys
that check_build.py lists, e.g. ["nhl/van","ncaa/2509"]). Never removes existing logos."""
import json, sys, pathlib
R = pathlib.Path(__file__).parent
pack_p = R/"data/logos.json"
pack = json.loads(pack_p.read_text()) if pack_p.exists() else {}
new = json.loads(pathlib.Path(sys.argv[1]).read_text())
bad = [k for k, v in new.items() if not (isinstance(v, str) and v.startswith("data:image/") and len(v) > 300)]
if bad: sys.exit(f"Not added, invalid images for: {bad}")
added = [k for k in new if k not in pack]
pack.update(new)
pack_p.write_text(json.dumps(pack, separators=(",", ":")))
print(f"added {len(added)} ({', '.join(added) or 'none new'}); pack now {len(pack)} logos")

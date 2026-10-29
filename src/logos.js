/* ================= SELF-HOSTED LOGOS + IMAGE FALLBACKS (added Oct 22, 2026) =================
   Team logos are embedded in the page (data/logos.json -> LOGOS, keyed "league/espnId"), so a slow or
   flaky ESPN CDN can never leave a broken logo. Anything still loaded from another site (headshots,
   a team missing from the pack) falls back cleanly instead of showing the browser's broken-image icon. */
(() => {
"use strict";
const L = (typeof LOGOS !== "undefined" && LOGOS) || {};
const cdn = (lg, id, s) => `https://a.espncdn.com/combiner/i?img=/i/teamlogos/${lg}/500/${id}.png&w=${s}&h=${s}`;
window.__logoMiss = new Set();   // keys not in the pack; check_build.py fails the build if any are used
window.logoSrc = (lg, id, s = 80) => L[`${lg}/${String(id).toLowerCase()}`] || L[`${lg}/${id}`] || (window.__logoMiss.add(`${lg}/${String(id).toLowerCase()}`), cdn(lg, id, s));
// neutral badge used only if a logo can't load at all (shows the team code, never a broken icon)
const badge = txt => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#e9e4d8" stroke="#bdb6a6" stroke-width="2"/>${txt ? `<text x="32" y="38" font-family="Inter,Arial,sans-serif" font-size="${txt.length > 3 ? 13 : 16}" font-weight="700" fill="#555" text-anchor="middle">${txt}</text>` : ""}</svg>`);
window.logoBadge = badge;
const idOf = u => { const m = /teamlogos\/(\w+)\/500\/([\w-]+)\.png/.exec(u || ""); return m ? [m[1], m[2]] : null; };
const fix = el => {
  const isSvg = el.tagName.toLowerCase() === "image";
  const u = isSvg ? (el.getAttribute("href") || el.getAttribute("xlink:href")) : el.getAttribute("src");
  if (!u || u.startsWith("data:")) return;
  const t = idOf(u); if (t && !L[`${t[0]}/${t[1]}`]) window.__logoMiss.add(`${t[0]}/${t[1]}`); const tries = +(el.dataset ? el.dataset.retry || 0 : 0);
  const set = v => isSvg ? el.setAttribute("href", v) : (el.src = v);
  if (t && L[`${t[0]}/${t[1]}`]) return set(L[`${t[0]}/${t[1]}`]);
  if (tries < 1 && el.dataset){ el.dataset.retry = tries + 1;            // one retry (plain CDN path for logos)
    return setTimeout(() => set(t ? `https://a.espncdn.com/i/teamlogos/${t[0]}/500/${t[1]}.png` : u + (u.includes("?") ? "&" : "?") + "r=1"), 400); }
  if (t) return set(badge(/^\d+$/.test(t[1]) ? "" : t[1].toUpperCase()));
  // headshots and anything else: let the existing handler swap to the logo, otherwise just hide it
  if (!isSvg && el.closest(".pf")) { el.closest(".pf").classList.add("nf"); return; }
  el.style.visibility = "hidden";
};
document.addEventListener("error", e => { const el = e.target; if (el && (el.tagName === "IMG" || el.tagName === "image")) fix(el); }, true);
window.__lgFail = img => fix(img);
// static logos written into the page HTML (Favorites section)
document.querySelectorAll("img[data-lg][data-id]").forEach(i => { const k = `${i.dataset.lg}/${i.dataset.id}`; if (L[k]) i.src = L[k]; else window.__logoMiss.add(k); });
// sweep for anything that failed before this script ran
const sweep = () => document.querySelectorAll("img").forEach(i => { if (i.complete && i.naturalWidth === 0 && i.getAttribute("src") && !i.src.startsWith("data:") && i.style.visibility !== "hidden") fix(i); });
window.addEventListener("load", sweep); setTimeout(sweep, 6000);
})();

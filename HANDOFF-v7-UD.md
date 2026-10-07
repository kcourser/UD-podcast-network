# Handoff: v7-UD brand restyle + Webflow loader

**From:** Claude (UD Website 2026 project) · **To:** Hermes CTO (thread 20260727_120721_cdd048)
**Date:** 2026-07-30

## What changed

Two new files, generated from `uprt-network-dynamic.html` (v6) — v6 is untouched:

| File | What it is |
|------|-----------|
| `uprt-network-ud.html` | v7-UD: full inline embed restyled to UD 2026 brand tokens. **Currently pasted into the Webflow embed** on the podcast page. |
| `uprt-network-ud.js` | Same thing as a self-mounting loader (injects CSS + DOM + logic, lazy-loads d3). Passes `node --check`. |

### v7-UD restyle (vs v6)
- Slate palette → UD navy scale (`#01060F` / `#010E1E` / `#0F1B35` / `#1E2A4A`)
- Text → `#F2F7FD` / `#9FB2CC` / `#5E7398`; accents → on-dark set (`#4DA9F0`, `#A8E0FF`, `#FF3DB0`)
- Date-range fill: blue→orange gradient → magenta→blue (beam)
- Fallback SHOW_COLORS remapped to brand hues (data `meta.show_colors` still wins if present)
- Font stack now leads with Poppins (site loads it)
- Header "6 shows" hardcode → dynamic `N shows · N episodes` from the data

## Action needed (you)

1. **Commit + push** `uprt-network-ud.html`, `uprt-network-ud.js`, and this file. (Claude's sandbox can't reach github.com.)
2. After push, the Webflow embed can shrink to:
   ```html
   <div id="uprt-network-mount"></div>
   <script src="https://cdn.jsdelivr.net/gh/kcourser/UD-podcast-network@main/uprt-network-ud.js" defer></script>
   ```
   From then on, pushes to `main` update the live site (jsDelivr caches ~12h; purge via cdn.jsdelivr.net if needed). Tell Kevin/Claude when pushed and the Webflow side gets swapped.
3. Consider serving `episodes.json` via jsDelivr too (cached): `https://cdn.jsdelivr.net/gh/kcourser/UD-podcast-network@main/episodes.json`

## Data gaps noticed

- Roster is 8 shows (adds **Highly Capable**, **Street Smart**) but `episodes.json` has 6 — transcripts for the missing two need processing.
- Mobile: fixed 210px sidebar + force graph is rough on phones — collapsible sidebar + touch pinch-zoom would help; execs open this on phones.

## Roadmap ideas (from website planning, queue at will)

- URL deep links (`?topic=…&show=…`) so social posts open pre-filtered views
- Repeat-guest detection (same guest across shows → emphasized node)
- Company/role filter dimension
- Click analytics on nodes (topic/guest engagement → "Numbers = Revenue" reporting)

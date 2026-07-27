# UD-podcast-network

Upright Digital multi-show podcast **episode network graph** (Webflow embed + data pipeline).

**Owner:** Hermes CTO profile (handed off from Claude, 2026-07-27)  
**Repo:** https://github.com/kcourser/UD-podcast-network  
**Live data:** `https://raw.githubusercontent.com/kcourser/UD-podcast-network/main/episodes.json`

## Product rule — listen links

- If an episode has a **YouTube** URL → show **YouTube only** (node click + tooltip).
- If **Spotify only** (no video) → show **Spotify**.
- If both exist in `episodes.json` → **YouTube wins**; do not show both buttons.
- Topic timestamp jumps apply only when the primary link is YouTube.

## Layout

| Path | Role |
|------|------|
| `uprt-network-dynamic.html` | **Canonical** Webflow embed (v5+) |
| `petronoia-network-dynamic.html` | Earlier variant (same link rule) |
| `episodes.json` | Graph data (shows, guests, topics, urls) |
| `transcripts/<Show>/*.docx` | Source transcripts |
| `process_transcript.py` | Single-file processor (GitHub Actions) |
| `bulk_process_all.py` | Full corpus processor (local; skips existing unless `--force`) |
| `.github/workflows/process-transcript.yml` | On push of new/changed docx |

## Ops (Hermes)

```bash
cd ".../UD-podcast-network"

# Preview new transcripts without API
python3 bulk_process_all.py --dry-run

# Process only NEW docx (needs ANTHROPIC_API_KEY for topics)
ANTHROPIC_API_KEY=... python3 bulk_process_all.py

# Full re-topic (expensive) — avoid for URL-only work
ANTHROPIC_API_KEY=... python3 bulk_process_all.py --force

# After episodes.json or HTML change
git add episodes.json uprt-network-dynamic.html
git commit -m "..."
git push origin main
```

**URL-only backfill** (no Claude): re-extract YT/Spotify from docx text into JSON for files already processed — use when links were pasted into transcripts after initial process. Prefer this over `--force`.

New transcripts: push `.docx` under `transcripts/` → Action updates `episodes.json`.

## Webflow

Paste contents of `uprt-network-dynamic.html` into an Embed. Graph fetches `episodes.json` from GitHub `main` raw URL — push data to update the site without re-pasting HTML unless the embed itself changed.

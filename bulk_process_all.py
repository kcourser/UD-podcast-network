#!/usr/bin/env python3
"""
Upright Digital — Bulk Transcript Processor
============================================
Run from the GitHub repo root to process ALL transcripts across all shows.

Requirements:
  pip install anthropic python-docx

Usage:
  ANTHROPIC_API_KEY=sk-ant-... python3 bulk_process_all.py
  ANTHROPIC_API_KEY=sk-ant-... python3 bulk_process_all.py --force      # reprocess everything
  ANTHROPIC_API_KEY=sk-ant-... python3 bulk_process_all.py --dry-run    # preview only
"""

import os
import sys
import re
import json
import datetime
from pathlib import Path

try:
    from docx import Document
except ImportError:
    print("ERROR: python-docx not installed. Run: pip install python-docx")
    sys.exit(1)

try:
    import anthropic
except ImportError:
    print("ERROR: anthropic not installed. Run: pip install anthropic")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

SHOW_COLORS = {
    "PetroNoia":             "#f97316",
    "Oil Field 360":         "#f59e0b",
    "Energy Espresso":       "#a16207",
    "The IT Crowd":          "#06b6d4",
    "The Energy Pipeline":   "#3b82f6",
    "In Basin Observations": "#10b981",
}

TOPIC_COLORS = {
    "Energy Policy":         "#0ea5e9",
    "Oil & Gas":             "#0369a1",
    "Energy Transition":     "#22d3ee",
    "Nuclear Energy":        "#06b6d4",
    "Natural Gas":           "#0891b2",
    "Data Centers & AI":     "#38bdf8",
    "Climate & Environment": "#0e7490",
    "ESG & Finance":         "#67e8f9",
    "Geothermal & Storage":  "#155e75",
    "Energy Geopolitics":    "#7dd3fc",
    "Energy Economics":      "#bae6fd",
    "Industry & Technology": "#164e63",
}

TOPIC_KEYWORDS = {
    "Energy Policy":         ["policy", "legislation", "congress", "administration", "regulation", "federal", "government", "bill", "law"],
    "Oil & Gas":             ["oil", "gas", "petroleum", "barrel", "upstream", "downstream", "drilling", "reservoir", "hydrocarbon", "permian", "shale"],
    "Energy Transition":     ["transition", "clean energy", "renewable", "decarboniz", "electrif", "net zero", "carbon neutral", "low carbon"],
    "Nuclear Energy":        ["nuclear", "reactor", "fission", "fusion", "uranium", "SMR", "small modular", "radiation", "atomic"],
    "Natural Gas":           ["natural gas", "LNG", "methane", "pipeline", "gas storage"],
    "Data Centers & AI":     ["data center", "artificial intelligence", " AI ", "hyperscaler", "compute", "server", "cooling"],
    "Climate & Environment": ["climate", "emission", "greenhouse", "carbon", "EPA", "environment", "CO2", "hurricane"],
    "ESG & Finance":         ["ESG", "invest", "fund", "capital", "finance", "shareholder", "sustainable finance", "portfolio"],
    "Geothermal & Storage":  ["geothermal", "thermal storage", "GeoTES", "subsurface", "geologic storage", "grid storage"],
    "Energy Geopolitics":    ["geopolit", "middle east", "iran", "saudi", "OPEC", "russia", "china", "energy security", "supply chain"],
    "Energy Economics":      ["econom", "market", "price", "cost", "revenue", "profit", "GDP", "commerci", "business model"],
    "Industry & Technology": ["technology", "innovation", "engineer", "oilfield", "service company", "Baker Hughes", "geoscience"],
}

# Maps filename prefix → canonical show name
PREFIX_TO_SHOW = {
    "PN":    "PetroNoia",
    "OF360": "Oil Field 360",
    "EEP":   "Energy Espresso",
    "TEP":   "The Energy Pipeline",
    "TIC":   "The IT Crowd",
    "IBO":   "In Basin Observations",
}

# Maps folder name → canonical show name (for fallback)
FOLDER_TO_SHOW = {
    "petronoia":             "PetroNoia",
    "oilfield 360":          "Oil Field 360",
    "oil field 360":         "Oil Field 360",
    "energy espresso":       "Energy Espresso",
    "the it crowd":          "The IT Crowd",
    "the energy pipeline":   "The Energy Pipeline",
    "in basin observations": "In Basin Observations",
}

# Standard filename pattern: PREFIX-MM-YY-Guest Name.docx
FILENAME_PATTERN = re.compile(
    r'^([A-Z0-9]+)-(\d{2})-(\d{2})-(.+)\.docx$', re.IGNORECASE
)

REPO_ROOT    = Path(__file__).parent
DATA_FILE    = REPO_ROOT / "episodes.json"
TRANSCRIPTS  = REPO_ROOT / "transcripts"

# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_filename(filename: str) -> dict:
    """Parse metadata from standardised filename like PN-08-25-Lyndsey Merrill.docx"""
    m = FILENAME_PATTERN.match(filename)
    if not m:
        return {}
    prefix, month, year, guest = m.group(1).upper(), m.group(2), m.group(3), m.group(4)
    show = PREFIX_TO_SHOW.get(prefix)
    if not show:
        return {}
    # Treat XX-XX as unknown date
    if month == 'XX' or year == 'XX':
        date = datetime.date.today().isoformat()
    else:
        full_year = int("20" + year)
        date = f"{full_year}-{month}-01"
    return {"show": show, "date": date, "guest_hint": guest}


def show_from_path(docx_path: Path) -> str:
    """Determine show name from the top-level transcripts subfolder."""
    try:
        rel = docx_path.relative_to(TRANSCRIPTS)
        folder = rel.parts[0].lower()
        return FOLDER_TO_SHOW.get(folder, rel.parts[0])
    except ValueError:
        return "PetroNoia"


def extract_text(docx_path: Path) -> str:
    doc = Document(str(docx_path))
    return " ".join(p.text for p in doc.paragraphs if p.text.strip())


def extract_urls(text: str) -> dict:
    yt_patterns = [
        r'https?://(?:www\.)?youtube\.com/watch\?v=[\w-]+',
        r'https?://youtu\.be/[\w-]+',
    ]
    sp_patterns = [
        r'https?://open\.spotify\.com/episode/[\w]+(?:\?[^\s]*)?',
        r'https?://spotify\.com/[\w/]+',
    ]
    yt_url, sp_url = '', ''
    for pat in yt_patterns:
        m = re.search(pat, text)
        if m:
            yt_url = m.group(0).rstrip('.,)'); break
    for pat in sp_patterns:
        m = re.search(pat, text)
        if m:
            sp_url = m.group(0).rstrip('.,)'); break
    return {'url': yt_url, 'spotify_url': sp_url}


def ts_to_seconds(ts: str) -> int:
    parts = ts.split(':')
    return int(parts[0])*3600 + int(parts[1])*60 + int(parts[2]) if len(parts)==3 else 0


def extract_timestamps(text: str, topics: list, base_yt_url: str) -> dict:
    if not base_yt_url:
        return {}
    base_url = re.sub(r'[&?]t=\d+', '', base_yt_url)
    segments = re.findall(r'\[(\d{2}:\d{2}:\d{2})\]\s*([^[]{0,300})', text)
    if not segments:
        return {}
    timestamps = {}
    for topic in topics:
        keywords = TOPIC_KEYWORDS.get(topic, [topic.lower()])
        for ts, snippet in segments:
            secs = ts_to_seconds(ts)
            if secs == 0:
                continue
            if any(kw.lower() in snippet.lower() for kw in keywords):
                timestamps[topic] = f"{base_url}&t={secs}"
                break
    return timestamps


def extract_topics_claude(text: str, guest_hint: str, show: str) -> dict:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    prompt = f"""You are analyzing a podcast transcript from the show "{show}".
Guest hint: {guest_hint}

Extract:
1. The guest's full name
2. Their professional role/title and company
3. 2-4 topic tags from the list below ONLY — do not invent new topics

ALLOWED TOPICS (pick only from this list):
- Energy Policy
- Oil & Gas
- Energy Transition
- Nuclear Energy
- Natural Gas
- Data Centers & AI
- Climate & Environment
- ESG & Finance
- Geothermal & Storage
- Energy Geopolitics
- Energy Economics
- Industry & Technology

Return JSON only, no markdown fences:
{{"guest_name": "Full Name", "guest_role": "Title, Company", "topics": ["Topic 1", "Topic 2"]}}

TRANSCRIPT (first 6000 chars):
{text[:6000]}
"""
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = msg.content[0].text.strip()
    raw = re.sub(r'^```[a-z]*\n?', '', raw)
    raw = re.sub(r'\n?```$', '', raw)
    return json.loads(raw.strip())


def load_data() -> dict:
    if DATA_FILE.exists():
        with open(DATA_FILE) as f:
            return json.load(f)
    return {
        "meta": {
            "generated": "",
            "shows": list(SHOW_COLORS.keys()),
            "topic_colors": TOPIC_COLORS,
            "show_colors": SHOW_COLORS,
        },
        "episodes": []
    }


def save_data(data: dict):
    data["meta"]["generated"]    = datetime.datetime.utcnow().isoformat() + "Z"
    data["meta"]["topic_colors"] = TOPIC_COLORS
    data["meta"]["show_colors"]  = SHOW_COLORS
    data["meta"]["shows"]        = list(SHOW_COLORS.keys())
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    force   = "--force"   in sys.argv
    dry_run = "--dry-run" in sys.argv

    if not ANTHROPIC_API_KEY and not dry_run:
        print("ERROR: Set ANTHROPIC_API_KEY environment variable")
        print("  export ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    if not TRANSCRIPTS.exists():
        print(f"ERROR: transcripts/ folder not found at {TRANSCRIPTS}")
        sys.exit(1)

    # Find all .docx files
    all_docx = sorted(TRANSCRIPTS.rglob("*.docx"))
    print(f"Found {len(all_docx)} transcript files\n")

    data = load_data()
    existing_files = {ep.get("file") for ep in data["episodes"]}

    skipped = 0
    processed = 0
    errors = 0

    for docx_path in all_docx:
        filename = docx_path.name

        # Skip if already processed (unless --force)
        if filename in existing_files and not force:
            skipped += 1
            continue

        # Parse metadata from filename
        meta = parse_filename(filename)
        show       = meta.get("show") or show_from_path(docx_path)
        date       = meta.get("date") or datetime.date.today().isoformat()
        guest_hint = meta.get("guest_hint") or docx_path.stem

        print(f"📄 {filename}")
        print(f"   Show: {show}  |  Date: {date}  |  Guest hint: {guest_hint}")

        if dry_run:
            print("   [dry-run — skipping API call]")
            processed += 1
            continue

        try:
            text = extract_text(docx_path)
            print(f"   {len(text):,} chars extracted")

            urls = extract_urls(text)
            if urls['url']:
                print(f"   YouTube: {urls['url']}")
            if urls['spotify_url']:
                print(f"   Spotify: {urls['spotify_url']}")

            result = extract_topics_claude(text, guest_hint, show)
            guest_name = result.get("guest_name", guest_hint)
            guest_role = result.get("guest_role", "")
            topics     = result.get("topics", [])
            print(f"   Guest: {guest_name}")
            print(f"   Role:  {guest_role}")
            print(f"   Topics: {', '.join(topics)}")

            timestamps = extract_timestamps(text, topics, urls['url'])
            if timestamps:
                print(f"   Timestamps: {list(timestamps.keys())}")

            ep_id = "ep_" + re.sub(r'[^a-z0-9]', '_', docx_path.stem.lower())[:40]

            # Remove old entry for this file if force-reprocessing
            data["episodes"] = [e for e in data["episodes"] if e.get("file") != filename]

            data["episodes"].append({
                "id":          ep_id,
                "show":        show,
                "name":        guest_name,
                "role":        guest_role,
                "date":        date,
                "file":        filename,
                "url":         urls['url'],
                "spotify_url": urls['spotify_url'],
                "topics":      topics,
                "timestamps":  timestamps,
            })

            # Save after every episode so progress isn't lost on error
            save_data(data)
            processed += 1
            print(f"   ✅ Saved ({len(data['episodes'])} total)\n")

        except KeyboardInterrupt:
            print("\n\nInterrupted — progress saved so far.")
            sys.exit(0)
        except Exception as e:
            print(f"   ❌ ERROR: {e}\n")
            errors += 1

    print(f"\n{'='*50}")
    print(f"Done: {processed} processed, {skipped} skipped (already in JSON), {errors} errors")
    print(f"Total episodes in episodes.json: {len(data['episodes'])}")
    if dry_run:
        print("\n(Dry run — no changes written)")
    else:
        print(f"\nNext step: commit episodes.json and push via GitHub Desktop")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Upright Digital — Single Transcript Processor (GitHub Actions)
==============================================================
Called by the GitHub Actions workflow when a .docx is pushed to /transcripts.
Keeps the same logic as bulk_process_all.py for consistency.

Usage:
  python process_transcript.py <path-to-docx> [show-folder-name]
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
    os.system("pip install python-docx --break-system-packages -q")
    from docx import Document

try:
    import anthropic
except ImportError:
    os.system("pip install anthropic --break-system-packages -q")
    import anthropic

# ── Config (must match bulk_process_all.py) ───────────────────────────────────

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

# Filename prefix → canonical show name
PREFIX_TO_SHOW = {
    "PN":    "PetroNoia",
    "OF360": "Oil Field 360",
    "EEP":   "Energy Espresso",
    "TEP":   "The Energy Pipeline",
    "TIC":   "The IT Crowd",
    "IBO":   "In Basin Observations",
}

# Folder name → canonical show name
FOLDER_TO_SHOW = {
    "petronoia":             "PetroNoia",
    "oilfield 360":          "Oil Field 360",
    "oil field 360":         "Oil Field 360",
    "energy espresso":       "Energy Espresso",
    "the it crowd":          "The IT Crowd",
    "the energy pipeline":   "The Energy Pipeline",
    "in basin observations": "In Basin Observations",
}

FILENAME_PATTERN = re.compile(r'^([A-Z0-9]+)-(\d{2})-(\d{2})-(.+)\.docx$', re.IGNORECASE)

DATA_FILE = Path(__file__).parent / "episodes.json"

# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_filename(filename: str) -> dict:
    m = FILENAME_PATTERN.match(filename)
    if not m:
        return {}
    prefix, month, year, guest = m.group(1).upper(), m.group(2), m.group(3), m.group(4)
    show = PREFIX_TO_SHOW.get(prefix)
    if not show:
        return {}
    if month == 'XX' or year == 'XX':
        date = datetime.date.today().isoformat()
    else:
        date = f"20{year}-{month}-01"
    return {"show": show, "date": date, "guest_hint": guest}


def extract_text(docx_path: str) -> str:
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
    return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2]) if len(parts) == 3 else 0


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
    # Extract just the JSON object — Claude sometimes appends extra text
    start = raw.find('{')
    end   = raw.rfind('}')
    if start == -1 or end == -1:
        raise ValueError(f"No JSON object found in response: {raw[:200]}")
    return json.loads(raw[start:end + 1])


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
    if len(sys.argv) < 2:
        print("Usage: python process_transcript.py <path-to-docx> [folder-name]")
        sys.exit(1)

    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    docx_path  = Path(sys.argv[1])
    folder_arg = sys.argv[2].lower() if len(sys.argv) > 2 else ""

    if not docx_path.exists():
        print(f"ERROR: File not found: {docx_path}")
        sys.exit(1)

    # Parse show + date + guest from filename first; fall back to folder arg
    meta       = parse_filename(docx_path.name)
    show       = meta.get("show") or FOLDER_TO_SHOW.get(folder_arg) or "PetroNoia"
    date       = meta.get("date") or datetime.date.today().isoformat()
    guest_hint = meta.get("guest_hint") or docx_path.stem

    print(f"📄 {docx_path.name}")
    print(f"   Show: {show}  |  Date: {date}  |  Guest hint: {guest_hint}")

    text = extract_text(str(docx_path))
    print(f"   {len(text):,} chars extracted")

    urls = extract_urls(text)
    if urls['url']:
        print(f"   YouTube: {urls['url']}")
    if urls['spotify_url']:
        print(f"   Spotify: {urls['spotify_url']}")

    result     = extract_topics_claude(text, guest_hint, show)
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

    data = load_data()
    # Replace existing entry for this file
    data["episodes"] = [ep for ep in data["episodes"] if ep.get("file") != docx_path.name]
    data["episodes"].append({
        "id":          ep_id,
        "show":        show,
        "name":        guest_name,
        "role":        guest_role,
        "date":        date,
        "file":        docx_path.name,
        "url":         urls['url'],
        "spotify_url": urls['spotify_url'],
        "topics":      topics,
        "timestamps":  timestamps,
    })

    save_data(data)
    print(f"✅ Done — {len(data['episodes'])} total episodes")


if __name__ == "__main__":
    main()

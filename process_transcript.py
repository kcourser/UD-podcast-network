#!/usr/bin/env python3
"""
Upright Digital — Podcast Transcript Processor
================================================
Runs in GitHub Actions when a .docx is uploaded to the /transcripts folder.
Extracts text, calls Claude API for topic extraction, updates episodes.json.

Environment variables (set as GitHub Secrets):
  ANTHROPIC_API_KEY — Claude API key
"""

import os
import sys
import json
import re
import datetime
from pathlib import Path

try:
    import anthropic
except ImportError:
    os.system("pip install anthropic python-docx -q")
    import anthropic

from docx import Document

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
    "Carbon Capture & Storage": "#06b6d4",
    "Climate Policy":           "#0891b2",
    "Data Centers & AI":        "#22d3ee",
    "Decarbonization":          "#67e8f9",
    "Energy Advocacy":          "#0e7490",
    "Energy Finance":           "#a5f3fc",
    "Energy Independence":      "#cffafe",
    "Energy Legislation":       "#155e75",
    "Energy Policy":            "#0ea5e9",
    "Energy Storage":           "#38bdf8",
    "Energy Transition":        "#7dd3fc",
    "Environmental Regulation": "#0284c7",
    "ESG & Investing":          "#bae6fd",
    "Geothermal Energy":        "#0369a1",
    "Grid Reliability":         "#2dd4bf",
    "Hydrogen":                 "#5eead4",
    "LNG & Export":             "#99f6e4",
    "Natural Gas":              "#14b8a6",
    "Nuclear Energy":           "#0d9488",
    "Oil & Gas":                "#0f766e",
    "Oilfield Technology":      "#115e59",
    "Permitting Reform":        "#164e63",
    "Renewable Energy":         "#083344",
    "Sustainability":           "#ecfeff",
    "US Energy Independence":   "#fbbf24",
}

DATA_FILE = Path(__file__).parent / "episodes.json"

# ── Helpers ───────────────────────────────────────────────────────────────────

def extract_text(docx_path: str) -> str:
    doc = Document(docx_path)
    return " ".join(p.text for p in doc.paragraphs if p.text.strip())


def parse_show_from_filename(filename: str) -> str:
    """Try to detect show name from filename prefix e.g. 'PetroNoia - Guest.docx'"""
    for show in SHOW_COLORS:
        if filename.lower().startswith(show.lower()):
            return show
    return "PetroNoia"  # default


def extract_topics(transcript_text: str, guest_hint: str, show: str) -> dict:
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
{transcript_text[:6000]}
"""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()
    # Strip markdown fences if present
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
    data["meta"]["generated"] = datetime.datetime.utcnow().isoformat() + "Z"
    data["meta"]["topic_colors"] = TOPIC_COLORS
    data["meta"]["show_colors"] = SHOW_COLORS
    data["meta"]["shows"] = list(SHOW_COLORS.keys())
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)
    print(f"✅ Saved {len(data['episodes'])} episodes to {DATA_FILE}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # GitHub Actions passes the file path as an argument
    if len(sys.argv) < 2:
        print("Usage: python process_transcript.py <path-to-docx> [show-name] [guest-hint]")
        sys.exit(1)

    docx_path = Path(sys.argv[1])
    show = sys.argv[2] if len(sys.argv) > 2 else parse_show_from_filename(docx_path.name)
    guest_hint = sys.argv[3] if len(sys.argv) > 3 else docx_path.stem

    if not docx_path.exists():
        print(f"ERROR: File not found: {docx_path}")
        sys.exit(1)

    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set")
        sys.exit(1)

    print(f"📄 Processing: {docx_path.name}")
    print(f"   Show: {show}")

    transcript = extract_text(str(docx_path))
    print(f"   {len(transcript):,} characters extracted")

    print("🤖 Calling Claude...")
    result = extract_topics(transcript, guest_hint, show)

    guest_name = result.get("guest_name", guest_hint)
    guest_role = result.get("guest_role", "")
    topics     = result.get("topics", [])

    print(f"   Guest: {guest_name}")
    print(f"   Role:  {guest_role}")
    print(f"   Topics: {', '.join(topics)}")

    data = load_data()

    # Remove existing entry for this file if present
    data["episodes"] = [ep for ep in data["episodes"] if ep.get("file") != docx_path.name]

    # Generate a clean ID
    ep_id = "ep_" + re.sub(r'[^a-z0-9]', '_', docx_path.stem.lower())[:40]

    episode = {
        "id":     ep_id,
        "show":   show,
        "name":   guest_name,
        "role":   guest_role,
        "date":   datetime.date.today().isoformat(),
        "file":   docx_path.name,
        "url":    "",
        "topics": topics,
    }

    data["episodes"].append(episode)
    save_data(data)
    print(f"✅ Done — {len(data['episodes'])} total episodes")


if __name__ == "__main__":
    main()

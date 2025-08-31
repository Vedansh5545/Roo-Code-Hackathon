import os
import json
import re
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")


def _fallback_parse(text: str):
    key_points = []
    action_items = []
    eli5_lines = []

    section = None
    for line in text.splitlines():
        s = line.strip()
        lower = s.lower()
        if re.match(r"^#+\s*key points|^key points[:]?$", lower):
            section = "key"
            continue
        if re.match(r"^#+\s*action items|^action items[:]?$", lower):
            section = "action"
            continue
        if re.match(r"^#+\s*(eli5|explain like i'?m 5)|^(eli5|explain like i'm 5)[:]?$", lower):
            section = "eli5"
            continue

        m = re.match(r"^[-*•\u2022]\s+(.*)$", s)
        n = re.match(r"^\d+[).]\s+(.*)$", s)
        content = None
        if m:
            content = m.group(1).strip()
        elif n:
            content = n.group(1).strip()

        if section == "key" and content:
            key_points.append(content)
        elif section == "action" and content:
            action_items.append(content)
        elif section == "eli5":
            eli5_lines.append(s)

    eli5 = " ".join(eli5_lines).strip() or text.strip()[:800]
    return {"key_points": key_points, "action_items": action_items, "eli5": eli5}


def summarize_text(prompt_text: str):
    if not API_KEY:
        return {"eli5": "Missing GEMINI_API_KEY.", "key_points": [], "action_items": []}

    endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY
    }

    instruction = (
        "Return ONLY strict JSON with keys 'key_points' (array of concise strings), "
        "'eli5' (string, 4-8 sentences), and 'action_items' (array of imperative strings)."
    )

    data = {
        "contents": [{
            "parts": [
                {"text": instruction},
                {"text": "Summarize the following research text. Output strict JSON only.\n\n" + prompt_text},
            ]
        }],
        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"}
    }

    try:
        response = requests.post(endpoint, headers=headers, json=data, timeout=60)
        response.raise_for_status()
        result = response.json()

        raw = result['candidates'][0]['content']['parts'][0]['text']

        try:
            parsed = json.loads(raw)
            return {
                "eli5": parsed.get("eli5") or "",
                "key_points": parsed.get("key_points") or [],
                "action_items": parsed.get("action_items") or []
            }
        except Exception:
            pass

        return _fallback_parse(raw)

    except Exception as e:
        print("Gemini API error:", str(e))
        return {
            "eli5": "Error summarizing.",
            "key_points": [],
            "action_items": []
        }


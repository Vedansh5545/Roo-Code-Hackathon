import os
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

def summarize_text(prompt_text):
    endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY
    }

    data = {
        "contents": [{
            "parts": [{
                "text": f"Summarize this in key points, ELI5, and action items:\n\n{prompt_text}"
            }]
        }]
    }

    try:
        response = requests.post(endpoint, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()

        raw = result['candidates'][0]['content']['parts'][0]['text']
        return {
            "eli5": raw,
            "key_points": [],
            "action_items": []
        }
    except Exception as e:
        print("❌ Gemini API error:", str(e))
        return {
            "eli5": "Error summarizing.",
            "key_points": [],
            "action_items": []
        }

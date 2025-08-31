from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
from summarize import summarize_file

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

app = Flask(__name__)
CORS(app)

@app.route("/api/summarize", methods=["POST"])
def summarize():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        text = file.read().decode("utf-8", errors="ignore")
        result = summarize_file(text)  # Call your Gemini summarizer logic here
        return jsonify(result)
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Something went wrong"}), 500

if __name__ == "__main__":
    app.run(debug=True)
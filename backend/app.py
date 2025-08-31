from flask import Flask, request, jsonify
from flask_cors import CORS
from summarize import summarize_text
import os
import fitz  # PyMuPDF
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route("/api/summarize", methods=["POST"])
def summarize():
    try:
        file = request.files["file"]
        filename = file.filename

        print(f"📄 Received file: {filename}")

        if filename.endswith(".pdf"):
            # ✅ Extract text from PDF
            pdf_bytes = file.read()
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text = "\n".join([page.get_text() for page in doc])
        elif filename.endswith(".txt"):
            text = file.read().decode("utf-8")
        else:
            return jsonify({"error": "Unsupported file type."}), 400

        print(f"📝 Extracted text (first 300 chars):\n{text[:300]}")

        if not text.strip():
            return jsonify({"error": "No text extracted from file."}), 400

        summary = summarize_text(text)
        print("✅ Gemini response received.")
        return jsonify(summary)

    except Exception as e:
        print("🚨 Error in summarize route:", str(e))
        return jsonify({"error": "Summarization failed."}), 500

if __name__ == "__main__":
    app.run(debug=True)

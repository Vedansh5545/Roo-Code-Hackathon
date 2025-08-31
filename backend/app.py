from flask import Flask, request, jsonify
from flask_cors import CORS
from summarize import summarize_text
import fitz  # PyMuPDF
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/summarize", methods=["POST"])
def summarize():
    try:
        if "file" not in request.files:
            return jsonify({"error": "Missing 'file' field in form-data."}), 400

        file = request.files["file"]
        filename = (file.filename or "").strip()

        print(f"📄 Received file: {filename}")

        text = ""
        if filename.lower().endswith(".pdf"):
            # Extract text from PDF
            pdf_bytes = file.read()
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text = "\n".join(page.get_text() for page in doc)
        elif filename.lower().endswith(".txt"):
            text = file.read().decode("utf-8", errors="ignore")
        else:
            return jsonify({"error": "Unsupported file type. Please upload a .pdf or .txt."}), 400

        preview = text[:300].replace("\n", " ")
        print(f"🧪 Extracted text preview (300 chars): {preview}")

        if not text.strip():
            return jsonify({"error": "No text extracted from file."}), 400

        summary = summarize_text(text)
        print("✅ Summarization complete and response ready.")
        return jsonify(summary)

    except Exception as e:
        print("❌ Error in /api/summarize:", str(e))
        return jsonify({"error": "Summarization failed."}), 500


if __name__ == "__main__":
    # Default Flask dev server (adjust host/port if needed)
    app.run(debug=True)


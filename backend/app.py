from flask import Flask, request, jsonify
from flask_cors import CORS
from summarize import summarize_text
import fitz  # PyMuPDF
from dotenv import load_dotenv
import os
import re
import math
import requests
from typing import List, Dict, Any

# Simple Flask backend that:
# 1) Extracts text from an uploaded PDF/TXT
# 2) Summarizes it (summary, key points, ELI5, action items)
# 3) Builds a lightweight RAG index (embeddings + chunks) so the chat can
#    answer questions grounded in the paper and (optionally) its references.

load_dotenv()  # pull in GEMINI_API_KEY from backend/.env

app = Flask(__name__)
CORS(app)  # allow frontend (Vite dev server) to call our API during dev


# -----------------------
# RAG In-Memory State
# -----------------------
# Holds the most recently uploaded paper and optional referenced docs
# (This is intentionally simple and in-memory. If you restart the server, you
#  need to upload again. Could be swapped for a persistent store.)
RAG_STATE = {
    "chunks": [],            # List[str]
    "embeddings": [],        # List[List[float]]
    "metas": [],             # List[Dict]
    "paper_text": "",        # Full text of uploaded paper
}

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  # used for embeddings + generation

# Google Generative Language API endpoints (Gemini)
EMBEDDING_MODEL_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent"
)
GENERATE_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


def _chunk_text(text: str, max_chars: int = 1200, overlap: int = 120) -> List[str]:
    """Split a long string into overlapping windows to index for retrieval.
    Roughly tries to end on sentence boundaries so chunks read nicely.
    """
    text = re.sub(r"\s+", " ", text).strip()
    chunks = []
    i = 0
    n = len(text)
    while i < n:
        end = min(i + max_chars, n)
        # try to break at sentence boundary
        window = text[i:end]
        if end < n:
            m = re.search(r"[.!?]\s+[^.!?]{0,80}$", window)
            if m:
                end = i + m.end()
        chunks.append(text[i:end].strip())
        i = max(end - overlap, i + 1)
    return [c for c in chunks if c]


def _embed_text(text: str) -> List[float]:
    """Call Gemini embeddings to convert text -> vector. Returns [] on error."""
    if not GEMINI_API_KEY:
        return []
    headers = {"Content-Type": "application/json", "X-Goog-Api-Key": GEMINI_API_KEY}
    payload = {
        "model": "models/text-embedding-004",
        "content": {"parts": [{"text": text[:6000]}]},
    }
    try:
        r = requests.post(EMBEDDING_MODEL_ENDPOINT, headers=headers, json=payload, timeout=60)
        r.raise_for_status()
        data = r.json()
        vec = data.get("embedding", {}).get("values") or data.get("embeddings", [{}])[0].get("values")
        return vec or []
    except Exception as e:
        print("Embedding error:", str(e))
        return []


def _cosine(a: List[float], b: List[float]) -> float:
    """Cosine similarity between two embedding vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def _search_similar(question: str, k: int = 5):
    """Retrieve top-k chunks for a question.
    If embeddings look weak (e.g., all tiny scores), fall back to paper-first
    chunks so the model always sees real content from the uploaded doc.
    """
    # Robust retrieval with fallback favoring the uploaded paper
    qvec = _embed_text(question)
    scored = []
    valid_positive = False
    for i, vec in enumerate(RAG_STATE["embeddings"]):
        score = _cosine(qvec, vec)
        if score > 0.01:
            valid_positive = True
        scored.append((score, i))
    scored.sort(reverse=True)

    indices: list[int]
    if qvec and valid_positive:
        indices = [idx for _, idx in scored[:k]]
    else:
        # Fallback: take first k chunks from the actual paper, then fill with refs
        paper_idxs = [i for i, m in enumerate(RAG_STATE["metas"]) if m.get("source") == "paper"]
        ref_idxs = [i for i, m in enumerate(RAG_STATE["metas"]) if m.get("source", "").startswith("ref:")]
        indices = (paper_idxs[:k] + ref_idxs[:k])[:k]

    contexts = [RAG_STATE["chunks"][i] for i in indices]
    metas = [RAG_STATE["metas"][i] for i in indices]
    return contexts, metas


def _strip_html(html: str) -> str:
    """Very naive HTML -> text cleaner for reference pages."""
    try:
        # very naive HTML to text
        text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
        text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()
    except Exception:
        return html


def _fetch_reference_text(url: str) -> str:
    """Fetch and extract text from a reference URL.
    - If it's a PDF, we parse it with PyMuPDF.
    - Else we pull the HTML and strip tags.
    """
    try:
        r = requests.get(url, timeout=30, headers={"User-Agent": "RAGBot/1.0"})
        r.raise_for_status()
        ctype = r.headers.get("Content-Type", "").lower()
        if "pdf" in ctype or url.lower().endswith(".pdf"):
            doc = fitz.open(stream=r.content, filetype="pdf")
            return "\n".join(page.get_text() for page in doc)
        else:
            text = r.text
            return _strip_html(text)
    except Exception as e:
        print("Ref fetch error:", url, str(e))
        return ""


def _extract_reference_urls(full_text: str) -> List[str]:
    """Heuristic scan for URLs/DOIs in the paper's References/Bibliography."""
    # Find references section heuristically
    lower = full_text.lower()
    idx = lower.rfind("references")
    if idx == -1:
        idx = lower.rfind("bibliography")
    ref_block = full_text[idx:] if idx != -1 else full_text[-2000:]

    urls = set()
    for m in re.finditer(r"https?://[^\s)\]]+", ref_block):
        urls.add(m.group(0).rstrip(".,);]"))
    # DOIs
    for m in re.finditer(r"10\.\d{4,9}/\S+", ref_block):
        doi = m.group(0).rstrip(".,);]")
        urls.add(f"https://doi.org/{doi}")
    return list(urls)


def _build_index_from_texts(texts: List[str], source_label: str):
    """Chunk + embed the given texts and overwrite the in-memory index."""
    chunks = []
    metas = []
    for t in texts:
        for c in _chunk_text(t):
            chunks.append(c)
            metas.append({"source": source_label})
    embeddings = [_embed_text(c) for c in chunks]
    RAG_STATE["chunks"] = chunks
    RAG_STATE["embeddings"] = embeddings
    RAG_STATE["metas"] = metas


def _augment_with_references(full_text: str, max_refs: int = 3):
    """Best-effort: fetch up to N references and extend the index with them."""
    urls = _extract_reference_urls(full_text)[:max_refs]
    texts = []
    for u in urls:
        t = _fetch_reference_text(u)
        if t:
            texts.append(t)
    if not texts:
        return []
    # Append to existing state
    new_chunks = []
    new_metas = []
    for i, t in enumerate(texts):
        label = f"ref:{i+1}"
        for c in _chunk_text(t):
            new_chunks.append(c)
            new_metas.append({"source": label})
    new_embs = [_embed_text(c) for c in new_chunks]
    RAG_STATE["chunks"].extend(new_chunks)
    RAG_STATE["embeddings"].extend(new_embs)
    RAG_STATE["metas"].extend(new_metas)
    return urls


def _answer_with_context(question: str) -> Dict[str, Any]:
    """Assemble a grounded prompt from retrieved chunks and ask Gemini."""
    if not GEMINI_API_KEY:
        return {"answer": "Missing GEMINI_API_KEY.", "sources": []}
    contexts, metas = _search_similar(question, k=6)
    # Always prepend a brief intro from the paper itself as an anchor
    intro = (RAG_STATE.get("paper_text") or "").strip()[:1200]
    if intro:
        contexts = [intro] + contexts
        metas = [{"source": "paper:intro"}] + metas
    system = (
        "You are an expert assistant for research papers. "
        "Use ONLY the given source snippets, which come from the uploaded paper and (when available) its cited references. "
        "Prioritize the uploaded paper; draw on cited references only to supplement details present in the sources. "
        "If the sources do not contain sufficient information to answer, say you don't have enough information. "
        "Answer as a domain expert: precise, concise, and technically accurate. Also giving more context for the user to understand "
        "Cite supporting snippets using [S1], [S2], ... markers tied to the provided sources."
    )
    sources_text = "\n\n".join([f"[S{i+1}] {c}" for i, c in enumerate(contexts)])
    user = f"Question: {question}\n\nSources:\n{sources_text}"

    headers = {"Content-Type": "application/json", "X-Goog-Api-Key": GEMINI_API_KEY}
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": system}]},
            {"role": "user", "parts": [{"text": user}]},
        ],
        "generationConfig": {"temperature": 0.2, "topP": 0.8, "maxOutputTokens": 512},
    }
    try:
        r = requests.post(GENERATE_ENDPOINT, headers=headers, json=payload, timeout=60)
        r.raise_for_status()
        data = r.json()
        text = data['candidates'][0]['content']['parts'][0]['text']
        return {"answer": text, "sources": [m.get("source", "S") for m in metas]}
    except Exception as e:
        print("Ask error:", str(e))
        return {"answer": "Error generating answer.", "sources": []}


@app.route("/api/summarize", methods=["POST"])
def summarize():
    try:
        if "file" not in request.files:
            return jsonify({"error": "Missing 'file' field in form-data."}), 400

        file = request.files["file"]
        filename = (file.filename or "").strip()

        print("Received file:", filename)

        text = ""
        if filename.lower().endswith(".pdf"):
            # Extract text from PDF and conservatively skip obvious cover/permission pages.
            # Only skip the first 1–2 pages if they look like boilerplate; never drop all pages.
            pdf_bytes = file.read()
            with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
                all_pages = [p.get_text() for p in doc]

            def _is_noise_page(s: str) -> bool:
                low = (s or "").lower()
                return ("ieee xplore" in low and ("downloaded" in low or "permission" in low or "personal use" in low))

            filtered = []
            for i, t in enumerate(all_pages):
                if i < 2 and _is_noise_page(t):
                    continue
                filtered.append(t)
            # Fallback: if we filtered everything, keep all pages
            if not any(s.strip() for s in filtered):
                filtered = all_pages
            text = "\n".join(filtered)
        elif filename.lower().endswith(".txt"):
            text = file.read().decode("utf-8", errors="ignore")
        else:
            return jsonify({"error": "Unsupported file type. Please upload a .pdf or .txt."}), 400

        preview = text[:300].replace("\n", " ")
        print("Extracted text preview (300 chars):", preview)

        if not text.strip():
            return jsonify({"error": "No text extracted from file."}), 400

        # Build RAG index from the uploaded text
        RAG_STATE["paper_text"] = text
        _build_index_from_texts([text], source_label="paper")
        # Try to augment with references (best-effort)
        refs = _augment_with_references(text)

        summary = summarize_text(text)
        summary["learn_more_seed"] = summary.get("key_points", [summary.get("summary", "")])[0:1]
        summary["references_used"] = refs or []

        print("RAG index built with", len(RAG_STATE["chunks"]), "chunks. Summarization ready.")
        return jsonify(summary)

    except Exception as e:
        print("Error in /api/summarize:", str(e))
        return jsonify({"error": "Summarization failed."}), 500


@app.route("/api/ask", methods=["POST"])
def ask():
    try:
        data = request.get_json(force=True)
        question = (data.get("question") or "").strip()
        if not question:
            return jsonify({"error": "Missing 'question'"}), 400
        if not RAG_STATE["chunks"]:
            return jsonify({"error": "No document loaded. Upload and summarize a paper first."}), 400

        result = _answer_with_context(question)
        return jsonify(result)
    except Exception as e:
        print("Ask endpoint error:", str(e))
        return jsonify({"error": "Ask failed."}), 500


if __name__ == "__main__":
    # Default Flask dev server (adjust host/port if needed)
    app.run(debug=True)

"""Smart File Organizer - Flask backend. Run: python app.py"""
import subprocess, sys, threading, uuid, time
from flask import Flask, jsonify, request, render_template
from automation import file_organizer as fo, extras

app = Flask(__name__, template_folder="frontend/templates", static_folder="frontend/static")
JOBS, LAST = {}, {"scanned": 0, "found": 0}


def err(msg, code=400):
    return jsonify(ok=False, error=msg), code


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/browse")
def browse():
    """Opens a native folder dialog on the machine running the app (tkinter)."""
    code = ("import tkinter as t\nfrom tkinter import filedialog as f\nr=t.Tk();r.withdraw();"
            "r.attributes('-topmost',True);print(f.askdirectory(title='Select folder'))")
    try:
        out = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, timeout=300)
        if out.returncode != 0:
            raise RuntimeError
        return jsonify(ok=True, path=out.stdout.strip())
    except Exception:
        return err("The folder dialog isn't available here. Paste the folder path instead.", 501)


@app.post("/api/validate")
def validate():
    d = request.get_json(silent=True) or {}
    try:
        src = fo.validate_source(d["path"]) if d.get("kind") == "source" else None
        if d.get("kind") == "destination":
            fo.validate_destination(d["path"], fo.validate_source(d.get("source", "")))
        return jsonify(ok=True, path=str(src or ""))
    except fo.OrganizerError as e:
        return err(str(e))
    except KeyError:
        return err("No path provided.")


@app.post("/api/scan")
def scan():
    d = request.get_json(silent=True) or {}
    try:
        files, total = fo.scan(d.get("source"))
        if d.get("destination"):
            fo.validate_destination(d["destination"], fo.validate_source(d["source"]))
    except fo.OrganizerError as e:
        return err(str(e))
    LAST.update(scanned=total, found=len(files))
    return jsonify(ok=True, files=files, total=total, found=len(files))


@app.post("/api/organize")
def organize():
    d = request.get_json(silent=True) or {}
    if not d.get("confirmed"):
        return err("Confirm the operation before files are moved.")
    names = d.get("files") or []
    if not names:
        return err("No JPG files found to move.")
    jid = uuid.uuid4().hex
    JOBS[jid] = {"done": False, "current": "", "completed": 0, "total": len(names), "moved": 0, "failed": 0}

    def work():
        job = JOBS[jid]
        def prog(i, n, name, m, f):
            job.update(completed=i, current=name, moved=m, failed=f); time.sleep(0.15)  # visible progress
        try:
            job["result"] = fo.move_files(d.get("source"), d.get("destination"), names, prog)
        except fo.OrganizerError as e:
            job["error"] = str(e)
        except Exception:
            app.logger.exception("organize failed")
            job["error"] = "Something unexpected went wrong while moving files."
        job["done"] = True
    threading.Thread(target=work, daemon=True).start()
    return jsonify(ok=True, job=jid)


@app.get("/api/progress/<jid>")
def progress(jid):
    return jsonify(JOBS[jid]) if jid in JOBS else err("Unknown job.", 404)


@app.post("/api/emails")
def emails():
    d = request.get_json(silent=True) or {}
    try:
        return jsonify(ok=True, **extras.extract_emails(d.get("path"), d.get("output"), bool(d.get("save"))))
    except fo.OrganizerError as e:
        return err(str(e))


@app.post("/api/title")
def title():
    d = request.get_json(silent=True) or {}
    try:
        return jsonify(ok=True, **extras.scrape_title(d.get("url"), d.get("output")))
    except fo.OrganizerError as e:
        return err(str(e))


@app.get("/api/history")
def history():
    return jsonify(ok=True, items=fo.load_history())


@app.delete("/api/history")
def clear():
    fo.clear_history()
    return jsonify(ok=True)


@app.get("/api/stats")
def stats():
    h = fo.load_history()
    return jsonify(ok=True, scanned=LAST["scanned"], found=LAST["found"],
                   moved=sum(x["moved"] for x in h if x.get("task", "JPG") == "JPG"), bytes=sum(x["bytes"] for x in h))


if __name__ == "__main__":
    print("Smart File Organizer running at http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)

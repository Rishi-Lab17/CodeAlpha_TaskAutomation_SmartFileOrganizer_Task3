"""Runs the spec's seven scenarios against real temp folders. Usage: python tests.py"""
import os, stat, tempfile, shutil, json
from pathlib import Path
from automation import file_organizer as fo

fo.DATA_FILE = Path(tempfile.mkdtemp()) / "activity.json"; fo.DATA_FILE.write_text("[]")
root = Path(tempfile.mkdtemp())
def mk(d, names):
    d.mkdir(parents=True, exist_ok=True)
    for n in names: (d / n).write_bytes(b"x" * 100)
def run(src, dst):
    files, _ = fo.scan(src); return fo.move_files(src, dst, [f["name"] for f in files])
def check(label, cond):
    print(("PASS " if cond else "FAIL ") + label); assert cond, label

# 1 multiple JPGs
mk(root/"a", ["1.jpg", "2.jpg", "3.jpg"]); r = run(root/"a", root/"out1")
check("1. multiple JPGs moved", r["moved"] == 3 and not list((root/"a").glob("*.jpg")))
# 2 PNG/PDF untouched
mk(root/"b", ["x.png", "y.pdf", "z.jpg"]); r = run(root/"b", root/"out2")
check("2. only JPG moved; PNG/PDF untouched", r["moved"] == 1 and sorted(os.listdir(root/"b")) == ["x.png", "y.pdf"])
# 3 empty folder
(root/"c").mkdir(); check("3. empty folder -> 0 files", fo.scan(root/"c")[0] == [])
# 4 duplicates
mk(root/"d", ["dup.jpg"]); mk(root/"out4", ["dup.jpg"]); r = run(root/"d", root/"out4")
check("4. duplicate renamed, original kept", sorted(os.listdir(root/"out4")) == ["dup (1).jpg", "dup.jpg"] and r["moved"] == 1)
# 5 invalid source
try: fo.scan(root/"nope"); check("5. invalid source rejected", False)
except fo.OrganizerError as e: check("5. invalid source rejected", "not found" in str(e))
# 6 no write permission (skipped if running as root or on Windows where chmod does not restrict dir writes)
mk(root/"f", ["p.jpg"]); (root/"ro").mkdir(); (root/"ro").chmod(stat.S_IRUSR | stat.S_IXUSR)
is_root = getattr(os, "geteuid", lambda: -1)() == 0
if is_root or os.name == "nt":
    print("SKIP 6. read-only destination (root/Windows bypasses directory chmod; run on POSIX normal user to test)")
else:
    try: run(root/"f", root/"ro"); check("6. read-only destination rejected", False)
    except fo.OrganizerError as e: check("6. read-only destination rejected", "Permission" in str(e)); check("   source file intact", (root/"f"/"p.jpg").exists())
# 7 uppercase
mk(root/"g", ["A.JPG", "B.Jpg", "c.jpg"]); r = run(root/"g", root/"out7")
check("7. uppercase/mixed-case extensions moved", r["moved"] == 3)
# extras: nested destination, subfolders ignored
mk(root/"h", ["q.jpg"]); mk(root/"h"/"sub", ["deep.jpg"])
try: fo.move_files(root/"h", root/"h"/"sub", ["q.jpg"]); check("nested destination blocked", False)
except fo.OrganizerError: check("nested destination blocked", True)
r = run(root/"h", root/"out8"); check("subfolders not scanned", r["moved"] == 1 and (root/"h"/"sub"/"deep.jpg").exists())
check("history logged", len(json.loads(fo.DATA_FILE.read_text())) == 5)
# --- email extractor
from automation import extras
extras.add_history = lambda e: None
(root/"mail.txt").write_text("Hi a@x.com, B@X.com; bad@, c.d+e@mail.co.uk a@x.com")
r = extras.extract_emails(root/"mail.txt", save=True)
check("emails: unique + case-insensitive", r["emails"] == ["a@x.com", "b@x.com", "c.d+e@mail.co.uk"] and r["total_matches"] == 4)
check("emails: saved, never overwritten", extras.extract_emails(root/"mail.txt", save=True)["saved_to"] != r["saved_to"])
try: extras.extract_emails(root/"x.png"); check("emails: non-txt rejected", False)
except fo.OrganizerError: check("emails: non-txt rejected", True)
# --- title scraper (local server, no internet needed)
import threading, http.server, functools
(root/"p.html").write_text("<html><head><title>\n Hello  World </title></head></html>")
srv = http.server.HTTPServer(("127.0.0.1", 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
t = extras.scrape_title(f"http://127.0.0.1:{srv.server_port}/p.html", str(root/"titles.txt"))
check("title: scraped and saved", t["title"] == "Hello World" and "Hello World" in (root/"titles.txt").read_text())
try: extras.scrape_title("not a url"); check("title: bad URL rejected", False)
except fo.OrganizerError: check("title: bad URL rejected", True)
try: extras.scrape_title(f"http://127.0.0.1:{srv.server_port}/missing"); check("title: HTTP 404 handled", False)
except fo.OrganizerError as e: check("title: HTTP 404 handled", "404" in str(e))
srv.shutdown()
print("\nAll checks passed."); shutil.rmtree(root, ignore_errors=True)

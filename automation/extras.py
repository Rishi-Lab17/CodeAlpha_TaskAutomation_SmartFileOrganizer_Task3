"""Task 3 ideas #2 and #3: extract emails from a .txt file (re) and scrape a page title (requests)."""
import re, os
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
import requests
from .file_organizer import OrganizerError, unique_path, add_history, DATA_FILE

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")
MAX_BYTES = 20 * 1024 * 1024
DEFAULT_TITLES = DATA_FILE.parent / "page_titles.txt"


def _log(task, source, dest, count):
    add_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "task": task, "source": str(source),
                 "destination": str(dest), "moved": count, "failed": 0, "bytes": 0, "status": "Success"})


def extract_emails(path, output=None, save=False):
    """Read a .txt file, find unique email addresses (case-insensitive), optionally save them."""
    if not path or not str(path).strip():
        raise OrganizerError("Choose a .txt file first.")
    src = Path(os.path.expanduser(str(path).strip())).resolve()
    if not src.is_file():
        raise OrganizerError(f"File not found: {src}")
    if src.suffix.lower() != ".txt":
        raise OrganizerError("Only .txt files are supported.")
    if src.stat().st_size > MAX_BYTES:
        raise OrganizerError("That file is larger than 20 MB.")
    try:
        text = src.read_text("utf-8", errors="replace")
    except PermissionError:
        raise OrganizerError("Permission denied: the file can't be read.")
    found = EMAIL_RE.findall(text)
    emails = sorted({e.lower() for e in found})
    res = {"emails": emails, "total_matches": len(found), "unique": len(emails), "saved_to": None}
    if save:
        if not emails:
            raise OrganizerError("No email addresses found, so nothing was saved.")
        out = Path(os.path.expanduser(output.strip())).resolve() if output and output.strip() else src.with_name(src.stem + "_emails.txt")
        if out == src:
            raise OrganizerError("The output file can't be the input file.")
        try:
            out.parent.mkdir(parents=True, exist_ok=True)
            out = unique_path(out.parent, out.name)  # never overwrite
            out.write_text("\n".join(emails) + "\n", "utf-8")
        except PermissionError:
            raise OrganizerError("Permission denied: can't write the output file.")
        except OSError as ex:
            raise OrganizerError(f"Couldn't save the file ({ex.strerror}).")
        res["saved_to"] = str(out)
        _log("Emails", src, out, len(emails))
    return res


class _Title(HTMLParser):
    def __init__(self):
        super().__init__(); self.in_title, self.title = False, ""
    def handle_starttag(self, tag, attrs):
        if tag == "title": self.in_title = True
    def handle_endtag(self, tag):
        if tag == "title": self.in_title = False
    def handle_data(self, data):
        if self.in_title: self.title += data


def scrape_title(url, output=None):
    """Fetch a web page, read its <title>, and append it to a text file."""
    url = (url or "").strip()
    if not re.match(r"^https?://[^\s/]+", url, re.I):
        raise OrganizerError("Enter a full web address starting with http:// or https://")
    try:
        r = requests.get(url, timeout=10, headers={"User-Agent": "SmartFileOrganizer/1.0"}, stream=True)
        r.raise_for_status()
        html = r.raw.read(1_000_000, decode_content=True).decode(r.encoding or "utf-8", errors="replace")
    except requests.Timeout:
        raise OrganizerError("The page took too long to respond (10 s).")
    except requests.HTTPError as ex:
        raise OrganizerError(f"The site returned an error: HTTP {ex.response.status_code}.")
    except requests.RequestException:
        raise OrganizerError("Couldn't reach that address. Check the URL and your internet connection.")
    p = _Title(); p.feed(html)
    title = re.sub(r"\s+", " ", p.title).strip()
    if not title:
        raise OrganizerError("The page has no <title> tag.")
    out = Path(os.path.expanduser(output.strip())).resolve() if output and output.strip() else DEFAULT_TITLES
    try:
        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "a", encoding="utf-8") as f:  # append, never overwrite
            f.write(f"{datetime.now():%Y-%m-%d %H:%M:%S} | {url} | {title}\n")
    except PermissionError:
        raise OrganizerError("Permission denied: can't write the output file.")
    except OSError as ex:
        raise OrganizerError(f"Couldn't save the file ({ex.strerror}).")
    _log("Title", url, out, 1)
    return {"title": title, "url": url, "saved_to": str(out)}

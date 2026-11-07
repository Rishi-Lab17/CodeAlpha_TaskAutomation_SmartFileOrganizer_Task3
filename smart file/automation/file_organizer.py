"""Core automation: scan a folder for .jpg files and safely move them.
Uses os (validation/listing), pathlib (extensions/paths), shutil (moving), datetime (timestamps)."""
import os, json, shutil, threading
from datetime import datetime
from pathlib import Path

EXT = ".jpg"  # matched case-insensitively (.jpg, .JPG, .Jpg)
DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "activity.json"
_lock = threading.Lock()


class OrganizerError(Exception):
    """Error with a user-friendly message (never a raw traceback)."""


def _resolve(p):
    return Path(os.path.expanduser(str(p).strip())).resolve()


def validate_source(path):
    if not path or not str(path).strip():
        raise OrganizerError("Choose a source folder first.")
    p = _resolve(path)
    if not os.path.isdir(p):
        raise OrganizerError(f"Source folder not found: {p}")
    if not os.access(p, os.R_OK):
        raise OrganizerError("Permission denied: the source folder can't be read.")
    return p


def validate_destination(path, source):
    if not path or not str(path).strip():
        raise OrganizerError("Choose a destination folder first.")
    d = _resolve(path)
    if d == source:
        raise OrganizerError("Source and destination are the same folder.")
    # Prevent moving a folder into itself / its own subdirectory (either direction)
    if source in d.parents or d in source.parents:
        raise OrganizerError("Destination can't be inside the source folder (or contain it).")
    if d.exists():
        if not d.is_dir():
            raise OrganizerError(f"Destination is not a folder: {d}")
        if not os.access(d, os.W_OK):
            raise OrganizerError("Permission denied: the destination folder is not writable.")
    return d


def scan(source):
    """Top-level only (no subdirectories). Returns (files, total_files_scanned)."""
    src = validate_source(source)
    files, total = [], 0
    try:
        entries = list(os.scandir(src))
    except PermissionError:
        raise OrganizerError("Permission denied while reading the source folder.")
    for e in sorted(entries, key=lambda e: e.name.lower()):
        if not e.is_file():
            continue
        total += 1
        p = Path(e.name)
        if p.suffix.lower() == EXT:
            files.append({"name": e.name, "ext": p.suffix, "size": e.stat().st_size,
                          "location": str(src), "status": "Ready"})
    return files, total


def unique_path(dest_dir, name):
    """Never overwrite: photo.jpg -> photo (1).jpg -> photo (2).jpg ..."""
    target = dest_dir / name
    stem, suffix, i = Path(name).stem, Path(name).suffix, 1
    while target.exists():
        target = dest_dir / f"{stem} ({i}){suffix}"
        i += 1
    return target


def move_files(source, destination, names, on_progress=None):
    """Move the given JPG names. Reports each file; failures are recorded, never hidden."""
    src = validate_source(source)
    dst = validate_destination(destination, src)
    try:
        dst.mkdir(parents=True, exist_ok=True)  # create missing destination
    except PermissionError:
        raise OrganizerError("Permission denied: can't create the destination folder.")
    except OSError as ex:
        raise OrganizerError(f"Couldn't create the destination folder ({ex.strerror}).")
    if not os.access(dst, os.W_OK):
        raise OrganizerError("Permission denied: the destination folder is not writable.")

    start, results, moved, failed, size = datetime.now(), [], 0, 0, 0
    for i, name in enumerate(names, 1):
        item = {"name": name, "status": "moved", "message": ""}
        try:
            f = src / name
            if Path(name).name != name or f.suffix.lower() != EXT:
                raise OrganizerError("Not a JPG file; skipped.")
            if not f.is_file():
                raise OrganizerError("File no longer exists.")
            fsize = f.stat().st_size
            target = unique_path(dst, name)
            shutil.move(str(f), str(target))
            moved += 1; size += fsize
            if target.name != name:
                item["message"] = f"Renamed to {target.name} (name already existed)"
        except PermissionError:
            failed += 1; item.update(status="failed", message="Permission denied")
        except OrganizerError as ex:
            failed += 1; item.update(status="failed", message=str(ex))
        except OSError as ex:
            failed += 1; item.update(status="failed", message=f"File operation failed: {ex.strerror or 'unknown error'}")
        results.append(item)
        if on_progress:
            on_progress(i, len(names), name, moved, failed)

    elapsed = round((datetime.now() - start).total_seconds(), 2)
    entry = {"timestamp": start.strftime("%Y-%m-%d %H:%M:%S"), "source": str(src),
             "destination": str(dst), "moved": moved, "failed": failed, "bytes": size,
             "status": "Success" if failed == 0 else ("Partial" if moved else "Failed")}
    add_history(entry)
    return {**entry, "seconds": elapsed, "results": results}


def load_history():
    try:
        return json.loads(DATA_FILE.read_text("utf-8"))
    except (OSError, ValueError):
        return []


def add_history(entry):
    with _lock:
        h = load_history(); h.insert(0, entry)
        DATA_FILE.write_text(json.dumps(h[:500], indent=2), "utf-8")


def clear_history():
    with _lock:
        DATA_FILE.write_text("[]", "utf-8")

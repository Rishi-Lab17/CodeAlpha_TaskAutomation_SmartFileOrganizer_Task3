# Smart File Organizer — Premium Edition v2.0

[![Python](https://img.shields.io/badge/Python-3.10%2B-398653.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1%2B-245C3A.svg?style=flat&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Design System](https://img.shields.io/badge/Theme-Soft%20Mint%20%2B%20Sage%20Green-A8D5B5.svg?style=flat)](#design-system)
[![Task](https://img.shields.io/badge/CodeAlpha-Task%203%3A%20Task%20Automation-27834B.svg?style=flat)](#codealpha-task-3)
[![License](https://img.shields.io/badge/License-MIT-398653.svg?style=flat)](LICENSE)

An enterprise-grade, modern Python automation dashboard combining three practical routine tasks into one cohesive, beautifully designed web application with a **Soft Mint + Sage Green** design system.

---

## 🌟 Key Automations

1. **JPG File Organizer (`automation/file_organizer.py`)**
   - Scans directories for `.jpg` / `.jpeg` files (case-insensitive).
   - Non-destructive atomic transfers via `shutil.move()`.
   - Never overwrites existing destination files (automatic collision resolution: `photo (1).jpg`).
   - Ignores all non-JPG formats (`.png`, `.pdf`, `.docx`, `.zip`) and nested subdirectories.
   - Blocks circular/nested directory operations.
   - Real-time progress tracking with percentage counters and error telemetry.

2. **Regex Email Extractor (`automation/extras.py`)**
   - Scans plain text files (`.txt`) up to 20 MB.
   - Regex pattern matches RFC-compliant email formats.
   - Automatic normalization and de-duplication (case-insensitive).
   - One-click copy for individual emails or entire batch.
   - Optional export to disk with collision-free naming.

3. **Webpage Title Scraper (`automation/extras.py`)**
   - Streams webpage contents via Python `requests` with 10-second timeout controls.
   - Custom `User-Agent` headers and HTML title extraction via `html.parser.HTMLParser`.
   - Appends metadata records (`timestamp | url | title`) to `data/page_titles.txt` without overwriting.

---

## 🎨 Design System — Soft Mint + Sage Green

The application features a modern, clean light interface built on natural contrast, spacious card layouts, and subtle green accents:

| Token Name | Hex Code | Purpose |
|:---|:---|:---|
| **Main Background** | `#F3FAF4` | Crisp, clean ambient page backdrop |
| **Secondary Background** | `#EAF4EC` | Interactive hover & secondary surfaces |
| **Main Cards** | `#FFFFFF` | Crisp elevated container surfaces |
| **Soft Green Cards** | `#F0F8F1` | Accent cards, table alternate rows |
| **Primary Green** | `#398653` | Primary brand actions, active highlights |
| **Deep Forest Green** | `#245C3A` | Headings, emphasized text, deep contrast |
| **Light Sage** | `#A8D5B5` | Subtle borders, active tags, progress bars |
| **Pale Mint** | `#DCEFE0` | Badges, chips, indicator pills |
| **Primary Text** | `#20352A` | Core body typography |
| **Secondary Text** | `#708477` | Captions, hints, breadcrumbs |
| **Borders** | `#DCE9DE` | Card outlines and table gridlines |
| **Success State** | `#27834B` | Confirmed actions, completed moves |
| **Warning State** | `#D69B37` | Partial moves, duplicate warnings |
| **Error State** | `#D95353` | Permission errors, invalid paths |

### Typography & Polish
- **Font**: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) with monospace numerals via [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono).
- **Shadows**: Natural soft drop-shadows with green tinting (`rgba(36, 92, 58, 0.06)`).
- **Accessibility**: First-class reduced motion mode (`prefers-reduced-motion` and user toggle).
- **Responsive Layout**: Fluid breakpoints verified across 1920px (Desktop), 1366px (Laptop), 768px (Tablet), and 390px (Mobile).

---

## 🛡️ Safety-First Architecture

- **Non-Destructive Operations**: Source files are only removed when the filesystem confirm-move call succeeds.
- **Zero-Overwrite Guarantee**: If `document.jpg` already exists in destination, it is saved as `document (1).jpg`, `document (2).jpg`, etc.
- **Strict Scope**: Only files in the specified root folder are scanned. Subdirectories and non-JPG extensions are left completely untouched.
- **Folder Validation**: Source and destination paths are checked for existence, permissions, and directory loop prevention before any move begins.
- **Audit Trails**: Every operation is atomically recorded into `data/activity.json`.

---

## 📂 Project Structure

```
smart file/
├── app.py                      # Flask REST API server and route handlers
├── requirements.txt            # Python dependencies (Flask, requests)
├── tests.py                    # Complete automated verification test suite
├── run.bat                     # Windows one-click start script
├── .gitignore                  # Git ignore rules for Python / IDE artifacts
├── README.md                   # Complete documentation & usage guide
├── automation/
│   ├── __init__.py             # Package marker
│   ├── file_organizer.py       # JPG organization, safety validation & history
│   └── extras.py               # Regex email extractor & requests title scraper
├── data/
│   └── activity.json           # Real JSON audit log for all automated tasks
└── frontend/
    ├── templates/
    │   └── index.html          # Single-page dashboard application template
    └── static/
        ├── css/
        │   └── style.css       # Soft Mint + Sage Green design system stylesheet
        └── js/
            └── script.js       # Client controller, animations & API communication
```

---

## 🚀 Quick Launch Instructions

### Option 1: One-Click Launch (Windows)
Double-click `run.bat` or run:
```cmd
run.bat
```
This automatically verifies Python, installs dependencies silently, starts the server at `http://127.0.0.1:5000`, and opens your default browser.

### Option 2: Manual Terminal Launch
1. **Clone or download the repository**:
   ```bash
   cd "smart file"
   ```

2. **Install required dependencies**:
   ```bash
   python -m pip install -r requirements.txt
   ```

3. **Start the Flask application**:
   ```bash
   python app.py
   ```

4. **Open in your web browser**:
   Navigate to [http://127.0.0.1:5000](http://127.0.0.1:5000).

---

## 🧪 Automated Test Suite

Run the full end-to-end automated test suite:
```bash
python tests.py
```

### Verified Test Cases:
1. `PASS` Multiple JPG files moved successfully.
2. `PASS` PNG, PDF, DOCX files remain untouched.
3. `PASS` Empty source folder handled with 0 files.
4. `PASS` Duplicate files safely renamed with `(1).jpg` suffix.
5. `PASS` Non-existent / invalid source folders rejected.
6. `PASS/SKIP` Read-only directory permissions safety check.
7. `PASS` Uppercase and mixed-case extensions (`.JPG`, `.Jpg`, `.jpg`) matched.
8. `PASS` Nested destination folders blocked (prevents circular directory loops).
9. `PASS` Subfolders ignored during top-level scans.
10. `PASS` Audit records accurately logged to `data/activity.json`.
11. `PASS` Email extractor finds unique, case-insensitive addresses.
12. `PASS` Email results saved to collision-free output file.
13. `PASS` Title scraper fetches HTML `<title>` tags and appends them to file.
14. `PASS` HTTP 404 and invalid URL errors gracefully handled.

---

## 🌐 API Reference

| Endpoint | Method | Payload / Params | Description |
|:---|:---|:---|:---|
| `/` | `GET` | — | Renders the primary dashboard UI |
| `/api/stats` | `GET` | — | Returns real-time aggregate statistics |
| `/api/validate` | `POST` | `{ kind, path, source? }` | Validates source/destination paths |
| `/api/browse` | `POST` | — | Opens native OS folder selection dialog |
| `/api/scan` | `POST` | `{ source, destination? }` | Scans for eligible JPG files |
| `/api/organize` | `POST` | `{ source, destination, files, confirmed }` | Launches asynchronous file move job |
| `/api/progress/<jid>` | `GET` | — | Polls progress of an active organize job |
| `/api/emails` | `POST` | `{ path, output?, save? }` | Extracts emails or saves to output file |
| `/api/title` | `POST` | `{ url, output? }` | Scrapes webpage title and appends to file |
| `/api/history` | `GET` | — | Retrieves all activity records from JSON |
| `/api/history` | `DELETE` | — | Clears all activity records |

---

## 👤 Submission Details

- **Program**: CodeAlpha Internship Program
- **Task**: Task 3 — Task Automation with Python Scripts
- **Author**: Rishi K Yadav
- **Status**: Completed & Verified

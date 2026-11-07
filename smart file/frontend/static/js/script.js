/**
 * SMART FILE ORGANIZER — CLIENT CONTROLLER & INTERACTIONS
 * Connects modern soft mint & sage green UI with Flask backend REST API.
 */

// Selector utilities
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

// Application state
let files = [];
let allHistoryItems = [];
let isBusy = false;

/* ==========================================================================
   FORMATTERS & UTILITIES
   ========================================================================== */

/**
 * Format bytes into human readable binary units.
 */
function fmt(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  const units = ['KB', 'MB', 'GB', 'TB'];
  let i = -1;
  let val = bytes;
  do {
    val /= 1024;
    i++;
  } while (val >= 1024 && i < units.length - 1);
  return val.toFixed(1) + ' ' + units[i];
}

/**
 * HTML escape to prevent XSS when inserting dynamic text.
 */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

/**
 * General API fetcher with JSON deserialization and network error handling.
 */
async function api(url, method = 'GET', body = null) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    return await res.json();
  } catch (err) {
    return {
      ok: false,
      error: 'Could not connect to Python backend. Ensure python app.py is running.'
    };
  }
}

/**
 * Displays a styled toast notification.
 */
function toast(message, type = 'info') {
  const container = $('#toasts');
  if (!container) return;

  const t = document.createElement('div');
  t.className = `toast ${type}`;

  const iconName = type === 'success' ? 'bi-check-circle-fill' : type === 'error' ? 'bi-exclamation-circle-fill' : 'bi-info-circle-fill';
  t.innerHTML = `<i class="bi ${iconName}"></i><span>${esc(message)}</span>`;

  container.appendChild(t);

  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 320);
  }, 4200);
}

/**
 * Animated number counter using requestAnimationFrame.
 */
function countUp(el, targetValue, isSize = false) {
  if (!el) return;
  const target = Number(targetValue) || 0;
  if (target === 0) {
    el.textContent = isSize ? '0 B' : '0';
    return;
  }
  const duration = 850;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const easeOutCubic = 1 - Math.pow(1 - progress, 3);
    const current = target * easeOutCubic;

    el.textContent = isSize ? fmt(current) : Math.round(current).toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = isSize ? fmt(target) : target.toLocaleString();
    }
  }
  requestAnimationFrame(step);
}

/**
 * Toggles button loading spinner state.
 */
function btnBusy(btn, loading, loadingText = '') {
  if (!btn) return;
  if (loading) {
    btn._origHTML = btn.innerHTML;
    btn.innerHTML = `<span class="spin"></span><span>${esc(loadingText)}</span>`;
    btn.disabled = true;
  } else {
    if (btn._origHTML !== undefined) {
      btn.innerHTML = btn._origHTML;
    }
    btn.disabled = false;
  }
}

/**
 * Copies text string to clipboard and shows toast.
 */
async function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
  if (!text) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    toast(successMsg, 'success');
  } catch (err) {
    toast('Unable to copy to clipboard', 'error');
  }
}

/* ==========================================================================
   NAVIGATION & SIDEBAR
   ========================================================================== */

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  organizer: 'File Organizer',
  emails: 'Email Extractor',
  title: 'Title Scraper',
  history: 'Activity History',
  settings: 'Settings',
  about: 'About Project'
};

/**
 * Switch active view.
 */
function go(viewId) {
  const targetView = $('#' + viewId);
  if (!targetView) return;

  // Update views
  $$('.view').forEach((v) => {
    v.classList.toggle('active', v.id === viewId);
  });

  // Update nav links
  $$('nav .nav-link').forEach((link) => {
    const isCurrent = link.dataset.view === viewId;
    link.classList.toggle('active', isCurrent);
  });

  // Update top breadcrumb title
  const breadcrumb = $('#breadcrumbTitle');
  if (breadcrumb) {
    breadcrumb.textContent = VIEW_TITLES[viewId] || 'Workspace';
  }

  // Close mobile drawer
  closeMobileSidebar();

  // Load view-specific data
  if (viewId === 'dashboard') {
    loadStats();
  } else if (viewId === 'history') {
    loadHistory();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openMobileSidebar() {
  $('#sidebar').classList.add('open');
  const overlay = $('#sidebarOverlay');
  if (overlay) overlay.classList.add('active');
}

function closeMobileSidebar() {
  $('#sidebar').classList.remove('open');
  const overlay = $('#sidebarOverlay');
  if (overlay) overlay.classList.remove('active');
}

// Navigation Event Listeners
$$('nav .nav-link').forEach((link) => {
  link.onclick = (e) => {
    e.preventDefault();
    go(link.dataset.view);
  };
});

$$('[data-go]').forEach((el) => {
  el.onclick = (e) => {
    e.preventDefault();
    go(el.dataset.go);
  };
});

// Mobile toggle
const menuToggle = $('#menu');
if (menuToggle) {
  menuToggle.onclick = () => {
    const sidebar = $('#sidebar');
    if (sidebar.classList.contains('open')) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  };
}

const sidebarOverlay = $('#sidebarOverlay');
if (sidebarOverlay) {
  sidebarOverlay.onclick = closeMobileSidebar;
}

// Desktop sidebar collapse toggle
const collapseBtn = $('#collapse');
if (collapseBtn) {
  collapseBtn.onclick = () => {
    const isCollapsed = document.body.classList.toggle('collapsed');
    try {
      localStorage.setItem('sidebarCollapsed', isCollapsed ? '1' : '0');
    } catch {}
    const optSidebar = $('#optSidebar');
    if (optSidebar) optSidebar.checked = isCollapsed;
  };
}

// Restore sidebar preference
try {
  if (localStorage.getItem('sidebarCollapsed') === '1') {
    document.body.classList.add('collapsed');
    const optSidebar = $('#optSidebar');
    if (optSidebar) optSidebar.checked = true;
  }
} catch {}

// Settings: sidebar option toggle
const optSidebar = $('#optSidebar');
if (optSidebar) {
  optSidebar.onchange = (e) => {
    document.body.classList.toggle('collapsed', e.target.checked);
    try {
      localStorage.setItem('sidebarCollapsed', e.target.checked ? '1' : '0');
    } catch {}
  };
}

// Motion preference
const optMotion = $('#optMotion');
if (optMotion) {
  try {
    const prefersNoMotion = localStorage.getItem('nomotion') === '1';
    optMotion.checked = prefersNoMotion;
    document.body.classList.toggle('nomotion', prefersNoMotion);
  } catch {}

  optMotion.onchange = (e) => {
    const checked = e.target.checked;
    document.body.classList.toggle('nomotion', checked);
    try {
      localStorage.setItem('nomotion', checked ? '1' : '0');
    } catch {}
    toast(checked ? 'Reduced motion enabled.' : 'Motion effects restored.', 'info');
  };
}

// Keyboard ESC to close modals/drawer
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMobileSidebar();
    const modal = $('#modal');
    if (modal) modal.hidden = true;
    const clearModal = $('#clearModal');
    if (clearModal) clearModal.hidden = true;
  }
});

/* ==========================================================================
   DASHBOARD & STATS
   ========================================================================== */

/**
 * Load dashboard counters from real API.
 */
async function loadStats() {
  loadRecent();
  const res = await api('/api/stats');
  if (!res || !res.ok) return;

  $$('.stat-card .stat-number').forEach((numEl) => {
    const key = numEl.dataset.key;
    const val = res[key] !== undefined ? res[key] : 0;
    countUp(numEl, val, numEl.dataset.fmt === 'size');
  });
}

/**
 * Load recent 5 history items into dashboard feed.
 */
async function loadRecent() {
  const container = $('#recent');
  if (!container) return;

  const res = await api('/api/history');
  const items = (res && res.items ? res.items : []).slice(0, 5);

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px 10px;">
        <div class="empty-icon" style="width: 48px; height: 48px; font-size: 1.4rem;">
          <i class="bi bi-clock-history"></i>
        </div>
        <h4>No activity recorded yet</h4>
        <p>Run the file organizer, email extractor, or title scraper to view recent tasks here.</p>
      </div>`;
    return;
  }

  const ICON_MAP = {
    JPG: 'bi-images',
    Emails: 'bi-envelope-at',
    Title: 'bi-globe2'
  };

  container.innerHTML = items.map((x) => {
    const taskType = x.task || 'JPG';
    const iconClass = ICON_MAP[taskType] || 'bi-gear';

    let actionText = '';
    if (taskType === 'JPG') {
      actionText = `${x.moved} JPG file${x.moved === 1 ? '' : 's'} moved`;
    } else if (taskType === 'Emails') {
      actionText = `${x.moved} unique emails saved`;
    } else {
      actionText = 'Webpage title scraped and saved';
    }

    const statusBadgeClass = x.status === 'Success' ? 'badge-ok' : x.status === 'Partial' ? 'badge-warn' : 'badge-bad';

    return `
      <div class="feed-item">
        <div class="feed-icon">
          <i class="bi ${iconClass}"></i>
        </div>
        <div class="feed-details">
          <b>${esc(actionText)}</b>
          <small><i class="bi bi-clock"></i> ${esc(x.timestamp)}</small>
        </div>
        <span class="badge ${statusBadgeClass}">${esc(x.status)}</span>
      </div>`;
  }).join('');
}

/* ==========================================================================
   ACTIVITY HISTORY VIEW
   ========================================================================== */

/**
 * Load full activity history table.
 */
async function loadHistory() {
  const rowsContainer = $('#hrows');
  const emptyState = $('#hempty');
  if (!rowsContainer) return;

  rowsContainer.innerHTML = '';
  const res = await api('/api/history');
  allHistoryItems = (res && res.items) || [];

  renderHistoryRows(allHistoryItems);
}

/**
 * Render activity history table rows.
 */
function renderHistoryRows(items) {
  const rowsContainer = $('#hrows');
  const emptyState = $('#hempty');
  if (!rowsContainer) return;

  rowsContainer.innerHTML = '';

  if (!items || !items.length) {
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (emptyState) emptyState.hidden = true;

  items.forEach((item) => {
    const statusBadgeClass = item.status === 'Success' ? 'badge-ok' : item.status === 'Partial' ? 'badge-warn' : 'badge-bad';
    const taskType = item.task || 'JPG';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge badge-neutral">${esc(taskType)}</span></td>
      <td style="white-space: nowrap;"><i class="bi bi-calendar3"></i> ${esc(item.timestamp)}</td>
      <td class="path-cell" title="${esc(item.source)}">
        <span>${esc(item.source)}</span>
      </td>
      <td class="path-cell" title="${esc(item.destination)}">
        <span>${esc(item.destination)}</span>
      </td>
      <td>
        <b>${item.moved}</b>${item.failed ? ` <span class="meta-bad">(${item.failed} failed)</span>` : ''}
      </td>
      <td><span class="badge ${statusBadgeClass}">${esc(item.status)}</span></td>
    `;
    rowsContainer.appendChild(tr);
  });
}

// History Search Filter
const hSearch = $('#hSearch');
if (hSearch) {
  hSearch.oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderHistoryRows(allHistoryItems);
      return;
    }
    const filtered = allHistoryItems.filter((item) => {
      return (
        (item.task || 'JPG').toLowerCase().includes(q) ||
        (item.source || '').toLowerCase().includes(q) ||
        (item.destination || '').toLowerCase().includes(q) ||
        (item.status || '').toLowerCase().includes(q) ||
        (item.timestamp || '').toLowerCase().includes(q)
      );
    });
    renderHistoryRows(filtered);
  };
}

// Refresh history
const refreshHistBtn = $('#refreshHist');
if (refreshHistBtn) {
  refreshHistBtn.onclick = async () => {
    btnBusy(refreshHistBtn, true, 'Reloading…');
    await loadHistory();
    btnBusy(refreshHistBtn, false);
    toast('History refreshed.', 'info');
  };
}

// Clear history confirmation modal handling
function setupClearHistory() {
  const clearHistBtn = $('#clearHist');
  const clearHistSettings = $('#clearHistSettings');
  const clearModal = $('#clearModal');
  const clearModalNo = $('#clearModalNo');
  const clearModalYes = $('#clearModalYes');

  const openClearModal = () => {
    if (clearModal) clearModal.hidden = false;
  };

  if (clearHistBtn) clearHistBtn.onclick = openClearModal;
  if (clearHistSettings) clearHistSettings.onclick = openClearModal;

  if (clearModalNo && clearModal) {
    clearModalNo.onclick = () => {
      clearModal.hidden = true;
    };
  }

  if (clearModalYes && clearModal) {
    clearModalYes.onclick = async () => {
      btnBusy(clearModalYes, true, 'Clearing…');
      await api('/api/history', 'DELETE');
      btnBusy(clearModalYes, false);
      clearModal.hidden = true;
      loadHistory();
      loadStats();
      toast('Activity history successfully cleared.', 'success');
    };
  }
}
setupClearHistory();

/* ==========================================================================
   FILE ORGANIZER
   ========================================================================== */

/**
 * Validate source or destination folder in real time.
 */
async function checkFolder(kind) {
  const inputEl = $('#' + kind);
  const cardEl = $('#' + kind + 'Card');
  const hintEl = $('#' + kind + 'Hint');
  if (!inputEl || !cardEl || !hintEl) return;

  const val = inputEl.value.trim();
  if (!val) {
    cardEl.className = 'card pick-card';
    hintEl.textContent = kind === 'dst' ? "Created automatically if it doesn't exist." : '';
    return;
  }

  const payload = kind === 'src'
    ? { kind: 'source', path: val }
    : { kind: 'destination', path: val, source: $('#src').value };

  const res = await api('/api/validate', 'POST', payload);

  cardEl.classList.remove('valid', 'invalid');
  if (res.ok) {
    cardEl.classList.add('valid');
    hintEl.textContent = 'Folder path is verified and valid.';
  } else {
    // If destination does not exist yet, that's completely acceptable (auto-created)
    if (kind === 'dst' && /not found/i.test(res.error || '')) {
      cardEl.classList.add('valid');
      hintEl.textContent = "Folder doesn't exist yet; it will be created automatically.";
    } else {
      cardEl.classList.add('invalid');
      hintEl.textContent = res.error || 'Invalid folder path.';
    }
  }
}

// Live change listener
const srcInput = $('#src');
if (srcInput) {
  srcInput.oninput = () => {
    checkFolder('src');
    resetPreview();
  };
}

const dstInput = $('#dst');
if (dstInput) {
  dstInput.oninput = () => {
    checkFolder('dst');
  };
}

// Native browse dialog caller
$$('[data-browse]').forEach((btn) => {
  btn.onclick = async () => {
    const targetId = btn.dataset.browse;
    btnBusy(btn, true, 'Selecting…');
    const res = await api('/api/browse', 'POST');
    btnBusy(btn, false);

    if (!res.ok) {
      return toast(res.error || "Browse dialog unavailable. Paste the folder path instead.", 'error');
    }

    if (res.path) {
      const inputEl = $('#' + targetId);
      if (inputEl) {
        inputEl.value = res.path;
        checkFolder(targetId);
        if (targetId === 'src') {
          resetPreview();
        }
      }
    }
  };
});

/**
 * Reset preview table state.
 */
function resetPreview() {
  files = [];
  const rows = $('#rows');
  if (rows) rows.innerHTML = '';
  const empty = $('#empty');
  if (empty) empty.hidden = false;
  const count = $('#count');
  if (count) count.textContent = '';
  const organizeBtn = $('#organizeBtn');
  if (organizeBtn) organizeBtn.disabled = true;
}

// Preview Files handler
const previewBtn = $('#previewBtn');
if (previewBtn) {
  previewBtn.onclick = async () => {
    const srcVal = ($('#src') && $('#src').value.trim()) || '';
    if (!srcVal) {
      toast('Please enter or select a source folder first.', 'error');
      if ($('#src')) $('#src').focus();
      return;
    }

    btnBusy(previewBtn, true, 'Scanning files…');
    const resultCard = $('#resultCard');
    if (resultCard) resultCard.hidden = true;

    const res = await api('/api/scan', 'POST', {
      source: srcVal,
      destination: ($('#dst') && $('#dst').value.trim()) || ''
    });

    btnBusy(previewBtn, false);

    if (!res.ok) {
      resetPreview();
      checkFolder('src');
      checkFolder('dst');
      return toast(res.error, 'error');
    }

    files = res.files || [];
    const rows = $('#rows');
    const empty = $('#empty');
    const count = $('#count');
    const organizeBtn = $('#organizeBtn');

    if (rows) rows.innerHTML = '';

    if (files.length === 0) {
      if (empty) {
        empty.hidden = false;
        empty.querySelector('h4').textContent = 'No JPG files found';
        empty.querySelector('p').textContent = `Scanned ${res.total} file(s), but none had a .jpg extension. Try a different source directory.`;
      }
      if (count) count.textContent = `0 JPG of ${res.total} files`;
      if (organizeBtn) organizeBtn.disabled = true;
      toast('No JPG files found in the chosen folder.', 'error');
    } else {
      if (empty) empty.hidden = true;
      files.forEach((file) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><b>${esc(file.name)}</b></td>
          <td><span class="badge badge-neutral">${esc(file.ext)}</span></td>
          <td class="size-cell">${fmt(file.size)}</td>
          <td class="path-cell" title="${esc(file.location)}">${esc(file.location)}</td>
          <td><span class="badge badge-ok">${esc(file.status || 'Ready')}</span></td>
        `;
        rows.appendChild(tr);
      });
      if (count) count.textContent = `${files.length} JPG of ${res.total} file${res.total === 1 ? '' : 's'}`;
      if (organizeBtn) organizeBtn.disabled = false;
      toast(`Found ${files.length} JPG file${files.length > 1 ? 's' : ''} ready to organize.`, 'success');
    }

    loadStats();
    checkFolder('src');
    checkFolder('dst');
  };
}

// Organize Files handler — Confirmation modal trigger
const organizeBtn = $('#organizeBtn');
if (organizeBtn) {
  organizeBtn.onclick = () => {
    const dstVal = ($('#dst') && $('#dst').value.trim()) || '';
    if (!dstVal) {
      checkFolder('dst');
      toast('Please choose a destination folder first.', 'error');
      if ($('#dst')) $('#dst').focus();
      return;
    }
    if (!files.length) {
      toast('Please preview files before organizing.', 'error');
      return;
    }

    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    const modalText = $('#modalText');
    if (modalText) {
      modalText.innerHTML = `
        You are about to safely transfer <b>${files.length} JPG file${files.length > 1 ? 's' : ''}</b> (${fmt(totalBytes)})
        from <code>${esc($('#src').value)}</code> to <code>${esc(dstVal)}</code>.
      `;
    }

    const modal = $('#modal');
    if (modal) modal.hidden = false;
  };
}

// Modal cancel
const mNo = $('#mNo');
if (mNo) {
  mNo.onclick = () => {
    const modal = $('#modal');
    if (modal) modal.hidden = true;
  };
}

// Modal confirm — Execute file move & poll progress
const mYes = $('#mYes');
if (mYes) {
  mYes.onclick = async () => {
    const modal = $('#modal');
    if (modal) modal.hidden = true;

    const srcPath = $('#src').value;
    const dstPath = $('#dst').value;
    const fileNames = files.map((f) => f.name);

    const res = await api('/api/organize', 'POST', {
      source: srcPath,
      destination: dstPath,
      files: fileNames,
      confirmed: true
    });

    if (!res.ok) {
      return toast(res.error, 'error');
    }

    // Show progress card
    const progressCard = $('#progressCard');
    const resultCard = $('#resultCard');
    const previewCard = $('#previewCard');

    if (progressCard) progressCard.hidden = false;
    if (resultCard) resultCard.hidden = true;
    if (previewCard) previewCard.hidden = true;

    if (organizeBtn) organizeBtn.disabled = true;
    if (previewBtn) previewBtn.disabled = true;

    // Polling function
    const pollProgress = async () => {
      const p = await api('/api/progress/' + res.job);
      if (!p || !p.total) {
        setTimeout(pollProgress, 200);
        return;
      }

      const percent = p.total ? Math.round((p.completed / p.total) * 100) : 0;
      const bar = $('#bar');
      const pPct = $('#pPct');
      const pCur = $('#pCur');
      const pDone = $('#pDone');
      const pOk = $('#pOk');
      const pBad = $('#pBad');

      if (bar) bar.style.width = percent + '%';
      if (pPct) pPct.textContent = percent + '%';
      if (pCur) pCur.textContent = p.done ? 'Finalizing changes…' : `Moving ${p.current || '…'}`;
      if (pDone) pDone.innerHTML = `<i class="bi bi-list-check"></i> ${p.completed} / ${p.total} completed`;
      if (pOk) pOk.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${p.moved} moved`;
      if (pBad) pBad.innerHTML = `<i class="bi bi-x-circle-fill"></i> ${p.failed} failed`;

      if (!p.done) {
        setTimeout(pollProgress, 160);
        return;
      }

      // Completed
      if (progressCard) progressCard.hidden = true;
      if (previewBtn) previewBtn.disabled = false;
      if (previewCard) previewCard.hidden = false;

      if (p.error) {
        toast(p.error, 'error');
        if (organizeBtn) organizeBtn.disabled = false;
        return;
      }

      displayOrganizationResult(p.result);
    };

    pollProgress();
  };
}

/**
 * Displays organization summary with celebratory animations.
 */
function displayOrganizationResult(res) {
  if (!res) return;
  const isCompleteSuccess = res.failed === 0 && res.moved > 0;

  const resTitle = $('#resTitle');
  const resLine = $('#resLine');
  const resDest = $('#resDest');
  const resFails = $('#resFails');
  const resultCard = $('#resultCard');

  if (resTitle) {
    resTitle.textContent = isCompleteSuccess
      ? 'FILES ORGANIZED SUCCESSFULLY!'
      : res.moved > 0
      ? 'FILES ORGANIZED WITH PARTIAL WARNINGS'
      : 'NO FILES WERE MOVED';
  }

  if (resLine) {
    resLine.textContent = `${res.moved} file${res.moved === 1 ? '' : 's'} moved (${fmt(res.bytes)}) in ${res.seconds}s.`;
  }

  if (resDest) {
    resDest.innerHTML = `<i class="bi bi-folder-check"></i> Destination: <b>${esc(res.destination)}</b>`;
  }

  const failedItems = (res.results || []).filter((i) => i.status === 'failed');
  const renamedItems = (res.results || []).filter((i) => i.message && i.status === 'moved');

  let failsHtml = '';
  if (failedItems.length) {
    failsHtml += `
      <div class="fail-box">
        <b>${failedItems.length} file(s) failed:</b><br>
        ${failedItems.map((f) => `• ${esc(f.name)}: ${esc(f.message)}`).join('<br>')}
      </div>`;
  }
  if (renamedItems.length) {
    failsHtml += `
      <div class="modal-notice" style="margin-top: 10px;">
        <i class="bi bi-info-circle-fill"></i>
        <span>${renamedItems.length} file(s) were safely renamed with numeric suffixes (e.g. photo (1).jpg) to preserve existing files.</span>
      </div>`;
  }

  if (resFails) resFails.innerHTML = failsHtml;
  if (resultCard) resultCard.hidden = false;

  resetPreview();
  loadStats();

  if (isCompleteSuccess) {
    launchConfetti();
  }

  toast(
    isCompleteSuccess ? 'All JPG files successfully organized.' : 'Operation completed with errors. See summary.',
    isCompleteSuccess ? 'success' : 'error'
  );
}

// Organize More button handler
const moreBtn = $('#moreBtn');
if (moreBtn) {
  moreBtn.onclick = () => {
    const resultCard = $('#resultCard');
    if (resultCard) resultCard.hidden = true;
    const srcInput = $('#src');
    if (srcInput) srcInput.value = '';
    checkFolder('src');
    resetPreview();
  };
}

/* ==========================================================================
   EMAIL EXTRACTOR
   ========================================================================== */

let extractedEmailsList = [];

const emFindBtn = $('#emFind');
if (emFindBtn) {
  emFindBtn.onclick = async () => {
    const pathInput = $('#emIn');
    const path = pathInput ? pathInput.value.trim() : '';
    if (!path) {
      toast('Please provide a path to a .txt file.', 'error');
      if (pathInput) pathInput.focus();
      return;
    }

    btnBusy(emFindBtn, true, 'Searching…');
    const res = await api('/api/emails', 'POST', { path });
    btnBusy(emFindBtn, false);

    const emSaveBtn = $('#emSave');
    const emCopyAllBtn = $('#emCopyAll');
    const emEmpty = $('#emEmpty');
    const emCount = $('#emCount');
    const emList = $('#emList');

    if (!res.ok) {
      if (emSaveBtn) emSaveBtn.disabled = true;
      if (emCopyAllBtn) emCopyAllBtn.disabled = true;
      return toast(res.error, 'error');
    }

    extractedEmailsList = res.emails || [];
    if (emList) emList.innerHTML = '';

    if (!extractedEmailsList.length) {
      if (emEmpty) {
        emEmpty.hidden = false;
        emEmpty.querySelector('p').textContent = 'No email addresses were found in this text file.';
      }
      if (emCount) emCount.textContent = '0 unique';
      if (emSaveBtn) emSaveBtn.disabled = true;
      if (emCopyAllBtn) emCopyAllBtn.disabled = true;
      toast('No email addresses found.', 'error');
    } else {
      if (emEmpty) emEmpty.hidden = true;
      extractedEmailsList.forEach((email) => {
        const chip = document.createElement('div');
        chip.className = 'email-chip';
        chip.innerHTML = `
          <i class="bi bi-envelope"></i>
          <span>${esc(email)}</span>
          <button type="button" class="chip-copy-btn" title="Copy email address">
            <i class="bi bi-clipboard"></i>
          </button>
        `;
        const copyBtn = chip.querySelector('.chip-copy-btn');
        copyBtn.onclick = (e) => {
          e.stopPropagation();
          copyToClipboard(email, `Copied ${email}`);
          copyBtn.innerHTML = '<i class="bi bi-check2"></i>';
          setTimeout(() => {
            copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
          }, 1500);
        };
        emList.appendChild(chip);
      });

      if (emCount) {
        emCount.textContent = `${res.unique} unique (${res.total_matches} matches found)`;
      }
      if (emSaveBtn) emSaveBtn.disabled = false;
      if (emCopyAllBtn) emCopyAllBtn.disabled = false;
      toast(`Extracted ${res.unique} unique email address${res.unique === 1 ? '' : 'es'}.`, 'success');
    }
  };
}

// Save emails to file
const emSaveBtn = $('#emSave');
if (emSaveBtn) {
  emSaveBtn.onclick = async () => {
    const path = ($('#emIn') && $('#emIn').value.trim()) || '';
    const output = ($('#emOut') && $('#emOut').value.trim()) || '';

    btnBusy(emSaveBtn, true, 'Saving…');
    const res = await api('/api/emails', 'POST', { path, output, save: true });
    btnBusy(emSaveBtn, false);

    if (res.ok) {
      toast(`Successfully saved to ${res.saved_to}`, 'success');
      loadStats();
    } else {
      toast(res.error, 'error');
    }
  };
}

// Copy all emails
const emCopyAllBtn = $('#emCopyAll');
if (emCopyAllBtn) {
  emCopyAllBtn.onclick = () => {
    if (!extractedEmailsList.length) return;
    copyToClipboard(extractedEmailsList.join('\n'), `Copied ${extractedEmailsList.length} emails to clipboard.`);
  };
}

/* ==========================================================================
   TITLE SCRAPER
   ========================================================================== */

let lastScrapedTitle = '';

const tGoBtn = $('#tGo');
if (tGoBtn) {
  tGoBtn.onclick = async () => {
    const urlInput = $('#tUrl');
    const url = urlInput ? urlInput.value.trim() : '';
    const outInput = $('#tOut');
    const output = outInput ? outInput.value.trim() : '';

    if (!url) {
      toast('Please enter a website URL starting with http:// or https://', 'error');
      if (urlInput) urlInput.focus();
      return;
    }

    btnBusy(tGoBtn, true, 'Scraping webpage…');
    const res = await api('/api/title', 'POST', { url, output });
    btnBusy(tGoBtn, false);

    const tCard = $('#tCard');
    const tRes = $('#tRes');
    const tSaved = $('#tSaved');

    if (!res.ok) {
      if (tCard) tCard.hidden = true;
      return toast(res.error, 'error');
    }

    lastScrapedTitle = res.title;
    if (tRes) tRes.textContent = res.title;
    if (tSaved) tSaved.textContent = `Appended to: ${res.saved_to}`;
    if (tCard) tCard.hidden = false;

    toast('Page title extracted and recorded successfully!', 'success');
    loadStats();
  };
}

// Copy Scraped Title
const tCopyBtn = $('#tCopyBtn');
if (tCopyBtn) {
  tCopyBtn.onclick = () => {
    if (!lastScrapedTitle) return;
    copyToClipboard(lastScrapedTitle, 'Title copied to clipboard!');
  };
}

/* ==========================================================================
   CONFETTI CELEBRATION (MINT & SAGE PALETTE)
   ========================================================================== */

function launchConfetti() {
  if (document.body.classList.contains('nomotion')) return;

  const canvas = $('#confetti');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const palette = ['#398653', '#245C3A', '#A8D5B5', '#DCEFE0', '#27834B', '#559E6B', '#FFFFFF'];
  const particleCount = 130;

  const particles = Array.from({ length: particleCount }, () => ({
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.42,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 14 - 3,
    size: Math.random() * 8 + 4,
    rotation: Math.random() * 6,
    color: palette[Math.floor(Math.random() * palette.length)]
  }));

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.vy += 0.36; // gravity
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += 0.18;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame / 105);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });

    if (++frame < 105) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  requestAnimationFrame(animate);
}

/* ==========================================================================
   SYSTEM CLOCK & HEALTH PING
   ========================================================================== */

function updateClock() {
  const clockEl = $('#clock');
  if (!clockEl) return;
  const now = new Date();
  clockEl.textContent = now.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }) + ' ' + now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}
updateClock();
setInterval(updateClock, 1000);

async function checkBackendHealth() {
  const res = await api('/api/stats');
  const pill = $('#backendStatusPill');
  const txt = $('#stxt');
  if (!pill || !txt) return;

  const isOnline = res && res.ok === true;
  pill.classList.toggle('off', !isOnline);
  txt.textContent = isOnline ? 'Python backend online' : 'Backend offline';
}
setInterval(checkBackendHealth, 10000);

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  go('dashboard');
  checkBackendHealth();
});

// Also immediately trigger dashboard
go('dashboard');

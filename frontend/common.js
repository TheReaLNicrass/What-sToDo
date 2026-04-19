// Theme wird direkt beim Laden gesetzt, damit kein kurzes Aufblitzen des falschen Themes passiert.
(function applyStoredTheme() {
  const saved = localStorage.getItem('colorTheme');
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
})();

window.AppCommon = (() => {
  const storageKeys = {
    currentUser: 'currentUser',
    currentProjectId: 'currentProjectId',
  };

  function getApiUrl() {
    return `${location.origin}/api`;
  }

  function getCurrentUser() {
    return JSON.parse(localStorage.getItem(storageKeys.currentUser) || 'null');
  }

  function setCurrentUser(user) {
    if (!user) localStorage.removeItem(storageKeys.currentUser);
    else localStorage.setItem(storageKeys.currentUser, JSON.stringify(user));
  }

  function getCurrentProjectId() {
    return localStorage.getItem(storageKeys.currentProjectId) || '';
  }

  function setCurrentProjectId(projectId) {
    if (!projectId) localStorage.removeItem(storageKeys.currentProjectId);
    else localStorage.setItem(storageKeys.currentProjectId, projectId);
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  async function api(path, options = {}) {
    const response = await fetch(`${getApiUrl()}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'API-Fehler');
    return data;
  }

  async function loadSessionUser() {
    try {
      const data = await api('/auth/me');
      setCurrentUser(data.user);
      return data.user;
    } catch {
      setCurrentUser(null);
      return null;
    }
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setCurrentUser(null);
      setCurrentProjectId('');
    }
  }

  function getTheme() {
    return localStorage.getItem('colorTheme') || 'dark';
  }

  function toggleTheme() {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem('colorTheme', next);
    if (next === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    // Icon im Button aktualisieren
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.innerHTML = themeIcon(next);
  }

  // Gibt das passende SVG-Icon für den aktuellen Theme-Zustand zurück.
  // Sonnensymbol = aktuell dark (Wechsel zu light), Mondsymbol = aktuell light (Wechsel zu dark).
  function themeIcon(theme) {
    if (theme === 'light') {
      return `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>`;
    }
    return `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>`;
  }

  function renderShell({ pageKey }) {
    const user = getCurrentUser();
    const navItems = [
      { href: '/dashboard', label: 'Dashboard', key: 'dashboard' },
      { href: '/projects', label: 'Projekte', key: 'projects' },
      { href: '/tasks', label: 'Aufgaben', key: 'tasks' },
    ];
    const navLinks = navItems
      .map(({ href, label, key }) => `<a class="nav-link ${key === pageKey ? 'active' : ''}" href="${href}">${escapeHtml(label)}</a>`)
      .join('');
    const avatarLetter = escapeHtml((user?.name || '?').trim().charAt(0).toUpperCase());

    return `
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-logo">W</div>
          <span class="brand-name">What's<strong>ToDo</strong></span>
        </div>
        <nav class="sidebar-nav">${navLinks}</nav>
        <div class="sidebar-footer">
          <div class="sidebar-user-info">
            <div class="user-avatar">${avatarLetter}</div>
            <div class="user-text">
              <strong class="user-name">${user ? escapeHtml(user.name) : '—'}</strong>
              <p class="user-email">${user ? escapeHtml(user.email) : ''}</p>
            </div>
          </div>
          <button id="themeToggleBtn" class="theme-toggle-btn" title="Theme wechseln">${themeIcon(getTheme())}</button>
          <button id="globalLogoutBtn" class="logout-btn ${user ? '' : 'is-hidden'}" title="Abmelden">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>
      <main class="main-content">
        <div id="pageNotice" class="notice error"></div>
        <div id="pageSuccess" class="notice success"></div>
        <section id="pageContent"></section>
      </main>`;
  }

  function bindShell() {
    const logoutBtn = document.getElementById('globalLogoutBtn');
    if (logoutBtn && !logoutBtn.classList.contains('is-hidden')) {
      logoutBtn.onclick = async () => {
        await logout();
        location.href = '/auth';
      };
    }
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.onclick = toggleTheme;
  }

  function notify(type, text = '') {
    const success = document.getElementById('pageSuccess');
    const error = document.getElementById('pageNotice');
    if (!success || !error) return;
    success.style.display = type === 'success' && text ? 'block' : 'none';
    error.style.display = type === 'error' && text ? 'block' : 'none';
    success.textContent = type === 'success' ? text : '';
    error.textContent = type === 'error' ? text : '';
  }

  function requireAuth(user) {
    if (!user) {
      location.href = '/auth';
      return false;
    }
    return true;
  }

  return {
    api,
    bindShell,
    escapeHtml,
    getCurrentProjectId,
    getCurrentUser,
    getTheme,
    loadSessionUser,
    logout,
    notify,
    renderShell,
    requireAuth,
    setCurrentProjectId,
    setCurrentUser,
    toggleTheme,
  };
})();

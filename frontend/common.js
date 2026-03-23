window.AppCommon = (() => {
  const storageKeys = {
    apiUrl: 'apiUrl',
    currentUser: 'currentUser',
    currentProjectId: 'currentProjectId',
  };

  function getApiUrl() {
    return localStorage.getItem(storageKeys.apiUrl) || `${location.origin}/api`;
  }

  function setApiUrl(value) {
    localStorage.setItem(storageKeys.apiUrl, value.replace(/\/$/, ''));
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
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}${path}`, {
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
    } catch (error) {
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

  function renderShell({ pageTitle, pageDescription, pageKey }) {
    const user = getCurrentUser();
    const links = [
      ['/dashboard', 'Start', 'dashboard'],
      ['/auth', 'Auth', 'auth'],
      ['/projects', 'Projekte', 'projects'],
      ['/tasks', 'Aufgaben', 'tasks'],
    ].map(([href, label, key]) => `<a class="nav-link ${key === pageKey ? 'active' : ''}" href="${href}">${label}</a>`).join('');

    return `
      <aside class="sidebar">
        <div class="brand card">
          <p class="eyebrow">Workspace</p>
          <h1>What-sToDo</h1>
          <p class="muted">Klare Bereiche für Authentifizierung, Projekte und Aufgaben – passend zum relationalen Schema.</p>
          <label class="field compact">
            <span>API URL</span>
            <input id="apiUrl" value="${escapeHtml(getApiUrl())}" />
          </label>
        </div>
        <nav class="card nav-card">${links}</nav>
        <div class="card profile-card">
          <p class="eyebrow">Session</p>
          <h3>${user ? escapeHtml(user.name) : 'Nicht eingeloggt'}</h3>
          <p class="muted">${user ? escapeHtml(user.email) : 'Bitte zuerst über die Auth-Seite anmelden.'}</p>
          <button id="globalLogoutBtn" class="ghost ${user ? '' : 'is-hidden'}">Logout</button>
        </div>
      </aside>
      <main class="main-content">
        <header class="hero card page-hero">
          <div>
            <p class="eyebrow">${pageKey}</p>
            <h2>${pageTitle}</h2>
            <p class="muted">${pageDescription}</p>
          </div>
        </header>
        <div id="pageNotice" class="notice error"></div>
        <div id="pageSuccess" class="notice success"></div>
        <section id="pageContent"></section>
      </main>`;
  }

  function bindShell() {
    const apiInput = document.getElementById('apiUrl');
    if (apiInput) {
      apiInput.onchange = () => setApiUrl(apiInput.value.trim() || `${location.origin}/api`);
      apiInput.onblur = apiInput.onchange;
    }
    const logoutButton = document.getElementById('globalLogoutBtn');
    if (logoutButton && !logoutButton.classList.contains('is-hidden')) {
      logoutButton.onclick = async () => {
        await logout();
        location.href = '/auth';
      };
    }
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
    getApiUrl,
    getCurrentProjectId,
    getCurrentUser,
    loadSessionUser,
    logout,
    notify,
    renderShell,
    requireAuth,
    setApiUrl,
    setCurrentProjectId,
    setCurrentUser,
  };
})();
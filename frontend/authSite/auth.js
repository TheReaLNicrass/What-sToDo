(async () => {
  const { renderShell, bindShell, api, notify, setCurrentUser, loadSessionUser, getCurrentUser } = window.AppCommon;
  document.getElementById('app').innerHTML = renderShell({
    pageTitle: 'Authentifizierung',
    pageDescription: 'Registriere neue Benutzer und melde dich per Cookie-Session an – ohne Token-Flows im Frontend.',
    pageKey: 'auth',
  });
  bindShell();
  await loadSessionUser();

  document.getElementById('pageContent').innerHTML = `
    <section class="content-grid auth-grid">
      <article class="panel card section-stack">
        <p class="eyebrow">Registrierung</p>
        <h3>Neuen Benutzer anlegen</h3>
        <label class="field"><span>Name</span><input id="registerName" placeholder="Max Mustermann" /></label>
        <label class="field"><span>E-Mail</span><input id="registerEmail" type="email" placeholder="name@firma.de" /></label>
        <label class="field"><span>Passwort</span><input id="registerPassword" type="password" placeholder="Passwort" /></label>
        <button id="registerBtn" class="primary">Registrieren</button>
      </article>
      <article class="panel card section-stack">
        <p class="eyebrow">Login</p>
        <h3>Bestehenden Benutzer anmelden</h3>
        <label class="field"><span>E-Mail</span><input id="loginEmail" type="email" placeholder="name@firma.de" /></label>
        <label class="field"><span>Passwort</span><input id="loginPassword" type="password" placeholder="Passwort" /></label>
        <div class="action-row">
          <button id="loginBtn" class="primary">Login</button>
          <a class="secondary link-button" href="/dashboard">Zum Dashboard</a>
        </div>
      </article>
    </section>
    <section class="panel card section-stack">
      <p class="eyebrow">Status</p>
      <h3>Aktuelle Session</h3>
      <p class="muted" id="sessionState">${getCurrentUser() ? 'Du bist bereits eingeloggt.' : 'Aktuell ist keine Session aktiv.'}</p>
    </section>`;

  document.getElementById('registerBtn').onclick = async () => {
    try {
      const user = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('registerName').value.trim(),
          email: document.getElementById('registerEmail').value.trim(),
          password: document.getElementById('registerPassword').value,
        }),
      });
      notify('success', `Benutzer ${user.user.name} wurde angelegt.`);
    } catch (error) {
      notify('error', error.message);
    }
  };

  document.getElementById('loginBtn').onclick = async () => {
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('loginEmail').value.trim(),
          password: document.getElementById('loginPassword').value,
        }),
      });
      setCurrentUser(result.user);
      notify('success', `Willkommen zurück, ${result.user.name}.`);
      document.getElementById('sessionState').textContent = 'Session aktiv. Du wirst jetzt zum Dashboard weitergeleitet.';
      setTimeout(() => { location.href = '/dashboard'; }, 300);
    } catch (error) {
      notify('error', error.message);
    }
  };
})();
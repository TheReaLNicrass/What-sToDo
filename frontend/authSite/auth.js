(async () => {
  const { api, setCurrentUser, loadSessionUser } = window.AppCommon;

  // Redirect to dashboard if already logged in
  const user = await loadSessionUser();
  if (user) {
    location.href = '/dashboard';
    return;
  }

  function notify(type, text) {
    const error = document.getElementById('authNotice');
    const success = document.getElementById('authSuccess');
    error.style.display = type === 'error' && text ? 'block' : 'none';
    success.style.display = type === 'success' && text ? 'block' : 'none';
    error.textContent = type === 'error' ? text : '';
    success.textContent = type === 'success' ? text : '';
  }

  // Tab switching
  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.onclick = () => {
      document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      document.getElementById('loginForm').style.display = isLogin ? 'grid' : 'none';
      document.getElementById('registerForm').style.display = isLogin ? 'none' : 'grid';
      notify('', '');
    };
  });

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
      location.href = '/dashboard';
    } catch (error) {
      notify('error', error.message);
    }
  };

  document.getElementById('registerBtn').onclick = async () => {
    try {
      const result = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('registerName').value.trim(),
          email: document.getElementById('registerEmail').value.trim(),
          password: document.getElementById('registerPassword').value,
        }),
      });
      notify('success', `Konto für ${result.user.name} erstellt. Du kannst dich jetzt anmelden.`);
      document.querySelector('[data-tab="login"]').click();
    } catch (error) {
      notify('error', error.message);
    }
  };

  // Enter-Taste support
  document.getElementById('loginPassword').onkeydown = (e) => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
  };
  document.getElementById('registerPassword').onkeydown = (e) => {
    if (e.key === 'Enter') document.getElementById('registerBtn').click();
  };
})();

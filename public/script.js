/* ================================================================
   script.js — Auth page logic (index.html)
   ================================================================ */

// ── Redirect if already logged in ────────────────────────────
if (localStorage.getItem('token')) {
  window.location.href = '/dashboard.html';
}

// ── Tab switcher ──────────────────────────────────────────────
function switchTab(tab) {
  const loginForm  = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const tabLogin   = document.getElementById('tab-login');
  const tabSignup  = document.getElementById('tab-signup');

  clearError();

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
  }
}

// ── Error display ─────────────────────────────────────────────
function showError(msg) {
  const banner = document.getElementById('auth-error');
  banner.textContent = msg;
  banner.classList.remove('hidden');
}
function clearError() {
  const banner = document.getElementById('auth-error');
  banner.classList.add('hidden');
  banner.textContent = '';
}

// ── Loading state ─────────────────────────────────────────────
function setLoading(btnId, loading) {
  const btn     = document.getElementById(btnId);
  const text    = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  text.classList.toggle('hidden', loading);
  spinner.classList.toggle('hidden', !loading);
}

// ── Login form ────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) return showError('Please fill in all fields.');

  setLoading('login-btn', true);
  try {
    const data = await login(email, password);
    localStorage.setItem('token', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = '/dashboard.html';
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading('login-btn', false);
  }
});

// ── Signup form ───────────────────────────────────────────────
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const role     = document.getElementById('signup-role').value;

  if (!name || !email || !password) return showError('Please fill in all fields.');
  if (name.length < 2)             return showError('Name must be at least 2 characters.');
  if (password.length < 6)         return showError('Password must be at least 6 characters.');

  setLoading('signup-btn', true);
  try {
    const { user, token } = await signup(name, email, password, role);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    window.location.href = '/dashboard.html';
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading('signup-btn', false);
  }
});

/* AbsenSiswa — admin session gate (login & logout) */
(function () {
  'use strict';

  const App = window.App;
  const utils = App.utils;

  const SESSION_KEY = 'absensi_siswa_session';
  let pendingPage = '';

  function getCredUsername() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return parsed && parsed.user ? String(parsed.user) : '';
    } catch (err) {
      return '';
    }
  }

  function isLoggedIn() {
    return !!getCredUsername();
  }

  function refreshLogoutButton() {
    const button = $('logoutBtn');
    if (!button) return;
    button.classList.toggle('hidden', !isLoggedIn());
    button.classList.toggle('flex', isLoggedIn());
  }

  function openLogin(pending) {
    pendingPage = pending && pending !== 'dashboard' ? pending : 'dashboard';

    const error = $('loginError');
    if (error) {
      error.textContent = '';
      error.classList.add('hidden');
    }
    const form = $('loginForm');
    if (form) form.reset();

    const dialog = $('loginDialog');
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    setTimeout(() => {
      const input = $('loginUsername');
      if (input) input.focus();
    }, 60);
  }

  function showError(message) {
    const error = $('loginError');
    if (error) {
      error.textContent = message;
      error.classList.remove('hidden');
    }
    utils.toast(message, 'error', 'Login gagal');
  }

  async function submit(event) {
    event.preventDefault();
    const usernameInput = $('loginUsername');
    const passwordInput = $('loginPassword');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (passwordInput) passwordInput.value = '';
        showError(data.error || 'Username atau password salah.');
        return;
      }

      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          user: data.user || username,
          role: data.role || 'admin',
          at: new Date().toISOString()
        }));
      } catch (err) {
        console.error('Gagal menyimpan sesi login:', err);
      }

      const target = pendingPage || 'dashboard';
      pendingPage = '';

      const dialog = $('loginDialog');
      if (dialog && dialog.open) dialog.close();

      refreshLogoutButton();
      utils.toast(`Selamat datang, ${data.user || username}.`, 'success', 'Login berhasil');

      if (target !== 'dashboard') App.navigate(target);
    } catch (err) {
      if (passwordInput) passwordInput.value = '';
      showError('Tidak dapat terhubung ke server untuk login.');
    }
  }

  function logout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (err) {
      console.error('Gagal menghapus sesi login:', err);
    }
    pendingPage = '';
    refreshLogoutButton();
    utils.toast('Anda telah keluar dari sesi admin.', 'info', 'Keluar');
    App.navigate('dashboard');
  }

  function init() {
    const form = $('loginForm');
    if (form) form.addEventListener('submit', submit);

    const logoutBtn = $('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    refreshLogoutButton();
  }

  function requireAdmin() {
    if (isLoggedIn()) return true;
    openLogin(App && App._lastPage ? App._lastPage : 'dashboard');
    utils.toast('Hanya admin yang bisa melakukan aksi ini.', 'warning', 'Akses dibatasi');
    return false;
  }

  App.Auth = { init, isLoggedIn, openLogin, logout, requireAdmin, getUser: getCredUsername };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

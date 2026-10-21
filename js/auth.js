/* AbsenSiswa — admin session gate (login & logout) */
(function () {
  'use strict';

  const App = window.App;
  const utils = App.utils;

  const SESSION_KEY = 'absensi_siswa_session';
  const CREDENTIALS = { username: 'admin', password: 'adminabsen' };

  let pendingPage = '';

  function $(id) {
    return document.getElementById(id);
  }

  function isLoggedIn() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!(parsed && parsed.user === CREDENTIALS.username);
    } catch (err) {
      return false;
    }
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

  function submit(event) {
    event.preventDefault();
    const usernameInput = $('loginUsername');
    const passwordInput = $('loginPassword');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (username !== CREDENTIALS.username || password !== CREDENTIALS.password) {
      if (passwordInput) passwordInput.value = '';
      showError('Username atau password salah.');
      return;
    }

    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        user: username,
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
    utils.toast(`Selamat datang, ${username}.`, 'success', 'Login berhasil');

    if (target !== 'dashboard') App.navigate(target);
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

  App.Auth = { init, isLoggedIn, openLogin, logout };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

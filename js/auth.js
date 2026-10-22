/* AbsenSiswa — role-based session gate (tanpa auth server) */
(function () {
  'use strict';

  const App = window.App;
  const utils = App.utils;

  const SESSION_KEY = 'absensi_siswa_session_v1';

  const USERS = {
    superadmin: { password: 'superadmin00', role: 'admin', name: 'Super Admin' },
    admin: { password: 'adminabsen', role: 'operator', name: 'Operator' }
  };

  let pendingPage = '';

  function $(id) {
    return document.getElementById(id);
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.role) return null;
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getSession();
  }

  function getRole() {
    const session = getSession();
    return session && session.role ? session.role : 'guest';
  }

  function getUser() {
    const session = getSession();
    return session && session.user ? session.user : '';
  }

  function getDisplayName() {
    const session = getSession();
    if (!session) return '';
    if (session.name) return session.name;
    if (session.user) return session.user;
    return '';
  }

  function refreshAuthUI() {
    const logoutBtn = $('logoutBtn');
    if (logoutBtn) {
      if (isLoggedIn()) {
        logoutBtn.classList.remove('hidden');
        logoutBtn.classList.add('flex');
      } else {
        logoutBtn.classList.add('hidden');
        logoutBtn.classList.remove('flex');
      }
    }

    const userInfo = $('userInfo');
    if (userInfo) {
      if (isLoggedIn()) {
        const role = getRole();
        const name = getDisplayName();
        const roleLabel = role === 'admin' ? 'Admin' : role === 'operator' ? 'Operator' : role;
        userInfo.textContent = name ? `${name} (${roleLabel})` : roleLabel;
        userInfo.classList.remove('hidden');
      } else {
        userInfo.textContent = '';
        userInfo.classList.add('hidden');
      }
    }

    const loginTrigger = $('loginTrigger');
    if (loginTrigger) {
      if (isLoggedIn()) {
        loginTrigger.classList.add('hidden');
      } else {
        loginTrigger.classList.remove('hidden');
      }
    }

    updateNavVisibility();
  }

  function updateNavVisibility() {
    const role = getRole();
    const navs = document.querySelectorAll('[data-nav]');
    navs.forEach((nav) => {
      const page = nav.dataset.nav;
      if (!page) return;
      if (page === 'dashboard' || page === 'reports') {
        nav.classList.remove('hidden');
        return;
      }
      if (page === 'scan' || page === 'manual') {
        if (role === 'admin' || role === 'operator') {
          nav.classList.remove('hidden');
        } else {
          nav.classList.add('hidden');
        }
        return;
      }
      if (page === 'students' || page === 'settings') {
        if (role === 'admin') {
          nav.classList.remove('hidden');
        } else {
          nav.classList.add('hidden');
        }
        return;
      }
    });
  }

  function openLogin(pending) {
    pendingPage = pending && pending !== 'dashboard' && pending !== 'reports' ? pending : '';
    if (pending && (pending === 'scan' || pending === 'manual' || pending === 'students' || pending === 'settings')) {
      pendingPage = pending;
    }

    const error = $('loginError');
    if (error) {
      error.textContent = '';
      error.classList.add('hidden');
    }
    const form = $('loginForm');
    if (form) form.reset();

    const dialog = $('loginDialog');
    if (!dialog) return;
    if (!dialog.open) {
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
    if (utils && utils.toast) {
      utils.toast(message, 'error', 'Login gagal');
    }
  }

  function submit(event) {
    event.preventDefault();
    const usernameInput = $('loginUsername');
    const passwordInput = $('loginPassword');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    const userData = USERS[username];
    if (!userData || userData.password !== password) {
      if (passwordInput) passwordInput.value = '';
      showError('Username atau password salah.');
      return;
    }

    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          user: username,
          role: userData.role,
          name: userData.name,
          at: new Date().toISOString()
        })
      );
    } catch (err) {
      console.error('Gagal menyimpan sesi login:', err);
    }

    const target = pendingPage || '';
    pendingPage = '';

    const dialog = $('loginDialog');
    if (dialog && dialog.open) dialog.close();

    refreshAuthUI();
    if (utils && utils.toast) {
      utils.toast(`Selamat datang, ${userData.name}.`, 'success', 'Login berhasil');
    }

    if (target && App.navigate) {
      App.navigate(target);
    } else {
      App.refreshPage ? App.refreshPage() : null;
    }
  }

  function logout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (err) {
      console.error('Gagal menghapus sesi login:', err);
    }
    pendingPage = '';
    refreshAuthUI();
    if (utils && utils.toast) {
      utils.toast('Anda telah keluar.', 'info', 'Keluar');
    }
    if (App.navigate) {
      App.navigate('dashboard');
    }
  }

  function init() {
    const form = $('loginForm');
    if (form) form.addEventListener('submit', submit);

    const logoutBtn = $('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const loginTrigger = $('loginTrigger');
    if (loginTrigger) {
      loginTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        openLogin('');
      });
    }

    refreshAuthUI();
  }

  function requireRole(roles) {
    const role = getRole();
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (allowed.includes(role)) return true;
    openLogin(App && App._lastPage ? App._lastPage : '');
    if (utils && utils.toast) {
      utils.toast('Anda tidak memiliki akses untuk halaman ini.', 'warning', 'Akses dibatasi');
    }
    return false;
  }

  function requireAdmin() {
    return requireRole(['admin']);
  }

  function requireOperatorOrAdmin() {
    return requireRole(['admin', 'operator']);
  }

  App.Auth = {
    init,
    isLoggedIn,
    getRole,
    getUser,
    getDisplayName,
    openLogin,
    logout,
    requireRole,
    requireAdmin,
    requireOperatorOrAdmin,
    refreshAuthUI
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

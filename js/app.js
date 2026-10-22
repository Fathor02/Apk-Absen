/* AbsenSiswa — app shell, routing, navigation */
(function () {
  'use strict';

  const App = window.App;
  const utils = App.utils;
  const DB = App.DB;

  const PAGES = {
    dashboard: { title: 'Dashboard', subtitle: 'Ringkasan absensi hari ini' },
    scan: { title: 'Scan Absensi', subtitle: 'Pindai QR Code / Barcode siswa' },
    manual: { title: 'Absensi Manual', subtitle: 'Catat kehadiran tanpa scan' },
    reports: { title: 'Rekap Bulanan', subtitle: 'Ringkasan dan ekspor laporan absensi' },
    students: { title: 'Data Siswa', subtitle: 'Kelola data dan kartu QR Code siswa' },
    settings: { title: 'Pengaturan', subtitle: 'Konfigurasi sistem absensi' }
  };

  let currentPage = '';

  function $(id) {
    return document.getElementById(id);
  }

  function openSidebar() {
    const sidebar = $('sidebar');
    const overlay = $('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('-translate-x-full');
    if (overlay) overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }

  function closeSidebar() {
    const sidebar = $('sidebar');
    const overlay = $('sidebarOverlay');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  function updateClock() {
    const now = new Date();
    const time = $('headerTime');
    const date = $('headerDate');
    if (time) time.textContent = utils.timeHMS(now);
    if (date) {
      date.textContent = `${utils.DAYS_SHORT[now.getDay()]}, ${now.getDate()} ${utils.MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}`;
    }
  }

  function showPage(id) {
    let pageId = PAGES[id] ? id : 'dashboard';

    if (pageId !== 'dashboard' && App.Auth && !App.Auth.isLoggedIn()) {
      App.Auth.openLogin(pageId);
      pageId = currentPage && currentPage !== pageId ? currentPage : 'dashboard';
      if (window.location.hash !== `#${pageId}`) {
        window.history.replaceState(null, '', `#${pageId}`);
      }
    }

    App._lastPage = pageId;

    const meta = PAGES[pageId];

    if (currentPage && currentPage !== pageId) {
      const leaving = App.pages[currentPage];
      if (leaving && typeof leaving.hide === 'function') {
        try {
          leaving.hide();
        } catch (err) {
          console.error(`Gagal menutup halaman ${currentPage}:`, err);
        }
      }
    }

    document.querySelectorAll('.page').forEach((section) => {
      section.classList.toggle('hidden', section.id !== `page-${pageId}`);
    });

    document.querySelectorAll('[data-nav]').forEach((link) => {
      link.classList.toggle('active', link.dataset.nav === pageId);
    });

    const title = $('pageTitle');
    const subtitle = $('pageSubtitle');
    if (title) title.textContent = meta.title;
    if (subtitle) subtitle.textContent = meta.subtitle;
    document.title = `${meta.title} · AbsenSiswa`;

    currentPage = pageId;
    closeSidebar();

    const cutoff = $('sidebarCutoff');
    if (cutoff) cutoff.textContent = DB.getSettings().lateLimit;

    try {
      if (App.pages[pageId] && typeof App.pages[pageId].show === 'function') {
        App.pages[pageId].show();
      }
    } catch (err) {
      console.error(`Gagal menampilkan halaman ${pageId}:`, err);
      utils.toast('Terjadi kesalahan saat memuat halaman.', 'error');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigate(id) {
    const pageId = PAGES[id] ? id : 'dashboard';
    if (window.location.hash === `#${pageId}`) {
      showPage(pageId);
    } else {
      window.location.hash = pageId;
    }
  }

  function refreshPage() {
    if (!currentPage) return;
    const page = App.pages[currentPage];
    if (page && typeof page.show === 'function') {
      try {
        page.show();
      } catch (err) {
        console.error(`Gagal menyegarkan halaman ${currentPage}:`, err);
      }
    }
  }

  function renderSyncStatus(state) {
    const pill = $('syncStatus');
    if (!pill) return;
    if (!state || !state.enabled) {
      if (state && state.misconfigured) {
        pill.innerHTML = '<span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>Supabase tidak termuat';
        pill.classList.remove('hidden');
        pill.classList.add('flex');
        return;
      }
      pill.classList.add('hidden');
      pill.classList.remove('flex');
      return;
    }
    const pending = state.pending || 0;
    const map = {
      idle: { dot: 'bg-sky-400', text: 'Supabase aktif' },
      syncing: { dot: 'bg-amber-400 animate-pulse', text: 'Sinkronisasi…' },
      synced: { dot: 'bg-emerald-500', text: pending ? `Tersinkron · ${pending} antre` : 'Tersinkron' },
      offline: { dot: 'bg-rose-500', text: pending ? `Offline · ${pending} antre` : 'Offline' }
    };
    const view = map[state.status] || map.idle;
    pill.innerHTML = `<span class="h-1.5 w-1.5 rounded-full ${view.dot}"></span>${view.text}`;
    pill.classList.remove('hidden');
    pill.classList.add('flex');
  }

  function init() {
    if (!App.DB) {
      console.error('Data layer tidak tersedia.');
      return;
    }

    Object.keys(PAGES).forEach((key) => {
      const page = App.pages[key];
      if (page && typeof page.init === 'function') {
        try {
          page.init();
        } catch (err) {
          console.error(`Gagal inisialisasi halaman ${key}:`, err);
        }
      }
    });

    const openBtn = $('openSidebar');
    const closeBtn = $('closeSidebar');
    const overlay = $('sidebarOverlay');
    if (openBtn) openBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    document.addEventListener('click', (event) => {
      const nav = event.target.closest('[data-nav]');
      if (nav) {
        event.preventDefault();
        navigate(nav.dataset.nav);
        return;
      }
      const closer = event.target.closest('[data-close-dialog]');
      if (closer) {
        const dialog = document.getElementById(closer.dataset.closeDialog);
        if (dialog && dialog.open) dialog.close();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSidebar();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) closeSidebar();
    });

    window.addEventListener('hashchange', () => {
      showPage(window.location.hash.replace('#', '') || 'dashboard');
    });

    const year = $('footerYear');
    if (year) year.textContent = new Date().getFullYear();

    updateClock();
    setInterval(updateClock, 1000);

    if (App.DB.onSyncStatus) {
      App.DB.onSyncStatus(renderSyncStatus);
    }

    if (!window.location.hash) {
      window.history.replaceState(null, '', '#dashboard');
    }
    showPage(window.location.hash.replace('#', '') || 'dashboard');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  App.navigate = navigate;
  App.refreshPage = refreshPage;
})();

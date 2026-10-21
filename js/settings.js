/* AbsenSiswa — settings & data management */
(function () {
  'use strict';

  const App = window.App;
  const utils = App.utils;
  const DB = App.DB;
  App.pages = App.pages || {};

  function $(id) {
    return document.getElementById(id);
  }

  function updatePreview() {
    const input = $('settingLateLimit');
    const preview = $('settingPreviewLimit');
    if (input && preview) preview.textContent = input.value || '07:05';
  }

  function renderStats() {
    const container = $('dataStats');
    if (!container) return;
    const stats = DB.getStats();
    const sizeKb = (stats.bytes / 1024).toFixed(1);
    const sync = DB.getSyncState ? DB.getSyncState() : { enabled: false };
    const syncLabel = !sync.enabled
      ? 'Mode lokal'
      : { idle: 'Aktif', syncing: 'Sinkronisasi…', synced: 'Tersinkron', offline: 'Offline' }[sync.status] || sync.status;

    const row = (icon, label, value) => `
      <div class="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-100">
        <div class="flex min-w-0 items-center gap-2 text-slate-500">
          <svg class="h-4 w-4 shrink-0"><use href="#${icon}" /></svg>
          <span class="truncate text-xs font-medium">${label}</span>
        </div>
        <span class="shrink-0 text-xs font-extrabold text-slate-800">${value}</span>
      </div>`;

    container.innerHTML = [
      row('i-users', 'Total siswa', stats.students),
      row('i-grid', 'Kelas', stats.classes),
      row('i-clipboard', 'Catatan absensi', stats.attendance),
      row('i-clock', 'Batas keterlambatan', stats.lateLimit),
      row('i-cloud', 'Supabase', syncLabel),
      row('i-database', 'Ukuran data', `${sizeKb} KB`)
    ].join('');
  }

  function saveSettings(event) {
    event.preventDefault();
    const schoolName = $('settingSchoolName').value.trim();
    const lateLimit = $('settingLateLimit').value;

    if (!schoolName) {
      utils.toast('Nama sekolah wajib diisi.', 'warning', 'Data belum lengkap');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(lateLimit)) {
      utils.toast('Format batas jam tidak valid.', 'warning', 'Data belum lengkap');
      return;
    }

    const settings = DB.saveSettings({ schoolName, lateLimit });
    const sidebar = $('sidebarCutoff');
    if (sidebar) sidebar.textContent = settings.lateLimit;
    updatePreview();
    renderStats();
    utils.toast('Batas keterlambatan dan identitas sekolah telah disimpan.', 'success', 'Pengaturan disimpan');
  }

  function exportBackup() {
    const payload = DB.exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    utils.downloadBlob(blob, `backup_absensiswa_${utils.dateKey()}.json`);
    utils.toast('Cadangan data berhasil diunduh.', 'success', 'Cadangan dibuat');
  }

  function importBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const root = parsed && parsed.data ? parsed.data : parsed;
        if (!root || !Array.isArray(root.students) || !Array.isArray(root.attendance)) {
          throw new Error('File bukan cadangan AbsenSiswa yang valid.');
        }
        const ok = window.confirm(
          `Impor ${root.students.length} siswa dan ${root.attendance.length} catatan absensi?\n\n` +
          'Seluruh data yang ada saat ini akan diganti.'
        );
        if (!ok) return;

        DB.importAll(parsed);
        utils.toast('Data cadangan berhasil dipulihkan. Memuat ulang...', 'success', 'Impor selesai');
        setTimeout(() => window.location.reload(), 900);
      } catch (err) {
        console.error(err);
        utils.toast(err.message || 'File cadangan tidak dapat dibaca.', 'error', 'Impor gagal');
      } finally {
        const input = $('backupImport');
        if (input) input.value = '';
      }
    };
    reader.onerror = () => {
      utils.toast('File gagal dibaca.', 'error', 'Impor gagal');
      const input = $('backupImport');
      if (input) input.value = '';
    };
    reader.readAsText(file);
  }

  function init() {
    const form = $('settingsForm');
    const lateInput = $('settingLateLimit');
    const exportBtn = $('backupExport');
    const importBtn = $('backupImportBtn');
    const importInput = $('backupImport');
    const seedBtn = $('btnSeedDemo');
    const resetBtn = $('btnResetAttendance');
    const clearBtn = $('btnClearAll');
    const syncBtn = $('btnSyncNow');

    if (form) form.addEventListener('submit', saveSettings);
    if (lateInput) lateInput.addEventListener('input', updatePreview);

    if (exportBtn) exportBtn.addEventListener('click', exportBackup);
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', () => importBackup(importInput.files && importInput.files[0]));
    }

    if (seedBtn) {
      seedBtn.addEventListener('click', () => {
        const ok = window.confirm('Ganti seluruh data siswa dan absensi dengan data contoh?');
        if (!ok) return;
        DB.seedDemo();
        utils.toast('Data contoh berhasil dimuat. Memuat ulang...', 'success');
        setTimeout(() => window.location.reload(), 700);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const ok = window.confirm('Hapus semua riwayat absensi? Data siswa tetap tersimpan.');
        if (!ok) return;
        DB.resetAttendance();
        utils.toast('Seluruh riwayat absensi telah dihapus.', 'info', 'Riwayat dihapus');
        setTimeout(() => window.location.reload(), 700);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const ok = window.confirm('Hapus SEMUA data siswa dan absensi? Tindakan ini tidak dapat dibatalkan.');
        if (!ok) return;
        DB.clearAll();
        utils.toast('Semua data telah dihapus.', 'info', 'Data dihapus');
        setTimeout(() => window.location.reload(), 700);
      });
    }

    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        syncBtn.disabled = true;
        Promise.resolve(DB.syncNow())
          .catch(() => {})
          .finally(() => {
            syncBtn.disabled = false;
            renderStats();
            updateSupabaseStatusText();
          });
      });
    }
  }

  function updateSupabaseStatusText() {
    const el = $('supabaseStatusText');
    if (!el) return;
    const sync = DB.getSyncState ? DB.getSyncState() : { enabled: false };
    if (!sync.enabled) {
      el.textContent = sync.misconfigured
        ? 'Gagal memuat konfigurasi. Cek Environment Variables Vercel lalu redeploy.'
        : 'Mode lokal — belum dikonfigurasi.';
      return;
    }
    const last = sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString('id-ID') : 'belum pernah';
    el.textContent = `Terhubung ke ${sync.host} · terakhir sinkron ${last}.`;
  }

  function show() {
    const settings = DB.getSettings();
    if ($('settingSchoolName')) $('settingSchoolName').value = settings.schoolName;
    if ($('settingLateLimit')) $('settingLateLimit').value = settings.lateLimit;
    updatePreview();
    renderStats();
    updateSupabaseStatusText();
  }

  App.pages.settings = { init, show };
})();

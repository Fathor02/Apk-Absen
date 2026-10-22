/* AbsenSiswa — live QR/Barcode scanner */
(function () {
  'use strict';

  const App = window.App;
  const utils = App.utils;
  const DB = App.DB;
  App.pages = App.pages || {};

  let scanner = null;
  let running = false;
  let starting = false;
  let lastCode = '';
  let lastCodeAt = 0;
  let flashTimer = null;
  let lastResult = null;

  function setStatus(mode) {
    const pill = document.getElementById('scanStatus');
    if (!pill) return;
    if (mode === 'active') {
      pill.className = 'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200';
      pill.innerHTML = '<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span> Kamera aktif';
    } else if (mode === 'starting') {
      pill.className = 'inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200';
      pill.innerHTML = '<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500"></span> Menyiapkan...';
    } else {
      pill.className = 'inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500';
      pill.innerHTML = '<span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span> Nonaktif';
    }
  }

  function setButtons(isRunning) {
    const stopBtn = document.getElementById('stopScanBtn');
    const placeholder = document.getElementById('scanPlaceholder');
    if (stopBtn) stopBtn.classList.toggle('hidden', !isRunning);
    if (placeholder) placeholder.classList.toggle('hidden', isRunning || starting);
  }

  function flash(type) {
    const el = document.getElementById('scanFlash');
    if (!el) return;
    el.classList.remove('scan-flash-success', 'scan-flash-error', 'scan-flash-info');
    void el.offsetWidth;
    el.classList.add(`scan-flash-${type}`);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      el.classList.remove('scan-flash-success', 'scan-flash-error', 'scan-flash-info');
    }, 700);
  }

  function updateCutoff() {
    const settings = DB.getSettings();
    const limit = settings.lateLimit || '07:05';
    const cutoff = document.getElementById('scanCutoff');
    const ruleOnTime = document.getElementById('scanRuleOnTime');
    const ruleLate = document.getElementById('scanRuleLate');
    const sidebar = document.getElementById('sidebarCutoff');
    if (cutoff) cutoff.textContent = `Batas masuk ${limit}`;
    if (ruleOnTime) ruleOnTime.textContent = limit;
    if (ruleLate) ruleLate.textContent = limit;
    if (sidebar) sidebar.textContent = limit;
  }

  function resultEmpty() {
    return `
      <div class="flex flex-col items-center justify-center py-10 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
          <svg class="h-8 w-8"><use href="#i-qr" /></svg>
        </div>
        <p class="mt-4 text-sm font-bold text-slate-700">Belum ada scan</p>
        <p class="mt-1 max-w-[220px] text-xs leading-relaxed text-slate-400">Arahkan QR Code atau Barcode siswa ke kamera. Hasil absensi akan muncul di sini.</p>
      </div>`;
  }

  function renderResult(student, record, duplicate) {
    const container = document.getElementById('scanResult');
    if (!container) return;

    const meta = utils.statusMeta(record.status);
    const method = record.method === 'scan' ? 'Scan kamera' : 'Input manual';
    const settings = DB.getSettings();

    let note = '';
    if (duplicate) {
      note = `
        <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-[11px] leading-relaxed text-amber-800">
          <span class="font-bold">Sudah tercatat hari ini.</span> Scan ulang tidak menambah data baru.
        </div>`;
    } else if (record.status === 'telat') {
      note = `
        <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-[11px] leading-relaxed text-amber-800">
          Scan melewati batas masuk pukul <span class="font-bold">${utils.escapeHtml(settings.lateLimit)}</span>.
        </div>`;
    }

    container.innerHTML = `
      <div class="animate-pop text-center">
        <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl text-2xl font-extrabold shadow-sm ${utils.avatarColor(student.name)}">
          ${utils.escapeHtml(utils.initials(student.name))}
        </div>
        <h3 class="mt-4 truncate text-lg font-extrabold tracking-tight text-slate-900">${utils.escapeHtml(student.name)}</h3>
        <p class="mt-0.5 text-xs text-slate-500">${utils.escapeHtml(student.nis)} · ${utils.escapeHtml(student.class)}</p>
        <div class="mt-3 flex justify-center">
          <span class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide ${meta.badge}">
            <span class="h-1.5 w-1.5 rounded-full ${meta.dot}"></span> ${meta.label}
          </span>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-2 text-left">
          <div class="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-100">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jam</p>
            <p class="mt-0.5 font-mono text-base font-extrabold text-slate-900">${utils.escapeHtml(utils.formatTime(record.time))}</p>
          </div>
          <div class="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-100">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal</p>
            <p class="mt-0.5 text-sm font-bold text-slate-900">${utils.escapeHtml(utils.formatDate(record.date))}</p>
          </div>
        </div>

        <div class="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400">
          <svg class="h-3.5 w-3.5"><use href="#${record.method === 'scan' ? 'i-camera' : 'i-clipboard'}" /></svg>
          ${method}
        </div>
        ${note}
      </div>`;

    lastResult = { student, record, duplicate };
  }

  function renderError(code) {
    const container = document.getElementById('scanResult');
    if (!container) return;
    lastResult = null;
    container.innerHTML = `
      <div class="animate-pop py-4 text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-inset ring-rose-100">
          <svg class="h-8 w-8"><use href="#i-alert" /></svg>
        </div>
        <p class="mt-4 text-sm font-bold text-slate-800">QR / Barcode tidak dikenali</p>
        <p class="mt-1 text-xs leading-relaxed text-slate-500">Kode <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">${utils.escapeHtml(String(code).slice(0, 40))}</span> tidak terdaftar.</p>
        <button data-nav="students" class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800">
          <svg class="h-3.5 w-3.5"><use href="#i-users" /></svg> Kelola Data Siswa
        </button>
      </div>`;
  }

  function refreshFeed() {
    const container = document.getElementById('scanFeed');
    if (!container) return;

    const students = DB.getStudents();
    const studentMap = new Map(students.map((student) => [student.id, student]));
    const records = DB.getAttendanceByDate(utils.dateKey())
      .sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')) || String(b.createdAt).localeCompare(String(a.createdAt)));

    const count = document.getElementById('scanTodayCount');
    if (count) count.textContent = `${records.length} siswa`;

    if (!records.length) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 text-center">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg class="h-5 w-5"><use href="#i-clock" /></svg>
          </div>
          <p class="mt-2.5 text-xs font-semibold text-slate-500">Belum ada absensi hari ini</p>
          <p class="mt-1 text-[10px] text-slate-400">Pencatatan akan muncul di sini secara real-time.</p>
        </div>`;
      return;
    }

    container.innerHTML = records.slice(0, 12).map((record) => {
      const student = studentMap.get(record.studentId);
      if (!student) return '';
      const meta = utils.statusMeta(record.status);
      return `
        <div class="flex items-center gap-3 py-2.5">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${utils.avatarColor(student.name)}">${utils.escapeHtml(utils.initials(student.name))}</div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-bold text-slate-800">${utils.escapeHtml(student.name)}</p>
            <p class="truncate text-[10px] text-slate-400">${utils.escapeHtml(student.class)} · ${record.method === 'scan' ? 'Scan' : 'Manual'}</p>
          </div>
          <div class="shrink-0 text-right">
            <span class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badge}">${meta.label}</span>
            <p class="mt-0.5 font-mono text-[10px] text-slate-400">${utils.escapeHtml(utils.formatTime(record.time))}</p>
          </div>
        </div>`;
    }).join('');
  }

  function processCode(rawCode, source = 'scan') {
    if (App.Auth && (App.Auth.requireOperatorOrAdmin ? !App.Auth.requireOperatorOrAdmin() : (App.Auth.requireAdmin ? !App.Auth.requireAdmin() : false))) {
      if (App.Auth.requireOperatorOrAdmin && !App.Auth.requireOperatorOrAdmin()) {
        if (utils && utils.toast) utils.toast('Hanya operator atau admin yang bisa melakukan scan.', 'warning', 'Akses dibatasi');
        return false;
      }
      if (!App.Auth.requireOperatorOrAdmin && App.Auth.requireAdmin && !App.Auth.requireAdmin()) {
        if (utils && utils.toast) utils.toast('Hanya operator atau admin yang bisa melakukan scan.', 'warning', 'Akses dibatasi');
        return false;
      }
    }
    const code = String(rawCode || '').trim();
    if (!code) return false;

    const student = DB.findByNis(code);
    if (!student) {
      utils.playSound('error');
      flash('error');
      utils.toast(`NIS "${code}" tidak ditemukan. Pastikan kartu siswa sudah terdaftar.`, 'error', 'QR tidak dikenali');
      renderError(code);
      return false;
    }

    const today = utils.dateKey();
    const existing = DB.getAttendanceForStudentDate(student.id, today);

    if (existing) {
      utils.playSound('info');
      flash('info');
      renderResult(student, existing, true);
      utils.toast(`${student.name} sudah tercatat ${utils.statusMeta(existing.status).label} pukul ${utils.formatTime(existing.time)}.`, 'info', 'Sudah absen');
      const input = document.getElementById('manualCode');
      if (input) input.value = '';
      refreshFeed();
      return true;
    }

    const now = new Date();
    const settings = DB.getSettings();
    const status = utils.timeToMinutes(utils.timeHM(now)) <= utils.timeToMinutes(settings.lateLimit) ? 'hadir' : 'telat';
    const record = DB.upsertAttendance({
      studentId: student.id,
      date: today,
      time: utils.timeHMS(now),
      status,
      method: source === 'manual' ? 'manual' : 'scan'
    });

    utils.playSound('success');
    flash('success');
    renderResult(student, record, false);

    if (status === 'hadir') {
      utils.toast(`${student.name} tercatat Hadir pukul ${utils.formatTime(record.time)}.`, 'success', 'Absensi berhasil');
    } else {
      utils.toast(`${student.name} tercatat Telat pukul ${utils.formatTime(record.time)}.`, 'warning', 'Melewati batas masuk');
    }

    const input = document.getElementById('manualCode');
    if (input) {
      input.value = '';
      if (source === 'manual') input.focus();
    }
    refreshFeed();
    return true;
  }

  function onDecoded(decodedText) {
    const code = String(decodedText || '').trim();
    if (!code) return;
    const now = Date.now();
    if (code === lastCode && now - lastCodeAt < 2500) return;
    lastCode = code;
    lastCodeAt = now;
    processCode(code, 'scan');
  }

  async function startCamera() {
    if (running || starting) return;
    if (typeof window.Html5Qrcode !== 'function') {
      utils.toast('Library scanner gagal dimuat. Periksa koneksi internet Anda.', 'error', 'Scanner tidak tersedia');
      return;
    }

    starting = true;
    utils.ensureAudio();
    setStatus('starting');
    setButtons(false);

    try {
      if (!scanner) {
        scanner = new window.Html5Qrcode('reader', { verbose: false });
      }
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          aspectRatio: 1.3333333,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.max(160, Math.floor(minEdge * 0.72));
            return { width: size, height: size };
          }
        },
        onDecoded
      );
      running = true;
      starting = false;
      setStatus('active');
      setButtons(true);
      setTimeout(updateCutoff, 50);
      utils.toast('Arahkan QR Code atau Barcode siswa ke kamera.', 'info', 'Kamera aktif');
    } catch (err) {
      console.error('Camera error:', err);
      starting = false;
      running = false;
      try {
        if (scanner) {
          await scanner.clear();
        }
      } catch (clearErr) {
        /* ignore */
      }
      scanner = null;
      setStatus('inactive');
      setButtons(false);

      const name = err && err.name ? err.name : '';
      let message = 'Tidak dapat mengakses kamera. Pastikan perangkat memiliki kamera dan izin diberikan.';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        message = 'Izin kamera ditolak. Izinkan akses kamera pada browser, lalu coba lagi.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        message = 'Kamera tidak ditemukan. Gunakan input NIS manual di bawah.';
      } else if (name === 'NotReadableError') {
        message = 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.';
      }
      utils.toast(message, 'error', 'Kamera gagal diakses');
    }
  }

  async function stopCamera(options = {}) {
    const silent = Boolean(options.silent);
    const active = scanner && (running || starting);
    running = false;
    starting = false;

    if (active) {
      try {
        await scanner.stop();
      } catch (err) {
        /* ignore */
      }
      try {
        await scanner.clear();
      } catch (err) {
        /* ignore */
      }
      scanner = null;
    }

    setStatus('inactive');
    setButtons(false);
    if (!silent && active) {
      utils.toast('Kamera telah dihentikan.', 'info', 'Kamera nonaktif');
    }
  }

  function show() {
    updateCutoff();
    refreshFeed();
    const container = document.getElementById('scanResult');
    if (container) {
      if (lastResult) {
        renderResult(lastResult.student, lastResult.record, lastResult.duplicate);
      } else {
        container.innerHTML = resultEmpty();
      }
    }
    setButtons(running);
    setStatus(running ? 'active' : 'inactive');
    if (!lastResult) {
      const last = DB.getRecent(1);
      if (last.length) {
        const student = DB.getStudentById(last[0].studentId);
        if (student) renderResult(student, last[0], true);
      }
    }
  }

  function init() {
    if (App.Auth && (App.Auth.requireOperatorOrAdmin ? !App.Auth.requireOperatorOrAdmin() : (App.Auth.requireAdmin ? !App.Auth.requireAdmin() : false))) {
      if (App.Auth.requireOperatorOrAdmin && !App.Auth.requireOperatorOrAdmin()) {
        if (utils && utils.toast) utils.toast('Hanya operator atau admin yang bisa mengakses halaman ini.', 'warning', 'Akses dibatasi');
      }
    }
    const startBtn = document.getElementById('startScanBtn');
    const stopBtn = document.getElementById('stopScanBtn');
    const form = document.getElementById('manualScanForm');
    const input = document.getElementById('manualCode');

    if (startBtn) startBtn.addEventListener('click', startCamera);
    if (stopBtn) stopBtn.addEventListener('click', () => stopCamera());

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const code = input ? input.value.trim() : '';
        if (!code) {
          utils.toast('Masukkan NIS siswa terlebih dahulu.', 'warning', 'NIS kosong');
          if (input) input.focus();
          return;
        }
        processCode(code, 'manual');
      });
    }

    setInterval(() => {
      const clock = document.getElementById('scanClock');
      if (clock) clock.textContent = utils.timeHMS(new Date());
    }, 1000);

    const container = document.getElementById('scanResult');
    if (container) container.innerHTML = resultEmpty();
  }

  function hide() {
    if (running || starting) stopCamera({ silent: true });
  }

  App.pages.scan = { init, show, hide };
})();

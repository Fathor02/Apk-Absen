/* AbsenSiswa — manual attendance */
(function () {
  'use strict';

  const App = window.App;
  const utils = App.utils;
  const DB = App.DB;
  App.pages = App.pages || {};

  const ABSENT_OPTIONS = [
    {
      key: 'izin', label: 'Izin',
      active: 'border-sky-500 bg-sky-500 text-white',
      idle: 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700'
    },
    {
      key: 'sakit', label: 'Sakit',
      active: 'border-violet-500 bg-violet-500 text-white',
      idle: 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700'
    },
    {
      key: 'alpa', label: 'Alpa',
      active: 'border-rose-500 bg-rose-500 text-white',
      idle: 'border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700'
    }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function selectedDate() {
    const input = $('manualDate');
    const value = input ? input.value : '';
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : utils.dateKey();
  }

  function filteredStudents() {
    const search = ($('manualSearch') ? $('manualSearch').value : '').trim().toLowerCase();
    const className = $('manualClass') ? $('manualClass').value : '';
    return DB.getStudents()
      .filter((student) => {
        if (className && student.class !== className) return false;
        if (!search) return true;
        return student.name.toLowerCase().includes(search) || String(student.nis).toLowerCase().includes(search);
      })
      .sort((a, b) => a.class.localeCompare(b.class, 'id') || a.name.localeCompare(b.name, 'id'));
  }

  function populateClasses() {
    const select = $('manualClass');
    if (!select) return;
    const current = select.value;
    const classes = DB.getClasses();
    select.innerHTML = '<option value="">Semua Kelas</option>' + classes
      .map((className) => `<option value="${utils.escapeHtml(className)}">${utils.escapeHtml(className)}</option>`)
      .join('');
    if (classes.includes(current)) select.value = current;
  }

  function renderSummary(students, recordMap) {
    const container = $('manualSummary');
    if (!container) return;

    const counts = { hadir: 0, telat: 0, izin: 0, sakit: 0, alpa: 0 };
    let recorded = 0;
    students.forEach((student) => {
      const record = recordMap.get(student.id);
      if (!record) return;
      recorded += 1;
      if (Object.prototype.hasOwnProperty.call(counts, record.status)) counts[record.status] += 1;
    });
    const absent = counts.izin + counts.sakit + counts.alpa;
    const belum = Math.max(0, students.length - recorded);

    const card = (label, value, sub, color) => `
      <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">${label}</p>
        <p class="mt-1 text-2xl font-extrabold tracking-tight ${color}">${value}</p>
        <p class="mt-0.5 text-[10px] text-slate-400">${sub}</p>
      </div>`;

    container.innerHTML = [
      card('Hadir', counts.hadir, 'tepat waktu', 'text-emerald-600'),
      card('Telat', counts.telat, 'melewati batas', 'text-amber-600'),
      card('Izin / Sakit / Alpa', absent, `Izin ${counts.izin} · Sakit ${counts.sakit} · Alpa ${counts.alpa}`, 'text-rose-600'),
      card('Belum Tercatat', belum, `${recorded} dari ${students.length} tercatat`, 'text-slate-700')
    ].join('');
  }

  function renderRows(students, recordMap) {
    const container = $('manualList');
    if (!container) return;

    if (!students.length) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center bg-white py-12 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg class="h-7 w-7"><use href="#i-search" /></svg>
          </div>
          <p class="mt-3 text-sm font-bold text-slate-700">Siswa tidak ditemukan</p>
          <p class="mt-1 max-w-[260px] text-xs text-slate-400">Coba ubah kata kunci pencarian atau filter kelas.</p>
        </div>`;
      return;
    }

    container.innerHTML = students.map((student) => {
      const record = recordMap.get(student.id) || null;
      const meta = utils.statusMeta(record ? record.status : 'none');
      const buttons = ABSENT_OPTIONS.map((option) => {
        const isActive = record && record.status === option.key;
        return `<button type="button" data-action="set" data-status="${option.key}" data-student="${student.id}"
          class="rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${isActive ? option.active : option.idle}"
        >${option.label}</button>`;
      }).join('');

      const subtitle = record
        ? (record.status === 'hadir' || record.status === 'telat'
          ? `${utils.formatTime(record.time)} · ${record.method === 'scan' ? 'Scan' : 'Manual'}`
          : (record.method === 'scan' ? 'Scan' : 'Input manual'))
        : 'Belum dicatat';

      return `
        <div class="flex flex-col gap-3 bg-white px-4 py-3.5 sm:flex-row sm:items-center">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${utils.avatarColor(student.name)}">${utils.escapeHtml(utils.initials(student.name))}</div>
            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-slate-800">${utils.escapeHtml(student.name)}</p>
              <p class="truncate text-[11px] text-slate-400">${utils.escapeHtml(student.nis)} · ${utils.escapeHtml(student.class)}</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 sm:justify-end">
            <div class="min-w-[96px] sm:text-right">
              <span class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badge}">${meta.label}</span>
              <p class="mt-0.5 text-[10px] text-slate-400">${utils.escapeHtml(subtitle)}</p>
            </div>
            <div class="flex items-center gap-1">${buttons}</div>
            ${record ? `<button type="button" data-action="reset" data-student="${student.id}" class="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500" title="Hapus catatan" aria-label="Hapus catatan">
              <svg class="h-4 w-4"><use href="#i-trash" /></svg>
            </button>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  function render() {
    const date = selectedDate();
    const dateInput = $('manualDate');
    if (dateInput && !dateInput.value) dateInput.value = date;

    const allStudents = DB.getStudents();
    const students = filteredStudents();
    const records = DB.getAttendanceByDate(date);
    const recordMap = new Map(records.map((record) => [record.studentId, record]));

    renderSummary(students, recordMap);
    renderRows(students, recordMap);

    const label = $('manualCountLabel');
    if (label) {
      const recorded = students.filter((student) => recordMap.has(student.id)).length;
      label.textContent = `Menampilkan ${students.length} dari ${allStudents.length} siswa · ${recorded} tercatat pada tanggal ini`;
    }
  }

  function markAbsent(studentId, status) {
    if (App.Auth && (App.Auth.requireOperatorOrAdmin ? !App.Auth.requireOperatorOrAdmin() : (App.Auth.requireAdmin ? !App.Auth.requireAdmin() : false))) {
      if (App.Auth.requireOperatorOrAdmin && !App.Auth.requireOperatorOrAdmin()) return;
      if (!App.Auth.requireOperatorOrAdmin && App.Auth.requireAdmin && !App.Auth.requireAdmin()) return;
    }
    const student = DB.getStudentById(studentId);
    if (!student) return;

    const date = selectedDate();
    const existing = DB.getAttendanceForStudentDate(studentId, date);
    const nextMeta = utils.statusMeta(status);

    if (existing && existing.method === 'scan' && (existing.status === 'hadir' || existing.status === 'telat')) {
      const currentMeta = utils.statusMeta(existing.status);
      const ok = window.confirm(
        `${student.name} sudah tercatat ${currentMeta.label} melalui scan pukul ${utils.formatTime(existing.time)}.\n\n` +
        `Ganti status menjadi ${nextMeta.label}? Catatan scan akan diganti.`
      );
      if (!ok) return;
    }

    const today = utils.dateKey();
    const time = date === today ? utils.timeHMS(new Date()) : '';

    DB.upsertAttendance({
      studentId,
      date,
      time,
      status,
      method: 'manual'
    });

    utils.playSound('info');
    utils.toast(
      `${student.name} (${student.class}) ditandai ${nextMeta.label}${date === today ? '' : ` untuk ${utils.formatDate(date)}`}.`,
      status === 'alpa' ? 'warning' : 'info',
      'Status diperbarui'
    );
    render();
  }

  function resetRecord(studentId) {
    if (App.Auth && (App.Auth.requireOperatorOrAdmin ? !App.Auth.requireOperatorOrAdmin() : (App.Auth.requireAdmin ? !App.Auth.requireAdmin() : false))) {
      if (App.Auth.requireOperatorOrAdmin && !App.Auth.requireOperatorOrAdmin()) return;
      if (!App.Auth.requireOperatorOrAdmin && App.Auth.requireAdmin && !App.Auth.requireAdmin()) return;
    }
    const student = DB.getStudentById(studentId);
    if (!student) return;
    const date = selectedDate();
    const existing = DB.getAttendanceForStudentDate(studentId, date);
    if (!existing) return;

    const ok = window.confirm(`Hapus catatan ${utils.statusMeta(existing.status).label} milik ${student.name} pada ${utils.formatDate(date)}?`);
    if (!ok) return;

    DB.deleteAttendanceForStudentDate(studentId, date);
    utils.toast(`Catatan ${student.name} telah dihapus.`, 'info', 'Catatan dihapus');
    render();
  }

  function init() {
    if (App.Auth && (App.Auth.requireOperatorOrAdmin ? !App.Auth.requireOperatorOrAdmin() : (App.Auth.requireAdmin ? !App.Auth.requireAdmin() : false))) {
      if (App.Auth.requireOperatorOrAdmin && !App.Auth.requireOperatorOrAdmin()) {
        if (utils && utils.toast) utils.toast('Hanya operator atau admin yang bisa mengakses halaman ini.', 'warning', 'Akses dibatasi');
      }
    }
    const dateInput = $('manualDate');
    const searchInput = $('manualSearch');
    const classSelect = $('manualClass');
    const refreshBtn = $('manualRefresh');
    const list = $('manualList');

    if (dateInput) {
      dateInput.max = utils.dateKey();
      dateInput.addEventListener('change', () => {
        if (dateInput.value > utils.dateKey()) {
          dateInput.value = utils.dateKey();
          utils.toast('Tanggal tidak boleh melebihi hari ini.', 'warning');
        }
        render();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', utils.debounce(render, 140));
    }
    if (classSelect) {
      classSelect.addEventListener('change', render);
    }
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        populateClasses();
        render();
        utils.toast('Data absensi dimuat ulang.', 'info');
      });
    }

    if (list) {
      list.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const studentId = button.dataset.student;
        if (button.dataset.action === 'set') {
          markAbsent(studentId, button.dataset.status);
        } else if (button.dataset.action === 'reset') {
          resetRecord(studentId);
        }
      });
    }
  }

  function show() {
    const dateInput = $('manualDate');
    if (dateInput) {
      dateInput.max = utils.dateKey();
      if (!dateInput.value || dateInput.value > utils.dateKey()) {
        dateInput.value = utils.dateKey();
      }
    }
    populateClasses();
    render();
  }

  App.pages.manual = { init, show };
})();

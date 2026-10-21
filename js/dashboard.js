/* AbsenSiswa — dashboard page */
(function () {
  'use strict';

  const App = window.App;
  const utils = App.utils;
  const DB = App.DB;
  App.pages = App.pages || {};

  function renderChart(students) {
    const container = document.getElementById('dashChart');
    if (!container) return;

    const totalStudents = students.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const columns = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
      const key = utils.dateKey(day);
      const records = DB.getAttendanceByDate(key);
      const counts = { hadir: 0, telat: 0, izin: 0, sakit: 0, alpa: 0 };
      records.forEach((item) => {
        if (Object.prototype.hasOwnProperty.call(counts, item.status)) counts[item.status] += 1;
      });
      const absent = counts.izin + counts.sakit + counts.alpa;
      const percent = (value) => (totalStudents ? (value / totalStudents) * 100 : 0);
      const tooltip = `${utils.formatDate(key)} — Hadir ${counts.hadir}, Telat ${counts.telat}, Absen ${absent}, Belum ${Math.max(0, totalStudents - records.length)}`;

      columns.push(`
        <div class="flex h-full flex-1 flex-col items-center justify-end gap-2" title="${utils.escapeHtml(tooltip)}">
          <div class="flex w-full max-w-[36px] flex-1 flex-col justify-end overflow-hidden rounded-lg bg-slate-100 ring-1 ring-inset ring-slate-200/60">
            <div style="height:${percent(counts.hadir)}%" class="w-full bg-emerald-500 transition-all duration-500"></div>
            <div style="height:${percent(counts.telat)}%" class="w-full bg-amber-400 transition-all duration-500"></div>
            <div style="height:${percent(absent)}%" class="w-full bg-rose-300 transition-all duration-500"></div>
          </div>
          <div class="text-center leading-tight">
            <p class="text-[10px] font-bold text-slate-500">${utils.DAYS_SHORT[day.getDay()]}</p>
            <p class="text-[9px] text-slate-400">${day.getDate()}</p>
          </div>
        </div>`);
    }

    container.innerHTML = columns.join('');
  }

  function renderRecent() {
    const container = document.getElementById('dashRecent');
    if (!container) return;

    const students = DB.getStudents();
    const studentMap = new Map(students.map((student) => [student.id, student]));
    const records = DB.getRecent(6);

    if (!records.length) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-10 text-center">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg class="h-6 w-6"><use href="#i-clock" /></svg>
          </div>
          <p class="mt-3 text-sm font-semibold text-slate-600">Belum ada absensi hari ini</p>
          <p class="mt-1 max-w-[200px] text-xs text-slate-400">Mulai lakukan scan QR Code untuk mencatat kehadiran.</p>
          <button data-nav="scan" class="mt-3 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100">Mulai Scan</button>
        </div>`;
      return;
    }

    container.innerHTML = records.map((record) => {
      const student = studentMap.get(record.studentId);
      if (!student) return '';
      const meta = utils.statusMeta(record.status);
      return `
        <div class="flex items-center gap-3 py-2.5">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${utils.avatarColor(student.name)}">${utils.escapeHtml(utils.initials(student.name))}</div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-bold text-slate-800">${utils.escapeHtml(student.name)}</p>
            <p class="truncate text-[10px] text-slate-400">${utils.escapeHtml(student.nis)} · ${utils.escapeHtml(student.class)}</p>
          </div>
          <div class="shrink-0 text-right">
            <span class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badge}">${meta.label}</span>
            <p class="mt-0.5 font-mono text-[10px] text-slate-400">${utils.escapeHtml(utils.formatTime(record.time))}</p>
          </div>
        </div>`;
    }).join('');
  }

  function show() {
    const settings = DB.getSettings();
    const students = DB.getStudents();
    const classes = DB.getClasses();
    const summary = DB.getTodaySummary();
    const todayKey = utils.dateKey();

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText('dashGreeting', `${utils.greeting()}, Admin`);
    setText('dashDate', `${utils.formatDate(todayKey, { weekday: true })} · ${settings.schoolName}`);
    setText('dashTotalStudents', summary.totalStudents);
    setText('dashClassCount', `${classes.length} kelas`);
    setText('dashHadir', summary.hadir);
    setText('dashTelat', summary.telat);
    setText('dashBelum', summary.belum);
    setText('dashBelumSub', `dari ${summary.totalStudents} siswa`);
    setText('dashIzin', summary.izin);
    setText('dashSakit', summary.sakit);
    setText('dashAlpa', summary.alpa);

    const progress = summary.totalStudents ? Math.round((summary.recorded / summary.totalStudents) * 100) : 0;
    const bar = document.getElementById('dashProgress');
    if (bar) bar.style.width = `${progress}%`;
    setText('dashProgressText', `${progress}% tercatat`);

    renderChart(students);
    renderRecent();
  }

  App.pages.dashboard = { init() {}, show };
})();

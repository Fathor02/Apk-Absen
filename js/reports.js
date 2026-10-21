/* AbsenSiswa — monthly reports & exports */
(function () {
  'use strict';

  const App = window.App;
  const utils = App.utils;
  const DB = App.DB;
  App.pages = App.pages || {};

  const COUNT_KEYS = ['hadir', 'telat', 'izin', 'sakit', 'alpa'];
  let lastExport = { rows: [], filename: 'Rekap_Absensi' };

  function $(id) {
    return document.getElementById(id);
  }

  function populateMonths() {
    const select = $('reportMonth');
    if (!select || select.options.length) return;
    select.innerHTML = utils.MONTHS
      .map((name, index) => `<option value="${index}">${name}</option>`)
      .join('');
    select.value = String(new Date().getMonth());
  }

  function populateYears() {
    const select = $('reportYear');
    if (!select) return;
    const current = select.value;
    const years = DB.getAttendanceYears();
    const currentYear = String(new Date().getFullYear());
    if (!years.map(String).includes(currentYear)) years.unshift(new Date().getFullYear());
    select.innerHTML = years
      .map((year) => `<option value="${year}">${year}</option>`)
      .join('');
    if (years.map(String).includes(current)) {
      select.value = current;
    } else {
      select.value = currentYear;
    }
  }

  function populateClasses() {
    const select = $('reportClass');
    if (!select) return;
    const current = select.value;
    const classes = DB.getClasses();
    select.innerHTML = '<option value="">Semua Kelas</option>' + classes
      .map((className) => `<option value="${utils.escapeHtml(className)}">${utils.escapeHtml(className)}</option>`)
      .join('');
    if (classes.includes(current)) select.value = current;
  }

  function buildData() {
    const month = Number($('reportMonth').value);
    const year = Number($('reportYear').value);
    const className = $('reportClass').value;

    const students = DB.getStudents()
      .filter((student) => !className || student.class === className)
      .sort((a, b) => a.class.localeCompare(b.class, 'id') || a.name.localeCompare(b.name, 'id'));

    const studentIds = new Set(students.map((student) => student.id));
    const counts = new Map();
    students.forEach((student) => counts.set(student.id, { hadir: 0, telat: 0, izin: 0, sakit: 0, alpa: 0 }));

    const records = DB.getMonthRecords(year, month);
    const days = new Set();
    records.forEach((record) => {
      if (!studentIds.has(record.studentId)) return;
      const bucket = counts.get(record.studentId);
      if (!bucket) return;
      if (Object.prototype.hasOwnProperty.call(bucket, record.status)) {
        bucket[record.status] += 1;
      }
      days.add(record.date);
    });

    const rows = students.map((student, index) => {
      const bucket = counts.get(student.id);
      const total = COUNT_KEYS.reduce((sum, key) => sum + bucket[key], 0);
      const rate = total ? Math.round(((bucket.hadir + bucket.telat) / total) * 100) : 0;
      return {
        No: index + 1,
        NIS: student.nis,
        Nama: student.name,
        Kelas: student.class,
        Hadir: bucket.hadir,
        Telat: bucket.telat,
        Izin: bucket.izin,
        Sakit: bucket.sakit,
        Alpa: bucket.alpa,
        'Kehadiran (%)': rate
      };
    });

    const totals = COUNT_KEYS.reduce((acc, key) => {
      acc[key] = rows.reduce((sum, row) => sum + row[key === 'hadir' ? 'Hadir' : key === 'telat' ? 'Telat' : key === 'izin' ? 'Izin' : key === 'sakit' ? 'Sakit' : 'Alpa'], 0);
      return acc;
    }, {});
    const totalRecords = COUNT_KEYS.reduce((sum, key) => sum + totals[key], 0);

    return {
      month,
      year,
      className,
      students,
      rows,
      totals,
      totalRecords,
      days: days.size,
      rate: totalRecords ? Math.round(((totals.hadir + totals.telat) / totalRecords) * 100) : 0
    };
  }

  function renderSummary(data) {
    const container = $('reportSummary');
    if (!container) return;

    const card = (label, value, sub, icon, iconClass, valueClass) => `
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">${label}</p>
          <span class="flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}"><svg class="h-4 w-4"><use href="#${icon}" /></svg></span>
        </div>
        <p class="mt-2 text-2xl font-extrabold tracking-tight ${valueClass}">${value}</p>
        <p class="mt-0.5 text-[10px] text-slate-400">${sub}</p>
      </div>`;

    container.innerHTML = [
      card('Total Siswa', data.students.length, data.className || 'Semua kelas', 'i-users', 'bg-brand-50 text-brand-600', 'text-slate-900'),
      card('Hadir', data.totals.hadir, 'Tepat waktu', 'i-check', 'bg-emerald-50 text-emerald-600', 'text-emerald-600'),
      card('Telat', data.totals.telat, 'Melewati batas masuk', 'i-clock', 'bg-amber-50 text-amber-600', 'text-amber-600'),
      card('Rata-rata Kehadiran', `${data.rate}%`, 'Hadir + Telat', 'i-chart', 'bg-indigo-50 text-brand-600', 'text-brand-700')
    ].join('');
  }

  function renderTable(data) {
    const body = $('reportBody');
    if (!body) return;

    if (!data.rows.length) {
      body.innerHTML = `
        <tr>
          <td colspan="10" class="px-4 py-14 text-center">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg class="h-7 w-7"><use href="#i-chart" /></svg>
            </div>
            <p class="mt-3 text-sm font-bold text-slate-700">Belum ada data</p>
            <p class="mt-1 text-xs text-slate-400">Tidak ada siswa atau catatan absensi pada filter ini.</p>
          </td>
        </tr>`;
      return;
    }

    const rowsHtml = data.rows.map((row) => {
      const rateClass = row['Kehadiran (%)'] >= 80 ? 'text-emerald-600' : row['Kehadiran (%)'] >= 60 ? 'text-amber-600' : 'text-rose-600';
      const barClass = row['Kehadiran (%)'] >= 80 ? 'bg-emerald-500' : row['Kehadiran (%)'] >= 60 ? 'bg-amber-400' : 'bg-rose-400';
      return `
        <tr class="transition hover:bg-slate-50/70">
          <td class="px-4 py-3 text-xs text-slate-400">${row.No}</td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${utils.avatarColor(row.Nama)}">${utils.escapeHtml(utils.initials(row.Nama))}</div>
              <span class="text-xs font-bold text-slate-800">${utils.escapeHtml(row.Nama)}</span>
            </div>
          </td>
          <td class="px-4 py-3 font-mono text-xs text-slate-500">${utils.escapeHtml(row.NIS)}</td>
          <td class="px-4 py-3"><span class="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">${utils.escapeHtml(row.Kelas)}</span></td>
          <td class="px-3 py-3 text-center text-xs font-bold text-emerald-600">${row.Hadir}</td>
          <td class="px-3 py-3 text-center text-xs font-bold text-amber-600">${row.Telat}</td>
          <td class="px-3 py-3 text-center text-xs font-bold text-sky-600">${row.Izin}</td>
          <td class="px-3 py-3 text-center text-xs font-bold text-violet-600">${row.Sakit}</td>
          <td class="px-3 py-3 text-center text-xs font-bold text-rose-600">${row.Alpa}</td>
          <td class="px-4 py-3">
            <div class="flex items-center justify-center gap-2">
              <div class="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                <div class="h-full rounded-full ${barClass}" style="width:${row['Kehadiran (%)']}%"></div>
              </div>
              <span class="w-9 text-right text-[11px] font-bold ${rateClass}">${row['Kehadiran (%)']}%</span>
            </div>
          </td>
        </tr>`;
    }).join('');

    const totalsRow = `
      <tr class="bg-slate-50 text-xs font-extrabold text-slate-700">
        <td colspan="4" class="px-4 py-3">Total</td>
        <td class="px-3 py-3 text-center text-emerald-600">${data.totals.hadir}</td>
        <td class="px-3 py-3 text-center text-amber-600">${data.totals.telat}</td>
        <td class="px-3 py-3 text-center text-sky-600">${data.totals.izin}</td>
        <td class="px-3 py-3 text-center text-violet-600">${data.totals.sakit}</td>
        <td class="px-3 py-3 text-center text-rose-600">${data.totals.alpa}</td>
        <td class="px-4 py-3 text-center text-brand-700">${data.rate}%</td>
      </tr>`;

    body.innerHTML = rowsHtml + totalsRow;
  }

  function render() {
    const data = buildData();
    renderSummary(data);
    renderTable(data);

    const label = $('reportPeriodLabel');
    if (label) {
      label.textContent = `Rekap ${utils.monthLabel(data.month)} ${data.year} · ${data.className || 'Semua Kelas'} · ${data.days} hari tercatat`;
    }

    const filename = `Rekap_Absensi_${data.year}-${utils.pad(data.month + 1)}_${utils.slugify(data.className || 'Semua_Kelas')}`;
    lastExport = { rows: data.rows, filename };
  }

  function csvCell(value) {
    const text = String(value == null ? '' : value);
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function exportCsv() {
    if (!lastExport.rows.length) {
      utils.toast('Tidak ada data untuk diekspor pada filter ini.', 'warning', 'Ekspor dibatalkan');
      return;
    }
    const headers = Object.keys(lastExport.rows[0]);
    const lines = [
      headers.join(','),
      ...lastExport.rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))
    ];
    const csv = `\uFEFF${lines.join('\r\n')}`;
    utils.downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${lastExport.filename}.csv`);
    utils.toast('Rekapan berhasil diekspor ke CSV.', 'success', 'Ekspor selesai');
  }

  function exportExcel() {
    if (!lastExport.rows.length) {
      utils.toast('Tidak ada data untuk diekspor pada filter ini.', 'warning', 'Ekspor dibatalkan');
      return;
    }
    if (!window.XLSX) {
      utils.toast('Library Excel gagal dimuat. Gunakan ekspor CSV.', 'error', 'Excel tidak tersedia');
      return;
    }
    try {
      const ws = window.XLSX.utils.json_to_sheet(lastExport.rows);
      ws['!cols'] = [
        { wch: 5 }, { wch: 14 }, { wch: 28 }, { wch: 14 },
        { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 13 }
      ];
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi');
      window.XLSX.writeFile(wb, `${lastExport.filename}.xlsx`);
      utils.toast('Rekapan berhasil diekspor ke Excel.', 'success', 'Ekspor selesai');
    } catch (err) {
      console.error(err);
      utils.toast('Gagal membuat file Excel. Coba ekspor CSV.', 'error', 'Ekspor gagal');
    }
  }

  function init() {
    populateMonths();
    populateYears();
    populateClasses();

    ['reportMonth', 'reportYear', 'reportClass'].forEach((id) => {
      const select = $(id);
      if (select) select.addEventListener('change', render);
    });

    const csvBtn = $('exportCsvBtn');
    const excelBtn = $('exportExcelBtn');
    if (csvBtn) csvBtn.addEventListener('click', exportCsv);
    if (excelBtn) excelBtn.addEventListener('click', exportExcel);
  }

  function show() {
    populateMonths();
    populateYears();
    populateClasses();
    render();
  }

  App.pages.reports = { init, show };
})();

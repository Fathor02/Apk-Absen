/* AbsenSiswa — student management + QR/Barcode cards */
(function () {
  'use strict';

  const App = window.App;
  const utils = App.utils;
  const DB = App.DB;
  App.pages = App.pages || {};

  let editingId = '';
  let activeStudent = null;
  const codeImages = { qr: '', barcode: '' };

  function $(id) {
    return document.getElementById(id);
  }

  function populateFilters() {
    const classes = DB.getClasses();

    const filter = $('studentClassFilter');
    if (filter) {
      const current = filter.value;
      filter.innerHTML = '<option value="">Semua Kelas</option>' + classes
        .map((className) => `<option value="${utils.escapeHtml(className)}">${utils.escapeHtml(className)}</option>`)
        .join('');
      if (classes.includes(current)) filter.value = current;
    }

    const datalist = $('classOptions');
    if (datalist) {
      datalist.innerHTML = classes
        .map((className) => `<option value="${utils.escapeHtml(className)}"></option>`)
        .join('');
    }
  }

  function filteredStudents() {
    const search = ($('studentSearch') ? $('studentSearch').value : '').trim().toLowerCase();
    const className = $('studentClassFilter') ? $('studentClassFilter').value : '';
    return DB.getStudents()
      .filter((student) => {
        if (className && student.class !== className) return false;
        if (!search) return true;
        return student.name.toLowerCase().includes(search) || String(student.nis).toLowerCase().includes(search);
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }

  function render() {
    const students = filteredStudents();
    const allStudents = DB.getStudents();
    const body = $('studentTableBody');
    if (!body) return;

    if (!students.length) {
      const empty = allStudents.length
        ? `<p class="mt-3 text-sm font-bold text-slate-700">Siswa tidak ditemukan</p><p class="mt-1 text-xs text-slate-400">Coba ubah kata kunci atau filter kelas.</p>`
        : `<p class="mt-3 text-sm font-bold text-slate-700">Belum ada data siswa</p><p class="mt-1 text-xs text-slate-400">Tambahkan siswa untuk mulai membuat kartu QR Code.</p>`;
      body.innerHTML = `
        <tr>
          <td colspan="4" class="px-4 py-14 text-center">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg class="h-7 w-7"><use href="#i-users" /></svg>
            </div>
            ${empty}
          </td>
        </tr>`;
    } else {
      body.innerHTML = students.map((student) => `
        <tr class="transition hover:bg-slate-50/70">
          <td class="px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${utils.avatarColor(student.name)}">${utils.escapeHtml(utils.initials(student.name))}</div>
              <span class="text-xs font-bold text-slate-800">${utils.escapeHtml(student.name)}</span>
            </div>
          </td>
          <td class="px-4 py-3 font-mono text-xs text-slate-500">${utils.escapeHtml(student.nis)}</td>
          <td class="px-4 py-3"><span class="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">${utils.escapeHtml(student.class)}</span></td>
          <td class="px-4 py-3">
            <div class="flex items-center justify-end gap-1">
              <button type="button" data-action="qr" data-id="${student.id}" title="Kartu QR / Barcode"
                class="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600">
                <svg class="h-4 w-4"><use href="#i-qr" /></svg>
              </button>
              <button type="button" data-action="edit" data-id="${student.id}" title="Edit siswa"
                class="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600">
                <svg class="h-4 w-4"><use href="#i-edit" /></svg>
              </button>
              <button type="button" data-action="delete" data-id="${student.id}" title="Hapus siswa"
                class="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
                <svg class="h-4 w-4"><use href="#i-trash" /></svg>
              </button>
            </div>
          </td>
        </tr>`).join('');
    }

    const label = $('studentCountLabel');
    if (label) {
      label.textContent = `Menampilkan ${students.length} dari ${allStudents.length} siswa · ${DB.getClasses().length} kelas`;
    }
  }

  function openDialog(student) {
    const dialog = $('studentDialog');
    if (!dialog) return;
    editingId = student ? student.id : '';
    const title = $('studentDialogTitle');
    if (title) title.textContent = student ? 'Edit Siswa' : 'Tambah Siswa';

    const form = $('studentForm');
    if (form) form.reset();
    if ($('studentId')) $('studentId').value = student ? student.id : '';
    if ($('studentNis')) $('studentNis').value = student ? student.nis : '';
    if ($('studentName')) $('studentName').value = student ? student.name : '';
    if ($('studentClass')) $('studentClass').value = student ? student.class : '';

    populateFilters();
    if (!dialog.open) dialog.showModal();
    setTimeout(() => {
      const nis = $('studentNis');
      if (nis) nis.focus();
    }, 80);
  }

  function closeDialog() {
    const dialog = $('studentDialog');
    if (dialog && dialog.open) dialog.close();
  }

  function saveStudent(event) {
    event.preventDefault();
    const payload = {
      nis: $('studentNis').value,
      name: $('studentName').value,
      class: $('studentClass').value
    };

    try {
      if (editingId) {
        DB.updateStudent(editingId, payload);
        utils.toast(`Data ${payload.name.trim()} berhasil diperbarui.`, 'success', 'Siswa diperbarui');
      } else {
        DB.addStudent(payload);
        utils.toast(`${payload.name.trim()} berhasil ditambahkan.`, 'success', 'Siswa ditambahkan');
      }
      closeDialog();
      populateFilters();
      render();
    } catch (err) {
      utils.toast(err.message || 'Data siswa gagal disimpan.', 'error', 'Gagal menyimpan');
    }
  }

  function deleteStudent(id) {
    const student = DB.getStudentById(id);
    if (!student) return;
    if (App.Auth && typeof App.Auth.requireAdmin === 'function' && !App.Auth.requireAdmin()) return;
    const ok = window.confirm(`Hapus ${student.name} (${student.class})?\n\nSeluruh riwayat absensi siswa ini juga akan dihapus.`);
    if (!ok) return;

    DB.deleteStudent(id);
    utils.toast(`${student.name} telah dihapus.`, 'info', 'Siswa dihapus');
    populateFilters();
    render();
  }

  function qrDataUrl() {
    if (codeImages.qr) return codeImages.qr;
    const box = $('qrCanvas');
    if (!box) return '';
    const canvas = box.querySelector('canvas');
    if (canvas) return canvas.toDataURL('image/png');
    const image = box.querySelector('img');
    return image && image.src ? image.src : '';
  }

  function renderCodes(student) {
    codeImages.qr = '';
    codeImages.barcode = '';
    const qrBox = $('qrCanvas');
    const barcodeCanvas = $('barcodeCanvas');
    if (!qrBox || !barcodeCanvas) return;

    const barcodeContext = barcodeCanvas.getContext('2d');
    if (barcodeContext) barcodeContext.clearRect(0, 0, barcodeCanvas.width, barcodeCanvas.height);

    if (window.QRCode) {
      try {
        qrBox.innerHTML = '';
        new window.QRCode(qrBox, {
          text: student.nis,
          width: 220,
          height: 220,
          colorDark: '#0f172a',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : 2
        });
        codeImages.qr = qrDataUrl();
      } catch (err) {
        console.error('QR generation error:', err);
        utils.toast('QR Code gagal dibuat.', 'error', 'Generator QR');
      }
    } else {
      utils.toast('Library QR Code gagal dimuat. Periksa koneksi internet.', 'error');
    }

    if (window.JsBarcode) {
      try {
        window.JsBarcode(barcodeCanvas, student.nis, {
          format: 'CODE128',
          width: 2,
          height: 76,
          displayValue: true,
          font: 'Inter',
          fontSize: 15,
          textMargin: 4,
          margin: 8,
          background: '#ffffff',
          lineColor: '#0f172a'
        });
        codeImages.barcode = barcodeCanvas.toDataURL('image/png');
      } catch (err) {
        console.error('Barcode generation error:', err);
        utils.toast('Barcode gagal dibuat.', 'error', 'Generator Barcode');
      }
    } else {
      utils.toast('Library barcode gagal dimuat. Periksa koneksi internet.', 'error');
    }
  }

  function openQrDialog(id) {
    const student = DB.getStudentById(id);
    if (!student) return;
    activeStudent = student;

    const settings = DB.getSettings();
    const name = $('qrStudentName');
    const meta = $('qrStudentMeta');
    const school = $('qrDialogSchool');
    const avatar = $('qrAvatar');
    if (name) name.textContent = student.name;
    if (meta) meta.textContent = `${student.nis} · ${student.class}`;
    if (school) school.textContent = settings.schoolName;
    if (avatar) {
      avatar.textContent = utils.initials(student.name);
      avatar.className = `flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold ${utils.avatarColor(student.name)}`;
    }

    const dialog = $('qrDialog');
    if (dialog && !dialog.open) dialog.showModal();
    renderCodes(student);
  }

  function downloadQr() {
    if (!activeStudent) return;
    const url = qrDataUrl();
    if (!url) {
      utils.toast('QR Code belum siap. Coba lagi sesaat.', 'warning');
      return;
    }
    utils.downloadDataUrl(url, `QR_${utils.slugify(activeStudent.nis)}_${utils.slugify(activeStudent.name)}.png`);
    utils.toast('QR Code berhasil diunduh.', 'success');
  }

  function downloadBarcode() {
    if (!activeStudent) return;
    const url = codeImages.barcode || ($('barcodeCanvas') ? $('barcodeCanvas').toDataURL('image/png') : '');
    if (!url) {
      utils.toast('Barcode belum siap. Coba lagi sesaat.', 'warning');
      return;
    }
    utils.downloadDataUrl(url, `Barcode_${utils.slugify(activeStudent.nis)}_${utils.slugify(activeStudent.name)}.png`);
    utils.toast('Barcode berhasil diunduh.', 'success');
  }

  function printCard() {
    if (!activeStudent) return;
    const settings = DB.getSettings();
    const qrUrl = qrDataUrl();
    const barcodeUrl = codeImages.barcode || ($('barcodeCanvas') ? $('barcodeCanvas').toDataURL('image/png') : '');
    if (!qrUrl && !barcodeUrl) {
      utils.toast('Kartu belum siap. Tunggu QR Code selesai dibuat.', 'warning');
      return;
    }

    const student = activeStudent;
    const win = window.open('', '_blank', 'width=460,height=680');
    if (!win) {
      utils.toast('Popup diblokir browser. Izinkan popup untuk mencetak kartu.', 'error');
      return;
    }

    const safeName = utils.escapeHtml(student.name);
    const safeNis = utils.escapeHtml(student.nis);
    const safeClass = utils.escapeHtml(student.class);
    const safeSchool = utils.escapeHtml(settings.schoolName);

    win.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<title>Kartu ${safeName}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; font-family: Inter, Arial, sans-serif; background: #f1f5f9; color: #0f172a; display: flex; justify-content: center; }
  .card { width: 320px; border-radius: 22px; background: #fff; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 20px 40px -20px rgba(15,23,42,.35); }
  .head { background: linear-gradient(135deg, #0f172a, #312e81); color: #fff; padding: 18px 20px; }
  .school { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #c7d2fe; }
  .brand { margin-top: 4px; font-size: 17px; font-weight: 800; letter-spacing: -.02em; }
  .body { padding: 20px; text-align: center; }
  .qr { width: 190px; height: 190px; margin: 0 auto; display: block; }
  .name { margin: 14px 0 2px; font-size: 17px; font-weight: 800; }
  .meta { font-size: 11px; color: #64748b; }
  .meta b { color: #0f172a; }
  .barcode { margin: 14px auto 0; max-width: 100%; height: auto; }
  .hint { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; font-size: 9px; color: #94a3b8; letter-spacing: .04em; text-transform: uppercase; }
  @media print {
    @page { size: 80mm 120mm; margin: 6mm; }
    body { padding: 0; background: #fff; display: block; }
    .card { width: 100%; border: 0; box-shadow: none; }
  }
</style>
</head>
<body>
  <div class="card">
    <div class="head">
      <div class="school">${safeSchool}</div>
      <div class="brand">AbsenSiswa · Kartu Pelajar</div>
    </div>
    <div class="body">
      ${qrUrl ? `<img class="qr" src="${qrUrl}" alt="QR Code" />` : ''}
      <div class="name">${safeName}</div>
      <div class="meta">NIS <b>${safeNis}</b> · Kelas <b>${safeClass}</b></div>
      ${barcodeUrl ? `<img class="barcode" src="${barcodeUrl}" alt="Barcode" />` : ''}
      <div class="hint">Pindai QR / Barcode ini pada mesin absensi</div>
    </div>
  </div>
  <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 250); });<\/script>
</body>
</html>`);
    win.document.close();
  }

  /* ---------- Import Excel/CSV + template ---------- */
  const TEMPLATE_ROWS = [
    ['NIS', 'Nama', 'Kelas'],
    ['2027001', 'Budi Santoso', 'VII A'],
    ['2027002', 'Siti Aminah', 'VII A'],
    ['2027003', 'Rizky Ramadhan', 'VIII B']
  ];

  function csvCell(value) {
    const text = String(value == null ? '' : value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function downloadTemplate(format) {
    if (format === 'xlsx') {
      if (!window.XLSX) {
        utils.toast('Library Excel gagal dimuat. Gunakan template CSV.', 'error', 'Excel tidak tersedia');
        return;
      }
      try {
        const sheet = window.XLSX.utils.aoa_to_sheet(TEMPLATE_ROWS);
        sheet['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 14 }];
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, sheet, 'Siswa');
        window.XLSX.writeFile(workbook, 'Template_Import_Siswa.xlsx');
      } catch (err) {
        console.error(err);
        utils.toast('Template Excel gagal dibuat.', 'error', 'Ekspor gagal');
        return;
      }
    } else {
      const csv = `\uFEFF${TEMPLATE_ROWS.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
      utils.downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'Template_Import_Siswa.csv');
    }
    utils.toast('Template berhasil diunduh. Isi data sesuai format kolom.', 'success', 'Template siap');
  }

  function parseCsv(text) {
    const clean = String(text || '').replace(/^\uFEFF/, '');
    const firstLine = clean.split(/\r?\n/)[0] || '';
    const counts = [
      { delim: ',', count: (firstLine.match(/,/g) || []).length },
      { delim: ';', count: (firstLine.match(/;/g) || []).length },
      { delim: '\t', count: (firstLine.match(/\t/g) || []).length }
    ].sort((a, b) => b.count - a.count);
    const delim = counts[0].count > 0 ? counts[0].delim : ',';

    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;

    for (let i = 0; i < clean.length; i += 1) {
      const char = clean[i];
      if (quoted) {
        if (char === '"') {
          if (clean[i + 1] === '"') {
            cell += '"';
            i += 1;
          } else {
            quoted = false;
          }
        } else {
          cell += char;
        }
      } else if (char === '"') {
        quoted = true;
      } else if (char === delim) {
        row.push(cell);
        cell = '';
      } else if (char === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else if (char !== '\r') {
        cell += char;
      }
    }
    if (cell !== '' || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows;
  }

  function mapHeader(headerRow) {
    const index = { nis: -1, name: -1, class: -1 };
    (headerRow || []).forEach((cell, i) => {
      const key = String(cell == null ? '' : cell).trim().toLowerCase();
      if (index.nis < 0 && /^(nis|nisn|no\.?\s*siswa|nomor induk siswa)$/.test(key)) index.nis = i;
      if (index.name < 0 && /^(nama|name|nama siswa)$/.test(key)) index.name = i;
      if (index.class < 0 && /^(kelas|class|rombel|rombongan belajar)$/.test(key)) index.class = i;
    });
    return index;
  }

  function cellText(value) {
    if (typeof value === 'number') return String(value);
    return String(value == null ? '' : value).trim();
  }

  function renderImportResult(summary) {
    const box = $('importResult');
    if (!box) return;
    if (!summary) {
      box.classList.add('hidden');
      box.innerHTML = '';
      return;
    }

    const problems = (summary.problems || []).slice(0, 8);
    const rest = (summary.problems || []).length - problems.length;
    box.classList.remove('hidden');
    box.innerHTML = `
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">${summary.added} ditambahkan</span>
        <span class="rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">${summary.skipped} dilewati</span>
        <span class="rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700">${summary.invalid} tidak valid</span>
        <span class="truncate text-[11px] font-semibold text-slate-500">${utils.escapeHtml(summary.fileName || '')}</span>
      </div>
      ${problems.length
        ? `<ul class="mt-2.5 space-y-1 text-[11px] leading-relaxed text-slate-500">${problems
            .map((problem) => `<li>• ${utils.escapeHtml(problem)}</li>`)
            .join('')}</ul>`
        : `<p class="mt-2.5 text-[11px] font-bold text-emerald-600">Semua baris berhasil diproses.</p>`}
      ${rest > 0 ? `<p class="mt-1.5 text-[11px] text-slate-400">…dan ${rest} masalah lainnya.</p>` : ''}`;
  }

  async function readImportRows(file) {
    const name = String(file.name || '').toLowerCase();
    if (/\.csv$/.test(name)) {
      return parseCsv(await file.text());
    }
    if (!window.XLSX) throw new Error('Library Excel gagal dimuat. Gunakan file CSV.');
    const buffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('Sheet tidak ditemukan pada file Excel.');
    return window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  }

  async function importStudents(file) {
    if (!file) return;
    const fileName = String(file.name || 'file');
    const nameBox = $('importFileName');
    if (nameBox) nameBox.textContent = fileName;

    if (file.size > 1024 * 1024) {
      renderImportResult({ added: 0, skipped: 0, invalid: 1, problems: ['Ukuran file melebihi 1 MB.'], fileName });
      utils.toast('Ukuran file terlalu besar (maksimal 1 MB).', 'error', 'Import gagal');
      return;
    }

    let rows;
    try {
      rows = await readImportRows(file);
    } catch (err) {
      renderImportResult({ added: 0, skipped: 0, invalid: 1, problems: [err.message], fileName });
      utils.toast('File tidak dapat dibaca. Pastikan format .xlsx, .xls, atau .csv.', 'error', 'Import gagal');
      return;
    }

    const header = rows[0] || [];
    const index = mapHeader(header);
    if (index.nis < 0 || index.name < 0 || index.class < 0) {
      renderImportResult({
        added: 0,
        skipped: 0,
        invalid: Math.max(0, rows.length - 1),
        problems: ['Baris pertama harus berjudul kolom NIS, Nama, dan Kelas.'],
        fileName
      });
      utils.toast('Format file tidak sesuai. Unduh template terlebih dahulu.', 'error', 'Header tidak ditemukan');
      return;
    }

    const summary = { added: 0, skipped: 0, invalid: 0, problems: [], fileName };
    for (let r = 1; r < rows.length; r += 1) {
      const row = rows[r] || [];
      const isEmpty = row.every((cell) => String(cell == null ? '' : cell).trim() === '');
      if (isEmpty) continue;

      const nis = cellText(row[index.nis]);
      const studentName = cellText(row[index.name]);
      const className = cellText(row[index.class]);

      if (!nis || !studentName || !className) {
        summary.invalid += 1;
        summary.problems.push(`Baris ${r + 1}: NIS, Nama, dan Kelas wajib diisi.`);
        continue;
      }

      try {
        DB.addStudent({ nis, name: studentName, class: className });
        summary.added += 1;
      } catch (err) {
        summary.skipped += 1;
        summary.problems.push(`Baris ${r + 1}: ${err.message || 'gagal disimpan'}`);
      }
    }

    populateFilters();
    render();
    renderImportResult(summary);

    if (summary.added > 0 && !summary.skipped && !summary.invalid) {
      utils.toast(`${summary.added} siswa berhasil ditambahkan.`, 'success', 'Import selesai');
    } else if (summary.added > 0) {
      utils.toast(
        `${summary.added} ditambahkan, ${summary.skipped} dilewati, ${summary.invalid} tidak valid.`,
        'warning',
        'Import selesai sebagian'
      );
    } else {
      utils.toast('Tidak ada siswa yang ditambahkan. Periksa detail pada dialog.', 'warning', 'Import tidak berhasil');
    }
  }

  /* ---------- Bulk download QR/Barcode (ZIP PNG) ---------- */

  function getBulkTargetStudents(source) {
    if (source === 'filtered') {
      return filteredStudents();
    }
    return DB.getStudents().slice().sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }

  function updateBulkDialog() {
    const dialog = $('bulkDownloadDialog');
    if (!dialog) return;
    const source = $('bulkSource') ? $('bulkSource').value : 'all';
    const countEl = $('bulkCount');
    if (countEl) {
      countEl.textContent = String(getBulkTargetStudents(source).length);
    }
  }

  function openBulkDownloadDialog() {
    const dialog = $('bulkDownloadDialog');
    if (!dialog) return;
    updateBulkDialog();
    if ($('bulkProgress')) {
      $('bulkProgress').classList.add('hidden');
      $('bulkProgress').textContent = '';
    }
    const startBtn = $('bulkStartBtn');
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.classList.remove('opacity-60', 'cursor-not-allowed');
    }
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function generateQrPngDataUrl(text, size) {
    const tmp = document.createElement('div');
    tmp.style.position = 'absolute';
    tmp.style.left = '-9999px';
    tmp.style.top = '-9999px';
    document.body.appendChild(tmp);
    return new Promise((resolve, reject) => {
      try {
        if (!window.QRCode) {
          document.body.removeChild(tmp);
          return reject(new Error('QRCode.js tidak tersedia'));
        }
        tmp.innerHTML = '';
        new window.QRCode(tmp, {
          text: String(text || ''),
          width: size || 220,
          height: size || 220,
          colorDark: '#0f172a',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : 2
        });
        setTimeout(() => {
          try {
            const el = tmp.querySelector('canvas') || tmp.querySelector('img');
            if (!el) {
              document.body.removeChild(tmp);
              return reject(new Error('Gagal menghasilkan QR'));
            }
            let dataUrl = '';
            if (el.tagName === 'CANVAS') {
              dataUrl = el.toDataURL('image/png');
            } else {
              const canvas = document.createElement('canvas');
              canvas.width = size || 220;
              canvas.height = size || 220;
              const ctx = canvas.getContext('2d');
              const img = new Image();
              img.onload = () => {
                try {
                  ctx.drawImage(img, 0, 0, size || 220, size || 220);
                  const out = canvas.toDataURL('image/png');
                  document.body.removeChild(tmp);
                  resolve(out);
                } catch (e) {
                  document.body.removeChild(tmp);
                  reject(e);
                }
              };
              img.onerror = () => {
                document.body.removeChild(tmp);
                reject(new Error('Gagal memuat QR'));
              };
              img.src = el.src;
              return;
            }
            document.body.removeChild(tmp);
            resolve(dataUrl);
          } catch (e) {
            document.body.removeChild(tmp);
            reject(e);
          }
        }, 40);
      } catch (e) {
        document.body.removeChild(tmp);
        reject(e);
      }
    });
  }

  function generateBarcodeWithLabelDataUrl(nis, name, kelas) {
    const width = 640;
    const height = 220;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.reject(new Error('Canvas tidak tersedia'));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    return new Promise((resolve, reject) => {
      try {
        if (!window.JsBarcode) return reject(new Error('JsBarcode tidak tersedia'));
        const barCanvas = document.createElement('canvas');
        barCanvas.width = 560;
        barCanvas.height = 120;
        window.JsBarcode(barCanvas, String(nis || ''), {
          format: 'CODE128',
          width: 2,
          height: 76,
          displayValue: false,
          margin: 0,
          background: '#ffffff',
          lineColor: '#0f172a'
        });
        ctx.drawImage(barCanvas, 40, 20, 560, 120);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`NIS : ${nis || '-'}`, width / 2, 150);
        ctx.font = '14px Inter, Arial, sans-serif';
        const nameText = String(name || '-');
        ctx.fillText(`Nama : ${nameText}`, width / 2, 176);
        if (kelas) {
          ctx.font = '12px Inter, Arial, sans-serif';
          ctx.fillText(`Kelas : ${kelas}`, width / 2, 198);
        }
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    });
  }

  async function downloadAllCodes() {
    const dialog = $('bulkDownloadDialog');
    const source = $('bulkSource') ? $('bulkSource').value : 'all';
    const type = $('bulkType') ? $('bulkType').value : 'both';
    const startBtn = $('bulkStartBtn');
    const progress = $('bulkProgress');
    const students = getBulkTargetStudents(source);
    if (!students.length) {
      utils.toast('Tidak ada siswa untuk diunduh.', 'warning', 'Kosong');
      return;
    }
    if (typeof JSZip === 'undefined') {
      utils.toast('Library JSZip gagal dimuat. Periksa koneksi internet.', 'error', 'ZIP tidak tersedia');
      return;
    }
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.classList.add('opacity-60', 'cursor-not-allowed');
    }
    if (progress) {
      progress.classList.remove('hidden');
      progress.textContent = `Sedang membuat... 0/${students.length}`;
    }
    try {
      const zip = new JSZip();
      const qrFolder = zip.folder('QR');
      const barFolder = zip.folder('Barcode');
      for (let i = 0; i < students.length; i += 1) {
        const s = students[i];
        const nisSlug = utils.slugify(s.nis || '');
        const nameSlug = utils.slugify(s.name || '');
        const base = `${nisSlug}_${nameSlug || 'Siswa'}`;
        if (type === 'qr' || type === 'both') {
          try {
            const qrUrl = await generateQrPngDataUrl(s.nis, 256);
            const qrData = qrUrl.split(',')[1];
            if (qrFolder && qrData) qrFolder.file(`QR_${base}.png`, qrData, { base64: true });
          } catch (err) {
            console.error('Gagal generate QR', s.nis, err);
          }
        }
        if (type === 'barcode' || type === 'both') {
          try {
            const barUrl = await generateBarcodeWithLabelDataUrl(s.nis, s.name, s.class);
            const barData = barUrl.split(',')[1];
            if (barFolder && barData) barFolder.file(`Barcode_${base}.png`, barData, { base64: true });
          } catch (err) {
            console.error('Gagal generate Barcode', s.nis, err);
          }
        }
        if (progress) progress.textContent = `Sedang membuat... ${i + 1}/${students.length}`;
        await new Promise((r) => setTimeout(r, 60));
      }
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const blob = await zip.generateAsync({ type: 'blob' });
      if (typeof saveAs === 'function') {
        saveAs(blob, `Barcode-QR-Semua-Siswa_${stamp}.zip`);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Barcode-QR-Semua-Siswa_${stamp}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      utils.toast(`ZIP berhasil diunduh (${students.length} siswa).`, 'success', 'Unduh selesai');
      if (dialog && typeof dialog.close === 'function') dialog.close();
    } catch (err) {
      console.error(err);
      utils.toast('Gagal membuat ZIP. Coba lagi.', 'error', 'Gagal unduh');
    } finally {
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.classList.remove('opacity-60', 'cursor-not-allowed');
      }
      if (progress) {
        progress.classList.add('hidden');
        progress.textContent = '';
      }
    }
  }

  function init() {
    const addBtn = $('addStudentBtn');
    const form = $('studentForm');
    const searchInput = $('studentSearch');
    const classFilter = $('studentClassFilter');
    const table = $('studentTableBody');
    const qrDialog = $('qrDialog');

    if (addBtn) addBtn.addEventListener('click', () => openDialog(null));
    if (form) form.addEventListener('submit', saveStudent);
    if (searchInput) searchInput.addEventListener('input', utils.debounce(render, 130));
    if (classFilter) classFilter.addEventListener('change', render);

    if (table) {
      table.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const id = button.dataset.id;
        if (button.dataset.action === 'qr') openQrDialog(id);
        else if (button.dataset.action === 'edit') openDialog(DB.getStudentById(id));
        else if (button.dataset.action === 'delete') deleteStudent(id);
      });
    }

    const bulkBtn = $('btnBulkDownload');
    const bulkDialog = $('bulkDownloadDialog');
    const bulkSource = $('bulkSource');
    const bulkType = $('bulkType');
    const bulkStart = $('bulkStartBtn');
    if (bulkBtn) bulkBtn.addEventListener('click', openBulkDownloadDialog);
    if (bulkSource) bulkSource.addEventListener('change', updateBulkDialog);
    if (bulkType) bulkType.addEventListener('change', updateBulkDialog);
    if (bulkStart) bulkStart.addEventListener('click', downloadAllCodes);
    if (bulkDialog) {
      bulkDialog.addEventListener('close', () => {
        const startBtn = $('bulkStartBtn');
        const progress = $('bulkProgress');
        if (startBtn) {
          startBtn.disabled = false;
          startBtn.classList.remove('opacity-60', 'cursor-not-allowed');
        }
        if (progress) {
          progress.classList.add('hidden');
          progress.textContent = '';
        }
      });
    }

    const downloadQrBtn = $('downloadQrBtn');
    const downloadBarcodeBtn = $('downloadBarcodeBtn');
    const printBtn = $('printCardBtn');
    if (downloadQrBtn) downloadQrBtn.addEventListener('click', downloadQr);
    if (downloadBarcodeBtn) downloadBarcodeBtn.addEventListener('click', downloadBarcode);
    if (printBtn) printBtn.addEventListener('click', printCard);

    const importBtn = $('importStudentBtn');
    const importDialog = $('importDialog');
    const pickBtn = $('pickImportFileBtn');
    const fileInput = $('studentImportFile');
    const nameBox = $('importFileName');
    const templateXlsxBtn = $('templateXlsxBtn');
    const templateCsvBtn = $('templateCsvBtn');

    if (importBtn && importDialog) {
      importBtn.addEventListener('click', () => {
        renderImportResult(null);
        if (fileInput) fileInput.value = '';
        if (nameBox) nameBox.textContent = 'Belum ada file dipilih';
        if (typeof importDialog.showModal === 'function') importDialog.showModal();
        else importDialog.setAttribute('open', '');
      });
    }
    if (pickBtn && fileInput) pickBtn.addEventListener('click', () => fileInput.click());
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        importStudents(file);
        fileInput.value = '';
      });
    }
    if (templateXlsxBtn) templateXlsxBtn.addEventListener('click', () => downloadTemplate('xlsx'));
    if (templateCsvBtn) templateCsvBtn.addEventListener('click', () => downloadTemplate('csv'));

    if (qrDialog) {
      qrDialog.addEventListener('close', () => {
        activeStudent = null;
        codeImages.qr = '';
        codeImages.barcode = '';
      });
    }
  }

  function show() {
    populateFilters();
    render();
  }

  App.pages.students = { init, show };
})();

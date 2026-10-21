/* AbsenSiswa — localStorage data layer */
(function () {
  'use strict';

  const App = window.App;
  const utils = App.utils;
  const KEY = 'absensi_siswa_v1';
  const VERSION = 1;

  const DEFAULT_SETTINGS = {
    schoolName: 'SMP Muhammadiyah 2 Bangil',
    lateLimit: '07:05'
  };

  const STATUS_KEYS = ['hadir', 'telat', 'izin', 'sakit', 'alpa'];

  const DEMO_STUDENTS = [
    ['2026001', 'Ahmad Fauzan', 'VII A'],
    ['2026002', 'Aisyah Putri', 'VII A'],
    ['2026003', 'Bagas Pratama', 'VII A'],
    ['2026004', 'Citra Kirana', 'VII A'],
    ['2026005', 'Dimas Saputra', 'VII A'],
    ['2026006', 'Elsa Novita', 'VII A'],
    ['2026007', 'Farhan Maulana', 'VII A'],
    ['2026008', 'Gita Lestari', 'VII A'],
    ['2026009', 'Hafiz Ramadhan', 'VII A'],
    ['2026010', 'Intan Permata', 'VII A'],
    ['2026011', 'Joko Susilo', 'VII B'],
    ['2026012', 'Kartika Sari', 'VII B'],
    ['2026013', 'Lukman Hakim', 'VII B'],
    ['2026014', 'Mutiara Ayu', 'VII B'],
    ['2026015', 'Naufal Arif', 'VII B'],
    ['2026016', 'Olivia Rahma', 'VII B'],
    ['2026017', 'Putra Wijaya', 'VII B'],
    ['2026018', 'Qonita Zahra', 'VII B'],
    ['2026019', 'Raka Firmansyah', 'VIII A'],
    ['2026020', 'Salsabila Nuraini', 'VIII A'],
    ['2026021', 'Taufik Hidayat', 'VIII A'],
    ['2026022', 'Ulfa Khairunnisa', 'VIII A'],
    ['2026023', 'Vino Alfarizi', 'VIII A'],
    ['2026024', 'Wulan Sari', 'VIII A']
  ];

  function uid() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (err) {
      /* fall through */
    }
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  const pad = (n) => String(n).padStart(2, '0');

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeNis(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeCode(value) {
    return normalizeNis(value).replace(/^nis[\s:\-]*/i, '').trim();
  }

  function normalizeSettings(input) {
    const settings = Object.assign({}, DEFAULT_SETTINGS, input || {});
    if (!/^\d{2}:\d{2}$/.test(String(settings.lateLimit || ''))) {
      settings.lateLimit = DEFAULT_SETTINGS.lateLimit;
    }
    if (!String(settings.schoolName || '').trim()) {
      settings.schoolName = DEFAULT_SETTINGS.schoolName;
    }
    settings.schoolName = String(settings.schoolName).trim().slice(0, 80);
    return settings;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function random() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomTime(rng, startMinutes, endMinutes) {
    const minutes = startMinutes + Math.floor(rng() * (endMinutes - startMinutes + 1));
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:${pad(Math.floor(rng() * 60))}`;
  }

  function buildDemoAttendance(students) {
    const records = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const month = today.getMonth();
    const rng = mulberry32(year * 1000 + month * 37 + students.length);

    const cursor = new Date(year, month, 1);
    while (cursor < today) {
      const dayOfWeek = cursor.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const date = utils.dateKey(cursor);
        students.forEach((student) => {
          const roll = rng();
          let status;
          let time = '';
          if (roll < 0.8) {
            status = 'hadir';
            time = randomTime(rng, 6 * 60 + 32, 7 * 60 + 5);
          } else if (roll < 0.9) {
            status = 'telat';
            time = randomTime(rng, 7 * 60 + 6, 7 * 60 + 45);
          } else if (roll < 0.94) {
            status = 'izin';
          } else if (roll < 0.97) {
            status = 'sakit';
          } else {
            status = 'alpa';
          }
          const method = status === 'hadir' || status === 'telat' ? 'scan' : 'manual';
          let createdAt = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 7, 0, 0);
          if (time) {
            const [h, m, s] = time.split(':').map(Number);
            createdAt = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), h, m, s);
          }
          records.push({
            id: uid(),
            studentId: student.id,
            date,
            time,
            status,
            method,
            createdAt: createdAt.toISOString()
          });
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return records;
  }

  function createDemoData(settings) {
    const students = DEMO_STUDENTS.map(([nis, name, className]) => ({
      id: uid(),
      nis,
      name,
      class: className,
      createdAt: new Date().toISOString()
    }));
    return {
      version: VERSION,
      students,
      attendance: buildDemoAttendance(students),
      settings: normalizeSettings(settings)
    };
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.students) || !Array.isArray(parsed.attendance)) {
        return null;
      }
      return {
        version: VERSION,
        students: parsed.students,
        attendance: parsed.attendance,
        settings: normalizeSettings(parsed.settings)
      };
    } catch (err) {
      console.error('Gagal membaca data absensi:', err);
      return null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Gagal menyimpan data absensi:', err);
      if (App.utils && App.utils.toast) {
        App.utils.toast('Penyimpanan browser penuh atau diblokir.', 'error', 'Gagal menyimpan');
      }
    }
  }

  let data = loadData();
  if (!data) {
    data = createDemoData();
    persist();
  }

  /* ---------- Supabase sync (offline-first: cache lokal + push background) ---------- */
  const CONFIG = window.APP_CONFIG || {};
  const SUPABASE_URL = String(CONFIG.SUPABASE_URL || '').trim();
  const SUPABASE_ANON_KEY = String(CONFIG.SUPABASE_ANON_KEY || '').trim();
  const client = (
    /^https?:\/\//.test(SUPABASE_URL) &&
    SUPABASE_ANON_KEY.length > 20 &&
    typeof window.supabase !== 'undefined' &&
    typeof window.supabase.createClient === 'function'
  )
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    : null;

  let syncQueue = [];
  let flushing = false;
  let flushTimer = null;
  const syncListeners = [];
  const syncState = {
    enabled: !!client,
    status: client ? 'idle' : 'local',
    pending: 0,
    lastSync: 0,
    host: client ? SUPABASE_URL.replace(/^https?:\/\//, '').split('/')[0] : ''
  };

  function getSyncState() {
    return Object.assign({}, syncState);
  }

  function setSync(patch) {
    Object.assign(syncState, patch || {});
    syncListeners.forEach((cb) => {
      try {
        cb(getSyncState());
      } catch (err) {
        console.error('Listener status sinkron gagal:', err);
      }
    });
  }

  function onSyncStatus(cb) {
    if (typeof cb !== 'function') return;
    syncListeners.push(cb);
    cb(getSyncState());
  }

  function studentRow(student) {
    return { id: student.id, nis: student.nis, name: student.name, class: student.class, created_at: student.createdAt };
  }
  function rowToStudent(row) {
    return { id: row.id, nis: row.nis, name: row.name, class: row.class, createdAt: row.created_at || new Date().toISOString() };
  }
  function attendanceRow(record) {
    return {
      id: record.id,
      student_id: record.studentId,
      date: record.date,
      time: record.time || '',
      status: record.status,
      method: record.method,
      created_at: record.createdAt
    };
  }
  function rowToAttendance(row) {
    return {
      id: row.id,
      studentId: row.student_id,
      date: String(row.date || '').slice(0, 10),
      time: row.time || '',
      status: row.status,
      method: row.method,
      createdAt: row.created_at || new Date().toISOString()
    };
  }
  function settingsRow(settings) {
    return { key: 'app', school_name: settings.schoolName, late_limit: settings.lateLimit, updated_at: new Date().toISOString() };
  }
  function rowToSettings(row) {
    return normalizeSettings({ schoolName: row.school_name, lateLimit: row.late_limit });
  }

  function chunk(list, size) {
    const out = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
  }

  function buildReplacePayload() {
    return {
      students: data.students.map(studentRow),
      attendance: data.attendance.map(attendanceRow),
      settings: settingsRow(data.settings)
    };
  }

  async function runJob(job) {
    let res;
    switch (job.op) {
      case 'upsertStudent':
        res = await client.from('students').upsert(job.payload);
        break;
      case 'deleteStudent':
        res = await client.from('students').delete().eq('id', job.payload);
        break;
      case 'upsertAttendance':
        res = await client.from('attendance').upsert(job.payload);
        break;
      case 'deleteAttendance':
        res = await client.from('attendance').delete().eq('id', job.payload);
        break;
      case 'deleteAttendanceByStudentDate':
        res = await client
          .from('attendance')
          .delete()
          .eq('student_id', job.payload.studentId)
          .eq('date', job.payload.date);
        break;
      case 'upsertSettings':
        res = await client.from('settings').upsert(job.payload);
        break;
      case 'replaceAllData': {
        const delAttendance = await client.from('attendance').delete().not('id', 'is', null);
        if (delAttendance.error) throw delAttendance.error;
        const delStudents = await client.from('students').delete().not('id', 'is', null);
        if (delStudents.error) throw delStudents.error;
        for (const rows of chunk(job.payload.students, 200)) {
          const r = await client.from('students').upsert(rows);
          if (r.error) throw r.error;
        }
        for (const rows of chunk(job.payload.attendance, 200)) {
          const r = await client.from('attendance').upsert(rows);
          if (r.error) throw r.error;
        }
        res = await client.from('settings').upsert(job.payload.settings);
        break;
      }
      case 'clearRemote': {
        const delAttendance = await client.from('attendance').delete().not('id', 'is', null);
        if (delAttendance.error) throw delAttendance.error;
        res = await client.from('students').delete().not('id', 'is', null);
        break;
      }
      case 'resetRemote':
        res = await client.from('attendance').delete().not('id', 'is', null);
        break;
      default:
        return;
    }
    if (res && res.error) throw res.error;
  }

  function enqueueSync(op, payload) {
    if (!client) return;
    syncQueue.push({ op, payload });
    setSync({ pending: syncQueue.length });
    scheduleFlush(800);
  }

  function scheduleFlush(delay) {
    if (!client) return;
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushQueue();
    }, delay);
  }

  async function flushQueue() {
    if (!client || flushing) return;
    flushing = true;
    setSync({ status: 'syncing' });
    try {
      while (syncQueue.length) {
        const job = syncQueue[0];
        await runJob(job);
        syncQueue.shift();
        setSync({ pending: syncQueue.length });
      }
      setSync({ status: 'synced', lastSync: Date.now() });
    } catch (err) {
      console.error('Gagal sinkron ke Supabase:', err);
      setSync({ status: 'offline' });
      scheduleFlush(20000);
    } finally {
      flushing = false;
    }
  }

  async function pullAll() {
    const studentsRes = await client.from('students').select('*');
    if (studentsRes.error) throw studentsRes.error;
    const attendanceRes = await client.from('attendance').select('*');
    if (attendanceRes.error) throw attendanceRes.error;
    const settingsRes = await client.from('settings').select('*').limit(1);
    if (settingsRes.error) throw settingsRes.error;

    const nextStudents = (studentsRes.data || []).map(rowToStudent);
    const nextAttendance = (attendanceRes.data || []).map(rowToAttendance);
    const settingsFromServer = (settingsRes.data || [])[0];

    const remoteEmpty = !nextStudents.length && !nextAttendance.length;
    const localHasData = data.students.length > 0 || data.attendance.length > 0;
    if (remoteEmpty && localHasData) {
      enqueueSync('replaceAllData', buildReplacePayload());
      scheduleFlush(0);
      return;
    }

    data.students = nextStudents;
    data.attendance = nextAttendance;
    if (settingsFromServer) data.settings = rowToSettings(settingsFromServer);
    persist();
  }

  async function syncNow(options) {
    const silent = !!(options && options.silent);
    if (!client) {
      if (!silent) {
        utils.toast('Supabase belum dikonfigurasi. Isi .env lalu jalankan lewat node server.js.', 'warning', 'Belum terhubung');
      }
      return;
    }
    setSync({ status: 'syncing' });
    try {
      await flushQueue();
      await pullAll();
      setSync({ status: 'synced', lastSync: Date.now() });
      if (App.refreshPage) App.refreshPage();
      if (!silent) utils.toast('Data berhasil disinkronkan dengan Supabase.', 'success', 'Sinkronisasi selesai');
    } catch (err) {
      console.error('Sinkronisasi gagal:', err);
      setSync({ status: 'offline' });
      if (!silent) {
        utils.toast('Sinkronisasi gagal. Periksa koneksi internet dan konfigurasi Supabase.', 'error', 'Sinkronisasi gagal');
      }
    }
  }

  if (client) {
    setTimeout(() => {
      syncNow({ silent: true });
    }, 600);
  }

  function findStudentRecord(id) {
    return data.students.find((student) => student.id === id) || null;
  }

  const DB = {
    KEY,
    getSettings() {
      return Object.assign({}, data.settings);
    },
    saveSettings(patch) {
      data.settings = normalizeSettings(Object.assign({}, data.settings, patch || {}));
      persist();
      enqueueSync('upsertSettings', settingsRow(data.settings));
      return Object.assign({}, data.settings);
    },
    getStudents() {
      return clone(data.students);
    },
    getStudentById(id) {
      const student = findStudentRecord(id);
      return student ? Object.assign({}, student) : null;
    },
    findByNis(value) {
      const target = normalizeCode(value).toLowerCase();
      if (!target) return null;
      const student = data.students.find((item) => normalizeNis(item.nis).toLowerCase() === target);
      return student ? Object.assign({}, student) : null;
    },
    getClasses() {
      return Array.from(new Set(data.students.map((student) => student.class))).sort((a, b) => a.localeCompare(b, 'id'));
    },
    addStudent(input) {
      const nis = normalizeNis(input.nis);
      const name = String(input.name || '').trim();
      const className = String(input.class || '').trim();

      if (!nis) throw new Error('NIS wajib diisi.');
      if (nis.length > 24) throw new Error('NIS maksimal 24 karakter.');
      if (!name) throw new Error('Nama siswa wajib diisi.');
      if (!className) throw new Error('Kelas wajib diisi.');
      if (data.students.some((student) => normalizeNis(student.nis).toLowerCase() === nis.toLowerCase())) {
        throw new Error(`NIS "${nis}" sudah digunakan siswa lain.`);
      }

      const student = {
        id: uid(),
        nis,
        name,
        class: className,
        createdAt: new Date().toISOString()
      };
      data.students.push(student);
      persist();
      enqueueSync('upsertStudent', studentRow(student));
      return Object.assign({}, student);
    },
    updateStudent(id, input) {
      const student = findStudentRecord(id);
      if (!student) throw new Error('Data siswa tidak ditemukan.');

      const nis = normalizeNis(input.nis);
      const name = String(input.name || '').trim();
      const className = String(input.class || '').trim();

      if (!nis) throw new Error('NIS wajib diisi.');
      if (!name) throw new Error('Nama siswa wajib diisi.');
      if (!className) throw new Error('Kelas wajib diisi.');
      if (data.students.some((item) => item.id !== id && normalizeNis(item.nis).toLowerCase() === nis.toLowerCase())) {
        throw new Error(`NIS "${nis}" sudah digunakan siswa lain.`);
      }

      student.nis = nis;
      student.name = name;
      student.class = className;
      persist();
      enqueueSync('upsertStudent', studentRow(student));
      return Object.assign({}, student);
    },
    deleteStudent(id) {
      const student = findStudentRecord(id);
      if (!student) return false;
      data.students = data.students.filter((item) => item.id !== id);
      data.attendance = data.attendance.filter((item) => item.studentId !== id);
      persist();
      enqueueSync('deleteStudent', id);
      return true;
    },
    getAttendanceByDate(date) {
      return clone(data.attendance.filter((item) => item.date === date));
    },
    getAttendanceForStudentDate(studentId, date) {
      const record = data.attendance.find((item) => item.studentId === studentId && item.date === date);
      return record ? Object.assign({}, record) : null;
    },
    getRecordById(id) {
      const record = data.attendance.find((item) => item.id === id);
      return record ? Object.assign({}, record) : null;
    },
    upsertAttendance(input) {
      const studentId = String(input.studentId || '');
      const date = String(input.date || '');
      const status = String(input.status || '');
      if (!findStudentRecord(studentId)) throw new Error('Siswa tidak ditemukan.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Tanggal tidak valid.');
      if (!STATUS_KEYS.includes(status)) throw new Error('Status absensi tidak valid.');

      const method = input.method === 'scan' ? 'scan' : 'manual';
      const time = input.time ? String(input.time).slice(0, 8) : '';
      const existing = data.attendance.find((item) => item.studentId === studentId && item.date === date);

      if (existing) {
        existing.time = time;
        existing.status = status;
        existing.method = method;
        existing.createdAt = new Date().toISOString();
        persist();
        enqueueSync('upsertAttendance', attendanceRow(existing));
        return Object.assign({}, existing);
      }

      const record = {
        id: uid(),
        studentId,
        date,
        time,
        status,
        method,
        createdAt: new Date().toISOString()
      };
      data.attendance.push(record);
      persist();
      enqueueSync('upsertAttendance', attendanceRow(record));
      return Object.assign({}, record);
    },
    deleteAttendance(id) {
      const before = data.attendance.length;
      data.attendance = data.attendance.filter((item) => item.id !== id);
      if (data.attendance.length === before) return false;
      persist();
      enqueueSync('deleteAttendance', id);
      return true;
    },
    deleteAttendanceForStudentDate(studentId, date) {
      const before = data.attendance.length;
      data.attendance = data.attendance.filter((item) => !(item.studentId === studentId && item.date === date));
      if (data.attendance.length === before) return false;
      persist();
      enqueueSync('deleteAttendanceByStudentDate', { studentId, date });
      return true;
    },
    getMonthRecords(year, month) {
      const prefix = `${year}-${pad(month + 1)}`;
      return clone(data.attendance.filter((item) => String(item.date).startsWith(prefix)));
    },
    getAttendanceYears() {
      const years = new Set([new Date().getFullYear()]);
      data.attendance.forEach((item) => {
        const year = Number(String(item.date).slice(0, 4));
        if (Number.isFinite(year) && year > 2000) years.add(year);
      });
      return Array.from(years).sort((a, b) => b - a);
    },
    getRecent(limit = 6, date = utils.dateKey()) {
      return clone(
        data.attendance
          .filter((item) => item.date === date)
          .sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')) || String(b.createdAt).localeCompare(String(a.createdAt)))
          .slice(0, limit)
      );
    },
    getTodaySummary(date = utils.dateKey()) {
      const records = data.attendance.filter((item) => item.date === date);
      const summary = {
        totalStudents: data.students.length,
        recorded: records.length,
        hadir: 0,
        telat: 0,
        izin: 0,
        sakit: 0,
        alpa: 0,
        belum: Math.max(0, data.students.length - records.length)
      };
      records.forEach((item) => {
        if (Object.prototype.hasOwnProperty.call(summary, item.status)) {
          summary[item.status] += 1;
        }
      });
      summary.attended = summary.hadir + summary.telat;
      return summary;
    },
    getStats() {
      return {
        students: data.students.length,
        classes: DB.getClasses().length,
        attendance: data.attendance.length,
        schoolName: data.settings.schoolName,
        lateLimit: data.settings.lateLimit,
        bytes: (JSON.stringify(data).length * 2)
      };
    },
    exportAll() {
      return {
        app: 'AbsenSiswa',
        version: VERSION,
        exportedAt: new Date().toISOString(),
        students: clone(data.students),
        attendance: clone(data.attendance),
        settings: Object.assign({}, data.settings)
      };
    },
    importAll(payload) {
      const root = payload && payload.data ? payload.data : payload;
      if (!root || !Array.isArray(root.students) || !Array.isArray(root.attendance)) {
        throw new Error('Format file cadangan tidak valid.');
      }

      const students = [];
      const studentIds = new Set();
      root.students.forEach((item) => {
        if (!item || !item.id || !item.nis || !item.name) return;
        const id = String(item.id);
        if (studentIds.has(id)) return;
        studentIds.add(id);
        students.push({
          id,
          nis: normalizeNis(item.nis).slice(0, 24),
          name: String(item.name).trim().slice(0, 80),
          class: String(item.class || 'Tanpa Kelas').trim().slice(0, 30),
          createdAt: item.createdAt || new Date().toISOString()
        });
      });

      const attendanceMap = new Map();
      root.attendance.forEach((item) => {
        if (!item || !studentIds.has(String(item.studentId))) return;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(item.date))) return;
        if (!STATUS_KEYS.includes(item.status)) return;
        const key = `${item.studentId}|${item.date}`;
        attendanceMap.set(key, {
          id: item.id || uid(),
          studentId: String(item.studentId),
          date: String(item.date),
          time: item.time ? String(item.time).slice(0, 8) : '',
          status: item.status,
          method: item.method === 'scan' ? 'scan' : 'manual',
          createdAt: item.createdAt || new Date().toISOString()
        });
      });

      data = {
        version: VERSION,
        students,
        attendance: Array.from(attendanceMap.values()),
        settings: normalizeSettings(root.settings)
      };
      persist();
      enqueueSync('replaceAllData', buildReplacePayload());
      return DB.getStats();
    },
    resetAttendance() {
      data.attendance = [];
      persist();
      enqueueSync('resetRemote');
    },
    seedDemo() {
      data = createDemoData(data.settings);
      persist();
      enqueueSync('replaceAllData', buildReplacePayload());
    },
    clearAll() {
      data.students = [];
      data.attendance = [];
      persist();
      enqueueSync('clearRemote');
    },
    onSyncStatus,
    getSyncState,
    syncNow
  };

  App.DB = DB;
})();

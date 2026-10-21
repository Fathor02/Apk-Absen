/* AbsenSiswa — shared helpers */
(function () {
  'use strict';

  const App = (window.App = window.App || {});

  const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const pad = (n) => String(n).padStart(2, '0');

  function dateKey(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function parseDateKey(key) {
    const [y, m, d] = String(key).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function timeHM(date = new Date()) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function timeHMS(date = new Date()) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function timeToMinutes(value) {
    const parts = String(value || '').split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }

  function formatDate(key, opts = {}) {
    const d = typeof key === 'string' ? parseDateKey(key) : key;
    const weekday = opts.weekday ? `${DAYS[d.getDay()]}, ` : '';
    return `${weekday}${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatDateShort(key) {
    const d = typeof key === 'string' ? parseDateKey(key) : key;
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  }

  function formatTime(value) {
    if (!value) return '—';
    return String(value).slice(0, 5);
  }

  function monthLabel(monthIndex) {
    return MONTHS[monthIndex] || '';
  }

  function greeting(date = new Date()) {
    const h = date.getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 18) return 'Selamat sore';
    return 'Selamat malam';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function initials(name) {
    return String(name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || '?';
  }

  const AVATAR_COLORS = [
    'bg-indigo-100 text-indigo-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-sky-100 text-sky-700',
    'bg-rose-100 text-rose-700',
    'bg-violet-100 text-violet-700',
    'bg-teal-100 text-teal-700'
  ];

  function avatarColor(name) {
    let hash = 0;
    const text = String(name || '');
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
  }

  const STATUS = {
    hadir: {
      label: 'Hadir', key: 'hadir',
      badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
      dot: 'bg-emerald-500', text: 'text-emerald-600', solid: 'bg-emerald-500',
      icon: 'i-check'
    },
    telat: {
      label: 'Telat', key: 'telat',
      badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
      dot: 'bg-amber-400', text: 'text-amber-600', solid: 'bg-amber-400',
      icon: 'i-clock'
    },
    izin: {
      label: 'Izin', key: 'izin',
      badge: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
      dot: 'bg-sky-500', text: 'text-sky-600', solid: 'bg-sky-500',
      icon: 'i-info'
    },
    sakit: {
      label: 'Sakit', key: 'sakit',
      badge: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
      dot: 'bg-violet-500', text: 'text-violet-600', solid: 'bg-violet-500',
      icon: 'i-alert'
    },
    alpa: {
      label: 'Alpa', key: 'alpa',
      badge: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
      dot: 'bg-rose-500', text: 'text-rose-600', solid: 'bg-rose-500',
      icon: 'i-x'
    }
  };

  function statusMeta(status) {
    return STATUS[status] || {
      label: 'Belum', key: 'none',
      badge: 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200',
      dot: 'bg-slate-300', text: 'text-slate-400', solid: 'bg-slate-300',
      icon: 'i-clock'
    };
  }

  function debounce(fn, wait = 180) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /* ---------- Sound feedback ---------- */
  let audioCtx = null;

  function ensureAudio() {
    try {
      if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    } catch (err) {
      return null;
    }
  }

  function tone(ctx, freq, start, duration, type = 'sine', volume = 0.07) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function playSound(kind = 'success') {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (kind === 'success') {
      tone(ctx, 880, now, 0.1, 'sine', 0.07);
      tone(ctx, 1318.5, now + 0.11, 0.18, 'sine', 0.07);
    } else if (kind === 'error') {
      tone(ctx, 220, now, 0.16, 'sawtooth', 0.05);
      tone(ctx, 155, now + 0.18, 0.24, 'sawtooth', 0.05);
    } else {
      tone(ctx, 740, now, 0.09, 'sine', 0.045);
    }
  }

  /* ---------- Toasts ---------- */
  const TOAST_STYLES = {
    success: { icon: 'i-check', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', defaultTitle: 'Berhasil' },
    error: { icon: 'i-alert', iconBg: 'bg-rose-50', iconText: 'text-rose-600', defaultTitle: 'Gagal' },
    info: { icon: 'i-info', iconBg: 'bg-sky-50', iconText: 'text-sky-600', defaultTitle: 'Informasi' },
    warning: { icon: 'i-alert', iconBg: 'bg-amber-50', iconText: 'text-amber-600', defaultTitle: 'Perhatian' }
  };

  function toast(message, type = 'success', title = '') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const style = TOAST_STYLES[type] || TOAST_STYLES.info;

    while (container.children.length >= 4) {
      container.removeChild(container.firstElementChild);
    }

    const el = document.createElement('div');
    el.className = 'toast-enter pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-900/10';
    el.innerHTML = `
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.iconBg} ${style.iconText}">
        <svg class="h-5 w-5"><use href="#${style.icon}" /></svg>
      </span>
      <div class="min-w-0 flex-1 pt-0.5">
        <p class="truncate text-sm font-bold text-slate-900"></p>
        <p class="mt-0.5 text-xs leading-relaxed text-slate-500"></p>
      </div>
      <button type="button" class="shrink-0 rounded-lg p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500" aria-label="Tutup notifikasi">
        <svg class="h-4 w-4"><use href="#i-x" /></svg>
      </button>`;

    const paragraphs = el.querySelectorAll('p');
    paragraphs[0].textContent = title || style.defaultTitle;
    paragraphs[1].textContent = String(message || '');

    const remove = () => {
      if (!el.isConnected) return;
      el.classList.remove('toast-enter');
      el.classList.add('toast-leave');
      setTimeout(() => el.remove(), 220);
    };

    el.querySelector('button').addEventListener('click', remove);
    container.appendChild(el);
    setTimeout(remove, 4200);
  }

  /* ---------- Downloads ---------- */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function slugify(value) {
    return String(value || '')
      .replace(/[\\/:*?"<>|]+/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 80) || 'file';
  }

  function fmtPercent(value) {
    return `${Math.round(value)}%`;
  }

  App.utils = {
    $: (sel, root = document) => root.querySelector(sel),
    $$: (sel, root = document) => Array.from(root.querySelectorAll(sel)),
    MONTHS,
    MONTHS_SHORT,
    DAYS,
    DAYS_SHORT,
    pad,
    dateKey,
    parseDateKey,
    timeHM,
    timeHMS,
    timeToMinutes,
    formatDate,
    formatDateShort,
    formatTime,
    monthLabel,
    greeting,
    escapeHtml,
    initials,
    avatarColor,
    statusMeta,
    debounce,
    ensureAudio,
    playSound,
    toast,
    downloadBlob,
    downloadDataUrl,
    slugify,
    fmtPercent
  };
})();

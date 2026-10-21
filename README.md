# AbsenSiswa

Aplikasi absensi siswa berbasis web (satu halaman) yang berjalan sepenuhnya di browser tanpa server dan tanpa proses build. Data disimpan lokal di `localStorage`.

## Fitur

- **Dashboard** — ringkasan kehadiran hari ini, grafik 7 hari terakhir, aktivitas terbaru, dan progres kehadiran.
- **Scan QR / Barcode** — kamera langsung (html5-qrcode), input NIS manual sebagai cadangan, deteksi absensi ganda, dan umpan balik suara/animasi.
- **Aturan otomatis** — scan sampai batas jam masuk (default `07:05`) berstatus **Hadir**, setelahnya **Telat**.
- **Input manual** — tandai Izin, Sakit, atau Alpa berdasarkan tanggal dan kelas, termasuk reset/override data hasil scan.
- **Rekap bulanan** — filter bulan, tahun, dan kelas; jumlah per status; persentase kehadiran; ekspor **CSV** dan **Excel (XLSX)**.
- **Data siswa** — tambah, ubah, hapus, pencarian, filter kelas, validasi NIS unik, serta pembuatan **QR Code** dan **Barcode CODE128**.
- **Import massal** — tambah banyak siswa sekaligus dari file **Excel (.xlsx/.xls)** atau **CSV**; **template XLSX & CSV** bisa diunduh langsung dari dialog import; baris pertama adalah judul kolom `NIS`, `Nama`, `Kelas`; baris kosong dilewati dan NIS ganda tidak diduplikasi.
- **Cetak kartu** — kartu siswa berisi QR dan barcode siap cetak.
- **Pengaturan** — nama sekolah, batas jam masuk, backup/restore JSON, muat data demo, reset absensi, dan hapus semua data.
- **Kunci admin** — Dashboard terbuka untuk semua, halaman lain wajib **login admin** lebih dulu (session per-tab, bisa keluar lewat tombol di sidebar).
- **Sinkronisasi Supabase (opsional)** — mode offline-first: bekerja penuh secara lokal, lalu mendorong/menarik data ke/from Supabase di background (lihat bagian [Sinkronisasi Supabase](#sinkronisasi-supabase)).

## Struktur Proyek

```
Aplikasi Absen/
├── index.html              # Kerangka SPA: sidebar, header, 6 halaman, dialog, CDN
├── server.js               # Server statis Node (lokal); menyuntik .env sebagai /api/config.js
├── vercel.json             # Konfigurasi deploy Vercel (function + output statis)
├── api/
│   └── config.js           # Function Vercel (CommonJS); menyuntik process.env sebagai /api/config.js
├── .env                    # Kredensial Supabase (tidak di-commit)
├── .env.example            # Template konfigurasi Supabase (salin menjadi .env)
├── css/
│   └── styles.css          # Animasi, state navigasi, override scanner & toast
├── supabase/
│   └── schema.sql          # Skema + RLS + seed demo untuk SQL Editor Supabase
└── js/
    ├── utils.js            # Helper tanggal/waktu, toast, suara, unduhan, escape HTML
    ├── db.js               # Lapisan data localStorage + antrean sinkron Supabase
    ├── app.js          # Routing hash, drawer mobile, jam header, lifecycle halaman
    ├── dashboard.js    # Statistik, grafik 7 hari, aktivitas terbaru
    ├── scan.js         # Siklus kamera, pemrosesan kode, anti-duplikat, feedback
    ├── manual.js       # Filter tanggal/kelas, aksi status manual, reset
    ├── reports.js      # Rekap bulanan dan ekspor CSV/XLSX
    ├── students.js     # CRUD siswa, QR/barcode, unduh PNG, cetak kartu
    └── settings.js     # Form pengaturan, statistik data, backup/restore/reset
```

## Cara Menjalankan

Kamera browser hanya diizinkan pada `localhost` atau HTTPS, jadi buka aplikasi melalui server lokal—bukan `file://`.

**Cara utama (disarankan, mendukung Supabase):**

```bash
node server.js
```

Lalu buka `http://localhost:8000`. Server ini membaca `.env` dan menyuntikkannya sebagai `/api/config.js` — tidak ada file rahasia yang tertulis ke disk.

> Bisa juga dengan `python -m http.server`, `npx serve`, `php -S`, atau Live Server VS Code, tetapi cara itu **tidak membaca `.env`** sehingga sinkronisasi Supabase aktif hanya melalui `node server.js`.

## Deploy ke Vercel

1. Push repo ke GitHub, lalu import di [vercel.com/new](https://vercel.com/new) (framework preset: **Other**, tanpa build command, output directory: `.`)
2. Di project Vercel: **Settings → Environment Variables** — tambah:

   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co` |
   | `SUPABASE_ANON_KEY` | `eyJhbGciOi...` |

3. **Deployments → Redeploy** (env vars hanya dipakai saat deploy/function berjalan)

Cara kerja di Vercel: `index.html` memuat `/api/config.js`, yaitu serverless function `api/config.js` yang membaca `process.env.SUPABASE_URL` / `SUPABASE_ANON_KEY` lalu menyuntikkannya sebagai `window.APP_CONFIG`. Sama persis dengan `server.js` lokal — `.env` lokal tidak pernah ikut ter-upload.

**Jika `/api/config.js` balas 404 setelah deploy**, berarti Vercel tidak mengenali folder `api/` sebagai functions. Pastikan: **Settings → Build & Development Settings → Framework Preset = Other** (bukan "Other static site" yang menonaktifkan functions), lalu **Redeploy**. Function memakai CommonJS agar terdeteksi tanpa `package.json`.

> Halaman tetap dapat dibuka langsung sebagai file, tetapi fitur kamera akan gagal dan hanya input NIS manual yang tersedia.

## Login Admin

Dashboard dapat dibuka tanpa login, tetapi halaman **Scan, Absensi Manual, Rekap, Data Siswa, dan Pengaturan** dikunci dan akan memunculkan dialog login:

| | |
| --- | --- |
| Username | `admin` |
| Password | `adminabsen` |

- Sesi disimpan di `sessionStorage` (per-tab) — tutup tab akan mengakhiri sesi; refresh tetap login.
- **Keluar dari Admin** ada di sidebar bawah (hanya tampil setelah login).
- Kredensial disimpan di `js/auth.js` sebagai pengunci antarmuka/demo — ini **bukan keamanan sungguhan** karena bisa dilihat di source. Jangan gunakan untuk data sensitif nyata tanpa autentikasi di server.

## Penyimpanan Data

Kunci `localStorage`: `absensi_siswa_v1`

```json
{
  "version": 1,
  "students": [
    {
      "id": "uuid",
      "nis": "2026001",
      "name": "Ahmad Fauzan",
      "class": "VII A",
      "createdAt": "2026-10-19T00:00:00.000Z"
    }
  ],
  "attendance": [
    {
      "id": "uuid",
      "studentId": "uuid",
      "date": "2026-10-19",
      "time": "07:02:15",
      "status": "hadir",
      "method": "scan",
      "createdAt": "2026-10-19T00:02:15.000Z"
    }
  ],
  "settings": {
    "schoolName": "SMP Muhammadiyah 2 Bangil",
    "lateLimit": "07:05"
  }
}
```

- `status`: `hadir` | `telat` | `izin` | `sakit` | `alpa`
- `method`: `scan` | `manual`
- Satu siswa hanya memiliki satu catatan per tanggal; scan/input ulang akan memperbarui catatan tersebut.
- Kode QR/barcode berisi **NIS**. Pemindai juga menerima format `NIS:2026001`.

## Data Demo

Saat pertama dibuka, aplikasi memuat 24 siswa pada kelas `VII A`, `VII B`, dan `VIII A`, beserta riwayat absensi hari kerja bulan sebelumnya. Hari ini sengaja dikosongkan agar fitur scan dapat dicoba. Data demo dapat dimuat ulang dari **Pengaturan → Muat Data Demo**.

## Library (CDN)

| Library | Versi | Kegunaan |
| --- | --- | --- |
| Tailwind CSS (Play CDN) | — | Styling antarmuka |
| html5-qrcode | 2.3.8 | Pemindaian QR/barcode via kamera |
| qrcodejs | 1.0.0 | Pembuatan QR Code siswa |
| JsBarcode | 3.11.6 | Barcode CODE128 |
| SheetJS (xlsx) | 0.18.5 | Ekspor rekap ke Excel |
| Supabase JS | 2.x | Klien REST sinkronisasi (opsional) |
| Google Fonts (Inter) | — | Tipografi |

Tidak ada dependensi npm maupun langkah build.

## Sinkronisasi Supabase

Aplikasi tetap berjalan penuh **tanpa** Supabase (mode lokal). Saat dikonfigurasi, data disinkronkan offline-first: semua baca/tulis lewat cache `localStorage`, perubahan didorong ke server di background, dan server ditarik saat startup / tombol **Sinkronkan Sekarang**.

### 1. Buat proyek & jalankan skema

1. Buat proyek gratis di [supabase.com](https://supabase.com).
2. Buka **SQL Editor → New query**, tempel isi `supabase/schema.sql`, lalu **Run**. Ini membuat tabel `students`, `attendance`, `settings`, kebijakan RLS untuk `anon`, dan data demo (24 siswa + riwayat bulan lalu).

### 2. Isi konfigurasi (.env)

Kredensial disimpan di file **`.env`** yang **tidak di-commit** (ada di `.gitignore`). Tidak ada file config lain — `server.js` membaca `.env` langsung setiap request.

```bash
# 1. salin template (sekali saja)
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux

# 2. edit .env, isi dari Project Settings → API di dashboard Supabase:
#    SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
#    SUPABASE_ANON_KEY=eyJhbGciOi...

# 3. (re)jalankan server
node server.js
```

Cukup edit `.env` lalu restart `node server.js` — tidak perlu generate apa pun. Tanpa `.env` yang terisi, aplikasi tetap berjalan normal dalam mode lokal. Pill status di header menunjukkan koneksi (`Supabase aktif` → `Tersinkron`), dan kartu **Koneksi Supabase** di Pengaturan menyediakan tombol **Sinkronkan Sekarang**.

### Cara kerja

- **Push** — setiap tambah/ubah/hapus (CRUD siswa, scan/manual, impor Excel, backup, reset, data demo) masuk antrean lalu dikirim berurutan ke Supabase; jika gagal (offline), antrean disimpan dan dicoba lagi otomatis.
- **Merge (dua arah)** — saat sinkron, data server dan lokal **digabung, tidak saling menimpa**:
  - Siswa dicocokkan berdasarkan **NIS**; versi server dipakai sebagai master sehingga id server berlaku.
  - Absensi dicocokkan berdasarkan **siswa + tanggal**; absensi dari server menang bila bentrok pada tanggal yang sama, absensi lokal yang belum ada diunggah.
  - Siswa/absensi yang hanya ada di lokal otomatis di-*push* ke server.
- **Reset/Impor/Data Demo** — tindakan eksplisit ini tetap **mengganti seluruh** isi server (bukan merge), sesuai maksud tombolnya.
- Batalkan sinkron: kosongkan nilai di `.env` lalu restart `node server.js` (data lokal utuh).

### Catatan keamanan

- Skema memakai RLS terbuka untuk `anon` (**bisa dibaca/diapus siapa pun yang punya URL+key**). Cocok untuk lab/demo sekolah; untuk produksi sungguhan, tambahkan Supabase Auth dan perketat kebijakan RLS.
- `.env` masuk `.gitignore` — jangan commit ke repo publik. Tidak ada file config lain di disk; nilai dibaca `server.js` dari `.env` saat request.

### Troubleshooting

| Gejala | Penyebab umum |
| --- | --- |
| Pill tidak muncul / "Mode lokal" | Aplikasi dibuka bukan lewat `node server.js`, `.env` kosong, atau CDN `supabase-js` gagal dimuat |
| Pill "Supabase tidak termuat" di production | `/api/config.js` 404 — folder `api/` tak dikenali Vercel; set Framework Preset = Other lalu redeploy |
| `relation "public.students" does not exist` | `supabase/schema.sql` belum dijalankan |
| Status `Offline · N antre` | Tidak ada internet / URL key salah; antrean dikirim ulang otomatis |
| Data server hilang setelah pull | Perangkat lain mendorong `replaceAllData` (impor/seed) — snapshot diganti |

## Catatan

- Tanpa Supabase, semua data bersifat lokal pada browser/perangkat. Gunakan **Backup JSON** secara berkala; data tidak tersinkron antar perangkat. Dengan Supabase terkonfigurasi, data otomatis dibagikan antar perangkat melalui server.
- Menghapus data situs di browser akan menghapus data absensi.
- Izin kamera dapat ditolak pengguna; gunakan kolom NIS manual di halaman Scan.
- Format tanggal internal `YYYY-MM-DD` dan waktu `HH:MM:SS` (24 jam).

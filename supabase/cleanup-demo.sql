-- ============================================================
-- AbsenSiswa — bersihkan sisa DATA CONTOH
--
-- Latar belakang: versi lama aplikasi menyeed 24 siswa contoh
-- (NIS 2026001-2026024, kelas "VII A"/"VII B"/"VIII A") di browser.
-- Saat sinkron, data itu otomatis ter-push ke server, sehingga
-- selalu muncul kembali di semua perangkat.
--
-- Jalankan di: Supabase Dashboard → SQL Editor → New query
-- File ini punya 2 tahap, jalankan berurutan dari atas ke bawah.
-- ============================================================

-- ============================================================
-- TAHAP 1 — soft-delete (WAJIB, aman diulang)
-- ============================================================
-- Baris TIDAK hilang dari tabel, hanya ditandai `deleted_at`.
-- Aplikasi menyembunyikannya (js/db.js → pullAll memfilter deleted_at),
-- jadi data contoh tidak akan muncul lagi di perangkat mana pun.
--
-- Kenapa soft-delete, bukan delete langsung? Salinan lama di browser
-- tidak ikut terhapus, dan sinkron akan mengirimnya kembali sebagai
-- baris baru. Soft-delete membuat client mencatat tombstone sehingga
-- data contoh mustahil hidup kembali.
--
-- Aman dijalankan berkali-kali: hanya baris yang `deleted_at`-nya
-- masih kosong yang terpengaruh.

-- 1a. Tandai absensi siswa contoh sebagai terhapus
update public.attendance a
set deleted_at = now()
where a.deleted_at is null
  and a.student_id in (
    select id from public.students where nis in (
      '2026001', '2026002', '2026003', '2026004', '2026005', '2026006',
      '2026007', '2026008', '2026009', '2026010', '2026011', '2026012',
      '2026013', '2026014', '2026015', '2026016', '2026017', '2026018',
      '2026019', '2026020', '2026021', '2026022', '2026023', '2026024'
    )
  );

-- 1b. Tandai siswa contoh sebagai terhapus
update public.students
set deleted_at = now()
where deleted_at is null
  and nis in (
    '2026001', '2026002', '2026003', '2026004', '2026005', '2026006',
    '2026007', '2026008', '2026009', '2026010', '2026011', '2026012',
    '2026013', '2026014', '2026015', '2026016', '2026017', '2026018',
    '2026019', '2026020', '2026021', '2026022', '2026023', '2026024'
  );

-- ============================================================
-- TAHAP 2 — hapus permanen (OPSIONAL)
-- ============================================================
-- Menghapus baris siswa contoh dari tabel secara fisik. Absensinya
-- ikut terhapus otomatis (FK `attendance.student_id` → `on delete cascade`).
--
-- Jalankan HANYA setelah:
--   1) Tahap 1 di atas selesai di proyek ini, dan
--   2) SETIAP perangkat sudah hard-refresh aplikasi (Ctrl+Shift+R).
--      Versi lama yang masih cached akan membuat data contoh ulang
--      dengan UUID baru (tidak tert-cover tombstone) lalu mengirimnya
--      ke server sebagai baris AKTIF.
--
-- Aman diulang: kalau barisnya sudah hilang, statement ini tidak
-- cocok dengan baris apa pun dan tidak menghasilkan error.

delete from public.students
where nis in (
  '2026001', '2026002', '2026003', '2026004', '2026005', '2026006',
  '2026007', '2026008', '2026009', '2026010', '2026011', '2026012',
  '2026013', '2026014', '2026015', '2026016', '2026017', '2026018',
  '2026019', '2026020', '2026021', '2026022', '2026023', '2026024'
);

-- ============================================================
-- VERIFIKASI
-- ============================================================
-- Setelah Tahap 1 (sebelum Tahap 2): 2 baris — "asli" 67 (deleted_at
-- kosong) dan "contoh" 24 (deleted_at terisi).
-- Setelah Tahap 2: hanya 1 baris — "asli" 67, grup "contoh" hilang.

select
  case when nis like '2026%' then 'contoh' else 'asli' end as jenis,
  count(*) as jumlah,
  count(deleted_at) as terhapus
from public.students
group by 1
order by 1;

-- Sisa baris data contoh (harus 0 setelah Tahap 2):
select count(*) as sisa_siswa_contoh
from public.students
where nis like '2026%';

-- ============================================================
-- AbsenSiswa — bersihkan sisa DATA CONTOH
--
-- Latar belakang: versi lama aplikasi menyeed 24 siswa contoh
-- (NIS 2026001-2026024, kelas "VII A"/"VII B"/"VIII A") di browser.
-- Saat sinkron, data itu otomatis ter-push ke server, sehingga
-- selalu muncul kembali di semua perangkat.
--
-- Jalankan SEKALI di: Supabase Dashboard → SQL Editor → New query
-- ============================================================
--
-- PENTING: pakai SOFT-DELETE (deleted_at), JANGAN DELETE.
-- Hard-delete tidak menghapus salinan lokal di browser, dan salinan
-- itu akan ter-push balik oleh sinkron (js/db.js → pullAll).
-- Soft-delete membuat client mencatat tombstone, sehingga data
-- contoh tidak akan muncul kembali di perangkat mana pun.

-- ---------- 1. Tandai absensi siswa contoh sebagai terhapus ----------

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

-- ---------- 2. Tandai siswa contoh sebagai terhapus ----------

update public.students
set deleted_at = now()
where deleted_at is null
  and nis in (
    '2026001', '2026002', '2026003', '2026004', '2026005', '2026006',
    '2026007', '2026008', '2026009', '2026010', '2026011', '2026012',
    '2026013', '2026014', '2026015', '2026016', '2026017', '2026018',
    '2026019', '2026020', '2026021', '2026022', '2026023', '2026024'
  );

-- ---------- 3. Verifikasi ----------
-- Harus mengembalikan 24 baris dengan deleted_at terisi, dan 67 siswa
-- asli (NIS 2891-3028) dengan deleted_at kosong.

select
  case when nis like '2026%' then 'contoh' else 'asli' end as jenis,
  count(*) as jumlah,
  count(deleted_at) as terhapus
from public.students
group by 1
order by 1;

-- ---------- 4. (Opsional) Hapus permanen, 1-2 minggu kemudian ----------
-- Jalankan HANYA setelah semua perangkat sudah menarik soft-delete di
-- atas (refresh aplikasi di setiap perangkat lebih dulu).
-- Menghapus baris siswa akan ikut menghapus absensinya (on delete cascade).
--
-- delete from public.students
-- where nis in (
--   '2026001', '2026002', '2026003', '2026004', '2026005', '2026006',
--   '2026007', '2026008', '2026009', '2026010', '2026011', '2026012',
--   '2026013', '2026014', '2026015', '2026016', '2026017', '2026018',
--   '2026019', '2026020', '2026021', '2026022', '2026023', '2026024'
-- );

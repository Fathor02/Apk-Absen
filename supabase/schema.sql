-- ============================================================
-- AbsenSiswa — skema Supabase
-- Jalankan sekali di: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tabel ----------

create table if not exists public.students (
  id         uuid primary key default gen_random_uuid(),
  nis        text not null unique check (char_length(nis) between 1 and 24),
  name       text not null,
  class      text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.attendance (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  date       date not null,
  time       text not null default '' check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$' or time = ''),
  status     text not null check (status in ('hadir', 'telat', 'izin', 'sakit', 'alpa')),
  method     text not null default 'scan' check (method in ('scan', 'manual')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (student_id, date)
);

create table if not exists public.settings (
  key         text primary key default 'app',
  school_name text not null default 'SMP Muhammadiyah 2 Bangil',
  late_limit  text not null default '07:05',
  updated_at  timestamptz not null default now()
);

create index if not exists attendance_date_idx    on public.attendance (date);
create index if not exists attendance_student_idx on public.attendance (student_id);

-- ---------- Migrasi (bila tabel sudah ada sebelum soft-delete) ----------
-- Jalankan bila kolom deleted_at belum ada; aman diulang.
alter table public.students   add column if not exists deleted_at timestamptz;
alter table public.attendance add column if not exists deleted_at timestamptz;
create index if not exists students_deleted_idx   on public.students (deleted_at);
create index if not exists attendance_deleted_idx on public.attendance (deleted_at);

-- ---------- RLS (tanpa login: anon boleh baca/tulis) ----------

alter table public.students   enable row level security;
alter table public.attendance enable row level security;
alter table public.settings   enable row level security;

create policy "anon akses students"   on public.students   for all to anon using (true) with check (true);
create policy "anon akses attendance" on public.attendance for all to anon using (true) with check (true);
create policy "anon akses settings"   on public.settings   for all to anon using (true) with check (true);

-- ---------- Seed ----------

insert into public.settings (key) values ('app')
on conflict (key) do nothing;

insert into public.students (nis, name, class) values
  ('2989', 'Ahmad Zamir Fairus K', 'VII'),
('2991', 'Aliffani Febrinka Hasyim', 'VII'),
('2992', 'Amaludin Sopiyanaka', 'VII'),
('2993', 'Anisah Salsabilah', 'VII'),
('2994', 'Aqila Salima Rakhsandrina', 'VII'),
('2997', 'Azwar Ar Raffi Putra', 'VII'),
('2998', 'Dareen Osman', 'VII'),
('3003', 'Khalisa Kamila Rahman', 'VII'),
('3004', 'M. Adlyn Izza Pratama', 'VII'),
('3005', 'M. Yafi Al-Bahy', 'VII'),
('3010', 'Musa Naufal Assyura K', 'VII'),
('3011', 'Mylef Dararingga F. H.', 'VII'),
('3013', 'Najwa Khaylila', 'VII'),
('3015', 'Naura Maryam Y. M.', 'VII'),
('3017', 'Nisrina Qonitatus Sidqiyah', 'VII'),
('3019', 'Rachel Shafana Lahmadi', 'VII'),
('3020', 'Rafi Muyassar Zayyan', 'VII'),
('3022', 'Rivaldo Mahardika Putra P.', 'VII'),
('3026', 'Syakila Putri Azizah', 'VII'),
('3027', 'Yuana Rahmawati', 'VII'),
('3028', 'Zahki Ahmad', 'VII'),
('2928', 'Aisyah Filzah', 'VIII'),
('2937', 'Aprilio Putra Arga Sasmito', 'VIII'),
('2938', 'Aufarellio Junio Ziandika', 'VIII'),
('2939', 'Azizan Daffa Athmar', 'VIII'),
('2942', 'Cindy Ayu Rahmadhani', 'VIII'),
('2944', 'Darya Pradipta', 'VIII'),
('2948', 'Fatimah Bilqis', 'VIII'),
('2949', 'Fidela Aufa Zahra', 'VIII'),
('2950', 'Hasan Mirdad', 'VIII'),
('2951', 'Helmi Cahya Pratama', 'VIII'),
('2953', 'Khoiro Al Adillah', 'VIII'),
('2955', 'M. Alfian Rizqi Khoirullah', 'VIII'),
('2956', 'M. Ferdanish Purnomo P.', 'VIII'),
('2957', 'Milla Hanifah Hamdi', 'VIII'),
('2959', 'Mochammad Revan A. P.', 'VIII'),
('2964', 'Muhammad Hafidh F.', 'VIII'),
('2965', 'Muhammad Irsul Mutaafif', 'VIII'),
('2966', 'Muhammad Ridwan F. J.', 'VIII'),
('2967', 'Muhammad Zainal Arifin', 'VIII'),
('2968', 'Mukhamad Nizam Alhafis', 'VIII'),
('2978', 'Revana Nayla Suwandy', 'VIII'),
('2979', 'Revanno Al Faridzi Azfar', 'VIII'),
('2980', 'Ryuken Sandya Ricel G.', 'VIII'),
('2981', 'Shafa Qonita Aprilia', 'VIII'),
('2982', 'Siti Cahya Sarifah', 'VIII'),
('2984', 'Umar El Banjily', 'VIII'),
('2986', 'Zahira Qotrun Nada', 'VIII'),
('2988', 'Zara Nadia Akhyar', 'VIII'),
('2987', 'Moch Aburizal Hussien', 'VIII'),
('2891', 'Ahmad Nafis', 'IX'),
('2892', 'Aisyah Setiawan', 'IX'),
('2893', 'Alifa Abdillah', 'IX'),
('2894', 'Asyifa Ramadania Falanika', 'IX'),
('2896', 'El Fayyadh Altamis Mumtaz I.R.', 'IX'),
('2899', 'Farezky Muhammad P. H.', 'IX'),
('2900', 'Ghazi Izzul Islam', 'IX'),
('2901', 'Hanif Fawazal Hibban', 'IX'),
('2903', 'Muhammad Arzah Ramadhan', 'IX'),
('2906', 'M Fikri Bahrul Ulum', 'IX'),
('2908', 'Muhammad Ishaq BSA', 'IX'),
('2909', 'Muhammad Rafii Aminullah', 'IX'),
('2913', 'M Sulthon Yazid Mukarrom', 'IX'),
('2915', 'Putri Qonita Sidik Salsabila', 'IX'),
('2919', 'Reina Aziziyah Mecca', 'IX'),
('2920', 'Zahria Hawa', 'IX'),
('2922', 'M Alfahreza Putra Megantara', 'IX')
on conflict (nis) do nothing;

-- Riwayat absensi bulan lalu (hari kerja), deterministik
select setseed(0.42);

with days as (
  select d::date as day
  from generate_series(
    (date_trunc('month', current_date - interval '1 month'))::date,
    (date_trunc('month', current_date) - interval '1 day')::date,
    interval '1 day'
  ) d
  where extract(dow from d::date) between 1 and 5
),
combo as (
  select st.id as student_id, days.day, random() as r_status, random() as r_time
  from public.students st
  cross join days
),
classified as (
  select
    student_id,
    day,
    case
      when r_status < 0.80 then 'hadir'
      when r_status < 0.90 then 'telat'
      when r_status < 0.93 then 'izin'
      when r_status < 0.96 then 'sakit'
      else 'alpa'
    end as status,
    r_time
  from combo
)
insert into public.attendance (student_id, date, time, status, method, created_at)
select
  student_id,
  day,
  case
    when status = 'hadir' then
      to_char(make_time(6, 40 + floor(r_time * 20)::int, floor(r_time * 59)::int), 'HH24:MI:SS')
    when status = 'telat' then
      to_char(make_time(7, 6 + floor(r_time * 20)::int, floor(r_time * 59)::int), 'HH24:MI:SS')
    else ''
  end,
  status,
  case when status in ('hadir', 'telat') then 'scan' else 'manual' end,
  now() + (interval '1 hour' * (r_time * 12)) - interval '20 days'
from classified
on conflict (student_id, date) do nothing;

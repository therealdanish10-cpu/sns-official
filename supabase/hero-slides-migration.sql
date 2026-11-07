-- ============================================================================
-- SNS Official — Stitch n Style
-- Hero Banner Carousel Migration (/supabase/hero-slides-migration.sql)
--
-- Instructions:
-- 1. Open your Supabase Dashboard -> SQL Editor -> New Query.
-- 2. Paste this entire file and click "Run".
-- Safe to re-run multiple times (idempotent).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. CREATE HERO_SLIDES TABLE
-- ============================================================================

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  mobile_image_url text,
  link_url text,
  alt_text text not null default '',
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_hero_slides_visible_sort
  on public.hero_slides (is_visible, sort_order asc, created_at asc);

-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS) FOR HERO_SLIDES
-- ============================================================================

alter table public.hero_slides enable row level security;

drop policy if exists "Public can view visible hero slides" on public.hero_slides;
create policy "Public can view visible hero slides"
  on public.hero_slides
  for select
  to anon
  using (is_visible = true);

drop policy if exists "Admin can view all hero slides" on public.hero_slides;
create policy "Admin can view all hero slides"
  on public.hero_slides
  for select
  to authenticated
  using (true);

drop policy if exists "Admin can insert hero slides" on public.hero_slides;
create policy "Admin can insert hero slides"
  on public.hero_slides
  for insert
  to authenticated
  with check (true);

drop policy if exists "Admin can update hero slides" on public.hero_slides;
create policy "Admin can update hero slides"
  on public.hero_slides
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admin can delete hero slides" on public.hero_slides;
create policy "Admin can delete hero slides"
  on public.hero_slides
  for delete
  to authenticated
  using (true);

-- ============================================================================
-- 3. STORAGE BUCKET & STORAGE RLS POLICIES (hero-images)
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hero-images',
  'hero-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read access for hero images" on storage.objects;
create policy "Public read access for hero images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'hero-images');

drop policy if exists "Admin can upload hero images" on storage.objects;
create policy "Admin can upload hero images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'hero-images');

drop policy if exists "Admin can update hero images" on storage.objects;
create policy "Admin can update hero images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'hero-images')
  with check (bucket_id = 'hero-images');

drop policy if exists "Admin can delete hero images" on storage.objects;
create policy "Admin can delete hero images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'hero-images');

notify pgrst, 'reload schema';

-- ============================================================================
-- SNS Official — Stitch n Style
-- Supabase Database Schema, RLS Policies, Storage Buckets & Seed Data
--
-- Instructions:
-- 1. Open your Supabase Dashboard -> SQL Editor -> New Query.
-- 2. Paste this entire file and click "Run".
-- 3. Go to Authentication -> Users -> "Add user" -> "Create new user"
--    and enter your admin email & password (check "Auto Confirm User").
-- ============================================================================

-- Enable UUID generation extension if not already enabled
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- Products table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price integer not null check (price >= 0),
  category text not null,
  images text[] not null default '{}',
  sizes text[] not null default '{}',
  badge text,
  in_stock boolean not null default true,
  created_at timestamptz not null default now()
);

-- Reviews table
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  text text not null,
  photo_url text,
  product_name text,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);

-- Helpful indexes for storefront queries
create index if not exists idx_products_created_at on public.products (created_at desc);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_reviews_status_created_at on public.reviews (status, created_at desc);

-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS) — TABLES
-- ============================================================================

alter table public.products enable row level security;
alter table public.reviews enable row level security;

-- ---- PRODUCTS POLICIES ----
drop policy if exists "Public can view products" on public.products;
create policy "Public can view products"
  on public.products
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin can insert products" on public.products;
create policy "Admin can insert products"
  on public.products
  for insert
  to authenticated
  with check (true);

drop policy if exists "Admin can update products" on public.products;
create policy "Admin can update products"
  on public.products
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admin can delete products" on public.products;
create policy "Admin can delete products"
  on public.products
  for delete
  to authenticated
  using (true);

-- ---- REVIEWS POLICIES ----
drop policy if exists "Public can view approved reviews" on public.reviews;
create policy "Public can view approved reviews"
  on public.reviews
  for select
  to anon
  using (status = 'approved');

drop policy if exists "Admin can view all reviews" on public.reviews;
create policy "Admin can view all reviews"
  on public.reviews
  for select
  to authenticated
  using (true);

drop policy if exists "Anyone can submit pending reviews" on public.reviews;
create policy "Anyone can submit pending reviews"
  on public.reviews
  for insert
  to anon
  with check (status = 'pending');

drop policy if exists "Admin can insert reviews" on public.reviews;
create policy "Admin can insert reviews"
  on public.reviews
  for insert
  to authenticated
  with check (true);

drop policy if exists "Admin can update reviews" on public.reviews;
create policy "Admin can update reviews"
  on public.reviews
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admin can delete reviews" on public.reviews;
create policy "Admin can delete reviews"
  on public.reviews
  for delete
  to authenticated
  using (true);

-- ============================================================================
-- 3. STORAGE BUCKETS & STORAGE RLS POLICIES
-- ============================================================================

-- Create product-images bucket (public read, 10 MB limit, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Create review-photos bucket (public read, 3 MB limit, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos',
  'review-photos',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can read files in both public buckets
drop policy if exists "Public read access for product and review images" on storage.objects;
create policy "Public read access for product and review images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id in ('product-images', 'review-photos'));

-- Anyone (customers & admin) can upload images to review-photos
drop policy if exists "Anyone can upload review photos" on storage.objects;
create policy "Anyone can upload review photos"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp', 'gif'))
  );

-- Only authenticated admin can upload to product-images
drop policy if exists "Admin can upload product images" on storage.objects;
create policy "Admin can upload product images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-images');

-- Only authenticated admin can update files in product-images and review-photos
drop policy if exists "Admin can update storage images" on storage.objects;
create policy "Admin can update storage images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id in ('product-images', 'review-photos'))
  with check (bucket_id in ('product-images', 'review-photos'));

-- Only authenticated admin can delete files in product-images and review-photos
drop policy if exists "Admin can delete storage images" on storage.objects;
create policy "Admin can delete storage images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id in ('product-images', 'review-photos'));

-- ============================================================================
-- 4. SEED DATA — 12 Placeholder Products (idempotent via fixed UUIDs)
-- ============================================================================

insert into public.products (id, name, price, category, images, sizes, badge, in_stock, created_at)
values
  -- SAREE (no sizes)
  (
    '00000000-0000-4000-8000-000000000001',
    'Zari Tissue Organza Saree',
    18500,
    'Saree',
    '{}',
    '{}',
    'Sale',
    true,
    '2026-09-15T10:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'Midnight Velvet Royal Saree',
    24500,
    'Saree',
    '{}',
    '{}',
    'New',
    true,
    '2026-10-02T10:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'Kundan Banarasi Silk Saree',
    19800,
    'Saree',
    '{}',
    '{}',
    null,
    false,
    '2026-08-20T10:00:00Z'
  ),

  -- DUPATTA (no sizes)
  (
    '00000000-0000-4000-8000-000000000004',
    'Marori Embroidered Organza Dupatta',
    7500,
    'Dupatta',
    '{}',
    '{}',
    'New',
    true,
    '2026-10-05T10:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    'Mirror-Work Chiffon Dupatta',
    6200,
    'Dupatta',
    '{}',
    '{}',
    'Sale',
    true,
    '2026-09-10T10:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    'Net Cutwork Zari Dupatta',
    8900,
    'Dupatta',
    '{}',
    '{}',
    null,
    true,
    '2026-08-14T10:00:00Z'
  ),

  -- SHORT (with sizes)
  (
    '00000000-0000-4000-8000-000000000007',
    'Embellished Velvet Short Kurti',
    12500,
    'Short',
    '{}',
    array['S', 'M', 'L', 'XL'],
    'New',
    true,
    '2026-10-08T10:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000008',
    'Raw Silk Angrakha Short',
    11000,
    'Short',
    '{}',
    array['S', 'M', 'L', 'XL'],
    'Sale',
    true,
    '2026-09-01T10:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000009',
    'Handcrafted Zardozi Short Frock',
    14800,
    'Short',
    '{}',
    array['S', 'M', 'L', 'XL'],
    null,
    false,
    '2026-07-28T10:00:00Z'
  ),

  -- MAXI (with sizes)
  (
    '00000000-0000-4000-8000-000000000010',
    'Royal Gold Embroidered Maxi',
    28500,
    'Maxi',
    '{}',
    array['S', 'M', 'L', 'XL'],
    'New',
    true,
    '2026-10-09T10:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000011',
    'Midnight Velvet Anarkali Maxi',
    32000,
    'Maxi',
    '{}',
    array['S', 'M', 'L', 'XL'],
    null,
    true,
    '2026-09-18T10:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000012',
    'Festive Tiered Chiffon Maxi',
    22500,
    'Maxi',
    '{}',
    array['S', 'M', 'L', 'XL'],
    'Sale',
    true,
    '2026-08-30T10:00:00Z'
  )
on conflict (id) do nothing;

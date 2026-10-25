-- ============================================================================
-- SNS Official — Stitch n Style
-- Menu & Product Sections Migration (/supabase/menu-migration.sql)
--
-- Instructions:
-- 1. Open your Supabase Dashboard -> SQL Editor -> New Query.
-- 2. Paste this entire file and click "Run".
-- Safe to re-run multiple times (idempotent).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. UPDATE PRODUCTS TABLE (Add section and subcategory)
-- ============================================================================

alter table public.products
  add column if not exists section text not null default 'women';

alter table public.products
  add column if not exists subcategory text;

-- Ensure all existing rows have a valid section ('women')
update public.products
set section = 'women'
where section is null or section not in ('women', 'brides');

-- Add check constraint for section if not already present
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_section_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_section_check
      check (section in ('women', 'brides'));
  end if;
end $$;

create index if not exists idx_products_section on public.products (section);
create index if not exists idx_products_subcategory on public.products (subcategory);

-- ============================================================================
-- 2. CREATE MENU_ITEMS TABLE
-- ============================================================================

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('women', 'brides')),
  parent_id uuid references public.menu_items(id) on delete cascade,
  label text not null,
  custom_url text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_menu_items_section_sort
  on public.menu_items (section, sort_order asc, created_at asc);

create index if not exists idx_menu_items_parent
  on public.menu_items (parent_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) FOR MENU_ITEMS
-- ============================================================================

alter table public.menu_items enable row level security;

drop policy if exists "Public can view visible menu items" on public.menu_items;
create policy "Public can view visible menu items"
  on public.menu_items
  for select
  to anon
  using (is_visible = true);

drop policy if exists "Admin can view all menu items" on public.menu_items;
create policy "Admin can view all menu items"
  on public.menu_items
  for select
  to authenticated
  using (true);

drop policy if exists "Admin can insert menu items" on public.menu_items;
create policy "Admin can insert menu items"
  on public.menu_items
  for insert
  to authenticated
  with check (true);

drop policy if exists "Admin can update menu items" on public.menu_items;
create policy "Admin can update menu items"
  on public.menu_items
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admin can delete menu items" on public.menu_items;
create policy "Admin can delete menu items"
  on public.menu_items
  for delete
  to authenticated
  using (true);

-- ============================================================================
-- 4. SEED WOMEN SECTION TOP-LEVEL ITEMS (Idempotent, leaves BRIDES empty)
-- ============================================================================

insert into public.menu_items (id, section, parent_id, label, custom_url, sort_order, is_visible)
select '00000000-0000-4000-9000-000000000001', 'women', null, 'New Arrivals', 'shop.html?sort=newest', 1, true
where not exists (
  select 1 from public.menu_items where section = 'women' and parent_id is null and lower(label) = 'new arrivals'
)
on conflict (id) do nothing;

insert into public.menu_items (id, section, parent_id, label, custom_url, sort_order, is_visible)
select '00000000-0000-4000-9000-000000000002', 'women', null, 'Saree', null, 2, true
where not exists (
  select 1 from public.menu_items where section = 'women' and parent_id is null and lower(label) = 'saree'
)
on conflict (id) do nothing;

insert into public.menu_items (id, section, parent_id, label, custom_url, sort_order, is_visible)
select '00000000-0000-4000-9000-000000000003', 'women', null, 'Dupatta', null, 3, true
where not exists (
  select 1 from public.menu_items where section = 'women' and parent_id is null and lower(label) = 'dupatta'
)
on conflict (id) do nothing;

insert into public.menu_items (id, section, parent_id, label, custom_url, sort_order, is_visible)
select '00000000-0000-4000-9000-000000000004', 'women', null, 'Short', null, 4, true
where not exists (
  select 1 from public.menu_items where section = 'women' and parent_id is null and lower(label) = 'short'
)
on conflict (id) do nothing;

insert into public.menu_items (id, section, parent_id, label, custom_url, sort_order, is_visible)
select '00000000-0000-4000-9000-000000000005', 'women', null, 'Maxi', null, 5, true
where not exists (
  select 1 from public.menu_items where section = 'women' and parent_id is null and lower(label) = 'maxi'
)
on conflict (id) do nothing;

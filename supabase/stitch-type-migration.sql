-- =============================================================================
-- SNS Official — Stitch n Style
-- Database Migration: Stitched / Unstitched Product Options
-- Paste and run this script in the Supabase SQL Editor.
-- Safe and idempotent to run on the live database.
-- =============================================================================

-- 1. Add available_types and unstitched_price columns to public.products
alter table public.products
  add column if not exists available_types text[] not null default array['stitched','unstitched']::text[];

alter table public.products
  add column if not exists unstitched_price integer;

-- 2. Ensure all existing rows have valid available_types (both types by default)
update public.products
set available_types = array['stitched','unstitched']::text[]
where available_types is null
   or coalesce(array_length(available_types, 1), 0) = 0;

-- 3. Add idempotent check constraint on available_types:
--    array must not be empty and every element must be 'stitched' or 'unstitched' (no nulls)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_available_types_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_available_types_check
      check (
        coalesce(array_length(available_types, 1), 0) > 0
        and available_types <@ array['stitched','unstitched']::text[]
        and array_position(available_types, null) is null
      );
  end if;
end $$;

-- 4. Add idempotent check constraint on unstitched_price (nullable, >= 0)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_unstitched_price_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_unstitched_price_check
      check (
        unstitched_price is null or unstitched_price >= 0
      );
  end if;
end $$;

-- Kitchen Kaki: one shared family per household, synced across phones.
-- Paste this whole file into Supabase > SQL Editor and press Run. Safe to run again.

-- One row per family. The whole app state is kept as one JSON document.
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our family',
  state jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  created_at timestamptz not null default now()
);

-- Who belongs to which family. owner/parent see everything; helper sees the helper view.
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  role text not null check (role in ('owner', 'parent', 'helper')),
  name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Invite codes, kept apart so a helper can't read the parent code.
create table if not exists public.household_invites (
  household_id uuid primary key references public.households(id) on delete cascade,
  parent_code text not null unique,
  helper_code text not null unique
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;

create or replace function public.is_member(h uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members m where m.household_id = h and m.user_id = auth.uid());
$$;

create or replace function public.is_parent(h uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members m where m.household_id = h and m.user_id = auth.uid() and m.role in ('owner', 'parent'));
$$;

drop policy if exists "members read family" on public.households;
create policy "members read family" on public.households for select to authenticated using (public.is_member(id));
drop policy if exists "members save family" on public.households;
create policy "members save family" on public.households for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

drop policy if exists "members see each other" on public.household_members;
create policy "members see each other" on public.household_members for select to authenticated using (public.is_member(household_id));
drop policy if exists "members rename themselves" on public.household_members;
create policy "members rename themselves" on public.household_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "members leave" on public.household_members;
create policy "members leave" on public.household_members for delete to authenticated using (user_id = auth.uid());

drop policy if exists "parents read invites" on public.household_invites;
create policy "parents read invites" on public.household_invites for select to authenticated using (public.is_parent(household_id));

-- Members may only change the shared state, never ids; roles only change through join_household.
revoke insert, update, delete on public.households from anon, authenticated;
grant select on public.households to authenticated;
grant update (state, updated_at, updated_by) on public.households to authenticated;
revoke insert, update, delete on public.household_members from anon, authenticated;
grant select, delete on public.household_members to authenticated;
grant update (name) on public.household_members to authenticated;
revoke all on public.household_invites from anon, authenticated;
grant select on public.household_invites to authenticated;

create or replace function public.new_code() returns text
language sql volatile set search_path = '' as $$
  -- 8 characters, no 0/O/1/I so it is easy to read out
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 8);
$$;

-- Creates a family with the caller as owner. Prototype rule: one family per Supabase project,
-- so strangers who find the project URL can't start their own family and use your Gemini quota.
create or replace function public.create_household(p_family text, p_name text, p_state jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.households) then raise exception 'family exists' using errcode = 'P0001'; end if;
  insert into public.households (name, state, updated_by) values (coalesce(nullif(trim(p_family), ''), 'Our family'), p_state, auth.uid()) returning id into h;
  insert into public.household_members (household_id, user_id, role, name) values (h, auth.uid(), 'owner', coalesce(p_name, ''));
  insert into public.household_invites (household_id, parent_code, helper_code) values (h, public.new_code(), public.new_code());
  return h;
end $$;

-- Joins a family with an invite code. Returns the family id and the role the code gives.
create or replace function public.join_household(p_code text, p_name text)
returns table (household_id uuid, role text) language plpgsql security definer set search_path = '' as $$
declare inv public.household_invites; r text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into inv from public.household_invites i where i.parent_code = upper(trim(p_code)) or i.helper_code = upper(trim(p_code));
  if not found then raise exception 'invalid code' using errcode = 'P0002'; end if;
  r := case when inv.parent_code = upper(trim(p_code)) then 'parent' else 'helper' end;
  insert into public.household_members (household_id, user_id, role, name) values (inv.household_id, auth.uid(), r, coalesce(p_name, ''))
  on conflict on constraint household_members_pkey do update set name = excluded.name,
    role = case when public.household_members.role = 'owner' then 'owner' else excluded.role end;
  return query select inv.household_id, (select m.role from public.household_members m where m.household_id = inv.household_id and m.user_id = auth.uid());
end $$;

-- New invite codes (for example after a helper leaves). Parents only.
create or replace function public.reset_invites(p_household uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_parent(p_household) then raise exception 'not allowed'; end if;
  update public.household_invites set parent_code = public.new_code(), helper_code = public.new_code() where household_id = p_household;
end $$;

-- Remove someone from the family (for example a helper who has left). Parents only; the owner stays.
create or replace function public.remove_member(p_household uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_parent(p_household) then raise exception 'not allowed'; end if;
  delete from public.household_members where household_id = p_household and user_id = p_user and role <> 'owner';
end $$;

revoke all on function public.create_household(text, text, jsonb), public.join_household(text, text),
  public.reset_invites(uuid), public.remove_member(uuid, uuid), public.new_code() from public, anon;
grant execute on function public.create_household(text, text, jsonb), public.join_household(text, text),
  public.reset_invites(uuid), public.remove_member(uuid, uuid) to authenticated;

-- Live updates: other phones see changes within a second or two.
do $$ begin
  alter publication supabase_realtime add table public.households;
exception when duplicate_object then null;
end $$;

-- Family photos of dishes (the "Add your photo" button). A private bucket: only members of the family can see or change
-- the files in their own family's folder (the folder name is the family's id). Photos are shrunk on the phone first (about 100 KB each).
-- Safe to run again.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', false, 1048576, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg'];

drop policy if exists "family reads photos" on storage.objects;
create policy "family reads photos" on storage.objects for select to authenticated
  using (bucket_id = 'recipe-photos' and public.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "family adds photos" on storage.objects;
create policy "family adds photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-photos' and public.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "family changes photos" on storage.objects;
create policy "family changes photos" on storage.objects for update to authenticated
  using (bucket_id = 'recipe-photos' and public.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "family removes photos" on storage.objects;
create policy "family removes photos" on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-photos' and public.is_member(((storage.foldername(name))[1])::uuid));

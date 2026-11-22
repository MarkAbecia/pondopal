-- Row Level Security (ADR 0004). Every policy goes through space_role() / is_space_member().
-- Rules: personal spaces have only their owner as member; viewers read; members write their
-- own rows; owners and admins manage everything in the space.

-- ---------------------------------------------------------------- helpers

create function public.space_role(p_space_id uuid) returns public.space_role
language sql stable security definer set search_path = '' as $$
  select m.role from public.space_members m
  where m.space_id = p_space_id and m.user_id = (select auth.uid()) and m.left_at is null
$$;

create function public.is_space_member(p_space_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.space_role(p_space_id) is not null
$$;

create function public.can_manage_space(p_space_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.space_role(p_space_id) in ('owner', 'admin'), false)
$$;

-- Can the caller write a row in this space that belongs to p_user_id?
create function public.can_write_as(p_space_id uuid, p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case public.space_role(p_space_id)
    when 'owner' then true
    when 'admin' then true
    when 'member' then coalesce(p_user_id = (select auth.uid()), false)
    else false
  end
$$;

create function public.shares_space_with(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.space_members a
    join public.space_members b on b.space_id = a.space_id
    where a.user_id = (select auth.uid()) and b.user_id = p_user_id
      and a.left_at is null and b.left_at is null)
$$;

-- ---------------------------------------------------------------- enable RLS everywhere

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- uniform policies

-- Space data: members read, owners/admins write.
do $$
declare t text;
begin
  foreach t in array array['budgets', 'recurring_bills', 'goals', 'challenges',
                           'paluwagan', 'paluwagan_members', 'paluwagan_rounds'] loop
    execute format($f$
      create policy "members read" on public.%1$I for select to authenticated
        using (public.is_space_member(space_id));
      create policy "managers write" on public.%1$I for all to authenticated
        using (public.can_manage_space(space_id)) with check (public.can_manage_space(space_id));
    $f$, t);
  end loop;
end $$;

-- Per-user rows: members read, members write their own, owners/admins write any.
do $$
declare t text; owner_col text;
begin
  for t, owner_col in
    select * from (values ('transactions', 'user_id'), ('goal_contributions', 'user_id'),
                          ('challenge_entries', 'user_id'), ('settlements', 'from_user')) v
  loop
    execute format($f$
      create policy "members read" on public.%1$I for select to authenticated
        using (public.is_space_member(space_id));
      create policy "write own" on public.%1$I for insert to authenticated
        with check (public.can_write_as(space_id, %2$I));
      create policy "update own" on public.%1$I for update to authenticated
        using (public.can_write_as(space_id, %2$I)) with check (public.can_write_as(space_id, %2$I));
      create policy "delete own" on public.%1$I for delete to authenticated
        using (public.can_write_as(space_id, %2$I));
    $f$, t, owner_col);
  end loop;
end $$;

-- ---------------------------------------------------------------- special cases

-- profiles: you, plus people you share a space with (name/avatar). Push token is not readable.
create policy "read self and co-members" on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or public.shares_space_with(user_id));
create policy "update self" on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke select, update on public.profiles from anon, authenticated;
grant select (id, user_id, display_name, avatar_url, locale, timezone, created_at, updated_at)
  on public.profiles to authenticated;
grant update (display_name, avatar_url, locale, timezone, expo_push_token) on public.profiles to authenticated;

-- spaces: created via insert (non-personal only); personal spaces come from the signup trigger.
-- created_by check lets INSERT ... RETURNING see the row before membership exists.
create policy "members read" on public.spaces for select to authenticated
  using (public.is_space_member(id) or created_by = (select auth.uid()));
create policy "create shared space" on public.spaces for insert to authenticated
  with check (created_by = (select auth.uid()) and type <> 'personal');
create policy "managers update" on public.spaces for update to authenticated
  using (public.can_manage_space(id)) with check (public.can_manage_space(id));
create policy "owner deletes shared space" on public.spaces for delete to authenticated
  using (public.space_role(id) = 'owner' and type <> 'personal');
revoke update on public.spaces from anon, authenticated;
grant update (name, currency) on public.spaces to authenticated;

-- space_members: joins go through accept_invite(); leaving through leave_space().
-- Managers can change roles or remove (left_at) anyone except an owner, and never grant owner.
create policy "members read" on public.space_members for select to authenticated
  using (public.is_space_member(space_id));
create policy "managers update" on public.space_members for update to authenticated
  using (public.can_manage_space(space_id) and role <> 'owner')
  with check (public.can_manage_space(space_id) and role <> 'owner');
revoke insert, delete, update on public.space_members from anon, authenticated;
grant update (role, left_at) on public.space_members to authenticated;

-- invites: managers of shared spaces only.
create policy "managers read" on public.invites for select to authenticated
  using (public.can_manage_space(space_id));
create policy "managers create" on public.invites for insert to authenticated
  with check (
    public.can_manage_space(space_id)
    and created_by = (select auth.uid())
    and (select s.type from public.spaces s where s.id = space_id) <> 'personal');
create policy "managers update" on public.invites for update to authenticated
  using (public.can_manage_space(space_id)) with check (public.can_manage_space(space_id));
create policy "managers delete" on public.invites for delete to authenticated
  using (public.can_manage_space(space_id));

-- categories: system defaults (space_id null) readable by all; space categories by members.
create policy "read" on public.categories for select to authenticated
  using (space_id is null or public.is_space_member(space_id));
create policy "managers write" on public.categories for all to authenticated
  using (space_id is not null and public.can_manage_space(space_id))
  with check (space_id is not null and public.can_manage_space(space_id));

-- transaction_splits (v2): payer of the transaction or managers.
create policy "members read" on public.transaction_splits for select to authenticated
  using (public.is_space_member(space_id));
create policy "payer or managers write" on public.transaction_splits for all to authenticated
  using (public.can_write_as(space_id, (select t.user_id from public.transactions t where t.id = transaction_id)))
  with check (public.can_write_as(space_id, (select t.user_id from public.transactions t where t.id = transaction_id)));

-- Owned by one user.
create policy "own" on public.payment_sources for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "read own" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "mark read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "read" on public.challenge_templates for select to authenticated using (true);

-- ---------------------------------------------------------------- membership functions

create function public.accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.invites;
  v_type public.space_type;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_inv from public.invites where code = upper(trim(p_code)) for update;
  if not found or v_inv.expires_at <= now()
     or (v_inv.max_uses is not null and v_inv.used_count >= v_inv.max_uses) then
    raise exception 'invite is invalid or expired' using errcode = 'P0002';
  end if;

  -- lock the space so the partner-capacity check can't race
  select s.type into v_type from public.spaces s where s.id = v_inv.space_id for update;
  if v_type = 'personal' then
    raise exception 'personal spaces cannot be joined' using errcode = '42501';
  end if;

  if exists (select 1 from public.space_members
             where space_id = v_inv.space_id and user_id = v_uid and left_at is null) then
    return v_inv.space_id;
  end if;

  if v_type = 'partner' and (select count(*) from public.space_members
                             where space_id = v_inv.space_id and left_at is null) >= 2 then
    raise exception 'partner space is full' using errcode = 'P0001';
  end if;

  insert into public.space_members (space_id, user_id, role)
  values (v_inv.space_id, v_uid, v_inv.role)
  on conflict (space_id, user_id)
  do update set role = excluded.role, left_at = null, joined_at = now();

  update public.invites set used_count = used_count + 1 where id = v_inv.id;
  return v_inv.space_id;
end $$;

-- Owners can't leave (transfer ownership or delete the space); nobody leaves a personal space.
create function public.leave_space(p_space_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.space_members m set left_at = now()
  from public.spaces s
  where s.id = m.space_id and m.space_id = p_space_id and m.user_id = auth.uid()
    and m.left_at is null and m.role <> 'owner' and s.type <> 'personal';
  if not found then
    raise exception 'cannot leave this space' using errcode = '42501';
  end if;
end $$;

revoke execute on function public.accept_invite(text), public.leave_space(uuid) from public, anon;
grant execute on function public.accept_invite(text), public.leave_space(uuid) to authenticated;

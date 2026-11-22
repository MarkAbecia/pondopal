-- PondoPal core schema. All money is bigint centavos (ADR 0003).
-- Tables marked v2 are created now so later phases need no reshaping.

create type public.space_type as enum ('personal', 'partner', 'family', 'group');
create type public.space_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.txn_type as enum ('income', 'expense');
create type public.payment_kind as enum ('cash', 'gcash', 'maya', 'bank', 'credit_card', 'other');
create type public.pay_frequency as enum ('daily', 'weekly', 'semi_monthly', 'monthly');
create type public.bill_frequency as enum ('weekly', 'monthly', 'quarterly', 'yearly');
create type public.lifecycle_status as enum ('active', 'completed', 'cancelled');

-- ---------------------------------------------------------------- people & spaces

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  avatar_url text,
  locale text not null default 'en' check (locale in ('en', 'fil')),
  timezone text not null default 'Asia/Manila',
  expo_push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  type public.space_type not null,
  currency char(3) not null default 'PHP',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index spaces_one_personal_per_user on public.spaces (created_by) where type = 'personal';

create table public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.space_role not null default 'member',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, user_id)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 10)),
  role public.space_role not null default 'member' check (role <> 'owner'),
  expires_at timestamptz not null default now() + interval '7 days',
  max_uses int check (max_uses is null or max_uses > 0),
  used_count int not null default 0 check (used_count >= 0),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- money in & out

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.spaces (id) on delete cascade, -- null = system default
  name text not null check (char_length(name) between 1 and 40),
  icon text,
  type public.txn_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (space_id, type, name)
);

create table public.payment_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  kind public.payment_kind not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  -- set null on account deletion keeps shared-space history intact (RA 10173: no personal data left)
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  payment_source_id uuid references public.payment_sources (id) on delete set null,
  type public.txn_type not null,
  amount_centavos bigint not null check (amount_centavos > 0),
  occurred_at timestamptz not null default now(),
  note text check (char_length(note) <= 500),
  receipt_path text,
  -- copy of a personal transaction shared into this space (ADR 0005)
  shared_from_transaction_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, space_id)
);
create index transactions_space_occurred_idx on public.transactions (space_id, occurred_at desc, id desc);

-- v2: bill splitting
create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  space_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  share_centavos bigint not null check (share_centavos >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (transaction_id, user_id),
  foreign key (transaction_id, space_id) references public.transactions (id, space_id) on delete cascade
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  month date not null check (month = date_trunc('month', month)::date),
  limit_centavos bigint not null check (limit_centavos > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, category_id, month)
);

create table public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  amount_centavos bigint not null check (amount_centavos > 0),
  due_day smallint not null check (due_day between 1 and 31),
  frequency public.bill_frequency not null default 'monthly',
  next_due_at timestamptz not null,
  category_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recurring_bills_next_due_idx on public.recurring_bills (next_due_at);

-- v2
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  from_user uuid default auth.uid() references auth.users (id) on delete set null,
  to_user uuid references auth.users (id) on delete set null,
  amount_centavos bigint not null check (amount_centavos > 0),
  settled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_user <> to_user)
);

-- ---------------------------------------------------------------- goals & ipon

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  target_centavos bigint not null check (target_centavos > 0),
  deadline date not null,
  pay_frequency public.pay_frequency not null default 'monthly',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, space_id)
);

-- Child tables carry space_id (pinned to the parent by a composite FK) so RLS and
-- Realtime filters work on one column.
create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null,
  space_id uuid not null,
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  amount_centavos bigint not null check (amount_centavos > 0),
  contributed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (goal_id, space_id) references public.goals (id, space_id) on delete cascade
);

create table public.challenge_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  rules jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  template_key text not null references public.challenge_templates (key),
  name text not null check (char_length(name) between 1 and 80),
  base_centavos bigint not null default 0 check (base_centavos >= 0),
  settings jsonb not null default '{}', -- e.g. {"reverse": true}, {"target_bills": 100}
  start_date date not null default (now() at time zone 'Asia/Manila')::date,
  status public.lifecycle_status not null default 'active',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, space_id)
);

-- One grid per member (ADR 0005).
create table public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null,
  space_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cell_index int not null check (cell_index >= 1),
  amount_centavos bigint not null check (amount_centavos >= 0),
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, user_id, cell_index),
  foreign key (challenge_id, space_id) references public.challenges (id, space_id) on delete cascade
);

-- ---------------------------------------------------------------- paluwagan (v2)

create table public.paluwagan (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  contribution_centavos bigint not null check (contribution_centavos > 0),
  frequency public.pay_frequency not null,
  start_date date not null,
  status public.lifecycle_status not null default 'active',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, space_id)
);

create table public.paluwagan_members (
  id uuid primary key default gen_random_uuid(),
  paluwagan_id uuid not null,
  space_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  payout_order int not null check (payout_order >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (paluwagan_id, user_id),
  unique (paluwagan_id, payout_order),
  foreign key (paluwagan_id, space_id) references public.paluwagan (id, space_id) on delete cascade
);

-- One row per round per paying member; the round's pot goes to the member whose payout_order = round_number.
create table public.paluwagan_rounds (
  id uuid primary key default gen_random_uuid(),
  paluwagan_id uuid not null,
  space_id uuid not null,
  round_number int not null check (round_number >= 1),
  user_id uuid not null references auth.users (id) on delete cascade,
  due_date date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (paluwagan_id, round_number, user_id),
  foreign key (paluwagan_id, space_id) references public.paluwagan (id, space_id) on delete cascade
);

-- ---------------------------------------------------------------- notifications

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------- indexes on every FK

-- Creates an index for each FK whose columns aren't already the leading columns of an index.
-- policies/schema_test.sql fails if a later migration adds an unindexed FK.
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl,
           (select string_agg(quote_ident(a.attname), ', ' order by k.ord)
              from unnest(c.conkey) with ordinality k (attnum, ord)
              join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as cols
    from pg_constraint c
    where c.contype = 'f'
      and c.connamespace = 'public'::regnamespace
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey)
  loop
    execute format('create index on %s (%s)', r.tbl, r.cols);
  end loop;
end $$;

-- ---------------------------------------------------------------- triggers

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- The creator of a space becomes its owner.
create function public.add_space_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is not null then
    insert into public.space_members (space_id, user_id, role) values (new.id, new.created_by, 'owner');
  end if;
  return new;
end $$;

create trigger add_space_owner after insert on public.spaces
for each row execute function public.add_space_owner();

-- Signup: profile + personal space.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  insert into public.spaces (name, type, created_by) values ('Personal', 'personal', new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Account deletion (RA 10173): personal spaces and everything in them go with the user.
-- Shared spaces the user owns are handled by the backend's deletion flow (transfer or delete).
create function public.delete_personal_spaces() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.spaces where created_by = old.id and type = 'personal';
  return old;
end $$;

create trigger on_auth_user_deleted before delete on auth.users
for each row execute function public.delete_personal_spaces();

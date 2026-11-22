-- Every user starts with the six standard payment sources so the transaction form has choices.

create function public.add_default_payment_sources(p_user_id uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.payment_sources (user_id, name, kind)
  select p_user_id, v.name, v.kind::public.payment_kind
  from (values ('Cash', 'cash'), ('GCash', 'gcash'), ('Maya', 'maya'), ('Bank', 'bank'),
               ('Credit Card', 'credit_card'), ('Other', 'other')) v (name, kind)
  where not exists (select 1 from public.payment_sources s where s.user_id = p_user_id);
$$;
revoke execute on function public.add_default_payment_sources(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  insert into public.spaces (name, type, created_by) values ('Personal', 'personal', new.id);
  perform public.add_default_payment_sources(new.id);
  return new;
end $$;

-- backfill users created before this migration
select public.add_default_payment_sources(id) from auth.users;

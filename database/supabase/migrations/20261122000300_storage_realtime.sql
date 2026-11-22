-- Storage buckets and Realtime publication.

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false), ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- receipts/<space_id>/<file>: first path segment is the space. Returns null for anything else.
create function public.space_id_from_path(p_name text) returns uuid
language sql immutable set search_path = '' as $$
  select case
    when split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end
$$;

create policy "receipts: members read" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and public.is_space_member(public.space_id_from_path(name)));
create policy "receipts: writers upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts'
              and public.space_role(public.space_id_from_path(name)) in ('owner', 'admin', 'member'));
create policy "receipts: uploader or managers update" on storage.objects for update to authenticated
  using (bucket_id = 'receipts'
         and public.can_write_as(public.space_id_from_path(name), owner_id::uuid));
create policy "receipts: uploader or managers delete" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts'
         and public.can_write_as(public.space_id_from_path(name), owner_id::uuid));

-- avatars/<user_id>/<file>: public read via the public bucket URL; users manage their own folder.
create policy "avatars: own folder read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "avatars: own folder upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "avatars: own folder update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "avatars: own folder delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

alter publication supabase_realtime
  add table public.transactions, public.challenge_entries, public.goal_contributions;

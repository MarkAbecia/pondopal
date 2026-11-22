-- v2: marking paluwagan contributions as paid, and Realtime for splits, settlements and rounds.

-- paluwagan_rounds stays "managers write" (RLS). This function is the one way members touch it:
-- a member marks their own contribution; owners/admins can mark anyone's. Only paid_at changes.
create function public.pay_paluwagan_round(
  p_paluwagan_id uuid, p_round int, p_user_id uuid, p_paid boolean default true
) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_space uuid;
  v_status public.lifecycle_status;
  v_paid_at timestamptz;
begin
  select space_id, status into v_space, v_status from public.paluwagan where id = p_paluwagan_id;
  if v_space is null or public.space_role(v_space) is null then
    raise exception 'paluwagan not found' using errcode = 'P0002';
  end if;
  if not (public.can_manage_space(v_space)
          or (p_user_id = (select auth.uid()) and public.can_write_as(v_space, p_user_id))) then
    raise exception 'you can only mark your own contribution' using errcode = '42501';
  end if;
  if v_status = 'cancelled' then
    raise exception 'this paluwagan was cancelled' using errcode = 'P0001';
  end if;

  update public.paluwagan_rounds
     set paid_at = case when p_paid then coalesce(paid_at, now()) end
   where paluwagan_id = p_paluwagan_id and round_number = p_round and user_id = p_user_id
  returning paid_at into v_paid_at;
  if not found then
    raise exception 'round not found' using errcode = 'P0002';
  end if;

  -- completed once every contribution of every round is in; reopens if one is unmarked
  update public.paluwagan
     set status = case when exists (select 1 from public.paluwagan_rounds
                                     where paluwagan_id = p_paluwagan_id and paid_at is null)
                       then 'active'::public.lifecycle_status
                       else 'completed'::public.lifecycle_status end
   where id = p_paluwagan_id;
  return v_paid_at;
end $$;

revoke execute on function public.pay_paluwagan_round(uuid, int, uuid, boolean) from public, anon;
grant execute on function public.pay_paluwagan_round(uuid, int, uuid, boolean) to authenticated;

alter publication supabase_realtime add table public.transaction_splits, public.settlements,
  public.paluwagan_rounds;

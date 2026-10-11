-- No Repitas: allow a losing player to flag a rejected answer for editorial
-- review without changing the authoritative match outcome.
create table private.nr_review_requests(
 match_id uuid not null references private.nr_matches(id) on delete cascade,
 round_no integer not null,
 user_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(match_id,round_no,user_id),
 foreign key(match_id,round_no,user_id) references private.nr_responses(match_id,round_no,user_id) on delete cascade
);
revoke all on private.nr_review_requests from public,anon,authenticated;

create function public.nr_report_rejected_answer(p_room_id uuid,p_round_no integer)
returns void language plpgsql security definer set search_path=''
as $fn$
declare v_match uuid;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';
 end if;
 select id into v_match from private.nr_matches where room_id=p_room_id;
 if not found then raise exception 'GAME_NOT_FOUND'; end if;
 if not exists (
   select 1 from private.nr_responses r
   where r.match_id=v_match and r.round_no=p_round_no and r.user_id=auth.uid()
     and r.verdict='invalid'
 ) then raise exception 'REPORT_NOT_ALLOWED'; end if;
 insert into private.nr_review_requests(match_id,round_no,user_id)
 values(v_match,p_round_no,auth.uid())
 on conflict do nothing;
end;
$fn$;
revoke all on function public.nr_report_rejected_answer(uuid,integer) from public,anon;
grant execute on function public.nr_report_rejected_answer(uuid,integer) to authenticated;

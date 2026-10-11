-- Preserve the public API while exposing only the current caller's own review status.
create or replace function public.nr_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_match private.nr_matches%rowtype; v_title text; v_hint text;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';
 end if;
 perform private.nr_tick(p_room_id);
 select * into v_match from private.nr_matches where room_id=p_room_id;
 if not found then return null; end if;
 select title,hint into v_title,v_hint from private.nr_topics where id=v_match.topic_id;
 return jsonb_build_object(
   'topic',v_title,'hint',v_hint,
   'phase',v_match.phase,'round',v_match.round_no,
   'deadline',v_match.deadline,'server_time',now(),'winner_id',v_match.winner_id,
   'players',coalesce((
     select jsonb_agg(jsonb_build_object(
       'user_id',p.user_id,'name',p.display_name,
       'alive',p.alive,'eliminated_round',p.eliminated_round,
       'submitted',exists(select 1 from private.nr_responses r
         where r.match_id=p.match_id and r.round_no=v_match.round_no and r.user_id=p.user_id)
     ) order by p.display_name)
     from private.nr_players p where p.match_id=v_match.id
   ),'[]'::jsonb),
   'my_answer',(
      select r.raw_answer from private.nr_responses r
      where r.match_id=v_match.id and r.round_no=v_match.round_no
        and r.user_id=auth.uid()
   ),
   'reported_invalid',exists(
     select 1 from private.nr_review_requests review
     where review.match_id=v_match.id and review.round_no=v_match.round_no
       and review.user_id=auth.uid()
   ),
   -- Previously revealed answers are shared as the round's blacklist.
   'blacklist',coalesce((
     select jsonb_agg(jsonb_build_object('answer',h.raw_answer,
         'round',h.round_no,'verdict',h.verdict) order by h.round_no,h.raw_answer)
     from private.nr_responses h
     where h.match_id=v_match.id and
       (h.round_no<v_match.round_no or
        (h.round_no=v_match.round_no and v_match.phase in ('reveal','finished')))
   ),'[]'::jsonb),
   'results',case when v_match.phase in ('reveal','finished') then
     coalesce((
       select jsonb_agg(jsonb_build_object(
         'user_id',p.user_id,'name',p.display_name,
         'answer',r.raw_answer,
         'verdict',coalesce(r.verdict,'timeout')
       ) order by p.display_name)
       from private.nr_players p
       left join private.nr_responses r
         on r.match_id=p.match_id and r.user_id=p.user_id
          and r.round_no=v_match.round_no
       where p.match_id=v_match.id and
         (p.eliminated_round is null or p.eliminated_round=v_match.round_no)
     ),'[]'::jsonb)
     else '[]'::jsonb end
 );
end;
$fn$;

revoke all on function public.submit_nr_answer(uuid,text) from public,anon;
revoke all on function public.nr_state(uuid) from public,anon;
grant execute on function public.submit_nr_answer(uuid,text) to authenticated;
grant execute on function public.nr_state(uuid) to authenticated;

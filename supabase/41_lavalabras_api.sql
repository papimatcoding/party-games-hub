-- LAVALABRAS / 41. Member-only, one secret word per surviving player and round.
create function public.submit_lava_word(p_room_id uuid,p_answer text)
returns void language plpgsql security definer set search_path=''
as $fn$
declare m private.lava_matches%rowtype; v_answer text;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';end if;
 perform private.lava_tick(p_room_id);
 select * into m from private.lava_matches where room_id=p_room_id for update;
 if not found or m.phase<>'writing' or clock_timestamp()>=m.deadline then
   raise exception 'WRITING_CLOSED';end if;
 if not exists(select 1 from private.lava_players
   where match_id=m.id and user_id=auth.uid() and alive) then
   raise exception 'ELIMINATED';end if;
 v_answer:=btrim(coalesce(p_answer,''));
 if char_length(v_answer)<1 or char_length(v_answer)>65
   or private.nr_normalize(v_answer)='' then
   raise exception 'ANSWER_INVALID_LENGTH';end if;
 insert into private.lava_answers(match_id,round_no,user_id,raw_answer,answer_key)
 values(m.id,m.round_no,auth.uid(),v_answer,private.nr_normalize(v_answer))
 on conflict(match_id,round_no,user_id)
 do update set raw_answer=excluded.raw_answer,answer_key=excluded.answer_key,
   submitted_at=now(),entry_id=null,gain=null,verdict=null;
 perform private.lava_tick(p_room_id);
end;
$fn$;

create function public.lava_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare m private.lava_matches%rowtype; title text; hint text;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';end if;
 perform private.lava_tick(p_room_id);
 select * into m from private.lava_matches where room_id=p_room_id;
 if not found then return null;end if;
 select t.title,t.hint into title,hint from private.nr_topics t where t.id=m.topic_id;
 return jsonb_build_object(
  'phase',m.phase,'round',m.round_no,'topic',title,'hint',hint,
  'lava',m.lava_height,'lava_next',m.lava_height+4+2*m.round_no,
  'deadline',m.deadline,'server_time',clock_timestamp(),
  'winner_id',m.winner_id,
  'players',coalesce((
   select jsonb_agg(jsonb_build_object(
    'user_id',p.user_id,'name',p.display_name,'height',p.height,
    'alive',p.alive,'eliminated_round',p.eliminated_round,
    'submitted',exists(select 1 from private.lava_answers a
      where a.match_id=m.id and a.round_no=m.round_no and a.user_id=p.user_id)
   ) order by p.display_name)
   from private.lava_players p where p.match_id=m.id
  ),'[]'::jsonb),
  'my_answer',(
    select a.raw_answer from private.lava_answers a
    where a.match_id=m.id and a.round_no=m.round_no and a.user_id=auth.uid()
  ),
  'results',case when m.phase in ('reveal','finished') then coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id',p.user_id,'name',p.display_name,
      'answer',a.raw_answer,'gain',coalesce(a.gain,0),
      'verdict',coalesce(a.verdict,'timeout'),
      'height',p.height,'alive',p.alive
    ) order by p.display_name)
    from private.lava_players p
    left join private.lava_answers a
      on a.match_id=p.match_id and a.user_id=p.user_id and a.round_no=m.round_no
    where p.match_id=m.id
      and (p.eliminated_round is null or p.eliminated_round=m.round_no)
  ),'[]'::jsonb) else '[]'::jsonb end
 );
end;
$fn$;
revoke all on function public.submit_lava_word(uuid,text) from public,anon;
revoke all on function public.lava_state(uuid) from public,anon;
grant execute on function public.submit_lava_word(uuid,text) to authenticated;
grant execute on function public.lava_state(uuid) to authenticated;

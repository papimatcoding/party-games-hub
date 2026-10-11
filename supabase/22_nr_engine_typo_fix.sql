-- No Repitas / 17: authoritative round resolution and answer blacklist.
create or replace function private.nr_tick(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare v_room public.rooms%rowtype; v_match private.nr_matches%rowtype;
        v_alive integer; v_submitted integer; v_winner uuid;
begin
 select * into v_room from public.rooms where id=p_room_id for update;
 if not found or v_room.status<>'playing' or v_room.game_id<>'no_repitas' then return; end if;
 select * into v_match from private.nr_matches where room_id=p_room_id for update;
 if not found or v_match.phase='finished' then return; end if;

 if v_match.phase='writing' then
   select count(*) into v_alive from private.nr_players
     where match_id=v_match.id and alive;
   select count(*) into v_submitted
     from private.nr_responses r
     join private.nr_players p on p.match_id=r.match_id and p.user_id=r.user_id
     where r.match_id=v_match.id and r.round_no=v_match.round_no and p.alive;
   if now()<v_match.deadline and v_submitted<v_alive then return; end if;

   -- Only after the submission window closes, resolve aliases and validate.
   update private.nr_responses r
      set entry_id=private.nr_resolve_key(v_match.topic_id,r.answer_key)
    where r.match_id=v_match.id and r.round_no=v_match.round_no;

   update private.nr_responses r set verdict=
      case
        when exists(
          select 1 from private.nr_responses old
          where old.match_id=r.match_id and old.round_no<r.round_no
            and (old.answer_key=r.answer_key or
                 (r.entry_id is not null and old.entry_id=r.entry_id))
        ) then 'reused'
        when exists(
          select 1 from private.nr_responses other
          where other.match_id=r.match_id and other.round_no=r.round_no
            and other.user_id<>r.user_id
            and (other.answer_key=r.answer_key or
                 (r.entry_id is not null and other.entry_id=r.entry_id))
        ) then 'duplicate'
        when r.entry_id is null then 'invalid'
        else 'valid'
      end
    where r.match_id=v_match.id and r.round_no=v_match.round_no;

   update private.nr_players p
      set alive=false, eliminated_round=v_match.round_no
    where p.match_id=v_match.id and p.alive
      and not exists(
        select 1 from private.nr_responses r
        where r.match_id=p.match_id and r.round_no=v_match.round_no
          and r.user_id=p.user_id and r.verdict='valid'
      );

   select count(*) into v_alive from private.nr_players
    where match_id=v_match.id and alive;
   select user_id into v_winner from private.nr_players
    where match_id=v_match.id and alive order by user_id limit 1;

   if v_alive<=1 or v_match.round_no>=12 then
     update private.nr_matches
     set phase='finished',
         winner_id=case when v_alive=1 then v_winner else null end,
         deadline=now(),updated_at=now()
     where id=v_match.id;
   else
     update private.nr_matches
     set phase='reveal', deadline=now()+interval '7 seconds',updated_at=now()
     where id=v_match.id;
   end if;
   update public.rooms set updated_at=now() where id=p_room_id;

 elsif v_match.phase='reveal' and now()>=v_match.deadline then
   update private.nr_matches set phase='writing', round_no=v_match.round_no+1,
     deadline=now()+interval '25 seconds',updated_at=now()
   where id=v_match.id;
   update public.rooms set updated_at=now() where id=p_room_id;
 end if;
end;
$fn$;
revoke all on function private.nr_tick(uuid) from public,anon,authenticated;

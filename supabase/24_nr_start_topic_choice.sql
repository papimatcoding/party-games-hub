-- Select the chosen topic, or pick a fresh surprise on RANDOM.
create or replace function public.start_no_repitas(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare v_room public.rooms%rowtype; v_count integer; v_unready integer;
        v_topic text; v_match uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_room from public.rooms where id=p_room_id for update;
 if not found or v_room.host_user_id<>auth.uid() then raise exception 'HOST_ONLY'; end if;
 if v_room.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
 if v_room.mode<>'freeplay' or v_room.game_id<>'no_repitas' then raise exception 'WRONG_GAME'; end if;
 select count(*),count(*) filter(where not is_ready)
   into v_count,v_unready from public.room_members where room_id=p_room_id;
 if v_count<2 then raise exception 'NEED_TWO_PLAYERS'; end if;
 if v_unready>0 then raise exception 'NOT_ALL_READY'; end if;
 select t.id into v_topic
 from private.nr_topics t
 join private.nr_entries e on e.topic_id=t.id
 where t.active and v_count between t.min_players and t.max_players
   and (v_room.nr_topic_id is null or t.id=v_room.nr_topic_id)
 group by t.id
 having count(e.id)>=greatest(8,v_count*4)
 order by random()
 limit 1;
 if v_topic is null then raise exception 'TOPIC_NOT_AVAILABLE'; end if;
 delete from private.nr_matches where room_id=p_room_id;
 insert into private.nr_matches(room_id,topic_id,deadline)
 values(p_room_id,v_topic,now()+interval '25 seconds') returning id into v_match;
 insert into private.nr_players(match_id,user_id,display_name)
 select v_match,user_id,display_name from public.room_members where room_id=p_room_id;
 update public.rooms set status='playing',updated_at=now() where id=p_room_id;
end;
$fn$;
revoke all on function public.start_no_repitas(uuid) from public,anon;
grant execute on function public.start_no_repitas(uuid) to authenticated;

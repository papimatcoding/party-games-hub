-- Optional, shared and fair host topic choice. Default remains random.
alter table public.rooms add column nr_topic_id text
  references private.nr_topics(id) on delete set null;

create function public.nr_list_topics(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_players integer;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';
 end if;
 select greatest(2,count(*)) into v_players from public.room_members
 where room_id=p_room_id;
 return coalesce((
   select jsonb_agg(jsonb_build_object(
     'id',t.id,'title',t.title,'hint',t.hint,'answer_count',s.answer_count
   ) order by t.title)
   from private.nr_topics t
   join (
     select topic_id,count(*) as answer_count from private.nr_entries group by topic_id
   ) s on s.topic_id=t.id
   where t.active and v_players between t.min_players and t.max_players
     and s.answer_count>=greatest(8,v_players*4)
 ),'[]'::jsonb);
end;
$fn$;

create function public.nr_set_topic(p_room_id uuid,p_topic_id text)
returns void language plpgsql security definer set search_path=''
as $fn$
declare v_room public.rooms%rowtype; v_players integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_room from public.rooms where id=p_room_id for update;
 if not found or v_room.host_user_id<>auth.uid() then raise exception 'HOST_ONLY'; end if;
 if v_room.status<>'lobby' then raise exception 'ROOM_NOT_IN_LOBBY'; end if;
 if v_room.game_id<>'no_repitas' or v_room.mode<>'freeplay' then
   raise exception 'WRONG_GAME';
 end if;
 select greatest(2,count(*)) into v_players from public.room_members where room_id=p_room_id;
 if p_topic_id is not null and not exists (
   select 1 from private.nr_topics t
   join (
     select topic_id,count(*) as cnt from private.nr_entries group by topic_id
   ) s on s.topic_id=t.id
   where t.id=p_topic_id and t.active
     and v_players between t.min_players and t.max_players
     and s.cnt>=greatest(8,v_players*4)
 ) then raise exception 'TOPIC_NOT_AVAILABLE'; end if;
 update public.rooms set nr_topic_id=p_topic_id,updated_at=now() where id=p_room_id;
 update public.room_members set is_ready=false where room_id=p_room_id;
end;
$fn$;
revoke all on function public.nr_list_topics(uuid) from public,anon;
revoke all on function public.nr_set_topic(uuid,text) from public,anon;
grant execute on function public.nr_list_topics(uuid) to authenticated;
grant execute on function public.nr_set_topic(uuid,text) to authenticated;

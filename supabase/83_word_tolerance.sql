-- 83: forgiving misspellings with ambiguity guard, never invent answers outside the catalogue.
create or replace function private.nr_resolve_key(p_topic text,p_key text)
returns bigint language plpgsql stable set search_path=''
as $fn$
declare found_id bigint; candidates integer; radius integer;
begin
 if p_topic is null or p_key is null or p_key='' then return null;end if;
 select a.entry_id into found_id from private.nr_aliases a
 where a.topic_id=p_topic and a.alias_key=p_key limit 1;
 if found then return found_id;end if;
 if length(p_key)<5 or length(p_key)>65 then return null;end if;
 radius:=case when length(p_key)>=9 then 2 else 1 end;
 select count(distinct a.entry_id),min(a.entry_id) into candidates,found_id
 from private.nr_aliases a
 where a.topic_id=p_topic and length(a.alias_key)>=5
  and abs(length(a.alias_key)-length(p_key))<=radius
  and extensions.levenshtein_less_equal(a.alias_key,p_key,radius)<=radius;
 if candidates=1 then return found_id;end if;
 return null;
end;
$fn$;
revoke all on function private.nr_resolve_key(text,text) from public,anon,authenticated;

-- Lava: single edit for long words only, strict unique dictionary resolution.
create function private.nr_resolve_lava_key(p_topic text,p_key text)
returns bigint language plpgsql stable security definer set search_path=''
as $fn$
declare found_id bigint; candidates integer;
begin
 if p_topic is null or p_key is null or p_key='' then return null;end if;
 select a.entry_id into found_id from private.nr_aliases a
 where a.topic_id=p_topic and a.alias_key=p_key limit 1;
 if found then return found_id;end if;
 if length(p_key)<7 or length(p_key)>65 then return null;end if;
 select count(distinct a.entry_id),min(a.entry_id) into candidates,found_id
 from private.nr_aliases a where a.topic_id=p_topic
 and length(a.alias_key)>=7 and abs(length(a.alias_key)-length(p_key))<=1
 and extensions.levenshtein_less_equal(a.alias_key,p_key,1)<=1;
 if candidates=1 then return found_id;end if;
 return null;
end;
$fn$;
revoke all on function private.nr_resolve_lava_key(text,text) from public,anon,authenticated;

create or replace function private.lava_tick(p_room_id uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
declare r public.rooms%rowtype; m private.lava_matches%rowtype;
 v_alive integer; v_submitted integer; v_new_lava integer;
 v_winner uuid; v_topic text;
begin
  if not private.game_is_live(p_room_id) then return;end if;
 select * into r from public.rooms where id=p_room_id for update;
 if not found or r.status<>'playing' or r.game_id<>'lavalabras' then return; end if;
 select * into m from private.lava_matches where room_id=p_room_id for update;
 if not found or m.phase='finished' then return; end if;
 if m.phase='writing' then
   select count(*) into v_alive from private.lava_players
     where match_id=m.id and alive;
   select count(*) into v_submitted from private.lava_answers a
     join private.lava_players p on p.match_id=a.match_id and p.user_id=a.user_id
     where a.match_id=m.id and a.round_no=m.round_no and p.alive;
   if clock_timestamp()<m.deadline and v_submitted<v_alive then return; end if;

   -- Do not expose answer validity until the writing phase has closed.
   update private.lava_answers a set
     entry_id=private.nr_resolve_lava_key(m.topic_id,a.answer_key)
   where a.match_id=m.id and a.round_no=m.round_no;

   update private.lava_answers a set
     verdict=case when a.entry_id is null then 'invalid' else 'valid' end,
     gain=case when a.entry_id is null then 0
       else least(65,char_length(regexp_replace(
         private.nr_normalize(a.raw_answer),'[^[:alpha:]]','','g')))
     end
   where a.match_id=m.id and a.round_no=m.round_no;

   update private.lava_players p
   set height=p.height+coalesce((
     select a.gain from private.lava_answers a
     where a.match_id=p.match_id and a.user_id=p.user_id
       and a.round_no=m.round_no
   ),0)
   where p.match_id=m.id and p.alive;

   v_new_lava:=m.lava_height+4+2*m.round_no;
   -- A tower exactly as high as the lava is swallowed.
   update private.lava_players p
   set alive=false,eliminated_round=m.round_no
   where p.match_id=m.id and p.alive and p.height<=v_new_lava;

   update private.lava_rounds set lava_after=v_new_lava
   where match_id=m.id and round_no=m.round_no;

   select count(*) into v_alive from private.lava_players
   where match_id=m.id and alive;
   select user_id into v_winner from private.lava_players
   where match_id=m.id and alive order by user_id limit 1;

   update private.lava_matches
     set lava_height=v_new_lava,phase='reveal',
     deadline=clock_timestamp()+interval '7 seconds',
     winner_id=case when v_alive=1 then v_winner else null end,
     updated_at=now()
   where id=m.id;
   update public.rooms set updated_at=now() where id=p_room_id;
 elsif m.phase='reveal' and clock_timestamp()>=m.deadline then
   select count(*) into v_alive from private.lava_players
   where match_id=m.id and alive;
   if v_alive<=1 or m.round_no=12 then
     update private.lava_matches
       set phase='finished',updated_at=now()
     where id=m.id;
   else
     v_topic:=private.lava_choose_topic(m.id,m.round_no+1);
     if v_topic is null then raise exception 'NO_SUITABLE_TOPIC';end if;
     insert into private.lava_rounds(match_id,round_no,topic_id,lava_before)
     values(m.id,m.round_no+1,v_topic,m.lava_height);
     update private.lava_matches set
       round_no=round_no+1,topic_id=v_topic,phase='writing',
       deadline=clock_timestamp()+interval '24 seconds',updated_at=now()
     where id=m.id;
   end if;
   update public.rooms set updated_at=now() where id=p_room_id;
 end if;
end;
$fn$;
revoke all on function private.lava_tick(uuid) from public,anon,authenticated;

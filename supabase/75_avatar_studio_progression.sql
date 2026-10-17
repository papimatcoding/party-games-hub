-- 75 / AVATAR STUDIO: private-owned cosmetics and progress for anonymous/auth accounts.
-- Cosmetics never influence hitboxes, physics or game outcomes.
create table private.avatar_items(
 code text primary key check(code ~ '^[a-z0-9_]{2,40}$'),
 slot text not null check(slot in ('outfit','head','face','back','emote')),
 title text not null,
 price integer not null default 0 check(price between 0 and 5000),
 min_level integer not null default 1 check(min_level between 1 and 100),
 rarity text not null default 'common' check(rarity in ('common','rare','epic','legendary')),
 achievement text,
 is_starter boolean not null default false
);
create table private.avatar_profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 skin integer not null default 3 check(skin between 0 and 7),
 hair integer not null default 0 check(hair between 0 and 11),
 eyes integer not null default 0 check(eyes between 0 and 7),
 mouth integer not null default 0 check(mouth between 0 and 7),
 hair_color integer not null default 1 check(hair_color between 0 and 9),
 outfit_color integer not null default 0 check(outfit_color between 0 and 9),
 outfit text not null default 'outfit_hoodie',
 head text not null default 'head_none',
 face text not null default 'face_none',
 back text not null default 'back_none',
 emote text not null default 'emote_wave',
 total_xp integer not null default 0 check(total_xp >=0),
 tickets integer not null default 120 check(tickets>=0),
 games_played integer not null default 0 check(games_played>=0),
 wins integer not null default 0 check(wins>=0),
 gold integer not null default 0 check(gold>=0),
 silver integer not null default 0 check(silver>=0),
 bronze integer not null default 0 check(bronze>=0),
 updated_at timestamptz not null default clock_timestamp()
);
create table private.avatar_owned(
 user_id uuid not null references auth.users(id) on delete cascade,
 item_code text not null references private.avatar_items(code),
 acquired_at timestamptz not null default clock_timestamp(),
 primary key(user_id,item_code)
);
create table private.avatar_reward_events(
 user_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null check(length(event_key)<=170),
 xp integer not null check(xp between 0 and 1000),
 tickets integer not null check(tickets between 0 and 500),
 occurred_at timestamptz not null default clock_timestamp(),
 primary key(user_id,event_key)
);
create table private.avatar_achievements(
 code text primary key,
 title text not null,
 description text not null,
 xp integer not null,
 tickets integer not null,
 target_column text not null check(target_column in ('games_played','wins','gold')),
 threshold integer not null
);
create table private.avatar_earned(
 user_id uuid not null references auth.users(id) on delete cascade,
 achievement_code text not null references private.avatar_achievements(code),
 unlocked_at timestamptz not null default clock_timestamp(),
 primary key(user_id,achievement_code)
);
revoke all on private.avatar_items,private.avatar_profiles,private.avatar_owned,
 private.avatar_reward_events,private.avatar_achievements,private.avatar_earned from public,anon,authenticated;

insert into private.avatar_achievements(code,title,description,xp,tickets,target_column,threshold) values
('first_game','Primer desastre','Completa tu primer minijuego',60,50,'games_played',1),
('regular','Habitual de la fiesta','Completa 5 minijuegos',100,75,'games_played',5),
('marathon','No sabes parar','Completa 25 minijuegos',230,180,'games_played',25),
('first_win','Primera corona','Gana tu primera partida',120,90,'wins',1),
('champion','Rey del caos','Gana 10 partidas',300,240,'wins',10),
('first_gold','De oro','Consigue tu primera medalla de oro',100,80,'gold',1),
('golden_five','Coleccionista de oro','Consigue 5 medallas de oro',250,200,'gold',5);

insert into private.avatar_items(code,slot,title,price,min_level,rarity,achievement,is_starter) values
('outfit_hoodie','outfit','Sudadera urbana',0,1,'common',null,true),
('outfit_sport','outfit','Equipo deportivo',0,1,'common',null,true),
('outfit_denim','outfit','Chaqueta vaquera',0,1,'common',null,true),
('outfit_suit','outfit','Traje de gala',140,2,'rare',null,false),
('outfit_chef','outfit','Chef estelar',170,3,'rare',null,false),
('outfit_space','outfit','Astronauta de fiesta',240,4,'epic',null,false),
('outfit_ninja','outfit','Sombra sigilosa',200,3,'rare',null,false),
('outfit_royal','outfit','Realeza de cartón',320,6,'epic',null,false),
('outfit_banana','outfit','Disfraz de plátano',200,4,'rare',null,false),
('outfit_galaxy','outfit','Cósmico',450,9,'legendary',null,false),
('head_none','head','Sin sombrero',0,1,'common',null,true),
('head_cap','head','Gorra urbana',0,1,'common',null,true),
('head_beanie','head','Gorro de invierno',95,2,'common',null,false),
('head_crown','head','Corona dorada',270,5,'epic',null,false),
('head_frog','head','Sombrero rana',170,3,'rare',null,false),
('head_cat','head','Orejas de gato',140,2,'rare',null,false),
('head_party','head','Gorro de cumpleaños',0,1,'common',null,true),
('head_chef','head','Gorro de chef',120,3,'rare',null,false),
('head_helmet','head','Casco futurista',220,5,'epic',null,false),
('head_pirate','head','Sombrero pirata',180,4,'rare',null,false),
('head_fish','head','Pez en la cabeza',240,6,'epic',null,false),
('head_champion','head','La corona del caos',0,1,'legendary','champion',false),
('face_none','face','Cara al descubierto',0,1,'common',null,true),
('face_round','face','Gafas redondas',0,1,'common',null,true),
('face_sun','face','Gafas de sol',90,2,'common',null,false),
('face_star','face','Estrellas brillantes',160,3,'rare',null,false),
('face_patch','face','Parche pirata',130,2,'rare',null,false),
('face_mustache','face','Bigote imperial',100,2,'common',null,false),
('face_mask','face','Antifaz misterioso',170,4,'rare',null,false),
('face_heart','face','Corazones rosas',200,5,'epic',null,false),
('back_none','back','Sin accesorio',0,1,'common',null,true),
('back_pack','back','Mochila aventurera',0,1,'common',null,true),
('back_cape','back','Capa heroica',160,3,'rare',null,false),
('back_wings','back','Alas celestiales',320,6,'epic',null,false),
('back_balloon','back','Globo fiestero',120,2,'rare',null,false),
('back_jetpack','back','Mochila propulsora',420,9,'legendary',null,false),
('emote_wave','emote','Saludar',0,1,'common',null,true),
('emote_laugh','emote','Carcajada',0,1,'common',null,true),
('emote_cry','emote','Drama total',70,2,'common',null,false),
('emote_flex','emote','Presumir',110,3,'rare',null,false),
('emote_dance','emote','Baile absurdo',170,5,'rare',null,false),
('emote_confetti','emote','Explosión de confeti',250,7,'epic',null,false);

create function private.avatar_level(p_xp integer)
returns integer language sql immutable set search_path=''
as $fn$ select least(100,1+floor(sqrt(greatest(0,p_xp)::numeric/125))::integer) $fn$;
revoke all on function private.avatar_level(integer) from public,anon,authenticated;

create function private.avatar_ensure(p_user uuid)
returns void language plpgsql security definer set search_path=''
as $fn$
begin
 if p_user is null then return;end if;
 insert into private.avatar_profiles(user_id) values(p_user) on conflict do nothing;
end;
$fn$;
revoke all on function private.avatar_ensure(uuid) from public,anon,authenticated;

-- All economy changes occur in trusted match and medal triggers, never through client RPC.
create function private.avatar_reward(p_user uuid,p_key text,p_xp integer,p_tickets integer,
 p_game boolean default false,p_win boolean default false,p_medal integer default null)
returns void language plpgsql security definer set search_path=''
as $fn$
declare inserted integer;ach record;pr private.avatar_profiles%rowtype;qualifies boolean;
begin
 if p_user is null then return;end if;
 perform private.avatar_ensure(p_user);
 insert into private.avatar_reward_events(user_id,event_key,xp,tickets)
 values(p_user,p_key,p_xp,p_tickets) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then return;end if;
 update private.avatar_profiles set total_xp=total_xp+p_xp,
 tickets=tickets+p_tickets,
 games_played=games_played+case when p_game then 1 else 0 end,
 wins=wins+case when p_win then 1 else 0 end,
 gold=gold+case when p_medal=1 then 1 else 0 end,
 silver=silver+case when p_medal=2 then 1 else 0 end,
 bronze=bronze+case when p_medal=3 then 1 else 0 end,
 updated_at=clock_timestamp()
 where user_id=p_user returning * into pr;
 for ach in select * from private.avatar_achievements loop
  qualifies:=case ach.target_column
    when 'games_played' then pr.games_played>=ach.threshold
    when 'wins' then pr.wins>=ach.threshold
    when 'gold' then pr.gold>=ach.threshold
    else false end;
  if qualifies then
    insert into private.avatar_earned(user_id,achievement_code)
    values(p_user,ach.code) on conflict do nothing;
    get diagnostics inserted=row_count;
    if inserted>0 then
      update private.avatar_profiles set total_xp=total_xp+ach.xp,
         tickets=tickets+ach.tickets where user_id=p_user;
    end if;
  end if;
 end loop;
end;
$fn$;
revoke all on function private.avatar_reward(uuid,text,integer,integer,boolean,boolean,integer) from public,anon,authenticated;

-- Trigger handles ALL seven games and credits only genuine server-finished matches.
create function private.avatar_finished_match()
returns trigger language plpgsql security definer set search_path=''
as $fn$
declare table_name text;person record;uid uuid;
begin
 if new.phase<>'finished' or old.phase='finished' then return new;end if;
 table_name:=case tg_table_name
 when 'laser_matches' then 'laser_players'
 when 'nr_matches' then 'nr_players'
 when 'ice_matches' then 'ice_players'
 when 'pong_matches' then 'pong_players'
 when 'lava_matches' then 'lava_players'
 when 'rail_matches' then 'rail_players'
 when 'door_matches' then 'door_players'
 else null end;
 if table_name is null then return new;end if;
 for person in execute format('select user_id from private.%I where match_id=$1',table_name) using new.id loop
  perform private.avatar_reward(person.user_id,'match:'||tg_table_name||':'||new.id::text,
   70+case when person.user_id=new.winner_id then 35 else 0 end,
   12+case when person.user_id=new.winner_id then 8 else 0 end,
   true,person.user_id=new.winner_id,null);
 end loop;
 return new;
end;
$fn$;
revoke all on function private.avatar_finished_match() from public,anon,authenticated;
create trigger reward_lasers after update of phase on private.laser_matches for each row execute function private.avatar_finished_match();
create trigger reward_nr after update of phase on private.nr_matches for each row execute function private.avatar_finished_match();
create trigger reward_ice after update of phase on private.ice_matches for each row execute function private.avatar_finished_match();
create trigger reward_pong after update of phase on private.pong_matches for each row execute function private.avatar_finished_match();
create trigger reward_lava after update of phase on private.lava_matches for each row execute function private.avatar_finished_match();
create trigger reward_rail after update of phase on private.rail_matches for each row execute function private.avatar_finished_match();
create trigger reward_doors after update of phase on private.door_matches for each row execute function private.avatar_finished_match();

create function private.avatar_medal_awarded()
returns trigger language plpgsql security definer set search_path=''
as $fn$
begin
 perform private.avatar_reward(new.user_id,
 'party:'||new.session_id::text||':'||new.slot::text,
 case new.rank when 1 then 35 when 2 then 25 when 3 then 15 else 0 end,
 case new.rank when 1 then 20 when 2 then 14 when 3 then 8 else 0 end,
 false,false,new.rank);
 return new;
end;
$fn$;
revoke all on function private.avatar_medal_awarded() from public,anon,authenticated;
create trigger reward_party_medals after insert on private.party_medals
for each row execute function private.avatar_medal_awarded();

create function public.avatar_profile()
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare p private.avatar_profiles%rowtype;u uuid:=auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 perform private.avatar_ensure(u);
 select * into p from private.avatar_profiles where user_id=u;
 return jsonb_build_object(
  'appearance',jsonb_build_object('skin',p.skin,'hair',p.hair,'eyes',p.eyes,
   'mouth',p.mouth,'hair_color',p.hair_color,'outfit_color',p.outfit_color,
   'outfit',p.outfit,'head',p.head,'face',p.face,'back',p.back,'emote',p.emote),
  'total_xp',p.total_xp,'level',private.avatar_level(p.total_xp),
  'next_xp',least(100,private.avatar_level(p.total_xp))^2*125,
  'tickets',p.tickets,'games_played',p.games_played,'wins',p.wins,
  'gold',p.gold,'silver',p.silver,'bronze',p.bronze,
  'owned',coalesce((select jsonb_agg(item_code) from private.avatar_owned
    where user_id=u),'[]'::jsonb),
  'items',coalesce((select jsonb_agg(jsonb_build_object(
   'code',i.code,'slot',i.slot,'title',i.title,'price',i.price,
   'min_level',i.min_level,'rarity',i.rarity,'achievement',i.achievement,
   'starter',i.is_starter) order by i.slot,i.price,i.code)
   from private.avatar_items i),'[]'::jsonb),
  'achievements',coalesce((select jsonb_agg(jsonb_build_object(
    'code',a.code,'title',a.title,'description',a.description,
    'xp',a.xp,'tickets',a.tickets,'threshold',a.threshold,
    'target',a.target_column,'unlocked',e.user_id is not null)
    order by a.threshold,a.code)
    from private.avatar_achievements a left join private.avatar_earned e
     on e.achievement_code=a.code and e.user_id=u),'[]'::jsonb)
 );
end;
$fn$;
revoke all on function public.avatar_profile() from public,anon;
grant execute on function public.avatar_profile() to authenticated;

create function public.avatar_customize(p_skin integer,p_hair integer,p_eyes integer,
 p_mouth integer,p_hair_color integer,p_outfit_color integer)
returns void language plpgsql security definer set search_path=''
as $fn$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_skin not between 0 and 7 or p_hair not between 0 and 11 or
 p_eyes not between 0 and 7 or p_mouth not between 0 and 7 or
 p_hair_color not between 0 and 9 or p_outfit_color not between 0 and 9 or
 p_skin is null or p_hair is null or p_eyes is null or p_mouth is null
 or p_hair_color is null or p_outfit_color is null
 then raise exception 'INVALID_AVATAR_STYLE';end if;
 perform private.avatar_ensure(auth.uid());
 update private.avatar_profiles set skin=p_skin,hair=p_hair,eyes=p_eyes,
 mouth=p_mouth,hair_color=p_hair_color,outfit_color=p_outfit_color,
 updated_at=clock_timestamp() where user_id=auth.uid();
end;
$fn$;
revoke all on function public.avatar_customize(integer,integer,integer,integer,integer,integer) from public,anon;
grant execute on function public.avatar_customize(integer,integer,integer,integer,integer,integer) to authenticated;

create function public.avatar_buy(p_code text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare item private.avatar_items%rowtype;p private.avatar_profiles%rowtype;unlocked boolean;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into item from private.avatar_items where code=p_code;
 if not found then raise exception 'COSMETIC_NOT_FOUND';end if;
 perform private.avatar_ensure(auth.uid());
 select * into p from private.avatar_profiles where user_id=auth.uid() for update;
 if item.is_starter or exists(select 1 from private.avatar_owned where user_id=p.user_id and item_code=item.code)
 then raise exception 'ALREADY_OWNED';end if;
 if private.avatar_level(p.total_xp)<item.min_level then raise exception 'LEVEL_TOO_LOW';end if;
 if item.achievement is not null and not exists(
   select 1 from private.avatar_earned where user_id=p.user_id and achievement_code=item.achievement)
 then raise exception 'ACHIEVEMENT_REQUIRED';end if;
 if p.tickets<item.price then raise exception 'NOT_ENOUGH_TICKETS';end if;
 update private.avatar_profiles set tickets=tickets-item.price,updated_at=clock_timestamp()
 where user_id=p.user_id;
 insert into private.avatar_owned(user_id,item_code) values(p.user_id,item.code);
 return jsonb_build_object('purchased',item.code,'balance',p.tickets-item.price);
end;
$fn$;
revoke all on function public.avatar_buy(text) from public,anon;
grant execute on function public.avatar_buy(text) to authenticated;

create function public.avatar_equip(p_slot text,p_code text)
returns void language plpgsql security definer set search_path=''
as $fn$
declare item private.avatar_items%rowtype;p private.avatar_profiles%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_slot not in ('outfit','head','face','back','emote') or p_slot is null
 then raise exception 'INVALID_SLOT';end if;
 select * into item from private.avatar_items where code=p_code and slot=p_slot;
 if not found then raise exception 'COSMETIC_NOT_FOUND';end if;
 perform private.avatar_ensure(auth.uid());
 select * into p from private.avatar_profiles where user_id=auth.uid() for update;
 if not item.is_starter and not exists(
   select 1 from private.avatar_owned where user_id=p.user_id and item_code=item.code)
 then raise exception 'ITEM_LOCKED';end if;
 update private.avatar_profiles set
  outfit=case when p_slot='outfit' then p_code else outfit end,
  head=case when p_slot='head' then p_code else head end,
  face=case when p_slot='face' then p_code else face end,
  back=case when p_slot='back' then p_code else back end,
  emote=case when p_slot='emote' then p_code else emote end,
  updated_at=clock_timestamp() where user_id=auth.uid();
end;
$fn$;
revoke all on function public.avatar_equip(text,text) from public,anon;
grant execute on function public.avatar_equip(text,text) to authenticated;

create function public.avatar_room_styles(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
begin
 if auth.uid() is null or not private.is_room_member(p_room_id)
 then raise exception 'NOT_A_MEMBER';end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object('user_id',rm.user_id,
   'skin',coalesce(p.skin,3),'hair',coalesce(p.hair,0),
   'eyes',coalesce(p.eyes,0),'mouth',coalesce(p.mouth,0),
   'hair_color',coalesce(p.hair_color,1),'outfit_color',coalesce(p.outfit_color,0),
   'outfit',coalesce(p.outfit,'outfit_hoodie'),'head',coalesce(p.head,'head_none'),
   'face',coalesce(p.face,'face_none'),'back',coalesce(p.back,'back_none'),
   'level',private.avatar_level(coalesce(p.total_xp,0)))
  order by rm.joined_at)
  from public.room_members rm left join private.avatar_profiles p on p.user_id=rm.user_id
  where rm.room_id=p_room_id
 ),'[]'::jsonb);
end;
$fn$;
revoke all on function public.avatar_room_styles(uuid) from public,anon;
grant execute on function public.avatar_room_styles(uuid) to authenticated;

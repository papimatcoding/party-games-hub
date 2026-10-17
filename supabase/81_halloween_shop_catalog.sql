-- 81 / HALLOWEEN — editorial shop, themed catalog and atomic bundle discounts.
alter table private.avatar_items add column theme text not null default 'urban'
 check(theme in ('urban','sport','fantasy','space','chaos','halloween'));
alter table private.avatar_items add column season text;
alter table private.avatar_items add column featured boolean not null default false;

-- Curated base collection price rebalance. Existing purchasers are credited for any reductions.
create temporary table _avatar_old_prices on commit drop as
 select code,price from private.avatar_items;
update private.avatar_items set
 theme=case
 when code like 'outfit_sport%' then 'sport'
 when code in ('outfit_space','outfit_galaxy','head_helmet','back_jetpack') then 'space'
 when code in ('outfit_royal','head_crown','head_champion','head_pirate','back_cape','back_wings','face_patch') then 'fantasy'
 when code in ('outfit_banana','head_frog','head_fish','face_star','face_heart','back_balloon','emote_dance','emote_confetti') then 'chaos'
 else 'urban' end,
 price=case
 when is_starter or achievement is not null then 0
 when rarity='common' then least(price,75)
 when rarity='rare' then least(price,145)
 when rarity='epic' then least(price,225)
 else least(price,330) end;
update private.avatar_profiles p set tickets=p.tickets+adj.credit,updated_at=clock_timestamp()
from (select o.user_id,sum(old.price-i.price)::integer as credit
 from private.avatar_owned o
 join _avatar_old_prices old on old.code=o.item_code
 join private.avatar_items i on i.code=o.item_code
 where old.price>i.price
 group by o.user_id) adj
where p.user_id=adj.user_id;

-- Entirely original spooky-cartoon collection: no licensed movie characters or marks.
insert into private.avatar_items
(code,slot,title,price,min_level,rarity,achievement,is_starter,theme,season,featured) values
('head_pumpkin','head','Calabaza viviente',175,1,'epic',null,false,'halloween','halloween_2026',true),
('head_hockey','head','Máscara del campamento',155,1,'rare',null,false,'halloween','halloween_2026',true),
('head_witch','head','Sombrero de bruja',115,1,'rare',null,false,'halloween','halloween_2026',true),
('head_ghost','head','Fantasmita travieso',165,1,'epic',null,false,'halloween','halloween_2026',true),
('outfit_skeleton','outfit','Esqueleto fiestero',185,1,'rare',null,false,'halloween','halloween_2026',true),
('outfit_witch','outfit','Brujería elegante',195,1,'epic',null,false,'halloween','halloween_2026',true),
('outfit_vampire','outfit','Vampiro nocturno',200,1,'epic',null,false,'halloween','halloween_2026',false),
('face_scary','face','Mirada maldita',85,1,'rare',null,false,'halloween','halloween_2026',true),
('face_stitched','face','Sonrisa cosida',75,1,'rare',null,false,'halloween','halloween_2026',true),
('back_bats','back','Nube de murciélagos',125,1,'rare',null,false,'halloween','halloween_2026',true),
('emote_spook','emote','¡Buuu!',105,1,'rare',null,false,'halloween','halloween_2026',true);

-- Bundle is the ENTIRE Halloween collection; contents can also be purchased individually.
create table private.avatar_bundles(
 code text primary key,
 title text not null,
 description text not null,
 theme text not null,
 season text,
 base_price integer not null check(base_price>0),
 active_from timestamptz not null,
 active_until timestamptz not null
);
create table private.avatar_bundle_items(
 bundle_code text not null references private.avatar_bundles(code) on delete cascade,
 item_code text not null references private.avatar_items(code) on delete restrict,
 primary key(bundle_code,item_code)
);
insert into private.avatar_bundles(code,title,description,theme,season,base_price,active_from,active_until)
values('bundle_halloween26','La noche más larga','Colección completa: 11 cosméticos de Halloween. Lo que ya tengas se descuenta del pack.',
'halloween','halloween_2026',1080,'2026-10-17 00:00:00+02','2026-11-09 00:00:00+01');
insert into private.avatar_bundle_items(bundle_code,item_code)
select 'bundle_halloween26',code from private.avatar_items where season='halloween_2026';

revoke all on private.avatar_bundles,private.avatar_bundle_items from public,anon,authenticated;

-- Identical quote and charge calculation; discount scales to still-unowned items.
create function private.avatar_bundle_due(p_user uuid,p_code text)
returns integer language sql stable security definer set search_path=''
as $fn$
 select case when count(*) filter(where not exists(
     select 1 from private.avatar_owned o where o.user_id=p_user and o.item_code=i.code
  ))=0 then 0
 else least(coalesce(sum(i.price) filter(where not exists(
     select 1 from private.avatar_owned o where o.user_id=p_user and o.item_code=i.code
  )),0)::integer,
  ceil(coalesce(sum(i.price) filter(where not exists(
    select 1 from private.avatar_owned o where o.user_id=p_user and o.item_code=i.code
  )),0)::numeric*b.base_price/nullif(sum(i.price),0))::integer)
 end
 from private.avatar_bundles b
 join private.avatar_bundle_items bi on bi.bundle_code=b.code
 join private.avatar_items i on i.code=bi.item_code
 where b.code=p_code group by b.base_price
$fn$;
revoke all on function private.avatar_bundle_due(uuid,text) from public,anon,authenticated;

create function public.avatar_buy_bundle(p_code text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_user uuid:=auth.uid();b private.avatar_bundles%rowtype;p private.avatar_profiles%rowtype;due integer;added integer;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED';end if;
 select * into b from private.avatar_bundles where code=p_code;
 if not found then raise exception 'BUNDLE_NOT_FOUND';end if;
 if clock_timestamp()<b.active_from or clock_timestamp()>=b.active_until
 then raise exception 'SEASON_NOT_ACTIVE';end if;
 perform private.avatar_ensure(v_user);
 select * into p from private.avatar_profiles where user_id=v_user for update;
 due:=private.avatar_bundle_due(v_user,p_code);
 if due is null or due<=0 then raise exception 'BUNDLE_ALREADY_OWNED';end if;
 if p.tickets<due then raise exception 'NOT_ENOUGH_TICKETS';end if;
 update private.avatar_profiles set tickets=tickets-due,updated_at=clock_timestamp() where user_id=v_user;
 insert into private.avatar_owned(user_id,item_code)
 select v_user,i.code from private.avatar_bundle_items bi
 join private.avatar_items i on i.code=bi.item_code
 where bi.bundle_code=p_code
 on conflict do nothing;
 get diagnostics added=row_count;
 if added=0 then raise exception 'BUNDLE_ALREADY_OWNED';end if;
 return jsonb_build_object('bundle',p_code,'paid',due,'items_added',added,'balance',p.tickets-due);
end;
$fn$;
revoke all on function public.avatar_buy_bundle(text) from public,anon;
grant execute on function public.avatar_buy_bundle(text) to authenticated;

-- The shop itself should refuse individual seasonal purchases after the event,
-- without removing any owned items/previously equipped costume.
create or replace function public.avatar_buy(p_code text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare item private.avatar_items%rowtype;p private.avatar_profiles%rowtype;v_until timestamptz;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into item from private.avatar_items where code=p_code;
 if not found then raise exception 'COSMETIC_NOT_FOUND';end if;
 if item.season='halloween_2026' and
    (clock_timestamp()<'2026-10-17 00:00:00+02'::timestamptz or
     clock_timestamp()>='2026-11-09 00:00:00+01'::timestamptz)
 then raise exception 'SEASON_NOT_ACTIVE';end if;
 perform private.avatar_ensure(auth.uid());
 select * into p from private.avatar_profiles where user_id=auth.uid() for update;
 if item.price=0 then raise exception 'FREE_REWARD_IS_AUTOMATIC';end if;
 if item.is_starter or exists(select 1 from private.avatar_owned where user_id=p.user_id and item_code=item.code)
 then raise exception 'ALREADY_OWNED';end if;
 if private.avatar_level(p.total_xp)<item.min_level then raise exception 'LEVEL_TOO_LOW';end if;
 if item.achievement is not null and not exists(
  select 1 from private.avatar_earned where user_id=p.user_id and achievement_code=item.achievement)
 then raise exception 'ACHIEVEMENT_REQUIRED';end if;
 if p.tickets<item.price then raise exception 'NOT_ENOUGH_TICKETS';end if;
 update private.avatar_profiles set tickets=tickets-item.price,updated_at=clock_timestamp() where user_id=p.user_id;
 insert into private.avatar_owned(user_id,item_code) values(p.user_id,item.code);
 return jsonb_build_object('purchased',item.code,'balance',p.tickets-item.price);
end;
$fn$;
revoke all on function public.avatar_buy(text) from public,anon;
grant execute on function public.avatar_buy(text) to authenticated;

-- Extend the existing profile payload, keeping backwards compatibility.
create or replace function public.avatar_profile()
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
   'starter',i.is_starter,'theme',i.theme,'season',i.season,'featured',i.featured)
   order by i.slot,i.price,i.code)
   from private.avatar_items i),'[]'::jsonb),
  'bundles',coalesce((select jsonb_agg(jsonb_build_object(
    'code',b.code,'title',b.title,'description',b.description,
    'base_price',b.base_price,'theme',b.theme,'season',b.season,
    'active_from',b.active_from,'active_until',b.active_until,
    'due',private.avatar_bundle_due(u,b.code),
    'items',(select jsonb_agg(bi.item_code order by bi.item_code)
      from private.avatar_bundle_items bi where bi.bundle_code=b.code))
  order by b.code) from private.avatar_bundles b),'[]'::jsonb),
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

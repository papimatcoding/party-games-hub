-- 78: achievement-only cosmetics unlock automatically. No meaningless zero-cost claims.
create or replace function public.avatar_buy(p_code text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare item private.avatar_items%rowtype;p private.avatar_profiles%rowtype;unlocked boolean;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into item from private.avatar_items where code=p_code;
 if not found then raise exception 'COSMETIC_NOT_FOUND';end if;
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
 update private.avatar_profiles set tickets=tickets-item.price,updated_at=clock_timestamp()
 where user_id=p.user_id;
 insert into private.avatar_owned(user_id,item_code) values(p.user_id,item.code);
 return jsonb_build_object('purchased',item.code,'balance',p.tickets-item.price);
end;
$fn$;
revoke all on function public.avatar_buy(text) from public,anon;
grant execute on function public.avatar_buy(text) to authenticated;
create or replace function public.avatar_equip(p_slot text,p_code text)
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
 if not item.is_starter
   and not (item.price=0 and item.achievement is not null and exists(
       select 1 from private.avatar_earned ea where ea.user_id=p.user_id
       and ea.achievement_code=item.achievement))
   and not exists(
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

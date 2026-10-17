-- 79: equipped emotes are visible to fellow room participants.
create or replace function public.avatar_room_styles(p_room_id uuid)
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
   'emote',coalesce(p.emote,'emote_wave'),
   'level',private.avatar_level(coalesce(p.total_xp,0)))
  order by rm.joined_at)
  from public.room_members rm left join private.avatar_profiles p on p.user_id=rm.user_id
  where rm.room_id=p_room_id
 ),'[]'::jsonb);
end;
$fn$;
revoke all on function public.avatar_room_styles(uuid) from public,anon;
grant execute on function public.avatar_room_styles(uuid) to authenticated;
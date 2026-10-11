-- Counter aggregate count(*) returns bigint, so provide a safe matching overload.
create function private.party_medal_score(p_gold bigint,p_silver bigint,p_bronze bigint)
returns bigint language sql immutable set search_path=''
as $fn$ select coalesce(p_gold,0)*3+coalesce(p_silver,0)*2+coalesce(p_bronze,0) $fn$;
revoke all on function private.party_medal_score(bigint,bigint,bigint)
 from public,anon,authenticated;
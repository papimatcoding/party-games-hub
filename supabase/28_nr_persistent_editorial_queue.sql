-- Persistent answer catalog feedback survives room reset, matches and room deletion.
-- Current-match feedback flags remain in nr_review_requests for private UI status.
create table private.nr_editorial_feedback(
 id bigint generated always as identity primary key,
 topic_id text not null references private.nr_topics(id),
 answer_key text not null,
 answer_sample text not null,
 reporter_user_id uuid not null,
 first_reported_at timestamptz not null default now(),
 unique(topic_id,answer_key,reporter_user_id)
);
create index nr_editorial_feedback_topic_idx on private.nr_editorial_feedback(topic_id,first_reported_at);
revoke all on private.nr_editorial_feedback from public,anon,authenticated;

create or replace function public.nr_report_rejected_answer(p_room_id uuid,p_round_no integer)
returns void language plpgsql security definer set search_path=''
as $fn$
declare
 v_match private.nr_matches%rowtype;
 v_response private.nr_responses%rowtype;
begin
 if auth.uid() is null or not private.is_room_member(p_room_id) then
   raise exception 'NOT_A_MEMBER';
 end if;
 select * into v_match from private.nr_matches where room_id=p_room_id;
 if not found then raise exception 'GAME_NOT_FOUND'; end if;
 select * into v_response from private.nr_responses r
 where r.match_id=v_match.id and r.round_no=p_round_no
   and r.user_id=auth.uid() and r.verdict='invalid';
 if not found then raise exception 'REPORT_NOT_ALLOWED'; end if;
 insert into private.nr_review_requests(match_id,round_no,user_id)
 values(v_match.id,p_round_no,auth.uid())
 on conflict do nothing;
 insert into private.nr_editorial_feedback(topic_id,answer_key,answer_sample,reporter_user_id)
 values(v_match.topic_id,v_response.answer_key,v_response.raw_answer,auth.uid())
 on conflict(topic_id,answer_key,reporter_user_id) do nothing;
end;
$fn$;
revoke all on function public.nr_report_rejected_answer(uuid,integer) from public,anon;

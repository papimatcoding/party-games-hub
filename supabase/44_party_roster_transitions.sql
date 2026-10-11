-- PARTY / 44: immutable roster, transition clock, and chronological Pong placement.
alter table private.party_sessions
  add column transition_at timestamptz,
  add column slot_started_at timestamptz,
  add column finished_at timestamptz;
create table private.party_participants(
  session_id uuid not null references private.party_sessions(id) on delete cascade,
  user_id uuid not null,
  display_name text not null,
  primary key(session_id,user_id)
);
revoke all on private.party_participants from public,anon,authenticated;
alter table private.pong_players add column eliminated_order integer;

-- A finished freeplay match has no ongoing leaderboard; party uses immutable
-- per-round elimination data and does not allow member-controlled scoring.

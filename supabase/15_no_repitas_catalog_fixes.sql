-- No Repitas / catalog corrections: avoid misleading alias collisions and
-- reject reserve-only players for the first-team Barça category.
delete from private.nr_aliases
 where (topic_id='barca' and alias_key in (private.nr_normalize('Luisito Suárez')))
    or (topic_id='paises' and alias_key in (private.nr_normalize('Inglaterra'),private.nr_normalize('Corea')));
delete from private.nr_entries
 where topic_id='barca' and entry_key=private.nr_normalize('André Onana');

insert into private.nr_entries(topic_id,label,entry_key)
values ('barca','Luis Suárez Miramontes',private.nr_normalize('Luis Suárez Miramontes'))
on conflict(topic_id,entry_key) do nothing;
insert into private.nr_aliases(topic_id,alias_key,entry_id)
select 'barca',private.nr_normalize('Luisito Suárez'),id from private.nr_entries
where topic_id='barca' and entry_key=private.nr_normalize('Luis Suárez Miramontes')
on conflict(topic_id,alias_key) do update set entry_id=excluded.entry_id;
insert into private.nr_aliases(topic_id,alias_key,entry_id)
select 'barca',entry_key,id from private.nr_entries
where topic_id='barca' and entry_key=private.nr_normalize('Luis Suárez Miramontes')
on conflict(topic_id,alias_key) do nothing;
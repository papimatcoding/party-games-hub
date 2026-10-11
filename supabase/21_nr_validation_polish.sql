-- Improve accent/symbol normalisation and conservative, unambiguous typo handling.
-- Fuzzy matching is server-side only and NEVER leaks whether an answer is valid during writing.
create extension if not exists fuzzystrmatch with schema extensions;

create or replace function private.nr_normalize(p_text text)
returns text language sql immutable set search_path=''
as $$
 select btrim(regexp_replace(
   translate(lower(replace(replace(btrim(coalesce(p_text,'')),'♀',' hembra '),'♂',' macho ')),
     'áàäâéèëêíìïîóòöôúùüûñç',
     'aaaaeeeeiiiioooouuuunc'),
   '[^[:alnum:]]+', ' ', 'g'))
$$;

-- Gender symbols used to normalise to the same bare "nidoran"; do not conflate species.
delete from private.nr_aliases where topic_id='pokemon_kanto' and alias_key='nidoran';
insert into private.nr_aliases(topic_id,alias_key,entry_id)
select 'pokemon_kanto',private.nr_normalize(v.alias),e.id
from (values ('Nidoran♀','Nidoran hembra'),('Nidoran♂','Nidoran macho')) v(alias,canonical)
join private.nr_entries e on e.topic_id='pokemon_kanto' and e.entry_key=private.nr_normalize(v.canonical)
on conflict(topic_id,alias_key) do update set entry_id=excluded.entry_id;

-- Strict synonyms: do not allow two animal names for the exact same species.
delete from private.nr_entries where topic_id='animales'
  and entry_key in ('carpincho','cuy','zorrillo','pez martillo');
insert into private.nr_aliases(topic_id,alias_key,entry_id)
select 'animales',private.nr_normalize(v.alias),e.id
from (values ('Carpincho','Capibara'),('Cuy','Cobaya'),('Zorrillo','Mofeta'),
             ('Pez martillo','Tiburón martillo')) v(alias,canonical)
join private.nr_entries e on e.topic_id='animales' and e.entry_key=private.nr_normalize(v.canonical)
on conflict(topic_id,alias_key) do update set entry_id=excluded.entry_id;

-- Avoid ambiguity: "Pau" is not uniquely Pau Cubarsí; car models aren't brands.
delete from private.nr_aliases
where (topic_id='barca' and alias_key='pau') or
      (topic_id='marcas_coches' and alias_key='range rover') or
      (topic_id='animales' and alias_key='ballena jorobada' and entry_id<>(select id from private.nr_entries where topic_id='animales' and entry_key='ballena jorobada'));

-- A single-character typo is accepted ONLY if it points to ONE unique catalog entry.
-- No auto-correction for strings shorter than 6 characters, or if two entries match.
create function private.nr_resolve_key(p_topic text,p_key text)
returns bigint language plpgsql stable set search_path=''
as $fn$
declare v_entry bigint; v_count integer;
begin
 if p_topic is null or p_key is null or p_key='' then return null; end if;
 select a.entry_id into v_entry from private.nr_aliases a
 where a.topic_id=p_topic and a.alias_key=p_key;
 if found then return v_entry; end if;
 if char_length(p_key)<6 or char_length(p_key)>65 then return null; end if;
 select count(distinct a.entry_id),min(a.entry_id) into v_count,v_entry
 from private.nr_aliases a
 where a.topic_id=p_topic and char_length(a.alias_key)>=6
   and abs(char_length(a.alias_key)-char_length(p_key))<=1
   and extensions.levenshtein_less_equal(a.alias_key,p_key,1)<=1;
 if v_count=1 then return v_entry; end if;
 return null;
end;
$fn$;
revoke all on function private.nr_resolve_key(text,text) from public,anon,authenticated;

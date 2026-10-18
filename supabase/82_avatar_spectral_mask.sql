-- 82 / Extra spooky art: original spectral scream mask.
-- Apply in Supabase SQL editor AFTER 81_halloween_shop_catalog.sql.
-- Idempotent: existing owners and bundle discounts remain intact.
insert into private.avatar_items
(code,slot,title,price,min_level,rarity,achievement,is_starter,theme,season,featured)
values ('head_spectral','head','Grito espectral',190,1,'epic',null,false,
  'halloween','halloween_2026',true)
on conflict (code) do nothing;

insert into private.avatar_bundle_items(bundle_code,item_code)
values ('bundle_halloween26','head_spectral')
on conflict (bundle_code,item_code) do nothing;

update private.avatar_bundles set description=
 'Colección completa: 12 cosméticos originales de Halloween. Se descuenta lo que ya tengas.'
where code='bundle_halloween26';

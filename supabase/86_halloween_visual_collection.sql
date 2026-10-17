-- 86: The Halloween collection is completed with a distinctly original
-- spectral expression, purple smoke and an animated sinister grin.
insert into private.avatar_items
 (code,slot,title,price,min_level,rarity,achievement,is_starter,theme,season,featured) values
 ('head_spectral','head','Rostro del abismo',175,1,'epic',null,false,'halloween','halloween_2026',true),
 ('back_smoke','back','Niebla espectral',145,1,'rare',null,false,'halloween','halloween_2026',true),
 ('emote_evil','emote','Risa siniestra',120,1,'rare',null,false,'halloween','halloween_2026',true)
on conflict(code) do nothing;
insert into private.avatar_bundle_items(bundle_code,item_code)
select 'bundle_halloween26',code from private.avatar_items
where code in ('head_spectral','back_smoke','emote_evil')
on conflict do nothing;
-- 14 premium pieces sum to 2020 Tickets individually, versus 1320 as a bundle.
update private.avatar_bundles set base_price=1320,
 description='Colección Halloween completa: 14 cosméticos originales, también por separado. Descuento de lo que ya tengas.'
where code='bundle_halloween26';

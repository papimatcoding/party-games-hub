-- NO REPITAS! / 14: reviewed initial answer bank. Expand with offline Wikidata imports after human review.
insert into private.nr_topics(id,title,hint,min_players,max_players) values
('planetas','Planetas del Sistema Solar','Solo los ocho planetas reconocidos',2,2),
('barca','Futbolistas que han jugado en el Barça','Primer equipo masculino, de cualquier época',2,7),
('animales','Animales','Nombres comunes; catálogo de prueba en expansión',2,12),
('paises','Países del mundo','Estados soberanos actuales; nombres en español',2,12),
('elementos','Elementos químicos','Nombres de la tabla periódica',2,12);
insert into private.nr_entries(topic_id,label,entry_key)
 select 'planetas',v,private.nr_normalize(v) from unnest(string_to_array('Mercurio|Venus|Tierra|Marte|Júpiter|Saturno|Urano|Neptuno','|')) v
 on conflict(topic_id,entry_key) do nothing;
insert into private.nr_entries(topic_id,label,entry_key)
 select 'barca',v,private.nr_normalize(v) from unnest(string_to_array('Lionel Messi|Andrés Iniesta|Xavi Hernández|Sergio Busquets|Gerard Piqué|Carles Puyol|Ronaldinho|Neymar|Luis Suárez|Samuel Eto''o|Rivaldo|Ronaldo Nazário|Romário|Johan Cruyff|Diego Maradona|Dani Alves|Jordi Alba|Pedro Rodríguez|David Villa|Thierry Henry|Zlatan Ibrahimović|Sergio Agüero|Robert Lewandowski|Lamine Yamal|Pedri|Gavi|Frenkie de Jong|Raphinha|Ferran Torres|Ansu Fati|Ousmane Dembélé|Antoine Griezmann|Sergi Roberto|Clément Lenglet|Marc-André ter Stegen|Víctor Valdés|Iñaki Peña|Pau Cubarsí|Alejandro Balde|Jules Koundé|Ronald Araújo|Eric García|Fermín López|Dani Olmo|João Félix|João Cancelo|Ilkay Gündogan|Memphis Depay|Philippe Coutinho|Miralem Pjanić|Ivan Rakitić|Arthur Melo|Arturo Vidal|Paulinho Bezerra|Frenkie de Jong|Cesc Fàbregas|Alexis Sánchez|Pierre-Emerick Aubameyang|Luuk de Jong|Martin Braithwaite|Adama Traoré|Paco Alcácer|Gerard Deulofeu|Munir El Haddadi|Marlon Santos|Samuel Umtiti|Javier Mascherano|Yerry Mina|André Gomes|Sandro Ramírez|Arda Turan|Denis Suárez|André Onana','|')) v
 on conflict(topic_id,entry_key) do nothing;
insert into private.nr_entries(topic_id,label,entry_key)
 select 'animales',v,private.nr_normalize(v) from unnest(string_to_array('Perro|Gato|Caballo|Vaca|Cerdo|Oveja|Cabra|Burro|Conejo|Ratón|Rata|Ardilla|Erizo|Topo|Murciélago|Zorro|Lobo|Oso|Oso polar|Oso panda|León|Tigre|Leopardo|Jaguar|Guepardo|Pantera|Puma|Lince|Hiena|Elefante|Jirafa|Cebra|Rinoceronte|Hipopótamo|Búfalo|Bisonte|Antílope|Gacela|Ciervo|Alce|Reno|Jabalí|Camello|Dromedario|Llama|Alpaca|Canguro|Koala|Perezoso|Armadillo|Pangolín|Mono|Gorila|Chimpancé|Orangután|Lémur|Suricata|Mangosta|Nutria|Castor|Mapache|Mofeta|Hurón|Comadreja|Tejón|Foca|Morsa|León marino|Delfín|Ballena|Orca|Cachalote|Tiburón|Tiburón blanco|Raya|Mantarraya|Pez payaso|Sardina|Atún|Salmón|Trucha|Carpa|Anguila|Pulpo|Calamar|Sepia|Medusa|Cangrejo|Langosta|Camarón|Gamba|Mejillón|Almeja|Ostra|Caracol|Babosa|Lombriz|Araña|Escorpión|Hormiga|Abeja|Avispa|Mariposa|Polilla|Mosca|Mosquito|Escarabajo|Mariquita|Saltamontes|Grillo|Mantis religiosa|Libélula|Cucaracha|Termita|Ciempiés|Milpiés|Tarántula|Águila|Halcón|Búho|Lechuza|Paloma|Gorrión|Cuervo|Loro|Guacamayo|Tucán|Flamenco|Pelícano|Gaviota|Pingüino|Avestruz|Emú|Pavo real|Gallina|Gallo|Pato|Ganso|Cisne|Cigüeña|Colibrí|Petirrojo|Canario|Jilguero|Serpiente|Cobra|Pitón|Boa|Cocodrilo|Caimán|Tortuga|Iguana|Lagarto|Camaleón|Gecko|Rana|Sapo|Salamandra|Tritón|Ajolote','|')) v
 on conflict(topic_id,entry_key) do nothing;
insert into private.nr_entries(topic_id,label,entry_key)
 select 'paises',v,private.nr_normalize(v) from unnest(string_to_array('España|Portugal|Francia|Alemania|Italia|Reino Unido|Irlanda|Islandia|Noruega|Suecia|Finlandia|Dinamarca|Países Bajos|Bélgica|Luxemburgo|Suiza|Austria|Polonia|Chequia|Eslovaquia|Hungría|Rumanía|Bulgaria|Grecia|Chipre|Malta|Croacia|Eslovenia|Bosnia y Herzegovina|Serbia|Montenegro|Albania|Macedonia del Norte|Kosovo|Estonia|Letonia|Lituania|Ucrania|Bielorrusia|Moldavia|Rusia|Turquía|Georgia|Armenia|Azerbaiyán|Andorra|Mónaco|San Marino|Liechtenstein|Ciudad del Vaticano|Estados Unidos|Canadá|México|Guatemala|Belice|Honduras|El Salvador|Nicaragua|Costa Rica|Panamá|Cuba|República Dominicana|Haití|Jamaica|Bahamas|Barbados|Trinidad y Tobago|Colombia|Venezuela|Guyana|Surinam|Ecuador|Perú|Bolivia|Brasil|Paraguay|Uruguay|Argentina|Chile|China|Japón|Corea del Sur|Corea del Norte|Mongolia|India|Pakistán|Bangladés|Nepal|Bután|Sri Lanka|Maldivas|Afganistán|Irán|Irak|Siria|Líbano|Israel|Jordania|Arabia Saudita|Emiratos Árabes Unidos|Catar|Baréin|Kuwait|Omán|Yemen|Kazajistán|Uzbekistán|Kirguistán|Tayikistán|Turkmenistán|Tailandia|Vietnam|Camboya|Laos|Myanmar|Malasia|Singapur|Indonesia|Filipinas|Brunéi|Timor Oriental|Egipto|Marruecos|Argelia|Túnez|Libia|Sudán|Sudán del Sur|Etiopía|Eritrea|Somalia|Yibuti|Kenia|Uganda|Ruanda|Burundi|Tanzania|República Democrática del Congo|República del Congo|Gabón|Camerún|Chad|Níger|Nigeria|Benín|Togo|Ghana|Costa de Marfil|Liberia|Sierra Leona|Guinea|Guinea-Bisáu|Senegal|Gambia|Malí|Burkina Faso|Mauritania|Cabo Verde|Guinea Ecuatorial|República Centroafricana|Angola|Zambia|Zimbabue|Botsuana|Namibia|Sudáfrica|Lesoto|Esuatini|Mozambique|Madagascar|Mauricio|Seychelles|Comoras|Australia|Nueva Zelanda|Papúa Nueva Guinea|Fiyi|Samoa|Tonga|Vanuatu|Islas Salomón|Palaos|Micronesia|Islas Marshall|Nauru|Kiribati|Tuvalu','|')) v
 on conflict(topic_id,entry_key) do nothing;
insert into private.nr_entries(topic_id,label,entry_key)
 select 'elementos',v,private.nr_normalize(v) from unnest(string_to_array('Hidrógeno|Helio|Litio|Berilio|Boro|Carbono|Nitrógeno|Oxígeno|Flúor|Neón|Sodio|Magnesio|Aluminio|Silicio|Fósforo|Azufre|Cloro|Argón|Potasio|Calcio|Escandio|Titanio|Vanadio|Cromo|Manganeso|Hierro|Cobalto|Níquel|Cobre|Zinc|Galio|Germanio|Arsénico|Selenio|Bromo|Criptón|Rubidio|Estroncio|Itrio|Circonio|Niobio|Molibdeno|Tecnecio|Rutenio|Rodio|Paladio|Plata|Cadmio|Indio|Estaño|Antimonio|Telurio|Yodo|Xenón|Cesio|Bario|Lantano|Cerio|Praseodimio|Neodimio|Prometio|Samario|Europio|Gadolinio|Terbio|Disprosio|Holmio|Erbio|Tulio|Iterbio|Lutecio|Hafnio|Tántalo|Wolframio|Renio|Osmio|Iridio|Platino|Oro|Mercurio|Talio|Plomo|Bismuto|Polonio|Astato|Radón|Francio|Radio|Actinio|Torio|Protactinio|Uranio|Neptunio|Plutonio|Americio|Curio|Berkelio|Californio|Einstenio|Fermio|Mendelevio|Nobelio|Lawrencio|Rutherfordio|Dubnio|Seaborgio|Bohrio|Hassio|Meitnerio|Darmstadtio|Roentgenio|Copernicio|Nihonio|Flerovio|Moscovio|Livermorio|Teneso|Oganesón','|')) v
 on conflict(topic_id,entry_key) do nothing;
insert into private.nr_aliases(topic_id,alias_key,entry_id)
select a.topic,private.nr_normalize(a.alias),e.id from (values
('planetas','La Tierra','Tierra'),
('barca','Messi','Lionel Messi'),
('barca','Leo Messi','Lionel Messi'),
('barca','Lionel Andrés Messi','Lionel Messi'),
('barca','Xavi','Xavi Hernández'),
('barca','Iniesta','Andrés Iniesta'),
('barca','Busquets','Sergio Busquets'),
('barca','Piqué','Gerard Piqué'),
('barca','Suárez','Luis Suárez'),
('barca','Luisito Suárez','Luis Suárez'),
('barca','Eto''o','Samuel Eto''o'),
('barca','Samuel Etoo','Samuel Eto''o'),
('barca','Ronaldo','Ronaldo Nazário'),
('barca','Lewandowski','Robert Lewandowski'),
('barca','Lamine','Lamine Yamal'),
('barca','Frenkie','Frenkie de Jong'),
('barca','Araujo','Ronald Araújo'),
('barca','Kounde','Jules Koundé'),
('barca','Ter Stegen','Marc-André ter Stegen'),
('barca','Gundogan','Ilkay Gündogan'),
('barca','Alexis','Alexis Sánchez'),
('barca','Cesc','Cesc Fàbregas'),
('barca','Pedrito','Pedro Rodríguez'),
('barca','Fermin','Fermín López'),
('paises','EEUU','Estados Unidos'),
('paises','USA','Estados Unidos'),
('paises','EE UU','Estados Unidos'),
('paises','UK','Reino Unido'),
('paises','Gran Bretaña','Reino Unido'),
('paises','Inglaterra','Reino Unido'),
('paises','Holanda','Países Bajos'),
('paises','Republica Checa','Chequia'),
('paises','Czechia','Chequia'),
('paises','Korea del Sur','Corea del Sur'),
('paises','Corea','Corea del Sur'),
('paises','Arabia Saudí','Arabia Saudita'),
('paises','EUA','Emiratos Árabes Unidos'),
('paises','República Checa','Chequia'),
('paises','Vaticano','Ciudad del Vaticano'),
('paises','Congo Kinshasa','República Democrática del Congo'),
('paises','Congo Brazzaville','República del Congo'),
('paises','Swazilandia','Esuatini'),
('paises','Birmania','Myanmar'),
('paises','Macedonia','Macedonia del Norte'),
('paises','East Timor','Timor Oriental'),
('elementos','Tungsteno','Wolframio'),
('elementos','Al','Aluminio'),
('elementos','Fe','Hierro'),
('elementos','Au','Oro'),
('elementos','Ag','Plata'),
('animales','Can','Perro'),
('animales','Delfín común','Delfín'),
('animales','Orca asesina','Orca')
) a(topic,alias,canonical)
join private.nr_entries e on e.topic_id=a.topic and e.entry_key=private.nr_normalize(a.canonical)
on conflict(topic_id,alias_key) do nothing;
insert into private.nr_aliases(topic_id,alias_key,entry_id)
select topic_id,entry_key,id from private.nr_entries
on conflict(topic_id,alias_key) do nothing;
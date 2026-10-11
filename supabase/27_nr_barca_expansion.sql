-- More Barça first-team players, including historical legends and 2026/27 squad.
-- Sources for editorial selection:
-- https://www.fcbarcelona.com/en/club/history/legendary-players
-- https://www.fcbarcelona.com/en/news/4570894/202627-first-team-jersey-numbers-confirmed
insert into private.nr_entries(topic_id,label,entry_key)
select 'barca',v,private.nr_normalize(v)
from unnest(string_to_array('Josep Guardiola|Hristo Stoichkov|Michael Laudrup|José Mari Bakero|Ronald Koeman|Andoni Zubizarreta|Txiki Begiristain|Miguel Bernardo Bianquetti|Bernd Schuster|Gary Lineker|Patrick Kluivert|Edgar Davids|Deco|Yaya Touré|Seydou Keita|Eric Abidal|Rafael Márquez|Sylvinho|Maxwell|Adriano Correia|Cristian Tello|Bojan Krkić|Ibrahim Afellay|Malcom|Kevin-Prince Boateng|Alex Song|Thomas Vermaelen|Sergiño Dest|Héctor Bellerín|Marc Bartra|Nélson Semedo|Aleix Vidal|Iván de la Peña|Giovani dos Santos|Jonathan dos Santos|Thiago Alcántara|Riqui Puig|Óscar Mingueza|Neto Murara|Jasper Cillessen|Claudio Bravo|Phillip Cocu|Albert Ferrer|Sergi Barjuán|Juliano Belletti|Ludovic Giuly|Frank de Boer|Giovanni van Bronckhorst|Oleguer Presas|Eusebio Sacristán|José Ramón Alexanko|Julio Salinas|Fernando Couto|Ricardo Quaresma|Javier Saviola|Juan Román Riquelme|Dmytro Chygrynskiy|Maxi López|Jeffrén Suárez|Isaac Cuenca|Sergi Samper|Vitor Roque|Pablo Torre|Oriol Romeu|Gerard Martín|Marc Casadó|Marc Bernal|Pau Víctor|Wojciech Szczęsny|Andreas Christensen|Joan García|Roony Bardghji|Dominik Livaković|Gabriel Jesus|Karim Adeyemi|Anthony Gordon|Brian Fariñas|Xavi Espart|Rodrigo|José Manuel Pinto|José Edmílson|Jérémy Mathieu|Adama Traoré|André Gomes|Santiago Ezquerro|Ilias Akhomach|Francisco Trincão','|')) v
on conflict(topic_id,entry_key) do nothing;

insert into private.nr_aliases(topic_id,alias_key,entry_id)
select 'barca',private.nr_normalize(v.alias),e.id
from (values
('Pep Guardiola','Josep Guardiola'),
('Guardiola','Josep Guardiola'),
('Stoichkov','Hristo Stoichkov'),
('Laudrup','Michael Laudrup'),
('Bakero','José Mari Bakero'),
('Koeman','Ronald Koeman'),
('Zubizarreta','Andoni Zubizarreta'),
('Zubi','Andoni Zubizarreta'),
('Txiki','Txiki Begiristain'),
('Begiristain','Txiki Begiristain'),
('Migueli','Miguel Bernardo Bianquetti'),
('Schuster','Bernd Schuster'),
('Lineker','Gary Lineker'),
('Kluivert','Patrick Kluivert'),
('Davids','Edgar Davids'),
('Yaya Toure','Yaya Touré'),
('Touré Yaya','Yaya Touré'),
('Keita','Seydou Keita'),
('Abidal','Eric Abidal'),
('Marquez','Rafael Márquez'),
('Rafa Márquez','Rafael Márquez'),
('Bojan','Bojan Krkić'),
('Bojan Krkic','Bojan Krkić'),
('Afellay','Ibrahim Afellay'),
('Sergino Dest','Sergiño Dest'),
('Semedo','Nélson Semedo'),
('Thiago','Thiago Alcántara'),
('Riqui','Riqui Puig'),
('Cillessen','Jasper Cillessen'),
('Sergi Barjuan','Sergi Barjuán'),
('Belletti','Juliano Belletti'),
('Giuly','Ludovic Giuly'),
('Oleguer','Oleguer Presas'),
('Saviola','Javier Saviola'),
('Riquelme','Juan Román Riquelme'),
('Pinto','José Manuel Pinto'),
('Edmilson','José Edmílson'),
('Chygrynskiy','Dmytro Chygrynskiy'),
('Vitor Roque','Vitor Roque'),
('Pablo Torre','Pablo Torre'),
('Marc Casado','Marc Casadó'),
('Marc Bernal','Marc Bernal'),
('Pau Victor','Pau Víctor'),
('Szczesny','Wojciech Szczęsny'),
('Szczęsny','Wojciech Szczęsny'),
('Christensen','Andreas Christensen'),
('Joan Garcia','Joan García'),
('Joan García Pons','Joan García'),
('Roony','Roony Bardghji'),
('Bardghji','Roony Bardghji'),
('Gabriel Jesús','Gabriel Jesus'),
('Gabi Jesus','Gabriel Jesus'),
('Adeyemi','Karim Adeyemi'),
('Gordon','Anthony Gordon'),
('Livakovic','Dominik Livaković'),
('Xavi Espart','Xavi Espart'),
('Fariñas','Brian Fariñas'),
('Trincao','Francisco Trincão'),
('Francisco Trincao','Francisco Trincão')
) v(alias,canonical)
join private.nr_entries e on e.topic_id='barca'
 and e.entry_key=private.nr_normalize(v.canonical)
on conflict(topic_id,alias_key) do nothing;

insert into private.nr_aliases(topic_id,alias_key,entry_id)
select topic_id,entry_key,id from private.nr_entries where topic_id='barca'
on conflict(topic_id,alias_key) do nothing;

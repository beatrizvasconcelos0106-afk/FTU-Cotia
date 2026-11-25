/*
# Import FTU data from Lista_Teens_Atualizada_22.11.2026.xlsx

1. New Tables
- None.

2. Data
- Inserts 35 adolescents from the "Lista FTU" sheet (name, sex, baptisms, phone,
  birth date, guardian + guardian phone, CT, status, notes).
- Inserts 21 adolescents that appear only on the "Saída FTU" sheet, as Afastado.
- Inserts 21 exit records (ftu_saidas) linked by normalized name, mapping
  "Formatura FJU" to Transferencia FJU and other reasons to Afastado.

3. Security
- No policy or grant changes; RLS and existing authenticated grants remain.

4. Important Notes
- Idempotent: exit inserts skip rows already present for the same teen and date.
- Bolt wraps migrations in a transaction, so no explicit BEGIN/COMMIT here.
*/

-- Adolescentes da aba Lista FTU
INSERT INTO public.ftu_adolescentes (nome, sexo, batismo_aguas, batismo_espirito_santo, telefone, data_nascimento, responsavel, telefone_responsavel, ct_responsavel, status, observacoes) VALUES
('Ester Gomes Martins','F',false,false,'+5511959262979','2011-04-07','Obr. Rosemeire','+5511953444781','Beatriz','Frequente','Formatura janeiro-27'),
('Naara Pires Bortolleto','F',false,false,'+5511943015698','2012-12-01','Ricardo / Thais','+5511985398644','Beatriz','Frequente','Formatura janeiro-27'),
('Paloma','F',false,false,'+5511983076557','2014-11-25','Ivanete Rosa','+5511957086656','Beatriz','Frequente',NULL),
('Ana Clara Chagas Rezende','F',false,false,NULL,'2015-09-16','Daise avó','+5511999639240','Beatriz','Nao frequente',NULL),
('Ester Maciel Silva','F',false,false,'+5511920054445','2011-11-23','Kelly','+5511982628316','Beatriz','Nao frequente',NULL),
('Artur Rodrigues Barbosa','M',false,false,NULL,'2014-03-27','Nair','+5511997255967','Felipe','Frequente',NULL),
('Davi Freitas Almeida','M',false,false,NULL,'2013-05-24','Fabiano','+5511951160292','Felipe','Frequente',NULL),
('Lorenzo Portela','M',false,false,NULL,'2012-03-08','Obr. Nazide','+5511994161206','Felipe','Nao frequente',NULL),
('Matheus Aguilar de Oliveira','M',false,false,'+5511920192137','2014-05-28','Meire','+5511993443618','Felipe','Nao frequente',NULL),
('Murilo Augusto Sobral da Silva','M',true,false,'+5511994949457','2012-09-28','Paula','+5511946815037','Felipe','Nao frequente',NULL),
('Alice Rodrigues Barbosa','F',false,false,'+5511978542804','2012-01-10','Nair','+5511997255967','Gabriela','Frequente','Validar Formatura janeiro-2027'),
('Gabrielly Neres de Araújo','F',false,false,'+5511976671230','2013-12-03','Shirley','+5511952570073','Gabriela','Frequente',NULL),
('Jullya Roberta Valença','F',false,false,'+5511933897463','2013-09-29','Cleidy','+5511944410330','Gabriela','Frequente',NULL),
('Larissa de Moraes Gonçalves','F',false,false,NULL,'2013-08-20','Juscilea','+5511965363341','Gabriela','Frequente',NULL),
('Laisa Coelho Araújo','F',false,false,'+5511910554497','2011-10-17','Kelle','+5511975469297','Gabriela','Nao frequente',NULL),
('José Miguel da Silva Bezerra','M',false,false,NULL,'2013-08-31','Obr. Mariana','+5511932152669','Gustavo','Frequente',NULL),
('Lucas Pereira Martins','M',true,true,'+5511942664427','2012-10-31','Carla','+5511999309620','Gustavo','Frequente',NULL),
('Nicolas Johnson Mendonça Pereira','M',false,false,'+5511969880647','2012-01-19','Josias / Obr Ninha','+5511967457650','Gustavo','Frequente',NULL),
('Daniel de Albuquerque Furlan','M',false,false,'+5511954512582','2012-06-14','Obr. Caroline','+5511951727080','Gustavo','Frequente',NULL),
('Enzo Jose Rodrigues Florindo de Oliveira','M',false,false,'+5511981826820','2014-04-08','Letícia','+5511961249269','Gustavo','Frequente',NULL),
('Miguel Santos de Barbosa','M',false,false,'+5511987121047','2012-07-05','Ildete','+5511961579797','Gustavo','Nao frequente',NULL),
('Arthur Barros Ribeiro','M',false,false,NULL,'2014-07-10','Rute','+5511971189214','Jaemerson','Frequente',NULL),
('Matheus Ribeiro Santos','M',false,false,'+5511917977569','2012-06-09','Luanda','+5511972792656','Jaemerson','Frequente',NULL),
('Davi de Souza Ramos','M',false,false,'+5511939249032','2014-11-22','Obr. Beth','+5511357614493','Jaemerson','Frequente',NULL),
('Otávio Gonçalves Amaral','M',false,false,'+5511918767139','2015-09-21','Obr. Socorro','+5511999380325','Jaemerson','Frequente',NULL),
('Arthur José S Fagundes','M',false,false,NULL,'2013-08-02','Obr. Rhayza','+5511986567897','Jaemerson','Frequente',NULL),
('Evellyn Ornelas Silva','F',false,false,'+5511932218397','2012-09-24','Gloria','+5511967634293','Mariana','Frequente',NULL),
('Thaís Gabriely Vieira Machado','F',false,false,'+5511947110266','2014-12-30','Obr. Rodrigo','+5511947110266','Mariana','Frequente',NULL),
('Maria Fernanda de Matos Silva','F',false,false,'+5511910058533','2014-03-09','Valdirene','+5511977521660','Mariana','Frequente',NULL),
('Raquel Mesquita Teixeira','F',false,false,'+5511914818847','2012-02-13','Natalia','+5511977015952','Mariana','Nao frequente',NULL),
('Larah Lanna Santana Berelli','F',false,false,'+5511910294297','2012-11-05','Taise','+5511970870348','Mariana','Nao frequente',NULL),
('Fernanda Rodrigues','F',false,false,'+5511913496286','2014-06-07','Maria','+5521968288830','Ruth','Frequente',NULL),
('Gabrielle da Silva Migliori','F',true,true,'+5511976018557','2012-05-11','Shirle','+5511994306097','Ruth','Frequente',NULL),
('Julia Morais Coelho','F',false,false,'+5511985283646','2013-01-26','Rosa','+5511982863979','Ruth','Frequente',NULL),
('Emanoelly Esther DiasCarvalho','F',false,false,'+5511994368518','2015-02-07','Thamires','+5511932348642','Ruth','Nao frequente',NULL);

-- Adolescentes que só constam na aba Saída FTU
INSERT INTO public.ftu_adolescentes (nome, status) VALUES
('Geovanna Ribeiro Parra', 'Afastado'),
('Camila Gazoli Nunes', 'Afastado'),
('Raphael Ribeiro Alves', 'Afastado'),
('Ana Luiza Ferreira Coelho de Souza', 'Afastado'),
('Alexander Pires Moreira', 'Afastado'),
('Juan Pablo Silva Marciano', 'Afastado'),
('Emanuel Victor Maciel Silva', 'Afastado'),
('Iago Gonçalves Rego', 'Afastado'),
('Isabelly Vitória Silva de Almeida', 'Afastado'),
('Pablo Silva Borges', 'Afastado'),
('Arthur Jonatas Frota Martinez Coelho', 'Afastado'),
('Yasmim Caires Stelmasçuk', 'Afastado'),
('Samuel Sales de Brito', 'Afastado'),
('Pedro', 'Afastado'),
('Luaria Maísa Machado do Nascimento', 'Afastado'),
('Giovana Santos de Souza', 'Afastado'),
('Helena Gomes Ferreira', 'Afastado'),
('Sophya Alves Neres', 'Afastado'),
('Jhonny dos Santos Menezes', 'Afastado'),
('Maria Eduarda Sousa Santos', 'Afastado'),
('João Pedro', 'Afastado');

-- Saídas da aba Saída FTU (vincula pelo nome normalizado)
INSERT INTO public.ftu_saidas (adolescente_id, tipo, data_saida, observacoes)
SELECT a.id, v.tipo, v.data_saida::date, v.observacoes
FROM (VALUES
('geovanna ribeiro parra','Afastado','2024-02-23','Mudou para SP'),
('camila gazoli nunes','Transferencia FJU','2024-03-03','Formatura FJU'),
('raphael ribeiro alves','Transferencia FJU','2024-03-03','Formatura FJU'),
('ana luiza ferreira coelho de souza','Transferencia FJU','2024-03-03','Formatura FJU'),
('alexander pires moreira','Transferencia FJU','2024-03-03','Formatura FJU'),
('juan pablo silva marciano','Afastado','2024-05-03','Afastado'),
('emanuel victor maciel silva','Afastado','2024-06-28','Afastado'),
('iago goncalves rego','Afastado','2024-08-02','Mudou para Osasco'),
('isabelly vitoria silva de almeida','Transferencia FJU','2024-08-18','Formatura FJU'),
('pablo silva borges','Afastado','2024-11-08','Mudou de Cotia'),
('arthur jonatas frota martinez coelho','Afastado','2025-01-28','Foi morar com familiar em outra cidade'),
('yasmim caires stelmascuk','Afastado','2025-02-18','Afastado'),
('samuel sales de brito','Afastado','2025-02-18','Afastado'),
('pedro','Afastado','2025-06-29','Mudou para Osasco'),
('luaria maisa machado do nascimento','Transferencia FJU','2025-08-24','Formatura FJU'),
('giovana santos de souza','Transferencia FJU','2025-08-24','Formatura FJU'),
('helena gomes ferreira','Transferencia FJU','2025-08-24','Formatura FJU'),
('sophya alves neres','Transferencia FJU','2025-08-24','Formatura FJU'),
('jhonny dos santos menezes','Transferencia FJU','2026-01-04','Formatura FJU'),
('maria eduarda sousa santos','Transferencia FJU','2026-01-04','Formatura FJU'),
('joao pedro','Afastado','2026-01-02','Afastado')
) AS v(nome_norm, tipo, data_saida, observacoes)
JOIN public.ftu_adolescentes a
  ON translate(lower(regexp_replace(a.nome, '\s+', ' ', 'g')),
    'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') = v.nome_norm
WHERE NOT EXISTS (
  SELECT 1 FROM public.ftu_saidas s2
  WHERE s2.adolescente_id = a.id AND s2.data_saida = v.data_saida::date
);

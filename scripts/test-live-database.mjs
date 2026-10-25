import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
// Run with PGLITE_MODULE pointing to a locally installed @electric-sql/pglite.
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
await db.exec(`
 create role anon;create role authenticated;create role slarklive_app;create role slarklive_preview_app;
 create schema auth;create schema slarklive_private;create schema slark_private;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;
 create table public.usuarios(id uuid primary key,perfil text,escola_id uuid,ativo boolean default true);
 create table public.salas(id uuid primary key,escola_id uuid,nome text,serie text,etapa text,criada_em timestamptz default now());
 create table public.alunos(id uuid primary key,usuario_id uuid,escola_id uuid,sala_id uuid,pontos integer default 0);
 create table public.times(id uuid primary key,sala_id uuid,nome text,pontos integer default 0);
 create table public.time_membros(time_id uuid,aluno_id uuid);
 create table public.trilhas(id uuid primary key,sala_id uuid,escola_id uuid,professor_id uuid);
 create table slarklive_private.state(id integer primary key,data jsonb);
 insert into slarklive_private.state values(1,'{"rooms":{}}');
 alter table slarklive_private.state enable row level security;
 create function slarklive_private.credit_match_winners() returns trigger language plpgsql as $$begin return new;end$$;
 create trigger credit_match_winners after update on slarklive_private.state for each row execute function slarklive_private.credit_match_winners();
`)
const migration=await readFile(new URL('../supabase/migrations/20261025030553_integrar_live_no_app.sql',import.meta.url),'utf8')
await db.exec(migration)
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const school=id(1),otherSchool=id(2),teacher=id(3),student=id(4),sala=id(5),foreignSala=id(6),trail=id(7)
await db.query('insert into usuarios(id,perfil,escola_id) values($1,$2,$3),($4,$5,$3)',[teacher,'professor',school,student,'aluno'])
await db.query('insert into salas(id,escola_id,nome,serie,etapa) values($1,$2,$3,$4,$5),($6,$7,$8,$4,$5)',[sala,school,'2º B','2º','medio',foreignSala,otherSchool,'Outra escola'])
await db.query('insert into trilhas values($1,$2,$3,$4)',[trail,sala,school,teacher])
const teams={}
for(let t=0;t<4;t++){
 const team=id(100+t)
 await db.query('insert into times(id,sala_id,nome,pontos) values($1,$2,$3,10)',[team,sala,'Quarteto '+t])
 const members=[]
 for(let m=0;m<4;m++){
  const member=id(1000+t*4+m)
  await db.query('insert into alunos(id,usuario_id,escola_id,sala_id,pontos) values($1,$2,$3,$4,100)',[member,t===0&&m===0?student:null,school,sala])
  await db.query('insert into time_membros values($1,$2)',[team,member]);members.push({id:member,name:'Fixture'})
 }
 teams[team]={id:team,name:'Quarteto '+t,members}
}
const room={version:2,rankingVersion:2,rankingId:id(20),pin:'123456',demo:false,owner:teacher,trailId:trail,status:'active',teams,answers:{0:{}},items:[{type:'quiz'}]}
async function write(room){await db.query('update slarklive_private.state set data=$1 where id=1',[JSON.stringify({rooms:{123456:room}})])}
await write(room)
room.status='closed';room.completed=true;room.standings=Object.keys(teams).map((teamId,i)=>({teamId,place:i+1,points:[20,7,5,0][i]}))
await write(room)
let scores=await db.query('select pontos from alunos order by id')
assert.deepEqual(scores.rows.map(row=>row.pontos),[...Array(4).fill(120),...Array(4).fill(107),...Array(4).fill(105),...Array(4).fill(100)])
assert.deepEqual((await db.query('select pontos from times order by id')).rows.map(row=>row.pontos),[30,17,15,10])
const before=JSON.stringify(scores.rows);room.unrelated='refresh';await write(room)
assert.equal(JSON.stringify((await db.query('select pontos from alunos order by id')).rows),before)
assert.equal((await db.query('select count(*)::int as n from slarklive_private.podium_rewards')).rows[0].n,12)
assert.equal((await db.query('select count(*)::int as n from slarklive_private.podium_team_rewards')).rows[0].n,3)
console.log('PASS: 20/7/5/0 to all 4 members; once to team; no duplicate on refresh.')
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[student])
const ranking=(await db.query('select public.slark_live_ranking(null) as data')).rows[0].data
assert.equal(ranking.salas.length,1);assert.equal(ranking.times.length,4)
assert.equal(ranking.salas[0].pontos,72)
await assert.rejects(()=>db.query('select public.slark_live_ranking($1)',[foreignSala]),/fora da sua escola/)
const publicRank=(await db.query("select slarklive_private.screen_rankings('123456') as data")).rows[0].data
assert.equal(publicRank.geral.length,4);assert.equal(JSON.stringify(publicRank).includes('Fixture'),false)
assert.equal((await db.query("select has_function_privilege('anon','public.slark_live_ranking(uuid)','execute') as allowed")).rows[0].allowed,false)
assert.equal((await db.query("select has_table_privilege('authenticated','slarklive_private.state','update') as allowed")).rows[0].allowed,false)
console.log('PASS: school aggregates, no cross-school ranking; public screen omits student data; anon cannot read private state or ranking RPC.')
const bad=structuredClone(room);bad.rankingId=id(21);bad.status='active';delete bad.standings;delete bad.completed;await write(bad)
bad.status='closed';bad.completed=true;bad.standings=[{teamId:Object.keys(teams)[0],place:1,points:999}]
await assert.rejects(()=>write(bad),/valor da premiação inválido/)
assert.equal(JSON.stringify((await db.query('select pontos from alunos order by id')).rows),before)
console.log('PASS: malformed award rolls back; no partial credit.')
await db.close()

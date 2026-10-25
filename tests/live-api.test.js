import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {once} from 'node:events'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import live from '../api/live.js'

test('App session: verified bearer, own quartet only, public screen, no gabarito leak, one answer and completed podium',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'slark-app-live-'))
 const originalCwd=process.cwd(),originalFetch=global.fetch,originalNow=Date.now
 const originalEnv={...process.env}
 process.chdir(directory);process.env.DATABASE_URL='';process.env.VERCEL='';process.env.SUPABASE_URL='https://fixture.invalid';process.env.SUPABASE_PUBLISHABLE_KEY='public-fixture'
 const users={teacher:{id:'teacher',perfil:'professor',ativo:true},student:{id:'student',perfil:'aluno',ativo:true},stranger:{id:'stranger',perfil:'aluno',ativo:true}}
 const roster=Array.from({length:4},(_,index)=>({time_id:'team1',alunos:{id:'aluno'+index,nome:'Fixture '+index,sala_id:'sala',usuario_id:index===0?'student':null}}))
 global.fetch=async(url,options={})=>{
  const href=String(url)
  if(!href.startsWith('https://fixture.invalid'))return originalFetch(url,options)
  const token=options.headers?.Authorization?.replace('Bearer ','')
  const user=users[token]
  if(href.includes('/auth/v1/user'))return Response.json(user?{id:user.id}:{error:'invalid'},{status:user?200:401})
  const pathname=new URL(href).pathname
  if(pathname.endsWith('/usuarios'))return Response.json(user?[user]:[])
  if(pathname.endsWith('/trilhas'))return Response.json([{id:'trail',titulo:'Runaway',sala_id:'sala'}])
  if(pathname.endsWith('/times'))return Response.json([{id:'team1',nome:'Bulls'}])
  if(pathname.endsWith('/time_membros'))return Response.json(roster)
  throw Error('Unexpected fixture request '+pathname)
 }
 const server=createServer(live);server.listen(0,'127.0.0.1');await once(server,'listening')
 const call=async(action,data,token,query={})=>{
  const response=await originalFetch(`http://127.0.0.1:${server.address().port}/api/live?`+new URLSearchParams({action,...query}),{method:data?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined})
  return {status:response.status,data:await response.json()}
 }
 try {
  assert.equal((await call('create',{})).status,401)
  assert.equal((await call('session',null,'forged-token')).status,401)
  assert.equal((await call('login',{email:'x',password:'x'})).status,404)
  const item={type:'quiz',title:'Setor?',options:['Primário','Secundário','Terciário','Outro'],correct:1,seconds:30,explanation:'Transformação.'}
  const created=await call('create',{name:'Partida integrada',trailId:'trail',items:[item]},'teacher')
  assert.equal(created.status,200);const pin=created.data.pin,code=created.data.teams[0].code
  assert.equal(created.data.rankingPointsPerWin,20)
  const publicScreen=await call('room',null,null,{pin})
  assert.equal(publicScreen.status,200)
  const publicText=JSON.stringify(publicScreen.data)
  for(const secret of ['Fixture','usuarioId',code,'Transformação.'])assert.equal(publicText.includes(secret),false)
  assert.equal((await call('join',{pin,teamCode:code},'stranger')).status,403)
  const joined=await call('join',{pin,teamCode:code},'student');assert.equal(joined.status,200)
  const token=joined.data.token
  assert.equal((await call('state',null,'stranger',{pin,token})).status,401)
  assert.equal((await call('control',{pin,command:'start'},'student')).status,403)
  await call('control',{pin,command:'start'},'teacher')
  await call('control',{pin,command:'open'},'teacher')
  const answered=await Promise.all([call('answer',{pin,token,option:1},'student'),call('answer',{pin,token,option:0},'student')])
  assert.deepEqual(answered.map(response=>response.status).sort(),[200,409])
  const state=await call('state',null,'student',{pin,token});assert.equal(state.data.answered,true);assert.equal(state.data.item.correct,undefined)
  await call('control',{pin,command:'reveal'},'teacher')
  assert.equal((await call('control',{pin,command:'next'},'teacher')).status,400)
  Date.now=()=>originalNow()+21000
  const finished=await call('control',{pin,command:'next'},'teacher')
  assert.equal(finished.status,200);assert.equal(finished.data.completed,true)
  assert.deepEqual(finished.data.standings.map(row=>[row.place,row.points]),[[1,20]])
  assert.equal((await call('answer',{pin,token,option:1},'student')).status,400)
 } finally {
  global.fetch=originalFetch;Date.now=originalNow;process.chdir(originalCwd)
  for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key]
  Object.assign(process.env,originalEnv)
  server.close();await once(server,'close');await rm(directory,{recursive:true,force:true})
 }
})

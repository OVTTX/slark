import { finalizeRoom } from './standings.js';
import {soloAction} from './solo.js';
import {fixedTeamCode} from './team-codes.js';
import {initTournament,controlTournament,tournamentView,extraQuestion,teamLabel} from './tournament.js';
import {randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import {screenRankings,transact} from './store.js';
import {fail,validateDeck,summary,teacherView,answer,results,traits} from './domain.js';
import {accountInfo,studentCatalog,loadTeams,saveObservation,withSlarkSession} from './slark.js';
function equal(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
async function body(req){if(req.body&&typeof req.body==='object')return req.body;let s='';for await(const c of req){s+=c;if(s.length>100000)fail('Envio muito grande.',413);}try{return JSON.parse(s||'{}')}catch{fail('Dados inválidos.');}}
async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 try{
 const u=new URL(req.url,'http://localhost');const action=u.searchParams.get('action')||'rooms';const b=req.method==='POST'?await body(req):{};
 if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==`https://${req.headers.host}`&&req.headers.origin!==`http://${req.headers.host}`)fail('Origem não permitida.',403);
 if(!['GET','POST'].includes(req.method))fail('Método não permitido.',405);
 if(['login','logout','styles'].includes(action))fail('Use a conta e a personalização do Slark App.',404);
 const accountId=req.slarkVerifiedId||null;
 if(['join','state','answer'].includes(action)&&!accountId)fail('Entre com sua conta Slark para participar.',401);
 const profile=accountId&&accountId!=='demo'?await accountInfo(accountId):null;
 const isStudent=profile?.perfil==='aluno';
 const owner=isStudent?null:accountId;
 if(action==='session')return res.end(JSON.stringify({authenticated:!!accountId,admin:!!owner,student:isStudent,role:profile?.perfil,name:profile?.nome,avatar:profile?.avatar_url,demo:owner==='demo',demoEnabled:process.env.ENABLE_DEMO==='1'}));
 if(action==='catalog'){if(!accountId)fail('Entre com sua conta Slark.',401);return res.end(JSON.stringify(accountId==='demo'?[{id:'demo-trail',titulo:'Runaway · Produção e consumo',sala_id:'demo'}]:await studentCatalog(accountId)));}
 if(action.startsWith('solo-')){
  if(!accountId)fail('Entre com sua conta Slark.',401);
  const trails=accountId==='demo'?[{id:'demo-trail',titulo:'Trilha demonstrativa'}]:await studentCatalog(accountId);
  const result=await transact(s=>soloAction(s,{action,method:req.method,body:b,query:u.searchParams,userId:accountId,admin:!!owner,trails}));
  return res.end(JSON.stringify(result));
 }
 let imported;
 if(action==='create'){
  if(!owner)fail('Entre como professor.',401);
  if(owner==='demo')imported={trail:{id:'demo-trail',titulo:'Trilha demonstrativa'},teams:Array.from({length:b.mode==='tournament'?8:2},(_,i)=>i).map(i=>({id:`demo-${i}`,name:`Quarteto ${i+1}`,members:[0,1,2,3].map(j=>({id:`demo-${i}-${j}`,name:`Estudante fictício ${i*4+j+1}`}))}))};
  else imported=await loadTeams(owner,String(b.trailId||''));
 }
 const result=await transact(async s=>{
 const own=r=>{if(!owner||r.owner!==owner)fail('Sala de outro professor ou acesso não autorizado.',403);};
 const rooms=Object.values(s.rooms).filter(r=>r.version===2&&r.rankingVersion===2);
 if(action==='rooms'){if(!owner)fail('Entre como professor.',401);return rooms.filter(r=>r.owner===owner).map(summary);}
 if(action==='create'&&req.method==='POST'){
  const items=validateDeck(b.items);let pin;do{pin=String(randomInt(100000,1000000));}while(s.rooms[pin]);
  const teams=Object.fromEntries(imported.teams.map(t=>[t.id,{...t,code:fixedTeamCode(s,t,owner==='demo'),token:null}]));
  const r={version:2,rankingVersion:2,rankingId:randomUUID(),owner,pin,name:String(b.name||'Slark Live Room').slice(0,100),chapter:String(b.chapter||'Fim do capítulo').slice(0,100),trailId:imported.trail.id,demo:owner==='demo',items,teams,status:'ready',index:-1,openedAt:null,endsAt:null,revealed:false,answers:{},observations:[]};if(b.mode==='tournament')initTournament(r);s.rooms[pin]=r;return teacherView(r);
 }
 const p=String(b.pin||u.searchParams.get('pin')||'');const r=s.rooms[p];if(!r||r.version!==2)fail('Sala não encontrada. Confira o PIN.',404);
 if(action==='teacher'){own(r);return teacherView(r);}
 if(action==='room')return summary(r);
 if(action==='control'&&req.method==='POST'){
  own(r);
  if(['next','advance-round','open'].includes(b.command)&&r.nextQuestionAt>Date.now())fail('Aguarde os 20 segundos após a revelação da resposta.');
  if(r.tournament){controlTournament(r,b.command);finalizeRoom(r);return teacherView(r);}
  if(b.command==='start'||b.command==='next'){
   if(b.command==='start'&&r.status!=='ready')fail('A sala já foi iniciada.');
   if(b.command==='next'&&r.status!=='active')fail('Inicie a sala primeiro.');
   if(r.index>=0&&r.items[r.index].type==='quiz'&&!r.revealed)fail('Revele a resposta antes de avançar.');
   r.index++;r.openedAt=null;r.endsAt=null;r.revealed=false;
   if(r.index>=r.items.length){r.status='closed';r.index=r.items.length;r.completed=true;}else r.status='active';
  }else if(b.command==='open'){
   if(r.status!=='active'||r.items[r.index]?.type!=='quiz'||r.revealed||r.openedAt)fail('Esta pergunta não pode ser aberta novamente.');r.openedAt=Date.now();r.endsAt=r.openedAt+r.items[r.index].seconds*1000;
  }else if(b.command==='reveal'){
   if(r.status!=='active'||r.items[r.index]?.type!=='quiz'||!r.openedAt)fail('Abra uma pergunta antes de revelar.');r.revealed=true;r.nextQuestionAt=Date.now()+20000;r.endsAt=Math.min(r.endsAt,Date.now());
  }else if(b.command==='close'){r.status='closed';r.endsAt=null;}
  else fail('Comando inválido.');finalizeRoom(r);return teacherView(r);
 }
 if(action==='extra'&&req.method==='POST'){own(r);if(!r.tournament)fail('Esta sala não é um torneio.');const item=validateDeck([b.item])[0];if(item.type!=='quiz')fail('O desempate precisa de uma pergunta.');extraQuestion(r,item);return teacherView(r);}
 if(action==='observe'&&req.method==='POST'){
  own(r);const student=String(b.student||''),text=String(b.text||'').trim(),trait=String(b.trait||'');
  if(!Object.values(r.teams).some(t=>t.members.some(m=>m.id===student)))fail('Aluno fora dos quartetos desta sala.');
  if(text.length<10||text.length>2000||!traits.includes(trait))fail('Escolha a característica e descreva uma evidência de 10 a 2.000 caracteres.');
  const note={id:randomUUID(),student,trait,text,at:new Date().toISOString(),synced:false};
  if(!r.demo){note.slarkId=await saveObservation({teacher:owner,student,trailId:r.trailId,text:`[Slark Live · ${r.chapter} · ${trait}] ${text}`});note.synced=true;}
  r.observations.push(note);return note;
 }
 if(action==='join'&&req.method==='POST'){
  if(r.status==='closed')fail('Esta sessão foi encerrada.');
  const t=Object.values(r.teams).find(t=>equal(t.code,String(b.teamCode||'')));if(!t)fail('Código do quarteto incorreto. Peça ao professor.',403);
  if(isStudent&&!t.members.some(m=>m.usuarioId===accountId))fail('Este quarteto não pertence à sua conta.',403);
  if(!isStudent&&r.owner!==accountId)fail('Sala de outro professor.',403);
  if(t.token&&t.token!==b.token)fail('O quarteto já tem um dispositivo conectado. Usem o dispositivo da equipe.',409);
  t.token??=randomUUID();t.accountId=accountId;return {token:t.token,name:r.tournament?teamLabel(r,t.id):t.name};
 }
 const t=Object.values(r.teams).find(t=>t.token&&equal(t.token,String(b.token||u.searchParams.get('token')||'')));if(!t||t.accountId!==accountId)fail('Conecte seu quarteto com os códigos da sala e da equipe.',401);
 if(action==='state')return {...summary(r),...(r.tournament?{tournament:tournamentView(r,t.id)}:{}),team:{name:r.tournament?teamLabel(r,t.id):t.name},answered:!!r.answers[r.index]?.[t.id],results:results(r,t)};
 if(action==='answer'&&req.method==='POST'){answer(r,t,b.option);return {ok:true};}
 fail('Ação não encontrada.',404);
 });if(action==='room')result.screenRankings=await screenRankings(result.pin);res.end(JSON.stringify(result));
 }catch(e){res.statusCode=e.status||503;res.end(JSON.stringify({error:e.status?e.message:'Serviço indisponível. Verifique a configuração do servidor.'}));if(!e.status)console.error(e.message);}
}

export default function(req,res){const access=req.headers.authorization?.replace(/^Bearer /i,'');return withSlarkSession(access,()=>handler(req,res));}

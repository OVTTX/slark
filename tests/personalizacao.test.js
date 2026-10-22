import test from 'node:test'
import assert from 'node:assert/strict'
import { CATALOGO,PADRAO,acessoCompleto,podeUsar,preferenciasValidas,progressoNivel } from '../src/lib/personalizacao.js'
test('admins and VTX accounts unlock the full catalog independently of points',()=>{
 for(const perfil of [{perfil:'admin_slark'},{perfil:'aluno',nome:'Conta VtX'},{perfil:'professor',email:'vtx@example.com'}]){
  assert.ok(acessoCompleto(perfil));for(const item of CATALOGO)assert.ok(podeUsar(item,0,acessoCompleto(perfil)))
 }
 assert.equal(acessoCompleto({perfil:'aluno',nome:'Ana'}),false)
})
test('Gold unlocks at 1500, never before',()=>{const gold=CATALOGO.find(i=>i.tipo==='skin'&&i.id==='ouro');assert.equal(podeUsar(gold,1499),false);assert.equal(podeUsar(gold,1500),true)})
test('unknown or locked stored selections fall back to accessible originals',()=>{
 assert.deepEqual(preferenciasValidas({skin:'ouro',texto:'inexistente',moldura:'ouro'},0,false),PADRAO)
 assert.deepEqual(preferenciasValidas({skin:'ouro',texto:'dourado',moldura:'ouro'},0,true),{skin:'ouro',texto:'dourado',moldura:'ouro'})
})
test('thresholds and style levels handle invalid and negative points',()=>{assert.equal(podeUsar(CATALOGO[1],99),false);assert.equal(podeUsar(CATALOGO[1],100),true);assert.equal(progressoNivel(-1).nivel,1);assert.equal(progressoNivel(1500).nivel,16);assert.equal(progressoNivel(NaN).progresso,0)})

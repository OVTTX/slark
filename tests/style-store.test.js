import {test} from 'node:test'
import assert from 'node:assert/strict'
import {carregarEstilos,salvarEstilos} from '../src/lib/style-store.js'
const preferences={skin:'noir',texto:'padrao',moldura:'padrao'}
test('demo styles use only the guarded RPC for the selected profile',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push({name,args});return {data:{preferencias:preferences,pontos:42}}},from:()=>{throw Error('demo must not use self-only RLS')}}
 assert.deepEqual(await carregarEstilos(client,{id:'demo',perfil:'aluno'},true),{preferencias:preferences,pontos:42})
 assert.deepEqual(await salvarEstilos(client,'demo',preferences,true),preferences)
 assert.deepEqual(calls,[{name:'slark_demo_estilos',args:{p_usuario:'demo'}},{name:'slark_demo_estilos',args:{p_usuario:'demo',p_skin:'noir',p_texto:'padrao',p_moldura:'padrao'}}])
})
test('normal accounts keep self-only writes and confirm the saved record',async()=>{
 const client = {
  from(table) {
   assert.equal(table,'personalizacoes_slark')
   return {
    upsert(value,options) {
     assert.deepEqual(value,{usuario_id:'self',...preferences})
     assert.deepEqual(options,{onConflict:'usuario_id'})
     return {select:()=>({single:async()=>({data:preferences})})}
    }
   }
  }
 }

 assert.deepEqual(await salvarEstilos(client,'self',preferences),preferences)
})
test('denied or unconfirmed writes never produce an applied style',async()=>{
 await assert.rejects(()=>salvarEstilos({rpc:async()=>({error:Error('denied')})},'demo',preferences,true),/denied/)
 await assert.rejects(()=>salvarEstilos({rpc:async()=>({data:{}})},'demo',preferences,true),/não confirmou/)
})
test('failed demo loading is surfaced instead of silently resetting styles',async()=>{
 await assert.rejects(()=>carregarEstilos({rpc:async()=>({error:Error('offline')})},{id:'demo'},true),/offline/)
})

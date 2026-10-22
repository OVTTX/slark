import test from 'node:test'
import assert from 'node:assert/strict'
import { carregarDemo } from '../src/lib/demo-profile.js'

function client(result) {
  const calls = []
  const db = { from: (table) => { calls.push(table); return db }, select: () => db,
    eq: (key, value) => { calls.push([key, value]); return db }, single: async () => result }
  return { db, calls }
}
const admin = { perfil: 'admin_slark' }
for (const perfil of ['aluno', 'professor', 'diretor']) {
  test(`admin opens only the exact ${perfil} demo profile without password login`, async () => {
    const row = { id: perfil, perfil, email: `${perfil}@slarkdemo.com.br`, escola_id: 'demo' }
    const { db, calls } = client({ data: row })
    assert.deepEqual(await carregarDemo(db, admin, perfil), row)
    assert.deepEqual(calls, ['usuarios', ['email', row.email], ['perfil', perfil]])
  })
}
test('non-admin cannot query demo profiles', async () => {
  const { db, calls } = client({})
  await assert.rejects(carregarDemo(db, { perfil: 'aluno' }, 'diretor'))
  assert.equal(calls.length, 0)
})
test('arbitrary users and admin targets cannot be selected', async () => {
  const { db, calls } = client({})
  await assert.rejects(carregarDemo(db, admin, 'admin_slark'))
  assert.equal(calls.length, 0)
})
test('failed and mismatched demo reads do not replace the administrator', async () => {
  for (const result of [{ error: Error('offline') }, { data: null }, { data: { perfil: 'aluno', email: 'aluno@outra.escola', escola_id: 'real' } }]) {
    await assert.rejects(carregarDemo(client(result).db, admin, 'aluno'))
  }
})

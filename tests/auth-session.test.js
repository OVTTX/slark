import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as tick } from 'node:timers/promises'
import { createAuthSession, authRouteState } from '../src/lib/auth-session.js'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function session(id = 'test-user') { return { user: { id }, access_token: 'test-only-token' } }
function setup({ role = 'aluno', profileLoader, subscriptionLoader, initial, signInError } = {}) {
  let listener
  let locked = false
  let signIns = 0, profileCalls = 0, subscriptionCalls = 0
  const snapshots = []
  const auth = {
    onAuthStateChange(callback) { listener = callback; return { data: { subscription: { unsubscribe() { listener = null } } } } },
    getSession: () => initial || Promise.resolve({ data: { session: null } }),
    emit(event, value) {
      locked = true
      try { listener?.(event, value) } finally { locked = false }
    },
    async signInWithPassword() {
      signIns += 1
      if (signInError) return { data: { session: null }, error: signInError }
      const value = session()
      auth.emit('SIGNED_IN', value)
      return { data: { session: value, user: value.user }, error: null }
    },
    async signOut() { auth.emit('SIGNED_OUT', null); return { error: null } },
  }
  const coordinator = createAuthSession({
    auth,
    async carregarPerfil(id) {
      profileCalls += 1
      assert.equal(locked, false, 'profile query must run outside the auth callback lock')
      return profileLoader ? profileLoader(id) : { id, perfil: role, escola_id: 'school-example' }
    },
    async carregarAssinatura() { subscriptionCalls += 1; return subscriptionLoader ? subscriptionLoader() : { status: 'ativa' } },
    onChange: value => snapshots.push(value),
  })
  return { auth, coordinator, snapshots, current: () => snapshots.at(-1), counts: () => ({ signIns, profileCalls, subscriptionCalls }) }
}

for (const role of ['aluno', 'professor', 'diretor', 'admin_slark']) {
  test(`${role}: first login waits for profile and subscription before opening the route`, async () => {
    const profile = deferred(), subscription = deferred()
    const app = setup({ profileLoader: () => profile.promise, subscriptionLoader: () => subscription.promise })
    await app.coordinator.start()
    const result = app.coordinator.entrar('example@example.com', 'test-only-password')
    await tick(5)
    assert.equal(authRouteState(app.current(), role), 'loading')
    assert.equal(app.counts().profileCalls, 1)
    profile.resolve({ id: 'test-user', perfil: role, escola_id: 'school-example' })
    await tick(0)
    assert.equal(authRouteState(app.current(), role), 'loading')
    subscription.resolve({ status: 'ativa' })
    assert.equal((await result).perfil.perfil, role)
    assert.equal(authRouteState(app.current(), role), 'ready')
    assert.deepEqual(app.counts(), { signIns: 1, profileCalls: 1, subscriptionCalls: 1 })
    assert.equal(app.snapshots.some(value => value.sessao && !value.perfil && !value.carregando && !value.erroAuth), false)
    app.coordinator.dispose()
  })
}

test('late empty bootstrap cannot erase a newly authenticated session', async () => {
  const initial = deferred()
  const app = setup({ initial: initial.promise })
  const boot = app.coordinator.start()
  await app.coordinator.entrar('example@example.com', 'test-only-password')
  initial.resolve({ data: { session: null } })
  await boot
  assert.equal(authRouteState(app.current(), 'aluno'), 'ready')
  app.coordinator.dispose()
})

test('existing session is restored without another password submission', async () => {
  const app = setup({ initial: Promise.resolve({ data: { session: session() } }) })
  await app.coordinator.start()
  assert.equal(authRouteState(app.current(), 'aluno'), 'ready')
  assert.equal(app.counts().signIns, 0)
  app.coordinator.dispose()
})

test('duplicate sign-in events and token refresh preserve the ready profile', async () => {
  const app = setup()
  await app.coordinator.start()
  await app.coordinator.entrar('example@example.com', 'test-only-password')
  const refreshed = { ...session(), access_token: 'new-test-only-token' }
  app.auth.emit('SIGNED_IN', refreshed)
  app.auth.emit('TOKEN_REFRESHED', refreshed)
  await tick(5)
  assert.equal(app.current().sessao.access_token, refreshed.access_token)
  assert.equal(authRouteState(app.current(), 'aluno'), 'ready')
  assert.equal(app.counts().profileCalls, 1)
  app.coordinator.dispose()
})

test('sign-out during a slow profile query cannot restore the old user', async () => {
  const profile = deferred()
  const app = setup({ profileLoader: () => profile.promise })
  await app.coordinator.start()
  const result = app.coordinator.entrar('example@example.com', 'test-only-password')
  await tick(5)
  await app.coordinator.sair()
  profile.resolve({ id: 'test-user', perfil: 'aluno' })
  await result
  assert.equal(app.current().sessao, null)
  assert.equal(app.current().perfil, null)
  assert.equal(authRouteState(app.current()), 'login')
  app.coordinator.dispose()
})

test('failed profile load offers a retry with the same session, not another login', async () => {
  let attempts = 0
  const app = setup({ profileLoader: async id => { if (++attempts === 1) throw Error('temporary read error'); return { id, perfil: 'aluno' } } })
  await app.coordinator.start()
  const result = await app.coordinator.entrar('example@example.com', 'test-only-password')
  assert.equal(result.error.code, 'PROFILE_LOAD_FAILED')
  assert.equal(authRouteState(app.current()), 'error')
  assert.ok(app.current().sessao)
  await app.coordinator.retry()
  assert.equal(authRouteState(app.current(), 'aluno'), 'ready')
  assert.equal(app.counts().signIns, 1)
  app.coordinator.dispose()
})

test('wrong password stays at login and never fetches a profile', async () => {
  const app = setup({ signInError: { code: 'invalid_credentials' } })
  await app.coordinator.start()
  assert.equal((await app.coordinator.entrar('example@example.com', 'wrong-test-password')).error.code, 'invalid_credentials')
  assert.equal(authRouteState(app.current()), 'login')
  assert.equal(app.counts().profileCalls, 0)
  app.coordinator.dispose()
})

test('a failed subscription read does not grant access or conceal billing status', async () => {
  const app = setup({ subscriptionLoader: async () => { throw Error('unavailable') } })
  await app.coordinator.start()
  await app.coordinator.entrar('example@example.com', 'test-only-password')
  assert.equal(authRouteState(app.current()), 'error')
  assert.equal(app.current().perfil, null)
  app.coordinator.dispose()
})

test('unknown roles are rejected and a valid user cannot enter another role route', async () => {
  const app = setup({ role: 'unexpected-role' })
  await app.coordinator.start()
  await app.coordinator.entrar('example@example.com', 'test-only-password')
  assert.equal(authRouteState(app.current()), 'error')
  app.coordinator.dispose()
  assert.equal(authRouteState({ sessao: session(), perfil: { perfil: 'aluno' }, carregando: false }, 'admin_slark'), 'login')
})

test('changing users ignores a stale result from the previous user', async () => {
  const first = deferred()
  const app = setup({ profileLoader: id => id === 'first' ? first.promise : { id, perfil: 'professor' } })
  await app.coordinator.start()
  app.auth.emit('SIGNED_IN', session('first'))
  await tick(5)
  app.auth.emit('SIGNED_IN', session('second'))
  await app.coordinator.recarregarPerfil()
  first.resolve({ id: 'first', perfil: 'admin_slark' })
  await tick(5)
  assert.equal(app.current().perfil.id, 'second')
  assert.equal(app.current().sessao.user.id, 'second')
  app.coordinator.dispose()
})

test('unmounted provider ignores pending requests (React StrictMode cleanup)', async () => {
  const initial = deferred()
  const app = setup({ initial: initial.promise })
  const boot = app.coordinator.start()
  app.coordinator.dispose()
  initial.resolve({ data: { session: session() } })
  await boot
  assert.equal(app.snapshots.length, 0)
})

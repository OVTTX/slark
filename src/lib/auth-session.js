import { HOME_POR_PERFIL } from './rotasPorPerfil.js'

export const INITIAL_AUTH_STATE = {
  sessao: null, perfil: null, assinatura: null, carregando: true, erroAuth: '',
}
const LOAD_ERROR = 'Sua sessão foi aberta, mas não conseguimos carregar seu acesso. Tente novamente sem redigitar a senha.'

// A single coordinator owns session hydration. React and the login page never
// independently fetch competing copies of the profile.
export function createAuthSession({ auth, carregarPerfil, carregarAssinatura, onChange }) {
  let state = { ...INITIAL_AUTH_STATE }
  let active = true
  let revision = 0
  let events = 0
  let pending = null
  let subscription

  function publish(next) {
    if (!active) return
    state = next
    onChange(state)
  }

  function synchronize(sessao, { force = false } = {}) {
    if (!active) return Promise.resolve(null)
    const userId = sessao?.user?.id
    if (!userId) {
      revision += 1
      pending = null
      publish({ ...INITIAL_AUTH_STATE, carregando: false })
      return Promise.resolve(null)
    }
    if (state.sessao?.user?.id === userId) {
      // Refreshing a token must not clear a loaded profile or start another query.
      publish({ ...state, sessao })
      if (pending?.userId === userId) return pending.promise
      if (state.perfil && !force) return Promise.resolve(state.perfil)
    }

    const request = ++revision
    publish({ sessao, perfil: null, assinatura: null, carregando: true, erroAuth: '' })
    // Supabase auth listeners run under an internal lock. Start database work
    // on the next task, after the listener has returned, including initial load.
    const promise = new Promise(resolve => setTimeout(resolve, 0)).then(async () => {
      if (!active || request !== revision) return null
      try {
        const perfil = await carregarPerfil(userId)
        if (!perfil || !Object.hasOwn(HOME_POR_PERFIL, perfil.perfil)) throw new Error('Perfil indisponível')
        if (!active || request !== revision) return null
        const assinatura = perfil.escola_id ? await carregarAssinatura(perfil.escola_id) : null
        if (!active || request !== revision) return null
        publish({ sessao: state.sessao, perfil, assinatura, carregando: false, erroAuth: '' })
        return perfil
      } catch {
        if (active && request === revision) {
          publish({ sessao: state.sessao, perfil: null, assinatura: null, carregando: false, erroAuth: LOAD_ERROR })
        }
        return null
      } finally {
        if (pending?.request === request) pending = null
      }
    })
    pending = { userId, request, promise }
    return promise
  }

  function start() {
    const { data } = auth.onAuthStateChange((event, sessao) => {
      events += 1
      void synchronize(sessao, { force: event === 'USER_UPDATED' })
    })
    subscription = data.subscription
    const initialEvents = events
    // A delayed bootstrap result must never overwrite a newer SIGNED_IN/OUT event.
    return auth.getSession().then(({ data, error }) => {
      if (!active || events !== initialEvents) return null
      if (error) throw error
      return synchronize(data.session)
    }).catch(() => {
      if (active && events === initialEvents) {
        publish({ ...INITIAL_AUTH_STATE, carregando: false, erroAuth: 'Não conseguimos restaurar sua sessão. Tente novamente.' })
      }
      return null
    })
  }

  async function entrar(email, senha) {
    const result = await auth.signInWithPassword({ email, password: senha })
    if (result.error) return result
    if (!result.data?.session) {
      return { ...result, error: { code: 'SESSION_NOT_READY', message: 'Não foi possível abrir sua sessão. Tente novamente.' } }
    }
    const perfil = await synchronize(result.data.session)
    if (!perfil) return { ...result, error: { code: 'PROFILE_LOAD_FAILED', message: LOAD_ERROR } }
    return { ...result, perfil }
  }

  async function sair() {
    const result = await auth.signOut()
    if (!result.error) await synchronize(null)
    return result
  }

  function retry() {
    if (state.sessao) return synchronize(state.sessao, { force: true })
    return startAfterError()
  }

  async function startAfterError() {
    const initialEvents = events
    publish({ ...state, carregando: true, erroAuth: '' })
    try {
      const { data, error } = await auth.getSession()
      if (!active || events !== initialEvents) return null
      if (error) throw error
      return synchronize(data.session)
    } catch {
      if (active && events === initialEvents) publish({ ...state, carregando: false, erroAuth: 'Não conseguimos restaurar sua sessão. Tente novamente.' })
      return null
    }
  }

  return {
    start, entrar, sair, retry,
    recarregarPerfil: () => synchronize(state.sessao, { force: true }),
    dispose() { active = false; revision += 1; subscription?.unsubscribe() },
  }
}

export function authRouteState({ sessao, perfil, carregando, erroAuth }, perfilNecessario) {
  if (carregando) return 'loading'
  if (erroAuth) return 'error'
  if (!sessao) return 'login'
  // A partial authenticated state is never interpreted as a failed login.
  if (!perfil) return 'loading'
  if (perfilNecessario && perfil.perfil !== perfilNecessario) return 'login'
  return 'ready'
}

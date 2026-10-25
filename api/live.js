import handler from '../server/live/handler.js'

// The App's Supabase access token is verified by Auth, never decoded as authority.
export default async function live(req, res) {
  const token = req.headers.authorization?.replace(/^Bearer /i, '')
  if (token) {
    try {
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
      const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
      const response = await fetch(url + '/auth/v1/user', {
        headers: { apikey:key, Authorization:'Bearer '+token }, signal:AbortSignal.timeout(10000),
      })
      const user = await response.json()
      if (!response.ok || !user.id) {
        res.statusCode=401; return res.end(JSON.stringify({error:'Sua sessão expirou. Entre novamente no Slark App.'}))
      }
      req.slarkVerifiedId = user.id
    } catch {
      res.statusCode=503; return res.end(JSON.stringify({error:'Não foi possível validar sua sessão. Tente novamente.'}))
    }
  }
  return handler(req,res)
}

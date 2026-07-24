import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const CHAVE = 'slark-tema'

function lerTemaSalvo() {
  if (typeof window === 'undefined') return 'escuro'
  const salvo = window.localStorage.getItem(CHAVE)
  if (salvo === 'claro' || salvo === 'escuro') return salvo
  // Sem preferência salva: respeita o esquema de cores do sistema, com padrão escuro
  const prefereClaro = window.matchMedia?.('(prefers-color-scheme: light)').matches
  return prefereClaro ? 'claro' : 'escuro'
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(lerTemaSalvo)

  useEffect(() => {
    document.documentElement.classList.toggle('light', tema === 'claro')
    window.localStorage.setItem(CHAVE, tema)
  }, [tema])

  const alternarTema = () => setTema((t) => (t === 'claro' ? 'escuro' : 'claro'))

  return (
    <ThemeContext.Provider value={{ tema, alternarTema }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

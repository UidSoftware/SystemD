import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const timerRef = useRef(null)

  const agendarRenovacao = useCallback((token) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    // Renova 5 minutos antes de expirar (access token = 60 min)
    timerRef.current = setTimeout(renovarToken, 55 * 60 * 1000)
  }, [])

  const renovarToken = useCallback(async () => {
    try {
      const res = await api.post('/auth/token/refresh/')
      const { access } = res.data
      setAccessToken(access)
      const payload = JSON.parse(atob(access.split('.')[1]))
      setUsuario({ email: payload.email, nome: payload.nome })
      agendarRenovacao(access)
      return access
    } catch {
      setAccessToken(null)
      setUsuario(null)
      return null
    }
  }, [agendarRenovacao])

  // Tentar recuperar sessão ao montar (via refresh token no cookie httpOnly)
  useEffect(() => {
    renovarToken().finally(() => setCarregando(false))
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // Injetar Bearer token em todas as requests
  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
      return config
    })
    return () => api.interceptors.request.eject(interceptor)
  }, [accessToken])

  const login = async (email, senha) => {
    const res = await api.post('/auth/token/', { email, password: senha })
    const { access } = res.data
    setAccessToken(access)
    const payload = JSON.parse(atob(access.split('.')[1]))
    setUsuario({ email: payload.email, nome: payload.nome })
    agendarRenovacao(access)
  }

  const logout = async () => {
    try { await api.post('/auth/logout/') } catch {}
    setAccessToken(null)
    setUsuario(null)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  return (
    <AuthContext.Provider value={{ usuario, accessToken, login, logout, isAutenticado: !!accessToken, carregando }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

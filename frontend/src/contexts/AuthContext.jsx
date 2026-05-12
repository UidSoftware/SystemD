import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const timerRef = useRef(null)

  const agendarRenovacao = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(renovarToken, 55 * 60 * 1000)
  }, [])

  const buscarPerfil = useCallback(async () => {
    try {
      const res = await api.get('/auth/me/')
      setUsuario(res.data)
    } catch {
      // token pode ter expirado — renovarToken já trata isso
    }
  }, [])

  const renovarToken = useCallback(async () => {
    try {
      const res = await api.post('/auth/token/refresh/')
      const { access } = res.data
      setAccessToken(access)
      agendarRenovacao()
      return access
    } catch {
      setAccessToken(null)
      setUsuario(null)
      return null
    }
  }, [agendarRenovacao])

  useEffect(() => {
    renovarToken().finally(() => setCarregando(false))
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // Sempre que o access token muda, atualiza o interceptor e busca o perfil completo
  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
      return config
    })
    if (accessToken) buscarPerfil()
    return () => api.interceptors.request.eject(interceptor)
  }, [accessToken])

  const login = async (email, senha) => {
    const res = await api.post('/auth/token/', { email, password: senha })
    const { access } = res.data
    setAccessToken(access)
    agendarRenovacao()
  }

  const logout = async () => {
    try { await api.post('/auth/logout/') } catch {}
    setAccessToken(null)
    setUsuario(null)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  return (
    <AuthContext.Provider value={{
      usuario,
      accessToken,
      login,
      logout,
      isAutenticado: !!accessToken,
      carregando,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

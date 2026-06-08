import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const timerRef = useRef(null)
  const tokenRef = useRef(null)
  tokenRef.current = accessToken  // atualizado síncrono no render, antes dos effects filhos

  const agendarRenovacao = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(renovarToken, 55 * 60 * 1000)
  }, [])

  const buscarPerfil = useCallback(async () => {
    try {
      const res = await api.get('/auth/me/')
      setUsuario(res.data)
    } catch {
      // token pode ter expirado
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

  // Interceptor permanente — lê tokenRef que é sempre atualizado no render
  useEffect(() => {
    const reqInterceptor = api.interceptors.request.use((config) => {
      if (tokenRef.current) config.headers.Authorization = `Bearer ${tokenRef.current}`
      return config
    })

    // Ao receber 401, renova o token e refaz a requisição original
    const resInterceptor = api.interceptors.response.use(
      res => res,
      async (error) => {
        const original = error.config
        if (error.response?.status === 401 && !original._retry) {
          original._retry = true
          const newToken = await renovarToken()
          if (newToken) {
            original.headers.Authorization = `Bearer ${newToken}`
            return api(original)
          }
        }
        return Promise.reject(error)
      }
    )

    return () => {
      api.interceptors.request.eject(reqInterceptor)
      api.interceptors.response.eject(resInterceptor)
    }
  }, [renovarToken])

  useEffect(() => {
    if (accessToken) buscarPerfil()
  }, [accessToken, buscarPerfil])

  const login = async (email, senha) => {
    const res = await api.post('/auth/token/', { email, password: senha })
    const { access } = res.data
    setAccessToken(access)
    agendarRenovacao()
    // Busca perfil imediatamente para retornar ao caller (redirect pós-login)
    const perfilRes = await api.get('/auth/me/', { headers: { Authorization: `Bearer ${access}` } })
    setUsuario(perfilRes.data)
    return perfilRes.data
  }

  const logout = async () => {
    try { await api.post('/auth/logout/') } catch {}
    setAccessToken(null)
    setUsuario(null)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const redirecionarPosLogin = (perfil, navigate) => {
    if (perfil.perfil === 'CLIENTE' && perfil.tem_entregas) {
      navigate('/sistema/entregas')
    } else if (perfil.perfil === 'CLIENTE') {
      navigate('/sistema/meus-projetos')
    } else {
      navigate('/sistema/')
    }
  }

  return (
    <AuthContext.Provider value={{
      usuario,
      accessToken,
      login,
      logout,
      redirecionarPosLogin,
      isAutenticado: !!accessToken,
      carregando,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

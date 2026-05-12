import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function PrivateRoute({ children, perfisPermitidos }) {
  const { isAutenticado, carregando, usuario } = useAuth()

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0014' }}>
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAutenticado) return <Navigate to="/login" replace />

  if (perfisPermitidos && usuario && !perfisPermitidos.includes(usuario.perfil)) {
    return <Navigate to="/sistema/" replace state={{ acessoNegado: true }} />
  }

  return children
}

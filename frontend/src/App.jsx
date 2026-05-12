import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/sistema/PrivateRoute'
import VitrinePage from './pages/VitrinePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/sistema/DashboardPage'
import ClientesPage from './pages/sistema/ClientesPage'
import EmailPage from './pages/sistema/EmailPage'
import UsuariosPage from './pages/sistema/UsuariosPage'
import SetoresPage from './pages/sistema/SetoresPage'
import OSPage from './pages/sistema/OSPage'
import OSDetailPage from './pages/sistema/OSDetailPage'
import MeusProjetosPage from './pages/sistema/portal/MeusProjetosPage'
import SuportePage from './pages/sistema/portal/SuportePage'
import MinhasFaturasPage from './pages/sistema/portal/MinhasFaturasPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<VitrinePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas internas — acesso geral autenticado */}
          <Route path="/sistema/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/sistema/email" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL', 'FINANCEIRO']}><EmailPage /></PrivateRoute>} />

          {/* Admin + Operacional */}
          <Route path="/sistema/clientes" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><ClientesPage /></PrivateRoute>} />
          <Route path="/sistema/os" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><OSPage /></PrivateRoute>} />
          <Route path="/sistema/os/:id" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><OSDetailPage /></PrivateRoute>} />

          {/* Só Admin */}
          <Route path="/sistema/usuarios" element={<PrivateRoute perfisPermitidos={['ADMIN']}><UsuariosPage /></PrivateRoute>} />
          <Route path="/sistema/configuracoes" element={<PrivateRoute perfisPermitidos={['ADMIN']}><SetoresPage /></PrivateRoute>} />
          <Route path="/sistema/configuracoes/setores" element={<PrivateRoute perfisPermitidos={['ADMIN']}><SetoresPage /></PrivateRoute>} />

          {/* Portal do Cliente */}
          <Route path="/sistema/meus-projetos" element={<PrivateRoute perfisPermitidos={['CLIENTE']}><MeusProjetosPage /></PrivateRoute>} />
          <Route path="/sistema/suporte" element={<PrivateRoute perfisPermitidos={['CLIENTE', 'ADMIN', 'OPERACIONAL']}><SuportePage /></PrivateRoute>} />
          <Route path="/sistema/minhas-faturas" element={<PrivateRoute perfisPermitidos={['CLIENTE']}><MinhasFaturasPage /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

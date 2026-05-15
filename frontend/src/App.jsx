import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/sistema/PrivateRoute'
import VitrinePage from './pages/VitrinePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/sistema/DashboardPage'
import ClientesPage from './pages/sistema/ClientesPage'
import LeadsPage from './pages/sistema/LeadsPage'
import ProspectosPage from './pages/sistema/ProspectosPage'
import EntregasPage from './pages/sistema/EntregasPage'
import EmailPage from './pages/sistema/EmailPage'
import UsuariosPage from './pages/sistema/UsuariosPage'
import SetoresPage from './pages/sistema/SetoresPage'
import OSPage from './pages/sistema/OSPage'
import OSDetailPage from './pages/sistema/OSDetailPage'
import MeusProjetosPage from './pages/sistema/portal/MeusProjetosPage'
import SuportePage from './pages/sistema/portal/SuportePage'
import MinhasFaturasPage from './pages/sistema/portal/MinhasFaturasPage'
// Financeiro
import ContasPage from './pages/sistema/financeiro/ContasPage'
import LivroCaixaPage from './pages/sistema/financeiro/LivroCaixaPage'
import ContasPagarPage from './pages/sistema/financeiro/ContasPagarPage'
import ContasReceberPage from './pages/sistema/financeiro/ContasReceberPage'
import FornecedoresPage from './pages/sistema/financeiro/FornecedoresPage'
import ServicosPage from './pages/sistema/financeiro/ServicosPage'
import PlanosPage from './pages/sistema/financeiro/PlanosPage'
import FolhaPagamentoPage from './pages/sistema/financeiro/FolhaPagamentoPage'
import TransferenciaPage from './pages/sistema/financeiro/TransferenciaPage'
import DREPage from './pages/sistema/financeiro/DREPage'
import FluxoCaixaPage from './pages/sistema/financeiro/FluxoCaixaPage'
import ExtratoPage from './pages/sistema/financeiro/ExtratoPage'

const FIN = ['ADMIN', 'FINANCEIRO']
const FIN_ALL = ['ADMIN', 'FINANCEIRO']

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<VitrinePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Dashboard */}
          <Route path="/sistema/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />

          {/* Email */}
          <Route path="/sistema/email" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL', 'FINANCEIRO']}><EmailPage /></PrivateRoute>} />

          {/* Admin + Operacional */}
          <Route path="/sistema/leads" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><LeadsPage /></PrivateRoute>} />
          <Route path="/sistema/prospectos" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><ProspectosPage /></PrivateRoute>} />
          <Route path="/sistema/clientes" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><ClientesPage /></PrivateRoute>} />
          <Route path="/sistema/os" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><OSPage /></PrivateRoute>} />
          <Route path="/sistema/os/:id" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><OSDetailPage /></PrivateRoute>} />

          {/* Entregas — ADMIN, OPERACIONAL e CLIENTE com tem_entregas */}
          <Route path="/sistema/entregas" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL', 'CLIENTE']}><EntregasPage /></PrivateRoute>} />

          {/* Admin only */}
          <Route path="/sistema/usuarios" element={<PrivateRoute perfisPermitidos={['ADMIN']}><UsuariosPage /></PrivateRoute>} />
          <Route path="/sistema/configuracoes" element={<PrivateRoute perfisPermitidos={['ADMIN']}><SetoresPage /></PrivateRoute>} />
          <Route path="/sistema/configuracoes/setores" element={<PrivateRoute perfisPermitidos={['ADMIN']}><SetoresPage /></PrivateRoute>} />

          {/* Financeiro */}
          <Route path="/sistema/financeiro/contas" element={<PrivateRoute perfisPermitidos={FIN}><ContasPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/livro-caixa" element={<PrivateRoute perfisPermitidos={FIN}><LivroCaixaPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/contas-pagar" element={<PrivateRoute perfisPermitidos={FIN}><ContasPagarPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/contas-receber" element={<PrivateRoute perfisPermitidos={FIN}><ContasReceberPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/fornecedores" element={<PrivateRoute perfisPermitidos={FIN}><FornecedoresPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/servicos" element={<PrivateRoute perfisPermitidos={FIN}><ServicosPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/planos" element={<PrivateRoute perfisPermitidos={FIN}><PlanosPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/folha" element={<PrivateRoute perfisPermitidos={['ADMIN']}><FolhaPagamentoPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/transferencia" element={<PrivateRoute perfisPermitidos={FIN}><TransferenciaPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/dre" element={<PrivateRoute perfisPermitidos={FIN}><DREPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/fluxo-caixa" element={<PrivateRoute perfisPermitidos={FIN}><FluxoCaixaPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/extrato" element={<PrivateRoute perfisPermitidos={FIN}><ExtratoPage /></PrivateRoute>} />

          {/* Portal do Cliente */}
          <Route path="/sistema/meus-projetos" element={<PrivateRoute perfisPermitidos={['CLIENTE']}><MeusProjetosPage /></PrivateRoute>} />
          <Route path="/sistema/suporte" element={<PrivateRoute perfisPermitidos={['CLIENTE', 'ADMIN', 'OPERACIONAL']}><SuportePage /></PrivateRoute>} />
          <Route path="/sistema/minhas-faturas" element={<PrivateRoute perfisPermitidos={['CLIENTE']}><MinhasFaturasPage /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

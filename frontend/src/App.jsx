import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/sistema/PrivateRoute'
import VitrinePage from './pages/VitrinePage'
import LoginPage from './pages/LoginPage'
import DefinirSenhaPage from './pages/DefinirSenhaPage'
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
import UnidadesPage from './pages/sistema/UnidadesPage'
import EscritorioPage from './pages/sistema/EscritorioPage'
import ContratosPage from './pages/sistema/ContratosPage'
import OrcamentosPage from './pages/sistema/OrcamentosPage'
import PedidosPage    from './pages/sistema/PedidosPage'
import ProdutosPage   from './pages/sistema/ProdutosPage'
import BoardPage from './pages/sistema/office/BoardPage'
import AgentsPage from './pages/sistema/office/AgentsPage'
import ArtefatosPage from './pages/sistema/office/ArtefatosPage'
import ActivityFeedPage from './pages/sistema/office/ActivityFeedPage'
import EntrevistasPage from './pages/sistema/EntrevistasPage'
import NotificacoesPage from './pages/sistema/NotificacoesPage'
import ArquiteturaTecnicaFormPage from './pages/sistema/office/ArquiteturaTecnicaFormPage'
import ManutencaoPage from './pages/sistema/office/ManutencaoPage'
import EntrevistaPage from './pages/sistema/office/EntrevistaPage'
import MeusProjetosPage from './pages/sistema/portal/MeusProjetosPage'
import SuportePage from './pages/sistema/portal/SuportePage'
import MinhasFaturasPage from './pages/sistema/portal/MinhasFaturasPage'
// Financeiro — consolidado 07/08/2026 numa pagina so com abas internas
// (era 15 componentes de pagina separados, cada rota renderizava um
// import diferente). As 15 rotas continuam existindo (permissao
// FIN/FIN_LEITURA e checada por rota, isso nao muda), so que agora
// todas montam FinanceiroPage — a aba ativa vem do path da URL.
import FinanceiroPage from './pages/sistema/financeiro/FinanceiroPage'
// Relatorios
import ReceitasRelatorioPage from './pages/sistema/relatorios/ReceitasRelatorioPage'
import DespesasRelatorioPage from './pages/sistema/relatorios/DespesasRelatorioPage'

const FIN = ['ADMIN', 'FINANCEIRO']
// So pras telas de RELATORIO (leitura) -- Contabilidade nunca entra no FIN
// normal, que tambem cobre telas de lancamento/edicao (Receitas, Despesas,
// Contas, Aportes, Conciliacao, Fornecedores).
const FIN_LEITURA = ['ADMIN', 'FINANCEIRO', 'CONTABILIDADE']

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<VitrinePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/definir-senha" element={<DefinirSenhaPage />} />

          {/* Dashboard */}
          <Route path="/sistema/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />

          {/* Email */}
          <Route path="/sistema/email" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL', 'FINANCEIRO']}><EmailPage /></PrivateRoute>} />

          {/* Admin + Operacional */}
          <Route path="/sistema/leads" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><LeadsPage /></PrivateRoute>} />
          <Route path="/sistema/prospectos" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><ProspectosPage /></PrivateRoute>} />
          <Route path="/sistema/entrevistas" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><EntrevistasPage /></PrivateRoute>} />
          <Route path="/sistema/notificacoes" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><NotificacoesPage /></PrivateRoute>} />
          <Route path="/sistema/clientes" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><ClientesPage /></PrivateRoute>} />
          <Route path="/sistema/os" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><OSPage /></PrivateRoute>} />
          <Route path="/sistema/os/:id" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><OSDetailPage /></PrivateRoute>} />
          <Route path="/sistema/entregas" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL', 'CLIENTE']}><EntregasPage /></PrivateRoute>} />
          <Route path="/sistema/unidades" element={<PrivateRoute perfisPermitidos={['ADMIN', 'OPERACIONAL']}><UnidadesPage /></PrivateRoute>} />

          {/* Admin only */}
          <Route path="/sistema/usuarios" element={<PrivateRoute perfisPermitidos={['ADMIN']}><UsuariosPage /></PrivateRoute>} />
          <Route path="/sistema/configuracoes" element={<PrivateRoute perfisPermitidos={['ADMIN']}><SetoresPage /></PrivateRoute>} />
          <Route path="/sistema/configuracoes/setores" element={<PrivateRoute perfisPermitidos={['ADMIN']}><SetoresPage /></PrivateRoute>} />

          {/* Financeiro */}
          <Route path="/sistema/financeiro/visao-geral" element={<PrivateRoute perfisPermitidos={FIN}><FinanceiroPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/receitas" element={<PrivateRoute perfisPermitidos={FIN}><FinanceiroPage /></PrivateRoute>} />
          {/* receitas-recebidas/despesas-pagas: removidas das abas (07/08/2026,
              redundantes com Visão Geral), rota mantida de propósito — sem
              catch-all/404 no app, um bookmark antigo pra cá cairia em tela
              branca se a rota fosse removida; FinanceiroPage cai pra Visão
              Geral sozinho quando o path não bate com nenhuma aba. */}
          <Route path="/sistema/financeiro/receitas-recebidas" element={<PrivateRoute perfisPermitidos={FIN}><FinanceiroPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/despesas" element={<PrivateRoute perfisPermitidos={FIN}><FinanceiroPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/despesas-pagas" element={<PrivateRoute perfisPermitidos={FIN}><FinanceiroPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/fornecedores" element={<PrivateRoute perfisPermitidos={FIN}><FinanceiroPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/aportes" element={<PrivateRoute perfisPermitidos={FIN_LEITURA}><FinanceiroPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/contas" element={<PrivateRoute perfisPermitidos={FIN}><FinanceiroPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/livro-caixa" element={<PrivateRoute perfisPermitidos={FIN_LEITURA}><FinanceiroPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/conciliacao" element={<PrivateRoute perfisPermitidos={FIN}><FinanceiroPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/fluxo-caixa" element={<PrivateRoute perfisPermitidos={FIN_LEITURA}><FinanceiroPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/dre" element={<PrivateRoute perfisPermitidos={FIN_LEITURA}><FinanceiroPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/ebitda" element={<PrivateRoute perfisPermitidos={FIN_LEITURA}><FinanceiroPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/por-cliente" element={<PrivateRoute perfisPermitidos={FIN_LEITURA}><FinanceiroPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/balanco" element={<PrivateRoute perfisPermitidos={FIN_LEITURA}><FinanceiroPage /></PrivateRoute>} />
          <Route path="/sistema/financeiro/indicadores" element={<PrivateRoute perfisPermitidos={FIN_LEITURA}><FinanceiroPage /></PrivateRoute>} />
          {/* Relatorios */}
          <Route path="/sistema/relatorios/receitas" element={<PrivateRoute perfisPermitidos={FIN_LEITURA}><ReceitasRelatorioPage /></PrivateRoute>} />
          <Route path="/sistema/relatorios/despesas" element={<PrivateRoute perfisPermitidos={FIN_LEITURA}><DespesasRelatorioPage /></PrivateRoute>} />

          {/* Office */}
          <Route path="/sistema/office/escritorio" element={<PrivateRoute perfisPermitidos={['ADMIN']}><EscritorioPage /></PrivateRoute>} />
          <Route path="/sistema/produtos" element={<PrivateRoute perfisPermitidos={['ADMIN','OPERACIONAL']}><ProdutosPage /></PrivateRoute>} />
          <Route path="/sistema/orcamentos" element={<PrivateRoute perfisPermitidos={['ADMIN']}><OrcamentosPage /></PrivateRoute>} />
          <Route path="/sistema/pedidos" element={<PrivateRoute perfisPermitidos={['ADMIN','OPERACIONAL']}><PedidosPage /></PrivateRoute>} />
          <Route path="/sistema/contratos" element={<PrivateRoute perfisPermitidos={['ADMIN']}><ContratosPage /></PrivateRoute>} />
          <Route path="/sistema/office/board" element={<PrivateRoute perfisPermitidos={['ADMIN']}><BoardPage /></PrivateRoute>} />
          <Route path="/sistema/office/agents" element={<PrivateRoute perfisPermitidos={['ADMIN']}><AgentsPage /></PrivateRoute>} />
          <Route path="/sistema/office/artefatos" element={<PrivateRoute perfisPermitidos={['ADMIN']}><ArtefatosPage /></PrivateRoute>} />
          <Route path="/sistema/office/activity" element={<PrivateRoute perfisPermitidos={['ADMIN']}><ActivityFeedPage /></PrivateRoute>} />
          <Route path="/sistema/office/novo-projeto/leads" element={<PrivateRoute perfisPermitidos={['ADMIN']}><LeadsPage /></PrivateRoute>} />
          <Route path="/sistema/office/novo-projeto/arquitetura-tecnica" element={<PrivateRoute perfisPermitidos={['ADMIN']}><ArquiteturaTecnicaFormPage /></PrivateRoute>} />
          <Route path="/sistema/office/manutencoes" element={<PrivateRoute perfisPermitidos={['ADMIN']}><ManutencaoPage /></PrivateRoute>} />
          <Route path="/sistema/office/novo-projeto/entrevista" element={<PrivateRoute perfisPermitidos={['ADMIN']}><EntrevistaPage /></PrivateRoute>} />

          {/* Portal do Cliente */}
          <Route path="/sistema/meus-projetos" element={<PrivateRoute perfisPermitidos={['CLIENTE']}><MeusProjetosPage /></PrivateRoute>} />
          <Route path="/sistema/suporte" element={<PrivateRoute perfisPermitidos={['CLIENTE', 'ADMIN', 'OPERACIONAL']}><SuportePage /></PrivateRoute>} />
          <Route path="/sistema/minhas-faturas" element={<PrivateRoute perfisPermitidos={['CLIENTE']}><MinhasFaturasPage /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

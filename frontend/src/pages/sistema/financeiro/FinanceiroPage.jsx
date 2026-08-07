import { useLocation, useNavigate } from 'react-router-dom'
import SistemaLayout from '../../../components/sistema/SistemaLayout'

import VisaoGeralPage from './VisaoGeralPage'
import FluxoCaixaPage from './FluxoCaixaPage'
import DREPage from './DREPage'
import EbitdaPage from './EbitdaPage'
import BalancoPage from './BalancoPage'
import IndicadoresPage from './IndicadoresPage'
import ReceitasPage from './ReceitasPage'
import DespesasPage from './DespesasPage'
import AportesPage from './AportesPage'
import ContasPage from './ContasPage'
import ConciliacaoPage from './ConciliacaoPage'
import LivroCaixaPage from './LivroCaixaPage'
import FornecedoresPage from './FornecedoresPage'
import PorClientePage from './PorClientePage'

// Página única de Financeiro, com abas internas — mesmo padrão do
// Financeiro.jsx do UidCore (1 item de menu, navegação por aba em vez
// de rota por tela). Consolidado 07/08/2026 a partir de 15 rotas
// separadas que existiam antes; cada rota continua existindo (permissão
// FIN/FIN_LEITURA é checada por rota em App.jsx, isso não muda), só que
// agora todas montam este mesmo componente — a aba ativa é derivada do
// path da URL, então links/bookmarks antigos continuam funcionando.
//
// Receitas Recebidas / Despesas Pagas removidas das abas no mesmo dia
// (07/08/2026) — redundantes com os cards colapsáveis de baixo da Visão
// Geral, que já mostram os mesmos lançamentos por mês. A capacidade de
// editar (e gerar recibo, no caso de receita) foi movida pra dentro
// desses cards em VisaoGeralPage.jsx em vez de duplicada aqui.
const ABAS = [
  { path: '/sistema/financeiro/visao-geral',        label: 'Visão Geral',        Componente: VisaoGeralPage },
  { path: '/sistema/financeiro/fluxo-caixa',         label: 'Fluxo de Caixa',      Componente: FluxoCaixaPage },
  { path: '/sistema/financeiro/dre',                 label: 'DRE',                 Componente: DREPage },
  { path: '/sistema/financeiro/ebitda',               label: 'EBITDA',              Componente: EbitdaPage },
  { path: '/sistema/financeiro/balanco',              label: 'Balanço',             Componente: BalancoPage },
  { path: '/sistema/financeiro/indicadores',          label: 'Indicadores CFO',     Componente: IndicadoresPage },
  { path: '/sistema/financeiro/receitas',             label: 'Contas a Receber',    Componente: ReceitasPage },
  { path: '/sistema/financeiro/despesas',             label: 'Contas a Pagar',      Componente: DespesasPage },
  { path: '/sistema/financeiro/aportes',              label: 'Aportes',             Componente: AportesPage },
  { path: '/sistema/financeiro/contas',               label: 'Contas Bancárias',    Componente: ContasPage },
  { path: '/sistema/financeiro/conciliacao',          label: 'Conciliação',         Componente: ConciliacaoPage },
  { path: '/sistema/financeiro/livro-caixa',          label: 'Livro Caixa',         Componente: LivroCaixaPage },
  { path: '/sistema/financeiro/fornecedores',         label: 'Fornecedores',        Componente: FornecedoresPage },
  { path: '/sistema/financeiro/por-cliente',          label: 'Por Cliente',         Componente: PorClientePage },
]

export default function FinanceiroPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const abaAtiva = ABAS.find(a => a.path === location.pathname) || ABAS[0]
  const Conteudo = abaAtiva.Componente

  return (
    <SistemaLayout>
      <div style={{ padding: '20px 24px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>Financeiro</h1>

        <div
          style={{
            display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4,
            borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0,
          }}
        >
          {ABAS.map((aba) => {
            const ativa = aba.path === abaAtiva.path
            return (
              <button
                key={aba.path}
                onClick={() => navigate(aba.path)}
                style={{
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: ativa ? 700 : 500,
                  color: ativa ? '#f1f5f9' : '#a78bca',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: ativa ? '2px solid #063BF8' : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease',
                }}
              >
                {aba.label}
              </button>
            )
          })}
        </div>
      </div>

      <Conteudo />
    </SistemaLayout>
  )
}

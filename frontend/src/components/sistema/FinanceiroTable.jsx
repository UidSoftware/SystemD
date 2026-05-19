// Tabela genérica reutilizável nas telas financeiras
export function FinanceiroTable({ colunas, dados, onRowClick }) {
  const labelStyle = { fontSize: 11, color: '#6b6b8a' }
  const valueStyle = { fontSize: 13, color: '#e2d9f3' }

  const colsDetalhe = colunas.filter(c => c.key !== '_acoes')
  const colAcoes = colunas.find(c => c.key === '_acoes')

  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {dados.map((row, i) => (
          <div key={row.id ?? i}
            onClick={() => onRowClick?.(row)}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
              padding: 16,
              cursor: onRowClick ? 'pointer' : 'default',
            }}>
            {colsDetalhe[0] && (
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 10 }}>
                {colsDetalhe[0].render ? colsDetalhe[0].render(row) : (row[colsDetalhe[0].key] ?? '—')}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: colAcoes ? 10 : 0 }}>
              {colsDetalhe.slice(1).map(c => (
                <div key={c.key}>
                  <div style={labelStyle}>{c.label}</div>
                  <div style={valueStyle}>
                    {c.render ? c.render(row) : (row[c.key] ?? '—')}
                  </div>
                </div>
              ))}
            </div>
            {colAcoes && (
              <div className="mobile-acoes-row" onClick={e => e.stopPropagation()}>
                {colAcoes.render(row)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl overflow-auto" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#1a0a2e' }}>
              {colunas.map(c => (
                <th key={c.key} className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ color: '#a78bca' }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer' : ''}
                style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                onMouseEnter={e => onRowClick && (e.currentTarget.style.backgroundColor = 'rgba(6,59,248,0.06)')}
                onMouseLeave={e => onRowClick && (e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)')}
              >
                {colunas.map(c => (
                  <td key={c.key} className="px-4 py-3 whitespace-nowrap" style={{ color: c.muted ? '#a78bca' : '#f1f5f9' }}>
                    {c.render ? c.render(row) : row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export const inputStyle = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#f1f5f9',
  borderRadius: '0.5rem',
  padding: '8px 12px',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
}

export function BadgeStatus({ status, config }) {
  const cfg = config[status] ?? { label: status, cor: '#a78bca' }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: cfg.cor + '22', color: cfg.cor }}>
      {cfg.label}
    </span>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function Vazio({ msg = 'Nenhum registro encontrado.' }) {
  return <div className="text-center py-20 text-sm" style={{ color: '#a78bca' }}>{msg}</div>
}

export function ModalBase({ titulo, onClose, children, maxW = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className={`w-full ${maxW} rounded-2xl p-6`}
        style={{ backgroundColor: '#1a0a2e', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 className="font-bold text-lg mb-5" style={{ color: '#f1f5f9' }}>{titulo}</h2>
        {children}
      </div>
    </div>
  )
}

export function BotoesModal({ onCancel, salvando, labelConfirmar = 'Salvar' }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-lg text-sm font-medium"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#a78bca' }}>
        Cancelar
      </button>
      <button type="submit" disabled={salvando} className="flex-1 py-2 rounded-lg text-sm font-semibold"
        style={{ backgroundColor: '#063BF8', color: '#fff', opacity: salvando ? 0.6 : 1 }}>
        {salvando ? 'Salvando...' : labelConfirmar}
      </button>
    </div>
  )
}

export const formatMoeda = (v) =>
  v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

export const formatData = (d) =>
  d ? new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'

import SistemaLayout from '../../../components/sistema/SistemaLayout'

export default function LeadsNovoProjetoPage() {
  return (
    <SistemaLayout titulo="Novo Projeto — Leads">
      <div style={{ padding: 40, color: '#a78bca', textAlign: 'center', marginTop: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📥</div>
        <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Leads</h2>
        <p style={{ fontSize: 14 }}>Selecione o lead para iniciar o projeto — em breve.</p>
      </div>
    </SistemaLayout>
  )
}

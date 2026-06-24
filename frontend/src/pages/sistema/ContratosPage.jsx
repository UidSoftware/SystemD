import SistemaLayout from '../../components/sistema/SistemaLayout'

export default function ContratosPage() {
  return (
    <SistemaLayout titulo="Contratos">
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <iframe
          src="https://contratid.uidsoftware.com.br/contratid/"
          style={{
            flex: 1,
            width: '100%',
            border: 'none',
            minHeight: 'calc(100vh - 56px)',
          }}
          title="ContratId"
          allow="fullscreen"
        />
      </div>
    </SistemaLayout>
  )
}

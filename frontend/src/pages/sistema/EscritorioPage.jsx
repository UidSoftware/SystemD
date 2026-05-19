import SistemaLayout from '../../components/sistema/SistemaLayout'

export default function EscritorioPage() {
  return (
    <SistemaLayout titulo="Escritório">
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <iframe
          src="https://office.uidsoftware.com.br"
          style={{
            flex: 1,
            width: '100%',
            border: 'none',
            minHeight: 'calc(100vh - 56px)',
          }}
          title="Uid Office"
          allow="fullscreen"
        />
      </div>
    </SistemaLayout>
  )
}

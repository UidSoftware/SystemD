import { useAuth } from '../../contexts/AuthContext'
import SistemaLayout from '../../components/sistema/SistemaLayout'

const CONTRATID_BASE = 'https://contratid.uidsoftware.com.br/contratid/'

export default function ContratosPage() {
  const { accessToken } = useAuth()

  const src = accessToken
    ? CONTRATID_BASE + '#sso=' + accessToken
    : CONTRATID_BASE

  return (
    <SistemaLayout titulo="Contratos">
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <iframe
          key={accessToken}
          src={src}
          style={{ flex: 1, width: '100%', border: 'none', minHeight: 'calc(100vh - 56px)' }}
          title="ContratId"
          allow="fullscreen"
        />
      </div>
    </SistemaLayout>
  )
}

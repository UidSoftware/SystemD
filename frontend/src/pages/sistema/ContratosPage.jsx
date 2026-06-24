import { useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import SistemaLayout from '../../components/sistema/SistemaLayout'

const CONTRATID_ORIGIN = 'https://contratid.uidsoftware.com.br'

export default function ContratosPage() {
  const { accessToken } = useAuth()
  const iframeRef = useRef(null)

  useEffect(() => {
    function handleMessage(event) {
      if (event.origin !== CONTRATID_ORIGIN) return
      if (event.data?.type !== 'CONTRATID_READY') return
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'SYSTEMD_TOKEN', token: accessToken },
        CONTRATID_ORIGIN
      )
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [accessToken])

  return (
    <SistemaLayout titulo="Contratos">
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <iframe
          ref={iframeRef}
          src="https://contratid.uidsoftware.com.br/contratid/"
          style={{ flex: 1, width: '100%', border: 'none', minHeight: 'calc(100vh - 56px)' }}
          title="ContratId"
          allow="fullscreen"
        />
      </div>
    </SistemaLayout>
  )
}

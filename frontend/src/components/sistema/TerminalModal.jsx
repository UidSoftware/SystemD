import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import api from '../../services/api'

export default function TerminalModal({ notificacaoId, manutencaoLabel, onClose }) {
  const containerRef = useRef(null)
  const wsRef = useRef(null)
  const termRef = useRef(null)
  const [status, setStatus] = useState('conectando')

  useEffect(() => {
    let cancelado = false
    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Consolas, monospace',
      theme: { background: '#0b0b16' },
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()
    termRef.current = term

    const enviarResize = (ws) => {
      try {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
      } catch { /* ws pode ja ter fechado */ }
    }

    const iniciar = async () => {
      try {
        const res = await api.post(`/notificacoes/${notificacaoId}/terminal_ticket/`)
        if (cancelado) return
        const { ticket, ws_url } = res.data

        const ws = new WebSocket(ws_url)
        ws.binaryType = 'arraybuffer'
        wsRef.current = ws

        ws.onopen = () => {
          ws.send(JSON.stringify({ ticket }))
          setStatus('conectado')
          enviarResize(ws)
        }

        ws.onmessage = (event) => {
          if (typeof event.data === 'string') {
            try {
              const msg = JSON.parse(event.data)
              if (msg.type === 'erro') {
                setStatus('erro')
                term.writeln(`\r\n\x1b[31m[erro] ${msg.mensagem}\x1b[0m`)
              } else if (msg.type === 'encerrado') {
                setStatus('encerrado')
                term.writeln('\r\n\x1b[33m[sessão encerrada]\x1b[0m')
              }
            } catch {
              term.write(event.data)
            }
            return
          }
          term.write(new Uint8Array(event.data))
        }

        ws.onclose = () => setStatus((s) => (s === 'erro' ? s : 'encerrado'))
        ws.onerror = () => setStatus('erro')

        term.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'input', data }))
          }
        })

        const onResize = () => {
          fitAddon.fit()
          enviarResize(ws)
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
      } catch (err) {
        setStatus('erro')
        term.writeln(`\r\n\x1b[31m[erro ao obter ticket] ${err?.response?.data?.erro || err.message}\x1b[0m`)
      }
    }

    const limparResize = iniciar()

    return () => {
      cancelado = true
      limparResize?.then?.((fn) => fn && fn())
      wsRef.current?.close()
      termRef.current?.dispose()
    }
  }, [notificacaoId])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        width: '90vw', maxWidth: 980, height: '75vh',
        background: '#0b0b16', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ fontSize: 13, color: '#a78bca' }}>
            🖥️ Terminal ao vivo — Planner (Manutenção #{manutencaoLabel})
            {' · '}
            <span style={{
              color: status === 'conectado' ? '#10b981' : status === 'erro' ? '#f87171' : '#fbbf24',
            }}>{status}</span>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.08)', color: '#e2d9f3', border: 'none',
            borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
          }}>✕ Fechar</button>
        </div>
        <div ref={containerRef} style={{ flex: 1, padding: 8, overflow: 'hidden' }} />
      </div>
    </div>
  )
}

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function SistemaLayout({ titulo, children }) {
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0a0014' }}>

      {/* Overlay mobile */}
      {menuAberto && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 lg:static lg:translate-x-0 transition-transform duration-200 ${menuAberto ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar onClose={() => setMenuAberto(false)} />
      </div>

      {/* Conteúdo */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header titulo={titulo} onMenuToggle={() => setMenuAberto(o => !o)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  )
}

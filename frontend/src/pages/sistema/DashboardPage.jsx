import Sidebar from '../../components/sistema/Sidebar'
import Header from '../../components/sistema/Header'

export default function DashboardPage() {
  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0d0020' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header titulo="Dashboard" />
        <main className="flex-1 flex items-center justify-center">
          <p style={{ color: '#a78bca' }}>Em construção — Fase 6</p>
        </main>
      </div>
    </div>
  )
}

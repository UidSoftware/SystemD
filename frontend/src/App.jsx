import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/sistema/PrivateRoute'
import VitrinePage from './pages/VitrinePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/sistema/DashboardPage'
import ClientesPage from './pages/sistema/ClientesPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<VitrinePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/sistema/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/sistema/clientes" element={<PrivateRoute><ClientesPage /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

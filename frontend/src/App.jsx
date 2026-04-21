import { BrowserRouter, Routes, Route } from 'react-router-dom'
import VitrinePage from './pages/VitrinePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VitrinePage />} />
      </Routes>
    </BrowserRouter>
  )
}

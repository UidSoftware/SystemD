import Hero from '../components/Hero'
import Sobre from '../components/Sobre'
import Portfolio from '../components/Portfolio'
import Contato from '../components/Contato'

export default function VitrinePage() {
  return (
    <main className="bg-uid-light text-uid-dark">
      <Hero />
      <Sobre />
      <Portfolio />
      <Contato />
    </main>
  )
}

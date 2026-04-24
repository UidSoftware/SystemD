import { HelmetProvider, Helmet } from 'react-helmet-async'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Pain from '../components/Pain'
import HowItWorks from '../components/HowItWorks'
import Portfolio from '../components/Portfolio'
import Testimonial from '../components/Testimonial'
import About from '../components/About'
import Contact from '../components/Contact'
import Footer from '../components/Footer'
import WhatsAppButton from '../components/WhatsAppButton'

export default function VitrinePage() {
  return (
    <HelmetProvider>
      <Helmet>
        <title>Uid Software — Sistemas de gestão para pequenas empresas | Uberlândia/MG</title>
        <meta name="description" content="Sistemas de gestão sob medida para estúdios, salões, clínicas e pequenos negócios. Uid Software — Uberlândia/MG." />
        <meta name="keywords" content="sistema de gestão, software sob medida, pequenas empresas, MEI, Uberlândia, pilates, salão de beleza" />
        <meta property="og:title" content="Uid Software — Sistemas para pequenas empresas" />
        <meta property="og:description" content="Chega de planilha e caos. Sistemas feitos pro seu negócio." />
      </Helmet>

      <Navbar />
      <main>
        <Hero />
        <Pain />
        <HowItWorks />
        <Portfolio />
        <Testimonial />
        <About />
        <Contact />
        <Footer />
      </main>
      <WhatsAppButton />
    </HelmetProvider>
  )
}

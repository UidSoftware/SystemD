export default function Testimonial() {
  /*
   * TODO: adicionar depoimento real do Studio Fluir
   *   - Solicitar ao cliente: foto/avatar, nome, cargo, texto do depoimento
   *   - Estrutura: foto | texto | nome + cargo + empresa
   */

  return (
    <section className="py-24 px-6" style={{ backgroundColor: '#1a0a2e' }}>
      <div className="max-w-3xl mx-auto text-center">
        <h2
          className="font-display font-bold text-3xl md:text-4xl mb-12"
          style={{ color: '#f1f5f9' }}
        >
          Quem já usa, aprova
        </h2>

        <div
          className="rounded-2xl p-8"
          style={{
            background: 'linear-gradient(135deg, #1a0a2e 0%, #1a1060 100%)',
            border: '1px solid rgba(6, 59, 248, 0.2)',
          }}
        >
          <div
            className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center text-2xl"
            style={{ backgroundColor: 'rgba(6, 59, 248, 0.2)' }}
          >
            👤
          </div>
          <p className="text-base italic mb-6" style={{ color: '#a78bca' }}>
            "Depoimento do cliente em breve..."
          </p>
          <p className="font-semibold" style={{ color: '#6b8fff' }}>
            — Studio Fluir
          </p>
        </div>
      </div>
    </section>
  )
}

const dores = [
  { emoji: '📋', texto: 'Controlo tudo em papel ou planilha e sempre perco algo' },
  { emoji: '📱', texto: 'Meu WhatsApp virou sistema de gestão e tá um caos' },
  { emoji: '💸', texto: 'Não sei quanto entrou, quanto saiu e o que eu devo receber' },
  { emoji: '⏰', texto: 'Perco tempo com tarefas que um sistema resolveria em segundos' },
]

export default function Pain() {
  return (
    <section className="py-24 px-6" style={{ backgroundColor: '#0a0014' }}>
      <div className="max-w-5xl mx-auto">
        <h2
          className="font-display font-bold text-3xl md:text-4xl text-center mb-12"
          style={{ color: '#f1f5f9' }}
        >
          Você se identifica com algum desses?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dores.map((d) => (
            <div
              key={d.texto}
              className="rounded-2xl p-6 flex gap-4 items-start transition-all duration-200 cursor-default"
              style={{
                backgroundColor: '#1a0a2e',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(6, 59, 248, 0.4)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <span className="text-3xl">{d.emoji}</span>
              <p className="text-base" style={{ color: '#a78bca' }}>{d.texto}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-lg mt-10 font-medium" style={{ color: '#6b8fff' }}>
          Se você marcou pelo menos um, a gente pode ajudar.
        </p>
      </div>
    </section>
  )
}

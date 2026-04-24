const projetos = [
  {
    badge: 'Em produção',
    badgeColor: '#FF0000',
    nome: 'Studio Fluir',
    descricao:
      'Sistema completo de gestão para estúdio de dança e pilates. Controle de alunos, turmas, mensalidades, frequência, créditos e reposições.',
    tags: ['Django', 'React', 'PostgreSQL', 'Docker'],
    link: 'https://nostudiofluir.com.br',
    cta: null,
  },
  {
    badge: 'Em desenvolvimento',
    badgeColor: '#063BF8',
    nome: 'Gestão de Carteira',
    descricao:
      'Gestão de clientes, contratos e cobranças recorrentes para prestadores de serviço.',
    tags: ['Django', 'React', 'Docker'],
    link: null,
    cta: null,
  },
  {
    badge: 'Próximo',
    badgeColor: '#3d0361',
    nome: 'Seu sistema aqui',
    descricao:
      'Cada nicho tem suas particularidades. A gente aprende o seu negócio antes de propor qualquer solução.',
    tags: [],
    link: null,
    cta: '#contato',
  },
]

export default function Portfolio() {
  return (
    <section id="portfolio" className="py-24 px-6" style={{ backgroundColor: '#0a0014' }}>
      <div className="max-w-5xl mx-auto">
        <h2
          className="font-display font-bold text-3xl md:text-4xl text-center mb-16"
          style={{ color: '#f1f5f9' }}
        >
          O que já construímos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {projetos.map((p) => (
            <div
              key={p.nome}
              className="rounded-2xl p-6 flex flex-col transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #1a0a2e 0%, #1a1060 100%)',
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
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full self-start mb-4"
                style={{ backgroundColor: p.badgeColor, color: '#fff' }}
              >
                {p.badge}
              </span>

              {/* TODO: adicionar screenshot real do sistema Studio Fluir */}

              <h3 className="font-display font-bold text-xl mb-3" style={{ color: '#f1f5f9' }}>
                {p.nome}
              </h3>
              <p className="text-sm flex-1" style={{ color: '#a78bca' }}>
                {p.descricao}
              </p>

              {p.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-3 py-1 rounded-full"
                      style={{ backgroundColor: 'rgba(6, 59, 248, 0.15)', color: '#6b8fff' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {p.link && (
                <a
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 text-sm font-medium transition-colors hover:underline"
                  style={{ color: '#6b8fff' }}
                >
                  nostudiofluir.com.br ↗
                </a>
              )}

              {p.cta && (
                <a
                  href={p.cta}
                  className="mt-4 text-sm font-semibold px-5 py-2 rounded-full text-center transition-colors"
                  style={{ backgroundColor: '#063BF8', color: '#fff' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0430cc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#063BF8')}
                >
                  Vamos conversar
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

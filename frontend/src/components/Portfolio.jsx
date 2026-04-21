const projetos = [
  {
    nome: 'Studio Fluir',
    descricao: 'Sistema de gestão para estúdios de dança e pilates. Controle de alunos, turmas, mensalidades e frequência.',
    tags: ['Django', 'React', 'PostgreSQL'],
    status: 'Produção',
  },
  {
    nome: 'Sistema de Clientes',
    descricao: 'Gestão de carteira de clientes, contratos e cobranças recorrentes para prestadores de serviço.',
    tags: ['Django', 'React', 'Docker'],
    status: 'Em desenvolvimento',
  },
  {
    nome: 'Seu sistema aqui',
    descricao: 'Desenvolvemos sistemas sob medida para o seu negócio. Entre em contato e vamos conversar.',
    tags: ['Personalizado'],
    status: 'Sob consulta',
  },
]

export default function Portfolio() {
  return (
    <section id="portfolio" className="py-20 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Portfólio</h2>
        <p className="text-center text-gray-600 mb-12">Sistemas que já desenvolvemos ou estamos desenvolvendo.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {projetos.map((p) => (
            <div key={p.nome} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full self-start mb-3">
                {p.status}
              </span>
              <h3 className="text-xl font-semibold mb-2">{p.nome}</h3>
              <p className="text-gray-600 text-sm flex-1">{p.descricao}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {p.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

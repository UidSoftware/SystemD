export default function Sobre() {
  const valores = [
    { titulo: 'Sob medida', descricao: 'Cada sistema é construído para o seu negócio, não para todos.' },
    { titulo: 'Simplicidade', descricao: 'Interface pensada para quem usa, não para quem programa.' },
    { titulo: 'Parceria', descricao: 'Acompanhamos o crescimento do seu negócio a longo prazo.' },
  ]

  return (
    <section id="sobre" className="py-20 px-6 max-w-5xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Quem somos</h2>
      <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12">
        A Uid Software é uma empresa de tecnologia de Uberlândia/MG focada em desenvolver sistemas
        internos para pequenas empresas que precisam organizar sua operação e crescer com eficiência.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {valores.map((v) => (
          <div key={v.titulo} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xl font-semibold text-blue-700 mb-2">{v.titulo}</h3>
            <p className="text-gray-600">{v.descricao}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

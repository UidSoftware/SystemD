export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-uid-dark text-white px-6 text-center">
      <h1 className="text-4xl md:text-6xl font-bold mb-4">
        Uid Software
      </h1>
      <p className="text-lg md:text-2xl text-blue-300 mb-2 font-medium">
        Soluções digitais sob medida para pequenas empresas
      </p>
      <p className="text-gray-400 max-w-xl mb-8">
        Sistemas que organizam sua operação, reduzem retrabalho e te dão tempo de volta para o que importa.
      </p>
      <a
        href="#contato"
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-full transition-colors"
      >
        Quero meu sistema
      </a>
    </section>
  )
}

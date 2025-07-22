// d:\Documentos\programação\hotel-portal\src\app\como-funciona\page.jsx
import Link from 'next/link';
// Lembrete: Se eu quiser usar ícones mais elaborados, posso importar do react-icons aqui.
// import { FaPencilAlt, FaBullseye, FaRocket, FaCheckCircle } from 'react-icons/fa';

export default function ComoFuncionaPage() {
  return (
    <div className="bg-white text-gray-800 mt-25">
      {/* 1. Cabeçalho Chamativo - Minha primeira seção, bem visual. */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-700 text-white py-16 md:py-24 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">
            Amplie sua Presença Online! Cadastre seu Negócio em Nossa Plataforma
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto">
            Seja encontrado por milhares de clientes em busca dos seus serviços.
            Hotéis, pousadas, campings, farmácias, oficinas, lanchonetes, passeios e muito mais — aqui, todos têm espaço para crescer.
          </p>
          <Link
            href="/meu-negocio" // Este link leva para a página de cadastro ou login, que depois redireciona.
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold py-3 px-8 rounded-lg shadow-lg text-lg transition duration-300 transform hover:scale-105"
          >
            Quero cadastrar meu negócio
          </Link>
        </div>
      </section>

      {/* 2. Seção: Como Funciona? - Explicação rápida do processo. */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
            Simples, Rápido e Eficiente
          </h2>
          <p className="text-center text-gray-600 mb-10 md:mb-12 max-w-2xl mx-auto">
            Cadastre seu negócio em poucos minutos. Nossa plataforma foi pensada para você divulgar seus serviços sem complicações. Veja como é fácil:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Card 1: Cadastro */}
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-md">
              <span className="text-5xl mb-4">📋</span>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Cadastro Rápido</h3>
              <p className="text-gray-600 text-sm">Preencha as informações do seu negócio (nome, serviços, localização, fotos).</p>
            </div>
            {/* Card 2: Plano */}
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-md">
              <span className="text-5xl mb-4">🎯</span>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Escolha do Plano</h3>
              <p className="text-gray-600 text-sm">Escolha o plano que melhor se encaixa no seu momento (detalhes em breve!).</p>
            </div>
            {/* Card 3: Publicação */}
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-md">
              <span className="text-5xl mb-4">🚀</span>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Publicação Imediata</h3>
              <p className="text-gray-600 text-sm">Publique e comece a receber clientes assim que seu cadastro for aprovado!</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Seção: Por que estar na nossa plataforma? - Listando os benefícios. */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">
                Benefícios Exclusivos para o Seu Negócio
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">&#10004;</span>
                  <span className="text-gray-700"><strong className="font-semibold">Mais Visibilidade:</strong> Seja encontrado por pessoas que realmente procuram seus serviços na região.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">&#10004;</span>
                  <span className="text-gray-700"><strong className="font-semibold">Marketing Inteligente:</strong> Tenha seu negócio promovido em campanhas locais e regionais.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">&#10004;</span>
                  <span className="text-gray-700"><strong className="font-semibold">Suporte Dedicado:</strong> Nossa equipe de atendimento está pronta para ajudar você a ter sucesso.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">&#10004;</span>
                  <span className="text-gray-700"><strong className="font-semibold">Gestão Simples:</strong> Atualize seu perfil, fotos e informações sempre que quiser de forma fácil.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">&#10004;</span>
                  <span className="text-gray-700"><strong className="font-semibold">Credibilidade:</strong> Faça parte de uma plataforma confiável que conecta negócios locais de qualidade.</span>
                </li>
              </ul>
            </div>
            {/* Imagem ilustrativa dos benefícios. */}
            <div className="mt-8 md:mt-0">
              <img
                src="https://zrrqlmmecqfbobiblzkb.supabase.co/storage/v1/object/public/imagens-site//COMO-FUNCIONA.jpeg" // Lembrete: Verificar se esta URL da imagem está correta e atualizada.
                alt="Benefícios da Plataforma"
                className="rounded-lg shadow-lg w-full h-auto object-cover"
              />
              {/* Uma alternativa simples para a imagem, caso precise: <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center text-gray-500">Imagem Ilustrativa</div> */}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Seção: Quem Pode se Cadastrar? - Mostrando a variedade de negócios. */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">
            De Micro a Grandes Negócios, Todos São Bem-vindos!
          </h2>
          <p className="text-gray-600 mb-10 max-w-3xl mx-auto">
            Nossa plataforma é inclusiva e abraça uma diversidade de segmentos. Se você oferece um serviço ou produto local, este é o seu lugar:
          </p>
          {/* Lista de tipos de negócios aceitos, em formato de tags. */}
          <div className="flex flex-wrap justify-center gap-4 text-gray-700 font-medium">
              <span className="bg-gray-50 px-4 py-2 ">Hotéis e Pousadas</span>
              <span className="bg-gray-50 px-4 py-2  ">Campings</span>
              <span className="bg-gray-50 px-4 py-2  ">Restaurantes</span>
              <span className="bg-gray-50 px-4 py-2 ">Lanchonetes</span>
              <span className="bg-gray-50 px-4 py-2 ">Cafeterias</span>
              <span className="bg-gray-50 px-4 py-2 ">Farmácias</span>
              <span className="bg-gray-50 px-4 py-2 ">Clínicas</span>
              <span className="bg-gray-50 px-4 py-2 ">Oficinas</span>
              <span className="bg-gray-50 px-4 py-2 ">Borracharias</span>
              <span className="bg-gray-50 px-4 py-2 ">Agências de Turismo</span>
              <span className="bg-gray-50 px-4 py-2 ">Guias Turísticos</span>
              <span className="bg-gray-50 px-4 py-2 ">Lojas em Geral</span>
              <span className="bg-gray-50 px-4 py-2 ">Passeios</span>
              <span className="bg-gray-50 px-4 py-2 ">Eventos</span>
              <span className="bg-gray-50 px-4 py-2 ">Serviços de Beleza</span>

          </div>
          {/* Poderia usar um grid de imagens aqui também para representar os negócios. */}
          <span className="block mt-6 text-gray-900">E muito mais!</span>
        </div>
      </section>

      {/* 5. Seção Final: Chamada para Ação - Último CTA para cadastro. */}
      <section className="bg-green-700 text-white py-16 md:py-20 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prepare-se para um Novo Nível de Crescimento!
          </h2>
          <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto">
            Não perca a chance de fazer parte de uma comunidade vibrante e em constante crescimento. Cadastre seu negócio hoje e conecte-se com novos clientes todos os dias!
          </p>
          <Link
            href="/meu-negocio" // Link para a página de cadastro/login, que depois redireciona.
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold py-3 px-8 rounded-lg shadow-lg text-lg transition duration-300 transform hover:scale-105"
          >
            Cadastrar meu negócio agora!
          </Link>
        </div>
      </section>
    </div>
  );
}
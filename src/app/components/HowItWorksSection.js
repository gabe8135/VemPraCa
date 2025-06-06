// src/app/components/HowItWorksSection.js
'use client';

import Link from 'next/link'; // Preciso do Link para o botão "Saiba mais".

// Meus passos de "Como Funciona".
const steps = [
  {
    icon: '🔍', // Lembrete: Posso trocar por um ícone do react-icons, tipo <FaSearch />.
    title: 'Busque seu Destino',
    description: 'Use a busca ou explore as categorias para encontrar o lugar perfeito.',
    target: 'viajante',
  },
  {
    icon: '🏨', // Lembrete: <FaHotel />
    title: 'Escolha a Hospedagem',
    description: 'Veja fotos, detalhes, facilidades e avaliações dos nossos parceiros locais.',
    target: 'viajante',
  },
  {
    icon: '💬', // Lembrete: <FaWhatsapp /> ou <FaPhone />
    title: 'Conecte-se Direto',
    description: 'Entre em contato diretamente com o estabelecimento para tirar dúvidas ou reservar.',
    target: 'viajante',
  },
  {
    icon: '✍️', // Lembrete: <FaEdit />
    title: 'Cadastre seu Negócio',
    description: 'É proprietário? Faça login e adicione seu estabelecimento em poucos passos.',
    target: 'proprietario',
    link: '/como-funciona', // Este link leva para a página que explica como cadastrar o negócio.
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-12 md:py-16 "> {/* Um fundo diferente aqui para dar um destaque na home. */}
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8 md:mb-12">
          Como Funciona
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
              <span className="text-5xl mb-4">{step.icon}</span>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{step.title}</h3>
              <p className="text-gray-600 text-sm mb-4 flex-grow">{step.description}</p>
              {/* Só mostro o botão "Saiba mais" se o passo tiver um link definido. */}
              {step.link && (
                <Link href={step.link} className="mt-auto bg-gradient-to-r from-yellow-300 to-amber-400 px-4 py-1 rounded text-sm text-green-800 hover:bg-yellow-500 font-medium">
                  Saiba mais
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// src/app/components/FAQSection.js
'use client'; 
import Link from 'next/link';

// Meu array com as perguntas e respostas para o FAQ.
const faqData = [
  {
    question: 'Como encontro o que preciso no VemPraCá↗?',
    answer: 'É simples! Você pode navegar pela lista na página inicial, usar a barra de busca para procurar por nome ou cidade, ou clicar nas categorias para filtrar por tipo de estabelecimento ou negocio que procura.',
  },
  {
    question: 'Preciso pagar alguma taxa para usar a plataforma como alguem em busca de um serviço?',
    answer: 'Não! O uso da plataforma para buscar e encontrar negocios é totalmente gratuito para os contratantes.',
  },
  {
    question: 'Como entro em contato com o negocio que preciso?',
    answer: 'Ao clicar em um estabelecimento, você verá a página de detalhes com as informações de contato fornecidas pelo proprietário, como telefone, WhatsApp (se disponível) e, às vezes, um link para o site próprio ou redes sociais.',
  },
  {
    question: 'Tenho meu empreendimento, como cadastro meu negocio?',
    answer: 'Primeiro, crie uma conta e faça login na plataforma. Depois, acesse a seção "Meus Negócios" no menu. Se você ainda não tiver um estabelecimento cadastrado, verá um formulário para preencher com todas as informações e fotos.',
  },
  {
    question: 'Qual o custo para cadastrar meu estabelecimento?',
    answer: 'Oferecemos diferentes planos de assinatura para manter seu estabelecimento ativo e visível em nossa plataforma. Atualmente temos planos mensais e anuais ambos com trinta dias gratuitos!. Entre em contato ou visite nossa seção de planos para proprietários para mais detalhes.',
  },
  {
    question: 'Como posso editar as informações do meu negocio?',
    answer: 'Após fazer login, vá até "Meus Negócios". Se seu estabelecimento já estiver cadastrado, você será direcionado para a página de detalhes dele, onde encontrará opções para editar as informações, fotos e facilidades.',
  }
];

export default function FAQSection() {
  return (
    <section id="faq" className="bg-gradient-to-r from-green-600 to-emerald-700 text-white py-12 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-white mb-8 md:mb-12">
          Perguntas Frequentes
        </h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {faqData.map((item, index) => (
            <details key={index} className="group bg-white p-4 rounded-3xl shadow-sm hover:shadow-md transition duration-300">
              <summary className="flex justify-between items-center font-semibold text-gray-700 cursor-pointer list-none">
                <span>{item.question}</span>
                {/* Este ícone de seta gira quando o <details> está aberto. Melhora a UX. */}
                <span className="transition-transform duration-300 group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                </span>
              </summary>
              <p className="text-gray-600 mt-3 text-sm leading-relaxed">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
        <div className="text-center mt-8">
          <h3 className="text-2xl font-bold text-center text-white my-8 md:mb-12">
            Ficou com alguma duvida? não deixe de perguntar! 
          </h3>
          <Link href="/contato/" className="font-bold bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full hover:bg-gradient-to-r from-amber-300 to-yellow-400 text-green-600 p-2">Contato</Link>
        </div>
      </div>
    </section>
  );
}

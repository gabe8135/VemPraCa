// src/app/sobre/page.js
import {
    FaHome,      // Ícone para "Sobre"
    FaGlobeAmericas, // Ícone para "Por que"
    FaStar,      // Ícone para "Compromisso"
    FaHeart,     // Ícone para "Feito com carinho"
    FaTools,     // Ícone para "Como funciona"
    FaChartLine, // Ícone para "Impacto real"
    FaHandshake, // Ícone para "Parcerias"
    FaRocket     // Ícone para "Nosso futuro"
  } from 'react-icons/fa'; // Importando os ícones
  
  // Array para facilitar a criação das seções
  const sections = [
    {
      icon: FaHome,
      title: "Sobre nossa plataforma",
      text: "Bem-vindo(a)! Nossa plataforma nasceu com um propósito especial: valorizar o que é da nossa terra. Queremos dar visibilidade aos hotéis, pousadas e serviços de turismo em geral que fazem parte da vida e da história da nossa região."
    },
    {
      icon: FaGlobeAmericas,
      title: "Por que fazemos isso",
      text: "Sabemos como o turismo pode transformar comunidades. Quando um visitante escolhe se hospedar em um lugar local ou conhecer uma atração da cidade, ele está ajudando a gerar renda, criar empregos e movimentar a economia local. Mais do que isso: ele está vivendo uma experiência autêntica, conectando-se com a cultura e com as pessoas que realmente fazem a diferença."
    },
    {
      icon: FaStar,
      title: "Nosso compromisso",
      text: "Nosso objetivo é ser uma ponte entre os empreendedores locais e os viajantes que querem conhecer novos destinos de forma verdadeira e acolhedora. Queremos que a tecnologia esteja a favor das pessoas — simples, acessível e útil para quem quer divulgar seus serviços e para quem está em busca de algo especial."
    },
    {
      icon: FaHeart,
      title: "Feito com carinho, para todos",
      text: "Cada detalhe da plataforma foi pensado com muito cuidado para que qualquer pessoa — mesmo sem conhecimento técnico — possa participar, anunciar e encontrar o que procura. Acreditamos que quando a comunidade cresce unida, todo mundo ganha."
    },
    {
      icon: FaTools,
      title: "Como funciona",
      text: "Criamos uma plataforma intuitiva e fácil de usar. Empreendedores podem cadastrar seus estabelecimentos ou serviços em poucos passos, enquanto viajantes podem navegar, buscar por categorias e descobrir lugares únicos com base em seus interesses. Tudo de forma rápida, segura e gratuita."
    },
    {
      icon: FaChartLine,
      title: "Impacto real",
      text: "A cada nova hospedagem, passeio ou serviço contratado por meio da plataforma, estamos contribuindo para o fortalecimento da economia local. Nosso impacto vai além do turismo: queremos ajudar famílias, negócios familiares e pequenas iniciativas a prosperarem."
    },
    {
      icon: FaHandshake,
      title: "Parcerias que fortalecem",
      text: "Acreditamos no poder da colaboração. Por isso, buscamos parcerias com entidades locais, associações e projetos sociais para expandir o alcance e os benefícios da nossa iniciativa."
    },
    {
      icon: FaRocket,
      title: "Nosso futuro",
      text: "Estamos só começando. Em breve, novas funcionalidades, melhorias e formas de engajar ainda mais a comunidade estarão disponíveis. Nosso compromisso é crescer junto com você."
    }
  ];
  
  export default function Sobre() {
      return (
      // Container principal com padding padrão e fundo suave
      <div className="bg-gray-50 min-h-screen py-12 md:py-16">
          <div className="container mx-auto px-4">
              {/* Título principal centralizado */}
              <h1 className="text-3xl font-bold text-center text-gray-800 mb-10 md:mb-14">
                  Entenda um pouco mais sobre a plataforma
              </h1>
  
              {/* Grid para organizar os blocos de conteúdo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {sections.map((section, index) => {
                      const Icon = section.icon; // Pega o componente do ícone
                      return (
                          // Card para cada seção
                          <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
                              {/* Cabeçalho da seção com ícone */}
                              <div className="flex items-center gap-3 mb-4">
                                  <Icon className="text-green-600 w-6 h-6 flex-shrink-0" />
                                  <h2 className="text-xl font-semibold text-gray-800">{section.title}</h2>
                              </div>
                              {/* Texto da seção */}
                              <p className="text-gray-700 leading-relaxed text-sm flex-grow">
                                  {section.text}
                              </p>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>
      );
  }
  
// src/app/page.js
'use client';

import Link from "next/link";
import { useEffect, useState, Suspense } from 'react'; // Lembrete: Adicionei o Suspense aqui.
import { supabase } from '@/app/lib/supabaseClient';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation'; // Preciso disso para ler os parâmetros da URL.
import Hero from '@/app/components/Hero';
import FAQSection from '@/app/components/FAQSection';
import CategoriesSection from "./components/CategoriesSection";
import HowItWorksSection from '@/app/components/HowItWorksSection';

// Carrego o BusinessCard dinamicamente para otimizar o carregamento inicial.
const BusinessCard = dynamic(() => import('@/app/components/BusinessCard'), {
  ssr: false, // Não preciso dele no lado do servidor para esta página.
});

// Meu componente interno para a lista de negócios.
// Preciso dele separado porque o `useSearchParams` só funciona dentro de um <Suspense>.
function BusinessList() {
  const searchParams = useSearchParams(); // Hook para eu poder ler os parâmetros da URL.
  const categorySlug = searchParams.get('categoria'); // Pego o valor do parâmetro ?categoria= da URL.

  const [businesses, setBusinesses] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); // Meu estado para o termo de busca digitado.

  // Efeito para buscar os negócios quando o componente monta.
  useEffect(() => {
    const fetchBusinesses = async () => {
      setLoading(true);
      setError(null);
      console.log("Buscando negócios..."); // Log para eu acompanhar.
      try {
        // Minha busca inicial pega todos os negócios ativos da view `negocios_com_media`.
        const { data, error: dbError } = await supabase
          .from('negocios_com_media') // View que já tem a média de avaliações.
          .select('*')
          .eq('ativo', true); // Só os ativos.

        if (dbError) throw dbError; // Se der erro no Supabase, jogo para o catch.
        console.log("Dados brutos recebidos:", data); // Log para ver o que veio.
        setBusinesses(data || []); // Atualizo o estado com os dados (ou um array vazio).

      } catch (err) {
        console.error("Erro ao buscar negócios:", err);
        setError("Erro ao carregar os estabelecimentos. Tente novamente mais tarde.");
      } finally {
        setLoading(false); // Paro o loading, não importa o resultado.
      }
    };
    fetchBusinesses();
  }, []); // Array de dependências vazio, então roda só uma vez na montagem.

  // --- Minha Lógica de Filtragem dos Negócios ---
  const filteredBusinesses = businesses.filter(business => {
    // 1. Filtro pela Categoria (usando o slug da URL).
    const matchesCategory = !categorySlug || // Se não tiver slug na URL, passa todos.
                           (business.slug_categoria === categorySlug); // Senão, comparo o slug do negócio com o da URL.

    // 2. Filtro pelo Termo de Busca (no nome ou na cidade do negócio).
    const matchesSearchTerm = searchTerm === '' || // Se não tiver termo de busca, passa todos.
      (business.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || // Busca no nome (ignorando maiúsculas/minúsculas).
      (business.cidade?.toLowerCase() || '').includes(searchTerm.toLowerCase()); // Busca na cidade (ignorando maiúsculas/minúsculas).

    // O negócio só aparece se passar nos DOIS filtros.
    return matchesCategory && matchesSearchTerm;
  });

  // Pego o nome da categoria selecionada para mostrar na UI (opcional, mas melhora a UX).
  const selectedCategoryName = categorySlug
    ? businesses.find(b => b.slug_categoria === categorySlug)?.nome_categoria // Procuro o nome da categoria nos dados que já tenho.
    : null; // Se não tiver slug na URL, não tem nome para mostrar.

  return (
    <>
      {/* Minha Barra de Busca. */}
      <div id="search-section" className="container mx-auto p-4 mt-8 mb-2 relative z-10">
        <h1 className="text-3xl font-bold mb-6 text-center md:text-center">Encontre o que você precisa</h1>
        <input
          type="text"
          placeholder="Buscar por nome ou cidade..."
          className="w-full p-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} // Atualizo o estado do termo de busca.
        />
        {/* Mostro a categoria que está sendo filtrada, se houver. */}
        {selectedCategoryName && (
            <p className="text-center text-sm text-gray-600 mt-2">
                Filtrando por: <span className="font-semibold">{selectedCategoryName}</span>
                {/* Link para limpar o filtro de categoria (volta para a home sem o parâmetro). */}
                <Link href="/#search-section" className="ml-2 text-xs text-blue-500 hover:text-red-500">(Limpar filtro)</Link>
            </p>
        )}
      </div>

      {/* Minha Seção de Categorias (componente separado). */}
      <CategoriesSection />

      {/* Minha Lista Principal de Negócios. */}
      <div id="businesses-list" className="container bg-gray-50 mx-auto p-4">
        {loading && <p className="text-center text-gray-600">Carregando estabelecimentos...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        {/* Mensagem se não encontrar negócios após aplicar os filtros ou se não houver nenhum cadastrado. */}
        {!loading && !error && filteredBusinesses.length === 0 && (
            <p className="text-center text-gray-600">
                {searchTerm || categorySlug // Se tiver algum filtro ativo...
                    ? `Nenhum estabelecimento encontrado ${categorySlug ? `na categoria "${selectedCategoryName || categorySlug}"` : ''} ${searchTerm ? `para "${searchTerm}"` : ''}.`
                    : 'Ainda não há estabelecimentos cadastrados.'} {/* Senão, mensagem padrão. */}
            </p>
        )}

        {/* Renderizo os cards dos negócios filtrados. */}
        {!loading && !error && filteredBusinesses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map(business => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// Meu componente principal da página Home.
export default function Home() {
  return (
    <div>
      <Hero /> {/* Minha seção Hero. */}
      {/* Preciso envolver a BusinessList com Suspense por causa do useSearchParams. */}
      <Suspense fallback={<div className="text-center p-10">Carregando filtros...</div>}> {/* UI de fallback enquanto carrega. */}
        <BusinessList />
      </Suspense>
      <HowItWorksSection /> {/* Minha seção "Como Funciona". */}
      <FAQSection /> {/* Minha seção de Perguntas Frequentes. */}
    </div>
  );
}

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
import { SpeedInsights } from "@vercel/speed-insights/next"


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
  const [allCategories, setAllCategories] = useState([]);

  // Efeito para buscar os negócios quando o componente monta.
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      console.log("Buscando dados iniciais (negócios e todas as categorias)..."); // Log para eu acompanhar.
      try {
        // Minha busca inicial pega todos os negócios ativos da view `negocios_com_media`.
        const { data: businessesData, error: businessesDbError } = await supabase
          .from('negocios_com_media') // View que já tem a média de avaliações.
          .select('*')
          .eq('ativo', true); // Só os ativos.

        if (businessesDbError) throw businessesDbError; // Se der erro no Supabase, jogo para o catch.
        console.log("Dados de negócios recebidos:", businessesData); // Log para ver o que veio.
        setBusinesses(businessesData || []); // Atualizo o estado com os dados (ou um array vazio).

        // Nova busca por todas as categorias para obter nomes e slugs
        // Similar ao que CategoriesSection.js faz
        const { data: categoriesData, error: categoriesDbError } = await supabase
          .from('categorias')
          .select('id, nome, slug') // Pego id, nome e slug
          .order('nome', { ascending: true });
        
        if (categoriesDbError) throw categoriesDbError;
        console.log("Dados de todas as categorias recebidos:", categoriesData);
        setAllCategories(categoriesData || []);

      } catch (err) {
        console.error("Erro ao buscar dados iniciais:", err);
        setError("Erro ao carregar os dados. Tente novamente mais tarde.");
      } finally {
        setLoading(false); // Paro o loading, não importa o resultado.
      }
    };
    fetchInitialData();
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
  const categoryDetailsFromAll = categorySlug
    ? allCategories.find(cat => cat.slug === categorySlug)
    : null;

  // Nome da categoria para exibição. Se não encontrar na lista `allCategories` (improvável se o slug for válido),
  // usa o próprio slug formatado como fallback.
  const displayCategoryName = categoryDetailsFromAll?.nome || (categorySlug ? categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null);

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
        {/* Mostro a categoria que está sendo filtrada e o link "Limpar filtro" SE categorySlug existir na URL. */}
        {categorySlug && displayCategoryName && ( // Adiciono displayCategoryName para garantir que temos um nome para mostrar
            <p className="text-center text-sm text-gray-600 mt-2">
                Filtrando por: <span className="font-semibold">{displayCategoryName}</span>
                {/* Link para limpar o filtro de categoria (volta para a home sem o parâmetro). */}
                <Link href="/#search-section" className="ml-2 text-xs text-blue-500 hover:text-red-500">(LIMPAR FILTRO)</Link>
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
                    ? `Nenhum estabelecimento encontrado ${categorySlug && displayCategoryName ? `na categoria "${displayCategoryName}"` : ''} ${searchTerm ? `para "${searchTerm}"` : ''}.`
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

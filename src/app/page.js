// page.js
'use client';

import Link from "next/link";
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import Hero from '@/app/components/Hero';
import FAQSection from '@/app/components/FAQSection';
import CategoriesSection from "./components/CategoriesSection";
import HowItWorksSection from '@/app/components/HowItWorksSection';
import { SpeedInsights } from "@vercel/speed-insights/next";

// Carregamento dinâmico (lazy loading) do BusinessCard para otimizar a página.
const BusinessCard = dynamic(() => import('@/app/components/BusinessCard'), {
  ssr: false,
});

// Componente que carrega e filtra a lista de negócios.
// Precisa ser um componente separado para usar o `useSearchParams` dentro do Suspense.
function BusinessList() {
  // Hook para ler os parâmetros da URL (ex: ?categoria=...).
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get('categoria');

  const [businesses, setBusinesses] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [allCategories, setAllCategories] = useState([]);

  // Busca os dados iniciais (negócios e categorias) no Supabase.
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Busca todos os negócios ativos da view que já calcula a média de avaliações.
        const { data: businessesData, error: businessesDbError } = await supabase
          .from('negocios_com_media')
          .select('*')
          .eq('ativo', true);

        if (businessesDbError) throw businessesDbError;
        setBusinesses(businessesData || []);

        // Busca todas as categorias para obter nomes e slugs para a UI.
        const { data: categoriesData, error: categoriesDbError } = await supabase
          .from('categorias')
          .select('id, nome, slug')
          .order('nome', { ascending: true });
        
        if (categoriesDbError) throw categoriesDbError;
        setAllCategories(categoriesData || []);

      } catch (err) {
        console.error("Erro ao buscar dados iniciais:", err);
        setError("Erro ao carregar os dados. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Filtra os negócios com base na categoria da URL e no termo de busca.
  const filteredBusinesses = businesses.filter(business => {
    const matchesCategory = !categorySlug || (business.slug_categoria === categorySlug);
    const matchesSearchTerm = searchTerm === '' ||
      (business.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (business.cidade?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearchTerm;
  });

  // Pega o nome da categoria selecionada para mostrar na UI.
  const categoryDetailsFromAll = categorySlug
    ? allCategories.find(cat => cat.slug === categorySlug)
    : null;
  const displayCategoryName = categoryDetailsFromAll?.nome || (categorySlug ? categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null);

  return (
    <>
      {/* Minha Barra de Busca */}
      <div id="search-section" className="container mx-auto p-4 mt-8 mb-2 relative z-10" data-aos="fade-in">
        <h1 className="text-3xl font-bold mb-6 text-center md:text-center">Encontre o que você precisa</h1>
        <input
          type="text"
          placeholder="Buscar por nome ou cidade..."
          className="w-full p-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {categorySlug && displayCategoryName && (
            <p className="text-center text-sm text-gray-600 mt-2">
                Filtrando por: <span className="font-semibold">{displayCategoryName}</span>
                <Link href="/#search-section" className="ml-2 text-xs text-blue-500 hover:text-red-500">(LIMPAR FILTRO)</Link>
            </p>
        )}
      </div>

      {/* Minha Seção de Categorias */}
      <div data-aos="fade-left">
        <CategoriesSection />
      </div>

      {/* Minha Lista Principal de Negócios */}
      <div id="businesses-list" className="container bg-gray-50 mx-auto p-4">
        {loading && <p className="text-center text-gray-600 py-8">Carregando estabelecimentos...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        {!loading && !error && filteredBusinesses.length === 0 && (
            <p className="text-center text-gray-600 py-8">
                {searchTerm || categorySlug
                    ? `Nenhum estabelecimento encontrado ${categorySlug && displayCategoryName ? `na categoria "${displayCategoryName}"` : ''} ${searchTerm ? `para "${searchTerm}"` : ''}.`
                    : 'Ainda não há estabelecimentos cadastrados.'}
            </p>
        )}

        {!loading && !error && filteredBusinesses.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" data-aos="fade-right" data-aos-delay="200">
            {filteredBusinesses.map(business => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function Home() {
  return (
    <div>
      <Hero />
      
      {/* O Suspense é necessário para o useSearchParams funcionar no BusinessList. */}
      <Suspense fallback={<div className="text-center p-10">Carregando...</div>}>
        <BusinessList />
      </Suspense>

      <div data-aos="fade-up" data-aos-delay="100">
        <HowItWorksSection />
      </div>
      
      <div data-aos="fade-up" data-aos-delay="200">
        <FAQSection />
      </div>
    </div>
  );
}

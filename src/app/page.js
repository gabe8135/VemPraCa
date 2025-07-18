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

const BusinessCard = dynamic(() => import('@/app/components/BusinessCard'), {
  ssr: false,
});

function BusinessList() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get('categoria');

  const [businesses, setBusinesses] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: businessesData, error: businessesDbError } = await supabase
          .from('negocios_com_media')
          .select('*')
          .eq('ativo', true);

        if (businessesDbError) throw businessesDbError;
        setBusinesses(businessesData || []);

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

  const filteredBusinesses = businesses.filter(business => {
    const matchesCategory = !categorySlug || (business.slug_categoria === categorySlug);
    const matchesSearchTerm = searchTerm === '' ||
      (business.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (business.cidade?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearchTerm;
  });

  const categoryDetailsFromAll = categorySlug
    ? allCategories.find(cat => cat.slug === categorySlug)
    : null;

  const displayCategoryName = categoryDetailsFromAll?.nome ||
    (categorySlug ? categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null);

  return (
    <>
      {/* Barra de Busca com flip-down suave */}
      <div id="search-section" className="container mx-auto p-4 mt-8 mb-2 relative z-10">
        <h1 className="text-3xl text-green-700 font-bold mb-6 text-center">Encontre o que você precisa</h1>
        <input
          type="text"
          placeholder="Buscar por nome ou cidade..."
          className="w-full p-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
      </div>

      {/* Seção de Categorias com fade-right */}
      <div>
        <CategoriesSection />
      </div>

      {/* Lista de Negócios */}
      <div id="businesses-list" className="container  mx-auto p-4">
        {loading && (
          <p className="text-center text-gray-600 py-8">Carregando estabelecimentos...</p>
        )}
        {error && (
          <p className="text-center text-red-500">{error}</p>
        )}

        {!loading && !error && filteredBusinesses.length === 0 && (
          <p className="text-center text-gray-600 py-8">
            {searchTerm || categorySlug
              ? `Nenhum estabelecimento encontrado ${categorySlug && displayCategoryName ? `na categoria "${displayCategoryName}"` : ''} ${searchTerm ? `para "${searchTerm}"` : ''}.`
              : 'Ainda não há estabelecimentos cadastrados.'}
          </p>
        )}

        {!loading && !error && filteredBusinesses.length > 0 && (
          <div
            className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            data-aos="fade-up" // Animação aplicada aqui, no container dos cards
          >
            {filteredBusinesses.map((business) => (
              <div key={business.id}>
                <BusinessCard business={business} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function Home() {
  return (
    <div className="overflow-x-hidden">
      <Hero />

      {/* Suspense com fade-up suave */}
      <Suspense fallback={<div className="text-center p-10">Carregando...</div>}>
        <BusinessList />
      </Suspense>

      <div>
        <HowItWorksSection />
      </div>

      <div data-aos="fade-up" data-aos-delay="100"> {/* Animação aplicada aqui, na seção de FAQ */}
        <FAQSection />
      </div>
    </div>
  );
}

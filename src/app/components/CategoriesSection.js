// src/app/components/CategoriesSection.js
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabaseClient';

// Defino quantas categorias eu mostro inicialmente.
const INITIAL_VISIBLE_COUNT = 8;

export default function CategoriesSection() {
  const [categoriesData, setCategoriesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllCategories, setShowAllCategories] = useState(false); // Controla se mostro todas as categorias ou só as iniciais.

  // Busco as categorias do Supabase quando o componente carrega.
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('categorias')
          .select('id, nome, slug') // Pego o ID, nome e o slug para os links.
          .order('nome', { ascending: true }); // Ordeno por nome.

        if (dbError) throw dbError;
        setCategoriesData(data || []);
      } catch (err) {
        console.error("Erro ao buscar categorias:", err);
        setError("Não foi possível carregar as categorias.");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []); // Array de dependências vazio, então roda só uma vez.

  // Separo as categorias em visíveis e ocultas para a funcionalidade de "Ver mais".
  const visibleCategories = categoriesData.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCategories = categoriesData.slice(INITIAL_VISIBLE_COUNT);

  return (
    <section id="categories" className="py-8 bg-white">
      <div className="container mx-auto px-4">
        {/* Feedback de loading e erro. */}
        {loading && <p className="text-center text-gray-500">Carregando categorias...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {!loading && !error && categoriesData.length === 0 && (
          <p className="text-center text-gray-500">Nenhuma categoria encontrada.</p>
        )}

        {!loading && !error && categoriesData.length > 0 && (
          <>
            <div className="flex flex-wrap justify-center gap-3 md:gap-4">
              {/* Mapeio as categorias visíveis para criar os links. */}
              {visibleCategories.map((category) => (
                <Link
                  key={category.id}
                  // O link vai para a home, passa a categoria como query param e ancora na seção de busca.
                  href={`/?categoria=${category.slug}#search-section`}
                  className="flex flex-col items-center justify-center text-center px-4 py-3 bg-gray-100 rounded-lg shadow-sm hover:bg-emerald-500 hover:shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1 min-w-[100px]"
                >
                  <span className="text-sm font-medium text-gray-800">{category.nome}</span>
                </Link>
              ))}

              {/* Se 'showAllCategories' for true, mostro as categorias ocultas também. */}
              {showAllCategories && hiddenCategories.map((category) => (
                <Link
                  key={category.id}
                  // O link vai para a home, passa a categoria como query param e ancora na seção de busca.
                  href={`/?categoria=${category.slug}#search-section`}
                  className="flex flex-col items-center justify-center text-center px-4 py-3 bg-gray-100 rounded-lg shadow-sm hover:bg-emerald-500 hover:shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1 min-w-[100px]"
                >
                  <span className="text-sm font-medium text-gray-800">{category.nome}</span>
                </Link>
              ))}
            </div>

            {/* Botão para mostrar/esconder o resto das categorias, só aparece se houver categorias ocultas. */}
            {hiddenCategories.length > 0 && (
              <div className="text-center mt-6">
                <button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="text-sm font-medium text-green-600 hover:text-green-700 focus:outline-none px-4 py-2 rounded-md hover:bg-gray-100 transition duration-200"
                  aria-expanded={showAllCategories} // Bom para acessibilidade.
                >
                  {showAllCategories
                    ? 'Ver menos categorias'
                    : `Ver mais ${hiddenCategories.length} categorias`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

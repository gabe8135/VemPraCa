// src/app/components/CategoriesSection.js
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { useSearchParams } from 'next/navigation';

// Defino quantas categorias eu mostro inicialmente.
const INITIAL_VISIBLE_COUNT = 8;

export default function CategoriesSection() {
  const [categoriesData, setCategoriesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllCategories, setShowAllCategories] = useState(false); // Controla se mostro todas as categorias ou só as iniciais.
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get('categoria');

  // Busco as categorias do Supabase quando o componente carrega.
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);
      try {
        // Busca apenas as categorias, sem contar negócios
        const { data, error: dbError } = await supabase
          .from('categorias')
          .select('id, nome, slug')
          .order('nome', { ascending: true }); // Ordena alfabeticamente

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
              {visibleCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/?categoria=${category.slug}#search-section`}
                  className={`
                    flex items-center gap-2 px-5 py-3 rounded-full
                    bg-gradient-to-r from-emerald-500 to-green-600
                    shadow-md hover:shadow-lg
                    text-white font-semibold text-base
                    transition-all duration-200
                    hover:scale-105 hover:from-green-600 hover:to-emerald-500
                    focus:outline-none focus:ring-2 focus:ring-emerald-400
                    ${category.slug === selectedCategory ? 'ring-4 ring-yellow-400' : ''}
                  `}
                  aria-label={`Filtrar por categoria ${category.nome}`}
                >
                  <span>{category.nome}</span>
                </Link>
              ))}

              {/* Todas as categorias extras com o mesmo estilo */}
              {showAllCategories && hiddenCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/?categoria=${category.slug}#search-section`}
                  className={`
                    flex items-center gap-2 px-5 py-3 rounded-full
                    bg-gradient-to-r from-emerald-500 to-green-600
                    shadow-md hover:shadow-lg
                    text-white font-semibold text-base
                    transition-all duration-200
                    hover:scale-105 hover:from-green-600 hover:to-emerald-500
                    focus:outline-none focus:ring-2 focus:ring-emerald-400
                    ${category.slug === selectedCategory ? 'ring-4 ring-yellow-400' : ''}
                  `}
                  aria-label={`Filtrar por categoria ${category.nome}`}
                >
                  <span>{category.nome}</span>
                </Link>
              ))}
            </div>

            {/* Botão para mostrar/esconder o resto das categorias, só aparece se houver categorias ocultas. */}
            {hiddenCategories.length > 0 && (
              <div className="text-center mt-6">
                <button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="mt-4 px-6 py-2 rounded-full bg-white text-emerald-600 font-semibold shadow hover:bg-emerald-50 transition-all duration-200 focus:ring-2 focus:ring-emerald-400"
                >
                  {showAllCategories ? 'Ver menos categorias' : `Ver mais ${hiddenCategories.length} categorias`}
                </button>
              </div>
            )}

            {/* Botão para limpar filtro de categoria, aparece só se houver filtro ativo */}
            {selectedCategory && (
              <div className="text-center mt-4">
                <Link
                  href="/#categories"
                  className="
                    inline-flex items-center gap-2 px-5 py-2 rounded-full
                    bg-gradient-to-r from-yellow-400 to-amber-300
                    text-green-800 font-semibold shadow-md
                    hover:from-amber-300 hover:to-yellow-400 hover:text-emerald-700
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-yellow-400
                  "
                  aria-label="Limpar filtro de categoria"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Limpar filtro
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

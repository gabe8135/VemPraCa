"use client";

import Link from "next/link";
import { useEffect, useState, Suspense, useRef } from "react";
import { Fade } from "react-awesome-reveal";
// ...existing code...
import { supabase, isSupabaseConfigured } from "@/app/lib/supabaseClient";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Hero from "@/app/components/Hero";
import FAQSection from "@/app/components/FAQSection";
import CategoriesSection from "./components/CategoriesSection";
import HowItWorksSection from "@/app/components/HowItWorksSection";
import WeatherSection from "@/app/components/WeatherSection";
import AnnouncementsSection from "@/app/components/AnnouncementsSection";
import { Swiper, SwiperSlide } from "swiper/react";
import {
  Navigation,
  Pagination,
  A11y,
  Autoplay,
  Mousewheel,
} from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const BusinessCard = dynamic(() => import("@/app/components/BusinessCard"), {
  ssr: false,
});

function BusinessList() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("categoria");

  const [businesses, setBusinesses] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [allCategories, setAllCategories] = useState([]);

  // Novos estados para filtro de localização
  const [selectedCidade, setSelectedCidade] = useState("");
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState([]);

  const isFirstRender = useRef(true);
  const prevCategorySlug = useRef(categorySlug);

  // Atualizar cidades disponíveis baseado nos negócios cadastrados em SP
  useEffect(() => {
    if (businesses.length > 0) {
      const cidadesUnicas = [
        ...new Set(
          businesses.filter((b) => b.estado === "SP").map((b) => b.cidade)
        ),
      ].sort();
      setCidadesDisponiveis(cidadesUnicas);
    }
  }, [businesses]);

  // Atualizar cidades disponíveis baseado nos negócios
  useEffect(() => {
    if (businesses.length > 0) {
      const cidadesUnicas = [
        ...new Set(businesses.map((b) => b.cidade)),
      ].sort();
      setCidadesDisponiveis(cidadesUnicas);
    }
  }, [businesses]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!isSupabaseConfigured) {
          throw new Error(
            "Configuração do Supabase ausente. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
          );
        }
        const { data: businessesData, error: businessesDbError } =
          await supabase
            .from("negocios_com_media")
            .select("*")
            .eq("ativo", true);

        if (businessesDbError) throw businessesDbError;
        setBusinesses(businessesData || []);

        const { data: categoriesData, error: categoriesDbError } =
          await supabase
            .from("categorias")
            .select("id, nome, slug")
            .order("nome", { ascending: true });

        if (categoriesDbError) throw categoriesDbError;
        setAllCategories(categoriesData || []);
      } catch (err) {
        console.error("Erro ao buscar dados iniciais:", err);
        setError(
          err?.message?.includes("Supabase")
            ? "Variáveis do Supabase não estão configuradas no ambiente local."
            : "Erro ao carregar os dados. Tente novamente mais tarde."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Removemos a rolagem automática para evitar flicker e jump ao trocar categoria
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    prevCategorySlug.current = categorySlug;
  }, [categorySlug]);

  // Função para limpar filtros
  const clearFilters = () => {
    setSelectedCidade("");
    setSearchTerm("");
  };

  // Filtro atualizado com localização
  const filteredBusinesses = businesses.filter((business) => {
    const matchesCategory =
      !categorySlug || business.slug_categoria === categorySlug;
    const matchesSearchTerm =
      searchTerm === "" ||
      (business.nome?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (business.cidade?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    // Novos filtros de localização
    const matchesCidade = !selectedCidade || business.cidade === selectedCidade;

    return matchesCategory && matchesSearchTerm && matchesCidade;
  });

  // Ordenação do grid principal (não altera o carrossel de destaques):
  // 1) Destaque primeiro
  // 2) Com avaliações depois
  // 3) Categoria (nome_categoria) em ordem alfabética
  const toBool = (v) => v === true || v === "true" || v === 1 || v === "1";
  const hasReviews = (b) => {
    const val = parseFloat(b?.media_avaliacoes);
    return Number.isFinite(val);
  };
  const getCategory = (b) => (b?.nome_categoria || "").toString();
  const sortedBusinesses = [...filteredBusinesses].sort((a, b) => {
    const aFeat = toBool(a?.destaque);
    const bFeat = toBool(b?.destaque);
    if (aFeat !== bFeat) return aFeat ? -1 : 1;

    const aHas = hasReviews(a);
    const bHas = hasReviews(b);
    if (aHas !== bHas) return aHas ? -1 : 1;

    return getCategory(a).localeCompare(getCategory(b), "pt-BR", {
      sensitivity: "base",
    });
  });

  const categoryDetailsFromAll = categorySlug
    ? allCategories.find((cat) => cat.slug === categorySlug)
    : null;

  const displayCategoryName =
    categoryDetailsFromAll?.nome ||
    (categorySlug
      ? categorySlug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      : null);

  return (
    <>
      {/* Barra de Busca com Filtros de Localização */}
      <div
        id="search-section"
        className="container mx-auto p-4 mt-8 mb-2 relative z-10"
      >
        <h1 className="text-3xl text-green-700 font-bold mb-6 text-center">
          Encontre o que você precisa
        </h1>

        {/* Container dos filtros */}
        <div className="space-y-4 mb-4 bg-white rounded-2xl shadow-lg p-4 md:p-6 flex flex-col gap-4 border border-gray-100">
          {/* Filtros de busca e cidade animados */}
          <Fade cascade damping={0.18} triggerOnce>
            <div className="flex flex-col md:flex-row gap-3 w-full">
              <div className="flex-1">
                <label
                  htmlFor="searchTerm"
                  className="block text-sm font-semibold text-emerald-700 mb-1"
                >
                  Buscar por nome
                </label>
                <input
                  id="searchTerm"
                  type="text"
                  placeholder="Ex: Pousada, Restaurante..."
                  className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="cidade"
                  className="block text-sm font-semibold text-emerald-700 mb-1"
                >
                  Cidades Disponiveis em (SP)
                </label>
                <select
                  id="cidade"
                  value={selectedCidade}
                  onChange={(e) => setSelectedCidade(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black bg-white"
                  disabled={cidadesDisponiveis.length === 0}
                >
                  <option value="">Todas as cidades</option>
                  {cidadesDisponiveis.map((cidade) => (
                    <option key={cidade} value={cidade}>
                      {cidade}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col justify-end w-full md:w-auto">
                <button
                  onClick={clearFilters}
                  className="w-full md:w-auto p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-md transition duration-200 font-semibold flex items-center justify-center gap-2"
                  type="button"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Limpar Filtros
                </button>
              </div>
            </div>
          </Fade>
          {/* Indicador de filtros ativos */}
          {(selectedCidade || searchTerm) && (
            <div className="flex flex-wrap gap-2 text-sm mt-2">
              <span className="text-gray-600">Filtros ativos:</span>
              {searchTerm && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Busca: {`"${searchTerm}"`}
                </span>
              )}
              {selectedCidade && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                  Cidade: {selectedCidade}
                </span>
              )}
              {/* Estado removido do filtro, não exibe badge */}
            </div>
          )}
        </div>
      </div>

      {/* Seção de Categorias */}
      <div>
        <CategoriesSection />
      </div>

      {/* Lista de Negócios */}
      <div id="businesses-list" className="container mx-auto p-4">
        {loading && (
          <p className="text-center text-gray-600 py-8">
            Carregando estabelecimentos...
          </p>
        )}
        {error && <p className="text-center text-red-500">{error}</p>}

        {!loading && !error && filteredBusinesses.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              {searchTerm || categorySlug || selectedCidade
                ? `Nenhum estabelecimento encontrado com os filtros aplicados.`
                : "Ainda não há estabelecimentos cadastrados."}
            </p>
            {(searchTerm || selectedCidade) && (
              <button
                onClick={clearFilters}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                Ver todos os estabelecimentos
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredBusinesses.length > 0 && (
          <>
            {/* Destaques: negócios marcados manualmente (destaque === true), até 8 itens */}
            {filteredBusinesses.filter((b) => b.destaque === true).length >
              0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-3 text-emerald-700">
                  Destaques
                </h2>
                <Swiper
                  modules={[Pagination, A11y, Autoplay, Mousewheel]}
                  spaceBetween={16}
                  slidesPerView={1.2}
                  breakpoints={{
                    640: { slidesPerView: 2.2 },
                    1024: { slidesPerView: 3.2 },
                  }}
                  pagination={{ clickable: true }}
                  className="!pb-8"
                  style={{ paddingLeft: 4, paddingRight: 4 }}
                  loop={true}
                  autoplay={{ delay: 3500, disableOnInteraction: false }}
                  mousewheel={{ forceToAxis: true, releaseOnEdges: true }}
                  onInit={(swiper) => {
                    setTimeout(() => {
                      const bullets = document.querySelectorAll(
                        ".swiper-pagination-bullet"
                      );
                      bullets.forEach((el) => {
                        el.classList.add("!bg-emerald-500", "!opacity-80");
                      });
                    }, 100);
                  }}
                >
                  <Fade cascade damping={0.18} triggerOnce>
                    {filteredBusinesses
                      .filter((b) => b.destaque === true)
                      .slice(0, 8)
                      .map((business) => (
                        <SwiperSlide key={business.id} className="!h-auto flex">
                          <BusinessCard business={business} />
                        </SwiperSlide>
                      ))}
                  </Fade>
                </Swiper>
                <style jsx global>{`
                  .swiper-pagination-bullet {
                    background: #10b981 !important; /* emerald-500 */
                    opacity: 0.8 !important;
                  }
                  .swiper-pagination-bullet-active {
                    background: #047857 !important; /* emerald-700 */
                    opacity: 1 !important;
                  }
                `}</style>
              </div>
            )}
            {/* Grid dos demais estabelecimentos */}
            <div className="mb-4 text-center text-gray-600">
              {filteredBusinesses.length} estabelecimento
              {filteredBusinesses.length !== 1 ? "s" : ""} encontrado
              {filteredBusinesses.length !== 1 ? "s" : ""}
            </div>
            <div className="w-full lg:max-w-6xl lg:w-[80%] mx-auto">
              <div className="grid sm:mx-0 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-7">
                {sortedBusinesses.map((business) => (
                  <Fade
                    key={business.id}
                    cascade={false}
                    duration={260}
                    triggerOnce
                  >
                    <BusinessCard business={business} />
                  </Fade>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      {/* Seção do Clima */}
      <WeatherSection cidade={selectedCidade || "Ilha Comprida"} />

      {/* Seção de Anúncios (Em breve) */}
      <AnnouncementsSection />
    </>
  );
}

export default function Sobre() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <Hero />
      <Suspense
        fallback={<div className="text-center p-10">Carregando...</div>}
      >
        <BusinessList />
      </Suspense>
      <div>
        <HowItWorksSection />
      </div>

      {/* Chamada para colaboração */}
      <section className="w-full py-12 px-4 flex flex-col items-center justify-center bg-white">
        <div className="max-w-2xl w-full text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-emerald-700 mb-2 flex items-center justify-center gap-2">
            Apoie o VemPraCa
            <span className="inline-block animate-pulse-heart">💚</span>
          </h2>
          <p className="text-gray-700 mb-4">
            Ajude a manter e evoluir a plataforma!
            <br />
            Seja um colaborador e contribua para o crescimento do projeto.
          </p>
          <Link
            href="/colabore"
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-full shadow-lg transition animate-pulse-heart"
          >
            Quero Colaborar
          </Link>
        </div>
      </section>
      <style jsx global>{`
        @keyframes pulse-heart {
          0%,
          100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.12);
            filter: brightness(1.12);
          }
        }
        .animate-pulse-heart {
          animation: pulse-heart 1.1s infinite cubic-bezier(0.4, 0, 0.6, 1);
          will-change: transform, filter;
          display: inline-block;
        }
      `}</style>

      <div data-aos="fade-up" data-aos-delay="100">
        <FAQSection />
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState, Suspense, useRef } from "react";
import { Fade } from "react-awesome-reveal";
import { FiSearch, FiMapPin, FiSliders, FiX } from "react-icons/fi";
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Novos estados para filtro de localização
  const [selectedCidade, setSelectedCidade] = useState("");
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState([]);

  const isFirstRender = useRef(true);
  const prevCategorySlug = useRef(categorySlug);

  // Em telas médias para cima, mantém filtros sempre abertos; em mobile, começa fechado
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setFiltersOpen(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else if (mq.addListener) mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else if (mq.removeListener) mq.removeListener(update);
    };
  }, []);

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
        className="container mx-auto p-4 mt-6 mb-0 relative z-10"
      >
        <h1 className="text-3xl text-green-700 font-bold mb-4 text-center">
          Encontre o que você precisa
        </h1>

        {/* Cabeçalho compacto para mobile */}
        <div className="md:hidden mt-2">
          <div className="w-full flex justify-left">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md ring-1 ring-emerald-100 px-4 py-2 text-emerald-700 font-semibold shadow-sm"
              aria-expanded={filtersOpen}
              aria-controls="filters-panel"
            >
              <FiSliders className="h-5 w-5" />
              Filtros
              {(selectedCidade || searchTerm) && (
                <span className="ml-1 inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {Boolean(searchTerm) + Boolean(selectedCidade)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Painel dos filtros */}
        <div
          id="filters-panel"
          className={`${filtersOpen ? "block" : "hidden"} md:block mb-2 bg-white/80 rounded-2xl ring-1 ring-emerald-100 backdrop-blur-md p-4 md:p-6`}
        >
          {/* Filtros de busca e cidade animados */}
          <Fade cascade damping={0.18} triggerOnce>
            <div className="flex flex-col md:flex-row gap-3 w-full">
              {/* Buscar por nome */}
              <div className="flex-1">
                <label
                  htmlFor="searchTerm"
                  className="block text-sm font-semibold text-emerald-700 mb-1 md:mb-1"
                >
                  <span className="sr-only md:not-sr-only">
                    Buscar por nome
                  </span>
                </label>
                <div className="relative">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600/80" />
                  <input
                    id="searchTerm"
                    type="text"
                    placeholder="Ex: Pousada, Restaurante..."
                    className="w-full pl-10 pr-3 py-3 rounded-2xl bg-white/90 text-black ring-1 ring-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Buscar por nome"
                  />
                </div>
              </div>
              {/* Cidade */}
              <div className="flex-1">
                <label
                  htmlFor="cidade"
                  className="block text-sm font-semibold text-emerald-700 mb-1 md:mb-1"
                >
                  <span className="sr-only md:not-sr-only">Cidade</span>
                </label>
                <div className="relative">
                  <FiMapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600/80" />
                  <select
                    id="cidade"
                    value={selectedCidade}
                    onChange={(e) => setSelectedCidade(e.target.value)}
                    className="w-full pl-10 pr-9 py-3 rounded-2xl bg-white/90 text-black ring-1 ring-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm appearance-none"
                    disabled={cidadesDisponiveis.length === 0}
                    aria-label="Filtrar por cidade"
                  >
                    <option value="">Todas as cidades</option>
                    {cidadesDisponiveis.map((cidade) => (
                      <option key={cidade} value={cidade}>
                        {cidade}
                      </option>
                    ))}
                  </select>
                  {/* Seta do select */}
                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-700"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.188l3.71-3.957a.75.75 0 111.08 1.04l-4.24 4.52a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              {/* Limpar filtros */}
              <div className="flex flex-col justify-end w-full md:w-auto">
                <button
                  onClick={clearFilters}
                  className="w-full md:w-auto px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl ring-1 ring-emerald-200 transition duration-200 font-semibold inline-flex items-center justify-center gap-2"
                  type="button"
                >
                  <FiX className="h-5 w-5" />
                  Limpar
                </button>
              </div>
            </div>
          </Fade>
          {/* Indicador de filtros ativos (desktop) */}
          <div className="hidden md:block">
            {(selectedCidade || searchTerm) && (
              <div className="flex flex-wrap gap-2 text-sm mt-3">
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
              </div>
            )}
          </div>
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

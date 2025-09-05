"use client";

import Link from "next/link";
import { useEffect, useState, Suspense, useRef } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Hero from "@/app/components/Hero";
import FAQSection from "@/app/components/FAQSection";
import CategoriesSection from "./components/CategoriesSection";
import HowItWorksSection from "@/app/components/HowItWorksSection";

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
  const [selectedEstado, setSelectedEstado] = useState("");
  const [selectedCidade, setSelectedCidade] = useState("");
  const [estados, setEstados] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState([]);

  const isFirstRender = useRef(true);
  const prevCategorySlug = useRef(categorySlug);

  // Carregar estados e cidades do IBGE
  useEffect(() => {
    const fetchEstados = async () => {
      try {
        const response = await fetch(
          "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome"
        );
        const data = await response.json();
        setEstados(data);
      } catch (error) {
        console.error("Erro ao carregar estados:", error);
      }
    };
    fetchEstados();
  }, []);

  // Carregar cidades quando estado é selecionado
  useEffect(() => {
    const fetchCidades = async () => {
      if (selectedEstado) {
        try {
          const response = await fetch(
            `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedEstado}/municipios?orderBy=nome`
          );
          const data = await response.json();
          setCidades(data);
        } catch (error) {
          console.error("Erro ao carregar cidades:", error);
        }
      } else {
        setCidades([]);
        setSelectedCidade("");
      }
    };
    fetchCidades();
  }, [selectedEstado]);

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
        setError("Erro ao carregar os dados. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevCategorySlug.current = categorySlug;
      return;
    }
    if (!loading && prevCategorySlug.current !== categorySlug) {
      prevCategorySlug.current = categorySlug;
      const searchSection = document.getElementById("search-section");
      if (searchSection) {
        const header = document.querySelector("header");
        const headerHeight = header ? header.offsetHeight : 0;
        const top =
          searchSection.getBoundingClientRect().top +
          window.scrollY -
          headerHeight -
          12;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  }, [loading, categorySlug]);

  // Função para limpar filtros
  const clearFilters = () => {
    setSelectedEstado("");
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
        <div className="space-y-4 mb-4">
          {/* Barra de busca principal */}
          <input
            type="text"
            placeholder="Buscar por nome..."
            className="w-full p-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Filtros de localização */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro por Estado */}
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black bg-white"
            >
              <option value="">Todos os estados</option>
              {estados.map((estado) => (
                <option key={estado.id} value={estado.id}>
                  {estado.nome}
                </option>
              ))}
            </select>

            {/* Filtro por Cidade */}
            <select
              value={selectedCidade}
              onChange={(e) => setSelectedCidade(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black bg-white"
              disabled={!selectedEstado && cidadesDisponiveis.length === 0}
            >
              <option value="">Todas as cidades</option>
              {selectedEstado
                ? // Se estado selecionado, mostra cidades do IBGE
                  cidades.map((cidade) => (
                    <option key={cidade.id} value={cidade.nome}>
                      {cidade.nome}
                    </option>
                  ))
                : // Se não, mostra apenas cidades que têm estabelecimentos
                  cidadesDisponiveis.map((cidade) => (
                    <option key={cidade} value={cidade}>
                      {cidade}
                    </option>
                  ))}
            </select>

            {/* Botão para limpar filtros */}
            <button
              onClick={clearFilters}
              className="p-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md transition duration-200 font-medium"
            >
              Limpar Filtros
            </button>
          </div>

          {/* Indicador de filtros ativos */}
          {(selectedEstado || selectedCidade || searchTerm) && (
            <div className="flex flex-wrap gap-2 text-sm">
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
              {selectedEstado && !selectedCidade && (
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Estado:{" "}
                  {estados.find((e) => e.id === parseInt(selectedEstado))?.nome}
                </span>
              )}
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
            {(searchTerm || selectedCidade || selectedEstado) && (
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
            <div className="mb-4 text-center text-gray-600">
              {filteredBusinesses.length} estabelecimento
              {filteredBusinesses.length !== 1 ? "s" : ""} encontrado
              {filteredBusinesses.length !== 1 ? "s" : ""}
            </div>
            <div
              className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
              data-aos="fade-up"
            >
              {filteredBusinesses.map((business) => (
                <div key={business.id}>
                  <BusinessCard business={business} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
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
          <h2 className="text-2xl sm:text-3xl font-bold text-emerald-700 mb-2">
            Apoie o VemPraCa 💚
          </h2>
          <p className="text-gray-700 mb-4">
            Ajude a manter e evoluir a plataforma!
            <br />
            Seja um colaborador e contribua para o crescimento do projeto.
          </p>
          <Link
            href="/colabore"
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-full shadow-lg transition"
          >
            Quero Colaborar
          </Link>
        </div>
      </section>

      <div data-aos="fade-up" data-aos-delay="100">
        <FAQSection />
      </div>
    </div>
  );
}

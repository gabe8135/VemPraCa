// src/app/components/CategoriesSection.js
"use client";

import { useState, useEffect } from "react";
import { Fade } from "react-awesome-reveal";
import { supabase } from "@/app/lib/supabaseClient";
import { useSearchParams, useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";

export default function CategoriesSection() {
  const [categoriesData, setCategoriesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedCategory = searchParams.get("categoria") || "todas";

  useEffect(() => {
    const fetchCategoriesAndBusinesses = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          { data: categories, error: catError },
          { data: businesses, error: busError },
        ] = await Promise.all([
          supabase
            .from("categorias")
            .select("id, nome, slug")
            .order("nome", { ascending: true }),
          supabase
            .from("negocios_com_media")
            .select("id, categoria_id")
            .eq("ativo", true),
        ]);
        if (catError) throw catError;
        if (busError) throw busError;
        setBusinesses(businesses || []);
        // Filtrar categorias que possuem negócios
        const categoriaIdsComNegocios = new Set(
          (businesses || []).map((b) => b.categoria_id)
        );
        const categoriasComNegocios = (categories || []).filter((cat) =>
          categoriaIdsComNegocios.has(cat.id)
        );
        setCategoriesData(categoriasComNegocios);
      } catch (err) {
        setError("Não foi possível carregar as categorias.");
      } finally {
        setLoading(false);
      }
    };
    fetchCategoriesAndBusinesses();
  }, []);

  // Adicionei o listener de wheel para rolar as tabs
  useEffect(() => {
    const tabList = document.querySelector("#categories-tabs-list");
    if (tabList) {
      tabList.addEventListener("wheel", (e) => {
        if (e.deltaY === 0) return;
        e.preventDefault();
        tabList.scrollLeft += e.deltaY;
      });
    }
    return () => {
      if (tabList) {
        tabList.removeEventListener("wheel", () => {});
      }
    };
  }, []);

  // Função para trocar categoria via URL
  const handleTabChange = (value) => {
    if (value === "todas") {
      router.push("/#categories");
    } else {
      router.push(`/?categoria=${value}#categories`);
    }
    // Scroll suave para a barra de pesquisa, compensando a altura da header fixa
    setTimeout(() => {
      const searchSection = document.getElementById("search-section");
      if (searchSection) {
        const header = document.querySelector("header");
        const headerHeight = header ? header.offsetHeight : 0;
        const top =
          searchSection.getBoundingClientRect().top +
          window.scrollY -
          headerHeight -
          12; // 12px de margem extra
        window.scrollTo({ top, behavior: "smooth" });
      }
    }, 100); // pequeno delay para garantir que o DOM atualize
  };

  return (
    <section id="categories" className="py-8 bg-white">
      <div className="container mx-auto px-4">
        {/* Feedback de loading e erro. */}
        {loading && (
          <p className="text-center text-gray-500">Carregando categorias...</p>
        )}
        {error && <p className="text-center text-red-500">{error}</p>}
        {!loading && !error && (
          <Tabs.Root
            defaultValue={selectedCategory}
            value={selectedCategory}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <Tabs.List
              id="categories-tabs-list"
              className="flex gap-2 overflow-x-auto scrollbar-hide bg-gray-50 rounded-full p-2 max-w-full"
              style={{ WebkitOverflowScrolling: "touch" }}
              tabIndex={0}
            >
              <Fade cascade damping={0.15} triggerOnce>
                <div className="flex gap-2">
                  <Tabs.Trigger
                    value="todas"
                    className={`
                      px-4 py-2 rounded-full font-semibold transition whitespace-nowrap
                      text-[#007B55]
                      data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-700 data-[state=active]:text-white
                      hover:bg-gradient-to-r hover:from-yellow-300 hover:to-amber-400 hover:text-[#007B55]
                    `}
                  >
                    Todas
                  </Tabs.Trigger>
                  {categoriesData.map((cat) => (
                    <Tabs.Trigger
                      key={cat.id}
                      value={cat.slug}
                      className={`
                        px-4 py-2 rounded-full font-semibold transition whitespace-nowrap
                        text-[#007B55]
                        data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-700 data-[state=active]:text-white
                        hover:bg-gradient-to-r hover:from-yellow-300 hover:to-amber-400 hover:text-[#007B55]
                      `}
                    >
                      {cat.nome}
                    </Tabs.Trigger>
                  ))}
                </div>
              </Fade>
            </Tabs.List>
          </Tabs.Root>
        )}
      </div>
    </section>
  );
}

// src/app/components/CategoriesSection.js
"use client";

import { useState, useEffect, useRef } from "react";
import { Fade } from "react-awesome-reveal";
import { supabase, isSupabaseConfigured } from "@/app/lib/supabaseClient";
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

  // Refs para calcular e animar o destaque deslizante (efeito "líquido")
  const contentRef = useRef(null); // wrapper interno que contém os triggers (conteúdo que rola)
  const triggerRefs = useRef(new Map()); // mapeia value -> elemento do trigger
  const [hlStyle, setHlStyle] = useState({ left: 0, width: 0, height: 0 });
  const [hlReady, setHlReady] = useState(false);

  useEffect(() => {
    const fetchCategoriesAndBusinesses = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!isSupabaseConfigured) {
          throw new Error(
            "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
          );
        }
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
        setError(
          err?.message?.includes("Supabase")
            ? "Variáveis do Supabase não estão configuradas no ambiente local."
            : "Não foi possível carregar as categorias."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchCategoriesAndBusinesses();
  }, []);

  // Ref opcional para medições futuras (sem comportamento extra de scroll)
  const tabsListRef = useRef(null);

  // Atualiza o highlight para o trigger ativo
  const updateHighlight = () => {
    const activeEl = triggerRefs.current.get(selectedCategory);
    const container = contentRef.current;
    if (!activeEl || !container) return;
    // left/width relativos ao contentRef (que é o elemento que contém os triggers)
    const left = activeEl.offsetLeft;
    const width = activeEl.offsetWidth;
    const height = activeEl.offsetHeight;
    setHlStyle({ left, width, height });
    setHlReady(true);
  };

  // Recalcula quando a categoria muda, quando categorias carregam, ou no resize
  useEffect(() => {
    updateHighlight();
    const onResize = () => updateHighlight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, categoriesData.length]);

  // Função para trocar categoria via URL
  const handleTabChange = (value) => {
    // Troca somente a query sem adicionar hash e sem rolar a página
    if (value === "todas") {
      router.replace("/", { scroll: false });
    } else {
      router.replace(`/?categoria=${value}`, { scroll: false });
    }
  };

  // Classes condicionais para triggers (desativa hover no ativo)
  const getTriggerClasses = (value) => {
    const isActive = selectedCategory === value;
    const base = `category-trigger relative z-10 px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors duration-200 shrink-0`;
    // Texto padrão verde escuro; quando ativo, texto branco e sem hover amarelo
    if (isActive) {
      return `${base} text-white`;
    }
    return `${base} text-[#007B55] hover:bg-yellow-200/60 hover:text-[#007B55]`;
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
                {/* Wrapper do conteúdo rolável com posição relativa para o highlight */}
                <div ref={contentRef} className="relative flex gap-2 w-max">
                  {/* Highlight deslizante (efeito líquido) */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute top-0 rounded-full z-0 shadow-lg"
                    style={{
                      left: hlStyle.left,
                      width: hlStyle.width,
                      height: hlStyle.height,
                      // Gradiente verde e leve brilho para parecer mais "líquido"
                      background: "linear-gradient(90deg, #059669, #10B981)",
                      boxShadow:
                        "0 6px 20px rgba(16,185,129,0.35), inset 0 0 12px rgba(255,255,255,0.15)",
                      opacity: hlReady ? 1 : 0,
                      transition:
                        "left 380ms cubic-bezier(0.22,1,0.36,1), width 380ms cubic-bezier(0.22,1,0.36,1), opacity 220ms ease-out",
                    }}
                  />
                  {/* Triggers (ficam acima do highlight) */}
                  <Tabs.Trigger
                    value="todas"
                    ref={(el) => {
                      if (el) triggerRefs.current.set("todas", el);
                      else triggerRefs.current.delete("todas");
                    }}
                    className={getTriggerClasses("todas")}
                  >
                    Todas
                  </Tabs.Trigger>
                  {categoriesData.map((cat) => (
                    <Tabs.Trigger
                      key={cat.id}
                      value={cat.slug}
                      ref={(el) => {
                        if (el) triggerRefs.current.set(cat.slug, el);
                        else triggerRefs.current.delete(cat.slug);
                      }}
                      className={getTriggerClasses(cat.slug)}
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
      {/* Ocultar barra de rolagem do filtro de categorias (cross-browser) */}
      <style jsx global>{`
        #categories-tabs-list {
          -ms-overflow-style: none; /* IE e Edge */
          scrollbar-width: none; /* Firefox */
        }
        #categories-tabs-list::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
          height: 0;
          width: 0;
        }
      `}</style>
    </section>
  );
}

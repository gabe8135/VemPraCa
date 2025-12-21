// src/app/meus-negocios/page.js
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Um componente simples para exibir cada negócio (você pode estilizar melhor)
function NegocioCard({ negocio, onDelete }) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/negocio/${negocio.id}`);
  };

  return (
    <div
      className="group relative p-0 rounded-3xl shadow-lg bg-white/90 border border-emerald-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Imagem de capa */}
      <div className="relative w-full aspect-[4/2.2] bg-gradient-to-tr from-emerald-100 to-green-50 flex items-center justify-center overflow-hidden">
        <img
          src={
            negocio.imagens && negocio.imagens.length > 0
              ? negocio.imagens[0]
              : "https://via.placeholder.com/300x120?text=Sem+Imagem"
          }
          alt={`Imagem de ${negocio.nome}`}
          className="object-cover w-full h-full transition group-hover:scale-105"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://via.placeholder.com/300x120?text=Erro";
          }}
        />
        {!negocio.ativo && (
          <span className="absolute top-2 left-2 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full shadow">
            Pendente
          </span>
        )}
      </div>
      {/* Conteúdo */}
      <div className="p-5 pb-4 flex flex-col gap-2">
        <h3 className="text-lg md:text-xl font-bold text-emerald-900 group-hover:text-emerald-700 transition-colors line-clamp-2 break-words mb-1">
          {negocio.nome}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-emerald-700/80 mb-1">
          <span>{negocio.cidade}</span>
          {negocio.categorias?.nome && (
            <>
              <span className="mx-1 text-emerald-400">•</span>
              <span>{negocio.categorias.nome}</span>
            </>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <Link
            href={`/meu-negocio/editar/${negocio.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-4 rounded-xl shadow transition-colors z-10 relative"
            onClick={(e) => e.stopPropagation()}
          >
            Editar
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(negocio.id, negocio.nome);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white py-1.5 px-4 rounded-xl shadow transition-colors z-10 relative"
          >
            Excluir
          </button>
          {!negocio.ativo && (
            <Link
              href={`/pagamento-assinatura?negocioId=${negocio.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-4 rounded-xl shadow transition-colors z-10 relative"
              onClick={(e) => e.stopPropagation()}
            >
              Ativar/Assinar
            </Link>
          )}
        </div>
        {!negocio.ativo && (
          <div className="mt-3 text-xs text-orange-700 bg-orange-50 p-2 rounded-xl border border-orange-200">
            Este estabelecimento está pendente de aprovação e não está visível
            publicamente.
            <br />
            Para ativar, clique em <b>Ativar/Assinar</b> e realize o pagamento
            da assinatura.
          </div>
        )}
      </div>
    </div>
  );
}

export default function MeusNegociosPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Função para buscar os negócios do usuário
  const fetchUserBusinesses = useCallback(async (userId) => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: dbError } = await supabase
        .from("negocios")
        .select(
          `
          id,
          nome,
          cidade,
          imagens,
          ativo,
          categorias (nome) 
        `
        ) // Incluindo o nome da categoria
        .eq("usuario_id", userId)
        .order("data_criacao", { ascending: false }); // CORRIGIDO: Usar data_criacao

      if (dbError) {
        // Log detalhado do erro original do Supabase
        console.error("Erro original do Supabase ao buscar negócios:", dbError);
        // Lança um novo erro com uma mensagem mais informativa
        throw new Error(
          dbError.message ||
            `Erro no banco de dados: ${dbError.code || "desconhecido"}`
        );
      }
      setNegocios(data || []);
    } catch (err) {
      // Agora 'err' será uma instância de Error
      console.error("Erro ao buscar negócios do usuário:", err); // Isso deve logar a mensagem do erro
      setError(
        err.message || "Falha ao carregar seus negócios. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Efeito para verificar usuário e buscar negócios
  useEffect(() => {
    const checkUserAndFetchData = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push(
          "/login?message=Você precisa estar logado para ver seus negócios."
        );
        return;
      }
      setUser(session.user);
      fetchUserBusinesses(session.user.id);
    };
    checkUserAndFetchData();
  }, [router, fetchUserBusinesses]);

  const handleDeleteNegocio = async (negocioId, negocioNome) => {
    if (!user) return;
    if (
      window.confirm(
        `Tem certeza que deseja excluir o estabelecimento "${negocioNome}"? Esta ação não pode ser desfeita.`
      )
    ) {
      try {
        // 1. Tentar excluir imagens do Supabase Storage
        const negocioParaExcluir = negocios.find((n) => n.id === negocioId);
        if (
          negocioParaExcluir &&
          negocioParaExcluir.imagens &&
          negocioParaExcluir.imagens.length > 0
        ) {
          const filePaths = negocioParaExcluir.imagens
            .map((url) => {
              // Extrai o caminho do arquivo da URL pública.
              // Ex: "https://<id>.supabase.co/storage/v1/object/public/imagens/public/user_id/arquivo.webp"
              // torna-se "public/user_id/arquivo.webp"
              try {
                const urlObject = new URL(url);
                // O caminho no Supabase Storage geralmente começa após /imagens/ (nome do bucket)
                const pathParts = urlObject.pathname.split("/imagens/");
                if (pathParts.length > 1) {
                  return pathParts[1];
                }
                console.warn(
                  `Não foi possível extrair o caminho do arquivo da URL: ${url}`
                );
                return null;
              } catch (e) {
                console.warn(`URL de imagem inválida encontrada: ${url}`, e);
                return null;
              }
            })
            .filter((path) => path !== null);

          if (filePaths.length > 0) {
            const { error: storageError } = await supabase.storage
              .from("imagens")
              .remove(filePaths);
            if (storageError) {
              console.error(
                "Erro ao excluir imagens do Storage, mas prosseguindo com a exclusão do negócio:",
                storageError
              );
              // Você pode optar por alertar o usuário aqui, mas a exclusão do negócio principal continuará.
              alert(
                `Houve um erro ao tentar remover algumas imagens associadas, mas a exclusão do negócio continuará. Detalhes: ${storageError.message}`
              );
            }
          }
        }

        // 2. Excluir o negócio do banco de dados
        // A exclusão de 'negocio_caracteristicas' ocorrerá em cascata (ON DELETE CASCADE)
        const { error: deleteError } = await supabase
          .from("negocios")
          .delete()
          .eq("id", negocioId)
          .eq("usuario_id", user.id); // Segurança extra
        if (deleteError) throw deleteError;

        setNegocios((prevNegocios) =>
          prevNegocios.filter((n) => n.id !== negocioId)
        );
        alert(`Negócio "${negocioNome}" excluído com sucesso.`);
      } catch (err) {
        console.error("Erro ao excluir negócio:", err);
        alert(`Falha ao excluir o negócio: ${err.message}`);
      }
    }
  };

  if (loading && !user) {
    // Loading inicial antes de saber se há usuário
    return <div className="text-center p-10">Verificando autenticação...</div>;
  }

  return (
    <div className="min-h-screen bg-white pb-16">
      <div className="max-w-5xl mt-28 mx-auto px-4 md:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 pb-4 gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-emerald-900 tracking-tight drop-shadow-sm font-[MyriadPro,Inter,sans-serif]">
            Meus Negócios
          </h1>
          <Link
            href="/meu-negocio"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-5 rounded-xl shadow transition-colors text-base md:text-lg"
          >
            <span className="text-xl leading-none">+</span> Novo Cadastro
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-16">
            <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600 mr-3"></span>
            <span className="text-emerald-700 text-lg font-medium">
              Carregando seus estabelecimentos...
            </span>
          </div>
        )}
        {error && (
          <div className="text-center text-red-600 bg-red-100 p-4 rounded-xl font-medium max-w-xl mx-auto">
            {error}
          </div>
        )}

        {!loading && !error && negocios.length === 0 && (
          <div className="text-center text-emerald-700 bg-emerald-50 p-8 rounded-2xl shadow max-w-xl mx-auto">
            <span className="block text-lg font-semibold mb-2">
              Você ainda não cadastrou nenhum estabelecimento.
            </span>
            <Link
              href="/meu-negocio"
              className="inline-block mt-2 text-emerald-700 hover:text-emerald-900 font-bold underline"
            >
              Clique aqui para cadastrar seu primeiro!
            </Link>
          </div>
        )}

        {!loading && !error && negocios.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {negocios.map((negocio) => (
              <NegocioCard
                key={negocio.id}
                negocio={negocio}
                onDelete={handleDeleteNegocio}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// src/app/meus-negocios/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Um componente simples para exibir cada negócio (você pode estilizar melhor)
function NegocioCard({ negocio, onDelete }) {
  const router = useRouter(); // Adicionamos o router aqui

  const handleCardClick = () => {
    router.push(`/negocio/${negocio.id}`);
  };

  return (
    <div className="p-4 rounded-lg shadow-md bg-white hover:bg-neutral-100 hover:shadow-lg transition-shadow cursor-pointer" onClick={handleCardClick}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-green-900">{negocio.nome}</h3>
          <p className="text-sm text-green-700">{negocio.cidade}</p>
          {negocio.categorias?.nome && ( // Verifica se negocio.categorias existe e tem nome
            <p className="text-sm text-green-600 mt-1">Categoria: {negocio.categorias.nome}</p>
          )}
        </div>
        <img 
          src={negocio.imagens && negocio.imagens.length > 0 ? negocio.imagens[0] : 'https://via.placeholder.com/100?text=Sem+Imagem'} 
          alt={`Imagem de ${negocio.nome}`} 
          className="w-20 h-20 object-cover rounded-md ml-4"
          onError={(e) => {
            e.target.onerror = null; 
            e.target.src = 'https://via.placeholder.com/100?text=Erro';
          }}
        />
      </div>
      <div className="mt-4 flex space-x-2">
        <Link
          href={`/meu-negocio/editar/${negocio.id}`}
          className="text-sm bg-green-600 hover:bg-emerald-600 text-white py-1 px-3 rounded-md transition-colors z-10 relative" // z-10 para garantir que esteja acima
          onClick={(e) => e.stopPropagation()} // Impede que o clique no link propague para o card
        >
          Editar
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation(); // Impede que o clique no botão propague para o card
            onDelete(negocio.id, negocio.nome);
          }}
          className="text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md transition-colors z-10 relative" // z-10 para garantir que esteja acima
        >
          Excluir
        </button>
      </div>
      {!negocio.ativo && (
        <p className="mt-3 text-xs text-orange-600 bg-orange-100 p-2 rounded-md">
          Este estabelecimento está pendente de aprovação e não está visível publicamente.
        </p>
      )}
    </div>
  );
}

export default function MeusNegociosPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Função para buscar os negócios do usuário
  const fetchUserBusinesses = useCallback(async (userId) => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('negocios')
        .select(`
          id,
          nome,
          cidade,
          imagens,
          ativo,
          categorias (nome) 
        `) // Incluindo o nome da categoria
        .eq('usuario_id', userId)
        .order('data_criacao', { ascending: false }); // CORRIGIDO: Usar data_criacao

      if (dbError) {
        // Log detalhado do erro original do Supabase
        console.error("Erro original do Supabase ao buscar negócios:", dbError);
        // Lança um novo erro com uma mensagem mais informativa
        throw new Error(dbError.message || `Erro no banco de dados: ${dbError.code || 'desconhecido'}`);
      }
      setNegocios(data || []);
    } catch (err) { // Agora 'err' será uma instância de Error
      console.error('Erro ao buscar negócios do usuário:', err); // Isso deve logar a mensagem do erro
      setError(err.message || 'Falha ao carregar seus negócios. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Efeito para verificar usuário e buscar negócios
  useEffect(() => {
    const checkUserAndFetchData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push('/login?message=Você precisa estar logado para ver seus negócios.');
        return;
      }
      setUser(session.user);
      fetchUserBusinesses(session.user.id);
    };
    checkUserAndFetchData();
  }, [router, fetchUserBusinesses]);

  const handleDeleteNegocio = async (negocioId, negocioNome) => {
    if (!user) return;
    if (window.confirm(`Tem certeza que deseja excluir o estabelecimento "${negocioNome}"? Esta ação não pode ser desfeita.`)) {
      try {
        // 1. Tentar excluir imagens do Supabase Storage
        const negocioParaExcluir = negocios.find(n => n.id === negocioId);
        if (negocioParaExcluir && negocioParaExcluir.imagens && negocioParaExcluir.imagens.length > 0) {
          const filePaths = negocioParaExcluir.imagens.map(url => {
            // Extrai o caminho do arquivo da URL pública.
            // Ex: "https://<id>.supabase.co/storage/v1/object/public/imagens/public/user_id/arquivo.webp"
            // torna-se "public/user_id/arquivo.webp"
            try {
              const urlObject = new URL(url);
              // O caminho no Supabase Storage geralmente começa após /imagens/ (nome do bucket)
              const pathParts = urlObject.pathname.split('/imagens/');
              if (pathParts.length > 1) {
                return pathParts[1];
              }
              console.warn(`Não foi possível extrair o caminho do arquivo da URL: ${url}`);
              return null;
            } catch (e) {
              console.warn(`URL de imagem inválida encontrada: ${url}`, e);
              return null;
            }
          }).filter(path => path !== null);

          if (filePaths.length > 0) {
            const { error: storageError } = await supabase.storage.from('imagens').remove(filePaths);
            if (storageError) {
              console.error('Erro ao excluir imagens do Storage, mas prosseguindo com a exclusão do negócio:', storageError);
              // Você pode optar por alertar o usuário aqui, mas a exclusão do negócio principal continuará.
              alert(`Houve um erro ao tentar remover algumas imagens associadas, mas a exclusão do negócio continuará. Detalhes: ${storageError.message}`);
            }
          }
        }

        // 2. Excluir o negócio do banco de dados
        // A exclusão de 'negocio_caracteristicas' ocorrerá em cascata (ON DELETE CASCADE)
        const { error: deleteError } = await supabase
          .from('negocios')
          .delete()
          .eq('id', negocioId)
          .eq('usuario_id', user.id); // Segurança extra
        if (deleteError) throw deleteError;

        setNegocios(prevNegocios => prevNegocios.filter(n => n.id !== negocioId));
        alert(`Negócio "${negocioNome}" excluído com sucesso.`);
      } catch (err) {
        console.error('Erro ao excluir negócio:', err);
        alert(`Falha ao excluir o negócio: ${err.message}`);
      }
    }
  };

  if (loading && !user) { // Loading inicial antes de saber se há usuário
    return <div className="text-center p-10">Verificando autenticação...</div>;
  }
  
  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      <div className="flex justify-between items-center mb-8 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Meus Negocios</h1>
        <Link href="/meu-negocio" className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-2 mx-1 rounded-md transition-colors button-primary">
          + Novo Cadastro
        </Link>
      </div>

      {loading && <p className="text-center text-gray-600">Carregando seus estabelecimentos...</p>}
      {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      
      {!loading && !error && negocios.length === 0 && (
        <p className="text-center text-gray-600 bg-blue-50 p-6 rounded-md">Você ainda não cadastrou nenhum estabelecimento. <Link href="/meu-negocio" className="text-green-600 hover:text-green-700 font-semibold">Clique aqui para cadastrar seu primeiro!</Link></p>
      )}

      {!loading && !error && negocios.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {negocios.map(negocio => (
            <NegocioCard key={negocio.id} negocio={negocio} onDelete={handleDeleteNegocio} />
          ))}
        </div>
      )}
    </div>
  );
}
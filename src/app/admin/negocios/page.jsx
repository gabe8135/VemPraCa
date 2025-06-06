'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaEdit, FaTrash, FaToggleOn, FaToggleOff } from 'react-icons/fa';

export default function AdminNegociosPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Guardo o ID do negócio que está tendo o status 'ativo' alterado, para mostrar o loading no botão certo.
  const [togglingId, setTogglingId] = useState(null);
  // E aqui o ID do negócio que está sendo deletado, também para o loading.
  const [deletingId, setDeletingId] = useState(null);

  // Preciso de uma função para checar se o usuário logado é 'admin'.
  const checkUserRole = useCallback(async (userId) => {
    if (!userId) return false;
    try {
      const { data, error } = await supabase
        .from('profiles') // Minha tabela de perfis de usuário.
        .select('role')
        .eq('id', userId)
        .single();
      // Se o perfil não for encontrado, não é um erro fatal, só não é admin.
      if (error && error.code !== 'PGRST116') { throw error; }
      return data?.role === 'admin';
    } catch (err) {
      console.error("Erro ao verificar role do usuário:", err);
      return false;
    }
  }, []); // Uso useCallback porque essa função não muda entre renders.

  // Efeito principal: verificar autenticação, permissão de admin e buscar os negócios.
  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      setLoading(true);
      setError(null);

      // 1. Verifico se tem sessão ativa.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push('/login?message=Acesso restrito a administradores.'); // Se não, mando pro login.
        return;
      }
      setUser(session.user);

      // 2. Verifico se o usuário da sessão é admin.
      const isAdminUser = await checkUserRole(session.user.id);
      setIsAdmin(isAdminUser);
      if (!isAdminUser) {
        setError('Acesso negado. Você não tem permissão para ver esta página.');
        setLoading(false);
        // Poderia redirecionar para a home aqui também, se quisesse: router.push('/');
        return;
      }

      // 3. Se for admin, busco TODOS os negócios.
      try {
        const { data, error: fetchError } = await supabase
          .from('negocios') // Tabela principal dos negócios.
          .select(` 
            id,
            nome,
            cidade,
            ativo,
            usuario_id,
            imagens,
            proprietario
          `)
          .order('nome', { ascending: true });

        if (fetchError) throw fetchError;
        setBusinesses(data || []);

      } catch (err) {
        console.error("Erro detalhado ao buscar negócios:", err); // Logamos o objeto de erro completo para inspeção.
        let errorMessage = "Ocorreu um erro desconhecido ao buscar os estabelecimentos.";
        if (err && typeof err.message === 'string' && err.message.trim() !== '') {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null && Object.keys(err).length > 0) {
          errorMessage = `Erro: ${JSON.stringify(err)}. Verifique o console do navegador para mais detalhes.`;
        }
        setError(`Erro ao carregar estabelecimentos: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchData();
  }, [router, checkUserRole]); // Dependências do efeito: router e a função checkUserRole.

  // Função para ativar ou desativar um negócio.
  const handleToggleAtivo = async (negocioId, currentStatus) => {
    setTogglingId(negocioId); // Para mostrar o loading no botão certo.
    setError(null);
    const newStatus = !currentStatus; // Simplesmente inverto o status atual.

    try {
      const { error: updateError } = await supabase
        .from('negocios')
        .update({ ativo: newStatus, data_atualizacao: new Date().toISOString() }) // Atualizo o status e a data.
        .eq('id', negocioId);

      if (updateError) throw updateError;

      // Atualizo meu estado local para a UI refletir a mudança na hora.
      setBusinesses(prev =>
        prev.map(b => (b.id === negocioId ? { ...b, ativo: newStatus } : b))
      );
      console.log(`Negócio ${negocioId} ${newStatus ? 'ativado' : 'desativado'}.`);

    } catch (err) {
      console.error(`Erro ao ${newStatus ? 'ativar' : 'desativar'} negócio:`, err);
      setError(`Falha ao atualizar status: ${err.message}`);
    } finally {
      setTogglingId(null); // Tiro o loading do botão.
    }
  };

  // Função para deletar um negócio.
  // Lembrete: é parecida com a que tenho na página de detalhes do negócio.
  const handleDeleteNegocio = async (negocioId, negocioImagens) => {
    setDeletingId(negocioId); // Loading no botão de deletar.
    setError(null);

    const confirmed = window.confirm("ATENÇÃO: Excluir este estabelecimento removerá TODOS os seus dados e imagens permanentemente. Continuar?");
    if (!confirmed) {
      setDeletingId(null);
      return;
    }

    try {
      // 1. Deleto as imagens do Storage primeiro. É opcional, mas recomendado para não deixar lixo.
      // Verifico se 'negocioImagens' existe e tem itens.
      if (negocioImagens && negocioImagens.length > 0) {
        const filePaths = negocioImagens.map(url => {
          try {
            // Preciso extrair o caminho do arquivo a partir da URL completa.
            const urlParts = new URL(url);
            // O caminho no Supabase Storage geralmente começa depois do nome do bucket e da pasta 'public'.
            // No meu caso, as imagens estão em 'imagens/nome-da-pasta-do-usuario/nome-do-arquivo'.
            // A URL que vem do banco é algo como: `https://[id-projeto].supabase.co/storage/v1/object/public/imagens/nome-da-pasta-do-usuario/nome-do-arquivo.jpg`
            // Então, preciso pegar a parte depois de `/imagens/`.
            const pathStartIndex = urlParts.pathname.indexOf('/imagens/') + '/imagens/'.length;
            return urlParts.pathname.substring(pathStartIndex);
          } catch { return null; } // Se a URL for inválida, ignoro.
        }).filter(Boolean); // Removo quaisquer nulos que possam ter surgido.

        if (filePaths.length > 0) {
          console.log("Tentando deletar estas imagens do storage:", filePaths);
          const { error: storageError } = await supabase.storage.from('imagens').remove(filePaths);
          // Se der erro ao deletar imagens, só aviso no console mas continuo,
          // porque o principal é deletar o registro do banco.
          if (storageError) console.error("Erro ao deletar imagens do storage (vou continuar mesmo assim):", storageError);
        }
      }

      // 2. Deleto o registro do negócio da tabela 'negocios'.
      const { error: deleteError } = await supabase
        .from('negocios')
        .delete()
        .eq('id', negocioId);

      if (deleteError) throw deleteError;

      // Removo o negócio da minha lista local para atualizar a UI.
      setBusinesses(prev => prev.filter(b => b.id !== negocioId));
      alert('Estabelecimento excluído com sucesso!');

    } catch (err) {
      console.error("Erro ao excluir negócio:", err);
      setError(`Falha ao excluir: ${err.message}`);
    } finally {
      setDeletingId(null); // Tiro o loading do botão.
    }
  };


  // --- Minha lógica de renderização ---
  if (loading) return <div className="text-center p-10">Carregando painel...</div>;
  // Se houver erro (de acesso negado ou outro), mostro aqui.
  if (error) return <div className="p-6 text-red-600 bg-red-100 rounded-md text-center">Erro: {error}</div>;
  // Uma checagem extra de segurança: se não for admin, não mostro nada.
  if (!isAdmin) return <div className="text-center p-10">Acesso Negado.</div>;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Painel de Administração - Estabelecimentos</h1>

      {/* Aqui vai a tabela ou lista dos negócios. */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cidade</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome Proprietário</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {businesses.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">Nenhum estabelecimento cadastrado.</td>
              </tr>
            )}
            {businesses.map((business) => (
              <tr
                key={business.id}
                className="hover:bg-gray-100 cursor-pointer"
                onClick={() => router.push(`/negocio/${business.id}`)} // Navega ao clicar na linha
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{business.nome}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{business.cidade}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {business.proprietario || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    business.ativo ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {business.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                  {/* Botão para Ativar/Desativar */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Impede que o clique na linha seja acionado
                      handleToggleAtivo(business.id, business.ativo);
                    }}
                    disabled={togglingId === business.id} // Desabilito se já estiver alterando este.
                    className={`p-1 rounded transition duration-150 ease-in-out disabled:opacity-50 ${
                      business.ativo
                        ? 'text-yellow-600 hover:text-yellow-900 hover:bg-yellow-100'
                        : 'text-green-600 hover:text-green-900 hover:bg-green-100'
                    }`}
                    title={business.ativo ? 'Desativar' : 'Ativar'}
                  >
                    {togglingId === business.id ? ( // Mostro o spinner se estiver carregando.
                      <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : business.ativo ? (
                      <FaToggleOn className="h-5 w-5" />
                    ) : (
                      <FaToggleOff className="h-5 w-5" />
                    )}
                  </button>

                  {/* Botão para Editar */}
                  <Link
                    href={`/meu-negocio/editar/${business.id}`} // Leva para a página de edição do negócio específico.
                    className="text-blue-600 hover:text-blue-900 hover:bg-blue-100 p-1 rounded inline-block"
                    onClick={(e) => {
                      e.stopPropagation(); // Impede que o clique na linha seja acionado
                    }}
                    title="Editar"
                  >
                    <FaEdit className="h-5 w-5" />
                  </Link>

                  {/* Botão para Excluir */}
                  <button
                    // Chamo a função de deletar, passando o ID e as imagens (caso precise deletar do storage).
                    onClick={(e) => {
                      e.stopPropagation(); // Impede que o clique na linha seja acionado
                      handleDeleteNegocio(business.id, business.imagens);
                    }}
                    disabled={deletingId === business.id} // Desabilito se já estiver deletando este.
                    className="text-red-600 hover:text-red-900 hover:bg-red-100 p-1 rounded disabled:opacity-50"
                    title="Excluir"
                  >
                    {deletingId === business.id ? ( // Spinner de loading.
                      <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      <FaTrash className="h-5 w-5" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

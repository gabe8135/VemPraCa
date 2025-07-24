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
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const checkUserRole = useCallback(async (userId) => {
    if (!userId) return false;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (error && error.code !== 'PGRST116') { throw error; }
      return data?.role === 'admin';
    } catch (err) {
      console.error("Erro ao verificar role do usuário:", err);
      return false;
    }
  }, []);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      setLoading(true);
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push('/login?message=Acesso restrito a administradores.');
        return;
      }
      setUser(session.user);

      const isAdminUser = await checkUserRole(session.user.id);
      setIsAdmin(isAdminUser);
      if (!isAdminUser) {
        setError('Acesso negado. Você não tem permissão para ver esta página.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('negocios')
          .select(`
            id,
            nome,
            cidade,
            ativo,
            usuario_id,
            imagens,
            proprietario,
            email_proprietario,
            criado_por_admin,
            categorias(nome)
          `)
          .order('nome', { ascending: true });

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
          const userIds = data
            .map(n => n.usuario_id)
            .filter(Boolean);

          let profilesData = [];
          if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, nome_proprietario, email')
              .in('id', userIds);

            if (profilesError) {
              console.warn('Erro ao buscar profiles:', profilesError);
            } else {
              profilesData = profiles || [];
            }
          }

          const businessesComProfiles = data.map(business => ({
            ...business,
            profiles: profilesData.find(p => p.id === business.usuario_id) || null
          }));

          setBusinesses(businessesComProfiles);
        } else {
          setBusinesses(data || []);
        }

      } catch (err) {
        console.error("Erro detalhado ao buscar negócios:", err);
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
  }, [router, checkUserRole]);

  const handleToggleAtivo = async (negocioId, currentStatus) => {
    setTogglingId(negocioId);
    setError(null);
    const newStatus = !currentStatus;

    try {
      const { error: updateError } = await supabase
        .from('negocios')
        .update({ ativo: newStatus, data_atualizacao: new Date().toISOString() })
        .eq('id', negocioId);

      if (updateError) throw updateError;

      setBusinesses(prev =>
        prev.map(b => (b.id === negocioId ? { ...b, ativo: newStatus } : b))
      );
      console.log(`Negócio ${negocioId} ${newStatus ? 'ativado' : 'desativado'}.`);

    } catch (err) {
      console.error(`Erro ao ${newStatus ? 'ativar' : 'desativar'} negócio:`, err);
      setError(`Falha ao atualizar status: ${err.message}`);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteNegocio = async (negocioId, negocioImagens) => {
    setDeletingId(negocioId);
    setError(null);

    const confirmed = window.confirm("ATENÇÃO: Excluir este estabelecimento removerá TODOS os seus dados e imagens permanentemente. Continuar?");
    if (!confirmed) {
      setDeletingId(null);
      return;
    }

    try {
      if (negocioImagens && negocioImagens.length > 0) {
        const filePaths = negocioImagens.map(url => {
          try {
            const urlParts = new URL(url);
            const pathStartIndex = urlParts.pathname.indexOf('/imagens/') + '/imagens/'.length;
            return urlParts.pathname.substring(pathStartIndex);
          } catch { return null; }
        }).filter(Boolean);

        if (filePaths.length > 0) {
          console.log("Tentando deletar estas imagens do storage:", filePaths);
          const { error: storageError } = await supabase.storage.from('imagens').remove(filePaths);
          if (storageError) console.error("Erro ao deletar imagens do storage (vou continuar mesmo assim):", storageError);
        }
      }

      const { error: deleteError } = await supabase
        .from('negocios')
        .delete()
        .eq('id', negocioId);

      if (deleteError) throw deleteError;

      setBusinesses(prev => prev.filter(b => b.id !== negocioId));
      alert('Estabelecimento excluído com sucesso!');

    } catch (err) {
      console.error("Erro ao excluir negócio:", err);
      setError(`Falha ao excluir: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="text-center p-10">Carregando painel...</div>;
  if (error) return <div className="p-6 text-red-600 bg-red-100 rounded-md text-center">Erro: {error}</div>;
  if (!isAdmin) return <div className="text-center p-10">Acesso Negado.</div>;

  return (
    <div className="w-full max-w-full overflow-hidden">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-gray-800">Painel Admin - Estabelecimentos</h1>

      {/* Tabela com espaçamento reduzido */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-yellow-300 to-amber-400">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-sm font-bold text-green-800 uppercase tracking-wider">
                  Estabelecimento
                </th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-bold text-green-800 uppercase tracking-wider hidden sm:table-cell">
                  Proprietário
                </th>
                <th scope="col" className="px-3 py-3 text-center text-sm font-bold text-green-800 uppercase tracking-wider">
                  Cidade
                </th>
                <th scope="col" className="px-2 py-3 text-center text-sm font-bold text-green-800 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-2 py-3 text-center text-sm font-bold text-green-800 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {businesses.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    Nenhum estabelecimento cadastrado.
                  </td>
                </tr>
              )}
              {businesses.map((business) => (
                <tr
                  key={business.id}
                  className="hover:bg-green-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/negocio/${business.id}`)}
                >
                  {/* Coluna Nome - Espaçamento reduzido */}
                  <td className="px-3 py-3">
                    <div className="text-base font-medium text-gray-900 break-words leading-tight max-w-xs">
                      {business.nome}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {business.categorias?.nome || 'Sem categoria'}
                    </div>
                    {/* Info do proprietário em telas pequenas */}
                    <div className="sm:hidden text-sm text-gray-600 mt-1">
                      👤 {business.proprietario || 'N/A'}
                    </div>
                  </td>

                  {/* Coluna Proprietário - Espaçamento reduzido */}
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <div className="text-sm max-w-xs">
                      <div className="font-medium text-gray-900 break-words leading-tight">
                        {business.proprietario || 'N/A'}
                      </div>
                      {business.email_proprietario && (
                        <div className="text-sm text-gray-500 truncate" title={business.email_proprietario}>
                          {business.email_proprietario}
                        </div>
                      )}
                      {/* Badges compactos */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {business.usuario_id && business.profiles && (
                          <span className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded">
                            👤
                          </span>
                        )}
                        {business.criado_por_admin && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">
                            🔧
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Coluna Cidade */}
                  <td className="px-3 py-3 text-center">
                    <div className="text-sm text-gray-900 break-words leading-tight max-w-20">
                      {business.cidade}
                    </div>
                  </td>

                  {/* Coluna Status */}
                  <td className="px-2 py-3 text-center">
                    <span className={`px-2 py-1 text-sm font-semibold rounded-full whitespace-nowrap ${
                      business.ativo ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {business.ativo ? '✓' : '✗'}
                    </span>
                  </td>

                  {/* Coluna Ações - Espaçamento reduzido */}
                  <td className="px-2 py-3">
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-1">
                      {/* Botão Toggle Status */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAtivo(business.id, business.ativo);
                        }}
                        disabled={togglingId === business.id}
                        className={`p-1.5 rounded transition duration-150 ease-in-out disabled:opacity-50 ${
                          business.ativo
                            ? 'text-yellow-600 hover:text-yellow-900 hover:bg-yellow-100'
                            : 'text-green-600 hover:text-green-900 hover:bg-green-100'
                        }`}
                        title={business.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {togglingId === business.id ? (
                          <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : business.ativo ? (
                          <FaToggleOn className="h-4 w-4" />
                        ) : (
                          <FaToggleOff className="h-4 w-4" />
                        )}
                      </button>

                      {/* Botão Editar */}
                      <Link
                        href={`/meu-negocio/editar/${business.id}`}
                        className="text-blue-600 hover:text-blue-900 hover:bg-blue-100 p-1.5 rounded inline-block"
                        onClick={(e) => e.stopPropagation()}
                        title="Editar"
                      >
                        <FaEdit className="h-4 w-4" />
                      </Link>

                      {/* Botão Excluir */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNegocio(business.id, business.imagens);
                        }}
                        disabled={deletingId === business.id}
                        className="text-red-600 hover:text-red-900 hover:bg-red-100 p-1.5 rounded disabled:opacity-50"
                        title="Excluir"
                      >
                        {deletingId === business.id ? (
                          <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <FaTrash className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
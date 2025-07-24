'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { FaUserPlus, FaSearch } from 'react-icons/fa';

export default function AdminGerenciarNegociosPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [negocios, setNegocios] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingNegocios, setLoadingNegocios] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [transferStatus, setTransferStatus] = useState({});
  const [isTransferring, setIsTransferring] = useState(false);

  const checkUserRole = useCallback(async (userId) => {
    if (!userId) return false;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data?.role === 'admin';
    } catch (err) {
      console.error("Erro ao verificar role do usuário:", err);
      return false;
    }
  }, []);

  useEffect(() => {
    const initializePage = async () => {
      setLoadingPage(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push('/login?message=Você precisa estar logado.');
        return;
      }

      const isAdminUser = await checkUserRole(session.user.id);
      if (!isAdminUser) {
        router.push('/?message=Acesso negado. Você não tem permissão para acessar esta página.');
        return;
      }

      setUser(session.user);
      setIsAdmin(true);
      await Promise.all([fetchNegocios(), fetchAllUsers()]);
      setLoadingPage(false);
    };

    initializePage();
  }, [router, checkUserRole]);

  const fetchNegocios = async () => {
    setLoadingNegocios(true);
    try {
      // Query corrigida com os nomes corretos das colunas
      const { data, error } = await supabase
        .from('negocios')
        .select(`
          id, nome, cidade, proprietario, endereco, descricao,
          telefone, whatsapp, website, email_proprietario,
          usuario_id, data_criacao, ativo, criado_por_admin,
          admin_criador_id,
          categorias(id, nome)
        `)
        .order('data_criacao', { ascending: false }); // Usar data_criacao em vez de created_at

      console.log('Query result:', { data, error }); // DEBUG

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Se temos negócios, buscar os perfis dos usuários separadamente
      if (data && data.length > 0) {
        const userIds = data
          .map(n => n.usuario_id)
          .filter(Boolean); // Remove valores null/undefined

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

        // Combinar os dados manualmente
        const negociosComProfiles = data.map(negocio => ({
          ...negocio,
          profiles: profilesData.find(p => p.id === negocio.usuario_id) || null
        }));

        console.log('Negócios encontrados:', negociosComProfiles.length); // DEBUG
        console.log('Primeiro negócio:', negociosComProfiles[0]); // DEBUG
        
        setNegocios(negociosComProfiles);
      } else {
        console.log('Nenhum negócio encontrado');
        setNegocios([]);
      }

    } catch (err) {
      console.error("Erro ao buscar negócios:", err);
      console.error("Erro detalhado:", err.message); // DEBUG mais específico
      setTransferStatus(prev => ({ 
        ...prev, 
        general: { message: `Erro ao carregar: ${err.message}`, type: 'error' }
      }));
    } finally {
      setLoadingNegocios(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome_proprietario, email')
        .order('nome_proprietario');

      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
    }
  };

  const handleTransferOwnership = async (negocioId, newOwnerId) => {
    if (!newOwnerId) {
      setTransferStatus(prev => ({ 
        ...prev, 
        [negocioId]: { message: 'Selecione um proprietário', type: 'error' } 
      }));
      return;
    }

    setIsTransferring(true);
    try {
      // Atualizar apenas o usuario_id (sem criado_por_admin por enquanto)
      const { error } = await supabase
        .from('negocios')
        .update({ usuario_id: newOwnerId })
        .eq('id', negocioId);

      if (error) throw error;

      setTransferStatus(prev => ({ 
        ...prev, 
        [negocioId]: { message: 'Propriedade transferida com sucesso!', type: 'success' }
      }));

      // Atualizar a lista
      await fetchNegocios();

      // Limpar a mensagem após 3 segundos
      setTimeout(() => {
        setTransferStatus(prev => ({ ...prev, [negocioId]: {} }));
      }, 3000);

    } catch (err) {
      console.error("Erro ao transferir propriedade:", err);
      setTransferStatus(prev => ({ 
        ...prev, 
        [negocioId]: { message: err.message || 'Erro ao transferir propriedade', type: 'error' }
      }));
    } finally {
      setIsTransferring(false);
    }
  };

  const filteredNegocios = negocios.filter(negocio => {
    const searchLower = searchTerm.toLowerCase();
    
    return negocio.nome.toLowerCase().includes(searchLower) ||
           negocio.cidade.toLowerCase().includes(searchLower) ||
           negocio.proprietario.toLowerCase().includes(searchLower) ||
           (negocio.email_proprietario && negocio.email_proprietario.toLowerCase().includes(searchLower)) ||
           negocio.categorias?.nome?.toLowerCase().includes(searchLower) ||
           negocio.profiles?.nome_proprietario?.toLowerCase().includes(searchLower) ||
           negocio.profiles?.email?.toLowerCase().includes(searchLower);
  });

  const getMatchLevel = (user, negocio) => {
    const userEmail = user.email?.toLowerCase().trim();
    const proprietarioEmail = negocio.email_proprietario?.toLowerCase().trim();
    const userNome = user.nome_proprietario?.toLowerCase().trim();
    const proprietarioNome = negocio.proprietario?.toLowerCase().trim();

    if (userEmail && proprietarioEmail && userEmail === proprietarioEmail) {
      return { level: 'exact-email', label: '✅ EMAIL CORRESPONDENTE', priority: 1 };
    }
    if (userNome && proprietarioNome && userNome === proprietarioNome) {
      return { level: 'exact-name', label: '⭐ NOME IGUAL', priority: 2 };
    }
    if (userNome && proprietarioNome && 
        (userNome.includes(proprietarioNome) || proprietarioNome.includes(userNome))) {
      return { level: 'similar-name', label: '🔍 NOME SIMILAR', priority: 3 };
    }
    return { level: 'none', label: '', priority: 4 };
  };

  if (loadingPage) {
    return <div className="text-center p-10">Carregando painel administrativo...</div>;
  }

  if (!isAdmin) {
    return <div className="text-center p-10">Acesso negado.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gerenciar e Transferir Negócios</h1>
          <p className="text-gray-600 mt-2">
            Transfira a propriedade de negócios cadastrados pelo admin para os verdadeiros donos
          </p>
        </div>
      </div>

      {/* Filtro de busca */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-3">
          <FaSearch className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome do negócio, cidade, proprietário ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* Erro geral */}
      {transferStatus.general?.message && (
        <div className={`p-4 mb-6 rounded-md text-center ${
          transferStatus.general.type === 'success' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {transferStatus.general.message}
          <button 
            onClick={() => setTransferStatus(prev => ({ ...prev, general: {} }))}
            className="ml-4 underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Lista de negócios */}
      <div className="space-y-4">
        {loadingNegocios ? (
          <div className="text-center p-10">Carregando negócios...</div>
        ) : filteredNegocios.length === 0 ? (
          <div className="text-center p-10 text-gray-500">
            {searchTerm 
              ? 'Nenhum negócio encontrado com o termo buscado.'
              : 'Nenhum negócio cadastrado ainda.'
            }
          </div>
        ) : (
          filteredNegocios.map((negocio) => (
            <div key={negocio.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Informações do negócio */}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {negocio.nome}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Categoria:</span> {negocio.categorias?.nome || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Cidade:</span> {negocio.cidade}
                    </div>
                    <div>
                      <span className="font-medium">Nome do Proprietário:</span> 
                      <span className="ml-1 font-semibold text-gray-800">
                        {negocio.proprietario}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Email do Proprietário:</span> 
                      <span className="ml-1">
                        {negocio.email_proprietario || 'Não informado'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Data de Criação:</span> {
                        negocio.data_criacao 
                          ? new Date(negocio.data_criacao).toLocaleDateString('pt-BR')
                          : 'N/A'
                      }
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> 
                      <span className={`ml-1 font-medium ${negocio.ativo ? 'text-green-600' : 'text-red-600'}`}>
                        {negocio.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status da vinculação na plataforma */}
                  <div className="mt-4 p-4 bg-gray-50 border-l-4 border-gray-300 rounded-md">
                    <h5 className="font-medium text-gray-800 mb-2">Status na Plataforma:</h5>
                    
                    {negocio.usuario_id ? (
                      <div className="text-sm">
                        <div className="flex items-center gap-2 text-green-700 mb-1">
                          ✅ <strong>Vinculado a um usuário da plataforma</strong>
                        </div>
                        <div className="ml-6 text-gray-600">
                          <div><strong>Usuário:</strong> {negocio.profiles?.nome_proprietario || 'Nome não definido'}</div>
                          <div><strong>Email:</strong> {negocio.profiles?.email}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <div className="flex items-center gap-2 text-yellow-700 mb-1">
                          ⚠️ <strong>Não vinculado a nenhum usuário</strong>
                        </div>
                        <div className="ml-6 text-gray-600">
                          O proprietário ainda não tem conta na plataforma ou não foi vinculado
                        </div>
                      </div>
                    )}
                    
                    {negocio.criado_por_admin && (
                      <div className="mt-2 text-xs text-blue-600">
                        ℹ️ Este negócio foi cadastrado pelo administrador
                      </div>
                    )}
                  </div>
                </div>

                {/* Seção de transferência */}
                <div className="lg:w-80 lg:pl-6">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaUserPlus className="text-green-600" />
                    Transferir Propriedade
                  </h4>
                  
                  {/* Dica sobre correspondência por email */}
                  {negocio.email_proprietario && (
                    <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-xs text-blue-700">
                        📧 <strong>Buscando por:</strong> {negocio.email_proprietario}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <select
                      id={`owner-${negocio.id}`}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      disabled={isTransferring}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Selecione o usuário da plataforma
                      </option>
                      
                      {/* Ordenar usuários por prioridade de correspondência */}
                      {allUsers
                        .map(user => ({
                          ...user,
                          match: getMatchLevel(user, negocio)
                        }))
                        .sort((a, b) => a.match.priority - b.match.priority)
                        .map(user => (
                          <option 
                            key={user.id} 
                            value={user.id}
                            style={{
                              backgroundColor: 
                                user.match.level === 'exact-email' ? '#dcfce7' : // Verde claro
                                user.match.level === 'exact-name' ? '#fef3c7' :   // Amarelo claro
                                user.match.level === 'similar-name' ? '#f3f4f6' : // Cinza claro
                                'white'
                            }}
                          >
                            {user.match.label && `${user.match.label} `}
                            {user.nome_proprietario || 'Nome não definido'} ({user.email})
                          </option>
                        ))
                    }
                    </select>

                    {/* Mostrar estatísticas de correspondência */}
                    <div className="text-xs text-gray-600">
                      {(() => {
                        const exactEmailMatches = allUsers.filter(u => getMatchLevel(u, negocio).level === 'exact-email').length;
                        const exactNameMatches = allUsers.filter(u => getMatchLevel(u, negocio).level === 'exact-name').length;
                        const similarNameMatches = allUsers.filter(u => getMatchLevel(u, negocio).level === 'similar-name').length;
                        
                        return (
                          <div className="space-y-1">
                            {exactEmailMatches > 0 && (
                              <div className="text-green-700 font-medium">
                                ✅ {exactEmailMatches} usuário(s) com email correspondente
                              </div>
                            )}
                            {exactNameMatches > 0 && (
                              <div className="text-yellow-700">
                                ⭐ {exactNameMatches} usuário(s) com nome igual
                              </div>
                            )}
                            {similarNameMatches > 0 && (
                              <div className="text-gray-600">
                                🔍 {similarNameMatches} usuário(s) com nome similar
                              </div>
                            )}
                            {exactEmailMatches === 0 && exactNameMatches === 0 && similarNameMatches === 0 && (
                              <div className="text-red-600">
                                ⚠️ Nenhuma correspondência automática encontrada
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    
                    <button
                      onClick={() => {
                        const selectElement = document.getElementById(`owner-${negocio.id}`);
                        handleTransferOwnership(negocio.id, selectElement.value);
                      }}
                      disabled={isTransferring}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTransferring ? 'Transferindo...' : 'Transferir Propriedade'}
                    </button>

                    {/* Status da transferência */}
                    {transferStatus[negocio.id]?.message && (
                      <div className={`p-3 rounded-md text-sm text-center ${
                        transferStatus[negocio.id].type === 'success' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transferStatus[negocio.id].message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Estatísticas */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sem Proprietário</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {negocios.filter(n => !n.usuario_id).length}
          </p>
          <p className="text-sm text-gray-600 mt-1">Precisam ser transferidos</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Criados pelo Admin</h3>
          <p className="text-3xl font-bold text-blue-600">
            {negocios.filter(n => n.criado_por_admin).length}
          </p>
          <p className="text-sm text-gray-600 mt-1">Cadastrados via painel</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Com Email</h3>
          <p className="text-3xl font-bold text-green-600">
            {negocios.filter(n => n.email_proprietario && n.email_proprietario.trim() !== '').length}
          </p>
          <p className="text-sm text-gray-600 mt-1">Têm email para busca</p>
        </div>
      </div>
    </div>
  );
}
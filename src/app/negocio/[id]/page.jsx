// src/app/negocio/[id]/page.jsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabaseClient';
// Meus Ícones (Posso adicionar mais conforme necessário).
import { FaWhatsapp, FaWifi, FaParking, FaDog, FaConciergeBell, FaWheelchair, FaCampground, FaMapMarkerAlt, FaEdit, FaGlobe, FaTrash } from 'react-icons/fa';
import { FiPhone, FiCoffee, FiWind } from 'react-icons/fi';
import { MdRestaurant, MdAcUnit, MdPool, MdRoomService, MdOutlineStar, MdOutlineStarBorder } from 'react-icons/md';
// Swiper para o carrossel de imagens.
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Scrollbar, A11y, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import RatingForm from '@/app/components/RatingForm'; // Importar o formulário de avaliação
import AcessosChart from '@/app/components/AcessosChart'; // 1. Importar o componente do gráfico

// --- Meu Componente Estrelas Display (Reutilizado de outros lugares) ---
function EstrelasDisplay({ media = 0, total = 0 }) {
    const estrelas = [];
    const notaArredondada = Math.round(media * 2) / 2; // Para permitir meia estrela.
    for (let i = 1; i <= 5; i++) {
        if (i <= notaArredondada) estrelas.push(<MdOutlineStar key={i} className="text-yellow-500" />);
        else if (i - 0.5 === notaArredondada) estrelas.push(<MdOutlineStar key={i} className="text-yellow-500 opacity-50" />); // Meia estrela.
        else estrelas.push(<MdOutlineStarBorder key={i} className="text-yellow-500" />);
    }
    return (
        <div className="flex items-center gap-1">
            {estrelas}
            <span className="text-sm text-gray-500 ml-1">({media > 0 ? media.toFixed(1) : 'N/A'} - {total} {total === 1 ? 'avaliação' : 'avaliações'})</span>
        </div>
    );
}

// --- Meu mapeamento de Ícones para Características (Exemplo) ---
// Lembrete: Preciso ajustar isso com base nos nomes exatos das minhas características no banco.
const caracteristicaIconMap = {
    'Wi-Fi Grátis': FaWifi,
    'Estacionamento': FaParking,
    'Aceita Pets': FaDog,
    'Piscina': MdPool,
    'Restaurante': MdRestaurant,
    'Ar Condicionado': MdAcUnit,
    'Serviço de Quarto': MdRoomService,
    'Acessibilidade': FaWheelchair,
    'Café da Manhã': FiCoffee,
    // Lembrete: Adicionar mais mapeamentos aqui conforme crio novas características.
};

export default function DetalhesNegocioPage() {
  const { id: negocioId } = useParams(); // Pego o ID do negócio da URL.
  const router = useRouter();
  const [negocio, setNegocio] = useState(null);
  const [caracteristicasNegocio, setCaracteristicasNegocio] = useState([]);
  const [avaliacoesNegocio, setAvaliacoesNegocio] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // Meu estado para controlar o loading da exclusão.
  const [cliqueStats, setCliqueStats] = useState(null);
  const [dataVersion, setDataVersion] = useState(0); // Estado para forçar re-fetch
  const [loadingCliques, setLoadingCliques] = useState(false);

  // --- Minha função para verificar Role (Admin) ---
  const checkUserRole = async (userId) => {
    if (!userId) return false; try { const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single(); if (error && error.code !== 'PGRST116') { throw error; } return data?.role === 'admin'; } catch (err) { console.error("Erro ao verificar role:", err); return false; }
  };

  // --- Minha função para registrar o acesso a esta página de negócio ---
  const registrarAcessoNegocio = async (idDoNegocio, idDoProprietario, idUsuarioLogado) => {
    if (!idDoNegocio || !idDoProprietario) { // Adicionada verificação para idDoProprietario
      console.warn('ID do negócio não fornecido para registrar acesso.');
      return;
    }

    // Se não houver usuário logado, ou se o usuário logado FOR o proprietário, não registra o acesso.
    if (!idUsuarioLogado || idUsuarioLogado === idDoProprietario) {
      // console.log('Acesso do proprietário ou usuário não logado. Não registrando.'); // Log opcional para debug
      return;
    }

    try {
      const { error } = await supabase
        .from('cliques_negocios') // Usando a mesma tabela, 'clique' aqui significa 'acesso'
        .insert({ negocio_id: idDoNegocio }); // data_clique será preenchida pelo default 'now()'

      if (error) {
        console.error('Erro ao registrar acesso ao negócio no Supabase:', error);
      }
    } catch (err) {
      console.error('Erro inesperado ao tentar registrar acesso ao negócio:', err);
    }
  };

  // --- Meu efeito para buscar todos os dados da página ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); setError(null); setIsAdmin(false);
      setNegocio(null); setCaracteristicasNegocio([]); setAvaliacoesNegocio([]);

      // 1. Pego o usuário atual e verifico se é admin.
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);
      let localIsAdmin = false; // Variável local para o resultado de checkUserRole
      if (session?.user) {
        localIsAdmin = await checkUserRole(session.user.id);
        setIsAdmin(localIsAdmin); // Atualiza o estado para o resto da UI (botões, etc.)
      }
      // console.log('[DEBUG Admin Check] User ID:', session?.user?.id, 'localIsAdmin:', localIsAdmin);

      // 2. Busco os dados do Negócio (usando minha view `negocios_com_media`).
      try {
        const { data: negocioData, error: negocioError } = await supabase
          .from('negocios_com_media') // View que já calcula média e total de avaliações.
          .select('*')
          .eq('id', negocioId)
          .maybeSingle(); // Para não dar erro se o ID não existir.

        if (negocioError) throw negocioError;
        if (!negocioData) { setError(`Estabelecimento com ID ${negocioId} não encontrado.`); setLoading(false); return; }
        setNegocio(negocioData);

        // 2.1. Registro o acesso a este negócio (não precisa de await se não quiser bloquear)
        // Agora passamos o ID do proprietário e do usuário logado para a função
        registrarAcessoNegocio(
          negocioData.id,
          negocioData.usuario_id, // ID do proprietário do negócio
          session?.user?.id       // ID do usuário atualmente logado
        );

        // 3. Busco as Características associadas a este negócio.
        const { data: caracData, error: caracErr } = await supabase
          .from('negocio_caracteristicas') // Corrigido para nome da tabela correto
          .select('caracteristicas ( id, nome )') // Pego o ID e nome da característica.
          .eq('negocio_id', negocioId);
        if (caracErr) throw caracErr;
        setCaracteristicasNegocio(caracData.map(item => item.caracteristicas).filter(Boolean) || []); // Garanto que não haja nulos no array.

        // 4. Busco as Avaliações deste negócio.
        const { data: avalData, error: avalErr } = await supabase
          .from('avaliacoes_negocios')
          .select('*') // <<< CORRIGIDO: Não preciso mais buscar `profiles.nome` aqui, simplifiquei.
          .eq('negocio_id', negocioId)
          .order('data_avaliacao', { ascending: false }); // Mais recentes primeiro.
        if (avalErr) throw avalErr;
        setAvaliacoesNegocio(avalData || []);

        // 5. Se for o dono ou admin, busco as estatísticas de cliques/acessos
        // Fazemos isso depois de registrar o acesso atual, para que ele possa ser incluído (dependendo do timing)
        // ou para que as estatísticas reflitam o estado *antes* deste acesso, se preferir.
        // Para incluir o acesso atual imediatamente, a função SQL precisaria ser chamada após um pequeno delay
        // ou o registro do acesso ser feito com 'await'. Por simplicidade, vamos buscar como está.
        const isUserOwnerOfThisNegocio = session?.user?.id === negocioData.usuario_id;
        // console.log('[DEBUG Stats Condition] negocioData.id:', negocioData?.id, 'isUserOwnerOfThisNegocio:', isUserOwnerOfThisNegocio, 'localIsAdmin (for stats):', localIsAdmin);

        // Usamos localIsAdmin aqui para garantir que estamos usando o valor de admin
        // determinado NESTA execução do fetchData.
        if (negocioData && (isUserOwnerOfThisNegocio || localIsAdmin)) {
          setLoadingCliques(true);
          // console.log('[DEBUG Stats Fetch] Attempting to fetch stats for negocio_id:', negocioData.id);
          try {
            const { data: statsData, error: statsError } = await supabase
              .rpc('get_negocio_acessos_stats', { p_negocio_id: negocioData.id });

            // Logs detalhados da resposta da RPC
            console.log('[Stats RPC Response] negocio_id:', negocioData.id);
            console.log('[Stats RPC Response] statsData:', JSON.stringify(statsData, null, 2));
            console.log('[Stats RPC Response] statsError:', JSON.stringify(statsError, null, 2));

            if (statsError) {
              console.error('ERRO DETALHADO ao buscar estatísticas de cliques via RPC:', statsError);
              setCliqueStats(null);
            } else if (statsData && statsData.length > 0) {
              setCliqueStats(statsData[0]);
            } else {
              console.warn('[Stats RPC Response] Dados de estatísticas retornados vazios ou em formato inesperado. Definindo cliqueStats como null.');
              setCliqueStats(null); // Garante que se não houver dados, não mostre números antigos.
            }

          } catch (rpcError) {
            console.error('ERRO INESPERADO (catch) ao chamar RPC de estatísticas:', rpcError);
            setCliqueStats(null);
          } finally { setLoadingCliques(false); }
        }

      } catch (err) {
        console.error("Erro COMPLETO ao buscar dados do negócio:", err); // Meu log completo para debug.
        if (err.code === 'PGRST116' || (err.message && err.message.includes('not found'))) {
            setError(`Estabelecimento com ID ${negocioId} não encontrado.`);
        } else {
            setError((err && err.message) || 'Ocorreu um erro ao buscar os dados.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (negocioId) { fetchData(); } // Só busco se tiver um ID.
    else { setError("ID do estabelecimento inválido."); setLoading(false); }
  }, [negocioId, dataVersion]); // Roda de novo se o ID ou a versão dos dados mudar.

  // --- Minha função para Deletar o Negócio ---
  const handleDeleteNegocio = async () => {
    if (!negocio || !canEditOrDelete) return; // Segurança extra para garantir que posso deletar.

    const confirmed = window.confirm("ATENÇÃO: Tem certeza que deseja excluir este estabelecimento? Todas as imagens e dados associados serão perdidos permanentemente. Esta ação não pode ser desfeita.");
    if (!confirmed) return;

    setIsDeleting(true); // Ativo o loading do botão de deletar.
    setError(null); // Limpo erros anteriores.

    try {
      // 1. (Opcional, mas recomendado) Deleto as imagens do Supabase Storage.
      if (negocio.imagens && negocio.imagens.length > 0) {
        const filePaths = negocio.imagens.map(url => {
          try {
            // Extraio o caminho do arquivo a partir da URL pública.
            const urlParts = new URL(url);
            // O caminho no meu Storage geralmente começa depois de '/imagens/'.
            // Ex: .../storage/v1/object/public/imagens/public/user_id/file.webp -> pego 'public/user_id/file.webp'.
            const pathStartIndex = urlParts.pathname.indexOf('/imagens/') + '/imagens/'.length;
            return urlParts.pathname.substring(pathStartIndex);
          } catch (e) {
            console.warn("Não foi possível parsear a URL da imagem para deletar:", url, e);
            return null; // Se der erro, ignoro esta imagem.
          }
        }).filter(Boolean); // Removo quaisquer nulos que possam ter surgido.

        if (filePaths.length > 0) {
          console.log("Tentando deletar estas imagens do storage:", filePaths);
          const { error: storageError } = await supabase.storage
            .from('imagens') // Meu bucket correto.
            .remove(filePaths);
          if (storageError) {
            // Não interrompo o processo, mas aviso sobre o erro no console e com um alert.
            console.error("Erro ao deletar imagens do storage:", storageError);
            alert("Atenção: O negócio foi excluído, mas pode ter ocorrido um erro ao remover algumas imagens do armazenamento.");
          } else {
            console.log("Imagens do storage deletadas com sucesso.");
          }
        }
      }

      // 2. Deleto o registro do negócio da tabela 'negocios'.
      // Lembrete: Minhas Foreign Keys com `ON DELETE CASCADE` devem cuidar de deletar avaliações e características associadas automaticamente.
      const { error: deleteError } = await supabase
        .from('negocios')
        .delete()
        .eq('id', negocio.id);

      if (deleteError) {
        throw deleteError; // Se der erro aqui, paro e mostro a mensagem.
      }

      // Sucesso!
      alert('Estabelecimento excluído com sucesso!');
      router.push('/'); // Redireciono para a home após a exclusão.

    } catch (err) {
      console.error("Erro ao excluir negócio:", err);
      setError(`Erro ao excluir: ${err.message || 'Tente novamente.'}`);
      setIsDeleting(false); // Permito tentar novamente se deu erro.
    }
    // Não preciso setar setIsDeleting(false) no sucesso, pois a página será redirecionada.
  };


  // --- Minha preparação de Dados para Renderização (usando useMemo para otimizar) ---
  const todasImagens = useMemo(() => negocio?.imagens || [], [negocio]); // Array de imagens, ou vazio se não houver.

  const whatsappLink = useMemo(() => {
    if (!negocio?.whatsapp) return null;
    const numeroLimpo = negocio.whatsapp.replace(/\D/g, ''); // Tiro tudo que não for dígito.
    // Garanto que o número comece com '55' (código do Brasil).
    const numeroCompleto = numeroLimpo.startsWith('55') ? numeroLimpo : '55' + numeroLimpo;
    // Só gero o link se o número parecer válido (pelo menos 12 dígitos com o 55).
    return numeroCompleto.length >= 12 ? `https://wa.me/${numeroCompleto}` : null;
  }, [negocio?.whatsapp]);

  // Verifico se o usuário logado é o dono do negócio ou se é admin.
  const isOwner = currentUser && negocio && currentUser.id === negocio.usuario_id;
  const canEditOrDelete = isOwner || isAdmin; // Só pode editar/deletar se for dono OU admin.

  // Função para ser chamada pelo componente filho para recarregar os dados
  const handleRatingSuccess = () => setDataVersion(v => v + 1);

  // --- Minha Renderização ---
  if (loading) return <div className="text-center p-10">Carregando detalhes do estabelecimento...</div>;
  if (error) return <div className="p-6 text-red-600 bg-red-100 rounded-md text-center">Erro: {error}</div>;
  if (!negocio) return <div className="text-center p-10">Estabelecimento não encontrado.</div>; // Segurança extra.

  return (
    <div className="container mx-auto p-4 max-w-5xl"> {/* Aumentei o max-width para a página de detalhes. */}

      {/* --- Meus botões de Editar/Excluir (só aparecem se o usuário puder editar/deletar) --- */}
      {canEditOrDelete && (
        <div className="mb-6 flex justify-end gap-4">
          <Link
            href={`/meu-negocio/editar/${negocio.id}`} // <<< Link CORRETO para a página de edição.
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-200 disabled:opacity-50"
            aria-disabled={isDeleting} // Desabilito visualmente se estiver deletando.
            onClick={(e) => { if (isDeleting) e.preventDefault(); }} // Previne o clique se estiver deletando.
          >
            <FaEdit className="h-4 w-4" />
            Editar
          </Link>
          <button
            onClick={handleDeleteNegocio}
            disabled={isDeleting} // Desabilito o botão se estiver deletando.
            className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-200 disabled:opacity-50"
          >
            {isDeleting ? ( // Mostro um spinner e texto de "Excluindo..."
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Excluindo...
              </>
            ) : (
              <>
                <FaTrash className="h-4 w-4" />
                Excluir
              </>
            )}
          </button>
        </div>
      )}

      
      {/* Título, Categoria e Avaliação do Negócio. */}
      <div className="mb-6 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold mb-1 text-gray-900">{negocio.nome}</h1>
        <p className="text-lg text-green-700 font-semibold mb-3">{negocio.nome_categoria}</p>
        <div className="flex justify-center md:justify-start">
          <EstrelasDisplay media={negocio.media_avaliacoes} total={negocio.total_avaliacoes} />
        </div>
      </div>

      {/* Meu Carrossel de Imagens. */}
      {todasImagens.length > 0 ? (
        <Swiper
          modules={[Navigation, Pagination, Scrollbar, A11y, Autoplay]}
          autoplay={{ delay: 5000, disableOnInteraction: false }} // Autoplay com delay de 5s.
          spaceBetween={10} slidesPerView={1} navigation // Navegação (setas).
          pagination={{ clickable: true }} // Paginação (bolinhas clicáveis).
          loop={todasImagens.length > 1} // Loop se tiver mais de uma imagem.
          className="mb-8 rounded-lg shadow-xl overflow-hidden bg-gray-200 aspect-video" // Estilo e aspect ratio para consistência.
        >
          {todasImagens.map((imgUrl, index) => (
            <SwiperSlide key={index}>
              <img src={imgUrl} alt={`${negocio.nome} - Imagem ${index + 1}`} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-image.png'; e.target.alt = 'Imagem indisponível'; }} />
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        // Fallback se não houver imagens.
        <div className="mb-8 bg-gray-200 aspect-video flex items-center justify-center rounded-lg shadow-lg"><span className="text-gray-500">Nenhuma imagem disponível</span></div>
      )}

      {/* Grid de Informações (Descrição, Características, Contato, Localização). */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Coluna Principal (Descrição e Características). */}
        <div className="lg:col-span-2 space-y-8">
          {/* Descrição do Negócio. */}
          <div>
            <h2 className="text-2xl font-semibold mb-3 border-b pb-2 text-gray-800">Sobre o Local</h2>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{negocio.descricao || 'Nenhuma descrição fornecida.'}</p>
          </div>

          {/* Características do Negócio. */}
          {caracteristicasNegocio.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-3 border-b pb-2 text-gray-800">Comodidades e Serviços</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                {caracteristicasNegocio.map((caracteristica) => {
                  const Icon = caracteristicaIconMap[caracteristica.nome] || MdOutlineStar; // Uso um ícone padrão se não encontrar no mapa.
                  return (
                    <div key={caracteristica.id} className="flex items-center gap-2 text-gray-800">
                      <Icon className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span>{caracteristica.nome}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Coluna Lateral (Contato e Localização). */}
        <div className="space-y-5 bg-gray-50 p-5 rounded-lg shadow-md border border-gray-200 h-fit"> {/* h-fit para a coluna lateral ajustar sua altura ao conteúdo. */}
          <h2 className="text-xl font-semibold mb-3 border-b pb-2 text-gray-800">Contato e Localização</h2>
          {/* Endereço e Cidade. */}
          {negocio.endereco && (
            <div className="flex items-start gap-2 text-gray-700">
                <FaMapMarkerAlt className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                <span>{negocio.endereco}, {negocio.cidade}</span>
            </div>
          )}
          {!negocio.endereco && negocio.cidade && ( // Se não tiver endereço, mas tiver cidade, mostro só a cidade.
            <div className="flex items-start gap-2 text-gray-700">
                <FaMapMarkerAlt className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                <span>{negocio.cidade}</span>
            </div>
          )}

          {/* Telefone. */}
          {negocio.telefone && (
            <div className="flex items-center gap-2 text-gray-700">
              <FiPhone className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <a href={`tel:${negocio.telefone.replace(/\D/g, '')}`} className="hover:text-green-700">{negocio.telefone}</a>
            </div>
          )}

          {/* Website/Rede Social. */}
          {negocio.website && (
            <a href={negocio.website.startsWith('http') ? negocio.website : `https://${negocio.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium break-all">
              <FaGlobe className="w-4 h-4 flex-shrink-0" />
              <span>{negocio.website}</span>
            </a>
          )}

           {/* Meu Botão de WhatsApp. */}
          {whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow transition duration-200 w-full">
              <FaWhatsapp className="text-xl" />
              Conversar no WhatsApp
            </a>
          )}

           {/* Meu Link para o Google Maps. */}
           {(negocio.latitude && negocio.longitude) ? ( // Se tiver lat/long, uso para o link.
              <a href={`https://www.google.com/maps/search/?api=1&query=${negocio.latitude},${negocio.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow transition duration-200 w-full">
                <FaMapMarkerAlt className="h-5 w-5" />
                Ver Localização no Mapa
              </a>
           ) : negocio.endereco && ( // Senão, se tiver endereço, uso o endereço para o link.
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(negocio.endereco + ', ' + negocio.cidade)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow transition duration-200 w-full">
                <FaMapMarkerAlt className="h-5 w-5" />
                Ver Localização Aproximada
              </a>
          )}
        </div>
      </div>

      {/* Minha Seção de Avaliações. */}
      <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2 text-gray-800">Avaliações</h2>
          {avaliacoesNegocio.length > 0 ? (
              <div className="space-y-5">
                  {avaliacoesNegocio.map((avaliacao) => (
                      <div key={avaliacao.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                              {/* Lembrete: Exibo "Usuário" por enquanto, pois não estou buscando o nome do perfil na avaliação. */}
                              <span className="font-semibold text-gray-800">Usuário</span>
                              <span className="text-xs text-gray-500">{new Date(avaliacao.data_avaliacao).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center mb-2">
                              {[...Array(5)].map((_, i) => ( // Crio 5 estrelas.
                                  i < avaliacao.nota // Preencho de acordo com a nota.
                                      ? <MdOutlineStar key={i} className="text-yellow-500 h-5 w-5" />
                                      : <MdOutlineStarBorder key={i} className="text-yellow-500 h-5 w-5" />
                              ))}
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed">{avaliacao.comentario || 'Sem comentário.'}</p>
                      </div>
                  ))}
              </div>
          ) : (
              <p className="text-gray-600 text-center py-4">Este estabelecimento ainda não recebeu avaliações.</p>
          )}
          {/* Formulário para nova avaliação (não mostra para o dono) */}
          {!isOwner && (
            <RatingForm
              negocioId={negocio.id}
              currentUser={currentUser}
              onRatingSuccess={handleRatingSuccess}
            />
          )}
      </div>

      {/* --- Minha Seção de Estatísticas de Acessos (só para o proprietário/admin) --- */}
      {canEditOrDelete && (
        <div className="my-8 p-6 bg-gradient-to-r from-yellow-300 to-amber-400 rounded-lg shadow-md border border-slate-200">
          <h2 className="text-2xl font-semibold mb-6 pb-3 text-green-800">Visão Geral dos Acessos</h2>
          {loadingCliques && <p className="text-center text-gray-600">Carregando estatísticas de acessos...</p>}
          {!loadingCliques && !cliqueStats && <p className="text-center text-gray-600">Não foi possível carregar as estatísticas.</p>}
          {!loadingCliques && cliqueStats && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg">
                <thead className="bg-green-600">
                  <tr>
                    <th className="text-left py-3 px-4 rounded-tl-lg uppercase font-semibold text-sm text-white">Período</th>
                    <th className="text-right py-3 px-4 rounded-tr-lg uppercase font-semibold text-sm text-white">Acessos</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-gray-300 border-b">
                    <td className="text-left py-3 px-4">Total de Acessos</td>
                    <td className="text-right py-3 px-4 font-bold text-green-600">{cliqueStats.total_acessos ?? 0}</td>
                  </tr>
                  <tr className="border-gray-300 border-b">
                    <td className="text-left py-3 px-4">Acessos Hoje</td>
                    <td className="text-right py-3 px-4 font-bold text-green-600">{cliqueStats.acessos_hoje ?? 0}</td>
                  </tr>
                  <tr className="border-gray-300 border-b">
                    <td className="text-left py-3 px-4">Acessos nos Últimos 7 Dias</td>
                    <td className="text-right py-3 px-4 font-bold text-green-600">{cliqueStats.acessos_ultimos_7_dias ?? 0}</td>
                  </tr>
                  <tr>
                    <td className="text-left py-3 px-4">Acessos nos Últimos 30 Dias</td>
                    <td className="text-right py-3 px-4 font-bold text-green-600">{cliqueStats.acessos_ultimos_30_dias ?? 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {/* Adicionar o componente do gráfico aqui, se houver dados de estatísticas */}
          {!loadingCliques && cliqueStats && negocio && (
            <AcessosChart negocioId={negocio.id} />
          )}
        </div>
      )}


    </div>
  );
}

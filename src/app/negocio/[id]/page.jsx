// src/app/negocio/[id]/page.jsx

'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Fade } from 'react-awesome-reveal';
// Modal simples para exibir o carrossel em tela cheia
function ModalCarrossel({ open, onClose, imagens, initialIndex = 0, nome }) {
  const [mounted, setMounted] = useState(false);
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const [swiperInstance, setSwiperInstance] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  // Trava o scroll do body enquanto o modal estiver aberto
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  // Vincula a navegação do Swiper quando refs e instância estiverem prontos
  useEffect(() => {
    if (!swiperInstance || !prevRef.current || !nextRef.current) return;
    try {
      swiperInstance.params.navigation.prevEl = prevRef.current;
      swiperInstance.params.navigation.nextEl = nextRef.current;
      if (swiperInstance.navigation && swiperInstance.navigation.init) {
        swiperInstance.navigation.init();
        swiperInstance.navigation.update();
      }
    } catch (e) {
      console.warn('Falha ao inicializar navegação customizada do Swiper (modal):', e);
    }
  }, [swiperInstance]);

  // Navegação por teclado
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!swiperInstance) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        swiperInstance.slidePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        swiperInstance.slideNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, swiperInstance, onClose]);

  if (!mounted) return null;

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-overlay"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-gray-200 transition z-50"
        aria-label="Fechar"
      >
        &times;
      </button>
      <div
        className="w-screen h-screen flex items-center justify-center"
        onClickCapture={(e) => {
          // Fecha se o clique não for na imagem nem nas setas
          const target = e.target;
          const isImg = target && target.tagName === 'IMG';
          const isPrevBtn = prevRef.current && prevRef.current.contains(target);
          const isNextBtn = nextRef.current && nextRef.current.contains(target);
          const isPagination = typeof target.closest === 'function' && !!target.closest('.swiper-pagination');
          if (!(isImg || isPrevBtn || isNextBtn || isPagination)) {
            e.stopPropagation();
            onClose();
          }
        }}
        onWheel={(e) => {
          if (!swiperInstance) return;
          e.preventDefault();
          e.stopPropagation();
          try {
            if (e.deltaY < 0) swiperInstance.zoom?.in?.();
            else swiperInstance.zoom?.out?.();
          } catch {}
        }}
      >
        <Swiper
          modules={[Pagination, Scrollbar, A11y, Autoplay, Navigation, Zoom]}
          // Desativa autoplay no modal para "pausar" quando a imagem estiver aberta
          autoplay={false}
          spaceBetween={0}
          slidesPerView={1}
          pagination={{ clickable: true }}
          allowTouchMove={true}
          zoom={{ maxRatio: 3, minRatio: 1 }}
          // Configura navegação customizada quando o swiper estiver pronto
          onSwiper={(swiper) => {
            setSwiperInstance(swiper);
          }}
          loop={(imagens?.length || 0) > 1}
          initialSlide={initialIndex}
          className="w-screen h-screen"
        >
          {imagens.map((imgUrl, index) => (
            <SwiperSlide key={index}>
              <div className="swiper-zoom-container">
                <img
                  src={imgUrl}
                  alt={`${nome} - Imagem ${index + 1}`}
                  className="w-full h-full object-contain select-none"
                  style={{ maxWidth: '100vw', maxHeight: '100vh', display: 'block', margin: '0 auto', touchAction: 'none' }}
                  loading="lazy"
                  draggable={false}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        {/* Setas customizadas sem fundo arredondado */}
        <button
          ref={prevRef}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-0 bg-transparent border-none outline-none flex items-center justify-center hover:scale-110 transition z-50 pointer-events-auto"
          aria-label="Anterior"
          style={{ boxShadow: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="32" height="32" fill="none" viewBox="0 0 32 32">
            <path d="M20 8l-8 8 8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          ref={nextRef}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0 bg-transparent border-none outline-none flex items-center justify-center hover:scale-110 transition z-50 pointer-events-auto"
          aria-label="Próxima"
          style={{ boxShadow: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="32" height="32" fill="none" viewBox="0 0 32 32">
            <path d="M12 8l8 8-8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabaseClient';
// Meus Ícones (Posso adicionar mais conforme necessário).
import { FaWhatsapp, FaWifi, FaParking, FaDog, FaConciergeBell, FaWheelchair, FaCampground, FaMapMarkerAlt, FaEdit, FaGlobe, FaTrash } from 'react-icons/fa';
import { FiPhone, FiCoffee, FiWind, FiMail } from 'react-icons/fi';
import { MdRestaurant, MdAcUnit, MdPool, MdRoomService, MdOutlineStar, MdOutlineStarBorder } from 'react-icons/md';
// Swiper para o carrossel de imagens.
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Scrollbar, A11y, Autoplay, Navigation, Zoom } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import 'swiper/css/navigation';
import 'swiper/css/zoom';
import './carousel-custom.css'; // Arquivo para customização das bolinhas
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
  // Estado para modal do carrossel (deve vir antes do uso)
  const [modalOpen, setModalOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  // Referência ao Swiper do carrossel de fundo para pausar/resumir autoplay quando o modal abre/fecha
  const [mainSwiper, setMainSwiper] = useState(null);

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
  // Novo: estado para horário de funcionamento (JSON)
  const [horarioFunc, setHorarioFunc] = useState(null);

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
        // Novo: pega horário da view se existir; se não existir, busca da tabela base
        if (typeof negocioData.horario_funcionamento !== 'undefined') {
          setHorarioFunc(negocioData.horario_funcionamento || null);
        } else {
          try {
            const { data: horarioRow, error: horarioErr } = await supabase
              .from('negocios')
              .select('horario_funcionamento')
              .eq('id', negocioId)
              .maybeSingle();
            if (!horarioErr) setHorarioFunc(horarioRow?.horario_funcionamento || null);
          } catch {}
        }

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

  // Fechar com ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setModalOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Pausa o autoplay do carrossel de fundo quando o modal está aberto e retoma quando fecha
  useEffect(() => {
    if (!mainSwiper || !mainSwiper.autoplay) return;
    try {
      if (modalOpen) mainSwiper.autoplay.stop();
      else mainSwiper.autoplay.start();
    } catch {}
  }, [modalOpen, mainSwiper]);

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

  // ---------- Utilitários de Horário de Funcionamento ----------
  const normalizeSchedule = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    // Aceita formatos com keys em PT ou EN
    const mapKeys = {
      domingo: 'sun', dom: 'sun', sun: 'sun',
      segunda: 'mon', seg: 'mon', mon: 'mon',
      terca: 'tue', terça: 'tue', ter: 'tue', tue: 'tue',
      quarta: 'wed', qua: 'wed', wed: 'wed',
      quinta: 'thu', qui: 'thu', thu: 'thu',
      sexta: 'fri', sex: 'fri', fri: 'fri',
      sabado: 'sat', sábado: 'sat', sab: 'sat', sáb: 'sat', sat: 'sat',
    };
    const days = { sun: [], mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] };
    const fromRawDays = raw.days || raw.dias || raw.horarios || raw; // tolerante
    const pushInterval = (key, arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((it) => {
        // Suporta ['09:00','12:00'] ou {abre:'09:00', fecha:'12:00'}
        let start = Array.isArray(it) ? it[0] : it?.[0] || it?.abre || it?.open || it?.inicio || it?.start;
        let end = Array.isArray(it) ? it[1] : it?.[1] || it?.fecha || it?.close || it?.fim || it?.end;
        if (typeof start === 'string' && typeof end === 'string') {
          days[key].push([start, end]);
        }
      });
    };
    // Itera chaves e normaliza
    Object.entries(fromRawDays || {}).forEach(([k, v]) => {
      const lk = k.toLowerCase();
      const norm = mapKeys[lk] || (['sun','mon','tue','wed','thu','fri','sat'].includes(lk) ? lk : null);
      if (!norm) return;
      pushInterval(norm, v);
    });
    const timezone = raw.timezone || raw.fuso || raw.time_zone || 'America/Sao_Paulo';
    return { timezone, days };
  };

  const timePartsInTZ = (timeZone) => {
    // Converte agora para a timezone desejada usando o truque do toLocaleString
    const nowTZ = new Date(new Date().toLocaleString('en-US', { timeZone }));
    const day = nowTZ.getDay(); // 0=Sun..6=Sat na TZ
    const hours = nowTZ.getHours();
    const minutes = nowTZ.getMinutes();
    return { day, minutesTotal: hours * 60 + minutes, dateObj: nowTZ };
  };

  const parseHM = (s) => {
    if (typeof s !== 'string') return null;
    const m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Math.max(0, Math.min(23, parseInt(m[1], 10)));
    const mi = Math.max(0, Math.min(59, parseInt(m[2], 10)));
    return h * 60 + mi;
  };

  const fmtHM = (min) => {
    const h = Math.floor(min / 60) % 24;
    const m = min % 60;
    const hh = h.toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Converte os intervalos do dia em blocos de abertura efetivos.
  // Se houver um intervalo "grande" contendo um menor, tratamos o menor como pausa e subtraímos do grande.
  const computeOpenBlocks = (rawList) => {
    // rawList: array de ["HH:MM","HH:MM"]
    if (!Array.isArray(rawList)) return [];
    const parsed = rawList
      .map(([s, e]) => [parseHM(s), parseHM(e)])
      .filter(([s, e]) => s != null && e != null && s !== e);

    // Separa em mesmos-dia (end > start) e cruzando meia-noite (end < start)
    const sameDay = [];
    const overnight = [];
    for (const [s, e] of parsed) {
      if (e > s) sameDay.push([s, e]);
      else overnight.push([s, e]);
    }

    // Identifica containers (intervalos não contidos por outros) e pauses (contidos por algum container)
    const isContainedIn = (a, b) => b[0] <= a[0] && b[1] >= a[1];
    const containers = sameDay.filter((cand, i) => !sameDay.some((other, j) => j !== i && isContainedIn(cand, other)));
    const pauses = sameDay.filter((cand, i) => sameDay.some((other, j) => j !== i && isContainedIn(cand, other)));

    let result = [];
    if (pauses.length === 0) {
      // Sem pausas internas: os próprios sameDay já são blocos de abertura
      result = [...sameDay];
    } else {
      // Para cada container, subtrai todas as pausas internas
      const sortedPauses = [...pauses].sort((a, b) => a[0] - b[0]);
      for (const [cStart, cEnd] of containers) {
        let cursor = cStart;
        for (const [pStart, pEnd] of sortedPauses) {
          if (pEnd <= cStart || pStart >= cEnd) continue; // pausa fora do container
          const startSeg = Math.max(cursor, cStart);
          const endSeg = Math.min(pStart, cEnd);
          if (endSeg > startSeg) result.push([startSeg, endSeg]);
          cursor = Math.max(cursor, pEnd);
          if (cursor >= cEnd) break;
        }
        if (cursor < cEnd) result.push([cursor, cEnd]);
      }
    }

    // Junta com os intervalos overnight (mantém como estão para exibição e cálculo)
    result.push(...overnight);

    // Ordena e mescla sobreposições/adjacências para garantir limpeza
    result.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const seg of result) {
      if (!merged.length) { merged.push(seg); continue; }
      const last = merged[merged.length - 1];
      // Mescla se sobrepõe e ambos são same-day (end>start) e sem cruzar meia-noite
      const lastOvernight = last[1] <= last[0];
      const segOvernight = seg[1] <= seg[0];
      if (!lastOvernight && !segOvernight && seg[0] <= last[1]) {
        last[1] = Math.max(last[1], seg[1]);
      } else {
        merged.push([...seg]);
      }
    }
    return merged; // lista de pares [startMin, endMin] (end pode ser < start para overnight)
  };

  const scheduleInfo = useMemo(() => {
    const norm = normalizeSchedule(horarioFunc);
    if (!norm) return null;
    const tz = norm.timezone || 'America/Sao_Paulo';
    const { day, minutesTotal } = timePartsInTZ(tz);
    const idxToKey = ['sun','mon','tue','wed','thu','fri','sat'];
    const todayKey = idxToKey[day];
    const prevKey = idxToKey[(day + 6) % 7];

    const effectiveOpen = (key) => computeOpenBlocks(norm.days[key] || []);
    // Aberto agora: considera blocos de hoje normalmente e APENAS blocos overnight vindos de ontem
    const isOpenTodayNow = (() => {
      const blocks = effectiveOpen(todayKey);
      for (const [start, end] of blocks) {
        if (end > start) {
          if (minutesTotal >= start && minutesTotal < end) return true;
        } else if (end < start) {
          // Overnight iniciado hoje (ex.: 22:00–02:00): hoje conta quando for >= start
          if (minutesTotal >= start) return true;
        }
      }
      return false;
    })();

    const isOpenFromPrevOvernight = (() => {
      const blocksPrev = effectiveOpen(prevKey);
      for (const [start, end] of blocksPrev) {
        if (end < start) {
          // Overnight que começou ontem e termina hoje: aberto hoje enquanto for antes do 'end'
          if (minutesTotal < end) return true;
        }
      }
      return false;
    })();

    const abertoAgora = isOpenTodayNow || isOpenFromPrevOvernight;

    // Texto de hoje
    const toLabel = (key) => {
      const raw = norm.days[key] || [];
      if (!raw.length) return 'Fechado';
      const blocks = computeOpenBlocks(raw);
      if (!blocks.length) return 'Fechado';
      return blocks.map(([s, e]) => `${fmtHM(s)}–${fmtHM(e)}`).join(', ');
    };

    const weekdayNames = {
      sun: 'Domingo', mon: 'Segunda', tue: 'Terça', wed: 'Quarta', thu: 'Quinta', fri: 'Sexta', sat: 'Sábado',
    };

    const weekly = idxToKey.map((k) => ({ key: k, name: weekdayNames[k], label: toLabel(k) }));
    // Texto a exibir quando ABERTO: se for overnight vindo de ontem, mostra 00:00–end; senão, os blocos de hoje
    let hojeLabelOpen = toLabel(todayKey);
    if (!isOpenTodayNow && isOpenFromPrevOvernight) {
      // Busca o bloco overnight de ontem que está em vigor agora e mostra até o 'end' de hoje
      const blocksPrev = effectiveOpen(prevKey).filter(([s, e]) => e < s && minutesTotal < e);
      if (blocksPrev.length) {
        // Se houver vários, escolhe o primeiro por ordenação natural de computeOpenBlocks
        const end = blocksPrev[0][1];
        hojeLabelOpen = `00:00–${fmtHM(end)}`;
      }
    }

    // Próxima abertura quando FECHADO
    const getNextOpening = () => {
      for (let off = 0; off < 7; off++) {
        const k = idxToKey[(day + off) % 7];
        const blocks = effectiveOpen(k);
        if (!blocks.length) continue;
        let candidates = [];
        if (off === 0) {
          // Hoje: próximos blocos cujo início ainda não chegou
          for (const [s, e] of blocks) {
            if (e > s) {
              if (s > minutesTotal) candidates.push(s);
            } else if (e < s) {
              // overnight começa hoje
              if (s > minutesTotal) candidates.push(s);
            }
          }
        } else {
          // Futuro: primeira abertura do dia (menor start)
          candidates = blocks.map(([s]) => s);
        }
        if (candidates.length) {
          const startMin = Math.min(...candidates);
          return { offset: off, key: k, startMin };
        }
      }
      return null;
    };

    let abreTexto = null;
    if (!abertoAgora) {
      const next = getNextOpening();
      if (next) {
        let whenLabel;
        if (next.offset === 0) whenLabel = 'Hoje';
        else if (next.offset === 1) whenLabel = 'Amanhã';
        else whenLabel = weekdayNames[next.key];
        abreTexto = `${whenLabel} às ${fmtHM(next.startMin)}`;
      }
    }

    // Horário de fechamento quando ABERTO
    const getCloseText = () => {
      // Tenta identificar o bloco ativo de hoje
      const blocksToday = effectiveOpen(todayKey);
      for (const [s, e] of blocksToday) {
        if (e > s) {
          if (minutesTotal >= s && minutesTotal < e) return fmtHM(e);
        } else if (e < s) {
          // overnight iniciado hoje
          if (minutesTotal >= s) return fmtHM(e);
        }
      }
      // Se não achar em hoje, pode ser overnight do dia anterior
      const blocksPrev2 = effectiveOpen(prevKey);
      for (const [s, e] of blocksPrev2) {
        if (e < s && minutesTotal < e) return fmtHM(e);
      }
      return null;
    };
    const fechaText = abertoAgora ? getCloseText() : null;
    const showCloseText = !!(abertoAgora && fechaText && !`${hojeLabelOpen}`.includes(`–${fechaText}`));

    return { abertoAgora, hojeLabelOpen, weekly, abreTexto, fechaText, showCloseText };
  }, [horarioFunc]);

  // --- Minha Renderização ---
  if (loading) return <div className="text-center p-10">Carregando detalhes do estabelecimento...</div>;
  if (error) return <div className="p-6 text-red-600 bg-red-100 rounded-md text-center">Erro: {error}</div>;
  if (!negocio) return <div className="text-center p-10">Estabelecimento não encontrado.</div>; // Segurança extra.

  return (
    <div className="relative min-h-screen mt-25 overflow-x-hidden">
      {/* Fundo esfumaçado decorativo inferior */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[120vw] h-[250px] -z-10 pointer-events-none overflow-visible blur-[80px]"
        style={{ maxWidth: 'none' }}
      >
        <div
          style={{
            clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 40%)',
          }}
          className="w-full h-full bg-gradient-to-tr from-emerald-700 to-green-600 opacity-50"
        />
      </div>

      <div className="container mx-auto p-4 max-w-5xl">
        <Fade direction="up" triggerOnce>
          {/* Título, Categoria e Avaliação */}
          <div className="mb-6 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold mb-1 text-green-800 drop-shadow">{negocio.nome}</h1>
            <p className="text-lg text-emerald-700 font-semibold mb-3">{negocio.nome_categoria}</p>
            <div className="flex justify-center md:justify-start">
              <EstrelasDisplay media={negocio.media_avaliacoes} total={negocio.total_avaliacoes} />
            </div>
          </div>
        </Fade>

        <Fade direction="up" delay={120} triggerOnce>
          {/* Carrossel de Imagens */}
          {todasImagens.length > 0 ? (
            <div>
              <div className="relative w-screen max-w-full left-1/2 right-1/2 -translate-x-1/2 mb-8 overflow-x-hidden group cursor-zoom-in"
                onClick={(e) => {
                  if (e.target.tagName === 'IMG' || e.target.classList.contains('swiper-slide')) setModalOpen(true);
                }}
              >
                <Swiper
                  modules={[Pagination, Scrollbar, A11y, Autoplay]}
                  autoplay={{ delay: 3000, disableOnInteraction: false }}
                  spaceBetween={0} slidesPerView={1}
                  pagination={{ clickable: true }}
                  loop={todasImagens.length > 1}
                  className="aspect-video max-h-[60vh]"
                  onSlideChange={(swiper) => setCurrentSlide(swiper.activeIndex)}
                  onSwiper={(swiper) => setMainSwiper(swiper)}
                >
                  {todasImagens.map((imgUrl, index) => (
                    <SwiperSlide key={index}>
                      <img src={imgUrl} alt={`${negocio.nome} - Imagem ${index + 1}`} className="w-full h-full object-cover transition group-hover:brightness-90" loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-image.png'; e.target.alt = 'Imagem indisponível'; }} />
                    </SwiperSlide>
                  ))}
                </Swiper>
                <div className="absolute inset-0 pointer-events-none group-hover:bg-black/10 transition" />
              </div>
              <ModalCarrossel
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                imagens={todasImagens}
                initialIndex={currentSlide}
                nome={negocio.nome}
              />
            </div>
          ) : (
            <div className="mb-8 bg-gray-100 aspect-video flex items-center justify-center rounded-2xl shadow-lg"><span className="text-gray-500">Nenhuma imagem disponível</span></div>
          )}
        </Fade>

        <Fade direction="right" cascade damping={0.16} delay={200} triggerOnce>
          {/* Grid de Informações */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Coluna Principal */}
            <div className="lg:col-span-2 space-y-8">
              {/* Descrição */}
              <div>
                <h2 className="text-2xl font-semibold mb-3 pb-2 text-green-800">Sobre o Local</h2>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{negocio.descricao || 'Nenhuma descrição fornecida.'}</p>
              </div>
              {/* Características */}
              {caracteristicasNegocio.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-3 pb-2 text-green-800">Comodidades e Serviços</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                    {caracteristicasNegocio.map((caracteristica) => {
                      const Icon = caracteristicaIconMap[caracteristica.nome] || MdOutlineStar;
                      return (
                        <div key={caracteristica.id} className="flex items-center gap-2 text-emerald-700">
                          <Icon className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span>{caracteristica.nome}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* Coluna Lateral */}
            <div className="space-y-5 bg-white/90 p-5 rounded-2xl shadow-md border border-gray-100 h-fit">
              <h2 className="text-xl font-semibold mb-3 pb-2 text-green-800">Contato e Localização</h2>
              {/* Horário de Funcionamento */}
              {scheduleInfo && (
                <div className="mb-4 p-3 rounded-xl border border-emerald-100 bg-emerald-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-emerald-800">Horário de funcionamento</span>
                    <span className={`inline-flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full ${scheduleInfo.abertoAgora ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                      <span className={`inline-block w-2 h-2 rounded-full ${scheduleInfo.abertoAgora ? 'bg-green-600' : 'bg-red-600'}`} />
                      {scheduleInfo.abertoAgora ? 'Aberto' : 'Fechado'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">
                    {scheduleInfo.abertoAgora ? (
                      <>
                        <div className="mb-1"><span className="font-medium">Hoje:</span> {scheduleInfo.hojeLabelOpen}</div>
                        {scheduleInfo.showCloseText && (
                          <div className="text-gray-700">Fecha às {scheduleInfo.fechaText}</div>
                        )}
                      </>
                    ) : (
                      scheduleInfo.abreTexto && (
                        <div className="mb-2 text-gray-700">Abre {scheduleInfo.abreTexto}</div>
                      )
                    )}
                    <details className="group">
                      <summary className="cursor-pointer select-none text-emerald-700 hover:text-emerald-800 text-sm">Ver semana</summary>
                      <div className="mt-2 grid grid-cols-1 gap-1 text-sm">
                        {scheduleInfo.weekly.map((d) => (
                          <div key={d.key} className="flex justify-between">
                            <span className="text-gray-600">{d.name}</span>
                            <span className="text-gray-800">{d.label}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                </div>
              )}
              {/* ...existing code... */}
              {negocio.endereco && (
                <div className="flex items-start gap-2 text-gray-700">
                  <FaMapMarkerAlt className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                  <span>{negocio.endereco}, {negocio.cidade}</span>
                </div>
              )}
              {!negocio.endereco && negocio.cidade && (
                <div className="flex items-start gap-2 text-gray-700">
                  <FaMapMarkerAlt className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                  <span>{negocio.cidade}</span>
                </div>
              )}
              {negocio.email_contato && (
                <div className="flex items-center gap-2 text-gray-700">
                  <FiMail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <a href={`mailto:${negocio.email_contato}`} className="hover:text-green-700 break-all">
                    {negocio.email_contato}
                  </a>
                </div>
              )}
              {negocio.telefone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <FiPhone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <a href={`tel:${negocio.telefone.replace(/\D/g, '')}`} className="hover:text-green-700">
                    {negocio.telefone}
                  </a>
                </div>
              )}
              {negocio.website && (
                <a href={negocio.website.startsWith('http') ? negocio.website : `https://${negocio.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium break-all">
                  <FaGlobe className="w-4 h-4 flex-shrink-0" />
                  <span>{negocio.website}</span>
                </a>
              )}
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow transition duration-200 w-full">
                  <FaWhatsapp className="text-xl" />
                  Conversar no WhatsApp
                </a>
              )}
              {(negocio.latitude && negocio.longitude) ? (
                <a href={`https://www.google.com/maps/search/?api=1&query=${negocio.latitude},${negocio.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow transition duration-200 w-full">
                  <FaMapMarkerAlt className="h-5 w-5" />
                  Ver Localização no Mapa
                </a>
              ) : negocio.endereco && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${negocio.endereco}, ${negocio.cidade}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow transition duration-200 w-full">
                  <FaMapMarkerAlt className="h-5 w-5" />
                  Ver Localização
                </a>
              )}
            </div>
          </div>
        </Fade>

        {canEditOrDelete && (
          <Fade direction="up" delay={320} triggerOnce>
            {/* Botões de Editar/Excluir */}
            <div className="mb-6 flex justify-end gap-4">
              <Link
                href={`/meu-negocio/editar/${negocio.id}`}
                className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-xl shadow transition duration-200 disabled:opacity-50"
                aria-disabled={isDeleting}
                onClick={(e) => { if (isDeleting) e.preventDefault(); }}
              >
                <FaEdit className="h-4 w-4" />
                Editar
              </Link>
              <button
                onClick={handleDeleteNegocio}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl shadow transition duration-200 disabled:opacity-50"
              >
                {isDeleting ? (
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
          </Fade>
        )}

        <Fade direction="up" delay={400} triggerOnce>
          {/* Avaliações */}
          <div id="avaliacao" className="mt-10">
            <h2 className="text-2xl font-semibold mb-4 pb-2 text-green-800">Avaliações</h2>
            {avaliacoesNegocio.length > 0 ? (
              <div className="space-y-5">
                {avaliacoesNegocio.map((avaliacao) => (
                  <div key={avaliacao.id} className="bg-white/90 p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800">Usuário</span>
                      <span className="text-xs text-gray-500">{new Date(avaliacao.data_avaliacao).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center mb-2">
                      {[...Array(5)].map((_, i) =>
                        i < avaliacao.nota
                          ? <MdOutlineStar key={i} className="text-yellow-500 h-5 w-5" />
                          : <MdOutlineStarBorder key={i} className="text-yellow-500 h-5 w-5" />
                      )}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{avaliacao.comentario || 'Sem comentário.'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">Este estabelecimento ainda não recebeu avaliações.</p>
            )}
            {isOwner ? null : (
              <RatingForm
                negocioId={negocio.id}
                currentUser={currentUser}
                onRatingSuccess={handleRatingSuccess}
              />
            )}
          </div>
        </Fade>

        {canEditOrDelete && (
          <Fade delay={500} triggerOnce>
            {/* Estatísticas de Acessos */}
            <div className="my-8 p-6 bg-gradient-to-r from-yellow-300 to-amber-400 rounded-2xl shadow-md border border-slate-100">
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
              {!loadingCliques && cliqueStats && negocio && (
                <AcessosChart negocioId={negocio.id} />
              )}
            </div>
          </Fade>
        )}
      </div>
    </div>
  );
}

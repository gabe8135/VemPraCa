// src/app/meu-negocio/editar/[id]/page.jsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react'; // Lembrete: Adicionei o useMemo aqui.
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';
import { FaTrash } from 'react-icons/fa';

// --- Meus Componentes Auxiliares (Reutilizados do formulário de cadastro) ---
function InputField({ label, name, value, onChange, required = false, placeholder = '', type = 'text', disabled = false, ...props }) {
  return ( <div> <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label> <input type={type} name={name} id={name} value={value || ''} onChange={onChange} required={required} placeholder={placeholder} disabled={disabled} className="input-form" {...props} /> </div> );
}
function TextAreaField({ label, name, value, onChange, required = false, placeholder = '', disabled = false, ...props }) {
  return ( <div> <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label> <textarea name={name} id={name} rows={4} value={value || ''} onChange={onChange} required={required} placeholder={placeholder} disabled={disabled} className="input-form" {...props} /> </div> );
}

// --- Minha Função Auxiliar para Nome de Arquivo (Também reutilizada) ---
const generateUniqueFileName = (file) => {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file'; const safeBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, '_'); const uniqueId = uuidv4().substring(0, 8); return `${uniqueId}-${safeBaseName}.${fileExt}`;
};

// --- Componente Principal da Página de Edição ---
export default function EditarNegocioPage() {
  const router = useRouter();
  const { id: negocioId } = useParams(); // Pego o ID do negócio da URL.
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Loading geral da página.
  const [negocioOriginal, setNegocioOriginal] = useState(null); // Guardo os dados originais para comparar e para as características.

  // --- Meus Estados para o Formulário ---
  const [formState, setFormState] = useState({
    nome: '', categoria_id: '', descricao: '', endereco: '', cidade: '',
    telefone: '', whatsapp: '', website: '',
  });
  const [categorias, setCategorias] = useState([]);
  // Aqui eu guardo TODAS as características do banco, com suas associações de categoria.
  const [allCharacteristics, setAllCharacteristics] = useState([]);
  const [selectedCaracteristicas, setSelectedCaracteristicas] = useState([]); // IDs das características selecionadas para ESTE negócio.
  // Estrutura de imageFiles: { id, file?, preview, uploading, uploaded, error, url?, fileName?, isExisting: boolean, statusText? }
  const [imageFiles, setImageFiles] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ message: '', type: '' });
  const [uploadError, setUploadError] = useState('');
  const [loadingInitialData, setLoadingInitialData] = useState(true); // Loading para os dados iniciais do formulário (negócio, categorias, características).
  const [imagesToDelete, setImagesToDelete] = useState([]); // Array com os paths das imagens a serem deletadas do Storage.

  // --- Minha Função para verificar se o usuário é Admin ---
  const checkUserRole = useCallback(async (userId) => {
    if (!userId) return false;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (error && error.code !== 'PGRST116') { throw error; } // PGRST116 = row not found, não é erro fatal.
      return data?.role === 'admin';
    } catch (err) {
      console.error("Erro ao verificar role do usuário:", err);
      return false;
    }
  }, []);

  // --- Efeito Principal: Verifica Usuário e Carrega Dados do Negócio para Edição ---
  useEffect(() => {
    const loadPageData = async () => {
      setLoading(true);
      setLoadingInitialData(true);
      setSubmitStatus({ message: '', type: '' });

      // 1. Verifico se o usuário está logado.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push('/login?message=Você precisa estar logado para editar.');
        return;
      }
      setUser(session.user);

      // 2. Busco os dados do negócio que vou editar, incluindo suas características já associadas.
      try {
        const { data: negocioData, error: negocioError } = await supabase
          .from('negocios')
          .select(`*, negocio_caracteristicas ( caracteristica_id )`) // Pego o negócio e os IDs das características associadas.
          .eq('id', negocioId)
          .maybeSingle(); // Uso maybeSingle para não dar erro se o ID não existir.

        if (negocioError) throw negocioError;
        if (!negocioData) {
          setSubmitStatus({ message: 'Estabelecimento não encontrado.', type: 'error' });
          setLoading(false); setLoadingInitialData(false); return;
        }

        // 3. Verifico se o usuário logado é o dono do negócio OU se é um admin.
        const isAdminUser = await checkUserRole(session.user.id);
        if (negocioData.usuario_id !== session.user.id && !isAdminUser) {
          setSubmitStatus({ message: 'Você não tem permissão para editar este estabelecimento.', type: 'error' });
          setLoading(false); setLoadingInitialData(false); return;
        }

        setNegocioOriginal(negocioData); // Guardo os dados originais.

        // 4. Preencho o estado do formulário com os dados do negócio.
        setFormState({
          nome: negocioData.nome || '',
          categoria_id: negocioData.categoria_id || '',
          descricao: negocioData.descricao || '',
          endereco: negocioData.endereco || '',
          cidade: negocioData.cidade || '',
          telefone: negocioData.telefone || '',
          whatsapp: negocioData.whatsapp || '',
          website: negocioData.website || '',
        });

        // 5. Preencho as características que já estavam selecionadas para este negócio.
        const currentCaracteristicaIds = negocioData.negocio_caracteristicas?.map(nc => nc.caracteristica_id) || [];
        setSelectedCaracteristicas(currentCaracteristicaIds);

        // 6. Preparo o estado das imagens existentes para exibição.
        const existingImages = (negocioData.imagens || []).map((url, index) => {
            const id = uuidv4(); let fileName = null;
            try { const urlParts = new URL(url); const pathParts = urlParts.pathname.split('/'); fileName = pathParts[pathParts.length - 1]; } catch {} // Tento pegar o nome do arquivo da URL.
            return { id, file: null, preview: url, uploading: false, uploaded: true, error: null, url: url, fileName: fileName, isExisting: true, statusText: null };
        });
        setImageFiles(existingImages);
        setMainImageIndex(0); // A primeira imagem existente é a principal por padrão.

        // 7. Busco todas as Categorias e TODAS as Características (com suas associações de categoria) do banco.
        const [catRes, caracRes] = await Promise.all([
          supabase.from('categorias').select('id, nome').order('nome'),
          // Busco as características e também os IDs das categorias às quais cada característica está associada.
          supabase.from('caracteristicas')
                  .select(`id, nome, caracteristica_categorias ( categoria_id )`)
                  .order('nome')
        ]);

        if (catRes.error) throw catRes.error;
        setCategorias(catRes.data || []);

        if (caracRes.error) throw caracRes.error;
        // Formato os dados das características para facilitar o filtro dinâmico depois.
        const formattedCharacteristics = (caracRes.data || []).map(c => ({
            id: c.id,
            nome: c.nome,
            // Crio um array simples só com os IDs das categorias associadas a esta característica.
            associatedCategoryIds: c.caracteristica_categorias.map(cc => cc.categoria_id)
        }));
        setAllCharacteristics(formattedCharacteristics); // Salvo todas as características formatadas no estado.

      } catch (error) {
        console.error("Erro ao carregar dados para edição:", error);
        setSubmitStatus({ message: `Erro ao carregar dados: ${error.message}`, type: 'error' });
      } finally {
        setLoading(false);
        setLoadingInitialData(false);
      }
    };

    if (negocioId) { loadPageData(); } // Só carrego se tiver um ID de negócio.
    else { setSubmitStatus({ message: 'ID do estabelecimento inválido.', type: 'error' }); setLoading(false); setLoadingInitialData(false); }

  }, [negocioId, router, checkUserRole]); // Dependências do efeito.

  // --- Meus Handlers para Mudanças no Formulário ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));

    // Se o usuário mudar a categoria, limpo as características selecionadas.
    // Isso é bom porque as características disponíveis podem mudar com a categoria.
    if (name === 'categoria_id') {
        setSelectedCaracteristicas([]);
    }
  };
  const handleCaracteristicaChange = (caracteristicaId) => {
    setSelectedCaracteristicas(prev =>
      prev.includes(caracteristicaId)
        ? prev.filter(id => id !== caracteristicaId) // Se já está, remove.
        : [...prev, caracteristicaId] // Se não está, adiciona.
    );
  };

  // --- Meus Handlers para Gerenciamento de Imagens ---
  const handleFileChange = (event) => { // Quando o usuário seleciona novas imagens.
    const files = Array.from(event.target.files); const availableSlots = 5 - imageFiles.length; if (availableSlots <= 0) return; // Limite de 5 imagens.
    const filesToProcess = files.slice(0, availableSlots); setUploadError(''); setSubmitStatus({ message: '', type: '' });
    const newImageFilesInitialState = filesToProcess.map(file => { const id = uuidv4(); const originalFileName = generateUniqueFileName(file); return { id, file, preview: URL.createObjectURL(file), uploading: false, uploaded: false, error: null, url: null, fileName: originalFileName, isExisting: false, statusText: null }; });
    setImageFiles(prev => [...prev, ...newImageFilesInitialState]);
    event.target.value = ''; // Limpo o input de arquivo.
  };
  const handleRemoveImage = (idToRemove) => { // Quando o usuário clica para remover uma imagem.
    const imageToRemove = imageFiles.find(img => img.id === idToRemove); if (!imageToRemove) return;
    // Se a imagem a ser removida é uma que já existia no banco (isExisting = true),
    // eu adiciono o path dela ao array `imagesToDelete` para deletar do Storage depois.
    if (imageToRemove.isExisting && imageToRemove.url) { try { const urlParts = new URL(imageToRemove.url); const pathStartIndex = urlParts.pathname.indexOf('/imagens/') + '/imagens/'.length; const filePath = urlParts.pathname.substring(pathStartIndex); if (filePath) { setImagesToDelete(prev => [...prev, filePath]); console.log("Marcado para deletar do Storage:", filePath); } } catch (e) { console.warn("Erro ao parsear URL para deletar:", e); } }
    if (imageToRemove.preview?.startsWith('blob:')) { URL.revokeObjectURL(imageToRemove.preview); } // Libero memória do blob.
    const updatedImageFiles = imageFiles.filter(img => img.id !== idToRemove); setImageFiles(updatedImageFiles);
    // Reajusto o índice da imagem principal se necessário.
    if (updatedImageFiles.length === 0) { setMainImageIndex(0); } else if (idToRemove === imageFiles[mainImageIndex]?.id) { setMainImageIndex(0); } else { const currentMainImageId = imageFiles[mainImageIndex]?.id; const newMainIndex = updatedImageFiles.findIndex(img => img.id === currentMainImageId); setMainImageIndex(newMainIndex >= 0 ? newMainIndex : 0); }
    setSubmitStatus({ message: '', type: '' }); setUploadError('');
  };
  const handleSetMainImage = (idToSetMain) => { // Quando o usuário define uma imagem como principal.
    const indexToSetMain = imageFiles.findIndex(img => img.id === idToSetMain);
    // Só permito se a imagem não estiver em upload.
    if (indexToSetMain !== -1 && !imageFiles[indexToSetMain].uploading) { setMainImageIndex(indexToSetMain); setSubmitStatus({ message: '', type: '' }); }
    else if (imageFiles[indexToSetMain]?.uploading) { setSubmitStatus({ message: 'Aguarde o envio da imagem.', type: 'info' }); }
  };

  // --- Minha Função de Upload e Compressão de Imagens (Reutilizada) ---
  const uploadAndCompressImages = async (filesToUpload) => {
    const uploadedUrlsMap = new Map(); let localUploadErrors = [];
    const uploadPromises = filesToUpload.map(async (imgState) => {
      const file = imgState.file; if (!file) return { id: imgState.id, success: false, error: 'Arquivo inválido' };
      const webpFileName = `${imgState.fileName?.replace(/\.[^/.]+$/, '') || uuidv4()}.webp`; // Nome final será .webp.
      const filePath = `public/${user.id}/${webpFileName}`; // Caminho no Storage.
      setImageFiles(prev => prev.map(i => i.id === imgState.id ? { ...i, uploading: true, statusText: 'Otimizando...' } : i));
      try {
        const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/webp', initialQuality: 0.85 }; // Minhas opções de compressão.
        const compressedFile = await imageCompression(file, options);
        setImageFiles(prev => prev.map(i => i.id === imgState.id ? { ...i, statusText: 'Enviando...' } : i));
        const { error: uploadError } = await supabase.storage.from('imagens').upload(filePath, compressedFile, { contentType: 'image/webp', upsert: false }); // upsert: false para não sobrescrever.
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('imagens').getPublicUrl(filePath);
        if (!publicUrl) throw new Error('Não foi possível obter URL pública.');
        uploadedUrlsMap.set(imgState.id, publicUrl);
        setImageFiles(prev => prev.map(i => i.id === imgState.id ? { ...i, uploading: false, uploaded: true, url: publicUrl, fileName: filePath, error: null, statusText: null } : i));
        return { id: imgState.id, success: true, url: publicUrl };
      } catch (error) { console.error(`Erro no processo de ${file.name} -> ${webpFileName}:`, error); localUploadErrors.push({ id: imgState.id, fileName: file.name, message: error.message }); setImageFiles(prev => prev.map(i => i.id === imgState.id ? { ...i, uploading: false, uploaded: false, error: error.message || 'Falha', statusText: null } : i)); return { id: imgState.id, success: false, error: error.message }; }
    });
    await Promise.all(uploadPromises);
    if (localUploadErrors.length > 0) { const errorMsg = `Falha ao enviar ${localUploadErrors.length} imagem(ns).`; setUploadError(errorMsg); throw new Error(errorMsg); }
    return uploadedUrlsMap; // Retorno o mapa de IDs para URLs.
  };

  // --- Minha Função de Submissão do Formulário (Adaptada para UPDATE) ---
  const handleSubmit = async (event) => {
    event.preventDefault(); setIsSubmitting(true); setSubmitStatus({ message: '', type: '' }); setUploadError('');
    // Lembrete: Não limpo `imagesToDelete` aqui, só depois que o delete no storage for tentado.
    if (!user || !negocioOriginal) { setSubmitStatus({ message: 'Erro: Usuário ou dados originais não carregados.', type: 'error' }); setIsSubmitting(false); return; }
    if (imageFiles.filter(img => !img.error).length === 0) { setSubmitStatus({ message: 'Adicione pelo menos uma imagem válida.', type: 'error' }); setIsSubmitting(false); return; }

    let currentMainIndex = mainImageIndex;
    // Verifico se a imagem principal que está selecionada é válida (não tem erro e não está em upload).
    if (imageFiles[currentMainIndex]?.error || imageFiles[currentMainIndex]?.uploading) {
        // Se não for, tento encontrar a primeira imagem válida que já tenha uma URL (ou seja, já foi upada ou é existente).
        const firstValidIndex = imageFiles.findIndex(img => !img.error && !img.uploading && img.url);
        if (firstValidIndex === -1) { // Se não achar nenhuma, erro.
            setSubmitStatus({ message: 'Nenhuma imagem válida disponível para ser a principal. Verifique os envios.', type: 'error' });
            setIsSubmitting(false);
            return;
        }
        setSubmitStatus({ message: 'Imagem principal inválida, usando a primeira imagem válida disponível.', type: 'warning' });
        setMainImageIndex(firstValidIndex);
        currentMainIndex = firstValidIndex; // Atualizo o índice que vou usar.
    }

    if (!formState.categoria_id) { setSubmitStatus({ message: 'Selecione uma categoria.', type: 'error' }); setIsSubmitting(false); return; }

    let finalImageUrls = [];
    try {
      // 1. Deleto do Storage as imagens que foram marcadas para deleção.
      const pathsToDeleteNow = [...imagesToDelete]; // Crio uma cópia para não ter problemas se o estado mudar.
      if (pathsToDeleteNow.length > 0) {
        console.log("Deletando imagens do storage:", pathsToDeleteNow);
        setSubmitStatus({ message: 'Removendo imagens antigas...', type: 'loading' });
        const { error: delErr } = await supabase.storage.from('imagens').remove(pathsToDeleteNow);
        if (delErr) {
          console.error("Erro ao deletar imagens do storage:", delErr);
          // Mostro um aviso, mas continuo o processo de salvar.
          setSubmitStatus({ message: 'Aviso: Erro ao remover algumas imagens antigas do armazenamento.', type: 'warning' });
        }
        // Limpo o array de imagens a deletar SÓ DEPOIS de tentar a operação.
        setImagesToDelete([]);
      }

      // 2. Faço Upload das Novas Imagens (as que não são `isExisting` e têm `file`).
      const imagesParaUpload = imageFiles.filter(img => !img.isExisting && img.file && !img.error && !img.uploaded);
      let uploadedUrlsMap = new Map();
      if (imagesParaUpload.length > 0) {
        setSubmitStatus({ message: `Enviando ${imagesParaUpload.length} novas imagens...`, type: 'loading' });
        uploadedUrlsMap = await uploadAndCompressImages(imagesParaUpload);
      }

      // 3. Atualizo o estado local das imagens e monto o array final de URLs.
      const updatedImageFilesState = imageFiles
        .map(img => { // Para cada imagem no estado atual...
            if (uploadedUrlsMap.has(img.id)) { // Se ela foi uma das que acabaram de ser upadas...
                return { ...img, url: uploadedUrlsMap.get(img.id), uploaded: true, uploading: false, error: null, statusText: null, isExisting: true }; // Atualizo com a URL e marco como existente.
            }
            return img; // Senão, mantenho como estava (pode ser uma existente antiga ou uma com erro).
        })
        .filter(img => !img.error); // Removo do estado final qualquer imagem que tenha tido erro no upload.

      setImageFiles(updatedImageFilesState); // Atualizo o estado `imageFiles` com as URLs e sem os erros.

      // Recalculo o índice da imagem principal, pois a original pode ter sido removida por erro.
      const mainImageIdAfterUpload = imageFiles[currentMainIndex]?.id; // Pego o ID da que *era* a principal.
      const finalMainIndex = updatedImageFilesState.findIndex(img => img.id === mainImageIdAfterUpload); // Procuro ela no novo array.
      currentMainIndex = finalMainIndex >= 0 ? finalMainIndex : 0; // Se sumiu, a primeira vira principal.

      if (updatedImageFilesState.length === 0) { // Se não sobrou nenhuma imagem válida.
          throw new Error("Nenhuma imagem válida restou após o processamento. Adicione ou corrija as imagens.");
      }

      const mainImageUrl = updatedImageFilesState[currentMainIndex]?.url; // Pego a URL da imagem principal final.
      if (!mainImageUrl) { throw new Error("Erro crítico: URL da imagem principal não encontrada após processamento."); }

      const additionalImageUrls = updatedImageFilesState // Pego as URLs das outras imagens.
        .filter((img, index) => index !== currentMainIndex && img.url)
        .map(img => img.url);
      finalImageUrls = [mainImageUrl, ...additionalImageUrls]; // Array final: [principal, ...adicionais].

      // 4. Atualizo os Dados do Negócio no Banco.
      setSubmitStatus({ message: 'Atualizando dados do estabelecimento...', type: 'loading' });
      const negocioUpdateData = {
        nome: formState.nome,
        categoria_id: formState.categoria_id,
        descricao: formState.descricao || null,
        endereco: formState.endereco || null,
        cidade: formState.cidade,
        telefone: formState.telefone || null,
        whatsapp: formState.whatsapp || null,
        website: formState.website || null,
        imagens: finalImageUrls, // Salvo o array de URLs atualizado.
        data_atualizacao: new Date().toISOString(), // Marco a data da atualização.
      };
      const { error: updateNegocioError } = await supabase
        .from('negocios')
        .update(negocioUpdateData)
        .eq('id', negocioId);
      if (updateNegocioError) throw updateNegocioError;

      // 5. Atualizo as Características Associadas (Delete as antigas que não estão mais, Insere as novas).
      setSubmitStatus({ message: 'Atualizando características...', type: 'loading' });
      const originalCaracteristicaIds = negocioOriginal.negocio_caracteristicas?.map(nc => nc.caracteristica_id) || [];
      // IDs que estavam no original mas não estão mais selecionados -> Deletar.
      const caracteristicasParaDeletar = originalCaracteristicaIds.filter(id => !selectedCaracteristicas.includes(id));
      // IDs que estão selecionados agora mas não estavam no original -> Inserir.
      const caracteristicasParaInserir = selectedCaracteristicas.filter(id => !originalCaracteristicaIds.includes(id));

      if (caracteristicasParaDeletar.length > 0) {
        console.log("Deletando associações de características:", caracteristicasParaDeletar);
        const { error: delCaracErr } = await supabase.from('negocio_caracteristicas').delete().eq('negocio_id', negocioId).in('caracteristica_id', caracteristicasParaDeletar);
        if (delCaracErr) console.error("Erro ao deletar associações de características:", delCaracErr); // Logo o erro, mas continuo.
      }

      if (caracteristicasParaInserir.length > 0) {
        console.log("Inserindo associações de características:", caracteristicasParaInserir);
        const insertData = caracteristicasParaInserir.map(caracId => ({ negocio_id: negocioId, caracteristica_id: caracId }));
        const { error: insCaracErr } = await supabase.from('negocio_caracteristicas').insert(insertData);
        if (insCaracErr) console.error("Erro ao inserir associações de características:", insCaracErr); // Logo o erro, mas continuo.
      }

      // 6. Sucesso!
      setSubmitStatus({ message: 'Alterações salvas com sucesso! Redirecionando...', type: 'success' });
      // Atualizo o `negocioOriginal` no estado para refletir o que foi salvo.
      // Isso é útil se o usuário fizer mais edições sem recarregar a página.
      setNegocioOriginal(prev => ({
          ...prev,
          ...negocioUpdateData,
          negocio_caracteristicas: selectedCaracteristicas.map(id => ({ caracteristica_id: id })) // Atualizo as características também.
      }));

      setTimeout(() => {
        router.push(`/negocio/${negocioId}`); // Levo de volta para a página de detalhes do negócio.
        // router.refresh(); // Opcional: Forçar revalidação dos dados na página de destino.
      }, 2000);

    } catch (err) {
      console.error("Erro durante a atualização:", err);
      setSubmitStatus({ message: `Erro ao salvar: ${uploadError || err.message || 'Ocorreu um problema.'}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Efeito de Limpeza para as URLs de Preview das Imagens ---
  useEffect(() => {
    // Limpo as Object URLs quando o componente desmonta ou quando `imageFiles` muda,
    // para evitar memory leaks. Só faço isso para as imagens que são novas (não `isExisting`)
    // e que têm um preview que é um blob.
    return () => {
      imageFiles.forEach(img => {
        if (img.preview && !img.isExisting && img.preview.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, [imageFiles]); // Dependência correta para este efeito.

  // --- Meu FILTRO DINÂMICO DAS CARACTERÍSTICAS usando useMemo ---
  const filteredCharacteristics = useMemo(() => {
    const selectedCategoryId = formState.categoria_id; // Pego a categoria que está selecionada no formulário.

    // Se nenhuma categoria estiver selecionada no formulário, não mostro nenhuma característica.
    if (!selectedCategoryId) {
      return [];
    }

    // Filtro a lista completa de características (`allCharacteristics`).
    return allCharacteristics.filter(char =>
      // Uma característica aparece se:
      // 1. O array de categorias associadas a ela (`char.associatedCategoryIds`) inclui a categoria selecionada no formulário.
      char.associatedCategoryIds.includes(selectedCategoryId)
      // OU
      // 2. A característica é "global" (ou seja, `char.associatedCategoryIds` está vazio, significando que ela se aplica a todas as categorias).
      || char.associatedCategoryIds.length === 0
    );
  }, [formState.categoria_id, allCharacteristics]); // Recalculo esta lista filtrada só quando a categoria selecionada ou a lista total de características mudam.


  // --- Minha Renderização ---
  if (loading) return <div className="text-center p-10">Carregando dados para edição...</div>;
  // Se deu erro ao carregar o negócio (permissão, não encontrado, etc.), mostro a mensagem.
  if (!negocioOriginal && !loading) return <div className="p-6 text-red-600 bg-red-100 rounded-md text-center">{submitStatus.message || 'Erro ao carregar estabelecimento.'}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 bg-white shadow-lg rounded-lg my-10 relative">
      {/* Meu CABEÇALHO da página de edição, com botão para gerenciar assinatura. */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-3 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Editar Estabelecimento</h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Botão para a página de Gerenciar Assinatura. */}
              <Link href={`/pagamento-assinatura?negocioId=${negocioId}`} className="button-secondary bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out shadow-sm">
                  Gerenciar Assinatura
              </Link>
              <Link href={`/negocio/${negocioId}`} className="text-sm text-blue-600 hover:text-blue-800">
              &larr; Voltar aos Detalhes
          </Link>
          </div>
      </div>

      {/* Minhas Mensagens de Status e Erro do formulário. */}
      {submitStatus.message && submitStatus.type !== 'loading' && ( <div className={`p-4 mb-6 rounded-md text-center ${ submitStatus.type === 'success' ? 'bg-green-100 text-green-800' : submitStatus.type === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800' }`}> {submitStatus.message} </div> )}
      {submitStatus.message && submitStatus.type === 'loading' && ( <div className="p-4 mb-6 rounded-md text-center bg-blue-100 text-blue-800 flex items-center justify-center gap-2"> <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> {submitStatus.message} </div> )}
      {uploadError && !isSubmitting && ( <div className="p-4 mb-6 rounded-md text-center bg-red-100 text-red-800"> Erro no upload: {uploadError} </div> )}

      {/* Meu Formulário de Edição. */}
      {loadingInitialData ? ( // Mostro um loading para as opções do formulário (categorias, características).
          <div className="text-center p-10">Carregando opções do formulário...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seção 1: Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField name="nome" label="Nome do Estabelecimento" value={formState.nome} onChange={handleChange} required disabled={isSubmitting} />
            <div>
              <label htmlFor="categoria_id" className="block text-sm font-medium text-gray-700 mb-1">Categoria <span className="text-red-500">*</span></label>
              <select id="categoria_id" name="categoria_id" value={formState.categoria_id} onChange={handleChange} required className="input-form bg-white" disabled={isSubmitting || categorias.length === 0}>
                <option value="" disabled>-- Selecione o tipo --</option>
                {categorias.map((cat) => ( <option key={cat.id} value={cat.id}>{cat.nome}</option> ))}
              </select>
              {categorias.length === 0 && !loadingInitialData && <p className="text-xs text-red-500 mt-1">Nenhuma categoria cadastrada no sistema.</p>}
            </div>
          </div>
          {/* Seção 2: Descrição */}
          <TextAreaField name="descricao" label="Descrição" value={formState.descricao} onChange={handleChange} disabled={isSubmitting} placeholder="Descreva seu negócio, diferenciais, etc."/>
          {/* Seção 3: Localização */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField name="endereco" label="Endereço Completo (Opcional)" value={formState.endereco} onChange={handleChange} disabled={isSubmitting} placeholder="Rua, Número, Bairro..." />
            <InputField name="cidade" label="Cidade" value={formState.cidade} onChange={handleChange} required disabled={isSubmitting} />
          </div>
          {/* Seção 4: Contato */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField name="telefone" label="Telefone Fixo (Opcional)" value={formState.telefone} onChange={handleChange} disabled={isSubmitting} type="tel" placeholder="(XX) XXXX-XXXX"/>
            <InputField name="whatsapp" label="WhatsApp (Opcional)" value={formState.whatsapp} onChange={handleChange} disabled={isSubmitting} type="tel" placeholder="(XX) 9XXXX-XXXX"/>
          </div>
          {/* Seção 5: Website */}
          <InputField name="website" label="Website ou Rede Social (Opcional)" value={formState.website} onChange={handleChange} disabled={isSubmitting} type="url" placeholder="https://..."/>
          {/* Seção 6: Upload de Imagens */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Imagens (máx. 5, a primeira será a principal) <span className="text-red-500">*</span></label>
            <div className="mb-4 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 48 48" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" /></svg>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="file-upload" className={`relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500 ${isSubmitting || imageFiles.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <span>{imageFiles.length > 0 ? 'Adicionar mais imagens' : 'Escolher imagens'}</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} disabled={isSubmitting || imageFiles.length >= 5} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, WEBP. Máximo de 5 fotos. ({5 - imageFiles.length} restantes)</p>
              </div>
            </div>
            {imageFiles.length === 0 && !isSubmitting && ( // Mostro esta mensagem se não houver imagens e não estiver submetendo.
                <p className="text-sm text-red-600 text-center">É necessário adicionar pelo menos uma imagem.</p>
            )}
            {imageFiles.length > 0 && ( // Previews das imagens.
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {imageFiles.map((img, index) => (
                  <div key={img.id} className="relative group border rounded-md overflow-hidden aspect-square flex items-center justify-center bg-gray-100">
                    <img src={img.preview} alt={`Preview ${index + 1}`} className={`object-cover w-full h-full transition-opacity duration-300 ${mainImageIndex === index ? 'ring-4 ring-offset-2 ring-green-500' : 'ring-1 ring-gray-300'} ${img.uploading || img.error ? 'opacity-50' : 'opacity-100'}`} onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=Erro'; }} />
                    {/* Meus Overlays de status e botões de ação para cada imagem. */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 p-1 text-white text-center ${img.uploading || img.error ? 'bg-black bg-opacity-60' : 'bg-black bg-opacity-0 group-hover:bg-opacity-60'}`}>
                      {img.uploading && ( <div className="flex flex-col items-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-1" title={img.statusText || 'Processando...'}></div><p className="text-xs">{img.statusText || 'Processando...'}</p></div> )}
                      {img.error && !img.uploading && ( <div className="p-1" title={typeof img.error === 'string' ? img.error : 'Erro'}><svg className="h-6 w-6 text-red-500 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><p className="text-xs text-red-300 truncate">{typeof img.error === 'string' ? img.error.substring(0, 30) : 'Erro'}</p></div> )}
                      {/* Botões só aparecem no hover se não houver erro/upload. */}
                      {!img.uploading && !img.error && (
                        <div className={`absolute inset-0 flex flex-col items-center justify-center space-y-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                            <button type="button" onClick={() => handleRemoveImage(img.id)} disabled={isSubmitting} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed z-10" aria-label="Remover imagem"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                            {mainImageIndex !== index && ( <button type="button" onClick={() => handleSetMainImage(img.id)} disabled={isSubmitting} className="text-white text-xs bg-green-600 px-2 py-1 rounded shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed z-10"> Tornar Principal </button> )}
                        </div>
                      )}
                    </div>
                    {/* Meu Badge "Principal". */}
                    {mainImageIndex === index && !img.uploading && !img.error && <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded shadow z-10">Principal</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção 7: Características - Agora com filtro dinâmico. */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Características Oferecidas {formState.categoria_id && categorias.find(c=>c.id === formState.categoria_id) ? `(para ${categorias.find(c=>c.id === formState.categoria_id).nome})` : ''}
            </label>

            {/* Só mostro as características se uma categoria foi selecionada. */}
            {formState.categoria_id ? (
              <>
                {loadingInitialData && <p className="text-sm text-gray-500">Carregando características...</p>}

                {!loadingInitialData && filteredCharacteristics.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-3 border p-4 rounded-md bg-gray-50">
                    {/* Mapeio a lista JÁ FILTRADA de características. */}
                    {filteredCharacteristics.map((item) => (
                      <div key={item.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`caracteristica-${item.id}`}
                          value={item.id}
                          checked={selectedCaracteristicas.includes(item.id)}
                          onChange={() => handleCaracteristicaChange(item.id)}
                          disabled={isSubmitting}
                          className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                        />
                        <label htmlFor={`caracteristica-${item.id}`} className="ml-2 block text-sm text-gray-900 cursor-pointer">
                          {item.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mensagem se não houver características para a categoria selecionada (mas existem características no sistema). */}
                {!loadingInitialData && filteredCharacteristics.length === 0 && allCharacteristics.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1 p-4 border rounded-md bg-gray-50 text-center">
                    Nenhuma característica específica encontrada para esta categoria.
                  </p>
                )}

                {/* Mensagem se não houver NENHUMA característica cadastrada no sistema. */}
                {!loadingInitialData && allCharacteristics.length === 0 && (
                  <p className="text-sm text-yellow-600 mt-1 p-4 border border-yellow-200 rounded-md bg-yellow-50 text-center">
                    Nenhuma característica cadastrada no sistema ainda.
                  </p>
                )}
              </>
            ) : (
              // Mensagem para o usuário selecionar uma categoria primeiro.
              <p className="text-sm text-yellow-600 mt-1 p-4 border border-yellow-200 rounded-md bg-yellow-50 text-center">
                Selecione uma categoria acima para ver as características disponíveis.
              </p>
            )}
          </div>

          {/* Meu Botão de Submit. */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting || loadingInitialData || imageFiles.some(img => img.uploading) || imageFiles.filter(img => !img.error).length === 0} // Desabilito se estiver submetendo, carregando dados, alguma imagem em upload, ou se não houver imagens válidas.
              className="w-full button-primary flex items-center justify-center py-3"
            >
              {isSubmitting ? (
                <> <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processando... </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Meus Estilos CSS Globais (reutilizados). */}
      <style jsx global>{`
        .input-form { display: block; width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); color: #000; }
        .input-form:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.5); }
        .input-form:disabled { background-color: #f3f4f6; opacity: 0.7; cursor: not-allowed; }
        .button-primary { background-color: #059669; color: white; font-weight: bold; padding: 0.75rem 1rem; border-radius: 0.375rem; transition: background-color 0.3s; }
        .button-secondary { transition: background-color 0.3s; } /* Estilo base para transição do botão secundário. */
        .button-primary:hover:not(:disabled) { background-color: #047857; }
        .button-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

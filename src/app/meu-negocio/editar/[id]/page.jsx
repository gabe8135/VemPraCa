// src/app/meu-negocio/editar/[id]/page.jsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react'; // Lembrete: Adicionei o useMemo aqui.
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';
import LoadingModal from '@/app/components/LoadingModal'; // 1. Importar o LoadingModal
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

// --- Constante para o limite de imagens ---
const MAX_IMAGES_PER_BUSINESS = 15; // Limite máximo de imagens por estabelecimento.


// --- Componente Principal da Página de Edição ---
export default function EditarNegocioPage() {
  const router = useRouter();
  const { id: negocioId } = useParams(); // Pego o ID do negócio da URL.
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Meu loading geral da página.
  const [negocioOriginal, setNegocioOriginal] = useState(null); // Preciso guardar os dados originais para comparar e para as características.
  const [ownerProfile, setOwnerProfile] = useState(null); // Para guardar o nome_proprietario do perfil do dono

  // --- Meus Estados para o Formulário ---
  const [formState, setFormState] = useState({
    nome: '', proprietario: '', categoria_id: '', descricao: '', endereco: '', cidade: '', // Adicionado proprietario
    telefone: '', whatsapp: '', website: '',
  });
  const [categorias, setCategorias] = useState([]);
  // Aqui eu guardo TODAS as características do banco, com suas associações de categoria.
  // NOVO ESTADO: Para armazenar as relações da tabela caracteristica_categorias
  const [caracteristicaCategoriaRelations, setCaracteristicaCategoriaRelations] = useState([]);
  const [allCharacteristics, setAllCharacteristics] = useState([]);
  const [selectedCaracteristicas, setSelectedCaracteristicas] = useState([]); // IDs das características selecionadas para ESTE negócio.
  // Minha estrutura de imageFiles: { id, file?, preview, uploading, uploaded, error, url?, fileName?, isExisting: boolean, statusText? }
  const [imageFiles, setImageFiles] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ message: '', type: '' });
  const [uploadError, setUploadError] = useState('');
  const [loadingInitialData, setLoadingInitialData] = useState(true); // Meu loading para os dados iniciais do formulário (negócio, categorias, características).
  const [imagesToDelete, setImagesToDelete] = useState([]); // Meu array com os paths das imagens a serem deletadas do Storage.

  // --- Minha Função para verificar se o usuário é Admin ---
  const checkUserRole = useCallback(async (userId) => {
    if (!userId) return false;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (error && error.code !== 'PGRST116') { throw error; } // PGRST116 = row not found, não é um erro fatal pra mim aqui.
      return data?.role === 'admin';
    } catch (err) {
      console.error("Erro ao verificar role do usuário:", err);
      return false;
    }
  }, []);

  // --- Meu Efeito Principal: Verifica Usuário e Carrega Dados do Negócio para Edição ---
  useEffect(() => {
    const loadPageData = async () => {
      setLoading(true);
      setLoadingInitialData(true);
      setSubmitStatus({ message: '', type: '' });

      // 1. Verifico se estou logado.
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

        // 3. Verifico se sou o dono do negócio OU se sou um admin.
        const isAdminUser = await checkUserRole(session.user.id);
        if (negocioData.usuario_id !== session.user.id && !isAdminUser) {
          setSubmitStatus({ message: 'Você não tem permissão para editar este estabelecimento.', type: 'error' });
          setLoading(false); setLoadingInitialData(false); return;
        }

        setNegocioOriginal(negocioData); // Guardo os dados originais.

        // 4. Busco o perfil do dono para pegar o nome_proprietario consistente
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('nome_proprietario')
          .eq('id', negocioData.usuario_id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116: row not found
          console.warn("Aviso: Perfil do proprietário não encontrado ou erro ao buscar.", profileError);
          // Não é um erro fatal aqui, podemos prosseguir com o nome do negócio como fallback
        }
        setOwnerProfile(profileData);

        // 5. Preencho o estado do meu formulário com os dados do negócio e do perfil.
        setFormState({
          nome: negocioData.nome || '',
          proprietario: profileData?.nome_proprietario || negocioData.proprietario || '', // Prioriza o do perfil
          categoria_id: negocioData.categoria_id || '',
          descricao: negocioData.descricao || '',
          endereco: negocioData.endereco || '',
          cidade: negocioData.cidade || '',
          telefone: negocioData.telefone || '',
          whatsapp: negocioData.whatsapp || '',
          website: negocioData.website || '',
        });

        // 6. Preencho as características que já estavam selecionadas para este negócio.
        const currentCaracteristicaIds = negocioData.negocio_caracteristicas?.map(nc => nc.caracteristica_id) || [];
        setSelectedCaracteristicas(currentCaracteristicaIds);

        // 7. Preparo o estado das imagens existentes para exibição.
        const existingImages = (negocioData.imagens || []).map((url, index) => {
            const id = uuidv4(); let fileName = null;
            try { const urlParts = new URL(url); const pathParts = urlParts.pathname.split('/'); fileName = pathParts[pathParts.length - 1]; } catch {} // Tento pegar o nome do arquivo da URL.
            // Para imagens existentes, 'preview' e 'url' são a mesma coisa inicialmente.
            // O importante é que 'url' tenha a URL do Supabase.
            return { id, file: null, preview: url, uploading: false, uploaded: true, error: null, url: url, fileName: fileName, isExisting: true, statusText: null };
        });
        setImageFiles(existingImages);
        setMainImageIndex(0); // A primeira imagem existente é a principal por padrão.

        // 8. Busco todas as Categorias e TODAS as Características (com suas associações de categoria) do banco.
        const [catRes, caracRes, relRes] = await Promise.all([
          supabase.from('categorias').select('id, nome').order('nome'),
          // Busca todas as características (id e nome)
          supabase.from('caracteristicas')
                  .select('id, nome')
                  .order('nome'),
          supabase.from('caracteristica_categorias').select('caracteristica_id, categoria_id') // Busca as relações
        ]);

        if (catRes.error) throw catRes.error;
        setCategorias(catRes.data || []);

        if (caracRes.error) throw caracRes.error;
        setAllCharacteristics(caracRes.data || []);

        if (relRes.error) {
          console.error("Erro Supabase ao buscar relações característica-categoria:", relRes.error);
          throw new Error(relRes.error.message || `Erro ao buscar relações: ${relRes.error.code || 'desconhecido'}`);
        }
        setCaracteristicaCategoriaRelations(relRes.data || []);

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

  }, [negocioId, router, checkUserRole]); // Minhas dependências do efeito.

  // --- Meus Handlers para Mudanças no Formulário ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));

    // Se eu mudar a categoria, limpo as características selecionadas.
    // Isso é bom porque as características disponíveis podem mudar com a categoria.
    if (name === 'categoria_id') {
        setSelectedCaracteristicas([]);
    }
  };
  const handleCaracteristicaChange = (caracteristicaId) => {
    setSelectedCaracteristicas(prev =>
      prev.includes(caracteristicaId)
        ? prev.filter(id => id !== caracteristicaId) // Se já está, removo.
        : [...prev, caracteristicaId] // Se não está, adiciono.
    );
  };

  // --- Meus Handlers para Gerenciamento de Imagens ---
  const handleFileChange = (event) => { // Quando seleciono novas imagens.
    const files = Array.from(event.target.files);
    const availableSlots = MAX_IMAGES_PER_BUSINESS - imageFiles.length; // Usa a nova constante
    if (availableSlots <= 0) return; // Meu limite de MAX_IMAGES_PER_BUSINESS imagens.
    const filesToProcess = files.slice(0, availableSlots);
    setUploadError('');
    setSubmitStatus({ message: '', type: '' });
    console.log('Arquivos selecionados (EditarNegocioPage):', filesToProcess);

    const newImageFilesInitialState = filesToProcess.map(file => {
      const id = uuidv4();
      const originalFileName = generateUniqueFileName(file);
      // Aqui 'preview' é uma URL de blob para o arquivo local.
      const blobURL = URL.createObjectURL(file);
      return { id, file, preview: blobURL, uploading: false, uploaded: false, error: null, url: null, fileName: originalFileName, isExisting: false, statusText: null };
    });
    console.log(`Criadas ${newImageFilesInitialState.length} Blob URLs para preview (EditarNegocioPage).`);

    setImageFiles(prev => {
      const combined = [...prev, ...newImageFilesInitialState];
      // Se o array de imagens anterior (prev) estava vazio e estou adicionando novas imagens,
      // garanto que a primeira imagem (índice 0) seja definida como principal.
      if (prev.length === 0 && newImageFilesInitialState.length > 0) {
        setMainImageIndex(0);
      }
      return combined;
    });
    event.target.value = ''; // Limpo o input de arquivo.
  };
  const handleRemoveImage = (idToRemove) => { // Quando clico para remover uma imagem.
    const imageToRemove = imageFiles.find(img => img.id === idToRemove); if (!imageToRemove) return;
    console.log(`Removendo imagem ID ${idToRemove} (EditarNegocioPage). É existente? ${imageToRemove.isExisting}`);
    // Se a imagem a ser removida é uma que já existia no banco (isExisting = true),
    // eu adiciono o path dela ao array `imagesToDelete` para deletar do Storage depois.
    // Adicionado log aqui também.
    // eu adiciono o path dela ao array `imagesToDelete` para deletar do Storage depois.
    if (imageToRemove.isExisting && imageToRemove.url) { try { const urlParts = new URL(imageToRemove.url); const pathStartIndex = urlParts.pathname.indexOf('/imagens/') + '/imagens/'.length; const filePath = urlParts.pathname.substring(pathStartIndex); if (filePath) { setImagesToDelete(prev => [...prev, filePath]); console.log("Marcado para deletar do Storage:", filePath); } } catch (e) { console.warn("Erro ao parsear URL para deletar:", e); } }
    if (imageToRemove.preview?.startsWith('blob:')) { URL.revokeObjectURL(imageToRemove.preview); } // Libero memória do blob se for um preview local.
    const updatedImageFiles = imageFiles.filter(img => img.id !== idToRemove); setImageFiles(updatedImageFiles);
    // Reajusto o índice da imagem principal se necessário.
    if (updatedImageFiles.length === 0) { setMainImageIndex(0); } else if (idToRemove === imageFiles[mainImageIndex]?.id) { setMainImageIndex(0); } else { const currentMainImageId = imageFiles[mainImageIndex]?.id; const newMainIndex = updatedImageFiles.findIndex(img => img.id === currentMainImageId); setMainImageIndex(newMainIndex >= 0 ? newMainIndex : 0); }
    setSubmitStatus({ message: '', type: '' }); setUploadError('');
  };
  const handleSetMainImage = (idToSetMain) => { // Quando defino uma imagem como principal.
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
      const webpFileName = `${imgState.fileName?.replace(/\.[^/.]+$/, '') || uuidv4()}.webp`; // Meu nome final será .webp.
      const filePath = `public/${user.id}/${webpFileName}`; // Meu caminho no Storage.
      setImageFiles(prev => prev.map(i => i.id === imgState.id ? { ...i, uploading: true, statusText: 'Otimizando...' } : i));
      console.log(`Iniciando compressão para: ${webpFileName} (EditarNegocioPage)`);
      try {
        const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/webp', initialQuality: 0.85 }; // Minhas opções de compressão.
        const compressedFile = await imageCompression(file, options);
        console.log(`Compressão de ${webpFileName} concluída. Tamanho: ${(compressedFile.size / (1024*1024)).toFixed(2)} MB (EditarNegocioPage)`);
        setImageFiles(prev => prev.map(i => i.id === imgState.id ? { ...i, statusText: 'Enviando...' } : i));
        console.log(`Enviando ${webpFileName} para Supabase Storage... (EditarNegocioPage)`);
        const { error: uploadError } = await supabase.storage.from('imagens').upload(filePath, compressedFile, { contentType: 'image/webp', upsert: false }); // upsert: false para não sobrescrever.
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('imagens').getPublicUrl(filePath);
        if (!publicUrl) throw new Error('Não foi possível obter URL pública.');
        uploadedUrlsMap.set(imgState.id, publicUrl);
        // Após o upload, 'url' é a URL pública e 'isExisting' se torna true. 'preview' pode ser mantido como a URL pública também.
        console.log(`Upload bem-sucedido para ${webpFileName}. URL pública obtida: ${publicUrl} (EditarNegocioPage)`);
        
        // Revoga a Blob URL (seja a original ou a comprimida) agora que temos a URL pública
        setImageFiles(prev => prev.map(i => {
            if (i.id === imgState.id) {
                if (i.preview?.startsWith('blob:')) {
                    URL.revokeObjectURL(i.preview);
                    console.log(`Blob URL revogada após upload bem-sucedido: ${i.preview} (EditarNegocioPage)`);
                }
                return { ...i, uploading: false, uploaded: true, url: publicUrl, preview: publicUrl, fileName: filePath, error: null, statusText: null, isExisting: true, file: null /* Limpa o objeto File */ };
            }
            return i;
        }));
        console.log(`Upload de ${webpFileName} concluído. URL: ${publicUrl} (EditarNegocioPage)`);
        return { id: imgState.id, success: true, url: publicUrl };
      } catch (error) { // Este é o único catch para o try acima
        console.error(`Erro no processo de ${file.name} -> ${webpFileName}:`, error); 
        localUploadErrors.push({ id: imgState.id, fileName: file.name, message: error.message }); 
        
        setImageFiles(prev => prev.map(i => {
            if (i.id === imgState.id) { 
                if (i.preview?.startsWith('blob:')) {
                    URL.revokeObjectURL(i.preview);
                    console.log(`Blob URL revogada em caso de erro (uploadAndCompressImages): ${i.preview} para ID ${imgState.id} (EditarNegocioPage)`);
                }
                return { ...i, uploading: false, uploaded: false, error: error.message || 'Falha', statusText: null, file: null /* Limpa o objeto File */ };
            }
            return i; 
        }));
        return { id: imgState.id, success: false, error: error.message }; 
      }
    }); // Fim do .map() para uploadPromises
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
        console.log(`Iniciando upload para ${imagesParaUpload.length} novas imagens... (EditarNegocioPage)`);
        setSubmitStatus({ message: `Enviando ${imagesParaUpload.length} novas imagens...`, type: 'loading' });
        uploadedUrlsMap = await uploadAndCompressImages(imagesParaUpload);
      }

      // 3. Atualizo o estado local das imagens e monto o array final de URLs.
      const updatedImageFilesState = imageFiles
        .map(img => { // Para cada imagem no estado atual...
            if (uploadedUrlsMap.has(img.id)) { // Se ela foi uma das que acabaram de ser upadas...
                // Atualizo com a URL, marco como existente e defino preview como a URL pública.
                return { ...img, url: uploadedUrlsMap.get(img.id), preview: uploadedUrlsMap.get(img.id), uploaded: true, uploading: false, error: null, statusText: null, isExisting: true, file: null }; // Garante que file seja null aqui e preview seja a URL pública
            }
            return img; // Senão, mantenho como estava (pode ser uma existente antiga ou uma com erro).
        })
        .filter(img => !img.error); // Removo do estado final qualquer imagem que tenha tido erro no upload.

      setImageFiles(updatedImageFilesState); // Atualizo o estado `imageFiles` com as URLs e sem os erros.
      console.log(`Imagens processadas com sucesso e com URL: ${updatedImageFilesState.length} (EditarNegocioPage)`);

      // Recalculo o índice da imagem principal, pois a original pode ter sido removida por erro.
      const mainImageIdAfterUpload = imageFiles[currentMainIndex]?.id; // Pego o ID da que *era* a principal.
      const finalMainIndex = updatedImageFilesState.findIndex(img => img.id === mainImageIdAfterUpload); // Procuro ela no novo array.
      currentMainIndex = finalMainIndex >= 0 ? finalMainIndex : 0; // Se sumiu, a primeira vira principal.

      if (updatedImageFilesState.length === 0) { // Se não sobrou nenhuma imagem válida.
          throw new Error("Nenhuma imagem válida restou após o processamento. Adicione ou corrija as imagens.");
      }

      const mainImageUrl = updatedImageFilesState[currentMainIndex]?.url; // Pego a URL da imagem principal final.
      if (!mainImageUrl) { throw new Error("Erro crítico: URL da imagem principal não encontrada após processamento."); }
      console.log(`URL da imagem principal final: ${mainImageUrl} (EditarNegocioPage)`);

      const additionalImageUrls = updatedImageFilesState // Pego as URLs das outras imagens.
        .filter((img, index) => index !== currentMainIndex && img.url)
        .map(img => img.url);
      finalImageUrls = [mainImageUrl, ...additionalImageUrls]; // Meu array final: [principal, ...adicionais].

      // 4. Atualizo os Dados do Negócio no Banco.
      setSubmitStatus({ message: 'Atualizando dados do estabelecimento...', type: 'loading' });
      const negocioUpdateData = {
        nome: formState.nome,
        proprietario: formState.proprietario, // Salva o nome do proprietário no negócio
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

      // 4.1. Atualizo o nome_proprietario na tabela 'profiles' do usuário dono.
      // Faço isso somente se o nome no formulário for diferente do que estava no perfil (ou se o perfil não tinha nome).
      if (formState.proprietario && (formState.proprietario !== ownerProfile?.nome_proprietario)) {
        setSubmitStatus({ message: 'Atualizando nome do proprietário no perfil...', type: 'loading' });
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ nome_proprietario: formState.proprietario })
          .eq('id', negocioOriginal.usuario_id);
        if (updateProfileError) {
          console.error("Erro ao atualizar nome do proprietário no perfil:", updateProfileError);
          setSubmitStatus({ message: 'Aviso: Erro ao atualizar nome do proprietário no perfil. As outras alterações foram salvas.', type: 'warning' });
          // Não paro o processo por isso, mas informo.
        }
      }

      // 4.2. Sincronizo o campo 'proprietario' em TODOS os negócios deste usuário.
      setSubmitStatus({ message: 'Sincronizando nome do proprietário nos seus negócios...', type: 'loading' });
      const { error: syncNegociosError } = await supabase
        .from('negocios')
        .update({ proprietario: formState.proprietario })
        .eq('usuario_id', negocioOriginal.usuario_id);
      if (syncNegociosError) {
        console.error("Erro ao sincronizar nome do proprietário entre os negócios:", syncNegociosError);
        setSubmitStatus({ message: 'Aviso: Erro ao sincronizar nome do proprietário em todos os seus negócios.', type: 'warning' });
      }

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
      // Isso é útil se eu fizer mais edições sem recarregar a página.
      setNegocioOriginal(prev => ({
          ...prev,
          ...negocioUpdateData,
          negocio_caracteristicas: selectedCaracteristicas.map(id => ({ caracteristica_id: id })) // Atualizo as características também.
      }));
      // Atualizo o perfil do proprietário no estado local também
      setOwnerProfile(prev => ({
        ...prev, nome_proprietario: formState.proprietario
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

  // --- Meu Efeito de Limpeza para as URLs de Preview das Imagens ---
  useEffect(() => {
    // Limpo as Object URLs quando o componente desmonta ou quando `imageFiles` muda,
    // para evitar memory leaks. Só faço isso para as imagens que são novas (não `isExisting`)
    // e que têm um preview que é um blob. As revogações pontuais já são tratadas.
    // Este useEffect agora cuidará da limpeza final no desmonte do componente.
    const filesToClean = [...imageFiles]; // Captura o estado atual para o cleanup
    return () => {
      filesToClean.forEach(img => {
        if (img.preview && !img.isExisting && img.preview.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview);
          console.log(`Blob URL revogada (desmontagem/limpeza EditarNegocioPage) para imagem ID ${img.id}: ${img.preview}`);
        }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array de dependências vazio para rodar apenas no mount (retornando a função de cleanup para o unmount)
  // --- Meu FILTRO DINÂMICO DAS CARACTERÍSTICAS usando useMemo ---
  const filteredCharacteristics = useMemo(() => {
    const selectedCategoryId = formState.categoria_id; // Pego a categoria que está selecionada no formulário.
    if (!selectedCategoryId || allCharacteristics.length === 0 || caracteristicaCategoriaRelations.length === 0) {
      return []; // Se não houver categoria selecionada, ou dados base, retorna vazio.
    }

    // 1. Encontra todos os caracteristica_id que pertencem à categoria selecionada.
    const relevantCaracteristicaIds = caracteristicaCategoriaRelations
      .filter(rel => rel.categoria_id === selectedCategoryId)
      .map(rel => rel.caracteristica_id);

    // 2. Filtra allCharacteristics para incluir apenas aquelas cujos IDs estão na lista de IDs relevantes.
    return allCharacteristics.filter(char =>
      relevantCaracteristicaIds.includes(char.id)
    );
  }, [formState.categoria_id, allCharacteristics, caracteristicaCategoriaRelations]); // Dependências corretas




  // --- Minha Função para determinar a mensagem do Modal ---
  const getModalMessage = () => {
    if (isSubmitting) {
      // Se submitStatus tem uma mensagem de loading específica, usa ela.
      if (submitStatus.type === 'loading' && submitStatus.message) {
        return submitStatus.message;
      }
      return 'Salvando alterações, por favor aguarde...'; // Mensagem genérica de carregamento
    }
    if (submitStatus.type === 'success' && submitStatus.message) {
      return submitStatus.message; // Mensagem de sucesso
    }
    return 'Processando...'; // Fallback (não deve ser atingido se isOpen estiver correto)
  };


  // --- Minha Renderização ---
  if (loading) return <div className="text-center p-10">Carregando dados para edição...</div>;
  // Se deu erro ao carregar o negócio (permissão, não encontrado, etc.), mostro a mensagem.
  if (!negocioOriginal && !loading) return <div className="p-6 text-red-600 bg-red-100 rounded-md text-center">{submitStatus.message || 'Erro ao carregar estabelecimento.'}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 bg-white shadow-lg rounded-lg my-10 relative">
      {/* 2. Adicionar o LoadingModal */}
      <LoadingModal
        isOpen={isSubmitting || (submitStatus.type === 'success' && !!submitStatus.message)}
        message={getModalMessage()}
      />

      {/* Meu CABEÇALHO da página de edição, com botão para gerenciar assinatura. */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-3 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Editar Estabelecimento</h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Botão de Cancelar Adicionado */}
              <button type="button" onClick={() => router.back()} disabled={isSubmitting} className="button-secondary bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Cancelar
              </button>
              {/* Meu Botão para a página de Gerenciar Assinatura. */}
              <Link href={`/pagamento-assinatura?negocioId=${negocioId}`} className="button-secondary bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out shadow-sm">
                  Gerenciar Assinatura
              </Link>
          </div>
      </div>

      {/* Minhas Mensagens de Status e Erro do formulário. */}
      {/* 3. Ajustar/Remover mensagens de status inline que serão cobertas pelo modal */}
      {/* Mensagem de sucesso e loading serão tratadas pelo modal. Manter warning e error. */}
      {submitStatus.message && (submitStatus.type === 'warning' || submitStatus.type === 'error') && (
        <div className={`p-4 mb-6 rounded-md text-center ${ submitStatus.type === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800' }`}>
          {submitStatus.message}
        </div>
      )}
      {uploadError && !isSubmitting && ( <div className="p-4 mb-6 rounded-md text-center bg-red-100 text-red-800"> Erro no upload: {uploadError} </div> )}

      {/* Meu Formulário de Edição. */}
      {loadingInitialData ? ( // Mostro um loading para as opções do formulário (categorias, características).
          <div className="text-center p-10">Carregando opções do formulário...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seção 1: Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField name="nome" label="Nome do Estabelecimento" value={formState.nome} onChange={handleChange} required disabled={isSubmitting} />
            <InputField name="proprietario" label="Nome do Proprietário" value={formState.proprietario} onChange={handleChange} required disabled={isSubmitting} placeholder="Seu nome completo (será usado em todos os seus negócios)" />
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
            <label className="block text-sm font-medium mb-2 text-gray-700">Imagens (máx. {MAX_IMAGES_PER_BUSINESS}, a primeira será a principal) <span className="text-red-500">*</span></label>
            <div className="mb-4 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 48 48" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" /></svg>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="file-upload" className={`relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500 ${isSubmitting || imageFiles.length >= MAX_IMAGES_PER_BUSINESS ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <span>{imageFiles.length > 0 ? 'Adicionar mais imagens' : 'Escolher imagens'}</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} disabled={isSubmitting || imageFiles.length >= MAX_IMAGES_PER_BUSINESS} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, WEBP. Máximo de {MAX_IMAGES_PER_BUSINESS} fotos. ({MAX_IMAGES_PER_BUSINESS - imageFiles.length} restantes)</p>
              </div>
            </div>
            {imageFiles.length === 0 && !isSubmitting && ( // Mostro esta mensagem se não houver imagens e não estiver submetendo.
                <p className="text-sm text-red-600 text-center">É necessário adicionar pelo menos uma imagem.</p>
            )}
            {imageFiles.length > 0 && ( // Meus Previews das imagens.
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {imageFiles.map((img, index) => (
                  <div key={img.id} className="relative group border rounded-md overflow-hidden aspect-square flex items-center justify-center bg-gray-100">
                    <img
                      src={img.preview || img.url}
                      alt={`Preview ${index + 1}`}
                      className="object-contain w-full h-full bg-white"
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/150?text=Erro+na+imagem';
                      }}
                    />
                    {/* Meus Overlays de status e botões de ação para cada imagem. */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 p-1 text-white text-center ${img.uploading || img.error ? 'bg-black bg-opacity-60' : 'bg-black bg-opacity-0 group-hover:bg-opacity-60'}`}>
                      {img.uploading && ( <div className="flex flex-col items-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-1" title={img.statusText || 'Processando...'}></div><p className="text-xs">{img.statusText || 'Processando...'}</p></div> )}
                      {img.error && !img.uploading && ( <div className="p-1" title={typeof img.error === 'string' ? img.error : 'Erro'}><svg className="h-6 w-6 text-red-500 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><p className="text-xs text-red-300 truncate">{typeof img.error === 'string' ? img.error.substring(0, 30) : 'Erro'}</p></div> )}
                      {/* Meus Botões só aparecem no hover se não houver erro/upload. */}
                      {!img.uploading && !img.error && (
                        <div className={`absolute inset-0 flex flex-col items-center justify-center space-y-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                            <button type="button" onClick={() => handleRemoveImage(img.id)} disabled={isSubmitting} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed z-10" aria-label="Remover imagem"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                            {mainImageIndex !== index && ( <button type="button" onClick={() => handleSetMainImage(img.id)} disabled={isSubmitting} className="text-white text-xs bg-green-600 px-2 py-1 rounded shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed z-10"> Tornar Principal </button> )}
                        </div>
                      )}
                    </div>
                    {/* Meu Badge "Principal". */}
                    {mainImageIndex === index && !img.uploading && !img.error && (
                      <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded shadow z-10">Principal</div>
                    )}
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-3 shadow-md rounded-md p-4 bg-gray-50">
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

                {/* Minha Mensagem se não houver características para a categoria selecionada (mas existem características no sistema). */}
                {!loadingInitialData && filteredCharacteristics.length === 0 && allCharacteristics.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1 p-4 border rounded-md bg-gray-50 text-center">
                    Nenhuma característica específica encontrada para esta categoria.
                  </p>
                )}

                {/* Minha Mensagem se não houver NENHUMA característica cadastrada no sistema. */}
                {!loadingInitialData && allCharacteristics.length === 0 && (
                  <p className="text-sm text-yellow-600 mt-1 p-4 border border-yellow-200 rounded-md bg-yellow-50 text-center">
                    Nenhuma característica cadastrada no sistema ainda.
                  </p>
                )}
              </>
            ) : (
              // Minha Mensagem para o usuário selecionar uma categoria primeiro.
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
        .button-secondary { transition: background-color 0.3s; } /* Meu Estilo base para transição do botão secundário. */
        .button-primary:hover:not(:disabled) { background-color: #047857; }
        .button-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

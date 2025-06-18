// src/app/meu-negocio/page.js
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react'; // Lembrete: Adicionei o useMemo aqui.
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid'; 
import imageCompression from 'browser-image-compression';
import LoadingModal from '@/app/components/LoadingModal'; // Importo o novo modal.

// --- Meus Componentes Auxiliares (Reutilizados do formulário de edição) ---
function InputField({ label, name, value, onChange, required = false, placeholder = '', type = 'text', disabled = false, ...props }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>
      <input
        type={type} name={name} id={name} value={value || ''} onChange={onChange}
        required={required} placeholder={placeholder} disabled={disabled}
        className="input-form" // Uso a classe global que defini lá embaixo.
        {...props}
      />
    </div>
  );
}
function TextAreaField({ label, name, value, onChange, required = false, placeholder = '', disabled = false, ...props }) {
return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>
      <textarea
        name={name} id={name} rows={4} value={value || ''} onChange={onChange}
        required={required} placeholder={placeholder} disabled={disabled}
        className="input-form" // Uso a classe global que defini lá embaixo.
        {...props}
      />
    </div>
  );
}

// --- Minha Função Auxiliar para Nome de Arquivo (Também reutilizada) ---
const generateUniqueFileName = (file) => {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
  const safeBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, '_');
  const uniqueId = uuidv4().substring(0, 8);
  return `${uniqueId}-${safeBaseName}.${fileExt}`; // Nome base com a extensão original (depois converto para webp).
};

// --- Constante para o limite de imagens ---
const MAX_IMAGES_PER_BUSINESS = 15;

// --- Componente Principal da Página "Meu Negócio" ---
export default function MeuNegocioPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true); // Renomeado para evitar conflito com loadingInitialData
  const [userProfile, setUserProfile] = useState(null); // Para guardar o nome_proprietario do perfil do usuário
  
  // --- Meus Estados para o Formulário de Cadastro ---
  const [formState, setFormState] = useState({
    nome: '', proprietario: '', categoria_id: '', descricao: '', endereco: '', cidade: '', // Adicionado proprietario
    telefone: '', whatsapp: '', website: '',
  });
  const [categorias, setCategorias] = useState([]);
  // Aqui eu guardo TODAS as características do banco, com suas associações de categoria.
  const [allCharacteristics, setAllCharacteristics] = useState([]);
  // NOVO ESTADO: Para armazenar as relações da tabela caracteristica_categorias
  const [caracteristicaCategoriaRelations, setCaracteristicaCategoriaRelations] = useState([]);
  const [selectedCaracteristicas, setSelectedCaracteristicas] = useState([]);
  // Estrutura de imageFiles: { id, file?, preview, uploading, uploaded, error, url?, fileName?, isExisting: false, statusText? }
  const [imageFiles, setImageFiles] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ message: '', type: '' });
  const [uploadError, setUploadError] = useState('');
  const [loadingInitialData, setLoadingInitialData] = useState(true); // Loading para os dados iniciais do formulário (categorias, características).

  // --- Efeito Principal: Verifica se o usuário está logado e carrega dados do formulário ---
  useEffect(() => {
    const initializePage = async () => {
      setLoadingPage(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push('/login?message=Você precisa estar logado.'); // Se não estiver logado, mando para o login.
        return;
      }
      setUser(session.user); // Guardo os dados do usuário.

      // Busco o perfil do usuário para verificar se já existe um nome_proprietario
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nome_proprietario')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Erro ao buscar perfil do usuário no cadastro:", profileError);
        // Não é fatal para o carregamento do formulário, mas pode impactar o preenchimento do nome do proprietário
      }
      setUserProfile(profileData);
      if (profileData?.nome_proprietario) {
        setFormState(prev => ({ ...prev, proprietario: profileData.nome_proprietario }));
      }

      // Se o usuário está logado, busca os dados para o formulário.
      await fetchInitialFormData(); 
      setLoadingPage(false);
    };

    initializePage();
  }, [router]); // Dependência: router (para o redirecionamento).

  // --- Função para buscar os dados iniciais do formulário (categorias e características) ---
  const fetchInitialFormData = useCallback(async () => {
    setLoadingInitialData(true);
    setSubmitStatus({ message: '', type: '' }); // Limpa status anterior
    try {
      const [catRes, caracRes, relRes] = await Promise.all([
        supabase.from('categorias').select('id, nome').order('nome'),
        // Busca todas as características (id e nome)
        supabase.from('caracteristicas')
                .select('id, nome')
                .order('nome'),
        supabase.from('caracteristica_categorias').select('caracteristica_id, categoria_id') // Busca as relações
      ]);

      if (catRes.error) {
        console.error("Erro Supabase ao buscar categorias:", catRes.error);
        throw new Error(catRes.error.message || `Erro ao buscar categorias: ${catRes.error.code || 'desconhecido'}`);
      }
      setCategorias(catRes.data || []);
      setFormState(prev => ({ ...prev, categoria_id: '' })); // Reseto a seleção de categoria.

      if (caracRes.error) {
        console.error("Erro Supabase ao buscar características:", caracRes.error);
        throw new Error(caracRes.error.message || `Erro ao buscar características: ${caracRes.error.code || 'desconhecido'}`);
      }
      setAllCharacteristics(caracRes.data || []);

      if (relRes.error) {
        console.error("Erro Supabase ao buscar relações característica-categoria:", relRes.error);
        throw new Error(relRes.error.message || `Erro ao buscar relações: ${relRes.error.code || 'desconhecido'}`);
      }
      setCaracteristicaCategoriaRelations(relRes.data || []);

    } catch (error) { // Agora 'error' será uma instância de Error com uma mensagem útil.
      console.error("Erro ao buscar dados iniciais do formulário:", error.message); // Logamos a mensagem do erro.
      // A mensagem para o usuário já usa error.message, o que é bom.
      // Adicionamos um fallback caso error.message seja undefined por algum motivo.
      const errorMessage = error.message || 'Falha desconhecida ao carregar dados.';
      setSubmitStatus({ message: `Erro ao carregar opções: ${errorMessage}`, type: 'error' });
    } finally {
      setLoadingInitialData(false);
    }
  }, []); // useCallback para memorizar a função.

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

  // --- Meus Handlers para Gerenciamento de Imagens (Reutilizados) ---
  const handleFileChange = (event) => { // Quando o usuário seleciona novas imagens.
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    console.log('Arquivos selecionados (MeuNegocioPage):', selectedFiles);
    setUploadError('');
    setSubmitStatus({ message: '', type: '' });

    const newFilesToAdd = selectedFiles.slice(0, MAX_IMAGES_PER_BUSINESS - imageFiles.length);

    const newImageObjects = newFilesToAdd.map(file => {
      const id = uuidv4();
      const originalFileName = generateUniqueFileName(file);
      const blobURL = URL.createObjectURL(file); // Cria a URL temporária para preview
      console.log(`Processando arquivo (MeuNegocioPage): Nome: ${file.name}, Tipo: ${file.type}, BlobURL: ${blobURL}`);
      return {
        id,
        file,
        preview: blobURL,
        uploading: false,
        uploaded: false,
        error: null,
        url: null,
        fileName: originalFileName,
        isExisting: false, // Sempre falso para novos uploads nesta página
        statusText: null,
      };
    });

    setImageFiles(prevFiles => {
      const updatedFiles = [...prevFiles, ...newImageObjects];
      if (prevFiles.length === 0 && newImageObjects.length > 0 && updatedFiles.length > 0) {
        setMainImageIndex(0);
      }
      return updatedFiles;
    });
    event.target.value = ''; // Limpo o input de arquivo.
  };

  const handleRemoveImage = (idToRemove) => { // Quando o usuário clica para remover uma imagem.
    const imageToRemove = imageFiles.find(img => img.id === idToRemove);
    if (!imageToRemove) { console.warn(`Tentativa de remover imagem com ID não encontrado: ${idToRemove}`); return; }

    // Revoga a Blob URL se existir e for uma Blob URL
    if (imageToRemove.preview && imageToRemove.preview.startsWith('blob:')) { 
      URL.revokeObjectURL(imageToRemove.preview); console.log(`Blob URL revogada (remoção manual MeuNegocioPage) para imagem ID ${idToRemove}: ${imageToRemove.preview}`);
    }
    
    setImageFiles(prevFiles => {
      const updatedFiles = prevFiles.filter(img => img.id !== idToRemove);
      if (updatedFiles.length === 0) {
        setMainImageIndex(0);
      } else {
        const oldMainImageId = prevFiles[mainImageIndex]?.id;
        const newPotentialMainIndex = updatedFiles.findIndex(img => img.id === oldMainImageId);
        setMainImageIndex(newPotentialMainIndex !== -1 ? newPotentialMainIndex : 0);
      }
      return updatedFiles;
    });
    setSubmitStatus({ message: '', type: '' }); setUploadError('');
  };

  const handleSetMainImage = (idToSetMain) => { // Quando o usuário define uma imagem como principal.
    const indexToSetMain = imageFiles.findIndex(img => img.id === idToSetMain);
    // Só permito se a imagem não estiver em upload.
    if (indexToSetMain !== -1 && !imageFiles[indexToSetMain]?.uploading) { setMainImageIndex(indexToSetMain); setSubmitStatus({ message: '', type: '' }); }
    else if (imageFiles[indexToSetMain]?.uploading) { setSubmitStatus({ message: 'Aguarde o processamento da imagem.', type: 'info' }); }
  };

  // --- Minha Função de Upload e Compressão de Imagens (Reutilizada) ---
  const uploadAndCompressImages = async (filesToUpload) => {
    const uploadedUrlsMap = new Map();
    let localUploadErrors = [];
    const uploadPromises = filesToUpload.map(async (imgState) => {
      const file = imgState.file; if (!file) return { id: imgState.id, success: false, error: 'Arquivo inválido' };
      const webpFileName = `${imgState.fileName?.replace(/\.[^/.]+$/, '') || uuidv4()}.webp`; // Nome final será .webp.
      const filePath = `public/${user.id}/${webpFileName}`; 
      
      setImageFiles(prev => prev.map(i => 
        i.id === imgState.id ? { ...i, uploading: true, statusText: 'Otimizando...' } : i
      ));
      console.log(`Iniciando compressão para: ${webpFileName} (MeuNegocioPage)`);

      try {
        const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/webp', initialQuality: 0.85 }; // Minhas opções de compressão.
        const compressedFile = await imageCompression(file, options);
        console.log(`Compressão de ${webpFileName} concluída. Tamanho: ${(compressedFile.size / (1024*1024)).toFixed(2)} MB (MeuNegocioPage)`);
        
        setImageFiles(prev => prev.map(i => 
          i.id === imgState.id ? { ...i, statusText: 'Enviando...' } : i
        ));
        console.log(`Enviando ${webpFileName} para Supabase Storage... (MeuNegocioPage)`);

        const { error: uploadError } = await supabase.storage.from('imagens').upload(filePath, compressedFile, { contentType: 'image/webp', upsert: false }); // upsert: false para não sobrescrever.
        if (uploadError) { console.error(`Erro no upload para Supabase (${webpFileName}):`, uploadError); throw uploadError; }
        
        const { data: { publicUrl } } = supabase.storage.from('imagens').getPublicUrl(filePath);
        if (!publicUrl) { console.error(`Não foi possível obter URL pública para ${webpFileName}`); throw new Error('URL pública não encontrada.');}
        
        uploadedUrlsMap.set(imgState.id, publicUrl);
        console.log(`Upload bem-sucedido para ${webpFileName}. URL pública obtida: ${publicUrl} (MeuNegocioPage)`);
        
        // Revoga a Blob URL (seja a original ou a comprimida) agora que temos a URL pública
        setImageFiles(prev => prev.map(i => {
            if (i.id === imgState.id) {
                if (i.preview?.startsWith('blob:')) {
                    URL.revokeObjectURL(i.preview);
                    console.log(`Blob URL revogada após upload bem-sucedido: ${i.preview} (MeuNegocioPage)`);
                }
                return { ...i, uploading: false, uploaded: true, url: publicUrl, preview: publicUrl, fileName: filePath, error: null, statusText: null, file: null /* Limpa o objeto File */ };
            }
            return i;
        })); // Fim do setImageFiles para sucesso
        console.log(`Upload de ${webpFileName} concluído. URL: ${publicUrl} (MeuNegocioPage)`);
        return { id: imgState.id, success: true, url: publicUrl };
      } catch (error) { // Este é o único catch para o try acima
        console.error(`Erro no processo de ${file.name} -> ${webpFileName}:`, error);
        localUploadErrors.push({ id: imgState.id, fileName: file.name, message: error.message });
        // Garante que qualquer Blob URL seja revogada em caso de erro também
        setImageFiles(prev => prev.map(i => {
            if (i.id === imgState.id) { // Encontra a imagem que deu erro
                // Revoga a Blob URL que estava sendo usada para preview (original ou comprimida)
                if (i.preview?.startsWith('blob:')) {
                    URL.revokeObjectURL(i.preview);
                    console.log(`Blob URL revogada em caso de erro (uploadAndCompressImages): ${i.preview} (MeuNegocioPage)`);
                }
                // Atualiza o estado com erro e limpa o arquivo local
                return { ...i, uploading: false, uploaded: false, error: error.message || 'Falha', statusText: null, file: null };
            }
            return i; // Mantém as outras imagens como estão
        })); // Fim do setImageFiles para erro
        return { id: imgState.id, success: false, error: error.message };
      }
    }); // Fim do .map() para uploadPromises
    await Promise.all(uploadPromises);
    if (localUploadErrors.length > 0) { const errorMsg = `Falha ao enviar ${localUploadErrors.length} imagem(ns).`; setUploadError(errorMsg); throw new Error(errorMsg); }
    return uploadedUrlsMap; // Retorno o mapa de IDs para URLs.
  };

  // --- Minha Função de Submissão do Formulário (Reutilizada) ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ message: '', type: '' });
    setUploadError('');

    // Validações básicas.
    if (!user) { setSubmitStatus({ message: 'Usuário não autenticado.', type: 'error' }); setIsSubmitting(false); return; }
    
    const validImagesForSubmit = imageFiles.filter(img => !img.error);
    if (validImagesForSubmit.length === 0) { 
      setSubmitStatus({ message: 'Adicione pelo menos uma imagem válida.', type: 'error' }); 
      setIsSubmitting(false); return; 
    }

    let currentMainIndex = mainImageIndex;
    if (validImagesForSubmit[currentMainIndex]?.error || validImagesForSubmit[currentMainIndex]?.uploading) {
        const firstValidIndex = imageFiles.findIndex(img => !img.error && !img.uploading && img.url);
        if (firstValidIndex === -1) { // Se não achar nenhuma, erro.
            setSubmitStatus({ message: 'Nenhuma imagem válida disponível para ser a principal. Verifique os envios.', type: 'error' });
            setIsSubmitting(false); return;
        }
        setSubmitStatus({ message: 'Imagem principal inválida, usando a primeira imagem válida disponível.', type: 'warning' });
        setMainImageIndex(firstValidIndex); currentMainIndex = firstValidIndex; // Atualizo o índice que vou usar.
    }
    if (!formState.categoria_id) { setSubmitStatus({ message: 'Selecione uma categoria.', type: 'error' }); setIsSubmitting(false); return; }

    let finalImageUrls = [];
    try {
      const imagesToUploadNow = validImagesForSubmit.filter(img => !img.uploaded && img.file);
      let uploadedUrlsMap = new Map();
      if (imagesToUploadNow.length > 0) {
        setSubmitStatus({ message: `Enviando ${imagesToUploadNow.length} imagens...`, type: 'loading' });
        console.log(`Iniciando upload para ${imagesToUploadNow.length} novas imagens... (MeuNegocioPage)`);
        uploadedUrlsMap = await uploadAndCompressImages(imagesToUploadNow);
      }

      const successfullyProcessedImages = imageFiles
        .map(img => {
            if (uploadedUrlsMap.has(img.id)) {
                return { ...img, url: uploadedUrlsMap.get(img.id), preview: uploadedUrlsMap.get(img.id), uploaded: true, uploading: false, error: null, statusText: null, file: null }; // Garante que file seja null aqui e preview seja a URL pública
            }
            return img;
        })
        .filter(img => !img.error && img.url); // Filtra apenas as imagens que foram processadas com sucesso e têm URL
      console.log(`Imagens processadas com sucesso e com URL: ${successfullyProcessedImages.length} (MeuNegocioPage)`);

      if (successfullyProcessedImages.length === 0) { 
          throw new Error("Nenhuma imagem válida restou após o processamento. Adicione ou corrija as imagens.");
      }
      setImageFiles(successfullyProcessedImages); 

      // Revalido o índice da imagem principal com base nas imagens que restaram
      // Se a imagem principal original ainda existe, mantenha-a. Senão, use a primeira.
      const originalMainImageId = imageFiles[mainImageIndex]?.id;
      let finalMainImageIndex = successfullyProcessedImages.findIndex(img => img.id === originalMainImageId);
      if (finalMainImageIndex === -1) {
        finalMainImageIndex = 0; // Default to the first image if the original main is gone
        console.log(`Imagem principal original removida ou falhou. Definindo a primeira imagem válida (índice ${finalMainImageIndex}) como principal. (MeuNegocioPage)`);
      }
      setMainImageIndex(finalMainImageIndex); // Atualiza o estado do índice principal

      const mainImageUrl = successfullyProcessedImages[finalMainImageIndex]?.url;
      if (!mainImageUrl) { throw new Error("Erro crítico: URL da imagem principal não encontrada após processamento."); }
      
      console.log(`URL da imagem principal final: ${mainImageUrl} (MeuNegocioPage)`);
      const additionalImageUrls = successfullyProcessedImages
        .filter(img => img.url !== mainImageUrl)
        .map(img => img.url);
      finalImageUrls = [mainImageUrl, ...additionalImageUrls]; // Array final: [principal, ...adicionais].

      // 3. Preparo os dados do negócio para INSERIR no banco.
      setSubmitStatus({ message: 'Salvando informações...', type: 'loading' });
      const negocioData = {
        nome: formState.nome, proprietario: formState.proprietario, categoria_id: formState.categoria_id, descricao: formState.descricao || null, // Adicionado proprietario
        endereco: formState.endereco || null, cidade: formState.cidade, telefone: formState.telefone || null,
        whatsapp: formState.whatsapp || null, website: formState.website || null, imagens: finalImageUrls,
        usuario_id: user.id, ativo: false // Negócios começam inativos.
      };

      // 4. INSIRO o negócio no banco.
      const { data: insertedNegocio, error: insertNegocioError } = await supabase
        .from('negocios').insert([negocioData]).select('id').single(); // Pego o ID do negócio inserido.
      if (insertNegocioError) throw insertNegocioError;
      const newNegocioId = insertedNegocio.id; // Guardo o ID para usar nas características e no redirecionamento.

      // 4.1. Se o usuário ainda não tinha um nome_proprietario em seu perfil,
      // e informou um no formulário, atualizamos o perfil.
      if (!userProfile?.nome_proprietario && formState.proprietario) {
        setSubmitStatus({ message: 'Definindo nome do proprietário no seu perfil...', type: 'loading' });
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({ nome_proprietario: formState.proprietario })
          .eq('id', user.id);
        if (updateProfileError) {
          console.error("Erro ao atualizar nome do proprietário no perfil (cadastro):", updateProfileError);
          // Logar, mas não impedir o fluxo principal.
        }
      }

      // 5. INSIRO as características selecionadas.
      if (selectedCaracteristicas.length > 0) {
          const negocioCaracteristicasData = selectedCaracteristicas.map(caracteristicaId => ({
              negocio_id: newNegocioId, caracteristica_id: caracteristicaId
          }));
          const { error: insertCaracError } = await supabase.from('negocio_caracteristicas').insert(negocioCaracteristicasData);
          if (insertCaracError) console.error("Erro ao salvar características associadas:", insertCaracError); // Logo o erro, mas continuo.
      }

      // Sucesso!
      setSubmitStatus({ message: 'Cadastro realizado com sucesso! Redirecionando...', type: 'success' });
      // Limpo o formulário.
      setFormState({ nome: '', proprietario: '', categoria_id: '', descricao: '', endereco: '', cidade: '', telefone: '', whatsapp: '', website: '' }); // Limpando proprietario também
      setImageFiles([]); setMainImageIndex(0); setSelectedCaracteristicas([]);
      // Redireciono para a página de detalhes do negócio recém-criado.
      setTimeout(() => { router.push(`/negocio/${newNegocioId}`); }, 2500);

    } catch (err) {
      console.error("Erro no processo de cadastro:", err);
      setSubmitStatus({ message: `Erro: ${uploadError || err.message || 'Verifique os dados.'}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Efeito de Limpeza para as URLs de Preview das Imagens (Reutilizado) ---
  useEffect(() => {
    // Limpo as Object URLs quando o componente desmonta ou quando `imageFiles` muda,
    // para evitar memory leaks.
    // As revogações pontuais (remoção, upload bem-sucedido/falho) já são tratadas.
    // Este useEffect agora cuidará da limpeza final no desmonte do componente.
    const filesToClean = [...imageFiles]; // Captura o estado atual para o cleanup
    return () => { 
      filesToClean.forEach(img => { 
        if(img.preview?.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview);
          console.log(`Blob URL revogada (desmontagem/limpeza MeuNegocioPage) para imagem ID ${img.id}: ${img.preview}`);
        }
      }); 
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array de dependências vazio para rodar apenas no mount (retornando a função de cleanup para o unmount)

  // --- Meu FILTRO DINÂMICO DAS CARACTERÍSTICAS usando useMemo (Reutilizado) ---
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
  if (loadingPage) { 
    return <div className="text-center p-10">Carregando...</div>;
  }

  return ( // O formulário é sempre renderizado se loadingPage for false (usuário logado)
      <div className="max-w-4xl mx-auto p-6 md:p-8 bg-white shadow-lg rounded-lg my-10 relative">
        {/* 2. Adicionar o LoadingModal */}
        <LoadingModal
          isOpen={isSubmitting || (submitStatus.type === 'success' && !!submitStatus.message)}
          message={getModalMessage()}
        />

        {/* Cabeçalho com Título e Botão Cancelar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-3 gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Cadastrar Novo Estabelecimento</h1>
            {/* Botão de Cancelar - Posicionado na parte superior */}
            {!loadingPage && !loadingInitialData && ( // Só mostro se a página e os dados iniciais carregaram
              <button type="button" onClick={() => router.back()} disabled={isSubmitting} className="button-secondary bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Cancelar
              </button>
            )}
        </div>

        {/* Minhas Mensagens de Status e Erro do formulário. */}
        {submitStatus.message && (
            <div className={`p-4 mb-6 rounded-md text-center ${ submitStatus.type === 'success' ? 'bg-green-100 text-green-800' : submitStatus.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800' }`}> {submitStatus.message} </div>
        )}
        {uploadError && !isSubmitting && (
            <div className="p-4 mb-6 rounded-md text-center bg-red-100 text-red-800"> Erro no upload: {uploadError} </div>
        )}

        {/* Mostro um loading para as opções do formulário (categorias, características) ou o formulário em si. */}
        {loadingInitialData ? (
            <div className="text-center p-10">Carregando opções do formulário...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Seção 1: Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField name="nome" label="Nome do Estabelecimento" value={formState.nome} onChange={handleChange} required disabled={isSubmitting} placeholder="Nome visível ao público" />
              <InputField 
                name="proprietario" 
                label="Nome do Proprietário" 
                value={formState.proprietario} 
                onChange={handleChange} 
                required 
                disabled={isSubmitting || !!userProfile?.nome_proprietario} // Desabilita se já tem no perfil
                placeholder={userProfile?.nome_proprietario ? "Nome já definido no seu perfil" : "Seu nome completo (será usado em todos os seus negócios)"} />
              <div>
                <label htmlFor="categoria_id" className="block text-sm font-medium text-gray-700 mb-1">Categoria <span className="text-red-500">*</span></label>
                <select id="categoria_id" name="categoria_id" value={formState.categoria_id} onChange={handleChange} required className="input-form bg-white" disabled={isSubmitting || categorias.length === 0}>
                  <option value="" disabled>-- Selecione o tipo --</option>
                  {categorias.map((cat) => ( <option key={cat.id} value={cat.id}>{cat.nome}</option> ))}
                </select>
                {categorias.length === 0 && <p className="text-xs text-red-500 mt-1">Nenhuma categoria encontrada. Cadastre categorias no painel admin.</p>}
              </div>
            </div>

            {/* Seções 2 a 5 (Descrição, Localização, Contato, Website) - JSX igual ao da página de edição. */}
            <TextAreaField name="descricao" label="Descrição" value={formState.descricao} onChange={handleChange} disabled={isSubmitting} placeholder="Descreva o local, serviços, diferenciais..." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField name="endereco" label="Endereço Completo (Opcional)" value={formState.endereco} onChange={handleChange} disabled={isSubmitting} placeholder="Rua, Número, Bairro..." />
              <InputField name="cidade" label="Cidade" value={formState.cidade} onChange={handleChange} required disabled={isSubmitting} placeholder="Cidade onde fica o negócio" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField name="telefone" label="Telefone Fixo (Opcional)" value={formState.telefone} onChange={handleChange} disabled={isSubmitting} type="tel" placeholder="(XX) XXXX-XXXX" />
              <InputField name="whatsapp" label="WhatsApp (Opcional, com DDD)" value={formState.whatsapp} onChange={handleChange} disabled={isSubmitting} type="tel" placeholder="55XX9XXXXXXXX" />
            </div>
            <InputField name="website" label="Website ou Rede Social (Opcional)" value={formState.website} onChange={handleChange} disabled={isSubmitting} type="url" placeholder="https://..." />

            {/* Seção 6: Upload de Imagens - JSX igual ao da página de edição. */}
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
              {imageFiles.length > 0 && ( // Previews das imagens.
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {imageFiles.map((imgState, index) => (
                    <div key={imgState.id} className="relative group border rounded-md overflow-hidden aspect-square flex items-center justify-center bg-slate-100">
                      <img
                        src={imgState.preview || imgState.url} // Para cadastro, img.preview (blob) será usado. img.url será null.
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-contain bg-transparent" // Mantido bg-transparent
                        onError={(e) => {
                          console.error(`DEBUG: Falha ao carregar imagem no SRC (MeuNegocioPage). SRC: ${e.target.currentSrc || e.target.src}`, e.target.error);
                          e.target.onerror = null; // Previne loop de erro
                          
                          const parentDiv = e.target.parentElement;
                          if (parentDiv) {
                            parentDiv.style.backgroundColor = 'lime'; 
                            parentDiv.style.border = '3px solid red'; // Borda vermelha para destaque
                          }
                          
                          e.target.style.display = 'none'; // Esconde a tag <img> quebrada
                          
                          const overlayDiv = e.target.nextElementSibling; // O overlay é o próximo irmão
                          if (overlayDiv && overlayDiv.classList.contains('absolute')) { // Checagem básica se é o overlay
                            overlayDiv.style.display = 'none'; // Esconde o overlay também
                            console.log('DEBUG: Overlay escondido devido a erro na imagem (MeuNegocioPage).');
                          }
                        }} />
                      {/* Meus Overlays de status e botões de ação para cada imagem. */}
                      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 p-1 text-white text-center ${imgState.uploading || imgState.error ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-0 group-hover:bg-opacity-60'}`}>
                        {imgState.uploading && ( <div className="flex flex-col items-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-1" title={imgState.statusText || 'Processando...'}></div><p className="text-xs">{imgState.statusText || 'Processando...'}</p></div> )}
                        {/* Adicionado: Texto de status/nome do arquivo */}
                        <div className="absolute bottom-1 left-1 right-1 text-xs text-gray-300 truncate">
                           {imgState.fileName ? imgState.fileName.substring(0, 20) + '...' : 'Arquivo'}
                           {imgState.uploading && ` (${imgState.statusText || 'Processando...'})`}
                           {imgState.error && ` (Erro)`}
                        </div>
                        {imgState.error && !imgState.uploading && ( <div className="p-1" title={typeof imgState.error === 'string' ? imgState.error : 'Erro'}><svg className="h-6 w-6 text-red-500 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><p className="text-xs text-red-300 truncate">{typeof imgState.error === 'string' ? imgState.error.substring(0, 30) : 'Erro'}</p></div> )}
                        {/* Botões só aparecem no hover se não houver erro/upload. */}
                        {!imgState.uploading && !imgState.error && (
                          <div className={`absolute inset-0 flex flex-col items-center justify-center space-y-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                              <button type="button" onClick={() => handleRemoveImage(imgState.id)} disabled={isSubmitting} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed z-10" aria-label="Remover imagem"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                              {mainImageIndex !== index && ( <button type="button" onClick={() => handleSetMainImage(imgState.id)} disabled={isSubmitting} className="text-white text-xs bg-green-600 px-2 py-1 rounded shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed z-10"> Tornar Principal </button> )}
                          </div>
                        )}
                      </div>
                      {/* Meu Badge "Principal". */}
                      {mainImageIndex === index && !imgState.uploading && !imgState.error && <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded shadow z-10">Principal</div>}
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
                disabled={isSubmitting || loadingInitialData || imageFiles.some(img => img.uploading) || imageFiles.filter(img => !img.error && (img.file || img.url)).length === 0} // Desabilito se estiver submetendo, carregando dados, alguma imagem em upload, ou se não houver imagens válidas prontas para submit.
                className="w-full button-primary flex items-center justify-center py-3"
              >
                {isSubmitting ? (
                  <> <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processando... </>
                ) : (
                  'Cadastrar Estabelecimento'
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
          .button-primary:hover:not(:disabled) { background-color: #047857; }
          .button-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        `}</style>
      </div>
    );
}

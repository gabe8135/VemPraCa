// src/app/meu-negocio/page.js
'use client';

import Link from 'next/link'; // Lembrete: Preciso do Link para os cards dos negócios
import { useState, useEffect, useCallback, useMemo } from 'react'; // Lembrete: Adicionei o useMemo aqui.
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';

// --- Meus Componentes Auxiliares (Reutilizados do formulário de edição) ---
// Lembrete: Estes são meus componentes de input para manter o formulário consistente.
function InputField({ label, name, value, onChange, required = false, placeholder = '', type = 'text', disabled = false, ...props }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>
      <input
        type={type} name={name} id={name} value={value || ''} onChange={onChange}
        required={required} placeholder={placeholder} disabled={disabled}
        className="input-form" // Lembrete: Uso a classe global que defini lá embaixo.
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
        className="input-form" // Lembrete: Uso a classe global que defini lá embaixo.
        {...props}
      />
    </div>
  );
}

// --- Minha Função Auxiliar para Nome de Arquivo (Também reutilizada) ---
// Lembrete: Esta função gera um nome único para cada arquivo de imagem.
const generateUniqueFileName = (file) => {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
  const safeBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, '_');
  const uniqueId = uuidv4().substring(0, 8);
  return `${uniqueId}-${safeBaseName}.${fileExt}`; // Lembrete: Nome base com a extensão original (depois converto para webp).
};

// --- Constante para o limite de imagens ---
// Lembrete: Aumentei o limite para 15 fotos.
const MAX_IMAGES_PER_BUSINESS = 15;

// --- Componente Principal da Página "Meu Negócio" ---
export default function MeuNegocioPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Lembrete: Loading geral da página.
  // const [hasNegocio, setHasNegocio] = useState(false); // Lembrete: Não preciso mais disso da mesma forma.
  const [userBusinesses, setUserBusinesses] = useState([]); // Lembrete: Para listar os negócios do usuário.
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true); // Lembrete: Loading para a lista de negócios.
  const [showCreateForm, setShowCreateForm] = useState(false); // Lembrete: Controla se mostro o formulário de NOVO cadastro.

  // --- Meus Estados para o Formulário de Cadastro ---
  const [formState, setFormState] = useState({
    nome: '', categoria_id: '', descricao: '', endereco: '', cidade: '',
    telefone: '', whatsapp: '', website: '',
  });
  const [categorias, setCategorias] = useState([]);
  // Lembrete: Aqui eu guardo TODAS as características do banco, com suas associações de categoria.
  const [allCharacteristics, setAllCharacteristics] = useState([]);
  const [selectedCaracteristicas, setSelectedCaracteristicas] = useState([]);
  // Lembrete: Estrutura de imageFiles: { id, file?, preview, uploading, uploaded, error, url?, fileName?, isExisting: false, statusText? }
  const [imageFiles, setImageFiles] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ message: '', type: '' });
  const [uploadError, setUploadError] = useState('');
  const [loadingInitialData, setLoadingInitialData] = useState(true); // Lembrete: Loading para os dados iniciais do formulário (categorias, características).

  // --- Efeito Principal: Verifica se o usuário está logado e busca seus negócios ---
  useEffect(() => {
    const checkUserAndNegocio = async () => {
      setLoading(true);
      setShowCreateForm(false); // Lembrete: Escondo o formulário de criação no início.
      setIsLoadingBusinesses(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push('/login?message=Você precisa estar logado.'); // Lembrete: Se não estiver logado, mando para o login.
        return;
      }
      setUser(session.user); // Lembrete: Guardo os dados do usuário.

      try {
        // Lembrete: Busco TODOS os negócios deste usuário.
        const { data: negociosDoUsuario, error: negociosError } = await supabase
          .from('negocios')
          .select('id, nome, cidade, ativo, (SELECT nome FROM categorias WHERE id = negocios.categoria_id) as nome_categoria') // Lembrete: Pego os campos para o card.
          .eq('usuario_id', session.user.id)
          .order('created_at', { ascending: false }); // Lembrete: Ordena pelos mais recentes primeiro

        if (negociosError) throw negociosError;

        setUserBusinesses(negociosDoUsuario || []);
        console.log("Meus negócios carregados:", negociosDoUsuario); // Lembrete: Log para eu ver os negócios.

        // Lembrete: Se o usuário não tiver negócios e não estivermos já mostrando o formulário,
        // podemos optar por mostrar o formulário de criação automaticamente ou apenas o botão.
        // Por enquanto, controlo a exibição do formulário com o botão "Cadastrar Novo".

      } catch (error) {
        console.error("Erro ao buscar meus negócios:", error);
        // Lembrete: Poderia setar um erro específico para a lista de negócios aqui.
      } finally {
        setIsLoadingBusinesses(false);
        setLoading(false); // Lembrete: Loading geral da página.
      }
    };

    checkUserAndNegocio();
  }, [router]); // Lembrete: Dependência: router (se usado para redirecionamento).

  // --- Função para buscar os dados iniciais do formulário (categorias e características) ---
  // Lembrete: Esta função é chamada quando o usuário decide abrir o formulário de criação.
  const fetchInitialFormData = useCallback(async () => {
    setLoadingInitialData(true);
    try {
      const [catRes, caracRes] = await Promise.all([
        supabase.from('categorias').select('id, nome').order('nome'),
        // Lembrete: Busco as características e também os IDs das categorias às quais cada característica está associada.
        supabase.from('caracteristicas')
                .select(`
                    id,
                    nome,
                    caracteristica_categorias ( categoria_id )
                `)
                .order('nome')
      ]);

      if (catRes.error) throw catRes.error;
      setCategorias(catRes.data || []);
      setFormState(prev => ({ ...prev, categoria_id: '' })); // Lembrete: Reseto a seleção de categoria.

      if (caracRes.error) throw caracRes.error;
      // Lembrete: Formato os dados das características para facilitar o filtro dinâmico depois.
      const formattedCharacteristics = (caracRes.data || []).map(c => ({
          id: c.id,
          nome: c.nome,
          // Lembrete: Crio um array simples só com os IDs das categorias associadas a esta característica.
          associatedCategoryIds: c.caracteristica_categorias.map(cc => cc.categoria_id)
      }));
      setAllCharacteristics(formattedCharacteristics); // Lembrete: Salvo todas as características formatadas no estado.

    } catch (error) {
      console.error("Erro ao buscar dados iniciais do meu formulário:", error);
      setSubmitStatus({ message: `Erro ao carregar opções do formulário: ${error.message}`, type: 'error' });
    } finally {
      setLoadingInitialData(false);
    }
  }, []); // Lembrete: useCallback para memorizar a função.

  // Lembrete: Handler para mostrar/esconder o formulário de criação
  const handleToggleCreateForm = () => {
    setShowCreateForm(prev => !prev);
    // Lembrete: Se for abrir o form e os dados (categorias/características) não foram carregados ainda, busco eles.
    if (!showCreateForm && categorias.length === 0 && allCharacteristics.length === 0) {
        fetchInitialFormData();
    }
  };

  // --- Meus Handlers para Mudanças no Formulário ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));

    // Lembrete: Se o usuário mudar a categoria, limpo as características selecionadas.
    // Isso é bom porque as características disponíveis podem mudar com a categoria.
    if (name === 'categoria_id') {
        setSelectedCaracteristicas([]);
    }
  };

  const handleCaracteristicaChange = (caracteristicaId) => {
    setSelectedCaracteristicas(prev =>
      prev.includes(caracteristicaId)
        ? prev.filter(id => id !== caracteristicaId) // Lembrete: Se já está, remove.
        : [...prev, caracteristicaId] // Lembrete: Se não está, adiciona.
    );
  };

  // --- Meus Handlers para Gerenciamento de Imagens (Reutilizados) ---
  const handleFileChange = (event) => { // Lembrete: Quando o usuário seleciona novas imagens.
    const files = Array.from(event.target.files);
     const availableSlots = MAX_IMAGES_PER_BUSINESS - imageFiles.length; // Lembrete: Usa a nova constante MAX_IMAGES_PER_BUSINESS.
    if (availableSlots <= 0) return; // Lembrete: Limite de MAX_IMAGES_PER_BUSINESS imagens.
    const filesToProcess = files.slice(0, availableSlots);
    setUploadError(''); setSubmitStatus({ message: '', type: '' });
    const newImageFilesInitialState = filesToProcess.map(file => {
      const id = uuidv4();
      const originalFileName = generateUniqueFileName(file);
      return { id, file, preview: URL.createObjectURL(file), uploading: false, uploaded: false, error: null, url: null, fileName: originalFileName, isExisting: false, statusText: null };
    });
    setImageFiles(prev => {
      const combined = [...prev, ...newImageFilesInitialState];
      // Lembrete: Se não tem nenhuma imagem principal, defino a 1ª como principal
      if (prev.length === 0 && newImageFilesInitialState.length > 0) {
        setMainImageIndex(0);
      }
      return combined;
    });
    event.target.value = ''; // Lembrete: Limpo o input de arquivo.
  };

  const handleRemoveImage = (idToRemove) => { // Lembrete: Quando o usuário clica para remover uma imagem.
    const imageToRemove = imageFiles.find(img => img.id === idToRemove);
    if (!imageToRemove) return;
    if (imageToRemove.preview?.startsWith('blob:')) { URL.revokeObjectURL(imageToRemove.preview); } // Lembrete: Libero memória do blob.
    const updatedImageFiles = imageFiles.filter(img => img.id !== idToRemove);
    setImageFiles(updatedImageFiles);
    // Lembrete: Reajusto o índice da imagem principal se necessário.
    if (updatedImageFiles.length === 0) { setMainImageIndex(0); }
    else if (idToRemove === imageFiles[mainImageIndex]?.id) { setMainImageIndex(0); }
    else { const currentMainImageId = imageFiles[mainImageIndex]?.id; const newMainIndex = updatedImageFiles.findIndex(img => img.id === currentMainImageId); setMainImageIndex(newMainIndex >= 0 ? newMainIndex : 0); }
    setSubmitStatus({ message: '', type: '' }); setUploadError('');
  };

  const handleSetMainImage = (idToSetMain) => { // Lembrete: Quando o usuário define uma imagem como principal.
    const indexToSetMain = imageFiles.findIndex(img => img.id === idToSetMain);
    // Lembrete: Só permito se a imagem não estiver em upload.
    if (indexToSetMain !== -1 && !imageFiles[indexToSetMain].uploading) { setMainImageIndex(indexToSetMain); setSubmitStatus({ message: '', type: '' }); }
    else if (imageFiles[indexToSetMain]?.uploading) { setSubmitStatus({ message: 'Aguarde o processamento da imagem.', type: 'info' }); }
  };

  // --- Minha Função de Upload e Compressão de Imagens (Reutilizada) ---
  const uploadAndCompressImages = async (filesToUpload) => {
    const uploadedUrlsMap = new Map();
    let localUploadErrors = [];
    const uploadPromises = filesToUpload.map(async (imgState) => {
      const file = imgState.file; if (!file) return { id: imgState.id, success: false, error: 'Arquivo inválido' };
      const webpFileName = `${imgState.fileName?.replace(/\.[^/.]+$/, '') || uuidv4()}.webp`; // Lembrete: Nome final será .webp.
      const filePath = `public/${user.id}/${webpFileName}`; // Lembrete: Caminho no Storage.
      setImageFiles(prev => prev.map(i => i.id === imgState.id ? { ...i, uploading: true, statusText: 'Otimizando...' } : i));
      try {
        const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/webp', initialQuality: 0.85 }; // Lembrete: Minhas opções de compressão.
        const compressedFile = await imageCompression(file, options);
        setImageFiles(prev => prev.map(i => i.id === imgState.id ? { ...i, statusText: 'Enviando...' } : i));
        const { error: uploadError } = await supabase.storage.from('imagens').upload(filePath, compressedFile, { contentType: 'image/webp', upsert: false }); // Lembrete: upsert: false para não sobrescrever.
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('imagens').getPublicUrl(filePath);
        if (!publicUrl) throw new Error('Não foi possível obter URL pública.');
        uploadedUrlsMap.set(imgState.id, publicUrl);
        // Lembrete: Após o upload, atualizo 'url' e também 'preview' para a URL pública, para consistência.
        setImageFiles(prev => prev.map(i => i.id === imgState.id ? { ...i, uploading: false, uploaded: true, url: publicUrl, preview: publicUrl, fileName: filePath, error: null, statusText: null } : i));
        return { id: imgState.id, success: true, url: publicUrl };
      } catch (error) {
        console.error(`Erro no processo de ${file.name} -> ${webpFileName}:`, error);
        localUploadErrors.push({ id: imgState.id, fileName: file.name, message: error.message });
        setImageFiles(prev => prev.map(i => i.id === imgState.id ? { ...i, uploading: false, uploaded: false, error: error.message || 'Falha', statusText: null } : i));
        return { id: imgState.id, success: false, error: error.message };
      }
    });
    await Promise.all(uploadPromises);
    if (localUploadErrors.length > 0) { const errorMsg = `Falha ao enviar ${localUploadErrors.length} imagem(ns).`; setUploadError(errorMsg); throw new Error(errorMsg); }
    return uploadedUrlsMap; // Lembrete: Retorno o mapa de IDs para URLs.
  };

  // --- Minha Função de Submissão do Formulário (Reutilizada para criar NOVO negócio) ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ message: '', type: '' });
    setUploadError('');

    // Lembrete: Validações básicas.
    if (!user) { setSubmitStatus({ message: 'Usuário não autenticado.', type: 'error' }); setIsSubmitting(false); return; }
    if (imageFiles.filter(img => !img.error).length === 0) { setSubmitStatus({ message: 'Adicione pelo menos uma imagem válida.', type: 'error' }); setIsSubmitting(false); return; }
    let currentMainIndex = mainImageIndex;
    // Lembrete: Verifico se a imagem principal que está selecionada é válida (não tem erro e não está em upload).
    if (imageFiles[currentMainIndex]?.error || imageFiles[currentMainIndex]?.uploading) {
        // Lembrete: Se não for, tento encontrar a primeira imagem válida que já tenha uma URL (ou seja, já foi upada).
        const firstValidIndex = imageFiles.findIndex(img => !img.error && !img.uploading && img.url);
        if (firstValidIndex === -1) { // Lembrete: Se não achar nenhuma, erro.
            setSubmitStatus({ message: 'Nenhuma imagem válida disponível para ser a principal. Verifique os envios.', type: 'error' });
            setIsSubmitting(false); return;
        }
        setSubmitStatus({ message: 'Imagem principal inválida, usando a primeira imagem válida disponível.', type: 'warning' });
        setMainImageIndex(firstValidIndex); currentMainIndex = firstValidIndex; // Lembrete: Atualizo o índice que vou usar.
    }
    if (!formState.categoria_id) { setSubmitStatus({ message: 'Selecione uma categoria.', type: 'error' }); setIsSubmitting(false); return; }

    let finalImageUrls = [];
    try {
      // Lembrete: 1. Faço Upload das Novas Imagens (as que não são `isExisting` e têm `file`).
      const imagesParaUpload = imageFiles.filter(img => !img.uploaded && img.file && !img.error);
      let uploadedUrlsMap = new Map();
      if (imagesParaUpload.length > 0) {
        setSubmitStatus({ message: `Enviando ${imagesParaUpload.length} imagens...`, type: 'loading' });
        uploadedUrlsMap = await uploadAndCompressImages(imagesParaUpload);
      }

      // Lembrete: 2. Atualizo o estado local das imagens e monto o array final de URLs.
      const updatedImageFilesState = imageFiles
        .map(img => {
            if (uploadedUrlsMap.has(img.id)) {
                return { ...img, url: uploadedUrlsMap.get(img.id), preview: uploadedUrlsMap.get(img.id), uploaded: true, uploading: false, error: null, statusText: null };
            }
            return img;
        })
        .filter(img => !img.error); // Lembrete: Removo do estado final qualquer imagem que tenha tido erro no upload.
      setImageFiles(updatedImageFilesState); // Lembrete: Atualizo o estado `imageFiles` com as URLs e sem os erros.

      // Lembrete: Recalculo o índice da imagem principal, pois a original pode ter sido removida por erro.
      const mainImageIdAfterUpload = imageFiles[currentMainIndex]?.id; // Lembrete: Pego o ID da que *era* a principal.
      const finalMainIndex = updatedImageFilesState.findIndex(img => img.id === mainImageIdAfterUpload); // Lembrete: Procuro ela no novo array.
      currentMainIndex = finalMainIndex >= 0 ? finalMainIndex : 0; // Lembrete: Se sumiu, a primeira vira principal.

      if (updatedImageFilesState.length === 0) { // Lembrete: Se não sobrou nenhuma imagem válida.
          throw new Error("Nenhuma imagem válida restou após o processamento. Adicione ou corrija as imagens.");
      }
      const mainImageUrl = updatedImageFilesState[currentMainIndex]?.url; // Lembrete: Pego a URL da imagem principal final.
      if (!mainImageUrl) throw new Error("Erro crítico: URL da imagem principal não encontrada após processamento.");
      const additionalImageUrls = updatedImageFilesState // Lembrete: Pego as URLs das outras imagens.
        .filter((img, index) => index !== currentMainIndex && img.url)
        .map(img => img.url);
      finalImageUrls = [mainImageUrl, ...additionalImageUrls]; // Lembrete: Array final: [principal, ...adicionais].

      // Lembrete: 3. Preparo os dados do negócio para INSERIR no banco.
      setSubmitStatus({ message: 'Salvando informações...', type: 'loading' });
      const negocioData = {
        nome: formState.nome, categoria_id: formState.categoria_id, descricao: formState.descricao || null,
        endereco: formState.endereco || null, cidade: formState.cidade, telefone: formState.telefone || null,
        whatsapp: formState.whatsapp || null, website: formState.website || null, imagens: finalImageUrls,
        usuario_id: user.id, ativo: false // Lembrete: Negócios começam inativos.
      };

      // Lembrete: 4. INSIRO o negócio no banco.
      const { data: insertedNegocio, error: insertNegocioError } = await supabase
        .from('negocios').insert([negocioData]).select().single(); // Lembrete: Pego o negócio inserido completo.
      if (insertNegocioError) throw insertNegocioError;
      const newNegocioId = insertedNegocio.id; // Lembrete: Guardo o ID para usar nas características.

      // Lembrete: 5. INSIRO as características selecionadas.
      if (selectedCaracteristicas.length > 0) {
          const negocioCaracteristicasData = selectedCaracteristicas.map(caracteristicaId => ({
              negocio_id: newNegocioId, caracteristica_id: caracteristicaId
          }));
          const { error: insertCaracError } = await supabase.from('negocio_caracteristicas').insert(negocioCaracteristicasData);
          if (insertCaracError) console.error("Erro ao salvar características associadas:", insertCaracError); // Lembrete: Logo o erro, mas continuo.
      }

      // Lembrete: Sucesso!
      setSubmitStatus({ message: 'Cadastro realizado com sucesso!', type: 'success' });
      // Lembrete: Limpo o formulário.
      setFormState({ nome: '', categoria_id: '', descricao: '', endereco: '', cidade: '', telefone: '', whatsapp: '', website: '' });
      setImageFiles([]); setMainImageIndex(0); setSelectedCaracteristicas([]);
      
      // Lembrete: Atualizo a lista de negócios do usuário e escondo o formulário.
      const categoriaNome = categorias.find(c => c.id === negocioData.categoria_id)?.nome || 'Categoria não definida';
      // Lembrete: Adiciono o novo negócio no início da lista para melhor UX.
      setUserBusinesses(prev => [{ ...insertedNegocio, nome_categoria: categoriaNome }, ...prev]);
      setShowCreateForm(false); // Lembrete: Escondo o formulário após o sucesso.

    } catch (err) {
      console.error("Erro no processo de cadastro:", err);
      setSubmitStatus({ message: `Erro: ${uploadError || err.message || 'Verifique os dados.'}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Efeito de Limpeza para as URLs de Preview das Imagens (Reutilizado) ---
  useEffect(() => {
    // Lembrete: Limpo as Object URLs quando o componente desmonta ou quando `imageFiles` muda,
    // para evitar memory leaks. Só faço isso para as imagens que são novas (não `isExisting`)
    // e que têm um preview que é um blob.
    return () => { imageFiles.forEach(img => { if(img.preview && img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview) }); };
  }, [imageFiles]); // Lembrete: Dependência correta para este efeito.

  // --- Meu FILTRO DINÂMICO DAS CARACTERÍSTICAS usando useMemo (Reutilizado) ---
  const filteredCharacteristics = useMemo(() => {
    const selectedCategoryId = formState.categoria_id; // Lembrete: Pego a categoria que está selecionada no formulário.
    if (!selectedCategoryId) return []; // Lembrete: Se nenhuma categoria estiver selecionada, retorno lista vazia.
    // Lembrete: Filtro a lista completa de características (`allCharacteristics`).
    return allCharacteristics.filter(char =>
      // Lembrete: Uma característica aparece se:
      // 1. O array de categorias associadas a ela (`char.associatedCategoryIds`) inclui a categoria selecionada no formulário.
      char.associatedCategoryIds.includes(selectedCategoryId)
      // OU
      // 2. A característica é "global" (ou seja, `char.associatedCategoryIds` está vazio, significando que ela se aplica a todas as categorias).
      || char.associatedCategoryIds.length === 0
    );
  }, [formState.categoria_id, allCharacteristics]); // Lembrete: Recalculo esta lista filtrada só quando a categoria selecionada ou a lista total de características mudam.


  // --- Minha Renderização ---
  if (loading) { // Lembrete: Se estiver no loading inicial (verificando usuário/negócios).
    return <div className="text-center p-10">Verificando seus dados...</div>;
  }

  if (!user) { // Lembrete: Segurança extra, o useEffect já deve ter redirecionado
    return <div className="text-center p-10">Você precisa estar logado para acessar esta página.</div>;
  }

  // --- Renderização Principal da Página "Meu Negócio" ---
  // Lembrete: Agora mostra a lista de negócios e o botão para adicionar novo,
  // ou o formulário de criação se showCreateForm for true.
  if (!showCreateForm) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Meus Estabelecimentos</h1>
          <button
            onClick={handleToggleCreateForm}
            className="button-primary py-2 px-4" // Lembrete: Usando minha classe de botão primário.
          >
            + Adicionar Novo Estabelecimento
          </button>
        </div>

        {isLoadingBusinesses && <p className="text-center text-gray-600">Carregando seus estabelecimentos...</p>}
        {!isLoadingBusinesses && userBusinesses.length === 0 && (
          <div className="text-center py-10 px-6 bg-gray-50 rounded-lg shadow">
            {/* Lembrete: Mensagem para cadastrar o primeiro estabelecimento */}
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhum estabelecimento cadastrado</h3>
            <p className="mt-1 text-sm text-gray-500">Comece adicionando seu primeiro local.</p>
            <div className="mt-6">
              <button onClick={handleToggleCreateForm} type="button" className="button-primary py-2 px-4">
                Cadastrar Primeiro Estabelecimento
              </button>
            </div>
          </div>
        )}
        {!isLoadingBusinesses && userBusinesses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Lembrete: Mapeio os negócios do usuário para exibir os cards */}
            {userBusinesses.map(negocio => (
              <div key={negocio.id} className="bg-white p-4 shadow rounded-lg border border-gray-200 flex flex-col"> {/* Lembrete: Adicionei flex flex-col para o botão ficar no final */}
                <h3 className="text-lg font-semibold text-gray-800 truncate" title={negocio.nome}>{negocio.nome}</h3>
                <p className={`text-xs font-medium mb-2 ${negocio.ativo ? 'text-green-600' : 'text-yellow-600'}`}>
                  Status: {negocio.ativo ? 'Ativo' : 'Inativo/Pendente'}
                </p>
                <p className="text-sm text-gray-600 mb-1">{negocio.nome_categoria || 'Sem categoria'}</p>
                <p className="text-sm text-gray-500 mb-3 flex-grow">{negocio.cidade}</p> {/* Lembrete: flex-grow para empurrar botões para baixo */}
                <div className="mt-auto pt-3 border-t border-gray-100 flex gap-2"> {/* Lembrete: mt-auto para alinhar ao final */}
                  <Link href={`/negocio/${negocio.id}`} className="text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded-md transition-colors">Ver Detalhes</Link>
                  <Link href={`/meu-negocio/editar/${negocio.id}`} className="text-xs bg-yellow-500 hover:bg-yellow-600 text-black py-1 px-2 rounded-md transition-colors">Editar</Link>
                  {/* Lembrete: Futuramente, posso adicionar um botão para gerenciar assinatura deste negócio específico */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else { // Lembrete: Se showCreateForm for true, mostro o formulário de cadastro
    // Lembrete: O formulário de cadastro que já existia aqui:
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-8 bg-white shadow-lg rounded-lg my-10 relative">
        <div className="flex justify-between items-center mb-6 border-b pb-3">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Cadastrar Novo Estabelecimento</h1>
            <button
                type="button"
                onClick={handleToggleCreateForm} // Lembrete: Botão para voltar para a lista
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
            >
                &larr; Voltar para Meus Estabelecimentos
            </button>
        </div>

        {/* Lembrete: Minhas Mensagens de Status e Erro do formulário. */}
        {submitStatus.message && (
            <div className={`p-4 mb-6 rounded-md text-center ${ submitStatus.type === 'success' ? 'bg-green-100 text-green-800' : submitStatus.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800' }`}> {submitStatus.message} </div>
        )}
        {uploadError && !isSubmitting && (
            <div className="p-4 mb-6 rounded-md text-center bg-red-100 text-red-800"> Erro no upload: {uploadError} </div>
        )}

        {/* Lembrete: Mostro um loading para as opções do formulário (categorias, características) ou o formulário em si. */}
        {loadingInitialData ? (
            <div className="text-center p-10">Carregando opções do formulário...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Lembrete: Seção 1: Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField name="nome" label="Nome do Estabelecimento" value={formState.nome} onChange={handleChange} required disabled={isSubmitting} placeholder="Nome visível ao público" />
              <div>
                <label htmlFor="categoria_id" className="block text-sm font-medium text-gray-700 mb-1">Categoria <span className="text-red-500">*</span></label>
                <select id="categoria_id" name="categoria_id" value={formState.categoria_id} onChange={handleChange} required className="input-form bg-white" disabled={isSubmitting || categorias.length === 0}>
                  <option value="" disabled>-- Selecione o tipo --</option>
                  {categorias.map((cat) => ( <option key={cat.id} value={cat.id}>{cat.nome}</option> ))}
                </select>
                {categorias.length === 0 && !loadingInitialData && <p className="text-xs text-red-500 mt-1">Nenhuma categoria encontrada. Cadastre categorias no painel admin.</p>}
              </div>
            </div>

            {/* Lembrete: Seções 2 a 5 (Descrição, Localização, Contato, Website) - JSX igual ao da página de edição. */}
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

            {/* Lembrete: Seção 6: Upload de Imagens - JSX igual ao da página de edição, mas usando MAX_IMAGES_PER_BUSINESS. */}
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
              {imageFiles.length === 0 && !isSubmitting && ( // Lembrete: Mostro esta mensagem se não houver imagens e não estiver submetendo.
                  <p className="text-sm text-red-600 text-center">É necessário adicionar pelo menos uma imagem.</p>
              )}
              {imageFiles.length > 0 && ( // Lembrete: Previews das imagens.
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {imageFiles.map((img, index) => (
                    <div key={img.id} className="relative group border rounded-md overflow-hidden aspect-square flex items-center justify-center bg-gray-100">
                      <img // Lembrete: Corrigi para img minúsculo, como no seu código original.
                        src={img.preview || img.url} // Lembrete: Para cadastro, img.preview (blob) será usado. img.url será null.
                        alt={`Preview ${index + 1}`}
                        className={`object-cover w-full h-full transition-opacity duration-300 ${mainImageIndex === index ? 'ring-4 ring-offset-2 ring-green-500' : 'ring-1 ring-gray-300'} ${img.uploading || img.error ? 'opacity-50' : 'opacity-100'}`}
                        onError={(e) => {
                          e.target.onerror = null; // Lembrete: Previne loop de erro se o placeholder também falhar
                          e.target.src = 'https://via.placeholder.com/150?text=Erro';
                        }} />
                      {/* Lembrete: Meus Overlays de status e botões de ação para cada imagem. */}
                      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 p-1 text-white text-center ${img.uploading || img.error ? 'bg-black bg-opacity-60' : 'bg-black bg-opacity-0 group-hover:bg-opacity-60'}`}>
                        {img.uploading && ( <div className="flex flex-col items-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-1" title={img.statusText || 'Processando...'}></div><p className="text-xs">{img.statusText || 'Processando...'}</p></div> )}
                        {img.error && !img.uploading && ( <div className="p-1" title={typeof img.error === 'string' ? img.error : 'Erro'}><svg className="h-6 w-6 text-red-500 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><p className="text-xs text-red-300 truncate">{typeof img.error === 'string' ? img.error.substring(0, 30) : 'Erro'}</p></div> )}
                        {/* Lembrete: Botões só aparecem no hover se não houver erro/upload. */}
                        {!img.uploading && !img.error && (
                          <div className={`absolute inset-0 flex flex-col items-center justify-center space-y-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                              <button type="button" onClick={() => handleRemoveImage(img.id)} disabled={isSubmitting} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed z-10" aria-label="Remover imagem"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                              {mainImageIndex !== index && ( <button type="button" onClick={() => handleSetMainImage(img.id)} disabled={isSubmitting} className="text-white text-xs bg-green-600 px-2 py-1 rounded shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed z-10"> Tornar Principal </button> )}
                          </div>
                        )}
                      </div>
                      {/* Lembrete: Meu Badge "Principal". */}
                      {mainImageIndex === index && !img.uploading && !img.error && <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded shadow z-10">Principal</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lembrete: Seção 7: Características - Agora com filtro dinâmico. */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Características Oferecidas {formState.categoria_id && categorias.find(c=>c.id === formState.categoria_id) ? `(para ${categorias.find(c=>c.id === formState.categoria_id).nome})` : ''}
              </label>

              {/* Lembrete: Só mostro as características se uma categoria foi selecionada. */}
              {formState.categoria_id ? (
                <>
                  {loadingInitialData && <p className="text-sm text-gray-500">Carregando características...</p>}

                  {!loadingInitialData && filteredCharacteristics.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-3 border p-4 rounded-md bg-gray-50">
                      {/* Lembrete: Mapeio a lista JÁ FILTRADA de características. */}
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

                  {/* Lembrete: Mensagem se não houver características para a categoria selecionada (mas existem características no sistema). */}
                  {!loadingInitialData && filteredCharacteristics.length === 0 && allCharacteristics.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1 p-4 border rounded-md bg-gray-50 text-center">
                      Nenhuma característica específica encontrada para esta categoria.
                    </p>
                  )}

                  {/* Lembrete: Mensagem se não houver NENHUMA característica cadastrada no sistema. */}
                  {!loadingInitialData && allCharacteristics.length === 0 && (
                    <p className="text-sm text-yellow-600 mt-1 p-4 border border-yellow-200 rounded-md bg-yellow-50 text-center">
                      Nenhuma característica cadastrada no sistema ainda.
                    </p>
                  )}
                </>
              ) : (
                // Lembrete: Mensagem para o usuário selecionar uma categoria primeiro.
                <p className="text-sm text-yellow-600 mt-1 p-4 border border-yellow-200 rounded-md bg-yellow-50 text-center">
                  Selecione uma categoria acima para ver as características disponíveis.
                </p>
              )}
            </div>

            {/* Lembrete: Meu Botão de Submit. */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting || loadingInitialData || imageFiles.some(img => img.uploading) || imageFiles.filter(img => !img.error).length === 0} // Lembrete: Desabilito se estiver submetendo, carregando dados, alguma imagem em upload, ou se não houver imagens válidas.
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

        {/* Lembrete: Meus Estilos CSS Globais (reutilizados). */}
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
  } // Lembrete: Fim do else que mostra o formulário

  // Lembrete: Removi o fallback antigo que dependia de `hasNegocio`.
  // Se não estiver carregando, e não for para mostrar o formulário,
  // a lógica de exibir a lista de negócios já foi tratada acima.
  // Este return null é um fallback final, mas não deve ser atingido se a lógica estiver correta.
  return null;
}

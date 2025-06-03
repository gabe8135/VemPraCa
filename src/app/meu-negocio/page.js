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
  
  // --- Meus Estados para o Formulário de Cadastro ---
  const [formState, setFormState] = useState({
    nome: '', categoria_id: '', descricao: '', endereco: '', cidade: '',
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
      
      // Se o usuário está logado, busca os dados para o formulário.
      // A lógica de verificar se já tem negócio foi removida.
      // Esta página agora é sempre para CADASTRAR UM NOVO.
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
    const files = Array.from(event.target.files);
     const availableSlots = MAX_IMAGES_PER_BUSINESS - imageFiles.length; // Usa a nova constante
    if (availableSlots <= 0) return; // Limite de MAX_IMAGES_PER_BUSINESS imagens.
    const filesToProcess = files.slice(0, availableSlots);
    setUploadError(''); setSubmitStatus({ message: '', type: '' });
    const newImageFilesInitialState = filesToProcess.map(file => {
      const id = uuidv4();
      const originalFileName = generateUniqueFileName(file);
      return { id, file, preview: URL.createObjectURL(file), uploading: false, uploaded: false, error: null, url: null, fileName: originalFileName, isExisting: false, statusText: null };
    });
    setImageFiles(prev => {
      const combined = [...prev, ...newImageFilesInitialState];
      // Se não tem nenhuma imagem principal, defino a 1ª como principal
      if (prev.length === 0 && newImageFilesInitialState.length > 0) {
        setMainImageIndex(0);
      }
      return combined;
    });
    event.target.value = ''; // Limpo o input de arquivo.
  };

  const handleRemoveImage = (idToRemove) => { // Quando o usuário clica para remover uma imagem.
    const imageToRemove = imageFiles.find(img => img.id === idToRemove);
    if (!imageToRemove) return;
    if (imageToRemove.preview?.startsWith('blob:')) { URL.revokeObjectURL(imageToRemove.preview); } // Libero memória do blob.
    const updatedImageFiles = imageFiles.filter(img => img.id !== idToRemove);
    setImageFiles(updatedImageFiles);
    // Reajusto o índice da imagem principal se necessário.
    if (updatedImageFiles.length === 0) { setMainImageIndex(0); }
    else if (idToRemove === imageFiles[mainImageIndex]?.id) { setMainImageIndex(0); }
    else { const currentMainImageId = imageFiles[mainImageIndex]?.id; const newMainIndex = updatedImageFiles.findIndex(img => img.id === currentMainImageId); setMainImageIndex(newMainIndex >= 0 ? newMainIndex : 0); }
    setSubmitStatus({ message: '', type: '' }); setUploadError('');
  };

  const handleSetMainImage = (idToSetMain) => { // Quando o usuário define uma imagem como principal.
    const indexToSetMain = imageFiles.findIndex(img => img.id === idToSetMain);
    // Só permito se a imagem não estiver em upload.
    if (indexToSetMain !== -1 && !imageFiles[indexToSetMain].uploading) { setMainImageIndex(indexToSetMain); setSubmitStatus({ message: '', type: '' }); }
    else if (imageFiles[indexToSetMain]?.uploading) { setSubmitStatus({ message: 'Aguarde o processamento da imagem.', type: 'info' }); }
  };

  // --- Minha Função de Upload e Compressão de Imagens (Reutilizada) ---
  const uploadAndCompressImages = async (filesToUpload) => {
    const uploadedUrlsMap = new Map();
    let localUploadErrors = [];
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
        // Após o upload, atualizo 'url' e também 'preview' para a URL pública, para consistência.
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
    if (imageFiles.filter(img => !img.error).length === 0) { setSubmitStatus({ message: 'Adicione pelo menos uma imagem válida.', type: 'error' }); setIsSubmitting(false); return; }
    let currentMainIndex = mainImageIndex;
    // Verifico se a imagem principal que está selecionada é válida (não tem erro e não está em upload).
    if (imageFiles[currentMainIndex]?.error || imageFiles[currentMainIndex]?.uploading) {
        // Se não for, tento encontrar a primeira imagem válida que já tenha uma URL (ou seja, já foi upada).
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
      // 1. Faço Upload das Novas Imagens (as que não são `isExisting` e têm `file`).
      const imagesParaUpload = imageFiles.filter(img => !img.uploaded && img.file && !img.error);
      let uploadedUrlsMap = new Map();
      if (imagesParaUpload.length > 0) {
        setSubmitStatus({ message: `Enviando ${imagesParaUpload.length} imagens...`, type: 'loading' });
        uploadedUrlsMap = await uploadAndCompressImages(imagesParaUpload);
      }

      // 2. Atualizo o estado local das imagens e monto o array final de URLs.
      const updatedImageFilesState = imageFiles
        .map(img => {
            if (uploadedUrlsMap.has(img.id)) {
                return { ...img, url: uploadedUrlsMap.get(img.id), preview: uploadedUrlsMap.get(img.id), uploaded: true, uploading: false, error: null, statusText: null };
            }
            return img;
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
      if (!mainImageUrl) throw new Error("Erro crítico: URL da imagem principal não encontrada após processamento.");
      const additionalImageUrls = updatedImageFilesState // Pego as URLs das outras imagens.
        .filter((img, index) => index !== currentMainIndex && img.url)
        .map(img => img.url);
      finalImageUrls = [mainImageUrl, ...additionalImageUrls]; // Array final: [principal, ...adicionais].

      // 3. Preparo os dados do negócio para INSERIR no banco.
      setSubmitStatus({ message: 'Salvando informações...', type: 'loading' });
      const negocioData = {
        nome: formState.nome, categoria_id: formState.categoria_id, descricao: formState.descricao || null,
        endereco: formState.endereco || null, cidade: formState.cidade, telefone: formState.telefone || null,
        whatsapp: formState.whatsapp || null, website: formState.website || null, imagens: finalImageUrls,
        usuario_id: user.id, ativo: false // Negócios começam inativos.
      };

      // 4. INSIRO o negócio no banco.
      const { data: insertedNegocio, error: insertNegocioError } = await supabase
        .from('negocios').insert([negocioData]).select('id').single(); // Pego o ID do negócio inserido.
      if (insertNegocioError) throw insertNegocioError;
      const newNegocioId = insertedNegocio.id; // Guardo o ID para usar nas características e no redirecionamento.

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
      setFormState({ nome: '', categoria_id: '', descricao: '', endereco: '', cidade: '', telefone: '', whatsapp: '', website: '' });
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
    // para evitar memory leaks. Só faço isso para as imagens que são novas (não `isExisting`)
    // e que têm um preview que é um blob.
    return () => { imageFiles.forEach(img => { if(img.preview && img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview) }); };
  }, [imageFiles]); // Dependência correta para este efeito.

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

        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 border-b pb-3">Cadastrar Novo Estabelecimento</h1>
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
                  {imageFiles.map((img, index) => (
                    <div key={img.id} className="relative group border rounded-md overflow-hidden aspect-square flex items-center justify-center bg-gray-100">
                      <img
                        src={img.preview || img.url} // Para cadastro, img.preview (blob) será usado. img.url será null.
                        alt={`Preview ${index + 1}`}
                        className={`object-cover w-full h-full transition-opacity duration-300 ${mainImageIndex === index ? 'ring-4 ring-offset-2 ring-green-500' : 'ring-1 ring-gray-300'} ${img.uploading || img.error ? 'opacity-50' : 'opacity-100'}`}
                        onError={(e) => {
                          e.target.onerror = null; // Previne loop de erro se o placeholder também falhar
                          e.target.src = 'https://via.placeholder.com/150?text=Erro';
                        }} />
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

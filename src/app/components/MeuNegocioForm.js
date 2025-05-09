// src/app/components/MeuNegocioForm.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression'; // Minha biblioteca para compressão de imagem.

// Função para gerar nomes de arquivo únicos.
const generateUniqueFileName = (file) => {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file'; // Garanto uma extensão, nem que seja 'file'.
  // Gero um nome único e limpo caracteres inválidos do nome original.
  const safeBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, '_');
  const uniqueId = uuidv4().substring(0, 8); // Um ID mais curto é suficiente.
  // Retorno o nome com ID, nome seguro e a extensão original (que depois vou converter para webp).
  return `${uniqueId}-${safeBaseName}.${fileExt}`;
};

export default function MeuNegocioForm({ userId, onCadastroSucesso }) {
  // Meus estados de loading e status.
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState(null);
  const [loadingCaracteristicas, setLoadingCaracteristicas] = useState(true);
  const [errorCaracteristicas, setErrorCaracteristicas] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ message: '', type: '' });

  // Estados para os campos do formulário.
  const [nomeNegocio, setNomeNegocio] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [caracteristicas, setCaracteristicas] = useState([]);
  const [selectedCaracteristicas, setSelectedCaracteristicas] = useState([]);

  // Estados para o upload de imagens.
  // A estrutura de cada item é: { id, file?, preview, uploading, uploaded, error, url?, fileName?, isExisting: false, statusText? }
  const [imageFiles, setImageFiles] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0); // Índice da imagem principal no array imageFiles.
  const [uploadError, setUploadError] = useState(''); // Erro geral do upload.

  // Efeito para buscar categorias e características.
  useEffect(() => {
    const fetchData = async () => {
        setLoadingCategories(true); setLoadingCaracteristicas(true);
        setErrorCategories(null); setErrorCaracteristicas(null);
        try {
            const { data: catData, error: catErr } = await supabase.from('categorias').select('id, nome').order('nome');
            if (catErr) throw catErr;
            setCategorias(catData || []); setSelectedCategoria('');
        } catch (err) { console.error("Erro ao buscar categorias:", err); setErrorCategories("Falha ao carregar categorias."); }
        finally { setLoadingCategories(false); }
        try {
            const { data: caracData, error: caracErr } = await supabase.from('caracteristicas').select('id, nome').order('nome');
            if (caracErr) throw caracErr;
            setCaracteristicas(caracData || []);
        } catch (err) { console.error("Erro ao buscar características:", err); setErrorCaracteristicas("Falha ao carregar características."); }
        finally { setLoadingCaracteristicas(false); }
    };
    fetchData();
  }, []);

  // Handler para quando seleciono arquivos de imagem.
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    const availableSlots = 5 - imageFiles.length;
    if (availableSlots <= 0) return; // Não adiciono mais se já atingi o limite de 5.

    const filesToProcess = files.slice(0, availableSlots);
    setUploadError('');
    setSubmitStatus({ message: '', type: '' }); // Limpo o status ao adicionar novas imagens.

    const newImageFilesInitialState = filesToProcess.map(file => {
      const id = uuidv4();
      const originalFileName = generateUniqueFileName(file); // Gero o nome baseado no original.
      return {
        id, file, preview: URL.createObjectURL(file),
        uploading: false, uploaded: false, error: null, url: null,
        fileName: originalFileName, // Guardo o nome original com ID único.
        isExisting: false, statusText: null
      };
    });

    setImageFiles(prev => [...prev, ...newImageFilesInitialState]);

    // Defino a primeira imagem como principal se for a primeira que adicionei.
    if (imageFiles.length === 0 && newImageFilesInitialState.length > 0) {
        setMainImageIndex(0);
    }

    event.target.value = ''; // Limpo o input de arquivo.
  };

  // Handler para remover uma imagem da lista.
  const handleRemoveImage = (idToRemove) => {
    const imageToRemove = imageFiles.find(img => img.id === idToRemove);
    if (!imageToRemove) return;

    // Revogo a URL de preview se for um blob, para liberar memória.
    if (imageToRemove.preview?.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.preview);
    }

    // Removo do estado.
    const updatedImageFiles = imageFiles.filter(img => img.id !== idToRemove);
    setImageFiles(updatedImageFiles);

    // Ajusto o índice da imagem principal.
    if (updatedImageFiles.length === 0) {
        setMainImageIndex(0); // Reseto se não houver mais imagens.
    } else if (idToRemove === imageFiles[mainImageIndex]?.id) {
        // Se removi a principal, defino a nova primeira como principal.
        setMainImageIndex(0);
    } else {
        // Se removi outra, recalculo o índice da principal atual.
        const currentMainImageId = imageFiles[mainImageIndex]?.id;
        const newMainIndex = updatedImageFiles.findIndex(img => img.id === currentMainImageId);
        setMainImageIndex(newMainIndex >= 0 ? newMainIndex : 0); // Mantenho ou volto para o índice 0.
    }

    setSubmitStatus({ message: '', type: '' }); // Limpo o status.
    setUploadError('');
  };

  // Handler para definir qual imagem é a principal.
  const handleSetMainImage = (idToSetMain) => {
    const indexToSetMain = imageFiles.findIndex(img => img.id === idToSetMain);
    // Permito definir como principal mesmo se tiver erro, mas não se estiver carregando.
    if (indexToSetMain !== -1 && !imageFiles[indexToSetMain].uploading) {
      setMainImageIndex(indexToSetMain);
      setSubmitStatus({ message: '', type: '' }); // Limpo o status.
    } else if (imageFiles[indexToSetMain]?.uploading) {
        setSubmitStatus({ message: 'Aguarde o processamento da imagem.', type: 'info' });
    }
  };

  // Handler para mudança na seleção de Características.
  const handleCaracteristicaChange = (caracteristicaId) => {
    setSelectedCaracteristicas(prev =>
        prev.includes(caracteristicaId)
          ? prev.filter(id => id !== caracteristicaId)
          : [...prev, caracteristicaId]
      );
  };

  // Minha função para fazer upload e compressão das imagens.
  const uploadAndCompressImages = async (filesToUpload) => {
    const uploadedUrlsMap = new Map(); // Mapeia o ID temporário da imagem para a URL final no Supabase.
    let localUploadErrors = []; // Erros específicos desta leva de uploads.

    const uploadPromises = filesToUpload.map(async (imgState) => {
      const file = imgState.file;
      if (!file) return { id: imgState.id, success: false, error: 'Arquivo inválido' }; // Checagem de segurança.

      // Defino o nome final como .webp.
      const webpFileName = `${imgState.fileName?.replace(/\.[^/.]+$/, '') || uuidv4()}.webp`;
      const filePath = `public/${userId}/${webpFileName}`; // Caminho no bucket do Supabase.

      // Atualizo o estado da imagem para mostrar "Otimizando...".
      setImageFiles(prev => prev.map(i => i.id === imgState.id ? { ...i, uploading: true, statusText: 'Otimizando...' } : i));

      try {
        // Minhas opções de compressão.
        const options = {
          maxSizeMB: 0.8,         // Tamanho máximo em MB.
          maxWidthOrHeight: 1920, // Dimensão máxima.
          useWebWorker: true,     // Uso Web Worker para não travar a UI.
          fileType: 'image/webp', // Converte para WebP.
          initialQuality: 0.85,   // Qualidade inicial do WebP.
        };

        console.log(`Comprimindo ${file.name} para ${webpFileName}...`);
        const compressedFile = await imageCompression(file, options);
        console.log(`Compressão de ${webpFileName} concluída. Tamanho: ${(compressedFile.size / 1024).toFixed(0)} KB`);

        // Atualizo o estado da imagem para mostrar "Enviando...".
        setImageFiles(prev => prev.map(i => i.id === imgState.id ? { ...i, statusText: 'Enviando...' } : i));

        // Faço o upload para o Supabase Storage.
        const { error: uploadError } = await supabase.storage
          .from('imagens') // Meu bucket correto.
          .upload(filePath, compressedFile, { contentType: 'image/webp', upsert: false }); // Não quero sobrescrever se já existir.

        if (uploadError) throw uploadError;

        // Pego a URL pública da imagem.
        const { data: { publicUrl } } = supabase.storage
          .from('imagens') // Meu bucket correto.
          .getPublicUrl(filePath);

        if (!publicUrl) throw new Error('Não foi possível obter URL pública.');

        console.log(`Upload de ${webpFileName} concluído. URL: ${publicUrl}`);
        uploadedUrlsMap.set(imgState.id, publicUrl);

        // Atualizo o estado da imagem específica para sucesso.
        setImageFiles(prev => prev.map(i => i.id === imgState.id ? {
            ...i, uploading: false, uploaded: true, url: publicUrl, fileName: filePath, error: null, statusText: null
          } : i));

        return { id: imgState.id, success: true, url: publicUrl };

      } catch (error) {
        console.error(`Erro no processo de ${file.name} -> ${webpFileName}:`, error);
        localUploadErrors.push({ id: imgState.id, fileName: file.name, message: error.message });
        // Atualizo o estado da imagem específica para erro.
        setImageFiles(prev => prev.map(i => i.id === imgState.id ? {
            ...i, uploading: false, uploaded: false, error: error.message || 'Falha', statusText: null
          } : i));
        return { id: imgState.id, success: false, error: error.message };
      }
    });

    // Espero todas as promessas de upload.
    await Promise.all(uploadPromises);

    // Se houver erros, atualizo o estado geral de erro e lanço uma exceção.
    if (localUploadErrors.length > 0) {
      const errorMsg = `Falha ao enviar ${localUploadErrors.length} imagem(ns).`;
      setUploadError(errorMsg);
      throw new Error(errorMsg);
    }

    return uploadedUrlsMap; // Retorno o mapa de IDs para URLs.
  };


  // Função para salvar o negócio.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ message: '', type: '' });
    setUploadError('');

    // Validações básicas.
    if (!userId) { setSubmitStatus({ message: 'Usuário não identificado.', type: 'error' }); setIsSubmitting(false); return; }
    if (imageFiles.length === 0) { setSubmitStatus({ message: 'Adicione pelo menos uma imagem.', type: 'error' }); setIsSubmitting(false); return; }

    // Verifico se a imagem principal definida é válida (não tem erro e não está carregando).
    let currentMainIndex = mainImageIndex;
    if (imageFiles[currentMainIndex]?.error || imageFiles[currentMainIndex]?.uploading) {
        // Se a principal atual for inválida, tento achar a primeira válida.
        const firstValidIndex = imageFiles.findIndex(img => !img.error && !img.uploading);
        if (firstValidIndex === -1) {
            // Se não houver nenhuma válida, mostro erro.
            setSubmitStatus({ message: 'Nenhuma imagem válida disponível. Verifique os erros ou aguarde o envio.', type: 'error' });
            setIsSubmitting(false);
            return;
        }
        // Se achei uma válida, aviso e atualizo o índice.
        setSubmitStatus({ message: 'Imagem principal inválida, selecionando a primeira válida.', type: 'warning' });
        setMainImageIndex(firstValidIndex);
        currentMainIndex = firstValidIndex;
    }

    let finalImageUrls = [];
    try {
      // 1. Faço upload das imagens que ainda não foram enviadas.
      const imagesParaUpload = imageFiles.filter(img => !img.uploaded && img.file && !img.error);
      let uploadedUrlsMap = new Map();

      if (imagesParaUpload.length > 0) {
        setSubmitStatus({ message: `Otimizando e enviando ${imagesParaUpload.length} imagens...`, type: 'loading' });
        uploadedUrlsMap = await uploadAndCompressImages(imagesParaUpload);
      }

      // 2. Consolido todas as URLs válidas (as que acabaram de ser upadas e as que já estavam).
      const updatedImageFilesState = imageFiles.map(img => {
          if (uploadedUrlsMap.has(img.id)) {
              // Se esta imagem foi upada agora, atualizo com a URL.
              return { ...img, url: uploadedUrlsMap.get(img.id), uploaded: true, uploading: false, error: null, statusText: null };
          }
          return img; // Senão, mantenho o estado existente.
      });
      setImageFiles(updatedImageFilesState); // Atualizo o estado geral das imagens.

      // Pego a URL da imagem principal (já validada).
      const mainImageUrl = updatedImageFilesState[currentMainIndex]?.url;
      if (!mainImageUrl) {
          // Segurança extra, embora a validação inicial deva pegar isso.
          throw new Error("Erro crítico ao obter URL da imagem principal.");
      }

      // Pego as URLs das imagens adicionais (excluindo a principal).
      const additionalImageUrls = updatedImageFilesState
        .filter((img, index) => index !== currentMainIndex && img.url && !img.error)
        .map(img => img.url);

      // Monto o array final de imagens para o banco: [principal, ...adicionais].
      finalImageUrls = [mainImageUrl, ...additionalImageUrls];

      // 3. Preparo os dados do negócio.
      setSubmitStatus({ message: 'Salvando informações...', type: 'loading' });
      const negocioData = {
        nome: nomeNegocio,
        categoria_id: selectedCategoria,
        descricao: descricao || null,
        endereco: endereco || null,
        cidade: cidade,
        telefone: telefone || null,
        whatsapp: whatsapp || null,
        website: website || null,
        imagens: finalImageUrls, // Salvo o array com a principal na primeira posição.
        usuario_id: userId,
        ativo: false // Negócios começam inativos, precisam de aprovação/pagamento.
      };

      // 4. Insiro os dados do negócio no banco.
      const { data: insertedNegocio, error: insertNegocioError } = await supabase
        .from('negocios')
        .insert([negocioData])
        .select()
        .single();

      if (insertNegocioError) throw insertNegocioError;

      // 5. Insiro as Características selecionadas.
      if (selectedCaracteristicas.length > 0) {
          const negocioCaracteristicasData = selectedCaracteristicas.map(caracteristicaId => ({
            negocio_id: insertedNegocio.id,
            caracteristica_id: caracteristicaId
          }));
          const { error: insertCaracError } = await supabase.from('negocio_caracteristicas').insert(negocioCaracteristicasData);
          if (insertCaracError) {
            console.error("Erro ao salvar características associadas:", insertCaracError);
            // Lembrete: Decidir como tratar esse erro (talvez mostrar um aviso, mas o negócio principal foi criado).
          }
      }

      // Sucesso geral!
      setSubmitStatus({ message: 'Negócio cadastrado com sucesso!', type: 'success' });
      // Limpo o formulário.
      setNomeNegocio(''); setSelectedCategoria(''); setDescricao(''); setEndereco('');
      setCidade(''); setTelefone(''); setWhatsapp(''); setWebsite('');
      setImageFiles([]); setMainImageIndex(0); setSelectedCaracteristicas([]);

      if (onCadastroSucesso) {
        onCadastroSucesso(insertedNegocio); // Chamo a callback do componente pai.
      }

    } catch (err) {
      console.error("Erro no processo de cadastro:", err);
      // Mostro o erro de upload específico se houver, senão o erro geral.
      setSubmitStatus({ message: `Erro: ${uploadError || err.message || 'Verifique os dados.'}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Limpo as URLs de preview quando o componente desmonta para evitar memory leaks.
  useEffect(() => {
    return () => {
        imageFiles.forEach(img => {
            if (img.preview && img.preview.startsWith('blob:')) {
                URL.revokeObjectURL(img.preview);
            }
        });
    };
  }, [imageFiles]);

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 bg-white shadow-lg rounded-lg my-10 relative">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 border-b pb-3">Cadastrar Meu Negócio</h1>

      {/* Minhas mensagens de Status e Erro. */}
      {submitStatus.message && (
        <div className={`p-4 mb-4 rounded-md text-center ${ submitStatus.type === 'success' ? 'bg-green-100 text-green-800' : submitStatus.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800' }`}> {submitStatus.message} </div>
      )}
      {uploadError && !isSubmitting && (
        <div className="p-4 mb-4 rounded-md text-center bg-red-100 text-red-800"> Erro no upload: {uploadError} </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Seção 1: Informações Básicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
            <input type="text" id="nome" value={nomeNegocio} onChange={(e) => setNomeNegocio(e.target.value)} required className="input-form" placeholder="Nome do Estabelecimento" disabled={isSubmitting} />
          </div>
          <div>
            <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-1">Categoria <span className="text-red-500">*</span></label>
            {loadingCategories && <p className="text-sm text-gray-500">Carregando...</p>}
            {errorCategories && <p className="text-sm text-red-500">{errorCategories}</p>}
            {!loadingCategories && !errorCategories && (
              <select id="categoria" value={selectedCategoria} onChange={(e) => setSelectedCategoria(e.target.value)} required className="input-form bg-white" disabled={categorias.length === 0 || isSubmitting || !!errorCategories}>
                <option value="" disabled>-- Selecione --</option>
                {categorias.map((cat) => ( <option key={cat.id} value={cat.id}>{cat.nome}</option> ))}
              </select>
            )}
            {categorias.length === 0 && !loadingCategories && !errorCategories && ( <p className="text-sm text-yellow-600 mt-1">Nenhuma categoria encontrada.</p> )}
          </div>
        </div>
        {/* Seção 2: Descrição */}
        <div>
          <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea id="descricao" rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} className="input-form" placeholder="Descreva o local, seus atrativos..." disabled={isSubmitting} />
        </div>
        {/* Seção 3: Localização */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 mb-1">Endereço Completo</label>
            <input type="text" id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} className="input-form" placeholder="Ex: Rua das Flores, 123" disabled={isSubmitting} />
          </div>
          <div>
            <label htmlFor="cidade" className="block text-sm font-medium text-gray-700 mb-1">Cidade <span className="text-red-500">*</span></label>
            <input type="text" id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} required className="input-form" placeholder="Ex: Gramado" disabled={isSubmitting} />
          </div>
        </div>
        {/* Seção 4: Contato */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input type="tel" id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="input-form" placeholder="(XX) XXXX-XXXX" disabled={isSubmitting} />
          </div>
          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (com DDD)</label>
            <input type="tel" id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="input-form" placeholder="55XX9XXXXXXXX" disabled={isSubmitting} />
          </div>
        </div>
         {/* Seção 5: Website */}
        <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">Website / Rede Social</label>
            <input type="url" id="website" value={website} onChange={(e) => setWebsite(e.target.value)} className="input-form" placeholder="https://..." disabled={isSubmitting} />
        </div>


        {/* Seção 6: Upload de Imagens */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Imagens (máx. 5, a primeira será a principal)</label>
          <div className="mb-4 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 48 48" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" /></svg>
                <div className="flex text-sm text-gray-600 justify-center">
                  <label htmlFor="file-upload" className={`relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500 ${isSubmitting || imageFiles.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <span>Adicionar imagens</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} disabled={isSubmitting || imageFiles.length >= 5} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, WEBP. Máximo de 5 fotos.</p>
            </div>
          </div>
          {/* Previews das imagens com status e botões. */}
          {imageFiles.length > 0 && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {imageFiles.map((img, index) => (
                <div key={img.id} className="relative group border rounded-md overflow-hidden aspect-square flex items-center justify-center bg-gray-100">
                  <img
                    src={img.preview} alt={`Preview ${index + 1}`}
                    className={`object-cover w-full h-full transition-opacity duration-300 ${mainImageIndex === index ? 'ring-4 ring-offset-2 ring-green-500' : 'ring-1 ring-gray-300'} ${img.uploading || img.error ? 'opacity-50' : 'opacity-100'}`}
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=Erro'; }}
                  />
                  {/* Overlay para Ações, Erros, Loading e Status. */}
                  <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 p-1 text-white text-center ${img.uploading || img.error ? 'bg-black bg-opacity-60' : 'bg-black bg-opacity-0 group-hover:bg-opacity-60'}`}>
                    {/* Indicador de Uploading. */}
                    {img.uploading && (
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-1" title={img.statusText || 'Processando...'}></div>
                            <p className="text-xs">{img.statusText || 'Processando...'}</p>
                        </div>
                    )}
                    {/* Indicador de Erro. */}
                    {img.error && !img.uploading && (
                        <div className="p-1" title={typeof img.error === 'string' ? img.error : 'Erro'}>
                            <svg className="h-6 w-6 text-red-500 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-xs text-red-300 truncate">{typeof img.error === 'string' ? img.error.substring(0, 30) : 'Erro'}</p>
                        </div>
                    )}
                    {/* Botões (Aparecem no Hover se não estiver carregando/erro). */}
                    {!img.uploading && !img.error && (
                      <div className={`absolute inset-0 flex flex-col items-center justify-center space-y-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                          {/* Botão Remover. */}
                          <button type="button" onClick={() => handleRemoveImage(img.id)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 z-10" aria-label="Remover imagem">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                          {/* Botão Definir Principal (só aparece se não for a principal). */}
                          {mainImageIndex !== index && (
                            <button type="button" onClick={() => handleSetMainImage(img.id)} className="text-white text-xs bg-green-600 px-2 py-1 rounded shadow-md hover:bg-green-700 z-10">
                                Principal
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                  {/* Badge "Principal". */}
                  {mainImageIndex === index && !img.uploading && !img.error && <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded shadow z-10">Principal</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seção 7: Características */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Características Oferecidas</label>
          {loadingCaracteristicas && <p className="text-sm text-gray-500">Carregando...</p>}
          {errorCaracteristicas && <p className="text-sm text-red-500">{errorCaracteristicas}</p>}
          {!loadingCaracteristicas && !errorCaracteristicas && caracteristicas.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-3">
              {caracteristicas.map((item) => (
                <div key={item.id} className="flex items-center">
                  <input type="checkbox" id={`caracteristica-${item.id}`} value={item.id} checked={selectedCaracteristicas.includes(item.id)} onChange={() => handleCaracteristicaChange(item.id)} disabled={isSubmitting} className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer" />
                  <label htmlFor={`caracteristica-${item.id}`} className="ml-2 block text-sm text-gray-900 cursor-pointer">{item.nome}</label>
                </div>
              ))}
            </div>
          )}
          {!loadingCaracteristicas && !errorCaracteristicas && caracteristicas.length === 0 && ( <p className="text-sm text-yellow-600 mt-1">Nenhuma característica encontrada.</p> )}
        </div>

        {/* Botão de Submit */}
        <div className="pt-6">
          <button
            type="submit"
            disabled={isSubmitting || loadingCategories || loadingCaracteristicas || !!errorCategories || !!errorCaracteristicas || imageFiles.some(img => img.uploading)} // Desabilito se alguma imagem estiver carregando.
            className="w-full button-primary flex items-center justify-center py-3"
          >
            {isSubmitting ? (
              <> {/* Meu Ícone Spinner. */}
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processando...
              </>
            ) : (
              'Cadastrar Estabelecimento'
            )}
          </button>
        </div>
      </form>

      {/* Meus estilos CSS Globais para esta página. */}
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

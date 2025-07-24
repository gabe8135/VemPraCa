'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';
import LoadingModal from '@/app/components/LoadingModal';
import { FaUserPlus } from 'react-icons/fa';

// Componentes auxiliares
function InputField({ label, name, value, onChange, required = false, placeholder = '', type = 'text', disabled = false, ...props }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>
      <input
        type={type} name={name} id={name} value={value || ''} onChange={onChange}
        required={required} placeholder={placeholder} disabled={disabled}
        className="input-form"
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
        className="input-form"
        {...props}
      />
    </div>
  );
}

const generateUniqueFileName = (file) => {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
  const safeBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, '_');
  const uniqueId = uuidv4().substring(0, 8);
  return `${uniqueId}-${safeBaseName}.${fileExt}`;
};

const MAX_IMAGES_PER_BUSINESS = 15;

export default function AdminCadastrarNegocioPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [formState, setFormState] = useState({
    nome: '', proprietario: '', categoria_id: '', descricao: '', endereco: '', cidade: '',
    telefone: '', whatsapp: '', website: '', email_proprietario: ''
  });
  
  const [categorias, setCategorias] = useState([]);
  const [allCharacteristics, setAllCharacteristics] = useState([]);
  const [caracteristicaCategoriaRelations, setCaracteristicaCategoriaRelations] = useState([]);
  const [selectedCaracteristicas, setSelectedCaracteristicas] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ message: '', type: '' });
  const [uploadError, setUploadError] = useState('');
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [estadoSelecionado, setEstadoSelecionado] = useState('');
  const [cidades, setCidades] = useState([]);
  const [estados, setEstados] = useState([]);

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
      await fetchInitialFormData();
      setLoadingPage(false);
    };

    initializePage();
  }, [router, checkUserRole]);

  // --- EFEITO PARA CARREGAR ESTADOS (CORRIGIDO COM LOGS) ---
  useEffect(() => {
    const carregarEstados = async () => {
      console.log('🌎 Iniciando carregamento dos estados...');
      try {
        const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
        
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Estados carregados:', data.length, 'estados');
        setEstados(data || []);
      } catch (error) {
        console.error('❌ Erro ao carregar estados:', error);
        setEstados([]);
        setSubmitStatus({ 
          message: 'Erro ao carregar estados. Tente recarregar a página.', 
          type: 'warning' 
        });
      }
    };

    carregarEstados();
  }, []);

  // --- EFEITO PARA CARREGAR CIDADES QUANDO O ESTADO MUDAR (CORRIGIDO) ---
  useEffect(() => {
    const carregarCidades = async () => {
      if (!estadoSelecionado) {
        console.log('🏙️ Nenhum estado selecionado, limpando cidades');
        setCidades([]);
        setFormState(prev => ({ ...prev, cidade: '' }));
        return;
      }

      console.log('🏙️ Carregando cidades para o estado ID:', estadoSelecionado);
      try {
        const response = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoSelecionado}/municipios?orderBy=nome`
        );
        
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Cidades carregadas:', data.length, 'cidades');
        setCidades(data || []);
      } catch (error) {
        console.error('❌ Erro ao carregar cidades:', error);
        setCidades([]);
        setSubmitStatus({ 
          message: 'Erro ao carregar cidades. Tente selecionar outro estado.', 
          type: 'warning' 
        });
      }
    };

    carregarCidades();
  }, [estadoSelecionado]);

  const fetchInitialFormData = useCallback(async () => {
    setLoadingInitialData(true);
    setSubmitStatus({ message: '', type: '' });
    try {
      const [catRes, caracRes, relRes, usersRes] = await Promise.all([
        supabase.from('categorias').select('id, nome').order('nome'),
        supabase.from('caracteristicas').select('id, nome').order('nome'),
        supabase.from('caracteristica_categorias').select('caracteristica_id, categoria_id'),
        supabase.from('profiles').select('id, nome_proprietario, email').order('nome_proprietario')
      ]);

      if (catRes.error) throw new Error(catRes.error.message || 'Erro ao buscar categorias');
      setCategorias(catRes.data || []);

      if (caracRes.error) throw new Error(caracRes.error.message || 'Erro ao buscar características');
      setAllCharacteristics(caracRes.data || []);

      if (relRes.error) throw new Error(relRes.error.message || 'Erro ao buscar relações');
      setCaracteristicaCategoriaRelations(relRes.data || []);

      if (usersRes.error) throw new Error(usersRes.error.message || 'Erro ao buscar usuários');
      setAllUsers(usersRes.data || []);

    } catch (error) {
      console.error("Erro ao buscar dados iniciais:", error.message);
      setSubmitStatus({ message: `Erro ao carregar opções: ${error.message}`, type: 'error' });
    } finally {
      setLoadingInitialData(false);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    if (name === 'categoria_id') {
      setSelectedCaracteristicas([]);
    }
  };

  const handleCaracteristicaChange = (caracteristicaId) => {
    setSelectedCaracteristicas(prev =>
      prev.includes(caracteristicaId)
        ? prev.filter(id => id !== caracteristicaId)
        : [...prev, caracteristicaId]
    );
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    setUploadError('');
    setSubmitStatus({ message: '', type: '' });

    const newFilesToAdd = selectedFiles.slice(0, MAX_IMAGES_PER_BUSINESS - imageFiles.length);

    const newImageObjects = newFilesToAdd.map(file => {
      const id = uuidv4();
      const originalFileName = generateUniqueFileName(file);
      const blobURL = URL.createObjectURL(file);
      return {
        id, file, preview: blobURL, uploading: false, uploaded: false,
        error: null, url: null, fileName: originalFileName, isExisting: false, statusText: null,
      };
    });

    setImageFiles(prevFiles => {
      const updatedFiles = [...prevFiles, ...newImageObjects];
      if (prevFiles.length === 0 && newImageObjects.length > 0) {
        setMainImageIndex(0);
      }
      return updatedFiles;
    });
    event.target.value = '';
  };

  const handleRemoveImage = (idToRemove) => {
    const imageToRemove = imageFiles.find(img => img.id === idToRemove);
    if (!imageToRemove) return;

    if (imageToRemove.preview && imageToRemove.preview.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.preview);
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
    setSubmitStatus({ message: '', type: '' });
    setUploadError('');
  };

  const handleSetMainImage = (idToSetMain) => {
    const indexToSetMain = imageFiles.findIndex(img => img.id === idToSetMain);
    if (indexToSetMain !== -1 && !imageFiles[indexToSetMain]?.uploading) {
      setMainImageIndex(indexToSetMain);
      setSubmitStatus({ message: '', type: '' });
    }
  };

  const uploadAndCompressImages = async (filesToUpload) => {
    const uploadedUrlsMap = new Map();
    let localUploadErrors = [];
    
    const uploadPromises = filesToUpload.map(async (imgState) => {
      const file = imgState.file;
      if (!file) return { id: imgState.id, success: false, error: 'Arquivo inválido' };
      
      const webpFileName = `${imgState.fileName?.replace(/\.[^/.]+$/, '') || uuidv4()}.webp`;
      const filePath = `admin/${user.id}/${webpFileName}`;
      
      setImageFiles(prev => prev.map(i => 
        i.id === imgState.id ? { ...i, uploading: true, statusText: 'Otimizando...' } : i
      ));

      try {
        const options = {
          maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true,
          fileType: 'image/webp', initialQuality: 0.85
        };
        const compressedFile = await imageCompression(file, options);
        
        setImageFiles(prev => prev.map(i => 
          i.id === imgState.id ? { ...i, statusText: 'Enviando...' } : i
        ));

        const { error: uploadError } = await supabase.storage
          .from('imagens')
          .upload(filePath, compressedFile, { contentType: 'image/webp', upsert: false });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('imagens').getPublicUrl(filePath);
        if (!publicUrl) throw new Error('URL pública não encontrada.');
        
        uploadedUrlsMap.set(imgState.id, publicUrl);
        
        setImageFiles(prev => prev.map(i => {
          if (i.id === imgState.id) {
            if (i.preview?.startsWith('blob:')) {
              URL.revokeObjectURL(i.preview);
            }
            return { ...i, uploading: false, uploaded: true, url: publicUrl, preview: publicUrl, fileName: filePath, error: null, statusText: null, file: null };
          }
          return i;
        }));
        
        return { id: imgState.id, success: true, url: publicUrl };
      } catch (error) {
        localUploadErrors.push({ id: imgState.id, fileName: file.name, message: error.message });
        
        setImageFiles(prev => prev.map(i => {
          if (i.id === imgState.id) {
            if (i.preview?.startsWith('blob:')) {
              URL.revokeObjectURL(i.preview);
            }
            return { ...i, uploading: false, uploaded: false, error: error.message || 'Falha', statusText: null, file: null };
          }
          return i;
        }));
        
        return { id: imgState.id, success: false, error: error.message };
      }
    });

    await Promise.all(uploadPromises);
    if (localUploadErrors.length > 0) {
      const errorMsg = `Falha ao enviar ${localUploadErrors.length} imagem(ns).`;
      setUploadError(errorMsg);
      throw new Error(errorMsg);
    }
    return uploadedUrlsMap;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ message: '', type: '' });
    setUploadError('');

    if (!user) {
      setSubmitStatus({ message: 'Usuário não autenticado.', type: 'error' });
      setIsSubmitting(false);
      return;
    }
    
    const validImagesForSubmit = imageFiles.filter(img => !img.error);
    if (validImagesForSubmit.length === 0) {
      setSubmitStatus({ message: 'Adicione pelo menos uma imagem válida.', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    if (!formState.categoria_id) {
      setSubmitStatus({ message: 'Selecione uma categoria.', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    let finalImageUrls = [];
    try {
      const imagesToUploadNow = validImagesForSubmit.filter(img => !img.uploaded && img.file);
      let uploadedUrlsMap = new Map();
      
      if (imagesToUploadNow.length > 0) {
        setSubmitStatus({ message: `Enviando ${imagesToUploadNow.length} imagens...`, type: 'loading' });
        uploadedUrlsMap = await uploadAndCompressImages(imagesToUploadNow);
      }

      const successfullyProcessedImages = imageFiles
        .map(img => {
          if (uploadedUrlsMap.has(img.id)) {
            return { ...img, url: uploadedUrlsMap.get(img.id), preview: uploadedUrlsMap.get(img.id), uploaded: true, uploading: false, error: null, statusText: null, file: null };
          }
          return img;
        })
        .filter(img => !img.error && img.url);

      if (successfullyProcessedImages.length === 0) {
        throw new Error("Nenhuma imagem válida restou após o processamento.");
      }

      const mainImageUrl = successfullyProcessedImages[mainImageIndex]?.url;
      if (!mainImageUrl) {
        throw new Error("Erro crítico: URL da imagem principal não encontrada.");
      }
      
      const additionalImageUrls = successfullyProcessedImages
        .filter(img => img.url !== mainImageUrl)
        .map(img => img.url);
      finalImageUrls = [mainImageUrl, ...additionalImageUrls];

      setSubmitStatus({ message: 'Salvando informações...', type: 'loading' });
      const negocioData = {
        nome: formState.nome,
        proprietario: formState.proprietario,
        categoria_id: formState.categoria_id,
        descricao: formState.descricao || null,
        endereco: formState.endereco || null,
        cidade: formState.cidade,
        telefone: formState.telefone || null,
        whatsapp: formState.whatsapp || null,
        website: formState.website || null,
        imagens: finalImageUrls,
        usuario_id: selectedOwnerId || null,
        ativo: false,
        email_proprietario: formState.email_proprietario || null,
        criado_por_admin: true,
        admin_criador_id: user.id
      };

      const { data: insertedNegocio, error: insertNegocioError } = await supabase
        .from('negocios')
        .insert([negocioData])
        .select('id')
        .single();
      
      if (insertNegocioError) throw insertNegocioError;
      
      const newNegocioId = insertedNegocio.id;

      if (selectedCaracteristicas.length > 0) {
        const negocioCaracteristicasData = selectedCaracteristicas.map(caracteristicaId => ({
          negocio_id: newNegocioId,
          caracteristica_id: caracteristicaId
        }));
        
        const { error: insertCaracError } = await supabase
          .from('negocio_caracteristicas')
          .insert(negocioCaracteristicasData);
        
        if (insertCaracError) {
          console.error("Erro ao salvar características:", insertCaracError);
        }
      }

      const ownerMessage = selectedOwnerId 
        ? 'Negócio criado e transferido com sucesso!' 
        : 'Negócio criado com sucesso! Proprietário pode ser definido depois.';
      setSubmitStatus({ message: ownerMessage, type: 'success' });
      
      setFormState({
        nome: '', proprietario: '', categoria_id: '', descricao: '', endereco: '', cidade: '',
        telefone: '', whatsapp: '', website: '', email_proprietario: ''
      });
      setImageFiles([]);
      setMainImageIndex(0);
      setSelectedCaracteristicas([]);
      setSelectedOwnerId('');
      
      setTimeout(() => {
        router.push('/admin/gerenciar-negocios');
      }, 3000);

    } catch (err) {
      console.error("Erro no processo de cadastro:", err);
      setSubmitStatus({ message: `Erro: ${uploadError || err.message || 'Verifique os dados.'}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCharacteristics = useMemo(() => {
    const selectedCategoryId = formState.categoria_id;
    if (!selectedCategoryId || allCharacteristics.length === 0 || caracteristicaCategoriaRelations.length === 0) {
      return [];
    }

    const relevantCaracteristicaIds = caracteristicaCategoriaRelations
      .filter(rel => rel.categoria_id === selectedCategoryId)
      .map(rel => rel.caracteristica_id);

    return allCharacteristics.filter(char =>
      relevantCaracteristicaIds.includes(char.id)
    );
  }, [formState.categoria_id, allCharacteristics, caracteristicaCategoriaRelations]);

  const getModalMessage = () => {
    if (isSubmitting) {
      if (submitStatus.type === 'loading' && submitStatus.message) {
        return submitStatus.message;
      }
      return 'Salvando alterações, por favor aguarde...';
    }
    if (submitStatus.type === 'success' && submitStatus.message) {
      return submitStatus.message;
    }
    return 'Processando...';
  };

  useEffect(() => {
    const filesToClean = [...imageFiles];
    return () => {
      filesToClean.forEach(img => {
        if (img.preview?.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, []);

  if (loadingPage) {
    return <div className="text-center p-10">Carregando painel administrativo...</div>;
  }

  if (!isAdmin) {
    return <div className="text-center p-10">Acesso negado.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 bg-white shadow-lg rounded-lg my-10 mt-25 relative">
      <LoadingModal
        isOpen={isSubmitting || (submitStatus.type === 'success' && !!submitStatus.message)}
        message={getModalMessage()}
      />

      {/* Cabeçalho com Título e Botão Cancelar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-3 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Cadastrar Novo Estabelecimento</h1>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="button-secondary bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
      </div>

      {/* Mensagens de status */}
      {submitStatus.message && (
        <div className={`p-4 mb-6 rounded-md text-center ${
          submitStatus.type === 'success' ? 'bg-green-100 text-green-800' : 
          submitStatus.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {submitStatus.message}
        </div>
      )}
      {uploadError && !isSubmitting && (
        <div className="p-4 mb-6 rounded-md text-center bg-red-100 text-red-800">
          Erro no upload: {uploadError}
        </div>
      )}

      {loadingInitialData ? (
        <div className="text-center p-10">Carregando opções do formulário...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seção 1: Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="nome" className="block text-base font-semibold text-gray-700 mb-2">
                Nome do Estabelecimento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nome"
                id="nome"
                value={formState.nome}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                placeholder="Nome visível ao público"
                className="block w-full px-4 py-3 text-lg text-gray-900 bg-white border-2 border-green-300 rounded-xl shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition disabled:bg-gray-100 disabled:opacity-70"
              />
            </div>
            <div>
              <label htmlFor="proprietario" className="block text-base font-semibold text-gray-700 mb-2">
                Nome do Proprietário <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="proprietario"
                id="proprietario"
                value={formState.proprietario}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                placeholder="Seu nome completo (será usado em todos os seus negócios)"
                className="block w-full px-4 py-3 text-lg text-gray-900 bg-white border-2 border-green-300 rounded-xl shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition disabled:bg-gray-100 disabled:opacity-70"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="categoria_id" className="block text-base font-semibold text-gray-700 mb-2">
                Categoria <span className="text-red-500">*</span>
              </label>
              <select
                id="categoria_id"
                name="categoria_id"
                value={formState.categoria_id}
                onChange={handleChange}
                required
                className="block w-full px-4 py-3 text-lg text-gray-900 bg-white border-2 border-green-300 rounded-xl shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition disabled:bg-gray-100 disabled:opacity-70"
                disabled={isSubmitting || categorias.length === 0}
              >
                <option value="" disabled className="text-gray-400">-- Selecione o tipo --</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
              {categorias.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Nenhuma categoria encontrada.</p>
              )}
            </div>
          </div>

          <div className="mt-8">
            <label htmlFor="descricao" className="block text-base font-semibold text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              name="descricao"
              id="descricao"
              rows={4}
              value={formState.descricao}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="Descreva o local, serviços, diferenciais..."
              className="block w-full px-4 py-3 text-lg text-gray-900 bg-white border-2 border-green-300 rounded-xl shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition resize-none disabled:bg-gray-100 disabled:opacity-70"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div>
              <label htmlFor="estado" className="block text-base font-semibold text-gray-700 mb-2">
                Estado <span className="text-red-500">*</span>
              </label>
              <select
                id="estado"
                name="estado"
                value={estadoSelecionado}
                onChange={e => {
                  console.log('🌎 Estado selecionado:', e.target.value);
                  setEstadoSelecionado(e.target.value);
                }}
                required
                disabled={isSubmitting}
                className="block w-full px-4 py-3 text-lg text-gray-900 bg-white border-2 border-green-300 rounded-xl shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition disabled:bg-gray-100 disabled:opacity-70"
              >
                <option value="">Selecione o estado</option>
                {estados.map(est => (
                  <option key={est.id} value={est.id}>{est.nome}</option>
                ))}
              </select>
              {estados.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Carregando estados...</p>
              )}
            </div>
            <div>
              <label htmlFor="cidade" className="block text-base font-semibold text-gray-700 mb-2">
                Cidade <span className="text-red-500">*</span>
              </label>
              <select
                id="cidade"
                name="cidade"
                value={formState.cidade}
                onChange={e => {
                  console.log('🏙️ Cidade selecionada:', e.target.value);
                  setFormState(prev => ({ ...prev, cidade: e.target.value }));
                }}
                required
                disabled={isSubmitting || !estadoSelecionado}
                className="block w-full px-4 py-3 text-lg text-gray-900 bg-white border-2 border-green-300 rounded-xl shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition disabled:bg-gray-100 disabled:opacity-70"
              >
                <option value="">Selecione a cidade</option>
                {cidades.map(cidade => (
                  <option key={cidade.id} value={cidade.nome}>{cidade.nome}</option>
                ))}
              </select>
              {!estadoSelecionado && (
                <p className="text-xs text-gray-500 mt-1">Selecione um estado primeiro</p>
              )}
              {estadoSelecionado && cidades.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">Carregando cidades...</p>
              )}
            </div>
            <div>
              <label htmlFor="endereco" className="block text-base font-semibold text-gray-700 mb-2">
                Endereço (Rua, Número, Bairro)
              </label>
              <input
                type="text"
                name="endereco"
                id="endereco"
                value={formState.endereco}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="Rua, Número, Bairro, Complemento"
                className="block w-full px-4 py-3 text-lg text-gray-900 bg-white border-2 border-green-300 rounded-xl shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition disabled:bg-gray-100 disabled:opacity-70"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div>
              <label htmlFor="telefone" className="block text-base font-semibold text-gray-700 mb-2">
                Telefone Fixo <span className="text-gray-400">(Opcional)</span>
              </label>
              <input
                type="tel"
                name="telefone"
                id="telefone"
                value={formState.telefone}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="(XX) XXXX-XXXX"
                className="block w-full px-4 py-3 text-lg text-gray-900 bg-white border-2 border-green-300 rounded-xl shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition disabled:bg-gray-100 disabled:opacity-70"
              />
            </div>
            <div>
              <label htmlFor="whatsapp" className="block text-base font-semibold text-gray-700 mb-2">
                WhatsApp <span className="text-gray-400">(Opcional, com DDD)</span>
              </label>
              <input
                type="tel"
                name="whatsapp"
                id="whatsapp"
                value={formState.whatsapp}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="55XX9XXXXXXXX"
                className="block w-full px-4 py-3 text-lg text-gray-900 bg-white border-2 border-green-300 rounded-xl shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition disabled:bg-gray-100 disabled:opacity-70"
              />
            </div>
            <div>
              <label htmlFor="email_proprietario" className="block text-base font-semibold text-gray-700 mb-2">
                Email do Proprietário <span className="text-gray-400">(Opcional)</span>
              </label>
              <input
                type="email"
                name="email_proprietario"
                id="email_proprietario"
                value={formState.email_proprietario}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="email@exemplo.com"
                className="block w-full px-4 py-3 text-lg text-gray-900 bg-white border-2 border-green-300 rounded-xl shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition disabled:bg-gray-100 disabled:opacity-70"
              />
            </div>
          </div>

          <div className="mt-8">
            <label htmlFor="website" className="block text-base font-semibold text-gray-700 mb-2">
              Website ou Rede Social <span className="text-gray-400">(Opcional)</span>
            </label>
            <input
              type="url"
              name="website"
              id="website"
              value={formState.website}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="https://..."
              className="block w-full px-4 py-3 text-lg text-gray-900 bg-white border-2 border-green-300 rounded-xl shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 transition disabled:bg-gray-100 disabled:opacity-70"
            />
          </div>

          {/* Seção de Imagens */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Imagens (máx. {MAX_IMAGES_PER_BUSINESS}, a primeira será a principal) <span className="text-red-500">*</span>
            </label>
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
            {imageFiles.length === 0 && !isSubmitting && (
              <p className="text-sm text-red-600 text-center">É necessário adicionar pelo menos uma imagem.</p>
            )}
            {imageFiles.length > 0 && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {imageFiles.map((img, index) => (
                  <div key={img.id} className="relative group rounded-md overflow-hidden aspect-square flex items-center justify-center bg-gray-100" style={{ border: 'none' }}>
                    <img
                      src={img.url || img.preview}
                      alt={`Imagem ${index + 1}`}
                      className="object-cover w-full h-full bg-white"
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/150?text=Erro+na+imagem';
                      }}
                    />
                    {/* Botões de ação */}
                    {!img.uploading && !img.error && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.id)}
                          disabled={isSubmitting}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                          aria-label="Remover imagem"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        {mainImageIndex !== index && (
                          <button
                            type="button"
                            onClick={() => handleSetMainImage(img.id)}
                            disabled={isSubmitting}
                            className="text-white text-xs bg-green-600 px-2 py-1 rounded shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                          >
                            Tornar Principal
                          </button>
                        )}
                      </div>
                    )}
                    {/* Badge Principal */}
                    {mainImageIndex === index && !img.uploading && !img.error && (
                      <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded shadow z-10">
                        Principal
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção de Características */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Características Oferecidas {formState.categoria_id && categorias.find(c=>c.id === formState.categoria_id) ? `(para ${categorias.find(c=>c.id === formState.categoria_id).nome})` : ''}
            </label>
            {formState.categoria_id ? (
              <>
                {loadingInitialData && <p className="text-sm text-gray-500">Carregando características...</p>}
                {!loadingInitialData && filteredCharacteristics.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-3 border p-4 rounded-md bg-gray-50">
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
                {!loadingInitialData && filteredCharacteristics.length === 0 && allCharacteristics.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1 p-4 border rounded-md bg-gray-50 text-center">
                    Nenhuma característica específica encontrada para esta categoria.
                  </p>
                )}
                {!loadingInitialData && allCharacteristics.length === 0 && (
                  <p className="text-sm text-yellow-600 mt-1 p-4 border border-yellow-200 rounded-md bg-yellow-50 text-center">
                    Nenhuma característica cadastrada no sistema ainda.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-yellow-600 mt-1 p-4 border border-yellow-200 rounded-md bg-yellow-50 text-center">
                Selecione uma categoria acima para ver as características disponíveis.
              </p>
            )}
          </div>

          {/* Botão de Submit */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting || loadingInitialData || imageFiles.some(img => img.uploading) || imageFiles.filter(img => !img.error && (img.file || img.url)).length === 0}
              className="w-full button-primary flex items-center justify-center py-3"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4zm16 0a8 8 0 01-8 8v-8h8z"></path>
                  </svg>
                  {submitStatus.type === 'success' ? 'Negócio Cadastrado!' : 'Cadastrar Negócio'}
                </>
              ) : (
                'Cadastrar Negócio'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

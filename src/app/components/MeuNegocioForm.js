// src/app/components/MeuNegocioForm.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";
import imageCompression from "browser-image-compression"; // Minha biblioteca para compressão de imagem.

// Função para gerar nomes de arquivo únicos.
const generateUniqueFileName = (file) => {
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "file"; // Garanto uma extensão, nem que seja 'file'.
  // Gero um nome único e limpo caracteres inválidos do nome original.
  const safeBaseName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "_");
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
  const [submitStatus, setSubmitStatus] = useState({ message: "", type: "" });
  const [userEmail, setUserEmail] = useState("");

  // Estados para os campos do formulário.
  const [nomeNegocio, setNomeNegocio] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [selectedCategoria, setSelectedCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [caracteristicas, setCaracteristicas] = useState([]);
  const [selectedCaracteristicas, setSelectedCaracteristicas] = useState([]);

  // Estados para o upload de imagens.
  // Estrutura: { id, file?, preview, uploading, uploaded, error, url?, fileName?, isExisting: false, statusText? }
  const [imageFiles, setImageFiles] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0); // Índice da imagem principal no array imageFiles.
  const [uploadError, setUploadError] = useState(""); // Erro geral do upload.

  // Efeito para buscar categorias e características.
  useEffect(() => {
    const fetchData = async () => {
      setLoadingCategories(true);
      setLoadingCaracteristicas(true);
      setErrorCategories(null);
      setErrorCaracteristicas(null);
      try {
        const { data: catData, error: catErr } = await supabase
          .from("categorias")
          .select("id, nome")
          .order("nome");
        if (catErr) throw catErr;
        setCategorias(catData || []);
        setSelectedCategoria("");
      } catch (err) {
        console.error("Erro ao buscar categorias:", err);
        setErrorCategories("Falha ao carregar categorias.");
      } finally {
        setLoadingCategories(false);
      }
      try {
        const { data: caracData, error: caracErr } = await supabase
          .from("caracteristicas")
          .select("id, nome")
          .order("nome");
        if (caracErr) throw caracErr;
        setCaracteristicas(caracData || []);
      } catch (err) {
        console.error("Erro ao buscar características:", err);
        setErrorCaracteristicas("Falha ao carregar características.");
      } finally {
        setLoadingCaracteristicas(false);
      }
    };
    fetchData();
  }, []);

  // Carrega e-mail do usuário autenticado (para usar no e-mail de boas-vindas)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!cancelled && !error) {
          setUserEmail(data?.user?.email || "");
        }
      } catch (e) {
        console.warn(
          "Não foi possível obter o email do usuário autenticado:",
          e
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Handler para quando seleciono arquivos de imagem.
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    console.log("Arquivos selecionados (MeuNegocioForm):", selectedFiles);
    setUploadError("");
    setSubmitStatus({ message: "", type: "" }); // Limpo o status ao adicionar novas imagens.

    const newFilesToAdd = selectedFiles.slice(0, 5 - imageFiles.length); // Limite de 5 imagens

    const newImageObjects = newFilesToAdd.map((file) => {
      const id = uuidv4();
      const originalFileName = generateUniqueFileName(file); // Gero o nome baseado no original.
      const blobURL = URL.createObjectURL(file);

      console.log(
        `Processando arquivo (MeuNegocioForm): Nome: ${file.name}, Tipo: ${file.type}, BlobURL: ${blobURL}`
      );

      return {
        id,
        file,
        preview: blobURL,
        uploading: false,
        uploaded: false,
        error: null,
        url: null,
        fileName: originalFileName,
        isExisting: false,
        statusText: null,
      };
    });

    setImageFiles((prevFiles) => {
      const updatedFiles = [...prevFiles, ...newImageObjects];
      if (
        prevFiles.length === 0 &&
        newImageObjects.length > 0 &&
        updatedFiles.length > 0
      ) {
        setMainImageIndex(0); // Define a primeira imagem como principal se a lista estava vazia
      }
      return updatedFiles;
    });

    event.target.value = ""; // Limpo o input de arquivo.
  };

  // Handler para remover uma imagem da lista.
  const handleRemoveImage = (idToRemove) => {
    const imageToRemove = imageFiles.find((img) => img.id === idToRemove);
    if (!imageToRemove) {
      console.warn(
        `Tentativa de remover imagem com ID não encontrado: ${idToRemove}`
      );
      return;
    }

    if (imageToRemove.preview && imageToRemove.preview.startsWith("blob:")) {
      URL.revokeObjectURL(imageToRemove.preview);
      console.log(
        `Blob URL revogada para imagem ID ${idToRemove}: ${imageToRemove.preview}`
      );
    }

    setImageFiles((prevFiles) => {
      const updatedFiles = prevFiles.filter((img) => img.id !== idToRemove);

      if (updatedFiles.length === 0) {
        setMainImageIndex(0);
      } else {
        // Se a imagem removida era a principal, ou se o índice da principal ficou fora dos limites
        const oldMainImageId = prevFiles[mainImageIndex]?.id;
        const newPotentialMainIndex = updatedFiles.findIndex(
          (img) => img.id === oldMainImageId
        );

        setMainImageIndex(
          newPotentialMainIndex !== -1 ? newPotentialMainIndex : 0
        );
      }
      return updatedFiles;
    });
    setSubmitStatus({ message: "", type: "" }); // Limpo o status.
    setUploadError("");
  };

  // Handler para definir qual imagem é a principal.
  const handleSetMainImage = (idToSetMain) => {
    const indexToSetMain = imageFiles.findIndex(
      (img) => img.id === idToSetMain
    );
    // Permito definir como principal mesmo se tiver erro, mas não se estiver carregando.
    if (indexToSetMain !== -1 && !imageFiles[indexToSetMain]?.uploading) {
      setMainImageIndex(indexToSetMain);
      setSubmitStatus({ message: "", type: "" }); // Limpo o status.
    } else if (imageFiles[indexToSetMain]?.uploading) {
      setSubmitStatus({
        message: "Aguarde o processamento da imagem.",
        type: "info",
      });
    }
  };

  // Handler para mudança na seleção de Características.
  const handleCaracteristicaChange = (caracteristicaId) => {
    setSelectedCaracteristicas((prev) =>
      prev.includes(caracteristicaId)
        ? prev.filter((id) => id !== caracteristicaId)
        : [...prev, caracteristicaId]
    );
  };

  // Minha função para fazer upload e compressão das imagens.
  const uploadAndCompressImages = async (filesToUpload) => {
    const uploadedUrlsMap = new Map(); // Mapeia o ID temporário da imagem para a URL final no Supabase.
    let localUploadErrors = []; // Erros específicos desta leva de uploads.

    const uploadPromises = filesToUpload.map(async (imgState) => {
      const file = imgState.file;
      if (!file)
        return { id: imgState.id, success: false, error: "Arquivo inválido" }; // Checagem de segurança.

      const webpFileName = `${imgState.fileName?.replace(/\.[^/.]+$/, "") || uuidv4()}.webp`;
      const filePath = `public/${userId}/${webpFileName}`; // Caminho no bucket do Supabase.

      setImageFiles((prev) =>
        prev.map((i) =>
          i.id === imgState.id
            ? { ...i, uploading: true, statusText: "Otimizando..." }
            : i
        )
      );
      console.log(`Iniciando compressão para: ${webpFileName}`);

      try {
        // Minhas opções de compressão.
        const options = {
          maxSizeMB: 0.8, // Tamanho máximo em MB.
          maxWidthOrHeight: 1920, // Dimensão máxima.
          useWebWorker: true, // Uso Web Worker para não travar a UI.
          fileType: "image/webp", // Converte para WebP.
          initialQuality: 0.85, // Qualidade inicial do WebP.
        };

        console.log(`Comprimindo ${file.name} para ${webpFileName}...`);
        const compressedFile = await imageCompression(file, options);
        console.log(
          `Compressão de ${webpFileName} concluída. Tamanho: ${(compressedFile.size / (1024 * 1024)).toFixed(2)} MB`
        );

        setImageFiles((prev) =>
          prev.map((i) =>
            i.id === imgState.id ? { ...i, statusText: "Enviando..." } : i
          )
        );
        console.log(`Enviando ${webpFileName} para Supabase Storage...`);

        const { error: uploadError } = await supabase.storage
          .from("imagens") // Meu bucket correto.
          .upload(filePath, compressedFile, {
            contentType: "image/webp",
            upsert: false,
          }); // Não quero sobrescrever se já existir.

        if (uploadError) {
          console.error(
            `Erro no upload para Supabase (${webpFileName}):`,
            uploadError
          );
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("imagens") // Meu bucket correto.
          .getPublicUrl(filePath);

        if (!publicUrl) {
          console.error(
            `Não foi possível obter URL pública para ${webpFileName}`
          );
          throw new Error("URL pública não encontrada.");
        }

        console.log(`Upload de ${webpFileName} concluído. URL: ${publicUrl}`);
        uploadedUrlsMap.set(imgState.id, publicUrl);

        setImageFiles((prev) =>
          prev.map((i) =>
            i.id === imgState.id
              ? {
                  ...i,
                  uploading: false,
                  uploaded: true,
                  url: publicUrl,
                  fileName: filePath,
                  error: null,
                  statusText: null,
                }
              : i
          )
        );

        return { id: imgState.id, success: true, url: publicUrl };
      } catch (error) {
        console.error(
          `Erro no processo de ${file.name} -> ${webpFileName}:`,
          error
        );
        localUploadErrors.push({
          id: imgState.id,
          fileName: file.name,
          message: error.message,
        });
        setImageFiles((prev) =>
          prev.map((i) =>
            i.id === imgState.id
              ? {
                  ...i,
                  uploading: false,
                  uploaded: false,
                  error: error.message || "Falha",
                  statusText: null,
                }
              : i
          )
        );
        return { id: imgState.id, success: false, error: error.message };
      }
    });

    await Promise.all(uploadPromises);

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
    setSubmitStatus({ message: "", type: "" });
    setUploadError("");

    // Validações básicas.
    if (!userId) {
      setSubmitStatus({ message: "Usuário não identificado.", type: "error" });
      setIsSubmitting(false);
      return;
    }

    const validImagesForUpload = imageFiles.filter((img) => !img.error);
    if (validImagesForUpload.length === 0) {
      setSubmitStatus({
        message: "Adicione pelo menos uma imagem válida.",
        type: "error",
      });
      setIsSubmitting(false);
      return;
    }

    // Verifico se a imagem principal definida é válida (não tem erro e não está carregando).
    let currentMainIndex = mainImageIndex;
    if (
      validImagesForUpload[currentMainIndex]?.error ||
      validImagesForUpload[currentMainIndex]?.uploading
    ) {
      // Se a principal atual for inválida, tento achar a primeira válida.
      const firstValidIndex = imageFiles.findIndex(
        (img) => !img.error && !img.uploading
      );
      if (firstValidIndex === -1) {
        // Se não houver nenhuma válida, mostro erro.
        setSubmitStatus({
          message:
            "Nenhuma imagem válida disponível. Verifique os erros ou aguarde o envio.",
          type: "error",
        });
        setIsSubmitting(false);
        return;
      }
      // Se achei uma válida, aviso e atualizo o índice.
      // setSubmitStatus({ message: 'Imagem principal inválida, selecionando a primeira válida.', type: 'warning' }); // Pode ser verboso
      setMainImageIndex(firstValidIndex);
      currentMainIndex = firstValidIndex;
    }

    let finalImageUrls = [];
    try {
      // 1. Faço upload das imagens que ainda não foram enviadas.
      const imagesParaUpload = validImagesForUpload.filter(
        (img) => !img.uploaded && img.file
      );
      let uploadedUrlsMap = new Map();

      if (imagesParaUpload.length > 0) {
        setSubmitStatus({
          message: `Otimizando e enviando ${imagesParaUpload.length} imagens...`,
          type: "loading",
        });
        uploadedUrlsMap = await uploadAndCompressImages(imagesParaUpload);
      }

      // 2. Consolido todas as URLs válidas (as que acabaram de ser upadas e as que já estavam).
      // E também filtro as que tiveram erro no processo
      const successfullyProcessedImages = imageFiles
        .map((img) => {
          if (uploadedUrlsMap.has(img.id)) {
            return {
              ...img,
              url: uploadedUrlsMap.get(img.id),
              uploaded: true,
              uploading: false,
              error: null,
              statusText: null,
            };
          }
          return img; // Senão, mantenho o estado existente.
        })
        .filter((img) => !img.error && img.url); // Apenas imagens sem erro e com URL

      if (successfullyProcessedImages.length === 0) {
        throw new Error("Nenhuma imagem foi processada com sucesso.");
      }
      setImageFiles(successfullyProcessedImages); // Atualizo o estado com as imagens processadas com sucesso.

      // Revalido o índice da imagem principal com base nas imagens que restaram
      const finalMainImageCandidate =
        successfullyProcessedImages[currentMainIndex] ||
        successfullyProcessedImages[0];
      const mainImageUrl = finalMainImageCandidate?.url;

      if (!mainImageUrl) {
        throw new Error("Erro crítico ao obter URL da imagem principal.");
      }

      const additionalImageUrls = successfullyProcessedImages
        .filter((img) => img.url !== mainImageUrl) // Exclui a principal
        .map((img) => img.url);

      // Monto o array final de imagens para o banco: [principal, ...adicionais].
      finalImageUrls = [mainImageUrl, ...additionalImageUrls];

      // 3. Preparo os dados do negócio.
      setSubmitStatus({ message: "Salvando informações...", type: "loading" });
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
        ativo: false, // Negócios começam inativos, precisam de aprovação/pagamento.
      };

      // 4. Insiro os dados do negócio no banco.
      const { data: insertedNegocio, error: insertNegocioError } =
        await supabase.from("negocios").insert([negocioData]).select().single();

      if (insertNegocioError) throw insertNegocioError;

      // 5. Insiro as Características selecionadas.
      if (selectedCaracteristicas.length > 0) {
        const negocioCaracteristicasData = selectedCaracteristicas.map(
          (caracteristicaId) => ({
            negocio_id: insertedNegocio.id,
            caracteristica_id: caracteristicaId,
          })
        );
        const { error: insertCaracError } = await supabase
          .from("negocio_caracteristicas")
          .insert(negocioCaracteristicasData);
        if (insertCaracError) {
          console.error(
            "Erro ao salvar características associadas:",
            insertCaracError
          );
          // Lembrete: Decidir como tratar esse erro (talvez mostrar um aviso, mas o negócio principal foi criado).
        }
      }

      // Sucesso geral!
      setSubmitStatus({
        message: "Negócio cadastrado com sucesso!",
        type: "success",
      });
      // Limpo o formulário.
      setNomeNegocio("");
      setSelectedCategoria("");
      setDescricao("");
      setEndereco("");
      setCidade("");
      setTelefone("");
      setWhatsapp("");
      setWebsite("");
      setImageFiles([]);
      setMainImageIndex(0);
      setSelectedCaracteristicas([]);

      if (onCadastroSucesso) {
        onCadastroSucesso(insertedNegocio); // Chamo a callback do componente pai.
      }
      console.log(
        "Cadastro de negócio concluído com sucesso:",
        insertedNegocio
      );

      // Dispara e-mails (dono e cliente) via Resend
      try {
        await fetch("/api/negocios/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: "", // se você tiver o nome do responsável, preencha aqui
            email: userEmail || insertedNegocio?.email || "",
            nomeNegocio: insertedNegocio?.nome || nomeNegocio,
            cidade: insertedNegocio?.cidade || cidade,
            telefone: insertedNegocio?.telefone || telefone,
            whatsapp: insertedNegocio?.whatsapp || whatsapp,
            website: insertedNegocio?.website || website,
          }),
        });
      } catch (e) {
        console.warn("Falha ao acionar email de boas-vindas (ignorado):", e);
      }
    } catch (err) {
      console.error("Erro no processo de cadastro:", err);
      // Mostro o erro de upload específico se houver, senão o erro geral.
      setSubmitStatus({
        message: `Erro: ${uploadError || err.message || "Verifique os dados."}`,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Limpo as URLs de preview quando o componente desmonta para evitar memory leaks.
  useEffect(() => {
    return () => {
      imageFiles.forEach((img) => {
        if (img.preview?.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
          console.log(
            `Blob URL revogada (desmontagem/limpeza) para imagem ID ${img.id}: ${img.preview}`
          );
        }
      });
    };
  }, [imageFiles]);

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 bg-white shadow-lg rounded-lg my-10 relative">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 border-b pb-3">
        Cadastrar Meu Negócio
      </h1>

      {/* Minhas mensagens de Status e Erro. */}
      {submitStatus.message && (
        <div
          className={`p-4 mb-4 rounded-md text-center ${submitStatus.type === "success" ? "bg-green-100 text-green-800" : submitStatus.type === "error" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}
        >
          {" "}
          {submitStatus.message}{" "}
        </div>
      )}
      {uploadError && !isSubmitting && (
        <div className="p-4 mb-4 rounded-md text-center bg-red-100 text-red-800">
          {" "}
          Erro no upload: {uploadError}{" "}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Seção 1: Informações Básicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="nome"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="nome"
              value={nomeNegocio}
              onChange={(e) => setNomeNegocio(e.target.value)}
              required
              className="input-form"
              placeholder="Nome do Estabelecimento"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label
              htmlFor="categoria"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Categoria <span className="text-red-500">*</span>
            </label>
            {loadingCategories && (
              <p className="text-sm text-gray-500">Carregando...</p>
            )}
            {errorCategories && (
              <p className="text-sm text-red-500">{errorCategories}</p>
            )}
            {!loadingCategories && !errorCategories && (
              <select
                id="categoria"
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                required
                className="input-form bg-white"
                disabled={
                  categorias.length === 0 || isSubmitting || !!errorCategories
                }
              >
                <option value="" disabled>
                  -- Selecione --
                </option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            )}
            {categorias.length === 0 &&
              !loadingCategories &&
              !errorCategories && (
                <p className="text-sm text-yellow-600 mt-1">
                  Nenhuma categoria encontrada.
                </p>
              )}
          </div>
        </div>
        {/* Seção 2: Descrição */}
        <div>
          <label
            htmlFor="descricao"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Descrição
          </label>
          <textarea
            id="descricao"
            rows={4}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="input-form"
            placeholder="Descreva o local, seus atrativos..."
            disabled={isSubmitting}
          />
        </div>
        {/* Seção 3: Localização */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="endereco"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Endereço Completo
            </label>
            <input
              type="text"
              id="endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className="input-form"
              placeholder="Ex: Rua das Flores, 123"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label
              htmlFor="cidade"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Cidade <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              required
              className="input-form"
              placeholder="Ex: Gramado"
              disabled={isSubmitting}
            />
          </div>
        </div>
        {/* Seção 4: Contato */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="telefone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Telefone
            </label>
            <input
              type="tel"
              id="telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="input-form"
              placeholder="(XX) XXXX-XXXX"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label
              htmlFor="whatsapp"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              WhatsApp (com DDD)
            </label>
            <input
              type="tel"
              id="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="input-form"
              placeholder="55XX9XXXXXXXX"
              disabled={isSubmitting}
            />
          </div>
        </div>
        {/* Seção 5: Website */}
        <div>
          <label
            htmlFor="website"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Website / Rede Social
          </label>
          <input
            type="url"
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="input-form"
            placeholder="https://..."
            disabled={isSubmitting}
          />
        </div>

        {/* Seção 6: Upload de Imagens */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Imagens (máx. 5, a primeira será a principal)
          </label>
          <div className="mb-4 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 48 48"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                />
              </svg>
              <div className="flex text-sm text-gray-600 justify-center">
                <label
                  htmlFor="file-upload"
                  className={`relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500 ${isSubmitting || imageFiles.length >= 5 ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span>Adicionar imagens</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    multiple
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileChange}
                    disabled={isSubmitting || imageFiles.length >= 5}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">
                PNG, JPG, WEBP. Máximo de 5 fotos.
              </p>
            </div>
          </div>
          {/* Previews das imagens com status e botões. */}
          {imageFiles.length > 0 && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {imageFiles.map((imgState, index) => (
                <div
                  key={imgState.id}
                  className="relative group border rounded-md overflow-hidden aspect-square flex items-center justify-center bg-slate-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgState.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-contain" // object-contain para ver a imagem inteira, mesmo que com barras. object-cover cortaria.
                    onError={(e) => {
                      console.error(
                        `Falha ao carregar imagem no SRC (MeuNegocioForm). SRC: ${img.preview}`,
                        e.target.error
                      ); // LOG MAIS DETALHADO
                      e.target.onerror = null; // Previne loop de erro
                      e.target.src =
                        "https://via.placeholder.com/150?text=ERRO_IMG_FORM"; // Placeholder diferente
                    }}
                  />
                  {/* Overlay para Ações, Erros, Loading e Status. */}
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 p-1 text-white text-center ${imgState.uploading || imgState.error ? "bg-black bg-opacity-70" : "bg-black bg-opacity-0 group-hover:bg-opacity-60"}`}
                  >
                    {/* Indicador de Uploading. */}
                    {imgState.uploading && (
                      <div className="flex flex-col items-center">
                        {/* Adicionado: Texto de status/nome do arquivo */}
                        <div className="absolute bottom-1 left-1 right-1 text-xs text-gray-300 truncate">
                          {imgState.fileName
                            ? imgState.fileName.substring(0, 20) + "..."
                            : "Arquivo"}
                          {imgState.uploading &&
                            ` (${imgState.statusText || "Processando..."})`}
                          {imgState.error && ` (Erro)`}
                        </div>
                        <div
                          className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-1"
                          title={imgState.statusText || "Processando..."}
                        ></div>
                        <p className="text-xs">
                          {imgState.statusText || "Processando..."}
                        </p>
                      </div>
                    )}
                    {/* Indicador de Erro. */}
                    {imgState.error && !imgState.uploading && (
                      <div
                        className="p-1"
                        title={
                          typeof imgState.error === "string"
                            ? imgState.error
                            : "Erro"
                        }
                      >
                        <svg
                          className="h-6 w-6 text-red-500 mx-auto mb-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p className="text-xs text-red-300 truncate">
                          {typeof imgState.error === "string"
                            ? imgState.error.substring(0, 30)
                            : "Erro"}
                        </p>
                      </div>
                    )}
                    {/* Botões (Aparecem no Hover se não estiver carregando/erro). */}
                    {!imgState.uploading && !imgState.error && (
                      <div
                        className={`absolute inset-0 flex flex-col items-center justify-center space-y-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                      >
                        {/* Botão Remover. */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(imgState.id)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 z-10"
                          aria-label="Remover imagem"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                        {/* Botão Definir Principal (só aparece se não for a principal). */}
                        {mainImageIndex !== index && (
                          <button
                            type="button"
                            onClick={() => handleSetMainImage(imgState.id)}
                            className="text-white text-xs bg-green-600 px-2 py-1 rounded shadow-md hover:bg-green-700 z-10"
                          >
                            Principal
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Badge "Principal". */}
                  {mainImageIndex === index &&
                    !imgState.uploading &&
                    !imgState.error && (
                      <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded shadow z-10">
                        Principal
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seção 7: Características */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Características Oferecidas
          </label>
          {loadingCaracteristicas && (
            <p className="text-sm text-gray-500">Carregando...</p>
          )}
          {errorCaracteristicas && (
            <p className="text-sm text-red-500">{errorCaracteristicas}</p>
          )}
          {!loadingCaracteristicas &&
            !errorCaracteristicas &&
            caracteristicas.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-3">
                {caracteristicas.map((item) => (
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
                    <label
                      htmlFor={`caracteristica-${item.id}`}
                      className="ml-2 block text-sm text-gray-900 cursor-pointer"
                    >
                      {item.nome}
                    </label>
                  </div>
                ))}
              </div>
            )}
          {!loadingCaracteristicas &&
            !errorCaracteristicas &&
            caracteristicas.length === 0 && (
              <p className="text-sm text-yellow-600 mt-1">
                Nenhuma característica encontrada.
              </p>
            )}
        </div>

        {/* Botão de Submit */}
        <div className="pt-6">
          <button
            type="submit"
            disabled={
              isSubmitting ||
              loadingCategories ||
              loadingCaracteristicas ||
              !!errorCategories ||
              !!errorCaracteristicas ||
              imageFiles.some((img) => img.uploading) ||
              imageFiles.filter((img) => !img.error).length === 0
            }
            className="w-full button-primary flex items-center justify-center py-3"
          >
            {isSubmitting ? (
              <>
                {" "}
                {/* Meu Ícone Spinner. */}
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processando...
              </>
            ) : (
              "Cadastrar Estabelecimento"
            )}
          </button>
        </div>
      </form>

      {/* Meus estilos CSS Globais para esta página. */}
      <style jsx global>{`
        .input-form {
          display: block;
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          color: #000;
        }
        .input-form:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.5);
        }
        .input-form:disabled {
          background-color: #f3f4f6;
          opacity: 0.7;
          cursor: not-allowed;
        }
        .button-primary {
          background-color: #059669;
          color: white;
          font-weight: bold;
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          transition: background-color 0.3s;
        }
        .button-primary:hover:not(:disabled) {
          background-color: #047857;
        }
        .button-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

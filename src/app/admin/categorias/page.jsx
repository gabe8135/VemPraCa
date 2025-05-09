'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { FaEdit, FaTrash } from 'react-icons/fa';

// Minha função para gerar slugs a partir de um texto.
// Preciso dela para criar URLs amigáveis para as categorias.
function generateSlug(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Tiro os acentos aqui.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-') // Espaços viram hífens.
    .replace(/[^\w-]+/g, '') // Removo caracteres que não são letras, números ou hífen.
    .replace(/--+/g, '-') // Garanto que não haja hífens duplicados.
    .replace(/^-+/, '') // Tiro hífens do começo.
    .replace(/-+$/, ''); // E do fim.
}

// Este é o modal para editar uma categoria.
function EditCategoryModal({ isOpen, onClose, category, onSave }) {
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Quando a categoria para edição mudar, atualizo o nome no input.
  useEffect(() => {
    if (category) {
      setEditedName(category.nome || '');
      setError(''); // Limpo erros anteriores.
    }
  }, [category]);

  const handleSave = async () => {
    if (!editedName.trim()) {
      setError('O nome não pode ficar em branco.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      // Chamo a função onSave que veio por prop, passando o ID e o novo nome.
      // Essa onSave lá no componente principal vai cuidar de gerar o slug e salvar.
      await onSave(category.id, editedName.trim());
      onClose(); // Fecho o modal se tudo der certo.
    } catch (err) {
      console.error("Erro ao salvar categoria:", err);
      // Preciso tratar o erro de slug duplicado que pode vir da função onSave.
      if (err.message?.includes('duplicate key value violates unique constraint')) {
          setError('Já existe uma categoria com um nome ou slug similar.');
      } else {
          setError(err.message || 'Falha ao salvar. Tente novamente.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !category) return null; // Não mostro nada se não for pra estar aberto ou se não tiver categoria.

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md backdrop-saturate-150 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Editar Categoria</h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <div className="mb-4">
          <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-1">
            Nome da Categoria
          </label>
          <input
            type="text"
            id="categoryName"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="input-form" // Meu estilo padrão de input.
            disabled={isSaving}
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {/* Ícone de loading enquanto salva. */}
            {isSaving && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            )}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCategoriasPage() {
  const [categorias, setCategorias] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState(''); // Para o input de nova categoria.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false); // Controla o estado de "adicionando".
  const [isModalOpen, setIsModalOpen] = useState(false); // Para o modal de edição.
  const [editingCategory, setEditingCategory] = useState(null); // Qual categoria estou editando.

  // Função para buscar as categorias no Supabase.
  const fetchCategorias = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('categorias')
        .select('id, nome, slug') // Pego o slug também, importante para a tabela.
        .order('nome', { ascending: true }); // Ordeno por nome.
      if (fetchError) throw fetchError;
      setCategorias(data || []);
    } catch (err) {
      console.error("Erro ao buscar categorias:", err);
      setError('Falha ao carregar categorias.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Busco as categorias quando o componente monta.
  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  // Lógica para adicionar uma nova categoria.
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return; // Não faço nada se o nome estiver vazio.
    setIsAdding(true);
    setError('');

    // Gero o slug a partir do nome que o usuário digitou.
    const slug = generateSlug(newCategoryName.trim());

    if (!slug) {
        // Se o slug não puder ser gerado (nome muito estranho?), mostro um erro.
        setError('Não foi possível gerar um slug válido para o nome fornecido.');
        setIsAdding(false);
        return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('categorias')
        .insert([{
            nome: newCategoryName.trim(),
            slug: slug // <<< Salvo o slug gerado no banco.
        }])
        .select() // Preciso do objeto inserido para atualizar o estado local.
        .single();

      if (insertError) throw insertError; // Se der erro no Supabase, ele vai ser pego no catch.

      // Adiciono a nova categoria à lista e reordeno.
      setCategorias(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNewCategoryName(''); // Limpo o input.
    } catch (err) {
      console.error("Erro ao adicionar categoria:", err);
      // Trato o erro de chave duplicada (nome ou slug já existem).
      if (err.message?.includes('duplicate key value violates unique constraint')) {
          setError('Já existe uma categoria com um nome ou slug similar.');
      } else {
          setError(err.message || 'Falha ao adicionar.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Para deletar uma categoria.
  const handleDeleteCategory = async (id) => {
    // Confirmação básica antes de deletar.
    if (!window.confirm('Tem certeza que deseja excluir esta categoria? Isso pode afetar negócios associados.')) {
      return;
    }
    setError('');
    try {
      const { error: deleteError } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
      // Removo a categoria da lista local.
      setCategorias(prev => prev.filter(cat => cat.id !== id));
    } catch (err) {
      console.error("Erro ao deletar categoria:", err);
      setError(err.message || 'Falha ao deletar.');
    }
  };

  // Funções para controlar o modal de edição.
  const handleEditClick = (category) => {
    setEditingCategory(category); // Defino qual categoria estou editando.
    setIsModalOpen(true); // Abro o modal.
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCategory(null); // Limpo a categoria em edição quando fecho.
  };

  // Esta é a função que o modal chama para salvar as alterações.
  const handleSaveChanges = async (id, newName) => {
    // Preciso gerar um novo slug se o nome mudou.
    const newSlug = generateSlug(newName);

    if (!newSlug) {
        // Se não conseguir gerar o slug, lanço um erro que o modal vai pegar e mostrar.
        throw new Error('Não foi possível gerar um slug válido para o novo nome.');
    }

    // Atualizo tanto o nome quanto o slug no banco.
    const { error: updateError } = await supabase
      .from('categorias')
      .update({
          nome: newName,
          slug: newSlug // <<< Atualizo o slug aqui também.
      })
      .eq('id', id);

    if (updateError) {
      throw updateError; // Se der erro no Supabase, o modal vai tratar.
    }

    // Atualizo a categoria na minha lista local.
    setCategorias(prev =>
      prev.map(cat =>
        cat.id === id ? { ...cat, nome: newName, slug: newSlug } : cat // <<< Não esquecer de atualizar o slug no estado local.
      ).sort((a, b) => a.nome.localeCompare(b.nome)) // Reordeno.
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Gerenciar Categorias</h1>

      {/* Formulário para adicionar nova categoria */}
      <form onSubmit={handleAddCategory} className="mb-8 p-4 border rounded-lg bg-gray-50 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-grow">
          <label htmlFor="newCategoryName" className="block text-sm font-medium text-gray-700 mb-1">
            Nova Categoria
          </label>
          <input
            type="text"
            id="newCategoryName"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nome da nova categoria"
            className="input-form" // Meu estilo padrão.
            disabled={isAdding}
          />
        </div>
        <button
          type="submit"
          disabled={isAdding || !newCategoryName.trim()} // Desabilito se estiver adicionando ou se o nome estiver vazio.
          className="button-primary px-5 py-2 w-full sm:w-auto" // Meu botão primário.
        >
          {isAdding ? 'Adicionando...' : 'Adicionar'}
        </button>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Tabela para listar as categorias existentes */}
      {loading ? (
        <p>Carregando categorias...</p>
      ) : categorias.length === 0 ? (
        <p>Nenhuma categoria cadastrada.</p>
      ) : (
        <div className="overflow-x-auto shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th> {/* Coluna para o Slug */}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categorias.map((categoria) => (
                <tr key={categoria.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{categoria.nome}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{categoria.slug}</td> {/* Mostro o slug aqui */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      onClick={() => handleEditClick(categoria)}
                      className="text-indigo-600 hover:text-indigo-900 transition"
                      aria-label={`Editar ${categoria.nome}`} // Bom para acessibilidade.
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(categoria.id)}
                      className="text-red-600 hover:text-red-900 transition"
                      aria-label={`Excluir ${categoria.nome}`} // Bom para acessibilidade.
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* O modal de edição é renderizado aqui. */}
      <EditCategoryModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        category={editingCategory}
        onSave={handleSaveChanges} // Passo a função handleSaveChanges que cuida da lógica de salvar (incluindo o slug).
      />

      {/* Meus estilos globais para inputs e botões desta página. */}
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

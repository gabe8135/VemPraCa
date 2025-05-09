'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { FaEdit, FaTrash } from 'react-icons/fa';

function EditCharacteristicModal({ isOpen, onClose, characteristic, allCategories, onSave }) {
  const [editedName, setEditedName] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Preciso atualizar o estado do modal se a `characteristic` mudar.
  useEffect(() => {
    if (characteristic) {
      setEditedName(characteristic.nome || '');
      // Aqui eu pego os IDs das categorias que já estão associadas.
      const currentCategoryIds = characteristic.caracteristica_categorias?.map(cc => cc.categoria_id) || [];
      setSelectedCategoryIds(currentCategoryIds);
      setError('');
    }
  }, [characteristic]);

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategoryIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = async () => {
    if (!editedName.trim()) {
      setError('O nome não pode ficar em branco.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await onSave(characteristic.id, editedName.trim(), selectedCategoryIds);
      onClose(); // Fecho o modal se salvar com sucesso.
    } catch (err) {
      console.error("Erro ao salvar característica:", err);
      // Se der erro ao salvar, mostro uma mensagem.
      setError(err.message || 'Falha ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !characteristic) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md backdrop-saturate-150 flex justify-center items-center z-50 p-4 overflow-y-auto">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg my-8">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Editar Característica</h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <div className="mb-4">
          <label htmlFor="characteristicName" className="block text-sm font-medium text-gray-700 mb-1">
            Nome da Característica
          </label>
          <input
            type="text"
            id="characteristicName"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="input-form"
            disabled={isSaving}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categorias Associadas (Opcional)
          </label>
          {/* Enquanto as categorias não carregam, mostro 'Carregando...' */}
          {allCategories.length === 0 ? (
             <p className="text-sm text-gray-500">Carregando categorias...</p>
          ) : (
            <div className="max-h-48 overflow-y-auto border rounded-md p-3 grid grid-cols-2 gap-x-4 gap-y-2 bg-gray-50">
              {allCategories.map(cat => (
                <div key={cat.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`cat-${characteristic.id}-${cat.id}`}
                    checked={selectedCategoryIds.includes(cat.id)}
                    onChange={() => handleCategoryToggle(cat.id)}
                    disabled={isSaving}
                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                  />
                  <label htmlFor={`cat-${characteristic.id}-${cat.id}`} className="ml-2 block text-sm text-gray-900 cursor-pointer">
                    {cat.nome}
                  </label>
                </div>
              ))}
            </div>
          )}
           {/* Lembrete: se nenhuma categoria for marcada, a característica vira "global". */}
           <p className="text-xs text-gray-500 mt-1">Se nenhuma categoria for marcada, a característica será considerada "global" (aplicável a todos).</p>
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
            // Desabilito o botão de salvar se estiver salvando ou se as categorias ainda não carregaram.
            disabled={isSaving || allCategories.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
          >
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

export default function AdminCaracteristicasPage() {
  const [caracteristicas, setCaracteristicas] = useState([]);
  // Aqui eu guardo todas as categorias, vou precisar delas no modal e no formulário de adicionar.
  const [allCategories, setAllCategories] = useState([]);
  const [newCharacteristicName, setNewCharacteristicName] = useState('');
  // IDs das categorias selecionadas para a *nova* característica.
  const [newCharacteristicCategoryIds, setNewCharacteristicCategoryIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharacteristic, setEditingCharacteristic] = useState(null);

  // Essa função busca tanto as características quanto todas as categorias.
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Busco as características e também as `categoria_id` associadas a cada uma.
      const { data: caracData, error: caracError } = await supabase
        .from('caracteristicas')
        .select(`
          id,
          nome,
          caracteristica_categorias ( categoria_id )
        `)
        .order('nome', { ascending: true });
      if (caracError) throw caracError;
      setCaracteristicas(caracData || []);

      // Depois busco todas as categorias existentes para usar nos formulários.
      const { data: catData, error: catError } = await supabase
        .from('categorias')
        .select('id, nome')
        .order('nome', { ascending: true });
      if (catError) throw catError;
      setAllCategories(catData || []);

    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setError('Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Função para marcar/desmarcar categorias no formulário de *adicionar*.
  const handleNewCategoryToggle = (categoryId) => {
    setNewCharacteristicCategoryIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Lógica para adicionar uma nova característica.
  const handleAddCharacteristic = async (e) => {
    e.preventDefault();
    if (!newCharacteristicName.trim()) return;
    setIsAdding(true);
    setError('');
    try {
      // Primeiro, insiro a nova característica no banco.
      const { data: insertedChar, error: insertCharError } = await supabase
        .from('caracteristicas')
        .insert([{ nome: newCharacteristicName.trim() }])
        .select('id, nome')
        .single();
      if (insertCharError) throw insertCharError;

      // Depois, se houver categorias selecionadas, crio as associações na tabela `caracteristica_categorias`.
      if (newCharacteristicCategoryIds.length > 0) {
        const associations = newCharacteristicCategoryIds.map(catId => ({
          caracteristica_id: insertedChar.id,
          categoria_id: catId
        }));
        const { error: insertAssocError } = await supabase
          .from('caracteristica_categorias')
          .insert(associations);
        if (insertAssocError) {
          // Se der erro ao associar categorias, preciso logar isso.
          // A característica foi criada, mas as associações falharam.
          console.error("Erro ao associar categorias:", insertAssocError);
          setError('Característica criada, mas falha ao associar categorias.');
        }
      }

      // Atualizo meu estado local com a nova característica e suas associações.
      const newCharForState = {
          ...insertedChar,
          caracteristica_categorias: newCharacteristicCategoryIds.map(catId => ({ categoria_id: catId }))
      };
      setCaracteristicas(prev => [...prev, newCharForState].sort((a, b) => a.nome.localeCompare(b.nome)));

      setNewCharacteristicName('');
      setNewCharacteristicCategoryIds([]);
    } catch (err) {
      console.error("Erro ao adicionar característica:", err);
      setError(err.message || 'Falha ao adicionar.');
    } finally {
      setIsAdding(false);
    }
  };

  // Para deletar uma característica.
  const handleDeleteCharacteristic = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta característica? As associações com negócios e categorias serão removidas.')) {
      return;
    }
    setError('');
    try {
      // Primeiro, tento deletar as associações na tabela `caracteristica_categorias`.
      // Isso é bom pra manter a consistência.
      // Lembrete: se eu tiver `ON DELETE CASCADE` na chave estrangeira, esse passo pode não ser estritamente necessário.
      const { error: deleteAssocError } = await supabase
        .from('caracteristica_categorias')
        .delete()
        .eq('caracteristica_id', id);
      if (deleteAssocError) console.warn("Aviso: erro ao deletar associações de categoria:", deleteAssocError);

      // Depois, deleto a característica principal.
      const { error: deleteCharError } = await supabase
        .from('caracteristicas')
        .delete()
        .eq('id', id);
      if (deleteCharError) throw deleteCharError;

      setCaracteristicas(prev => prev.filter(char => char.id !== id));
    } catch (err) {
      console.error("Erro ao deletar característica:", err);
      setError(err.message || 'Falha ao deletar.');
    }
  };

  const handleEditClick = (characteristic) => {
    setEditingCharacteristic(characteristic);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCharacteristic(null);
  };

  // Lógica para salvar as edições de uma característica.
  const handleSaveChanges = async (id, newName, newCategoryIds) => {
    // Primeiro, atualizo o nome da característica.
    const { error: updateNameError } = await supabase
      .from('caracteristicas')
      .update({ nome: newName })
      .eq('id', id);
    if (updateNameError) throw updateNameError;

    // Agora, preciso mexer nas associações de categoria:
    // ver quais foram removidas e quais foram adicionadas.
    const originalChar = caracteristicas.find(c => c.id === id);
    const originalCategoryIds = originalChar?.caracteristica_categorias?.map(cc => cc.categoria_id) || [];

    const idsToDelete = originalCategoryIds.filter(catId => !newCategoryIds.includes(catId));
    const idsToInsert = newCategoryIds.filter(catId => !originalCategoryIds.includes(catId));

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('caracteristica_categorias')
        .delete()
        .eq('caracteristica_id', id)
        .in('categoria_id', idsToDelete);
      if (deleteError) {
        console.error("Erro ao remover associações antigas:", deleteError);
        // Se der erro ao remover associações antigas, melhor lançar uma exceção para parar o processo.
        throw new Error('Falha ao atualizar associações de categoria (delete).');
      }
    }

    if (idsToInsert.length > 0) {
      const insertData = idsToInsert.map(catId => ({
        caracteristica_id: id,
        categoria_id: catId
      }));
      const { error: insertError } = await supabase
        .from('caracteristica_categorias')
        .insert(insertData);
      if (insertError) {
        console.error("Erro ao adicionar novas associações:", insertError);
        throw new Error('Falha ao atualizar associações de categoria (insert).');
      }
    }

    // Por fim, atualizo o estado local com os dados modificados e reordeno a lista.
    setCaracteristicas(prev =>
      prev.map(char => {
        if (char.id === id) {
          return {
            ...char,
            nome: newName,
            caracteristica_categorias: newCategoryIds.map(catId => ({ categoria_id: catId }))
          };
        }
        return char;
      }).sort((a, b) => a.nome.localeCompare(b.nome))
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Gerenciar Características</h1>

      <form onSubmit={handleAddCharacteristic} className="mb-8 p-4 border rounded-lg bg-gray-50 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-grow w-full sm:w-auto">
            <label htmlFor="newCharacteristicName" className="block text-sm font-medium text-gray-700 mb-1">
              Nova Característica
            </label>
            <input
              type="text"
              id="newCharacteristicName"
              value={newCharacteristicName}
              onChange={(e) => setNewCharacteristicName(e.target.value)}
              placeholder="Nome da nova característica"
              className="input-form"
              disabled={isAdding}
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !newCharacteristicName.trim()}
            className="button-primary px-5 py-2 w-full sm:w-auto mt-2 sm:mt-0"
          >
            {isAdding ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Associar a Categorias (Opcional)
          </label>
          {allCategories.length === 0 && !loading ? (
            <p className="text-sm text-gray-500">Nenhuma categoria encontrada.</p>
          ) : allCategories.length === 0 && loading ? (
            <p className="text-sm text-gray-500">Carregando categorias...</p>
          ) : (
            <div className="max-h-32 overflow-y-auto border rounded-md p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 bg-white">
              {allCategories.map(cat => (
                <div key={`new-${cat.id}`} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`new-cat-${cat.id}`}
                    checked={newCharacteristicCategoryIds.includes(cat.id)}
                    onChange={() => handleNewCategoryToggle(cat.id)}
                    disabled={isAdding}
                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                  />
                  <label htmlFor={`new-cat-${cat.id}`} className="ml-2 block text-sm text-gray-900 cursor-pointer">
                    {cat.nome}
                  </label>
                </div>
              ))}
            </div>
          )}
          {/* Lembrete: se nenhuma categoria for marcada, será global. */}
          <p className="text-xs text-gray-500 mt-1">Se nenhuma for marcada, será global.</p>
        </div>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p>Carregando características...</p>
      ) : caracteristicas.length === 0 ? (
        <p>Nenhuma característica cadastrada.</p>
      ) : (
        <div className="overflow-x-auto shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categorias Associadas</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {caracteristicas.map((caracteristica) => {
                // Aqui eu monto a string com os nomes das categorias associadas.
                const associatedCategoryNames = caracteristica.caracteristica_categorias
                  ?.map(cc => allCategories.find(cat => cat.id === cc.categoria_id)?.nome)
                  // Isso aqui é pra remover `undefined` caso alguma categoria associada não seja encontrada
                  // na minha lista `allCategories` (não deveria acontecer, mas é uma segurança).
                  .filter(Boolean)
                  // Se não tiver categorias associadas, mostro 'Global'.
                  .join(', ') || <span className="text-gray-400 italic">Global</span>;

                return (
                  <tr key={caracteristica.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{caracteristica.nome}</td>
                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{associatedCategoryNames}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => handleEditClick(caracteristica)}
                        className="text-indigo-600 hover:text-indigo-900 transition"
                        aria-label={`Editar ${caracteristica.nome}`}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteCharacteristic(caracteristica.id)}
                        className="text-red-600 hover:text-red-900 transition"
                        aria-label={`Excluir ${caracteristica.nome}`}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <EditCharacteristicModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        characteristic={editingCharacteristic}
        // Passo todas as categorias para o modal de edição.
        allCategories={allCategories}
        onSave={handleSaveChanges}
      />

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

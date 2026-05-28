'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { 
  X, 
  Search, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign,
  Briefcase,
  Activity
} from 'lucide-react';

interface EntityValue {
  id?: string;
  entity_name: string;
  service_name: string;
  copay: number;
  entity_value: number;
}

interface EntityValuesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EntityValuesModal({ isOpen, onClose }: EntityValuesModalProps) {
  const [values, setValues] = useState<EntityValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Formulario de inserción rápida
  const [newEntity, setNewEntity] = useState('');
  const [newService, setNewService] = useState('');
  const [newCopay, setNewCopay] = useState<string>('');
  const [newEntityValue, setNewEntityValue] = useState<string>('');

  // Estado para la celda que se está editando en línea
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'copay' | 'entity_value' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const supabase = createClient();

  // Cargar datos
  const fetchValues = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from('entity_values')
        .select('*')
        .order('entity_name', { ascending: true })
        .order('service_name', { ascending: true });

      if (dbError) throw dbError;
      setValues(data || []);
    } catch (err: any) {
      console.error('Error fetching entity values:', err);
      setError('No se pudieron cargar los valores. Revisa la conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchValues();
    }
  }, [isOpen]);

  // Filtrado reactivo de valores
  const filteredValues = useMemo(() => {
    return values.filter(v => {
      const search = searchTerm.toLowerCase();
      return (
        v.entity_name.toLowerCase().includes(search) ||
        v.service_name.toLowerCase().includes(search)
      );
    });
  }, [values, searchTerm]);

  // Añadir un nuevo registro
  const handleAddValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntity.trim() || !newService.trim()) {
      setError('Por favor, completa la Entidad y el Servicio.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const copayNum = parseFloat(newCopay) || 0;
      const entityValNum = parseFloat(newEntityValue) || 0;

      const record = {
        entity_name: newEntity.trim().toUpperCase(),
        service_name: newService.trim().toUpperCase(),
        copay: copayNum,
        entity_value: entityValNum
      };

      const { data, error: dbError } = await supabase
        .from('entity_values')
        .insert([record])
        .select();

      if (dbError) {
        if (dbError.code === '23505') {
          throw new Error('Ya existe una tarifa configurada para esta Entidad y Servicio.');
        }
        throw dbError;
      }

      if (data && data.length > 0) {
        setValues(prev => [...prev, data[0]].sort((a, b) => a.entity_name.localeCompare(b.entity_name)));
        setNewEntity('');
        setNewService('');
        setNewCopay('');
        setNewEntityValue('');
        showSuccess('¡Registro agregado correctamente!');
      }
    } catch (err: any) {
      setError(err.message || 'Error al agregar el registro.');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar un registro
  const handleDelete = async (id: string) => {
    if (!id) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este registro de tarifas?')) return;

    try {
      setSaving(true);
      setError(null);
      const { error: dbError } = await supabase
        .from('entity_values')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setValues(prev => prev.filter(v => v.id !== id));
      showSuccess('Registro eliminado correctamente.');
    } catch (err: any) {
      setError('Error al eliminar el registro.');
    } finally {
      setSaving(false);
    }
  };

  // Iniciar edición en línea
  const startEditing = (id: string, field: 'copay' | 'entity_value', currentVal: number) => {
    setEditingCell({ id, field });
    setEditValue(String(currentVal));
  };

  // Guardar edición en línea
  const saveInlineEdit = async (id: string, field: 'copay' | 'entity_value') => {
    const valNum = parseFloat(editValue) || 0;
    
    try {
      setError(null);
      const { error: dbError } = await supabase
        .from('entity_values')
        .update({ [field]: valNum })
        .eq('id', id);

      if (dbError) throw dbError;

      setValues(prev => prev.map(item => {
        if (item.id === id) {
          return { ...item, [field]: valNum };
        }
        return item;
      }));
      setEditingCell(null);
      showSuccess('Valor actualizado.');
    } catch (err: any) {
      setError('Error al actualizar el valor.');
    }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#e6e7ee] rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-[12px_12px_24px_#b8b9be,-12px_-12px_24px_#ffffff] border border-white/20"
        style={{ fontFamily: 'var(--font-manrope)' }}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-300/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-[0_4px_14px_rgba(59,130,246,0.35)]">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Completar Valores de Entidades</h2>
              <p className="text-xs text-gray-400">Configura el Copago y el Valor que paga la entidad para cada servicio.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 rounded-full bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] text-gray-500 hover:text-gray-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificaciones */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold flex items-center gap-2 animate-bounce shrink-0">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-green-50 border border-green-200 text-green-600 text-sm font-semibold flex items-center gap-2 animate-fade-in shrink-0">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Formulario rápido para añadir registros */}
          <form onSubmit={handleAddValue} className="bg-[#e6e7ee] rounded-3xl p-5 shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] space-y-4">
            <h3 className="text-sm font-bold text-gray-600 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-500" />
              Configurar nueva combinación
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Input Entidad */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Entidad</label>
                <input 
                  type="text" 
                  value={newEntity}
                  onChange={(e) => setNewEntity(e.target.value)}
                  placeholder="Ej. ECOPETROL"
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-[#e6e7ee] text-gray-700 border-none shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                />
              </div>

              {/* Input Servicio */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Servicio</label>
                <input 
                  type="text" 
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  placeholder="Ej. ACUPUNTURA"
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-[#e6e7ee] text-gray-700 border-none shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                />
              </div>

              {/* Input Copago */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Copago</label>
                <input 
                  type="number" 
                  value={newCopay}
                  onChange={(e) => setNewCopay(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="any"
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-[#e6e7ee] text-gray-700 border-none shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                />
              </div>

              {/* Input Valor paga Entidad */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Valor paga Entidad</label>
                <input 
                  type="number" 
                  value={newEntityValue}
                  onChange={(e) => setNewEntityValue(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="any"
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-[#e6e7ee] text-gray-700 border-none shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-xs rounded-xl shadow-[3px_3px_8px_rgba(59,130,246,0.3)] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Agregar Tarifa
              </button>
            </div>
          </form>

          {/* Buscador de Tabla */}
          <div className="flex items-center px-4 py-2.5 bg-[#e6e7ee] rounded-2xl shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] max-w-md">
            <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por entidad o servicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 outline-none w-full"
            />
          </div>

          {/* Tabla de Resultados */}
          {loading ? (
            <div className="py-12 flex flex-col justify-center items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs text-gray-400 font-semibold">Cargando tarifas...</p>
            </div>
          ) : filteredValues.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-[2rem] opacity-60">
              <Activity className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-gray-400 font-medium text-sm">No se encontraron registros de tarifas</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-[#e6e7ee] shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] p-2 max-h-[350px] overflow-y-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-500 font-bold uppercase text-[9px] tracking-wider sticky top-0 bg-[#e6e7ee] z-10">
                    <th className="px-4 py-3">Entidad</th>
                    <th className="px-4 py-3">Servicio</th>
                    <th className="px-4 py-3 text-right">Copago</th>
                    <th className="px-4 py-3 text-right">Valor paga Entidad</th>
                    <th className="px-4 py-3 text-center w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredValues.map((row) => {
                    const isEditingCopay = editingCell?.id === row.id && editingCell?.field === 'copay';
                    const isEditingVal = editingCell?.id === row.id && editingCell?.field === 'entity_value';

                    return (
                      <tr key={row.id} className="border-b border-gray-200/60 last:border-0 hover:bg-[#d8d9e0] transition-colors">
                        <td className="px-4 py-3.5 font-bold text-gray-700 uppercase">
                          {row.entity_name}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 uppercase">
                          {row.service_name}
                        </td>
                        
                        {/* Celda Copago */}
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-gray-700">
                          {isEditingCopay ? (
                            <input 
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveInlineEdit(row.id!, 'copay')}
                              onKeyDown={(e) => e.key === 'Enter' && saveInlineEdit(row.id!, 'copay')}
                              autoFocus
                              className="w-24 px-2 py-1 text-xs text-right rounded-md bg-white border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <span 
                              onClick={() => startEditing(row.id!, 'copay', row.copay)}
                              className="cursor-pointer hover:bg-gray-200/60 px-2 py-1 rounded transition-colors"
                              title="Hacer clic para editar"
                            >
                              ${row.copay.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>

                        {/* Celda Valor paga Entidad */}
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-blue-600">
                          {isEditingVal ? (
                            <input 
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveInlineEdit(row.id!, 'entity_value')}
                              onKeyDown={(e) => e.key === 'Enter' && saveInlineEdit(row.id!, 'entity_value')}
                              autoFocus
                              className="w-24 px-2 py-1 text-xs text-right rounded-md bg-white border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <span 
                              onClick={() => startEditing(row.id!, 'entity_value', row.entity_value)}
                              className="cursor-pointer hover:bg-gray-200/60 px-2 py-1 rounded transition-colors"
                              title="Hacer clic para editar"
                            >
                              ${row.entity_value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3.5 text-center">
                          <button 
                            onClick={() => handleDelete(row.id!)}
                            className="p-1.5 rounded-lg bg-[#e6e7ee] shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] text-red-500 hover:text-red-700 hover:shadow-[inset_1px_1px_3px_#b8b9be,inset_-1px_-1px_3px_#ffffff] transition-all"
                            title="Eliminar tarifa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

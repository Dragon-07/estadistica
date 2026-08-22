'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { useReportesStore } from '@/features/data-parser/store/use-reportes-store';
import { processCompletarValoresLocal } from '@/features/data-parser/reportes';
import { 
  X, 
  Search, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign,
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
  const { reporteFacturacionData, updateReporteFacturacionData } = useReportesStore();
  const [values, setValues] = useState<EntityValue[]>([]);
  // Clon para realizar seguimiento de los valores iniciales y evitar escrituras redundantes
  const [originalValues, setOriginalValues] = useState<Record<string, EntityValue>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para catálogos de opciones desde base de datos
  const [availableEntities, setAvailableEntities] = useState<string[]>([]);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  // Control de dropdown activo
  const [activeDropdown, setActiveDropdown] = useState<{ rowId: string, field: 'entity_name' | 'service_name' } | null>(null);

  // Modales personalizados de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Guardados en curso para feedback por celda/fila
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, boolean>>({});

  const supabase = createClient();

  // Cargar datos principales de tarifas
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
      // Almacenar el estado original en un mapa para poder comparar
      const originalMap: Record<string, EntityValue> = {};
      data?.forEach(v => {
        if (v.id) originalMap[v.id] = { ...v };
      });
      setOriginalValues(originalMap);
    } catch (err: any) {
      console.error('Error fetching entity values:', err);
      setError('No se pudieron cargar los valores. Revisa la conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar catálogos de entidades y servicios disponibles
  const fetchOptions = async () => {
    try {
      // Cargar entidades únicas de unique_entities_view
      const { data: entitiesData, error: entitiesError } = await supabase
        .from('unique_entities_view')
        .select('entity_name')
        .order('entity_name', { ascending: true });

      if (!entitiesError && entitiesData) {
        setAvailableEntities(entitiesData.map(e => e.entity_name).filter(Boolean));
      }

      // Cargar servicios únicos mediante la función RPC get_unique_treatments
      const { data: treatmentsData, error: treatmentsError } = await supabase
        .rpc('get_unique_treatments');

      if (!treatmentsError && treatmentsData) {
        setAvailableServices(treatmentsData.map((t: any) => t.treatment_name || t).filter(Boolean));
      }
    } catch (err) {
      console.error('Error fetching options for dropdowns:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchValues();
      fetchOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Funciones de filtrado para los dropdowns
  const getFilteredEntities = (currentText: string) => {
    const query = currentText === 'NUEVA ENTIDAD' ? '' : currentText.toLowerCase().trim();
    if (!query) return availableEntities.slice(0, 50);
    return availableEntities
      .filter(entity => entity.toLowerCase().includes(query))
      .slice(0, 50);
  };

  const getFilteredServices = (currentText: string) => {
    const query = currentText === 'NUEVO SERVICIO' ? '' : currentText.toLowerCase().trim();
    if (!query) return availableServices.slice(0, 50);
    return availableServices
      .filter(service => service.toLowerCase().includes(query))
      .slice(0, 50);
  };

  // Manejar selección de opción en dropdown
  const handleSelectOption = async (id: string, field: 'entity_name' | 'service_name', value: string) => {
    const upperValue = value.toUpperCase();
    
    // Actualizar localmente de forma inmediata
    setValues(prev => prev.map(item => item.id === id ? { ...item, [field]: upperValue } : item));
    
    // Cerrar el dropdown inmediatamente
    setActiveDropdown(null);
    
    // Persistir pasando el valor directamente para evitar race condition
    await handlePersistChange(id, field, upperValue);
  };

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

  // Abrir la confirmación personalizada
  const handleCruceValoresClick = () => {
    if (values.length === 0) {
      setError('No hay tarifas configuradas para cruzar.');
      return;
    }
    setShowConfirmModal(true);
  };

  // Ejecutar el cruce de valores tanto en los datos locales (si existen) como en la base de datos
  const executeCruceValores = async () => {
    setShowConfirmModal(false);
    try {
      setSaving(true);
      setError(null);

      let localUpdatedCount = 0;

      // 1. Si hay datos cargados localmente en memoria (previsualización después de subir Excel)
      if (reporteFacturacionData && reporteFacturacionData.length > 1) {
        const localResult = await processCompletarValoresLocal(reporteFacturacionData);
        updateReporteFacturacionData(localResult.updatedData);
        localUpdatedCount = localResult.updatedCount;
      }

      // 2. Ejecutar también en la base de datos Supabase
      const { data, error: rpcError } = await supabase.rpc('cruce_valores_pendientes');
      if (rpcError) throw rpcError;

      const result = data as { success: boolean; message: string; rows_updated?: number };

      if (result.success) {
        const totalUpdated = (result.rows_updated || 0) + localUpdatedCount;
        showSuccess(`¡Cruce completado con éxito! Se actualizaron ${totalUpdated} registros (${localUpdatedCount} en la vista previa y ${result.rows_updated || 0} en la BD).`);
      } else {
        throw new Error(result.message);
      }
    } catch (err: unknown) {
      console.error('Error en cruce de valores:', err);
      const errMsg = err instanceof Error ? err.message : 'Error al ejecutar el cruce en el servidor.';
      setError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  // Añadir un nuevo registro en blanco
  const handleAddNewBlankRow = async () => {
    try {
      setSaving(true);
      setError(null);

      const record = {
        entity_name: 'NUEVA ENTIDAD',
        service_name: 'NUEVO SERVICIO',
        copay: 0,
        entity_value: 0
      };

      const { data, error: dbError } = await supabase
        .from('entity_values')
        .insert([record])
        .select();

      if (dbError) throw dbError;

      if (data && data.length > 0) {
        const newRecord = data[0];
        // Agregar al estado local al principio de la tabla
        setValues(prev => [newRecord, ...prev]);
        setOriginalValues(prev => ({ ...prev, [newRecord.id!]: { ...newRecord } }));
        showSuccess('¡Fila en blanco creada! Edítala directamente en la tabla.');
        
        // Limpiar el buscador para asegurar que la nueva fila sea visible
        setSearchTerm('');
      }
    } catch (err: unknown) {
      console.error('Error al crear una nueva fila de tarifas:', err);
      setError('Error al crear una nueva fila de tarifas en el servidor.');
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
      setOriginalValues(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      showSuccess('Registro eliminado correctamente.');
    } catch (err: unknown) {
      console.error('Error al eliminar el registro:', err);
      setError('Error al eliminar el registro.');
    } finally {
      setSaving(false);
    }
  };

  // Actualización local temporal del input mientras se escribe
  const handleLocalChange = (id: string, field: keyof EntityValue, val: string) => {
    setValues(prev => prev.map(item => {
      if (item.id === id) {
        let parsedVal: string | number = val;
        if (field === 'copay' || field === 'entity_value') {
          // Dejar que el input maneje el string para escribir cómodamente números y decimales
          parsedVal = val;
        } else {
          parsedVal = val.toUpperCase();
        }
        return { ...item, [field]: parsedVal };
      }
      return item;
    }));
  };

  // Persistir cambios en Supabase en blur o enter
  const handlePersistChange = async (id: string, field: keyof EntityValue, overrideValue?: string | number) => {
    const row = values.find(v => v.id === id);
    if (!row) return;

    let targetVal = overrideValue !== undefined ? overrideValue : row[field];
    
    // Parsear números si corresponde
    if (field === 'copay' || field === 'entity_value') {
      targetVal = parseFloat(String(targetVal)) || 0;
    } else if (typeof targetVal === 'string') {
      targetVal = targetVal.toUpperCase();
    }

    const originalRow = originalValues[id];
    const originalVal = originalRow ? originalRow[field] : undefined;

    // Si el valor no cambió, no hacemos llamada a la base de datos
    if (targetVal === originalVal) {
      // Sincronizar el estado por si tenía decimales a medias
      setValues(prev => prev.map(item => item.id === id ? { ...item, [field]: targetVal } : item));
      return;
    }

    // Validación de campos obligatorios
    if ((field === 'entity_name' || field === 'service_name') && !String(targetVal).trim()) {
      setError('La Entidad y el Servicio son campos requeridos.');
      // Revertir cambio local al valor original
      setValues(prev => prev.map(item => item.id === id ? { ...item, [field]: originalVal } : item));
      return;
    }

    try {
      setError(null);
      setPendingUpdates(prev => ({ ...prev, [`${id}-${field}`]: true }));

      const { error: dbError } = await supabase
        .from('entity_values')
        .update({ [field]: targetVal })
        .eq('id', id);

      if (dbError) throw dbError;

      // Actualizar el mapa de valores originales
      setOriginalValues(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          [field]: targetVal
        }
      }));
      // Normalizar en el estado local
      setValues(prev => prev.map(item => item.id === id ? { ...item, [field]: targetVal } : item));
      showSuccess('Cambio guardado automáticamente.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error al guardar los cambios en la base de datos.';
      setError(errMsg);
      // Revertir en el estado local al valor original
      setValues(prev => prev.map(item => item.id === id ? { ...item, [field]: originalVal } : item));
    } finally {
      setPendingUpdates(prev => {
        const copy = { ...prev };
        delete copy[`${id}-${field}`];
        return copy;
      });
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
        className="bg-[#e6e7ee] rounded-[2.5rem] w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-[12px_12px_24px_#b8b9be,-12px_-12px_24px_#ffffff] border border-white/20"
        style={{ fontFamily: 'var(--font-manrope)' }}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-300/60 shrink-0 bg-[#e6e7ee]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-[0_4px_14px_rgba(59,130,246,0.35)]">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Completar Valores de Entidades</h2>
              <p className="text-xs text-gray-400 font-medium">Edita los campos directamente en la tabla. Los cambios se guardan automáticamente al presionar Enter o cambiar de celda.</p>
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
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-green-50 border border-green-200 text-green-600 text-xs font-bold flex items-center gap-2 animate-fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#e6e7ee]">
          
          {/* Barra de Acciones: Buscador + Completar Valores + Agregar Tarifa en Horizontal */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            
            {/* Buscador */}
            <div className="flex items-center px-4 py-3 bg-[#e6e7ee] rounded-2xl shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por entidad o servicio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none text-xs text-gray-700 focus:ring-0 outline-none w-full font-medium"
              />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Botón Completar Valores (Cruce de Base de Datos) */}
              <button 
                type="button"
                onClick={handleCruceValoresClick}
                disabled={saving || loading}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#e6e7ee] text-green-600 font-bold text-xs rounded-2xl shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff] hover:scale-[0.99] active:scale-[0.96] transition-all duration-200"
                title="Comparar y cruzar las tarifas con la base de datos de registros médicos para completar el Pago Pendiente por la entidad"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4 text-green-500 shrink-0" />}
                <span>Completar valores</span>
              </button>

              {/* Botón Agregar Tarifa como recuadro Neumórfico elegante */}
              <button 
                type="button"
                onClick={handleAddNewBlankRow}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#e6e7ee] text-blue-600 font-bold text-xs rounded-2xl shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff] hover:scale-[0.99] active:scale-[0.96] transition-all duration-200"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 text-blue-500 shrink-0" />}
                <span>Agregar Tarifa</span>
              </button>
            </div>

          </div>

          {/* Tabla Neumórfica Directa */}
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
            <div className="overflow-x-auto rounded-[2rem] bg-[#e6e7ee] shadow-[inset_4px_4px_10px_#b8b9be,inset_-4px_-4px_10px_#ffffff] p-4 max-h-[460px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-gray-400 font-bold uppercase text-[9px] tracking-wider sticky top-0 bg-[#e6e7ee] z-20">
                    <th className="px-3 py-2 pb-3">Entidad</th>
                    <th className="px-3 py-2 pb-3">Servicio</th>
                    <th className="px-3 py-2 pb-3 text-center w-40">Copago</th>
                    <th className="px-3 py-2 pb-3 text-center w-48">Valor paga Entidad</th>
                    <th className="px-3 py-2 pb-3 text-center w-16">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredValues.map((row) => {
                    const isSavingCopay = pendingUpdates[`${row.id}-copay`];
                    const isSavingValue = pendingUpdates[`${row.id}-entity_value`];
                    const isSavingEntity = pendingUpdates[`${row.id}-entity_name`];
                    const isSavingService = pendingUpdates[`${row.id}-service_name`];

                    return (
                      <tr key={row.id} className="hover:bg-[#dadbe2]/40 transition-colors">
                        
                        {/* Celda Entidad */}
                        <td className="px-2 py-2 relative">
                          <div className="relative flex items-center">
                            <input 
                              type="text"
                              value={row.entity_name}
                              onChange={(e) => handleLocalChange(row.id!, 'entity_name', e.target.value)}
                              onFocus={() => setActiveDropdown({ rowId: row.id!, field: 'entity_name' })}
                              onBlur={() => {
                                setTimeout(() => {
                                  setActiveDropdown(prev => (prev?.rowId === row.id && prev?.field === 'entity_name') ? null : prev);
                                  handlePersistChange(row.id!, 'entity_name');
                                }, 200);
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && handlePersistChange(row.id!, 'entity_name')}
                              className="px-4 py-3 w-full font-bold text-gray-700 uppercase rounded-2xl bg-[#e6e7ee] shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] border-none focus:outline-none focus:ring-1 focus:ring-blue-500/20 text-xs transition-all"
                            />
                            {isSavingEntity && (
                              <Loader2 className="absolute right-3 w-3 h-3 text-blue-500 animate-spin" />
                            )}
                          </div>
                          {activeDropdown?.rowId === row.id && activeDropdown?.field === 'entity_name' && (
                            <div className="absolute left-2 right-2 mt-1 max-h-48 overflow-y-auto bg-[#e6e7ee] rounded-2xl shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] border border-white/40 z-[999] py-1">
                              {getFilteredEntities(row.entity_name).length === 0 ? (
                                <div className="px-4 py-2 text-xs text-gray-400 font-medium">Sin coincidencias</div>
                              ) : (
                                getFilteredEntities(row.entity_name).map((entity) => (
                                  <button
                                    key={entity}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleSelectOption(row.id!, 'entity_name', entity);
                                    }}
                                    className="w-full text-left px-4 py-2 text-[10px] sm:text-xs font-bold text-gray-700 hover:bg-[#dadbe2] transition-colors uppercase"
                                  >
                                    {entity}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </td>

                        {/* Celda Servicio */}
                        <td className="px-2 py-2 relative">
                          <div className="relative flex items-center">
                            <input 
                              type="text"
                              value={row.service_name}
                              onChange={(e) => handleLocalChange(row.id!, 'service_name', e.target.value)}
                              onFocus={() => setActiveDropdown({ rowId: row.id!, field: 'service_name' })}
                              onBlur={() => {
                                setTimeout(() => {
                                  setActiveDropdown(prev => (prev?.rowId === row.id && prev?.field === 'service_name') ? null : prev);
                                  handlePersistChange(row.id!, 'service_name');
                                }, 200);
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && handlePersistChange(row.id!, 'service_name')}
                              className="px-4 py-3 w-full font-semibold text-gray-600 uppercase rounded-2xl bg-[#e6e7ee] shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] border-none focus:outline-none focus:ring-1 focus:ring-blue-500/20 text-xs transition-all"
                            />
                            {isSavingService && (
                              <Loader2 className="absolute right-3 w-3 h-3 text-blue-500 animate-spin" />
                            )}
                          </div>
                          {activeDropdown?.rowId === row.id && activeDropdown?.field === 'service_name' && (
                            <div className="absolute left-2 right-2 mt-1 max-h-48 overflow-y-auto bg-[#e6e7ee] rounded-2xl shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] border border-white/40 z-[999] py-1">
                              {getFilteredServices(row.service_name).length === 0 ? (
                                <div className="px-4 py-2 text-xs text-gray-400 font-medium">Sin coincidencias</div>
                              ) : (
                                getFilteredServices(row.service_name).map((service) => (
                                  <button
                                    key={service}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleSelectOption(row.id!, 'service_name', service);
                                    }}
                                    className="w-full text-left px-4 py-2 text-[10px] sm:text-xs font-bold text-gray-600 hover:bg-[#dadbe2] transition-colors uppercase"
                                  >
                                    {service}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </td>

                        {/* Celda Copago */}
                        <td className="px-2 py-2">
                          <div className="relative flex items-center w-full">
                            <span className="absolute left-4 text-blue-400/80 font-bold text-xs pointer-events-none">$</span>
                            <input 
                              type="number"
                              value={row.copay}
                              onChange={(e) => handleLocalChange(row.id!, 'copay', e.target.value)}
                              onBlur={() => handlePersistChange(row.id!, 'copay')}
                              onKeyDown={(e) => e.key === 'Enter' && handlePersistChange(row.id!, 'copay')}
                              step="any"
                              min="0"
                              className="pl-8 pr-8 py-3 w-full text-right font-mono font-bold text-blue-600 rounded-2xl bg-[#e6e7ee] shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] border-none focus:outline-none focus:ring-1 focus:ring-blue-500/20 text-xs transition-all"
                            />
                            <div className="absolute right-3 flex items-center">
                              {isSavingCopay ? (
                                <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                              ) : (
                                <span className="text-[10px] text-gray-400 font-bold font-mono">COP</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Celda Valor paga Entidad */}
                        <td className="px-2 py-2">
                          <div className="relative flex items-center w-full">
                            <span className="absolute left-4 text-blue-500 font-bold text-xs pointer-events-none">$</span>
                            <input 
                              type="number"
                              value={row.entity_value}
                              onChange={(e) => handleLocalChange(row.id!, 'entity_value', e.target.value)}
                              onBlur={() => handlePersistChange(row.id!, 'entity_value')}
                              onKeyDown={(e) => e.key === 'Enter' && handlePersistChange(row.id!, 'entity_value')}
                              step="any"
                              min="0"
                              className="pl-8 pr-8 py-3 w-full text-right font-mono font-black text-blue-600 rounded-2xl bg-[#e6e7ee] shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] border-none focus:outline-none focus:ring-1 focus:ring-blue-500/20 text-xs transition-all"
                            />
                            <div className="absolute right-3 flex items-center">
                              {isSavingValue ? (
                                <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                              ) : (
                                <span className="text-[10px] text-gray-400 font-bold font-mono">COP</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="px-3 py-2 text-center">
                          <button 
                            onClick={() => handleDelete(row.id!)}
                            className="p-3 rounded-2xl bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] text-red-500 hover:text-red-700 hover:shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff] transition-all"
                            title="Eliminar tarifa"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal de Confirmación Neumórfico Personalizado */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#e6e7ee] rounded-[2rem] max-w-md w-full p-6 shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff] border border-white/20 text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-green-500 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(34,197,94,0.3)]">
              <Activity className="w-8 h-8 text-white" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-800">Confirmar Cruce de Valores</h3>
              <p className="text-xs text-gray-500 leading-relaxed px-2">
                ¿Deseas comparar las tarifas configuradas con los registros médicos de la base de datos y completar el **Pago Pendiente por la entidad** y **Total final** automáticamente?
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-[#e6e7ee] text-gray-600 font-bold text-xs rounded-xl shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff] active:scale-[0.98] transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeCruceValores}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-xs rounded-xl shadow-[3px_3px_8px_rgba(34,197,94,0.3)] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] active:scale-[0.98] transition-all duration-200"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

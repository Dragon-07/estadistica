'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { 
  X, 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  SlidersHorizontal,
  Info
} from 'lucide-react';

interface DisabledTreatmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

export function DisabledTreatmentsModal({ isOpen, onClose, onChanged }: DisabledTreatmentsModalProps) {
  const [allTreatments, setAllTreatments] = useState<string[]>([]);
  const [disabledTreatments, setDisabledTreatments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = createClient();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar tratamientos únicos de la base de datos
      const { data: treatmentsData, error: treatmentsError } = await supabase.rpc('get_unique_treatments');
      if (treatmentsError) throw treatmentsError;

      // Cargar tratamientos deshabilitados
      const { data: disabledData, error: disabledError } = await supabase
        .from('disabled_treatments')
        .select('treatment_name');
      if (disabledError) throw disabledError;

      const treatments = (treatmentsData || []).map((t: any) => t.treatment_name || t).filter(Boolean);
      setAllTreatments(treatments);

      const disabledSet = new Set<string>((disabledData || []).map((d: any) => d.treatment_name));
      setDisabledTreatments(disabledSet);
    } catch (err: any) {
      console.error('Error fetching treatments data:', err);
      setError('No se pudieron cargar los tratamientos. Revisa la conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const filteredTreatments = useMemo(() => {
    return allTreatments.filter(t => 
      t.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allTreatments, searchTerm]);

  const handleToggleActive = async (treatmentName: string, isCurrentlyDisabled: boolean) => {
    try {
      setError(null);
      setSavingId(treatmentName);

      if (isCurrentlyDisabled) {
        // Habilitar (eliminar de disabled_treatments)
        const { error: dbError } = await supabase
          .from('disabled_treatments')
          .delete()
          .eq('treatment_name', treatmentName);

        if (dbError) throw dbError;

        setDisabledTreatments(prev => {
          const next = new Set(prev);
          next.delete(treatmentName);
          return next;
        });
        showSuccess(`Tratamiento "${treatmentName}" habilitado correctamente.`);
      } else {
        // Deshabilitar (insertar en disabled_treatments)
        const { error: dbError } = await supabase
          .from('disabled_treatments')
          .insert([{ treatment_name: treatmentName }]);

        if (dbError) throw dbError;

        setDisabledTreatments(prev => {
          const next = new Set(prev);
          next.add(treatmentName);
          return next;
        });
        showSuccess(`Tratamiento "${treatmentName}" deshabilitado correctamente.`);
      }

      if (onChanged) {
        onChanged();
      }
    } catch (err: any) {
      console.error('Error toggling treatment status:', err);
      setError(`Error al cambiar el estado de "${treatmentName}".`);
    } finally {
      setSavingId(null);
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
        className="bg-[#e6e7ee] rounded-[2.5rem] w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-[12px_12px_24px_#b8b9be,-12px_-12px_24px_#ffffff] border border-white/20"
        style={{ fontFamily: 'var(--font-manrope)' }}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-300/60 shrink-0 bg-[#e6e7ee]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-[0_4px_14px_rgba(59,130,246,0.35)]">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Quitar no tratamientos</h2>
              <p className="text-xs text-gray-400 font-medium">Habilita o deshabilita los medicamentos y tratamientos para los listados de Rentabilidad, Costos y Distribuciones.</p>
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
          {/* Info Informativa */}
          <div className="p-4 bg-white/40 rounded-2xl border border-white/50 shadow-[4px_4px_10px_rgba(0,0,0,0.03)] flex gap-3 text-xs text-gray-500 font-medium leading-relaxed">
            <Info className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
            <p>
              Desactiva aquellos medicamentos que no forman parte de tus tratamientos principales. Al hacerlo, se ocultarán del buscador de <strong>Agregar tratamientos</strong> y se excluirán automáticamente de las <strong>Distribuciones de Personal y Administrativo (Plan C)</strong>.
            </p>
          </div>

          {/* Barra de Acciones: Buscador */}
          <div className="flex items-center px-4 py-3 bg-[#e6e7ee] rounded-2xl shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff]">
            <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Buscar medicamento o tratamiento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-xs text-gray-700 focus:ring-0 outline-none w-full font-medium"
            />
          </div>

          {/* Listado de Tratamientos */}
          {loading ? (
            <div className="py-12 flex flex-col justify-center items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs text-gray-400 font-semibold">Cargando tratamientos...</p>
            </div>
          ) : filteredTreatments.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-[2rem] opacity-60">
              <SlidersHorizontal className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-gray-400 font-medium text-sm">No se encontraron medicamentos</p>
            </div>
          ) : (
            <div className="overflow-y-auto rounded-[2rem] bg-[#e6e7ee] shadow-[inset_4px_4px_10px_#b8b9be,inset_-4px_-4px_10px_#ffffff] p-4 max-h-[420px]">
              <div className="divide-y divide-gray-300/40">
                {filteredTreatments.map((treatment) => {
                  const isExcluded = disabledTreatments.has(treatment);
                  const isSaving = savingId === treatment;

                  return (
                    <div 
                      key={treatment} 
                      className="flex items-center justify-between py-3 px-3 hover:bg-[#dadbe2]/40 rounded-xl transition-all"
                    >
                      <div className="flex flex-col gap-0.5 max-w-[75%]">
                        <span className="font-bold text-gray-700 text-xs uppercase truncate block" title={treatment}>
                          {treatment}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {isExcluded ? '🔴 Deshabilitado de listados' : '🟢 Habilitado y en uso'}
                        </span>
                      </div>

                      {/* Switch Neumórfico Estilizado */}
                      <button
                        onClick={() => handleToggleActive(treatment, isExcluded)}
                        disabled={isSaving}
                        className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all duration-350 outline-none ${
                          isExcluded 
                            ? 'bg-red-200/80 shadow-[inset_2px_2px_5px_#b8b9be]' 
                            : 'bg-green-500 shadow-[0_2px_8px_rgba(34,197,94,0.3)]'
                        } ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <span className="sr-only">Toggle Treatment</span>
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                            isExcluded ? 'translate-x-1.5 shadow-[1px_1px_3px_rgba(0,0,0,0.2)]' : 'translate-x-6 shadow-[0_2px_4px_rgba(0,0,0,0.15)]'
                          } flex items-center justify-center`}
                        >
                          {isSaving && <Loader2 className="w-2.5 h-2.5 text-blue-500 animate-spin" />}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

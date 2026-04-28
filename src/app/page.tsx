'use client';

import { useState, useRef, useEffect } from 'react';
import { processReporteFacturacion, processReporteTransaccion, processMedicoTratante, saveUnifiedToSupabase, exportToExcel, fetchDatabasePreview, deleteAllRecords, getDatabaseTotalCount, deleteRecordsByDateRange } from '@/features/data-parser/reportes';
import { useReportesStore } from '@/features/data-parser/store/use-reportes-store';
import { Dashboard } from '@/features/reports/components/Dashboard';
import { BillingReport } from '@/features/reports/components/BillingReport';
import {
  LayoutDashboard,
  FileText,
  Stethoscope,
  ChevronRight,
  Database,
  Activity,
  Download,
  CloudUpload,
  Trash2,
  Menu,
  X
} from 'lucide-react';

type Tab = 'dashboard' | 'billing' | 'process';

const NAV_ITEMS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'billing', label: 'Cuenta de Ingresos', icon: FileText },
  { id: 'process', label: 'Procesar Datos', icon: Database },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const facturacionInputRef = useRef<HTMLInputElement>(null);
  const transaccionInputRef = useRef<HTMLInputElement>(null);
  const medicoInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [successStatus, setSuccessStatus] = useState<'facturacion' | 'transaccion' | 'medico' | 'save' | null>(null);

  // Estados para Borrar por Rango de Fecha
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState('');
  const [deleteEndDate, setDeleteEndDate] = useState('');
  const [isDeletingRange, setIsDeletingRange] = useState(false);

  // Estados para Login Temporal
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem('app_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername === 'holistica' && loginPassword === '07Holistica') {
      setIsAuthenticated(true);
      sessionStorage.setItem('app_auth', 'true');
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };
  const { 
    reporteFacturacionData, 
    reporteTransaccionData,
    filteredCount, 
    setReporteFacturacionData, 
    setReporteTransaccionData,
    updateReporteFacturacionData,
    appendReporteData,
    clearReporteFacturacionData
  } = useReportesStore();

  const [dbPreviewData, setDbPreviewData] = useState<any[][] | null>(null);
  const [dbTotalCount, setDbTotalCount] = useState<number>(0);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  const loadDbPreview = async () => {
    try {
      setIsLoadingDb(true);
      const data = await fetchDatabasePreview(10000); // Cargamos todo para mostrar "Igual que arriba"
      const total = await getDatabaseTotalCount();
      
      setDbTotalCount(total);
      
      if (data && data.length > 1) {
        setDbPreviewData(data);
      } else {
        setDbPreviewData(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDb(false);
    }
  };

  // Cargar BD cada vez que entremos a process o cuando guardemos algo con éxito
  useEffect(() => {
    if (activeTab === 'process') {
      loadDbPreview();
    }
  }, [activeTab, successStatus]);

  const handleFacturacionClick = () => facturacionInputRef.current?.click();
  const handleTransaccionClick = () => transaccionInputRef.current?.click();
  const handleMedicoClick = () => medicoInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'facturacion' | 'transaccion') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const result = type === 'facturacion' 
        ? await processReporteFacturacion(file)
        : await processReporteTransaccion(file);
      
      // Guardar copia individual para exportación específica si es transacciones
      if (type === 'transaccion') {
        setReporteTransaccionData(result.data, result.filteredCount);
      }

      // La primera vez usamos set, las siguientes usamos append para sumar a la lista maestra
      if (!reporteFacturacionData) {
        setReporteFacturacionData(result.data, result.filteredCount);
      } else {
        appendReporteData(result.data, result.filteredCount);
      }

      // Feedback visual en lugar de alert
      setSuccessStatus(type);
      setTimeout(() => setSuccessStatus(null), 3000);
    } catch (err: any) {
      console.error(err);
      // Solo dejamos alert para errores críticos
      alert('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleMedicoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !reporteFacturacionData) return;

    try {
      setIsProcessing(true);
      const updatedData = await processMedicoTratante(file, reporteFacturacionData);
      updateReporteFacturacionData(updatedData);
      setSuccessStatus('medico' as any);
      setTimeout(() => setSuccessStatus(null), 3000);
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleSaveToDB = async () => {
    if (!reporteFacturacionData || reporteFacturacionData.length <= 1) return;

    try {
      setIsSaving(true);
      await saveUnifiedToSupabase(reporteFacturacionData);
      setSuccessStatus('save');
      setTimeout(() => setSuccessStatus(null), 3000);
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearTable = async () => {
    if (confirm('¿Estás seguro de que deseas limpiar DE FORMA PERMANENTE la base de datos completa y la vista actual?\n\n¡Esta acción borrará TODO el histórico en el servidor!')) {
      const isAbsoluteSure = confirm('ALERTA CRÍTICA: ¿Estás absolutamente seguro?\n\nEsto vaciará toda la tabla en Supabase y no podrás recuperar la información no respaldada.');
      if (isAbsoluteSure) {
        try {
          setIsSaving(true);
          await deleteAllRecords();
          clearReporteFacturacionData();
          setDbPreviewData(null);
          alert('¡Base de datos y vista local borradas exitosamente!');
        } catch (e: any) {
          alert('Error al borrar la base de datos: ' + e.message);
        } finally {
          setIsSaving(false);
        }
      }
    }
  };

  const handleDeleteByDateRange = async () => {
    if (!deleteStartDate || !deleteEndDate) {
      alert('Por favor selecciona ambas fechas.');
      return;
    }
    if (confirm(`¿Estás seguro de que deseas borrar los registros desde ${deleteStartDate} hasta ${deleteEndDate}?`)) {
      try {
        setIsDeletingRange(true);
        await deleteRecordsByDateRange(deleteStartDate, deleteEndDate);
        alert('Registros borrados exitosamente.');
        setShowDateRangeModal(false);
        loadDbPreview();
      } catch (e: any) {
        alert('Error al borrar los registros: ' + e.message);
      } finally {
        setIsDeletingRange(false);
      }
    }
  };

  if (isAuthenticated === null) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e6e7ee]" style={{ fontFamily: 'var(--font-manrope)' }}>
        <form onSubmit={handleLogin} className="bg-[#e6e7ee] p-8 rounded-3xl shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] w-full max-w-sm flex flex-col gap-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_4px_14px_rgba(59,130,246,0.4)] mb-4">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Acceso Restringido</h1>
            <p className="text-sm text-gray-500 mt-2">Ingresa tus credenciales para continuar</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Usuario</label>
            <input
              type="text"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#e6e7ee] text-gray-700 border-none shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Usuario"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#e6e7ee] text-gray-700 border-none shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          {loginError && (
            <p className="text-red-500 text-sm text-center font-medium">Credenciales incorrectas</p>
          )}

          <button
            type="submit"
            className="w-full py-3 mt-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-[4px_4px_10px_rgba(59,130,246,0.3)] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] transition-all"
          >
            Ingresar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen relative" style={{ background: 'var(--neu-bg)' }}>
      {/* Mobile Header (Solo visible en móviles) */}
      <div className="md:hidden flex items-center justify-between p-4 z-40 bg-[#e6e7ee] shadow-[0_4px_10px_rgba(0,0,0,0.05)] sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-[0_2px_8px_rgba(59,130,246,0.4)]">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm leading-tight" style={{ fontFamily: 'var(--font-manrope)' }}>
              Holística
            </p>
            <p className="text-gray-400 text-[10px] uppercase tracking-wide">UNIDAD DE MEDICINA INTEGRAL</p>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2.5 rounded-xl bg-[#e6e7ee] shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] text-gray-600 hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] transition-all"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Overlay Oscuro para Menú Móvil */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Modal para Borrar por Rango de Fecha */}
      {showDateRangeModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[6px_6px_14px_#b8b9be,-6px_-6px_14px_#ffffff] max-w-sm w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Borrar Rango de Fechas</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha Inicio</label>
                <input 
                  type="date" 
                  value={deleteStartDate} 
                  onChange={(e) => setDeleteStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#e6e7ee] text-gray-700 border-none shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha Fin</label>
                <input 
                  type="date" 
                  value={deleteEndDate} 
                  onChange={(e) => setDeleteEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#e6e7ee] text-gray-700 border-none shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] focus:outline-none"
                />
              </div>
              <div className="flex gap-4 mt-2">
                <button 
                  onClick={() => setShowDateRangeModal(false)}
                  className="flex-1 py-3 bg-white text-gray-600 font-bold rounded-xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff]"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteByDateRange}
                  disabled={isDeletingRange}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-[4px_4px_10px_rgba(239,68,68,0.3)] disabled:opacity-50"
                >
                  {isDeletingRange ? 'Borrando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 h-[100dvh] w-72 md:w-64 shrink-0 p-6 flex flex-col gap-6 z-50 md:z-0 transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0 shadow-[10px_0_20px_rgba(0,0,0,0.1)]' : '-translate-x-full shadow-none'
      }`} style={{ background: 'var(--neu-bg)' }}>
        {/* Logo */}
        <div className="flex items-center justify-between px-2 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-[0_4px_14px_rgba(59,130,246,0.4)]">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-lg leading-tight" style={{ fontFamily: 'var(--font-manrope)' }}>
                Holística
              </p>
              <p className="text-gray-400 text-[10px] uppercase tracking-wide mt-0.5">UNIDAD DE MEDICINA INTEGRAL</p>
            </div>
          </div>
          <button 
            className="md:hidden p-1.5 rounded-lg bg-[#e6e7ee] shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] text-gray-500"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Separador */}
        <div className="h-px bg-[#e6e7ee] shadow-[0_1px_0_#ffffff,0_-1px_0_#b8b9be]" />

        {/* Navegación */}
        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">Menú</p>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id);
                  setIsMobileMenuOpen(false); // Cerrar en móvil al seleccionar
                }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium w-full text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)]'
                    : 'text-gray-600 shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] hover:shadow-[inset_3px_3px_7px_#b8b9be,inset_-3px_-3px_7px_#ffffff]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span className="flex-1 truncate">{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 shrink-0" />}
              </button>
            );
          })}
        </nav>

      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1
              className="text-2xl font-bold text-gray-800"
              style={{ fontFamily: 'var(--font-manrope)' }}
            >
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {activeTab === 'dashboard' && 'Resumen general de actividad médica'}
              {activeTab === 'billing' && 'Cuenta de ingresos consolidada y sin duplicados'}
              {activeTab === 'process' && 'Procesa y limpia los datos cargados para reportes'}
            </p>
          </div>
          <div className="bg-[#e6e7ee] rounded-2xl px-5 py-3 shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff]">
            <p className="text-gray-500 text-xs">Unidad Médica</p>
            <p className="text-gray-700 font-semibold text-sm">Gerencia</p>
          </div>
        </div>

        {/* Contenido de cada pestaña (Mantenemos montados los componentes para no perder estado/caché) */}
        <div className="animate-fade-in">
          <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
            <Dashboard />
          </div>
          <div className={activeTab === 'billing' ? 'block' : 'hidden'}>
            <BillingReport />
          </div>
          <div className={activeTab === 'process' ? 'block' : 'hidden'}>
            <div className="flex flex-col gap-8 animate-fade-in">
              {/* Botones Superiores */}
               <div className="flex flex-wrap gap-6">
                {[
                   { 
                    id: 'facturacion', 
                    label: 'reporte_facturacio', 
                    icon: FileText, 
                    onClick: handleFacturacionClick, 
                    isProcessing: isProcessing && !successStatus,
                    isSuccess: successStatus === 'facturacion'
                  },
                  { 
                    id: 'transaccion', 
                    label: 'reporte_transaccio', 
                    icon: Activity, 
                    onClick: handleTransaccionClick, 
                    isProcessing: isProcessing && !successStatus,
                    isSuccess: successStatus === 'transaccion',
                    showExport: !!reporteTransaccionData,
                    exportData: reporteTransaccionData,
                    exportName: 'Reporte_Transacciones'
                  },
                  { 
                    id: 'medico', 
                    label: 'CARGAR MÉDICOS', 
                    icon: Stethoscope, 
                    onClick: handleMedicoClick,
                    isProcessing: isProcessing && !successStatus,
                    isSuccess: successStatus === 'medico'
                  },

                ].map(({ id, label, icon: Icon, onClick, isProcessing: loading, isSuccess, showExport, exportData, exportName }) => (
                  <div key={id} className="flex flex-col gap-4">
                    <button
                      onClick={onClick}
                      disabled={loading || isSuccess}
                      className={`flex items-center gap-4 px-8 py-5 rounded-3xl font-semibold shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] transition-all duration-300 group min-w-[240px] ${
                        isSuccess 
                          ? 'bg-green-500 text-white shadow-[0_4px_14px_rgba(34,197,94,0.4)]' 
                          : 'bg-[#e6e7ee] text-gray-700 hover:shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff]'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-transform ${
                        isSuccess ? 'bg-white/20' : 'bg-white shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] group-hover:scale-95'
                      }`}>
                        {isSuccess ? (
                          <span className="text-white text-lg">✓</span>
                        ) : (
                          <Icon className={`w-5 h-5 ${loading ? 'text-gray-400 animate-pulse' : 'text-blue-500'}`} />
                        )}
                      </div>
                      <span className="text-sm tracking-wide">
                        {loading ? 'Procesando...' : isSuccess ? '¡Completado!' : label}
                      </span>
                    </button>
                    
                    {showExport && (
                      <button
                        onClick={() => exportToExcel(exportData!, exportName)}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-white text-blue-600 font-bold text-xs shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff] transition-all duration-300 animate-fade-in"
                      >
                        <Download className="w-4 h-4" />
                        <span>Exportar Transacciones</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Botones de Control de Base de Datos */}
              <div className="flex justify-start gap-4 flex-wrap mt-2">
                {reporteFacturacionData && (
                  <>
                    <button
                      onClick={() => exportToExcel(reporteFacturacionData, 'Base_De_Datos_Unificada')}
                      className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold shadow-[4px_4px_10px_rgba(59,130,246,0.3)] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] transition-all duration-300 group"
                    >
                      <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                      <span>Exportar Local</span>
                    </button>

                    <button
                      onClick={handleSaveToDB}
                      disabled={isSaving}
                      className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold transition-all duration-300 group ${
                        successStatus === 'save'
                          ? 'bg-green-500 text-white shadow-[0_4px_14px_rgba(34,197,94,0.4)]'
                          : 'bg-white text-blue-600 shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff]'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <CloudUpload className={`w-5 h-5 ${isSaving ? 'animate-bounce' : ''}`} />
                      <span>{isSaving ? 'Guardando...' : successStatus === 'save' ? '¡Guardado!' : 'Subir Cambios'}</span>
                    </button>
                  </>
                )}

                {/* Este botón ahora está siempre visible */}
                <button
                  onClick={() => setShowDateRangeModal(true)}
                  className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white text-orange-500 font-bold shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] hover:bg-orange-50 hover:text-orange-600 hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] transition-all duration-300 group ml-auto"
                >
                  <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Borrar por Fechas</span>
                </button>
                <button
                  onClick={handleClearTable}
                  className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white text-red-500 font-bold shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] hover:bg-red-50 hover:text-red-600 hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] transition-all duration-300 group"
                >
                  <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Limpiar Base de Datos</span>
                </button>
              </div>
              
              <input 
                type="file" 
                ref={facturacionInputRef} 
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={(e) => handleFileChange(e, 'facturacion')} 
              />
              <input 
                type="file" 
                ref={transaccionInputRef} 
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={(e) => handleFileChange(e, 'transaccion')} 
              />
              <input 
                type="file" 
                ref={medicoInputRef} 
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={handleMedicoFileChange} 
              />

              {/* Controles y Visualización de los Datos de Facturación */}
              {reporteFacturacionData ? (
                <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[6px_6px_14px_#b8b9be,-6px_-6px_14px_#ffffff]">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-700">Previsualización de Datos Procesados</h2>
                    <span className="text-xs font-medium bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                      {reporteFacturacionData.length - 1} registros (excluyendo encabezado)
                    </span>
                  </div>
                  
                  <div className="overflow-x-auto rounded-xl border border-gray-200" style={{ maxHeight: '500px' }}>
                    <table className="min-w-full text-xs text-left text-gray-600 bg-white">
                      <thead className="text-gray-700 bg-gray-50/80 sticky top-0 shadow-sm backdrop-blur-sm z-10">
                        <tr>
                          {reporteFacturacionData[0]?.map((header: string, i: number) => (
                            <th key={`h-${i}`} className="px-4 py-3 font-semibold whitespace-nowrap border-b border-gray-200">
                              {header || <span className="text-gray-400 italic">Vacio</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reporteFacturacionData.slice(1).map((row: any[], rowIndex: number) => (
                          <tr key={`r-${rowIndex}`} className="border-b border-gray-100 hover:bg-gray-50">
                            {row.map((cell: any, cellIndex: number) => (
                              <td key={`c-${rowIndex}-${cellIndex}`} className="px-4 py-3 whitespace-nowrap">
                                {cell || <span className="text-gray-300">-</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[40vh] border-2 border-dashed border-gray-300 rounded-[3rem] opacity-50">
                  <p className="text-gray-400 italic">Selecciona una opción para procesar y cargar los datos aquí</p>
                </div>
              )}

              {/* Visor de la Base de Datos */}
              <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[6px_6px_14px_#b8b9be,-6px_-6px_14px_#ffffff] mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" />
                    Estado Actual en Base de Datos
                  </h2>
                  <div className="flex items-center gap-3">
                    <button onClick={loadDbPreview} className="text-xs text-blue-600 font-bold hover:underline">
                      Actualizar
                    </button>
                    <span className="text-xs font-medium bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                      {dbTotalCount} registros (excluyendo encabezado)
                    </span>
                  </div>
                </div>
                
                {isLoadingDb ? (
                  <div className="py-12 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : dbPreviewData ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200" style={{ maxHeight: '500px' }}>
                    <table className="min-w-full text-xs text-left text-gray-600 bg-white">
                      <thead className="text-gray-700 bg-gray-50/80 sticky top-0 shadow-sm backdrop-blur-sm z-10">
                        <tr>
                          {dbPreviewData[0]?.map((header: string, i: number) => (
                            <th key={`dbh-${i}`} className="px-4 py-3 font-semibold whitespace-nowrap border-b border-gray-200">
                              {header || <span className="text-gray-400 italic">Vacio</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dbPreviewData.slice(1).map((row: any[], rowIndex: number) => (
                          <tr key={`dbr-${rowIndex}`} className="border-b border-gray-100 hover:bg-gray-50">
                            {row.map((cell: any, cellIndex: number) => (
                              <td key={`dbc-${rowIndex}-${cellIndex}`} className="px-4 py-3 whitespace-nowrap">
                                {cell || <span className="text-gray-300">-</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-[3rem] opacity-50">
                    <Database className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-gray-400 font-medium text-sm">La base de datos está vacía</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

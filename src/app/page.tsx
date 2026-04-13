'use client';

import { useState, useRef } from 'react';
import { processReporteFacturacion } from '@/features/data-parser/reportes';
import { useReportesStore } from '@/features/data-parser/store/use-reportes-store';
import { ExcelUploader } from '@/features/data-parser/components/ExcelUploader';
import { Dashboard } from '@/features/reports/components/Dashboard';
import { BillingReport } from '@/features/reports/components/BillingReport';
import {
  LayoutDashboard,
  Upload,
  FileText,
  Stethoscope,
  ChevronRight,
  Database,
  Activity,
} from 'lucide-react';

type Tab = 'dashboard' | 'upload' | 'billing' | 'process';

const NAV_ITEMS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Cargar Datos', icon: Upload },
  { id: 'billing', label: 'Cuenta de Cobro', icon: FileText },
  { id: 'process', label: 'Procesar Datos', icon: Database },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { reporteFacturacionData, setReporteFacturacionData } = useReportesStore();

  const handleReporteFacturacionClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const data = await processReporteFacturacion(file);
      setReporteFacturacionData(data);
      // Podríamos usar un toast, pero un alert sirve por ahora para dar feedback rápido
      alert('Reporte facturación procesado, datos guardados y descargado exitosamente.');
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--neu-bg)' }}>
      {/* Sidebar */}
      <aside className="w-64 shrink-0 p-6 flex flex-col gap-6" style={{ background: 'var(--neu-bg)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 py-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-[0_4px_14px_rgba(59,130,246,0.4)]">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm leading-tight" style={{ fontFamily: 'var(--font-manrope)' }}>
              MediBill
            </p>
            <p className="text-gray-400 text-xs">Analizador de Facturación</p>
          </div>
        </div>

        {/* Separador */}
        <div className="h-px bg-[#e6e7ee] shadow-[0_1px_0_#ffffff,0_-1px_0_#b8b9be]" />

        {/* Navegación */}
        <nav className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">Menú</p>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium w-full text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)]'
                    : 'text-gray-600 shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] hover:shadow-[inset_3px_3px_7px_#b8b9be,inset_-3px_-3px_7px_#ffffff]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3 h-3" />}
              </button>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="mt-auto">
          <div className="bg-[#e6e7ee] rounded-3xl p-5 shadow-[6px_6px_14px_#b8b9be,-6px_-6px_14px_#ffffff] text-center">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center mx-auto mb-3 shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <p className="text-gray-600 text-xs font-medium leading-relaxed">
              Facturación precisa y sin errores para su unidad médica
            </p>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-2xl font-bold text-gray-800"
              style={{ fontFamily: 'var(--font-manrope)' }}
            >
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {activeTab === 'dashboard' && 'Resumen general de actividad médica'}
              {activeTab === 'upload' && 'Sube y consolida tus archivos Excel'}
              {activeTab === 'billing' && 'Cuenta de cobro consolidada y sin duplicados'}
              {activeTab === 'process' && 'Procesa y limpia los datos cargados para reportes'}
            </p>
          </div>
          <div className="bg-[#e6e7ee] rounded-2xl px-5 py-3 shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff]">
            <p className="text-gray-500 text-xs">Unidad Médica</p>
            <p className="text-gray-700 font-semibold text-sm">Gerencia</p>
          </div>
        </div>

        {/* Contenido de cada pestaña */}
        <div className="animate-fade-in">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'upload' && <ExcelUploader />}
          {activeTab === 'billing' && <BillingReport />}
          {activeTab === 'process' && (
            <div className="flex flex-col gap-8 animate-fade-in">
              {/* Botones Superiores */}
              <div className="flex flex-wrap gap-6">
                {[
                  { id: 'facturacion', label: 'reporte_facturacio', icon: FileText, onClick: handleReporteFacturacionClick, isProcessing },
                  { id: 'transaccion', label: 'reporte_transaccio', icon: Activity },
                  { id: 'database', label: 'BASE DE DATOS', icon: Database },
                ].map(({ id, label, icon: Icon, onClick, isProcessing: loading }) => (
                  <button
                    key={id}
                    onClick={onClick}
                    disabled={loading}
                    className={`flex items-center gap-4 px-8 py-5 rounded-3xl bg-[#e6e7ee] text-gray-700 font-semibold shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] hover:shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] transition-all duration-300 group min-w-[240px] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] flex items-center justify-center group-hover:scale-95 transition-transform">
                      <Icon className={`w-5 h-5 ${loading ? 'text-gray-400 animate-pulse' : 'text-blue-500'}`} />
                    </div>
                    <span className="text-sm tracking-wide">{loading ? 'Procesando...' : label}</span>
                  </button>
                ))}
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={handleFileChange} 
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

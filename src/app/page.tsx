'use client';

import { useState } from 'react';
import { ExcelUploader } from '@/features/data-parser/components/ExcelUploader';
import { Dashboard } from '@/features/reports/components/Dashboard';
import { BillingReport } from '@/features/reports/components/BillingReport';
import {
  LayoutDashboard,
  Upload,
  FileText,
  Stethoscope,
  ChevronRight,
} from 'lucide-react';

type Tab = 'dashboard' | 'upload' | 'billing';

const NAV_ITEMS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Cargar Datos', icon: Upload },
  { id: 'billing', label: 'Cuenta de Cobro', icon: FileText },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

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
        </div>
      </main>
    </div>
  );
}

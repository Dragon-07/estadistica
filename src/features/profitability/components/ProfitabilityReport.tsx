'use client';

import { useState } from 'react';
import { Calendar, Check, Package, Users, Briefcase, DollarSign } from 'lucide-react';

export function ProfitabilityReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-6xl mx-auto py-2">
      {/* Selector de Período - Más compacto */}
      <div className="bg-[#e6e7ee] p-5 rounded-[2rem] shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none">
              <Calendar size={16} />
            </div>
            <span className="absolute left-9 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 uppercase tracking-wider pointer-events-none">
              Desde:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-20 pr-3 py-2.5 rounded-xl bg-[#e6e7ee] text-gray-700 text-xs font-medium border-none shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all appearance-none"
            />
          </div>

          <div className="relative flex-1 group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none">
              <Calendar size={16} />
            </div>
            <span className="absolute left-9 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 uppercase tracking-wider pointer-events-none">
              Hasta:
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-20 pr-3 py-2.5 rounded-xl bg-[#e6e7ee] text-gray-700 text-xs font-medium border-none shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all appearance-none"
            />
          </div>
        </div>

        <button className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm rounded-xl shadow-[4px_4px_8px_rgba(16,185,129,0.3)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)] transition-all active:scale-95 group">
          <Check size={18} className="group-hover:scale-110 transition-transform" />
          <span>Aplicar Periodo</span>
        </button>
      </div>

      {/* Botones de Categorías - En un recuadro compartido y con altura optimizada */}
      <div className="bg-[#e6e7ee] p-5 rounded-[2rem] shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Insumos', icon: Package, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { label: 'Personal', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Administrativo', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          ].map((item, index) => (
            <button
              key={index}
              className="group relative bg-[#e6e7ee] px-4 py-3 rounded-2xl shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] hover:shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center ${item.color} shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] group-hover:scale-90 transition-transform duration-300`}>
                <item.icon size={18} />
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign size={16} className="text-gray-400" />
                <span className="text-sm font-bold text-gray-700" style={{ fontFamily: 'var(--font-manrope)' }}>
                  {item.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Placeholder para resultados futuros - Más compacto */}
      <div className="p-6 border-2 border-dashed border-gray-300 rounded-[2rem] flex flex-col items-center justify-center opacity-30">
        <p className="text-xs text-gray-500 font-medium italic">Selecciona un período y una categoría</p>
      </div>
    </div>
  );
}

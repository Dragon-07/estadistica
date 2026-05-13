'use client';

import { useState } from 'react';
import { Calendar, Check, Package, Users, Briefcase, DollarSign } from 'lucide-react';

export function ProfitabilityReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <div className="flex flex-col gap-10 animate-fade-in max-w-6xl mx-auto py-4">
      {/* Selector de Período - Estilo Neumórfico como la imagen */}
      <div className="bg-[#e6e7ee] p-8 rounded-[2.5rem] shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] flex flex-wrap items-center justify-center gap-6">
        <div className="flex items-center gap-4 flex-1 min-w-[280px]">
          <div className="relative flex-1 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none">
              <Calendar size={18} />
            </div>
            <span className="absolute left-11 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase tracking-wider pointer-events-none">
              Desde:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-24 pr-4 py-4 rounded-2xl bg-[#e6e7ee] text-gray-700 text-sm font-medium border-none shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all appearance-none"
            />
          </div>

          <div className="relative flex-1 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none">
              <Calendar size={18} />
            </div>
            <span className="absolute left-11 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase tracking-wider pointer-events-none">
              Hasta:
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-24 pr-4 py-4 rounded-2xl bg-[#e6e7ee] text-gray-700 text-sm font-medium border-none shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all appearance-none"
            />
          </div>
        </div>

        <button className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-2xl shadow-[4px_4px_10px_rgba(16,185,129,0.3)] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] transition-all active:scale-95 group">
          <Check size={20} className="group-hover:scale-110 transition-transform" />
          <span>Aplicar Periodo</span>
        </button>
      </div>

      {/* Botones de Categorías */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Insumos', icon: Package, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Personal', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Administrativo', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((item, index) => (
          <button
            key={index}
            className="group relative bg-[#e6e7ee] p-8 rounded-[2.5rem] shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] hover:shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] transition-all duration-300 flex flex-col items-center gap-4 border border-white/20 active:scale-95"
          >
            <div className={`w-16 h-16 rounded-2xl ${item.bg} flex items-center justify-center ${item.color} shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] group-hover:scale-90 transition-transform duration-300`}>
              <item.icon size={28} />
            </div>
            <div className="flex items-center gap-2">
              <DollarSign size={20} className="text-gray-400" />
              <span className="text-xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-manrope)' }}>
                {item.label}
              </span>
            </div>
            <div className="w-12 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      {/* Placeholder para resultados futuros */}
      <div className="mt-4 p-12 border-2 border-dashed border-gray-300 rounded-[3rem] flex flex-col items-center justify-center opacity-40">
        <p className="text-gray-500 font-medium italic">Selecciona un período y una categoría para ver el análisis detallado</p>
      </div>
    </div>
  );
}

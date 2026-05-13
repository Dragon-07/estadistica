'use client';

import { useState, useMemo } from 'react';
import { Calendar, Check, Package, Users, Briefcase, DollarSign, Search, Plus, Trash2, Save, X, UserPlus, Clock } from 'lucide-react';
import initialInsumos from '../data/insumos-data.json';
import initialPersonal from '../data/personal-data.json';

interface Insumo {
  id: string;
  detalle: string;
  medida: string;
  valor: number;
}

interface Worker {
  id: string;
  name: string;
  salary: number;
  minutesMonth: number;
  minutesWorked: number;
}

interface Dependency {
  dependency: string;
  staff: Worker[];
}

export function ProfitabilityReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // State for Insumos
  const [insumos, setInsumos] = useState<Insumo[]>(initialInsumos);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Personal
  const [personalData, setPersonalData] = useState<Dependency[]>(initialPersonal);

  // --- Lógica de Insumos ---
  const filteredInsumos = useMemo(() => {
    return insumos.filter(insumo => 
      insumo.detalle.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [insumos, searchTerm]);

  const handleUpdateInsumo = (id: string, field: keyof Insumo, value: string | number) => {
    setInsumos(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleAddInsumo = () => {
    const newInsumo: Insumo = {
      id: Math.random().toString(36).substr(2, 9),
      detalle: 'Nuevo Insumo',
      medida: '1',
      valor: 0
    };
    setInsumos([newInsumo, ...insumos]);
  };

  const handleDeleteInsumo = (id: string) => {
    setInsumos(prev => prev.filter(item => item.id !== id));
  };

  // --- Lógica de Personal ---
  const handleUpdateWorker = (depName: string, workerId: string, field: keyof Worker, value: string | number) => {
    setPersonalData(prev => prev.map(dep => {
      if (dep.dependency === depName) {
        return {
          ...dep,
          staff: dep.staff.map(w => w.id === workerId ? { ...w, [field]: value } : w)
        };
      }
      return dep;
    }));
  };

  const handleAddWorker = (depName: string) => {
    const newWorker: Worker = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Nuevo Trabajador',
      salary: 0,
      minutesMonth: 10080,
      minutesWorked: 0
    };
    setPersonalData(prev => prev.map(dep => 
      dep.dependency === depName ? { ...dep, staff: [...dep.staff, newWorker] } : dep
    ));
  };

  const handleDeleteWorker = (depName: string, workerId: string) => {
    setPersonalData(prev => prev.map(dep => 
      dep.dependency === depName ? { ...dep, staff: dep.staff.filter(w => w.id !== workerId) } : dep
    ));
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-6xl mx-auto py-2">
      {/* Contenedor Unificado: Selector + Botones */}
      <div className="bg-[#e6e7ee] p-5 rounded-[2.5rem] shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] flex flex-col gap-5">
        
        {/* Fila Superior: Selector de Período */}
        <div className="flex flex-wrap items-center justify-center gap-4">
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

        {/* Fila Inferior: Botones de Categorías */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'insumos', label: 'Insumos', icon: Package, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { id: 'personal', label: 'Personal', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { id: 'administrativo', label: 'Administrativo', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveCategory(activeCategory === item.id ? null : item.id)}
              className={`group relative px-4 py-3 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98] ${
                activeCategory === item.id 
                  ? 'bg-[#e6e7ee] shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff]' 
                  : 'bg-[#e6e7ee] shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] hover:shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff]'
              }`}
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

      {/* Sección Desplegable: Lista de Insumos */}
      {activeCategory === 'insumos' && (
        <div className="bg-[#e6e7ee] p-6 rounded-[2.5rem] shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar insumo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#e6e7ee] text-slate-700 text-sm shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] border-none focus:outline-none"
                />
              </div>
              <button 
                onClick={handleAddInsumo}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl shadow-[4px_4px_8px_rgba(59,130,246,0.3)] hover:shadow-none active:scale-95 transition-all font-bold text-xs"
              >
                <Plus size={16} />
                Agregar Insumo
              </button>
            </div>

            <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.15em] px-4">
                    <th className="pb-2 pl-6">Detalle del Insumo</th>
                    <th className="pb-2 w-20 text-center">Medida</th>
                    <th className="pb-2 w-32 text-right pr-6">Valor ($)</th>
                    <th className="pb-2 w-14 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInsumos.map((insumo) => (
                    <tr key={insumo.id} className="group transition-all">
                      <td className="bg-[#e6e7ee] shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] rounded-l-2xl p-2.5 pl-6 group-hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] transition-shadow">
                        <input
                          type="text"
                          value={insumo.detalle}
                          onChange={(e) => handleUpdateInsumo(insumo.id, 'detalle', e.target.value)}
                          className="w-full bg-transparent border-none focus:outline-none text-[12px] font-bold text-slate-700 placeholder-slate-400"
                        />
                      </td>
                      <td className="bg-[#e6e7ee] shadow-[0_4px_8px_#b8b9be,0_-4px_8px_#ffffff] p-2.5 group-hover:shadow-[inset_0_2px_4px_#b8b9be,inset_0_-2px_4px_#ffffff] transition-shadow">
                        <input
                          type="text"
                          value={insumo.medida}
                          onChange={(e) => handleUpdateInsumo(insumo.id, 'medida', e.target.value)}
                          className="w-full bg-transparent border-none focus:outline-none text-center text-[11px] font-bold text-slate-500"
                        />
                      </td>
                      <td className="bg-[#e6e7ee] shadow-[0_4px_8px_#b8b9be,0_-4px_8px_#ffffff] p-2.5 text-right pr-6 group-hover:shadow-[inset_0_2px_4px_#b8b9be,inset_0_-2px_4px_#ffffff] transition-shadow">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[11px] text-blue-500/50 font-black">$</span>
                          <input
                            type="number"
                            value={insumo.valor}
                            onChange={(e) => handleUpdateInsumo(insumo.id, 'valor', parseFloat(e.target.value))}
                            className="w-24 bg-transparent border-none focus:outline-none text-right text-[12px] font-black text-blue-600"
                          />
                        </div>
                      </td>
                      <td className="bg-[#e6e7ee] shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] rounded-r-2xl p-2.5 text-center group-hover:shadow-[inset_-2px_2px_5px_#b8b9be,inset_2px_-2px_5px_#ffffff] transition-shadow">
                        <button onClick={() => handleDeleteInsumo(insumo.id)} className="text-slate-400 hover:text-red-500 transition-all hover:scale-110 active:scale-90 p-1">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sección Desplegable: Sistema de Salario por Tiempo (Personal) */}
      {activeCategory === 'personal' && (
        <div className="bg-[#e6e7ee] p-6 rounded-[2.5rem] shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-8">
            {personalData.map((dep) => (
              <div key={dep.dependency} className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-sm font-black text-slate-600 flex items-center gap-2 uppercase tracking-widest">
                    <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                    {dep.dependency}
                  </h3>
                  <button 
                    onClick={() => handleAddWorker(dep.dependency)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#e6e7ee] text-blue-600 rounded-xl shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff] transition-all text-[10px] font-black"
                  >
                    <UserPlus size={14} />
                    Agregar a {dep.dependency}
                  </button>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                        <th className="pb-1 pl-6">Nombre del Personal</th>
                        <th className="pb-1 w-28 text-right">Sueldo Base</th>
                        <th className="pb-1 w-20 text-center">Mins Mes</th>
                        <th className="pb-1 w-20 text-center text-blue-500">$ Minuto</th>
                        <th className="pb-1 w-24 text-center text-emerald-600">Mins Trabaja</th>
                        <th className="pb-1 w-24 text-center text-orange-500">Mins No Trabaja</th>
                        <th className="pb-1 w-32 text-right pr-6 text-blue-700">$ A Distribuir</th>
                        <th className="pb-1 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dep.staff.map((worker) => {
                        const pricePerMinute = worker.salary / worker.minutesMonth;
                        const minutesNotWorked = worker.minutesMonth - worker.minutesWorked;
                        const toDistribute = worker.minutesWorked * pricePerMinute;

                        return (
                          <tr key={worker.id} className="group">
                            <td className="bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] rounded-l-xl p-2 pl-6">
                              <input
                                type="text"
                                value={worker.name}
                                onChange={(e) => handleUpdateWorker(dep.dependency, worker.id, 'name', e.target.value)}
                                className="w-full bg-transparent border-none focus:outline-none text-[11px] font-bold text-slate-700"
                              />
                            </td>
                            <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-right">
                              <input
                                type="number"
                                value={worker.salary}
                                onChange={(e) => handleUpdateWorker(dep.dependency, worker.id, 'salary', parseFloat(e.target.value))}
                                className="w-full bg-transparent border-none focus:outline-none text-right text-[11px] font-black text-slate-600"
                              />
                            </td>
                            <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center">
                              <input
                                type="number"
                                value={worker.minutesMonth}
                                onChange={(e) => handleUpdateWorker(dep.dependency, worker.id, 'minutesMonth', parseFloat(e.target.value))}
                                className="w-full bg-transparent border-none focus:outline-none text-center text-[11px] font-black text-indigo-600"
                              />
                            </td>
                            <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center text-[11px] font-black text-blue-500/70">
                              {pricePerMinute.toFixed(2)}
                            </td>
                            <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center">
                              <input
                                type="number"
                                value={worker.minutesWorked}
                                onChange={(e) => handleUpdateWorker(dep.dependency, worker.id, 'minutesWorked', parseFloat(e.target.value))}
                                className="w-full bg-transparent border-none focus:outline-none text-center text-[11px] font-black text-emerald-600"
                              />
                            </td>
                            <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center text-[11px] font-black text-orange-400">
                              {minutesNotWorked}
                            </td>
                            <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-right pr-6 text-[11px] font-black text-blue-700">
                              {formatCurrency(toDistribute)}
                            </td>
                            <td className="bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] rounded-r-xl p-2 text-center">
                              <button onClick={() => handleDeleteWorker(dep.dependency, worker.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Fila de Totales por Dependencia */}
                      {(() => {
                        const totalSalary = dep.staff.reduce((acc, w) => acc + w.salary, 0);
                        const totalMinsMes = dep.staff.reduce((acc, w) => acc + w.minutesMonth, 0);
                        const totalMinsTrabaja = dep.staff.reduce((acc, w) => acc + w.minutesWorked, 0);
                        const totalMinsNoTrabaja = totalMinsMes - totalMinsTrabaja;
                        const totalToDistribute = dep.staff.reduce((acc, w) => {
                          const priceMin = w.salary / w.minutesMonth;
                          return acc + (w.minutesWorked * priceMin);
                        }, 0);
                        const avgPriceMin = totalMinsMes > 0 ? totalSalary / totalMinsMes : 0;

                        return (
                          <tr className="bg-slate-200/50">
                            <td className="p-2 pl-6 rounded-l-xl text-[10px] font-black text-slate-500 uppercase tracking-wider">
                              Totales {dep.dependency}
                            </td>
                            <td className="p-2 text-right text-[11px] font-black text-slate-600">
                              {formatCurrency(totalSalary)}
                            </td>
                            <td className="p-2 text-center text-[11px] font-black text-slate-500">
                              {totalMinsMes}
                            </td>
                            <td className="p-2 text-center text-[11px] font-black text-blue-600">
                              {avgPriceMin.toFixed(2)}
                            </td>
                            <td className="p-2 text-center text-[11px] font-black text-emerald-700">
                              {totalMinsTrabaja}
                            </td>
                            <td className="p-2 text-center text-[11px] font-black text-orange-600">
                              {totalMinsNoTrabaja}
                            </td>
                            <td className="p-2 text-right pr-6 rounded-r-xl text-[11px] font-black text-blue-800">
                              {formatCurrency(totalToDistribute)}
                            </td>
                            <td></td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Gran Total Final */}
            <div className="mt-4 p-5 rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-700 shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                  <DollarSign size={24} />
                </div>
                <div>
                  <h4 className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Costo Total de Personal</h4>
                  <p className="text-white text-xl font-black tracking-tight">Gran Total a Distribuir</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-white text-3xl font-black tracking-tighter">
                  {formatCurrency(personalData.reduce((acc, dep) => 
                    acc + dep.staff.reduce((sAcc, w) => sAcc + (w.minutesWorked * (w.salary / w.minutesMonth)), 0)
                  , 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder para otras categorías */}
      {activeCategory && activeCategory === 'administrativo' && (
        <div className="p-12 border-2 border-dashed border-gray-300 rounded-[2.5rem] flex flex-col items-center justify-center opacity-30 animate-in fade-in duration-500">
          <p className="text-gray-500 font-medium italic">Configuración de Administrativo próximamente...</p>
        </div>
      )}

      {/* Estado Inicial */}
      {!activeCategory && (
        <div className="p-12 border-2 border-dashed border-gray-300 rounded-[2.5rem] flex flex-col items-center justify-center opacity-20">
          <p className="text-gray-500 font-medium italic">Selecciona una categoría para gestionar los costos de referencia</p>
        </div>
      )}
    </div>
  );
}

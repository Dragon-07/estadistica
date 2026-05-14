'use client';

import { useState, useMemo } from 'react';
import { Calendar, Check, Package, Users, Briefcase, DollarSign, Search, Plus, Trash2, Save, X, UserPlus, Clock, Edit3 } from 'lucide-react';
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
  overrideMinsWorked?: number;
}

interface AdminCost {
  id: string;
  detail: string;
  cost: number;
  units: number;
  consumption: number;
}

const initialAdminData: AdminCost[] = [
  { id: '1', detail: 'ENERGÍA', cost: 900000, units: 1122, consumption: 500 },
  { id: '2', detail: 'ARRIENDO', cost: 5000000, units: 1, consumption: 0 },
  { id: '3', detail: 'AGUA', cost: 1000000, units: 1, consumption: 0 },
];

export function ProfitabilityReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const [insumos, setInsumos] = useState<Insumo[]>(initialInsumos);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [personalData, setPersonalData] = useState<Dependency[]>(initialPersonal);
  const [adminData, setAdminData] = useState<AdminCost[]>(initialAdminData);

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

  const handleUpdateDependency = (depName: string, field: keyof Dependency, value: any) => {
    setPersonalData(prev => prev.map(dep => 
      dep.dependency === depName ? { ...dep, [field]: value } : dep
    ));
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

  const handleUpdateAdmin = (id: string, field: keyof AdminCost, value: string | number) => {
    setAdminData(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleAddAdmin = () => {
    const newItem: AdminCost = {
      id: Date.now().toString(),
      detail: 'NUEVO COSTO',
      cost: 0,
      units: 1,
      consumption: 0
    };
    setAdminData(prev => [...prev, newItem]);
  };

  const handleDeleteAdmin = (id: string) => {
    setAdminData(prev => prev.filter(item => item.id !== id));
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-6xl mx-auto py-2">
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
            { id: 'administrativo', label: 'Administrativo', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
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

      {/* Rejilla de Servicios y Costos Consolidados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
        {[
          { title: 'acupuntura', insumos: 1500, personal: 5000, admin: 1000 },
          { title: 'TERAPIA NEURAL', insumos: 1500, personal: 5000, admin: 1000 },
          { title: 'SUERO VITAMINA C', insumos: 1500, personal: 5000, admin: 1000 },
        ].map((service, idx) => (
          <div key={idx} className="bg-[#e6e7ee] p-6 rounded-[2.5rem] shadow-[15px_15px_30px_#b8b9be,-15px_-15px_30px_#ffffff] border border-white/40 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${idx * 150}ms` }}>
            {/* Título del Servicio */}
            <div className="bg-[#e6e7ee] shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] p-4 rounded-2xl text-center">
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">{service.title}</h4>
            </div>

            {/* Detalles de Costos */}
            <div className="space-y-3">
              {[
                { label: '$ Insumos', value: service.insumos, color: 'text-orange-500' },
                { label: '$ Personal', value: service.personal, color: 'text-blue-500' },
                { label: '$ Administrati', value: service.admin, color: 'text-emerald-500' },
              ].map((row, rIdx) => (
                <div key={rIdx} className="flex items-stretch">
                  <div className="bg-[#e6e7ee] shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] px-4 py-2 rounded-l-xl flex-1 flex items-center">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">{row.label}</span>
                  </div>
                  <div className="bg-[#e6e7ee] shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] px-4 py-2 rounded-r-xl w-28 flex items-center justify-end">
                    <span className={`text-[13px] font-black ${row.color}`}>{row.value.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
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
            {personalData.map((dep) => {
              const totalSalary = dep.staff.reduce((acc, w) => acc + w.salary, 0);
              const totalMinsMes = dep.staff.reduce((acc, w) => acc + w.minutesMonth, 0);
              const staffMinsTrabaja = dep.staff.reduce((acc, w) => acc + w.minutesWorked, 0);
              const totalMinsTrabaja = dep.overrideMinsWorked !== undefined ? dep.overrideMinsWorked : staffMinsTrabaja;
              const totalMinsNoTrabaja = totalMinsMes - totalMinsTrabaja;
              
              const avgPriceMin = totalMinsMes > 0 ? totalSalary / totalMinsMes : 0;
              const depTotalToDistribute = totalMinsNoTrabaja * avgPriceMin;
              
              return (
                <div key={dep.dependency} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-sm font-black text-slate-600 flex items-center gap-2 uppercase tracking-widest">
                        <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                        {dep.dependency}
                      </h3>
                      <div className="px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter mr-2">Subtotal:</span>
                        <span className="text-xs font-black text-blue-700">{formatCurrency(depTotalToDistribute)}</span>
                      </div>
                    </div>
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
                          <th className="pb-1 w-32 text-right pr-6 text-blue-700 bg-blue-500/5 rounded-t-xl">$ A Distribuir</th>
                          <th className="pb-1 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dep.staff.map((worker) => {
                          const salary = worker.salary || 0;
                          const minsMes = worker.minutesMonth || 1;
                          const pricePerMinute = salary / minsMes;

                          return (
                            <tr key={worker.id} className="group">
                              <td className="bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] rounded-l-xl p-2 pl-6">
                                <div className="relative group/input">
                                  <input
                                    type="text"
                                    value={worker.name}
                                    onChange={(e) => handleUpdateWorker(dep.dependency, worker.id, 'name', e.target.value)}
                                    className="w-full bg-white/60 shadow-inner rounded-lg pl-2 pr-6 py-1 border border-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all text-[11px] font-bold text-slate-700"
                                  />
                                  <Edit3 className="absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-400 opacity-40 group-hover/input:opacity-100 transition-opacity" size={10} />
                                </div>
                              </td>
                              <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-right">
                                <div className="relative group/input">
                                  <input
                                    type="number"
                                    value={worker.salary}
                                    onChange={(e) => handleUpdateWorker(dep.dependency, worker.id, 'salary', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white/60 shadow-inner rounded-lg pl-2 pr-6 py-1 border border-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all text-right text-[11px] font-black text-slate-600"
                                  />
                                  <Edit3 className="absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-400 opacity-40 group-hover/input:opacity-100 transition-opacity" size={10} />
                                </div>
                              </td>
                              <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center">
                                <div className="relative group/input">
                                  <input
                                    type="number"
                                    value={worker.minutesMonth}
                                    onChange={(e) => handleUpdateWorker(dep.dependency, worker.id, 'minutesMonth', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-indigo-50/10 shadow-inner rounded-lg px-2 py-1 border border-indigo-200/30 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all text-center text-[11px] font-black text-indigo-600"
                                  />
                                  <Edit3 className="absolute right-1 top-1/2 -translate-y-1/2 text-indigo-400 opacity-30" size={8} />
                                </div>
                              </td>
                              <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center text-[11px] font-black text-blue-500/70">
                                {pricePerMinute.toFixed(2)}
                              </td>
                              {/* Celdas ahora vacías por solicitud del usuario */}
                              <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center text-[11px] font-black text-emerald-600/30">
                                -
                              </td>
                              <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center text-[11px] font-black text-orange-400/30">
                                -
                              </td>
                              <td className="bg-blue-500/5 shadow-[inset_1px_1px_3px_rgba(59,130,246,0.05)] p-2 text-right pr-3 text-[11px] font-black text-blue-700/20 border-x border-blue-500/10 w-24">
                                -
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
                          const safeMinsNoTrabaja = Math.max(0, totalMinsNoTrabaja);
                          return (
                          <tr className="bg-slate-200/40">
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
                            <td className="p-2 text-center">
                              <div className="relative group/input max-w-[90px] mx-auto">
                                <input
                                  type="number"
                                  value={totalMinsTrabaja}
                                  onChange={(e) => handleUpdateDependency(dep.dependency, 'overrideMinsWorked', parseFloat(e.target.value) || 0)}
                                  className={`w-full bg-white/50 shadow-inner rounded-lg pl-2 pr-6 py-1 border border-emerald-300/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 transition-all text-center text-[11px] font-black text-emerald-600 ${dep.overrideMinsWorked !== undefined ? 'underline decoration-dotted' : ''}`}
                                />
                                <Edit3 className="absolute right-1.5 top-1/2 -translate-y-1/2 text-emerald-500 opacity-40" size={10} />
                              </div>
                            </td>
                            <td className="p-2 text-center text-[11px] font-black text-orange-600">
                              {safeMinsNoTrabaja}
                            </td>
                            <td className="p-2 text-right pr-4 rounded-r-xl">
                              <div className="bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] border border-blue-200/50 px-3 py-2 rounded-xl text-[12px] font-black text-blue-600 inline-block min-w-[100px]">
                                {formatCurrency(depTotalToDistribute)}
                              </div>
                            </td>
                            <td></td>
                          </tr>
                        )})()}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Gran Total Final Refinado */}
            <div className="mt-6 p-4 px-8 rounded-3xl bg-[#e6e7ee] shadow-[6px_6px_15px_#b8b9be,-6px_-6px_15px_#ffffff] flex items-center justify-between border border-white/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-inner border border-blue-200/20">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="text-blue-700 text-lg font-black tracking-tight leading-none">Total a Distribuir</p>
                </div>
              </div>
              <div className="text-right bg-blue-500/5 px-5 py-2 rounded-xl border border-blue-500/10 shadow-inner">
                <span className="text-blue-600 text-2xl font-black tracking-tighter">
                  {formatCurrency(personalData.reduce((acc, dep) => {
                    const totalSalary = dep.staff.reduce((sAcc, w) => sAcc + w.salary, 0);
                    const totalMinsMes = dep.staff.reduce((sAcc, w) => sAcc + w.minutesMonth, 0);
                    const avgPriceMin = totalMinsMes > 0 ? totalSalary / totalMinsMes : 0;
                    
                    const depMinsTrabaja = dep.overrideMinsWorked !== undefined 
                      ? dep.overrideMinsWorked 
                      : dep.staff.reduce((sAcc, w) => sAcc + w.minutesWorked, 0);
                    
                    const depMinsNoTrabaja = totalMinsMes - depMinsTrabaja;
                    
                    return acc + (depMinsNoTrabaja * avgPriceMin);
                  }, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Módulo Administrativo */}
      {activeCategory && activeCategory === 'administrativo' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-[#e6e7ee] p-8 rounded-[3rem] shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] border border-white/50 relative overflow-hidden">
            <div className="flex justify-between items-center mb-8 px-2">
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-10 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)]" />
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Costos Administrativos</h3>
                  <p className="text-slate-500 text-sm font-medium">Gestión de servicios y gastos generales</p>
                </div>
              </div>
              <button 
                onClick={handleAddAdmin}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#e6e7ee] shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] hover:shadow-[inset_4px_4px_10px_#b8b9be,inset_-4px_-4px_10px_#ffffff] rounded-2xl text-blue-600 text-xs font-black uppercase tracking-widest transition-all group"
              >
                <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                Agregar Item
              </button>
            </div>

            <div className="overflow-x-auto rounded-3xl">
              <table className="w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-6 py-4 text-left font-black">Detalle del Gasto</th>
                    <th className="px-4 py-4 text-right font-black">Costo Total</th>
                    <th className="px-4 py-4 text-center font-black">Unidades</th>
                    <th className="px-4 py-4 text-center font-black">$ Unidad</th>
                    <th className="px-4 py-4 text-center font-black">Consumo</th>
                    <th className="px-4 py-4 text-right pr-6 font-black">$ a Distribuir</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.map((item) => {
                    const pricePerUnit = item.units > 0 ? item.cost / item.units : 0;
                    const toDistribute = (item.units - item.consumption) * pricePerUnit;

                    return (
                      <tr key={item.id} className="group">
                        <td className="bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] rounded-l-xl p-2 pl-6">
                          <div className="relative group/input">
                            <input
                              type="text"
                              value={item.detail}
                              onChange={(e) => handleUpdateAdmin(item.id, 'detail', e.target.value)}
                              className="w-full bg-white/60 shadow-inner rounded-lg pl-2 pr-6 py-1.5 border border-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all text-[11px] font-bold text-slate-700"
                            />
                            <Edit3 className="absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-400 opacity-40 group-hover/input:opacity-100 transition-opacity" size={10} />
                          </div>
                        </td>
                        <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-right">
                          <div className="relative group/input">
                            <input
                              type="number"
                              value={item.cost}
                              onChange={(e) => handleUpdateAdmin(item.id, 'cost', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white/60 shadow-inner rounded-lg pl-2 pr-6 py-1.5 border border-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all text-right text-[11px] font-black text-slate-600"
                            />
                            <Edit3 className="absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-400 opacity-40 group-hover/input:opacity-100 transition-opacity" size={10} />
                          </div>
                        </td>
                        <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center">
                          <div className="relative group/input max-w-[80px] mx-auto">
                            <input
                              type="number"
                              value={item.units}
                              onChange={(e) => handleUpdateAdmin(item.id, 'units', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white/60 shadow-inner rounded-lg px-2 py-1.5 border border-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all text-center text-[11px] font-black text-slate-500"
                            />
                            <Edit3 className="absolute right-1 top-1/2 -translate-y-1/2 text-blue-400 opacity-30" size={8} />
                          </div>
                        </td>
                        <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center text-[11px] font-black text-blue-500/70">
                          {pricePerUnit.toFixed(2)}
                        </td>
                        <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center">
                          <div className="relative group/input max-w-[80px] mx-auto">
                            <input
                              type="number"
                              value={item.consumption}
                              onChange={(e) => handleUpdateAdmin(item.id, 'consumption', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white/60 shadow-inner rounded-lg px-2 py-1.5 border border-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all text-center text-[11px] font-black text-orange-600"
                            />
                            <Edit3 className="absolute right-1 top-1/2 -translate-y-1/2 text-blue-400 opacity-30" size={8} />
                          </div>
                        </td>
                        <td className="p-2 text-right pr-6">
                          <div className="bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] border border-blue-200/50 px-3 py-2 rounded-xl text-[12px] font-black text-blue-600 inline-block min-w-[100px]">
                            {formatCurrency(toDistribute)}
                          </div>
                        </td>
                        <td className="bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] rounded-r-xl p-2 text-center">
                          <button onClick={() => handleDeleteAdmin(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-8 p-4 px-8 rounded-3xl bg-[#e6e7ee] shadow-[6px_6px_15px_#b8b9be,-6px_-6px_15px_#ffffff] flex items-center justify-between border border-white/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-inner border border-blue-200/20">
                  <Briefcase size={20} />
                </div>
                <div>
                  <p className="text-blue-700 text-lg font-black tracking-tight leading-none">Total a Distribuir</p>
                </div>
              </div>
              <div className="text-right bg-blue-500/5 px-5 py-2 rounded-xl border border-blue-500/10 shadow-inner">
                <span className="text-blue-600 text-2xl font-black tracking-tighter">
                  {formatCurrency(adminData.reduce((acc, item) => {
                    const pricePerUnit = item.units > 0 ? item.cost / item.units : 0;
                    return acc + ((item.units - item.consumption) * pricePerUnit);
                  }, 0))}
                </span>
              </div>
            </div>
          </div>
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

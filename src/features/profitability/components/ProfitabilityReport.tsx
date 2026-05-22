'use client';

import { useState, useMemo, useEffect, Fragment, useRef } from 'react';
import { Calendar, Check, Package, Users, Briefcase, DollarSign, Search, Plus, Trash2, Save, X, UserPlus, Clock, Edit3 } from 'lucide-react';
import { createClient } from '@/shared/lib/supabase/client';
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
  weeklyHours?: number;
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

/** Parseo inteligente de números */
function smartParseNumber(raw: unknown): number {
  if (raw === undefined || raw === null || String(raw).trim() === '') return 0;
  if (typeof raw === 'number') return raw;

  let cleaned = String(raw).replace(/[$\s]/g, '');
  
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasDot) {
    const parts = cleaned.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      // decimal
    } else {
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

const initialAdminData: AdminCost[] = [
  { id: '1', detail: 'ENERGÍA', cost: 900000, units: 1122, consumption: 500 },
  { id: '2', detail: 'ARRIENDO', cost: 5000000, units: 1, consumption: 0 },
  { id: '3', detail: 'AGUA', cost: 1000000, units: 1, consumption: 0 },
];

function NeumorphicTooltip({ text, children, position = 'top' }: { text: string; children: React.ReactNode, position?: 'top' | 'bottom' }) {
  return (
    <div className="relative group/tooltip flex-1 min-w-0">
      {children}
      <div className={`absolute z-[9999] left-0 px-4 py-2.5 bg-[#e6e7ee] rounded-xl shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff] border border-white/60 invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 pointer-events-none w-max whitespace-nowrap ${
        position === 'top' ? 'bottom-full mb-4' : 'top-full mt-4'
      }`}>
        <div className="flex flex-col">
          <p className="text-[11px] font-black text-slate-800 leading-none tracking-tight">{text}</p>
        </div>
        {/* Triángulo dinámico */}
        <div className={`absolute left-6 w-4 h-4 bg-[#e6e7ee] rotate-45 border-white/30 shadow-[4px_4px_8px_rgba(0,0,0,0.1)] ${
          position === 'top' 
            ? '-bottom-2 border-r border-b' 
            : '-top-2 border-l border-t'
        }`}></div>
      </div>
    </div>
  );
}

function NeumorphicExplanationTooltip({ title, formula, text, children, position = 'top' }: { title: string; formula?: string; text: string; children: React.ReactNode, position?: 'top' | 'bottom' }) {
  return (
    <div className="relative group/tooltip inline-block w-full">
      {children}
      <div className={`absolute z-[9999] left-1/2 -translate-x-1/2 px-4 py-3 bg-[#e6e7ee] rounded-2xl shadow-[10px_10px_25px_#b8b9be,-10px_-10px_25px_#ffffff] border border-white/70 invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 pointer-events-none w-80 text-left ${
        position === 'top' ? 'bottom-full mb-4' : 'top-full mt-4'
      }`}>
        <div className="flex flex-col gap-1.5 whitespace-normal">
          <p className="text-[11px] font-black text-slate-850 uppercase tracking-wider">{title}</p>
          {formula && (
            <div className="bg-[#dcdde4] px-2.5 py-1.5 rounded-lg border border-white/40 shadow-inner font-mono text-[10px] font-bold text-blue-700 leading-tight">
              {formula}
            </div>
          )}
          <p className="text-[10px] font-semibold text-slate-600 leading-relaxed">{text}</p>
        </div>
        {/* Triángulo centrado */}
        <div className={`absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-[#e6e7ee] rotate-45 border-white/30 shadow-[3px_3px_6px_rgba(0,0,0,0.08)] ${
          position === 'top' 
            ? '-bottom-1.5 border-r border-b' 
            : '-top-1.5 border-l border-t'
        }`}></div>
      </div>
    </div>
  );
}


export function ProfitabilityReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedDateRange, setAppliedDateRange] = useState({ start: '', end: '' });
  const [globalDateRange, setGlobalDateRange] = useState({ start: '', end: '' });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeService, setActiveService] = useState<string | null>(null);
  const [weeklyHours, setWeeklyHours] = useState<number>(44);
  const [editingKw, setEditingKw] = useState<{ serviceName: string; id: string; value: string } | null>(null);
  
  const [serviceRevenueStats, setServiceRevenueStats] = useState<Record<string, { count: number, revenue: number }>>({});
  const fetchedStats = useRef<Set<string>>(new Set());

  const handleApplyPeriod = () => {
    setAppliedDateRange({ start: startDate, end: endDate });
    fetchedStats.current.clear();
  };

  const getPeriodMinutes = (customHours?: number) => {
    const startStr = appliedDateRange.start || globalDateRange.start;
    const endStr = appliedDateRange.end || globalDateRange.end;
    let daysToCount = 26; // Default fallback
    
    if (startStr && endStr) {
      const start = new Date(startStr + 'T12:00:00');
      const end = new Date(endStr + 'T12:00:00');
      
      if (end >= start) {
        let workDays = 0;
        let current = new Date(start);
        
        while (current <= end) {
          const day = current.getDay();
          if (day !== 0) { // Lunes a Sábado
            workDays++;
          }
          current.setDate(current.getDate() + 1);
        }
        daysToCount = workDays;
      }
    }
    
    const hoursToUse = (customHours !== undefined && customHours > 0) ? customHours : weeklyHours;
    const hoursPerDay = hoursToUse / 6;
    return Math.round(daysToCount * hoursPerDay * 60);
  };

  const periodMonthFactor = useMemo(() => {
    const startStr = appliedDateRange.start || globalDateRange.start;
    const endStr = appliedDateRange.end || globalDateRange.end;
    let daysToCount = 26; // Default fallback
    
    if (startStr && endStr) {
      const start = new Date(startStr + 'T12:00:00');
      const end = new Date(endStr + 'T12:00:00');
      
      if (end >= start) {
        let workDays = 0;
        let current = new Date(start);
        
        while (current <= end) {
          const day = current.getDay();
          if (day !== 0) { // Lunes a Sábado
            workDays++;
          }
          current.setDate(current.getDate() + 1);
        }
        daysToCount = workDays;
      }
    }
    return daysToCount / 26;
  }, [appliedDateRange, globalDateRange]);

  const [insumos, setInsumos] = useState<Insumo[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('profitability_insumos');
      return saved ? JSON.parse(saved) : initialInsumos;
    }
    return initialInsumos;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showInsumoDropdown, setShowInsumoDropdown] = useState(false);
  const [insumoSearchQuery, setInsumoSearchQuery] = useState('');
  const insumoDropdownRef = useRef<HTMLDivElement>(null);

  const [showTreatmentDropdown, setShowTreatmentDropdown] = useState(false);
  const [treatmentSearchQuery, setTreatmentSearchQuery] = useState('');
  const treatmentDropdownRef = useRef<HTMLDivElement>(null);
  
  const [personalData, setPersonalData] = useState<Dependency[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('profitability_personal');
      return saved ? JSON.parse(saved) : initialPersonal;
    }
    return initialPersonal;
  });
  
  const [adminData, setAdminData] = useState<AdminCost[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('profitability_admin');
      return saved ? JSON.parse(saved) : initialAdminData;
    }
    return initialAdminData;
  });

  // Estados para el Listado de Distribución (Plan C)
  const [distributionData, setDistributionData] = useState<any[]>([]);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [distSearchQuery, setDistSearchQuery] = useState('');
  const [distCurrentPage, setDistCurrentPage] = useState(1);
  const [distSortOrder, setDistSortOrder] = useState('allocMixedDesc');

  // Estados para el Listado de Distribución (Plan C - Administrativo)
  const [isAdminListOpen, setIsAdminListOpen] = useState(false);
  const [adminDistSearchQuery, setAdminDistSearchQuery] = useState('');
  const [adminDistCurrentPage, setAdminDistCurrentPage] = useState(1);
  const [adminDistSortOrder, setAdminDistSortOrder] = useState('allocMixedDesc');

  // Estados dinámicos para los tratamientos
  const [availableTreatments, setAvailableTreatments] = useState<string[]>([]);
  const [activeDashboardTreatments, setActiveDashboardTreatments] = useState<string[]>(['acupuntura', 'TERAPIA NEURAL', 'SUERO VITAMINA C']);

  useEffect(() => {
    async function loadServiceStats() {
      const supabaseClient = createClient();
      
      for (const treatment of activeDashboardTreatments) {
        if (fetchedStats.current.has(treatment)) continue;
        
        let records: any[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
          let query = supabaseClient
            .from('medical_records')
            .select('extra_data, treatment_date')
            .eq('treatment_name', treatment);
            
          if (appliedDateRange.start) {
            query = query.gte('treatment_date', appliedDateRange.start);
          }
          if (appliedDateRange.end) {
            query = query.lte('treatment_date', appliedDateRange.end);
          }

          const { data, error } = await query.range(from, from + step - 1);

          if (error) { console.error(error); break; }
          if (data && data.length > 0) {
            records = [...records, ...data];
            from += step;
            if (data.length < step) hasMore = false;
          } else {
            hasMore = false;
          }
        }

        let count = records.length;
        let revenue = records.reduce((acc, r) => {
          return acc + smartParseNumber(r.extra_data?.['Total final']);
        }, 0);

        setServiceRevenueStats(prev => ({ ...prev, [treatment]: { count, revenue } }));
        fetchedStats.current.add(treatment);
      }
    }
    loadServiceStats();
  }, [activeDashboardTreatments, appliedDateRange]);
  
  // Estado para los insumos asignados a cada servicio
  const [serviceInsumos, setServiceInsumos] = useState<Record<string, { id: string; insumoId: string; cantidad: number }[]>>({
    'acupuntura': [],
    'TERAPIA NEURAL': [],
    'SUERO VITAMINA C': [],
  });

  // Estado para los tiempos y valores de personal por servicio
  const [serviceStaffTimes, setServiceStaffTimes] = useState<Record<string, { id: string, tipo: string, mins: number, valor: number }[]>>({
    'acupuntura': [
      { id: '1', tipo: 'Doctor', mins: 0, valor: 0 },
      { id: '2', tipo: 'Enfermera', mins: 0, valor: 0 },
    ],
    'TERAPIA NEURAL': [
      { id: '1', tipo: 'Doctor', mins: 0, valor: 0 },
      { id: '2', tipo: 'Enfermera', mins: 0, valor: 0 },
    ],
    'SUERO VITAMINA C': [
      { id: '1', tipo: 'Doctor', mins: 0, valor: 0 },
      { id: '2', tipo: 'Enfermera', mins: 0, valor: 0 },
    ],
  });

  // Estado para los costos administrativos por servicio
  const [serviceAdminCosts, setServiceAdminCosts] = useState<Record<string, { id: string, adminId: string, valor: number, kw?: number }[]>>({
    'acupuntura': [{ id: 'energia', adminId: '1', valor: 0, kw: 0 }],
    'TERAPIA NEURAL': [{ id: 'energia', adminId: '1', valor: 0, kw: 0 }],
    'SUERO VITAMINA C': [{ id: 'energia', adminId: '1', valor: 0, kw: 0 }],
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const supabase = createClient();

  // Función para guardar en Supabase (compartido)
  const saveToSupabase = async (serviceName: string, staffTimes: any, insumos: any, adminCosts?: any) => {
    setIsSyncing(true);
    const { error } = await supabase
      .from('service_settings')
      .upsert({
        service_name: serviceName,
        staff_times: staffTimes,
        insumos: insumos,
        admin_costs: adminCosts || serviceAdminCosts[serviceName] || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'service_name' });
    
    if (error) console.error('Error syncing with Supabase:', error);
    setIsSyncing(false);
  };

  const handleAddTreatment = (name: string) => {
    if (!name || activeDashboardTreatments.includes(name)) return;
    
    setActiveDashboardTreatments(prev => [...prev, name]);
    
    const defaultStaff = [
      { id: Math.random().toString(), tipo: 'Doctor', mins: 0, valor: 0 },
      { id: Math.random().toString(), tipo: 'Enfermera', mins: 0, valor: 0 },
    ];

    const defaultAdmin = [{ id: 'energia', adminId: '1', valor: 0, kw: 0 }];

    // Inicializar los estados del nuevo tratamiento si no existen
    if (!serviceInsumos[name]) {
      setServiceInsumos(prev => ({ ...prev, [name]: [] }));
    }
    if (!serviceStaffTimes[name]) {
      setServiceStaffTimes(prev => ({
        ...prev,
        [name]: defaultStaff
      }));
    }
    if (!serviceAdminCosts[name]) {
      setServiceAdminCosts(prev => ({ ...prev, [name]: defaultAdmin }));
    }

    // Persistir el nuevo tratamiento en la base de datos
    saveToSupabase(
      name, 
      serviceStaffTimes[name] || defaultStaff, 
      serviceInsumos[name] || [], 
      serviceAdminCosts[name] || defaultAdmin
    );
  };

  const handleRemoveTreatment = async (name: string) => {
    setActiveDashboardTreatments(prev => prev.filter(t => t !== name));
    if (activeService === name) setActiveService(null);

    // Eliminar de Supabase para que no vuelva a cargar al refrescar
    setIsSyncing(true);
    const { error } = await supabase
      .from('service_settings')
      .delete()
      .eq('service_name', name);
    
    if (error) console.error('Error deleting from Supabase:', error);
    setIsSyncing(false);
  };

  // Cargar datos desde Supabase al montar
  useEffect(() => {
    async function loadData() {
      // Cargar tratamientos únicos de Supabase
      const { data: treatmentsData } = await supabase.rpc('get_unique_treatments');
      if (treatmentsData) {
        setAvailableTreatments(treatmentsData.map((d: any) => d.treatment_name));
      }

      // Cargar fechas globales (min y max)
      const { data: minData } = await supabase
        .from('medical_records')
        .select('treatment_date')
        .not('treatment_date', 'is', null)
        .order('treatment_date', { ascending: true })
        .limit(1);

      const { data: maxData } = await supabase
        .from('medical_records')
        .select('treatment_date')
        .not('treatment_date', 'is', null)
        .order('treatment_date', { ascending: false })
        .limit(1);

      if (minData?.[0] && maxData?.[0]) {
        setGlobalDateRange({
          start: minData[0].treatment_date,
          end: maxData[0].treatment_date
        });
      }

      // Cargar configuraciones de servicio
      const { data, error } = await supabase
        .from('service_settings')
        .select('*');
      
      if (data && data.length > 0) {
        const newInsumos: Record<string, any> = { ...serviceInsumos };
        const newStaffTimes: Record<string, any> = { ...serviceStaffTimes };
        const newAdminCosts: Record<string, any> = { ...serviceAdminCosts };
        const loadedTreatments: string[] = [];
        
        data.forEach(setting => {
          loadedTreatments.push(setting.service_name);
          if (setting.insumos) newInsumos[setting.service_name] = setting.insumos;
          if (setting.staff_times) newStaffTimes[setting.service_name] = setting.staff_times;
          
          let costs = setting.admin_costs;
          if (!costs || !Array.isArray(costs) || costs.length === 0) {
            costs = [{ id: 'energia', adminId: '1', valor: 0, kw: 0 }];
          } else {
            const hasEnergia = costs.some((c: any) => c.id === 'energia' || c.adminId === '1');
            if (!hasEnergia) {
              costs = [{ id: 'energia', adminId: '1', valor: 0, kw: 0 }, ...costs];
            }
          }
          newAdminCosts[setting.service_name] = costs;
        });
        
        setServiceInsumos(newInsumos);
        setServiceStaffTimes(newStaffTimes);
        setServiceAdminCosts(newAdminCosts);
        if (loadedTreatments.length > 0) {
          setActiveDashboardTreatments(loadedTreatments);
        }
      }
    }
    loadData();
  }, []);

  // Carga de datos para el listado de distribución Plan C
  useEffect(() => {
    async function fetchDistributionData() {
      setIsListLoading(true);
      try {
        const supabaseClient = createClient();
        const { data, error } = await supabaseClient.rpc('get_treatment_stats_by_period', {
          start_date: appliedDateRange.start || null,
          end_date: appliedDateRange.end || null
        });

        if (error) {
          console.error('Error fetching distribution stats:', error);
          return;
        }

        if (data) {
          const mapped = data.map((item: any) => ({
            name: item.treatment_name || 'Desconocido',
            count: smartParseNumber(item.sessions_count),
            revenue: smartParseNumber(item.total_revenue)
          }));
          setDistributionData(mapped);
        }
      } catch (err) {
        console.error('Exception fetching distribution stats:', err);
      } finally {
        setIsListLoading(false);
      }
    }

    fetchDistributionData();
  }, [appliedDateRange]);

  // Efectos para persistencia
  useEffect(() => {
    localStorage.setItem('profitability_insumos', JSON.stringify(insumos));
  }, [insumos]);

  useEffect(() => {
    localStorage.setItem('profitability_personal', JSON.stringify(personalData));
  }, [personalData]);

  useEffect(() => {
    localStorage.setItem('profitability_admin', JSON.stringify(adminData));
  }, [adminData]);

  // Eliminados los efectos de localStorage para sincronización compartida

  const filteredInsumos = useMemo(() => {
    return insumos.filter(insumo => 
      insumo.detalle.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [insumos, searchTerm]);

  // Click outside para el dropdown de insumos del servicio
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (insumoDropdownRef.current && !insumoDropdownRef.current.contains(event.target as Node)) {
        setShowInsumoDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtrado y ordenación inteligente de insumos para el buscador del servicio
  const filteredAndSortedInsumosForSearch = useMemo(() => {
    if (!insumoSearchQuery.trim()) {
      return insumos;
    }
    
    const query = insumoSearchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return insumos
      .map(ins => {
        const detailNormalized = ins.detalle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        let score = 0;
        if (detailNormalized.startsWith(query)) {
          score = 100;
        } else if (new RegExp(`\\b${query}\\b`).test(detailNormalized)) {
          score = 50;
        } else if (detailNormalized.includes(query)) {
          score = 10;
        }
        
        return { ins, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.ins.detalle.localeCompare(b.ins.detalle))
      .map(item => item.ins);
  }, [insumos, insumoSearchQuery]);

  // Click outside para el dropdown de agregar tratamientos
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (treatmentDropdownRef.current && !treatmentDropdownRef.current.contains(event.target as Node)) {
        setShowTreatmentDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtrado y ordenación inteligente de tratamientos para el buscador del panel
  const filteredAndSortedTreatmentsForSearch = useMemo(() => {
    // Filtramos los tratamientos que NO están actualmente en el panel
    const unaddedTreatments = availableTreatments.filter(t => !activeDashboardTreatments.includes(t));

    if (!treatmentSearchQuery.trim()) {
      return unaddedTreatments;
    }

    const query = treatmentSearchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    return unaddedTreatments
      .map(t => {
        const tNormalized = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        let score = 0;
        if (tNormalized.startsWith(query)) {
          score = 100;
        } else if (new RegExp(`\\b${query}\\b`).test(tNormalized)) {
          score = 50;
        } else if (tNormalized.includes(query)) {
          score = 10;
        }

        return { t, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.t.localeCompare(b.t))
      .map(item => item.t);
  }, [availableTreatments, activeDashboardTreatments, treatmentSearchQuery]);

  // Cálculo de precios promedio por minuto por dependencia
  const dependencyPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    personalData.forEach(dep => {
      const totalSalary = dep.staff.reduce((acc, w) => acc + w.salary, 0);
      const totalSalaryPeriod = totalSalary * periodMonthFactor;
      const totalMinsMes = dep.staff.reduce((acc, w) => acc + getPeriodMinutes(w.weeklyHours), 0);
      prices[dep.dependency] = totalMinsMes > 0 ? totalSalaryPeriod / totalMinsMes : 0;
    });
    return prices;
  }, [personalData, appliedDateRange, globalDateRange, weeklyHours, periodMonthFactor]);

  // Cálculo de tarifa por Kw de la clínica
  const precioPorKw = useMemo(() => {
    const energiaAdmin = adminData.find(a => a.id === '1' || a.detail.toUpperCase().includes('ENERGÍA'));
    return energiaAdmin && energiaAdmin.units > 0 ? energiaAdmin.cost / energiaAdmin.units : 0;
  }, [adminData]);

  // Consumo acumulado de energía en Kw por todos los tratamientos en el período
  const totalKwConsumidoTratamientos = useMemo(() => {
    return activeDashboardTreatments.reduce((acc, t) => {
      const energiaRow = (serviceAdminCosts[t] || []).find(r => r.id === 'energia' || r.adminId === '1');
      const kw = energiaRow ? (energiaRow.kw || 0) : 0;
      const count = serviceRevenueStats[t]?.count || 0;
      return acc + (kw * count);
    }, 0);
  }, [activeDashboardTreatments, serviceAdminCosts, serviceRevenueStats]);

  // Matriz de tiempos acumulados trabajados por dependencia y tratamiento
  const timeMatrix = useMemo(() => {
    const treatments = activeDashboardTreatments;
    const matrix: Record<string, Record<string, number>> = {};
    
    personalData.forEach(dep => {
      matrix[dep.dependency] = {};
      treatments.forEach(t => {
        matrix[dep.dependency][t] = 0;
      });
    });

    treatments.forEach(t => {
      const staffTimes = serviceStaffTimes[t] || [];
      staffTimes.forEach(st => {
        let depName = '';
        if (st.tipo === 'Doctor') depName = 'Doctores';
        else if (st.tipo === 'Enfermera') depName = 'Enfermeras';
        else depName = st.tipo;
        
        if (matrix[depName] !== undefined && matrix[depName][t] !== undefined) {
          const count = serviceRevenueStats[t]?.count || 0;
          matrix[depName][t] += (st.mins || 0) * count;
        }
      });
    });

    return matrix;
  }, [activeDashboardTreatments, personalData, serviceStaffTimes, serviceRevenueStats]);

  // Totales de minutos trabajados acumulados por dependencia
  const matrixTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    const treatments = activeDashboardTreatments;
    personalData.forEach(dep => {
      totals[dep.dependency] = treatments.reduce((acc, t) => acc + (timeMatrix[dep.dependency]?.[t] || 0), 0);
    });
    return totals;
  }, [timeMatrix, personalData, activeDashboardTreatments]);

  // Costo total de minutos ociosos/no trabajados a distribuir en la clínica
  const totalToDistribute = useMemo(() => {
    return personalData.reduce((acc, dep) => {
      const totalSalary = dep.staff.reduce((sAcc, w) => sAcc + w.salary, 0);
      const totalSalaryPeriod = totalSalary * periodMonthFactor;
      const totalMinsMes = dep.staff.reduce((sAcc, w) => sAcc + getPeriodMinutes(w.weeklyHours), 0);
      const avgPriceMin = totalMinsMes > 0 ? totalSalaryPeriod / totalMinsMes : 0;
      
      const depMinsTrabaja = matrixTotals[dep.dependency] || 0;
      const depMinsNoTrabaja = totalMinsMes - depMinsTrabaja;
      
      return acc + (depMinsNoTrabaja * avgPriceMin);
    }, 0);
  }, [personalData, getPeriodMinutes, matrixTotals, weeklyHours, periodMonthFactor]);

  // Distribución del Plan C por tratamiento
  const calculatedDistribution = useMemo(() => {
    const totalSessions = distributionData.reduce((acc, item) => acc + item.count, 0);
    const totalRevenue = distributionData.reduce((acc, item) => acc + item.revenue, 0);

    return distributionData.map(item => {
      const pctCount = totalSessions > 0 ? (item.count / totalSessions) : 0;
      const pctRevenue = totalRevenue > 0 ? (item.revenue / totalRevenue) : 0;

      const allocCount = totalToDistribute * pctCount;
      const allocRevenue = totalToDistribute * pctRevenue;
      const allocMixed = 0.5 * allocCount + 0.5 * allocRevenue;
      const pctOfTotalAlloc = totalToDistribute > 0 ? (allocMixed / totalToDistribute) * 105 : 0; // Se adaptará el porcentaje en base a totalToDistribute

      return {
        name: item.name,
        count: item.count,
        pctCount: pctCount * 100,
        revenue: item.revenue,
        pctRevenue: pctRevenue * 100,
        allocCount,
        allocRevenue,
        allocMixed,
        pctOfTotalAlloc: totalToDistribute > 0 ? (allocMixed / totalToDistribute) * 100 : 0
      };
    });
  }, [distributionData, totalToDistribute]);

  // Costo total administrativo no asignado a distribuir en la clínica
  const totalAdminToDistribute = useMemo(() => {
    return adminData.reduce((acc, item) => {
      const pricePerUnit = item.units > 0 ? item.cost / item.units : 0;
      const isEnergia = item.id === '1' || item.detail.toUpperCase().includes('ENERGÍA');
      if (isEnergia) {
        const unitsPeriod = item.units * periodMonthFactor;
        const displayedCons = unitsPeriod - totalKwConsumidoTratamientos;
        return acc + (displayedCons * pricePerUnit);
      } else {
        const unitsPeriod = item.units * periodMonthFactor;
        const consumptionPeriod = item.consumption * periodMonthFactor;
        return acc + ((unitsPeriod - consumptionPeriod) * pricePerUnit);
      }
    }, 0);
  }, [adminData, totalKwConsumidoTratamientos, periodMonthFactor]);

  // Distribución del Plan C Administrativo por tratamiento
  const calculatedAdminDistribution = useMemo(() => {
    const totalSessions = distributionData.reduce((acc, item) => acc + item.count, 0);
    const totalRevenue = distributionData.reduce((acc, item) => acc + item.revenue, 0);

    return distributionData.map(item => {
      const pctCount = totalSessions > 0 ? (item.count / totalSessions) : 0;
      const pctRevenue = totalRevenue > 0 ? (item.revenue / totalRevenue) : 0;

      const allocCount = totalAdminToDistribute * pctCount;
      const allocRevenue = totalAdminToDistribute * pctRevenue;
      const allocMixed = 0.5 * allocCount + 0.5 * allocRevenue;

      return {
        name: item.name,
        count: item.count,
        pctCount: pctCount * 100,
        revenue: item.revenue,
        pctRevenue: pctRevenue * 100,
        allocCount,
        allocRevenue,
        allocMixed,
        pctOfTotalAlloc: totalAdminToDistribute > 0 ? (allocMixed / totalAdminToDistribute) * 100 : 0
      };
    });
  }, [distributionData, totalAdminToDistribute]);

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
      weeklyHours: 0,
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
      id: Math.random().toString(36).substr(2, 9),
      detail: 'Nuevo Gasto',
      cost: 0,
      units: 1,
      consumption: 0
    };
    setAdminData([...adminData, newItem]);
  };

  const handleAddInsumoToService = (serviceName: string, insumoId: string) => {
    if (!insumoId) return;
    const newItems = [
      ...serviceInsumos[serviceName],
      { id: Math.random().toString(36).substr(2, 9), insumoId, cantidad: 1 }
    ];
    setServiceInsumos(prev => ({
      ...prev,
      [serviceName]: newItems
    }));
    saveToSupabase(serviceName, serviceStaffTimes[serviceName], newItems);
  };

  const handleUpdateServiceInsumoQuantity = (serviceName: string, id: string, cantidad: number) => {
    const newItems = serviceInsumos[serviceName].map(item => 
      item.id === id ? { ...item, cantidad: Math.max(0, cantidad) } : item
    );
    setServiceInsumos(prev => ({
      ...prev,
      [serviceName]: newItems
    }));
    saveToSupabase(serviceName, serviceStaffTimes[serviceName], newItems);
  };

  const handleRemoveInsumoFromService = (serviceName: string, id: string) => {
    const newItems = serviceInsumos[serviceName].filter(item => item.id !== id);
    setServiceInsumos(prev => ({
      ...prev,
      [serviceName]: newItems
    }));
    saveToSupabase(serviceName, serviceStaffTimes[serviceName], newItems);
  };

  const handleUpdateServicePackageMultiplier = (serviceName: string, multiplier: number) => {
    const validatedMultiplier = Math.max(0.01, multiplier);
    const currentItems = serviceInsumos[serviceName] || [];
    const multiplierIndex = currentItems.findIndex(item => item.insumoId === 'multiplier');
    
    let newItems = [...currentItems];
    if (multiplierIndex > -1) {
      newItems[multiplierIndex] = { 
        ...newItems[multiplierIndex], 
        cantidad: validatedMultiplier 
      };
    } else {
      newItems.push({
        id: 'multiplier',
        insumoId: 'multiplier',
        cantidad: validatedMultiplier
      });
    }
    
    setServiceInsumos(prev => ({
      ...prev,
      [serviceName]: newItems
    }));
    
    saveToSupabase(serviceName, serviceStaffTimes[serviceName], newItems);
  };

  const handleUpdateServiceStaffTime = (serviceName: string, id: string, field: 'mins' | 'valor', value: number) => {
    const newTimes = serviceStaffTimes[serviceName].map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setServiceStaffTimes(prev => ({
      ...prev,
      [serviceName]: newTimes
    }));
    saveToSupabase(serviceName, newTimes, serviceInsumos[serviceName]);
  };

  const handleAddAdminToService = (serviceName: string, adminId: string) => {
    if (!adminId) return;
    const adminDetails = adminData.find(a => a.id === adminId);
    const newItems = [
      ...serviceAdminCosts[serviceName],
      { id: Math.random().toString(36).substr(2, 9), adminId, valor: adminDetails?.cost || 0 }
    ];
    setServiceAdminCosts(prev => ({
      ...prev,
      [serviceName]: newItems
    }));
    saveToSupabase(serviceName, serviceStaffTimes[serviceName], serviceInsumos[serviceName], newItems);
  };

  const handleUpdateServiceAdminCostValue = (serviceName: string, id: string, valor: number) => {
    const newItems = serviceAdminCosts[serviceName].map(item => 
      item.id === id ? { ...item, valor } : item
    );
    setServiceAdminCosts(prev => ({
      ...prev,
      [serviceName]: newItems
    }));
    saveToSupabase(serviceName, serviceStaffTimes[serviceName], serviceInsumos[serviceName], newItems);
  };

  const handleUpdateServiceAdminKw = (serviceName: string, id: string, kw: number) => {
    const calculatedValor = kw * precioPorKw;
    const currentCosts = serviceAdminCosts[serviceName] || [];
    let hasItem = false;
    const newItems = currentCosts.map(item => {
      if (item.id === id || item.adminId === '1') {
        hasItem = true;
        return { ...item, id: 'energia', adminId: '1', kw, valor: calculatedValor };
      }
      return item;
    });

    let finalItems = newItems;
    if (!hasItem) {
      finalItems = [...newItems, { id: 'energia', adminId: '1', kw, valor: calculatedValor }];
    }

    setServiceAdminCosts(prev => ({
      ...prev,
      [serviceName]: finalItems
    }));
    saveToSupabase(serviceName, serviceStaffTimes[serviceName], serviceInsumos[serviceName], finalItems);
  };

  const handleRemoveAdminFromService = (serviceName: string, id: string) => {
    const newItems = serviceAdminCosts[serviceName].filter(item => item.id !== id);
    setServiceAdminCosts(prev => ({
      ...prev,
      [serviceName]: newItems
    }));
    saveToSupabase(serviceName, serviceStaffTimes[serviceName], serviceInsumos[serviceName], newItems);
  };

  const handleDeleteAdmin = (id: string) => {
    setAdminData(prev => prev.filter(item => item.id !== id));
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-6xl mx-auto py-2">
      <style>{`
        .dynamic-order { order: var(--mobile-order); }
        @media (min-width: 768px) {
          .dynamic-order { order: var(--desktop-order); }
        }
      `}</style>
      <div className="bg-[#e6e7ee] p-5 rounded-[2.5rem] shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] flex flex-col gap-5">
        
        {/* Fila Superior: Selector de Período */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center justify-center gap-3 w-full md:w-auto">
            <div className="relative w-44 group shrink-0">
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
                className="w-full pl-[4.5rem] pr-2 py-2.5 rounded-xl bg-[#e6e7ee] text-gray-700 text-xs font-medium border-none shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all appearance-none"
              />
            </div>

            <div className="flex items-center gap-2 px-2 shrink-0">
              <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'}`} />
              <span className="hidden sm:inline text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                {isSyncing ? 'Sincronizando...' : 'Nube Sincronizada'}
              </span>
            </div>

            <div className="relative w-44 group shrink-0">
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
                className="w-full pl-[4.5rem] pr-2 py-2.5 rounded-xl bg-[#e6e7ee] text-gray-700 text-xs font-medium border-none shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all appearance-none"
              />
            </div>
          </div>

          <button 
            onClick={handleApplyPeriod}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm rounded-xl shadow-[4px_4px_8px_rgba(16,185,129,0.3)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)] transition-all active:scale-95 group shrink-0"
          >
            <Check size={18} className="group-hover:scale-110 transition-transform" />
            <span>Aplicar Periodo</span>
          </button>

          {/* Periodo Visualizado Badge */}
          <div className="flex flex-col items-center justify-center bg-[#e6e7ee] px-5 py-1.5 rounded-xl shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] shrink-0 min-w-[200px]">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar size={12} className="text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {appliedDateRange.start && appliedDateRange.end ? 'Periodo Visualizado' : 'Histórico Completo'}
              </span>
            </div>
            {(appliedDateRange.start && appliedDateRange.end) || (globalDateRange.start && globalDateRange.end) ? (
              <div className="flex items-center gap-2 font-black text-slate-700 leading-none">
                <span className="text-[15px]">{appliedDateRange.start || globalDateRange.start}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">al</span>
                <span className="text-[15px]">{appliedDateRange.end || globalDateRange.end}</span>
              </div>
            ) : (
              <span className="text-[13px] font-black text-slate-700 leading-none mb-0.5">Calculando fechas...</span>
            )}
          </div>
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
                    <th className="pb-2 pl-6">DETALLE DEL INSUMO</th>
                    <th className="pb-2 w-20 text-center"></th>
                    <th className="pb-2 w-40 text-right pr-6">VALOR UNT</th>
                    <th className="pb-2 w-14 text-center"></th>
                  </tr>
                </thead>
                <tbody className="w-full">
                  {filteredInsumos.map((insumo) => (
                    <tr key={insumo.id} className="group transition-all w-full flex items-center gap-2 mb-2">
                      <td className="bg-[#e6e7ee] shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] rounded-l-2xl p-2.5 pl-6 group-hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] transition-shadow flex-1 min-w-0">
                        <div className="w-full min-w-0">
                          <NeumorphicTooltip text={insumo.detalle}>
                            <input
                              type="text"
                              value={insumo.detalle}
                              onChange={(e) => handleUpdateInsumo(insumo.id, 'detalle', e.target.value)}
                              className="w-full bg-transparent border-none focus:outline-none text-[10.5px] font-bold text-slate-700 placeholder-slate-400 truncate"
                            />
                          </NeumorphicTooltip>
                        </div>
                      </td>
                      <td className="bg-[#e6e7ee] shadow-[0_4px_8px_#b8b9be,0_-4px_8px_#ffffff] p-2.5 flex items-center justify-center group-hover:shadow-[inset_0_2px_4px_#b8b9be,inset_0_-2px_4px_#ffffff] transition-shadow w-24 shrink-0">
                        <input
                          type="text"
                          value={insumo.medida}
                          onChange={(e) => handleUpdateInsumo(insumo.id, 'medida', e.target.value)}
                          className="w-full bg-transparent border-none focus:outline-none text-center text-[11px] font-bold text-slate-500"
                        />
                      </td>
                      <td className="bg-[#e6e7ee] shadow-[0_4px_8px_#b8b9be,0_-4px_8px_#ffffff] p-2.5 flex items-center justify-end pr-6 group-hover:shadow-[inset_0_2px_4px_#b8b9be,inset_0_-2px_4px_#ffffff] transition-shadow w-40 shrink-0">
                        <div className="flex items-center justify-end gap-1.5 w-full">
                          <span className="text-[11px] text-blue-500/50 font-black">$</span>
                          <input
                            type="number"
                            value={insumo.valor}
                            onChange={(e) => handleUpdateInsumo(insumo.id, 'valor', parseFloat(e.target.value))}
                            className="w-20 bg-transparent border-none focus:outline-none text-right text-[12px] font-black text-blue-600 tabular-nums"
                          />
                        </div>
                      </td>
                      <td className="bg-[#e6e7ee] shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] rounded-r-2xl p-2.5 flex items-center justify-center w-14 shrink-0 group-hover:shadow-[inset_-2px_2px_5px_#b8b9be,inset_2px_-2px_5px_#ffffff] transition-shadow">
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
      {activeCategory === 'personal' && (() => {
        const treatments = activeDashboardTreatments;
        const activeTreatmentsCols = treatments;
        const validDeps = personalData.filter(dep => dep.dependency !== 'Operativo' && dep.dependency !== 'Administrativos');

        // Filtrar por búsqueda
        const filteredDistribution = calculatedDistribution.filter(item => 
          item.name.toLowerCase().includes(distSearchQuery.toLowerCase())
        );

        // Ordenar
        filteredDistribution.sort((a, b) => {
          if (distSortOrder === 'allocMixedDesc') return b.allocMixed - a.allocMixed;
          if (distSortOrder === 'allocMixedAsc') return a.allocMixed - b.allocMixed;
          if (distSortOrder === 'countDesc') return b.count - a.count;
          if (distSortOrder === 'revenueDesc') return b.revenue - a.revenue;
          if (distSortOrder === 'nameAsc') return a.name.localeCompare(b.name);
          return 0;
        });

        // Paginación
        const itemsPerPage = 10;
        const totalPages = Math.ceil(filteredDistribution.length / itemsPerPage);
        const paginatedData = filteredDistribution.slice(
          (distCurrentPage - 1) * itemsPerPage,
          distCurrentPage * itemsPerPage
        );

        const exportToCSV = () => {
          if (filteredDistribution.length === 0) return;

          const headers = [
            'N°',
            'Tratamiento Clinico',
            'Sesiones (Volumen)',
            '% Volumen',
            'Ingresos Brutos ($)',
            '% Ingresos',
            'Monto Volumen (50%)',
            'Monto Ingresos (50%)',
            'Plan C: Monto Final ($)',
            '% Total',
            'Costo por Sesión'
          ];

          const rows = filteredDistribution.map((item, idx) => [
            idx + 1,
            item.name,
            item.count,
            item.pctCount.toFixed(4) + '%',
            item.revenue.toFixed(2),
            item.pctRevenue.toFixed(4) + '%',
            item.allocCount.toFixed(2),
            item.allocRevenue.toFixed(2),
            item.allocMixed.toFixed(2),
            item.pctOfTotalAlloc.toFixed(4) + '%',
            (item.count > 0 ? (item.allocMixed / item.count) : 0).toFixed(2)
          ]);

          const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
            + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
          
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `plan_c_distribucion_${appliedDateRange.start || 'historico'}_a_${appliedDateRange.end || 'historico'}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        return (
        <div className="bg-[#e6e7ee] p-6 rounded-[2.5rem] shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-end px-4">
            <div className="flex items-center gap-4 bg-[#e6e7ee] px-5 py-2.5 rounded-2xl shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] border border-white/50">
              <div className="flex flex-col items-end border-r border-slate-300/50 pr-4 mr-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Período Seleccionado</span>
                <span className="text-[11px] font-black text-slate-600">
                  {appliedDateRange.start && appliedDateRange.end 
                    ? `${appliedDateRange.start} al ${appliedDateRange.end}`
                    : (globalDateRange.start && globalDateRange.end ? `${globalDateRange.start} al ${globalDateRange.end} (Histórico)` : 'Calculando fechas...')}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 mt-0.5">Equivale a {getPeriodMinutes()} mins por empleado</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hrs Semanales por Empleado:</span>
                <input 
                  type="number"
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value) || 0)}
                  className="w-16 bg-transparent text-right font-black text-blue-600 text-sm outline-none"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-8 mt-4">
            {personalData.map((dep) => {
              const dynamicMins = getPeriodMinutes();
              const totalSalary = dep.staff.reduce((acc, w) => acc + w.salary, 0);
              const totalSalaryPeriod = totalSalary * periodMonthFactor;
              const totalMinsMes = dep.staff.reduce((acc, w) => acc + getPeriodMinutes(w.weeklyHours), 0);
              const totalMinsTrabaja = matrixTotals[dep.dependency] || 0;
              const totalMinsNoTrabaja = totalMinsMes - totalMinsTrabaja;
              
              const avgPriceMin = totalMinsMes > 0 ? totalSalaryPeriod / totalMinsMes : 0;
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
                        <tr className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest">
                          <th className="pb-1 pl-6 min-w-[150px]">Nombre del Personal</th>
                          <th className="pb-1 w-36 text-right pr-2">
                            <NeumorphicExplanationTooltip
                              title="Sueldo Base"
                              text="El sueldo mensual bruto pactado para cada profesional. Es un valor editable de entrada."
                              position="bottom"
                            >
                              <span className="cursor-help border-b border-dashed border-slate-350 pb-0.5">Sueldo Base</span>
                            </NeumorphicExplanationTooltip>
                          </th>
                          <th className="pb-1 w-24 text-center">
                            <NeumorphicExplanationTooltip
                              title="Horas Semanales"
                              text="Horas de trabajo contratadas a la semana por este profesional. Es un valor editable."
                              position="bottom"
                            >
                              <span className="cursor-help border-b border-dashed border-slate-350 pb-0.5">Horas Sem.</span>
                            </NeumorphicExplanationTooltip>
                          </th>
                          <th className="pb-1 w-32 text-right pr-2">
                            <NeumorphicExplanationTooltip
                              title="Sueldo del Período"
                              formula="Sueldo Base × Factor de Período"
                              text="Sueldo base proporcional calculado para el rango de fechas seleccionado en base a los días hábiles laborables."
                              position="bottom"
                            >
                              <span className="cursor-help border-b border-dashed border-slate-350 pb-0.5 text-indigo-650">Sueldo Período</span>
                            </NeumorphicExplanationTooltip>
                          </th>
                          <th className="pb-1 w-24 text-center">
                            <NeumorphicExplanationTooltip
                              title="Minutos del Periodo"
                              formula="Días Hábiles × (Horas Semanales / 6) × 60"
                              text="Tiempo total de minutos hábiles que el empleado debe cumplir en el rango de fechas (excluye domingos)."
                              position="bottom"
                            >
                              <span className="cursor-help border-b border-dashed border-slate-350 pb-0.5 text-indigo-650">Mins Periodo</span>
                            </NeumorphicExplanationTooltip>
                          </th>
                          <th className="pb-1 w-24 text-center text-blue-500">
                            <NeumorphicExplanationTooltip
                              title="Costo por Minuto"
                              formula="Sueldo Período / Minutos del Período"
                              text="El costo exacto de cada minuto de trabajo disponible de este empleado, calculado dividiendo su sueldo prorrateado por sus minutos hábiles del período."
                              position="bottom"
                            >
                              <span className="cursor-help border-b border-dashed border-blue-400 pb-0.5">$ Minuto</span>
                            </NeumorphicExplanationTooltip>
                          </th>
                          <th className="pb-1 w-28 text-center text-emerald-600">
                            <NeumorphicExplanationTooltip
                              title="Minutos Trabajados"
                              formula="Suma de (Consultas × Minutos por Sesión)"
                              text="Tiempo acumulado que la especialidad estuvo ocupada realizando tratamientos. Los minutos de sesión de cada tratamiento se configuran abajo en el panel detallado de cada servicio."
                              position="bottom"
                            >
                              <span className="cursor-help border-b border-dashed border-emerald-400 pb-0.5">Mins Trabaja</span>
                            </NeumorphicExplanationTooltip>
                          </th>
                          <th className="pb-1 w-28 text-center text-orange-500">
                            <NeumorphicExplanationTooltip
                              title="Minutos No Trabajados"
                              formula="Minutos del Periodo - Minutos Trabajados"
                              text="Tiempo laborable del personal que estuvo disponible pero no fue asignado a ningún tratamiento (tiempo libre, ocioso o administrativo)."
                              position="bottom"
                            >
                              <span className="cursor-help border-b border-dashed border-orange-400 pb-0.5">Mins No Trabaja</span>
                            </NeumorphicExplanationTooltip>
                          </th>
                          <th className="pb-1 w-32 text-right pr-6 text-blue-700 bg-blue-500/5 rounded-t-xl">
                            <NeumorphicExplanationTooltip
                              title="Valor a Distribuir"
                              formula="Minutos No Trabajados × Costo por Minuto Promedio"
                              text="El costo equivalente del tiempo no trabajado que debe ser distribuido como costo indirecto proporcional entre las consultas para un cálculo real de rentabilidad."
                              position="bottom"
                            >
                              <span className="cursor-help border-b border-dashed border-blue-600 pb-0.5">$ A Distribuir</span>
                            </NeumorphicExplanationTooltip>
                          </th>
                          <th className="pb-1 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dep.staff.map((worker) => {
                          const salary = worker.salary || 0;
                          const workerMins = getPeriodMinutes(worker.weeklyHours);
                          const minsMes = workerMins > 0 ? workerMins : 1;
                          const workerSalaryPeriod = salary * periodMonthFactor;
                          const pricePerMinute = workerSalaryPeriod / minsMes;

                          return (
                            <tr key={worker.id} className="group">
                              <td className="bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] rounded-l-xl p-2 pl-6 min-w-0 max-w-[200px]">
                                <NeumorphicTooltip text={worker.name}>
                                  <div className="relative group/input">
                                    <input
                                      type="text"
                                      value={worker.name}
                                      onChange={(e) => handleUpdateWorker(dep.dependency, worker.id, 'name', e.target.value)}
                                      className="w-full bg-white/60 shadow-inner rounded-lg pl-2 pr-6 py-1 border border-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all text-[10px] font-bold text-slate-700 truncate"
                                    />
                                    <Edit3 className="absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-400 opacity-40 group-hover/input:opacity-100 transition-opacity" size={10} />
                                  </div>
                                </NeumorphicTooltip>
                              </td>
                              <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-right w-36">
                                <NeumorphicExplanationTooltip
                                  title="Sueldo Base"
                                  text="Haz clic en el recuadro para modificar el sueldo mensual bruto de este profesional."
                                >
                                  <div className="relative group/input">
                                    <input
                                      type="number"
                                      value={worker.salary}
                                      onChange={(e) => handleUpdateWorker(dep.dependency, worker.id, 'salary', parseFloat(e.target.value) || 0)}
                                      className="w-full bg-white/60 shadow-inner rounded-lg pl-2 pr-6 py-1 border border-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all text-right text-[11px] font-black text-slate-600 tabular-nums"
                                    />
                                    <Edit3 className="absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-400 opacity-40 group-hover/input:opacity-100 transition-opacity" size={10} />
                                  </div>
                                </NeumorphicExplanationTooltip>
                              </td>
                              <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center w-24">
                                <NeumorphicExplanationTooltip
                                  title="Horas Semanales"
                                  text="Haz clic en el recuadro para modificar las horas contratadas por semana de este profesional."
                                >
                                  <div className="relative group/input mx-auto w-16">
                                    <input
                                      type="number"
                                      value={worker.weeklyHours || 0}
                                      onChange={(e) => handleUpdateWorker(dep.dependency, worker.id, 'weeklyHours', parseFloat(e.target.value) || 0)}
                                      className="w-full bg-white/60 shadow-inner rounded-lg px-2 py-1 border border-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all text-[11px] font-black text-slate-700 text-center tabular-nums"
                                    />
                                    <Edit3 className="absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-400 opacity-40 group-hover/input:opacity-100 transition-opacity" size={10} />
                                  </div>
                                </NeumorphicExplanationTooltip>
                              </td>
                              <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-right w-32 pr-2">
                                <NeumorphicExplanationTooltip
                                  title="Sueldo del Período"
                                  formula={`$${workerSalaryPeriod.toFixed(1)}`}
                                  text="Sueldo base prorrateado para el rango de fechas seleccionado en base a los días hábiles de trabajo (excluyendo domingos)."
                                >
                                  <div className="max-w-[100px] ml-auto bg-indigo-50/10 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] rounded-lg px-2 py-1 border border-indigo-200/30 text-right text-[11px] font-black text-indigo-600 tabular-nums">
                                    {formatCurrency(workerSalaryPeriod)}
                                  </div>
                                </NeumorphicExplanationTooltip>
                              </td>
                              <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center w-24">
                                <NeumorphicExplanationTooltip
                                  title="Minutos del Periodo"
                                  formula={`${workerMins} minutos`}
                                  text="Minutos laborables en base a los días hábiles del periodo actual y las horas semanales del profesional."
                                >
                                  <div className="max-w-[80px] mx-auto bg-indigo-50/10 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] rounded-lg px-2 py-1 border border-indigo-200/30 text-center text-[11px] font-black text-indigo-600 tabular-nums">
                                    {workerMins}
                                  </div>
                                </NeumorphicExplanationTooltip>
                              </td>
                              <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center w-24 text-[11px] font-black text-blue-500/70 tabular-nums">
                                <NeumorphicExplanationTooltip
                                  title="Costo por Minuto"
                                  formula={`$${pricePerMinute.toFixed(2)} por minuto`}
                                  text="Equivalente monetario de cada minuto de trabajo disponible de este empleado."
                                >
                                  <span>{pricePerMinute.toFixed(2)}</span>
                                </NeumorphicExplanationTooltip>
                              </td>
                              {/* Celdas ahora vacías por solicitud del usuario */}
                              <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center w-28 text-[11px] font-black text-emerald-600/30">
                                <NeumorphicExplanationTooltip
                                  title="Minutos Trabajados"
                                  text="El tiempo de tratamiento se calcula de forma consolidada por dependencia (Doctores, Enfermeras) en los Totales de abajo."
                                >
                                  <span>-</span>
                                </NeumorphicExplanationTooltip>
                              </td>
                              <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center w-28 text-[11px] font-black text-orange-400/30">
                                <NeumorphicExplanationTooltip
                                  title="Minutos No Trabajados"
                                  text="El tiempo disponible no trabajado se consolida por dependencia en los Totales de abajo."
                                >
                                  <span>-</span>
                                </NeumorphicExplanationTooltip>
                              </td>
                              <td className="bg-blue-500/5 shadow-[inset_1px_1px_3px_rgba(59,130,246,0.05)] p-2 text-right pr-6 text-[11px] font-black text-blue-700/20 border-x border-blue-500/10 w-32">
                                <NeumorphicExplanationTooltip
                                  title="Valor a Distribuir"
                                  text="El costo ocioso o administrativo a distribuir se consolida en los Totales de abajo."
                                >
                                  <span>-</span>
                                </NeumorphicExplanationTooltip>
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
                          const depSalaryPeriod = dep.staff.reduce((acc, w) => acc + ((w.salary || 0) * periodMonthFactor), 0);
                          return (
                          <tr className="bg-slate-200/40">
                            <td className="p-2 pl-6 rounded-l-xl text-[10px] font-black text-slate-500 uppercase tracking-wider">
                              Totales {dep.dependency}
                            </td>
                            <td className="p-2 text-right text-[11px] font-black text-slate-600 pr-2">
                              {formatCurrency(totalSalary)}
                            </td>
                            <td className="p-2 text-center text-[11px] font-black text-slate-500"></td>
                            <td className="p-2 text-right text-[11px] font-black text-indigo-700 pr-2 tabular-nums">
                              <NeumorphicExplanationTooltip
                                title="Total Sueldo del Período"
                                text="La suma de los sueldos del período prorrateados de todos los profesionales de esta dependencia."
                              >
                                <span>{formatCurrency(depSalaryPeriod)}</span>
                              </NeumorphicExplanationTooltip>
                            </td>
                            <td className="p-2 text-center text-[11px] font-black text-slate-500">
                              <NeumorphicExplanationTooltip
                                title="Total Minutos Disponibles"
                                text="La suma de todos los minutos de trabajo contratados para esta especialidad durante el rango de fechas."
                              >
                                <span>{totalMinsMes}</span>
                              </NeumorphicExplanationTooltip>
                            </td>
                            <td className="p-2 text-center text-[11px] font-black text-blue-600">
                              <NeumorphicExplanationTooltip
                                  title="Costo Promedio por Minuto"
                                  formula={`$${avgPriceMin.toFixed(2)} / min`}
                                  text="Sueldo del Período Total dividido entre Minutos Disponibles Totales del período. Se usa como costo de referencia."
                                >
                                <span>{avgPriceMin.toFixed(2)}</span>
                              </NeumorphicExplanationTooltip>
                            </td>
                            <td className="p-2 text-center text-[11px] font-black text-emerald-600">
                              <NeumorphicExplanationTooltip
                                title="Total Minutos Trabajados"
                                text="Suma total de los minutos de tratamientos/consultas reales que se realizaron durante el período para esta especialidad."
                              >
                                <span>{totalMinsTrabaja}</span>
                              </NeumorphicExplanationTooltip>
                            </td>
                            <td className="p-2 text-center text-[11px] font-black text-orange-600">
                              <NeumorphicExplanationTooltip
                                title="Total Minutos No Trabajados"
                                text="El tiempo total ocioso, administrativo o de libre disposición acumulado por toda la especialidad."
                              >
                                <span>{safeMinsNoTrabaja}</span>
                              </NeumorphicExplanationTooltip>
                            </td>
                            <td className="p-2 text-right pr-4 rounded-r-xl">
                              <NeumorphicExplanationTooltip
                                title="Subtotal a Distribuir"
                                formula={formatCurrency(depTotalToDistribute)}
                                text="El costo del tiempo no asignado a tratamientos. Este monto se prorratea y distribuye como costo indirecto para obtener los costos consolidados."
                              >
                                <div className="bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] border border-blue-200/50 px-3 py-2 rounded-xl text-[12px] font-black text-blue-600 inline-block min-w-[100px] tabular-nums">
                                  {formatCurrency(depTotalToDistribute)}
                                </div>
                              </NeumorphicExplanationTooltip>
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
            <div className="mt-4 p-3 px-6 rounded-2xl bg-[#e6e7ee] shadow-[6px_6px_15px_#b8b9be,-6px_-6px_15px_#ffffff] flex items-center justify-between border border-white/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-inner border border-blue-200/20">
                  <DollarSign size={16} />
                </div>
                <div>
                  <p className="text-blue-700 text-sm font-black tracking-tight leading-none">Total a Distribuir</p>
                </div>
              </div>
              <div className="text-right bg-blue-500/5 px-4 py-1.5 rounded-xl border border-blue-500/10 shadow-inner">
                <span className="text-blue-600 text-lg font-black tracking-tighter">
                  {formatCurrency(totalToDistribute)}
                </span>
              </div>
            </div>

            {/* Desplegable Listado de distribución */}
            <div className="mt-6 flex flex-col gap-4">
              <button
                onClick={() => setIsListOpen(!isListOpen)}
                className={`w-full py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-between font-black text-sm active:scale-[0.99] bg-[#e6e7ee] ${
                  isListOpen 
                    ? 'shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] text-blue-700' 
                    : 'shadow-[6px_6px_15px_#b8b9be,-6px_-6px_15px_#ffffff] hover:shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] transition-transform ${isListOpen ? 'rotate-90 scale-90' : ''}`}>
                    <Users size={16} />
                  </div>
                  <span className="uppercase tracking-wider">Listado de distribución</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">
                    {isListOpen ? 'Ocultar listado' : 'Mostrar listado'}
                  </span>
                  <div className={`w-6 h-6 rounded-lg bg-blue-500/5 border border-blue-500/10 flex items-center justify-center text-blue-600 transition-transform duration-300 ${isListOpen ? 'rotate-180' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </button>

              {isListOpen && (
                <div className="bg-[#e6e7ee] p-6 rounded-[2.5rem] shadow-[inset_6px_6px_12px_#b8b9be,inset_-6px_-6px_12px_#ffffff] border border-white/40 animate-in slide-in-from-top-4 duration-300 flex flex-col gap-6">
                  {/* Cabecera del Panel */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <div className="w-2 h-5 bg-blue-500 rounded-full"></div>
                        TABLA DE PRORRATEO DEFINITIVA (PLAN C)
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        Listado completo y exhaustivo de todos los tratamientos de la clínica bajo distribución equitativa (50/50).
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                      {/* Buscador */}
                      <div className="relative flex-1 md:flex-none md:w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="Buscar por tratamiento..."
                          value={distSearchQuery}
                          onChange={(e) => {
                            setDistSearchQuery(e.target.value);
                            setDistCurrentPage(1);
                          }}
                          className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#e6e7ee] text-slate-700 text-xs shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] border-none focus:outline-none"
                        />
                      </div>

                      {/* Ordenación */}
                      <select
                        value={distSortOrder}
                        onChange={(e) => {
                          setDistSortOrder(e.target.value);
                          setDistCurrentPage(1);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#e6e7ee] text-slate-700 text-xs font-black shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] border-none outline-none cursor-pointer focus:ring-1 focus:ring-blue-500/20"
                      >
                        <option value="allocMixedDesc">Asignación: Mayor a Menor</option>
                        <option value="allocMixedAsc">Asignación: Menor a Mayor</option>
                        <option value="countDesc">Sesiones: Mayor a Menor</option>
                        <option value="revenueDesc">Ingresos: Mayor a Menor</option>
                        <option value="nameAsc">Tratamiento: A - Z</option>
                      </select>

                      {/* Exportar */}
                      <button
                        onClick={exportToCSV}
                        disabled={filteredDistribution.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-[3px_3px_6px_rgba(79,70,229,0.3)] hover:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span>Exportar CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Tabla de Resultados */}
                  <div className="overflow-x-auto rounded-3xl">
                    {isListLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 bg-[#e6e7ee] rounded-2xl shadow-inner">
                        <div className="w-8 h-8 rounded-full border-4 border-blue-500/30 border-t-blue-600 animate-spin"></div>
                        <span className="text-xs font-bold text-slate-500">Cargando estadísticas de tratamientos...</span>
                      </div>
                    ) : paginatedData.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 font-bold bg-[#e6e7ee] rounded-2xl shadow-inner border border-white/20">
                        Ningún tratamiento coincide con la búsqueda
                      </div>
                    ) : (
                      <table className="w-full border-separate border-spacing-y-2 text-left">
                        <thead>
                          <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="pb-1 pl-4 text-center w-12">N°</th>
                            <th className="pb-1">Tratamiento Clínico</th>
                            <th className="pb-1 text-center w-36">Sesiones (Volumen)</th>
                            <th className="pb-1 text-right pr-4 w-36">Ingresos Brutos ($)</th>
                            <th className="pb-1 text-right pr-4 w-36">Monto Volumen (50%)</th>
                            <th className="pb-1 text-right pr-4 w-36">Monto Ingresos (50%)</th>
                            <th className="pb-1 text-right pr-4 w-44 bg-blue-500/10 rounded-t-xl border-x border-t border-blue-200/50">Plan C: Monto Final ($)</th>
                            <th className="pb-1 text-center w-24">% Total</th>
                            <th className="pb-1 text-right pr-4 w-36">Costo por Sesión</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedData.map((item, index) => {
                            const globalIndex = (distCurrentPage - 1) * itemsPerPage + index + 1;
                            return (
                              <tr key={item.name} className="group transition-all hover:bg-white/30">
                                <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] rounded-l-2xl p-2.5 text-center font-bold text-slate-400 tabular-nums">
                                  {globalIndex}
                                </td>
                                <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] p-2.5 font-bold text-slate-700 leading-snug">
                                  {item.name}
                                </td>
                                <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] p-2.5 text-center font-semibold text-slate-500 tabular-nums text-xs">
                                  {new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(item.count)}{' '}
                                  <span className="text-[9px] text-slate-400 font-medium">({item.pctCount.toFixed(3)}%)</span>
                                </td>
                                <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] p-2.5 text-right pr-4 font-semibold text-slate-600 tabular-nums text-xs">
                                  {formatCurrency(item.revenue)}{' '}
                                  <span className="text-[9px] text-slate-400 font-medium">({item.pctRevenue.toFixed(3)}%)</span>
                                </td>
                                <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] p-2.5 text-right pr-4 font-medium text-slate-500 tabular-nums text-xs">
                                  {formatCurrency(item.allocCount)}
                                </td>
                                <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] p-2.5 text-right pr-4 font-medium text-slate-500 tabular-nums text-xs">
                                  {formatCurrency(item.allocRevenue)}
                                </td>
                                <td className="p-2.5 text-right pr-4 font-black text-blue-700 tabular-nums text-xs bg-blue-500/5 group-hover:bg-blue-500/10 border-x border-blue-200/50 shadow-inner">
                                  {formatCurrency(item.allocMixed)}
                                </td>
                                <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] p-2.5 text-center font-black text-slate-700 tabular-nums text-xs">
                                  {item.pctOfTotalAlloc.toFixed(4)}%
                                </td>
                                <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] rounded-r-2xl p-2.5 text-right pr-4 font-black text-slate-700 tabular-nums text-xs">
                                  {formatCurrency(item.count > 0 ? (item.allocMixed / item.count) : 0)}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Fila de Totales */}
                          {(() => {
                            const totalSess = filteredDistribution.reduce((acc, item) => acc + item.count, 0);
                            const totalRev = filteredDistribution.reduce((acc, item) => acc + item.revenue, 0);
                            const totalVolAlloc = filteredDistribution.reduce((acc, item) => acc + item.allocCount, 0);
                            const totalRevAlloc = filteredDistribution.reduce((acc, item) => acc + item.allocRevenue, 0);
                            const totalMixedAlloc = filteredDistribution.reduce((acc, item) => acc + item.allocMixed, 0);
                            const totalPct = filteredDistribution.reduce((acc, item) => acc + item.pctOfTotalAlloc, 0);
                            
                            return (
                              <tr className="bg-slate-900/5 rounded-2xl border border-white/50 font-black">
                                <td className="p-3 pl-4 rounded-l-2xl text-center text-slate-500 font-bold">∑</td>
                                <td className="p-3 text-slate-800 uppercase tracking-tight text-xs font-black">Totales consolidados</td>
                                <td className="p-3 text-center text-slate-700 tabular-nums text-xs">{new Intl.NumberFormat('es-CO').format(totalSess)} <span className="text-[9px] text-slate-400 font-bold">(100%)</span></td>
                                <td className="p-3 text-right pr-4 text-slate-700 tabular-nums text-xs">{formatCurrency(totalRev)} <span className="text-[9px] text-slate-400 font-bold">(100%)</span></td>
                                <td className="p-3 text-right pr-4 text-slate-600 tabular-nums text-xs">{formatCurrency(totalVolAlloc)}</td>
                                <td className="p-3 text-right pr-4 text-slate-600 tabular-nums text-xs">{formatCurrency(totalRevAlloc)}</td>
                                <td className="p-3 text-right pr-4 text-blue-700 bg-blue-500/10 border-x border-b border-blue-200/50 shadow-inner tabular-nums text-xs font-black">{formatCurrency(totalMixedAlloc)}</td>
                                <td className="p-3 text-center text-slate-800 tabular-nums text-xs font-black">{totalPct.toFixed(4)}%</td>
                                <td className="p-3 rounded-r-2xl text-right pr-4 text-slate-800 tabular-nums text-xs font-black">{formatCurrency(totalSess > 0 ? (totalMixedAlloc / totalSess) : 0)}</td>
                              </tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 mt-2">
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">
                        Mostrando <strong className="text-slate-700">{((distCurrentPage - 1) * itemsPerPage) + 1}</strong> a <strong className="text-slate-700">{Math.min(distCurrentPage * itemsPerPage, filteredDistribution.length)}</strong> de <strong className="text-slate-700">{filteredDistribution.length}</strong> tratamientos
                      </span>
                      
                      <div className="flex items-center gap-1.5 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] bg-[#e6e7ee] p-1.5 rounded-xl border border-white/40">
                        <button
                          onClick={() => setDistCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={distCurrentPage === 1}
                          className={`p-1.5 rounded-lg border border-white/50 transition-all ${
                            distCurrentPage === 1 
                              ? 'opacity-40 cursor-not-allowed bg-slate-50 shadow-inner' 
                              : 'bg-[#e6e7ee] hover:bg-white shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] active:scale-95 text-slate-600'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setDistCurrentPage(page)}
                            className={`w-7 h-7 text-xs font-black rounded-lg transition-all border flex items-center justify-center ${
                              page === distCurrentPage 
                                ? 'bg-blue-650 text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.15)] border-blue-600' 
                                : 'bg-[#e6e7ee] hover:bg-white text-slate-600 border-white/40 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] active:scale-95'
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                        <button
                          onClick={() => setDistCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={distCurrentPage === totalPages}
                          className={`p-1.5 rounded-lg border border-white/50 transition-all ${
                            distCurrentPage === totalPages 
                              ? 'opacity-40 cursor-not-allowed bg-slate-50 shadow-inner' 
                              : 'bg-[#e6e7ee] hover:bg-white shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] active:scale-95 text-slate-600'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Matriz de Tiempos Acumulados */}
            {(() => {
              if (activeTreatmentsCols.length === 0) return null;

              const filteredTreatmentsCols = activeTreatmentsCols.filter(t => 
                validDeps.some(dep => (timeMatrix[dep.dependency]?.[t] || 0) > 0)
              );

              if (filteredTreatmentsCols.length === 0) return null;

              return (
                <div className="mt-4 pt-4 border-t border-slate-300/30 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="bg-[#e6e7ee] rounded-[2rem] p-4 shadow-[inset_8px_8px_16px_#b8b9be,inset_-8px_-8px_16px_#ffffff] overflow-x-auto border border-white/40">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr>
                          <th className="py-2.5 px-3 font-black text-blue-700 uppercase text-[10px] tracking-widest w-40 bg-blue-500/10 rounded-tl-2xl border-b-2 border-r-2 border-white/50">Tiempo acumulado</th>
                          {filteredTreatmentsCols.map((t, idx) => (
                            <th key={t} className={`py-2.5 px-3 font-black text-blue-700 uppercase text-[10px] tracking-widest text-center bg-blue-500/10 border-b-2 border-white/50 border-r-2 border-white/50`}>
                              {t}
                            </th>
                          ))}
                          <th className="py-2.5 px-3 font-black text-blue-800 uppercase text-[10px] tracking-widest text-center bg-blue-500/20 rounded-tr-2xl border-b-2 border-white/50">
                            Tiempo total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {validDeps.map((dep, idx) => {
                          const rowTotal = filteredTreatmentsCols.reduce((acc, t) => acc + (timeMatrix[dep.dependency]?.[t] || 0), 0);
                          return (
                            <tr key={dep.dependency} className="group/row transition-all hover:bg-white/40">
                              <td className={`py-2 px-3 font-black text-slate-600 bg-blue-500/10 border-r-2 border-white/50 uppercase text-[10px] tracking-tight ${idx === validDeps.length - 1 ? 'rounded-bl-2xl border-b-0' : 'border-b-2 border-white/50'}`}>
                                {dep.dependency}
                              </td>
                              {filteredTreatmentsCols.map((t, tIdx) => {
                                const time = timeMatrix[dep.dependency][t];
                                return (
                                  <td key={t} className={`py-2 px-3 text-center font-black text-slate-700 tabular-nums text-[12px] ${idx !== validDeps.length - 1 ? 'border-b border-white/50' : ''} border-r border-slate-300/20`}>
                                    {time > 0 ? time : ''}
                                  </td>
                                );
                              })}
                              <td className={`py-2 px-3 text-center font-black text-blue-800 bg-blue-500/10 tabular-nums text-[12px] ${idx !== validDeps.length - 1 ? 'border-b border-white/50' : 'rounded-br-2xl'}`}>
                                {rowTotal > 0 ? rowTotal : ''}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        );
      })()}

      {/* Módulo Administrativo */}
      {activeCategory && activeCategory === 'administrativo' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-[#e6e7ee] p-6 rounded-[3rem] shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] border border-white/50 relative overflow-hidden">
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
                    <th className="px-4 py-4 text-right font-black w-32">Costo total por mes</th>
                    <th className="px-4 py-4 text-center font-black w-28">Unidades por mes</th>
                    <th className="px-4 py-4 text-right pr-4 font-black w-32 bg-blue-500/5 rounded-t-xl border-t border-x border-blue-200/20 text-blue-700">Costo por período</th>
                    <th className="px-4 py-4 text-center font-black w-28 bg-blue-500/5 rounded-t-xl border-t border-x border-blue-200/20 text-blue-650">Unidades por período</th>
                    <th className="px-4 py-4 text-center font-black w-24">$ Unidad</th>
                    <th className="px-4 py-4 text-center font-black w-24">Consumo</th>
                    <th className="px-4 py-4 text-right pr-6 font-black w-36">$ a Distribuir</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.map((item) => {
                    const pricePerUnit = item.units > 0 ? item.cost / item.units : 0;
                    const isEnergia = item.id === '1' || item.detail.toUpperCase().includes('ENERGÍA');
                    
                    // Prorrateo temporal
                    const costPeriod = item.cost * periodMonthFactor;
                    const unitsPeriod = item.units * periodMonthFactor;
                    const consumptionPeriod = isEnergia ? totalKwConsumidoTratamientos : item.consumption * periodMonthFactor;
                    
                    const displayedConsumption = isEnergia ? (unitsPeriod - totalKwConsumidoTratamientos) : consumptionPeriod;
                    const toDistribute = isEnergia 
                      ? (displayedConsumption * pricePerUnit) 
                      : (unitsPeriod - consumptionPeriod) * pricePerUnit;

                    return (
                      <tr key={item.id} className="group">
                        <td className="bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] rounded-l-xl p-2 pl-6 min-w-0">
                          <NeumorphicTooltip text={item.detail}>
                            <div className="relative group/input">
                              <input
                                type="text"
                                value={item.detail}
                                onChange={(e) => handleUpdateAdmin(item.id, 'detail', e.target.value)}
                                className="w-full bg-white/60 shadow-inner rounded-lg pl-2 pr-6 py-1.5 border border-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all text-[10px] font-bold text-slate-700 truncate"
                              />
                              <Edit3 className="absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-400 opacity-40 group-hover/input:opacity-100 transition-opacity" size={10} />
                            </div>
                          </NeumorphicTooltip>
                        </td>
                        <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-right w-26">
                          <div className="relative group/input">
                            <input
                              type="number"
                              value={item.cost}
                              onChange={(e) => handleUpdateAdmin(item.id, 'cost', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white/60 shadow-inner rounded-lg pl-2 pr-6 py-1.5 border border-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all text-right text-[11px] font-black text-slate-600 tabular-nums"
                            />
                            <Edit3 className="absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-400 opacity-40 group-hover/input:opacity-100 transition-opacity" size={10} />
                          </div>
                        </td>
                        <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center">
                          <div className="relative group/input max-w-[90px] mx-auto">
                            <input
                              type="number"
                              value={item.units}
                              onChange={(e) => handleUpdateAdmin(item.id, 'units', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white/60 shadow-inner rounded-lg px-2 py-1.5 border border-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all text-center text-[11px] font-black text-slate-500"
                            />
                            <Edit3 className="absolute right-1 top-1/2 -translate-y-1/2 text-blue-400 opacity-30" size={8} />
                          </div>
                        </td>
                        <td className="bg-blue-500/5 shadow-[inset_1px_1px_3px_rgba(59,130,246,0.05)] border-x border-blue-500/10 p-2 text-right w-32 font-black text-blue-700 tabular-nums text-xs">
                          <NeumorphicExplanationTooltip
                            title="Costo Prorrateado del Período"
                            formula="Costo por mes × Factor de Período"
                            text="Costo correspondiente al rango de fechas seleccionado en base a días hábiles."
                          >
                            <span>{formatCurrency(costPeriod)}</span>
                          </NeumorphicExplanationTooltip>
                        </td>
                        <td className="bg-blue-500/5 shadow-[inset_1px_1px_3px_rgba(59,130,246,0.05)] border-r border-blue-500/10 p-2 text-center w-28 font-black text-blue-600 tabular-nums text-xs">
                          <NeumorphicExplanationTooltip
                            title="Unidades Prorrateadas del Período"
                            formula="Unidades por mes × Factor de Período"
                            text="Unidades proporcionales correspondientes al rango de fechas seleccionado en base a días hábiles."
                          >
                            <span>
                              {unitsPeriod.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                            </span>
                          </NeumorphicExplanationTooltip>
                        </td>
                        <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center text-[11px] font-black text-blue-500/70">
                          {pricePerUnit.toFixed(2)}
                        </td>
                        <td className="bg-[#e6e7ee] shadow-[0_3px_6px_#b8b9be,0_-3px_6px_#ffffff] p-2 text-center">
                          {isEnergia ? (
                            <NeumorphicExplanationTooltip
                              title="Energía Restante a Distribuir (Kw)"
                              formula="Unidades Kw Período - Consumo Tratamientos"
                              text="Calculado automáticamente: Kw proporcionales del período menos el consumo total de Kw acumulado por todos los tratamientos en el período."
                            >
                              <div className="max-w-[80px] mx-auto bg-emerald-50/10 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] rounded-lg px-2 py-1.5 border border-emerald-200/30 text-center text-[11px] font-black text-emerald-600 tabular-nums">
                                {Number(displayedConsumption.toFixed(2))}
                              </div>
                            </NeumorphicExplanationTooltip>
                          ) : (
                            <div className="relative group/input max-w-[80px] mx-auto">
                              <input
                                type="number"
                                value={item.consumption}
                                onChange={(e) => handleUpdateAdmin(item.id, 'consumption', parseFloat(e.target.value) || 0)}
                                className="w-full bg-white/60 shadow-inner rounded-lg px-2 py-1.5 border border-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all text-center text-[11px] font-black text-orange-600"
                              />
                              <Edit3 className="absolute right-1 top-1/2 -translate-y-1/2 text-blue-400 opacity-30" size={8} />
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-right pr-6 w-36">
                          <div className="bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] border border-blue-200/50 px-3 py-2 rounded-xl text-[12px] font-black text-blue-600 inline-block min-w-[100px] tabular-nums">
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

            <div className="mt-4 p-3 px-6 rounded-2xl bg-[#e6e7ee] shadow-[6px_6px_15px_#b8b9be,-6px_-6px_15px_#ffffff] flex items-center justify-between border border-white/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-inner border border-blue-200/20">
                  <Briefcase size={16} />
                </div>
                <div>
                  <p className="text-blue-700 text-sm font-black tracking-tight leading-none">Total a Distribuir</p>
                </div>
              </div>
              <div className="text-right bg-blue-500/5 px-4 py-1.5 rounded-xl border border-blue-500/10 shadow-inner">
                <span className="text-blue-600 text-lg font-black tracking-tighter">
                  {formatCurrency(totalAdminToDistribute)}
                </span>
              </div>
            </div>

            {/* Desplegable Listado de distribución Administrativo */}
            <div className="mt-6 flex flex-col gap-4">
              <button
                onClick={() => setIsAdminListOpen(!isAdminListOpen)}
                className={`w-full py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-between font-black text-sm active:scale-[0.99] bg-[#e6e7ee] ${
                  isAdminListOpen 
                    ? 'shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] text-emerald-700' 
                    : 'shadow-[6px_6px_15px_#b8b9be,-6px_-6px_15px_#ffffff] hover:shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] transition-transform ${isAdminListOpen ? 'rotate-90 scale-90' : ''}`}>
                    <Briefcase size={16} />
                  </div>
                  <span className="uppercase tracking-wider">Listado de distribución</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">
                    {isAdminListOpen ? 'Ocultar listado' : 'Mostrar listado'}
                  </span>
                  <div className={`w-6 h-6 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-600 transition-transform duration-300 ${isAdminListOpen ? 'rotate-180' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </button>

              {isAdminListOpen && (() => {
                // Filtrar por búsqueda
                const filteredAdminDistribution = calculatedAdminDistribution.filter(item => 
                  item.name.toLowerCase().includes(adminDistSearchQuery.toLowerCase())
                );

                // Ordenar
                const sortedAdminDistribution = [...filteredAdminDistribution];
                sortedAdminDistribution.sort((a, b) => {
                  if (adminDistSortOrder === 'allocMixedDesc') return b.allocMixed - a.allocMixed;
                  if (adminDistSortOrder === 'allocMixedAsc') return a.allocMixed - b.allocMixed;
                  if (adminDistSortOrder === 'countDesc') return b.count - a.count;
                  if (adminDistSortOrder === 'revenueDesc') return b.revenue - a.revenue;
                  if (adminDistSortOrder === 'nameAsc') return a.name.localeCompare(b.name);
                  return 0;
                });

                // Paginación
                const itemsPerPage = 10;
                const totalPages = Math.ceil(sortedAdminDistribution.length / itemsPerPage);
                const paginatedAdminData = sortedAdminDistribution.slice(
                  (adminDistCurrentPage - 1) * itemsPerPage,
                  adminDistCurrentPage * itemsPerPage
                );

                const exportToAdminCSV = () => {
                  if (sortedAdminDistribution.length === 0) return;

                  const headers = [
                    'N°',
                    'Tratamiento Clinico',
                    'Sesiones (Volumen)',
                    '% Volumen',
                    'Ingresos Brutos ($)',
                    '% Ingresos',
                    'Monto Volumen (50%)',
                    'Monto Ingresos (50%)',
                    'Plan C: Monto Final ($)',
                    '% Total',
                    'Costo por Sesión'
                  ];

                  const rows = sortedAdminDistribution.map((item, idx) => [
                    idx + 1,
                    item.name,
                    item.count,
                    item.pctCount.toFixed(4) + '%',
                    item.revenue.toFixed(2),
                    item.pctRevenue.toFixed(4) + '%',
                    item.allocCount.toFixed(2),
                    item.allocRevenue.toFixed(2),
                    item.allocMixed.toFixed(2),
                    item.pctOfTotalAlloc.toFixed(4) + '%',
                    (item.count > 0 ? (item.allocMixed / item.count) : 0).toFixed(2)
                  ]);

                  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
                    + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
                  
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `plan_c_distribucion_administrativo_${appliedDateRange.start || 'historico'}_a_${appliedDateRange.end || 'historico'}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                };

                return (
                  <div className="bg-[#e6e7ee] p-6 rounded-[2.5rem] shadow-[inset_6px_6px_12px_#b8b9be,inset_-6px_-6px_12px_#ffffff] border border-white/40 animate-in slide-in-from-top-4 duration-300 flex flex-col gap-6">
                    {/* Cabecera del Panel */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                          <div className="w-2 h-5 bg-emerald-500 rounded-full"></div>
                          TABLA DE PRORRATEO DEFINITIVA (PLAN C - ADMINISTRATIVO)
                        </h4>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                          Listado completo y exhaustivo de todos los tratamientos de la clínica bajo distribución equitativa de costos administrativos (50/50).
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {/* Buscador */}
                        <div className="relative flex-1 md:flex-none md:w-60">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="text"
                            placeholder="Buscar por tratamiento..."
                            value={adminDistSearchQuery}
                            onChange={(e) => {
                              setAdminDistSearchQuery(e.target.value);
                              setAdminDistCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#e6e7ee] text-slate-700 text-xs shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] border-none focus:outline-none"
                          />
                        </div>

                        {/* Ordenación */}
                        <select
                          value={adminDistSortOrder}
                          onChange={(e) => {
                            setAdminDistSortOrder(e.target.value);
                            setAdminDistCurrentPage(1);
                          }}
                          className="px-3 py-2 rounded-xl bg-[#e6e7ee] text-slate-700 text-xs font-black shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] border-none outline-none cursor-pointer focus:ring-1 focus:ring-emerald-500/20"
                        >
                          <option value="allocMixedDesc">Asignación: Mayor a Menor</option>
                          <option value="allocMixedAsc">Asignación: Menor a Mayor</option>
                          <option value="countDesc">Sesiones: Mayor a Menor</option>
                          <option value="revenueDesc">Ingresos: Mayor a Menor</option>
                          <option value="nameAsc">Tratamiento: A - Z</option>
                        </select>

                        {/* Exportar */}
                        <button
                          onClick={exportToAdminCSV}
                          disabled={sortedAdminDistribution.length === 0}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-xl shadow-[3px_3px_6px_rgba(16,185,129,0.3)] hover:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                          <span>Exportar CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Tabla de Resultados */}
                    <div className="overflow-x-auto rounded-3xl">
                      {isListLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-[#e6e7ee] rounded-2xl shadow-inner">
                          <div className="w-8 h-8 rounded-full border-4 border-emerald-500/30 border-t-emerald-600 animate-spin"></div>
                          <span className="text-xs font-bold text-slate-500">Cargando estadísticas de tratamientos...</span>
                        </div>
                      ) : paginatedAdminData.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-bold bg-[#e6e7ee] rounded-2xl shadow-inner border border-white/20">
                          Ningún tratamiento coincide con la búsqueda
                        </div>
                      ) : (
                        <table className="w-full border-separate border-spacing-y-2 text-left">
                          <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              <th className="pb-1 pl-4 text-center w-12">N°</th>
                              <th className="pb-1">Tratamiento Clínico</th>
                              <th className="pb-1 text-center w-36">Sesiones (Volumen)</th>
                              <th className="pb-1 text-right pr-4 w-36">Ingresos Brutos ($)</th>
                              <th className="pb-1 text-right pr-4 w-36">Monto Volumen (50%)</th>
                              <th className="pb-1 text-right pr-4 w-36">Monto Ingresos (50%)</th>
                              <th className="pb-1 text-right pr-4 w-44 bg-emerald-500/10 rounded-t-xl border-x border-t border-emerald-200/50 text-emerald-800">Plan C: Monto Final ($)</th>
                              <th className="pb-1 text-center w-24">% Total</th>
                              <th className="pb-1 text-right pr-4 w-36">Costo por Sesión</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedAdminData.map((item, index) => {
                              const globalIndex = (adminDistCurrentPage - 1) * itemsPerPage + index + 1;
                              return (
                                <tr key={item.name} className="group transition-all hover:bg-white/30">
                                  <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] rounded-l-2xl p-2.5 text-center font-bold text-slate-400 tabular-nums">
                                    {globalIndex}
                                  </td>
                                  <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] p-2.5 font-bold text-slate-700 leading-snug">
                                    {item.name}
                                  </td>
                                  <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] p-2.5 text-center font-semibold text-slate-500 tabular-nums text-xs">
                                    {new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(item.count)}{' '}
                                    <span className="text-[9px] text-slate-400 font-medium">({item.pctCount.toFixed(3)}%)</span>
                                  </td>
                                  <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] p-2.5 text-right pr-4 font-semibold text-slate-600 tabular-nums text-xs">
                                    {formatCurrency(item.revenue)}{' '}
                                    <span className="text-[9px] text-slate-400 font-medium">({item.pctRevenue.toFixed(3)}%)</span>
                                  </td>
                                  <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] p-2.5 text-right pr-4 font-medium text-slate-500 tabular-nums text-xs">
                                    {formatCurrency(item.allocCount)}
                                  </td>
                                  <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] p-2.5 text-right pr-4 font-medium text-slate-500 tabular-nums text-xs">
                                    {formatCurrency(item.allocRevenue)}
                                  </td>
                                  <td className="p-2.5 text-right pr-4 font-black text-emerald-700 tabular-nums text-xs bg-emerald-500/5 group-hover:bg-emerald-500/10 border-x border-emerald-200/50 shadow-inner">
                                    {formatCurrency(item.allocMixed)}
                                  </td>
                                  <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] p-2.5 text-center font-black text-slate-700 tabular-nums text-xs">
                                    {item.pctOfTotalAlloc.toFixed(4)}%
                                  </td>
                                  <td className="bg-[#e6e7ee] shadow-[1px_1px_2px_rgba(0,0,0,0.01)] rounded-r-2xl p-2.5 text-right pr-4 font-black text-slate-700 tabular-nums text-xs">
                                    {formatCurrency(item.count > 0 ? (item.allocMixed / item.count) : 0)}
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Fila de Totales */}
                            {(() => {
                              const totalSess = sortedAdminDistribution.reduce((acc, item) => acc + item.count, 0);
                              const totalRev = sortedAdminDistribution.reduce((acc, item) => acc + item.revenue, 0);
                              const totalVolAlloc = sortedAdminDistribution.reduce((acc, item) => acc + item.allocCount, 0);
                              const totalRevAlloc = sortedAdminDistribution.reduce((acc, item) => acc + item.allocRevenue, 0);
                              const totalMixedAlloc = sortedAdminDistribution.reduce((acc, item) => acc + item.allocMixed, 0);
                              const totalPct = sortedAdminDistribution.reduce((acc, item) => acc + item.pctOfTotalAlloc, 0);
                              
                              return (
                                <tr className="bg-slate-900/5 rounded-2xl border border-white/50 font-black">
                                  <td className="p-3 pl-4 rounded-l-2xl text-center text-slate-500 font-bold">∑</td>
                                  <td className="p-3 text-slate-800 uppercase tracking-tight text-xs font-black">Totales consolidados</td>
                                  <td className="p-3 text-center text-slate-700 tabular-nums text-xs">{new Intl.NumberFormat('es-CO').format(totalSess)} <span className="text-[9px] text-slate-400 font-bold">(100%)</span></td>
                                  <td className="p-3 text-right pr-4 text-slate-700 tabular-nums text-xs">{formatCurrency(totalRev)} <span className="text-[9px] text-slate-400 font-bold">(100%)</span></td>
                                  <td className="p-3 text-right pr-4 text-slate-600 tabular-nums text-xs">{formatCurrency(totalVolAlloc)}</td>
                                  <td className="p-3 text-right pr-4 text-slate-600 tabular-nums text-xs">{formatCurrency(totalRevAlloc)}</td>
                                  <td className="p-3 text-right pr-4 text-emerald-700 bg-emerald-500/10 border-x border-b border-emerald-200/50 shadow-inner tabular-nums text-xs font-black">{formatCurrency(totalMixedAlloc)}</td>
                                  <td className="p-3 text-center text-slate-800 tabular-nums text-xs font-black">{totalPct.toFixed(4)}%</td>
                                  <td className="p-3 rounded-r-2xl text-right pr-4 text-slate-800 tabular-nums text-xs font-black">{formatCurrency(totalSess > 0 ? (totalMixedAlloc / totalSess) : 0)}</td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Paginación */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 mt-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          Mostrando <strong className="text-slate-700">{((adminDistCurrentPage - 1) * itemsPerPage) + 1}</strong> a <strong className="text-slate-700">{Math.min(adminDistCurrentPage * itemsPerPage, sortedAdminDistribution.length)}</strong> de <strong className="text-slate-700">{sortedAdminDistribution.length}</strong> tratamientos
                        </span>
                        
                        <div className="flex items-center gap-1.5 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] bg-[#e6e7ee] p-1.5 rounded-xl border border-white/40">
                          <button
                            onClick={() => setAdminDistCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={adminDistCurrentPage === 1}
                            className={`p-1.5 rounded-lg border border-white/50 transition-all ${
                              adminDistCurrentPage === 1
                                ? 'opacity-40 cursor-not-allowed text-slate-400'
                                : 'bg-[#e6e7ee] text-emerald-600 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] hover:shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff] active:scale-95'
                            }`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                          </button>
                          
                          <span className="text-[10px] font-black text-slate-600 px-2.5">
                            Pág. <strong className="text-emerald-700">{adminDistCurrentPage}</strong> de {totalPages}
                          </span>
                          
                          <button
                            onClick={() => setAdminDistCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={adminDistCurrentPage === totalPages}
                            className={`p-1.5 rounded-lg border border-white/50 transition-all ${
                              adminDistCurrentPage === totalPages
                                ? 'opacity-40 cursor-not-allowed text-slate-400'
                                : 'bg-[#e6e7ee] text-emerald-600 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] hover:shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff] active:scale-95'
                            }`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Matriz de Energía Acumulada (Kw) */}
            {(() => {
              if (activeDashboardTreatments.length === 0) return null;

              return (
                <div className="mt-8 pt-6 border-t border-slate-300/30 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-4 px-2 flex items-center gap-2">
                    <div className="w-2 h-4 bg-emerald-500 rounded-full"></div>
                    Desglose de Consumo de Energía por Tratamiento (Kw)
                  </h4>
                  <div className="bg-[#e6e7ee] rounded-[2rem] p-4 shadow-[inset_8px_8px_16px_#b8b9be,inset_-8px_-8px_16px_#ffffff] overflow-x-auto border border-white/40">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr>
                          <th className="py-2.5 px-3 font-black text-emerald-700 uppercase text-[10px] tracking-widest w-40 bg-emerald-500/10 rounded-tl-2xl border-b-2 border-r-2 border-white/50">Consumo Acumulado</th>
                          {activeDashboardTreatments.map((t) => (
                            <th key={t} className="py-2.5 px-3 font-black text-emerald-700 uppercase text-[10px] tracking-widest text-center bg-emerald-500/10 border-b-2 border-white/50 border-r-2 border-white/50">
                              {t}
                            </th>
                          ))}
                          <th className="py-2.5 px-3 font-black text-emerald-850 uppercase text-[10px] tracking-widest text-center bg-emerald-500/20 rounded-tr-2xl border-b-2 border-white/50">
                            Kw total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Fila 1: Kw por Sesión */}
                        <tr className="group/row transition-all hover:bg-white/40">
                          <td className="py-2 px-3 font-black text-slate-600 bg-emerald-500/10 border-r-2 border-white/50 border-b-2 border-white/50 uppercase text-[10px] tracking-tight">
                            Kw por Sesión
                          </td>
                          {activeDashboardTreatments.map((t) => {
                            const energiaRow = (serviceAdminCosts[t] || []).find(r => r.id === 'energia' || r.adminId === '1');
                            const kw = energiaRow ? (energiaRow.kw || 0) : 0;
                            return (
                              <td key={t} className="py-2 px-3 text-center font-bold text-slate-600 border-b border-white/50 border-r border-slate-300/20 text-[11px] tabular-nums">
                                {kw > 0 ? `${kw} Kw` : '-'}
                              </td>
                            );
                          })}
                          <td className="py-2 px-3 text-center font-black text-emerald-800 bg-emerald-500/10 border-b-2 border-white/50 text-[11px]">-</td>
                        </tr>

                        {/* Fila 2: Sesiones en Período */}
                        <tr className="group/row transition-all hover:bg-white/40">
                          <td className="py-2 px-3 font-black text-slate-600 bg-emerald-500/10 border-r-2 border-white/50 border-b-2 border-white/50 uppercase text-[10px] tracking-tight">
                            N° de Sesiones
                          </td>
                          {activeDashboardTreatments.map((t) => {
                            const count = serviceRevenueStats[t]?.count || 0;
                            return (
                              <td key={t} className="py-2 px-3 text-center font-bold text-slate-600 border-b border-white/50 border-r border-slate-300/20 text-[11px] tabular-nums">
                                {count}
                              </td>
                            );
                          })}
                          <td className="py-2 px-3 text-center font-black text-emerald-800 bg-emerald-500/10 border-b-2 border-white/50 text-[11px] tabular-nums">
                            {activeDashboardTreatments.reduce((acc, t) => acc + (serviceRevenueStats[t]?.count || 0), 0)}
                          </td>
                        </tr>

                        {/* Fila 3: Kw Acumulado */}
                        <tr className="group/row transition-all hover:bg-white/40">
                          <td className="py-2 px-3 font-black text-emerald-700 bg-emerald-500/10 border-r-2 border-white/50 rounded-bl-2xl uppercase text-[10px] tracking-tight">
                            Consumo Total (Kw)
                          </td>
                          {activeDashboardTreatments.map((t) => {
                            const energiaRow = (serviceAdminCosts[t] || []).find(r => r.id === 'energia' || r.adminId === '1');
                            const kw = energiaRow ? (energiaRow.kw || 0) : 0;
                            const count = serviceRevenueStats[t]?.count || 0;
                            const totalKw = kw * count;
                            return (
                              <td key={t} className="py-2 px-3 text-center font-black text-emerald-600 border-r border-slate-300/20 text-[12px] tabular-nums">
                                {totalKw > 0 ? `${totalKw} Kw` : ''}
                              </td>
                            );
                          })}
                          <td className="py-2 px-3 text-center font-black text-emerald-850 bg-emerald-500/25 rounded-br-2xl text-[13px] tabular-nums">
                            {totalKwConsumidoTratamientos} Kw
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Nuevo Desplegable: Agregar Tratamientos Dinámicos con Buscador */}
      <div className="flex justify-start px-2 mt-2 z-30">
        <div className="relative w-auto min-w-[250px]" ref={treatmentDropdownRef}>
          <button
            type="button"
            onClick={() => setShowTreatmentDropdown(!showTreatmentDropdown)}
            className="w-full bg-[#e6e7ee] shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] hover:shadow-[inset_4px_4px_10px_#b8b9be,inset_-4px_-4px_10px_#ffffff] px-6 py-2.5 rounded-xl text-[10px] font-black text-blue-600 uppercase tracking-widest transition-all text-left flex items-center justify-between outline-none"
          >
            <span>+ AGREGAR TRATAMIENTOS</span>
            <Plus size={12} className="text-blue-600 shrink-0 ml-4" />
          </button>

          {showTreatmentDropdown && (
            <div className="absolute left-0 mt-2 w-full min-w-[250px] bg-[#e6e7ee] rounded-2xl shadow-[10px_10px_30px_#b8b9be,-10px_-10px_30px_#ffffff] border border-white/60 p-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Campo de búsqueda interna */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar tratamiento..."
                  value={treatmentSearchQuery}
                  onChange={(e) => setTreatmentSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#e6e7ee] text-slate-700 text-xs shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] border-none focus:outline-none"
                />
              </div>

              {/* Lista de resultados filtrados */}
              <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                {filteredAndSortedTreatmentsForSearch.length === 0 ? (
                  <span className="text-[10px] text-center text-slate-400 py-3 font-bold uppercase tracking-wider">No se encontraron tratamientos</span>
                ) : (
                  filteredAndSortedTreatmentsForSearch.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        handleAddTreatment(t);
                        setTreatmentSearchQuery('');
                        setShowTreatmentDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold text-slate-650 hover:bg-white/50 hover:text-blue-600 transition-colors flex justify-between items-center uppercase"
                    >
                      <span className="truncate">{t}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rejilla de Servicios y Costos Consolidados (Al final para que baje al desplegar) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2 pb-4">
        {activeDashboardTreatments.map((serviceName, idx) => {
          const serviceItems = serviceInsumos[serviceName] || [];
          const itemsList = serviceItems.filter(item => item.insumoId !== 'multiplier');
          const multiplierItem = serviceItems.find(item => item.insumoId === 'multiplier');
          const packageMultiplier = multiplierItem ? multiplierItem.cantidad : 1;
          const insumosCost = itemsList.reduce((acc, item) => acc + ((insumos.find(i => i.id === item.insumoId)?.valor || 0) * item.cantidad), 0) * packageMultiplier;
          const serviceDistribution = calculatedDistribution.find(item => item.name.toLowerCase() === serviceName.toLowerCase());
          const serviceCostPerSession = serviceDistribution 
            ? (serviceDistribution.count > 0 ? (serviceDistribution.allocMixed / serviceDistribution.count) : 0)
            : 0;

          const personalCost = ((serviceStaffTimes[serviceName] || []).reduce((acc, row) => {
            const depPrice = dependencyPrices[row.tipo === 'Doctor' ? 'Doctores' : row.tipo === 'Enfermera' ? 'Enfermeras' : ''] || 0;
            const val = row.tipo === 'Administrativos' ? row.valor : row.mins * depPrice;
            return acc + val;
          }, 0)) + serviceCostPerSession;
          const serviceAdminDistribution = calculatedAdminDistribution.find(item => item.name.toLowerCase() === serviceName.toLowerCase());
          const serviceAdminCostPerSession = serviceAdminDistribution 
            ? (serviceAdminDistribution.count > 0 ? (serviceAdminDistribution.allocMixed / serviceAdminDistribution.count) : 0)
            : 0;

          const energiaRowForCard = (serviceAdminCosts[serviceName] || []).find(r => r.id === 'energia' || r.adminId === '1');
          const directEnergiaCostForCard = energiaRowForCard ? ((energiaRowForCard.kw || 0) * precioPorKw) : 0;
          const adminCost = directEnergiaCostForCard + serviceAdminCostPerSession;
          
          const stats = serviceRevenueStats[serviceName] || { count: 0, revenue: 0 };
          const valorCobrado = stats.count > 0 ? stats.revenue / stats.count : 0;
          const costoPorSesion = insumosCost + personalCost + adminCost;
          const gananciaSesion = valorCobrado - costoPorSesion;

          const isActive = activeService === serviceName;

          return (
            <div 
              key={idx} 
              className="relative group/card h-full dynamic-order"
              style={{
                '--mobile-order': idx,
                '--desktop-order': Math.floor(idx / 3)
              } as React.CSSProperties}
            >
              <button 
                onClick={() => setActiveService(isActive ? null : serviceName)}
                className={`w-full h-full bg-[#e6e7ee] p-6 rounded-[2.5rem] shadow-[15px_15px_30px_#b8b9be,-15px_-15px_30px_#ffffff] border border-white/40 flex flex-col gap-4 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] text-left ${
                  isActive ? 'shadow-[inset_10px_10px_20px_#b8b9be,inset_-10px_-10px_20px_#ffffff]' : ''
                }`}
              >
                {/* Título del Servicio */}
                <div className="bg-[#e6e7ee] shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] p-4 rounded-2xl text-center">
                  <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">{serviceName}</h4>
                </div>

              {/* Detalles de Costos */}
              <div className="space-y-3">
                {[
                  { label: '$ Insumos', value: insumosCost, color: 'text-orange-500' },
                  { label: '$ Personal', value: personalCost, color: 'text-blue-500' },
                  { label: '$ Administrati', value: adminCost, color: 'text-emerald-500' },
                  { label: 'VALOR COBRADO', value: valorCobrado, color: 'text-slate-700 font-extrabold' },
                  { label: 'COSTO POR SESIÓN', value: costoPorSesion, color: 'text-slate-700 font-extrabold' },
                  { label: 'GANANCIA POR SESIÓN', value: gananciaSesion, color: gananciaSesion >= 0 ? 'text-emerald-600 font-black' : 'text-red-500 font-black' },
                ].map((row, rIdx) => (
                  <div key={rIdx} className="flex items-stretch">
                    <div className="bg-[#e6e7ee] shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] px-4 py-2 rounded-l-xl flex-1 flex items-center">
                      <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-tighter leading-none">{row.label}</span>
                    </div>
                    <div className={`${
                      row.label === 'GANANCIA POR SESIÓN'
                        ? 'bg-[#b3ccf1] shadow-[inset_3px_3px_6px_#9cb2ce,inset_-3px_-3px_6px_#ffffff]'
                        : 'bg-[#e6e7ee] shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff]'
                    } px-4 py-2 rounded-r-xl w-28 flex items-center justify-end gap-1`}>
                      <span className={`text-[11.5px] font-black opacity-60 ${row.label === 'GANANCIA POR SESIÓN' ? 'text-[#0f44bb]' : row.color}`}>$</span>
                      <span className={`text-[13px] font-black ${row.label === 'GANANCIA POR SESIÓN' ? 'text-[#0f44bb]' : row.color}`}>{row.value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </button>
            </div>
          );
        })}

        {/* Desplegable Detallado del Servicio Seleccionado */}
        {activeService && (() => {
          const activeIdx = activeDashboardTreatments.findIndex(t => t === activeService);
          return (
            <div 
              className="col-span-1 md:col-span-3 mt-4 mb-4 p-8 bg-[#e6e7ee] rounded-[3rem] shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff] border border-white/50 animate-in slide-in-from-top-6 duration-500 overflow-hidden relative dynamic-order"
              style={{
                '--mobile-order': activeIdx,
                '--desktop-order': Math.floor(activeIdx / 3)
              } as React.CSSProperties}
            >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-2.5 h-10 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.4)]" />
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{activeService}</h3>
                <p className="text-slate-500 text-sm font-medium">Análisis detallado de rentabilidad y costos unitarios</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Botón para quitar tratamiento */}
              <button
                onClick={() => handleRemoveTreatment(activeService)}
                className="p-3 px-5 bg-[#e6e7ee] shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] hover:shadow-[inset_4px_4px_10px_#b8b9be,inset_-4px_-4px_10px_#ffffff] rounded-2xl text-slate-400 hover:text-red-500 transition-all flex items-center gap-3 group/delete"
                title="Quitar tratamiento del panel"
              >
                <Trash2 size={20} className="transition-transform group-hover/delete:scale-110" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:inline">Quitar del Panel</span>
              </button>

              {/* Botón cerrar */}
              <button 
                onClick={() => setActiveService(null)}
                className="p-3 bg-[#e6e7ee] shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] hover:shadow-[inset_4px_4px_10px_#b8b9be,inset_-4px_-4px_10px_#ffffff] rounded-2xl text-slate-400 hover:text-blue-500 transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Columna de Insumos del Servicio */}
            <div className="space-y-6">
              {(() => {
                const serviceItems = serviceInsumos[activeService] || [];
                const itemsList = serviceItems.filter(item => item.insumoId !== 'multiplier');
                const multiplierItem = serviceItems.find(item => item.insumoId === 'multiplier');
                const activePackageMultiplier = multiplierItem ? multiplierItem.cantidad : 1;
                const baseInsumosCost = itemsList.reduce((acc, item) => {
                  const insumo = insumos.find(i => i.id === item.insumoId);
                  return acc + ((insumo?.valor || 0) * item.cantidad);
                }, 0);
                const hasValidInsumos = itemsList.length > 0;

                return (
                  <>
                    <div className="flex flex-col gap-4 px-2 relative z-30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shadow-inner border border-orange-200/20">
                          <Package size={18} />
                        </div>
                        <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">Insumos del Servicio</h4>
                      </div>
                      <div className="relative w-full z-40" ref={insumoDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setShowInsumoDropdown(!showInsumoDropdown)}
                          className="w-full bg-[#e6e7ee] shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] hover:shadow-[inset_4px_4px_10px_#b8b9be,inset_-4px_-4px_10px_#ffffff] px-6 py-2.5 rounded-xl text-[10px] font-black text-blue-600 uppercase tracking-widest transition-all text-left flex items-center justify-between outline-none"
                        >
                          <span>+ Agregar Insumo</span>
                          <Plus size={12} className="text-blue-600 shrink-0" />
                        </button>

                        {showInsumoDropdown && (
                          <div className="absolute left-0 mt-2 w-full bg-[#e6e7ee] rounded-2xl shadow-[10px_10px_30px_#b8b9be,-10px_-10px_30px_#ffffff] border border-white/60 p-4 z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Campo de búsqueda interna */}
                            <div className="relative mb-3">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                              <input
                                type="text"
                                autoFocus
                                placeholder="Escribe para buscar..."
                                value={insumoSearchQuery}
                                onChange={(e) => setInsumoSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#e6e7ee] text-slate-700 text-xs shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] border-none focus:outline-none"
                              />
                            </div>

                            {/* Lista de resultados filtrados */}
                            <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                              {filteredAndSortedInsumosForSearch.length === 0 ? (
                                <span className="text-[10px] text-center text-slate-455 py-3 font-bold uppercase tracking-wider">No se encontraron insumos</span>
                              ) : (
                                filteredAndSortedInsumosForSearch.map((ins) => (
                                  <button
                                    key={ins.id}
                                    type="button"
                                    onClick={() => {
                                      handleAddInsumoToService(activeService, ins.id);
                                      setInsumoSearchQuery('');
                                      setShowInsumoDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold text-slate-650 hover:bg-white/50 hover:text-blue-600 transition-colors flex justify-between items-center"
                                  >
                                    <span className="truncate mr-2">{ins.detalle}</span>
                                    <span className="shrink-0 font-black text-blue-500">{formatCurrency(ins.valor)}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative z-0 space-y-2 max-h-[400px] overflow-y-auto overflow-x-hidden pr-2 pt-1 pb-1 custom-scrollbar">
                      {!hasValidInsumos ? (
                        <div className="py-10 border-2 border-dashed border-slate-300 rounded-[2rem] flex flex-col items-center justify-center opacity-40 bg-white/5">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin insumos asignados</p>
                        </div>
                      ) : (
                        itemsList.map((item, index) => {
                          const insumoDetails = insumos.find(i => i.id === item.insumoId);
                          return (
                            <div key={item.id} className="flex items-center gap-2 group animate-in fade-in slide-in-from-left-4 duration-300 w-full min-w-0">
                              <div className="flex-1 flex items-center h-10 bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] rounded-xl px-4 border border-white/40 min-w-0">
                                <div className="flex-1 min-w-0 mr-2 py-2">
                                  <NeumorphicTooltip text={insumoDetails?.detalle || ''} position={index === 0 ? 'bottom' : 'top'}>
                                    <span className="text-[10px] font-bold text-slate-600 block truncate">{insumoDetails?.detalle}</span>
                                  </NeumorphicTooltip>
                                </div>
                                
                                <div className="flex items-center shrink-0 ml-auto">
                                  {/* Selector de Cantidad */}
                                  <div className="relative group/qty w-12 shrink-0">
                                    <input 
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={item.cantidad}
                                      onChange={(e) => handleUpdateServiceInsumoQuantity(activeService, item.id, parseFloat(e.target.value) || 0)}
                                      className="w-full bg-white/40 shadow-inner rounded-lg py-1 text-center text-[11px] font-black text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-400/30 transition-all tabular-nums"
                                    />
                                  </div>
                                  <span className="text-[11px] font-black text-orange-600 w-16 text-right tabular-nums shrink-0">
                                    {formatCurrency((insumoDetails?.valor || 0) * item.cantidad)}
                                  </span>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleRemoveInsumoFromService(activeService, item.id)}
                                className="w-10 h-10 flex items-center justify-center bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] rounded-xl text-slate-400 hover:text-red-500 transition-all shrink-0"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    {/* Sumatoria Total de Insumos */}
                    {hasValidInsumos && (
                      <div className="flex flex-col gap-3 mt-0 pt-0.5 border-t border-slate-300/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Opción "Paquete por" */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-center h-12 bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] rounded-2xl px-6 border border-white/40">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] flex-1">Paquete por</span>
                            <div className="relative w-20 shrink-0">
                              <input 
                                type="number"
                                min="0.01"
                                step="any"
                                value={activePackageMultiplier}
                                onChange={(e) => handleUpdateServicePackageMultiplier(activeService, parseFloat(e.target.value) || 1)}
                                className="w-full bg-white/40 shadow-inner rounded-xl py-1.5 text-center text-[13px] font-black text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-400/30 transition-all tabular-nums"
                              />
                            </div>
                          </div>
                          <div className="w-10 shrink-0" />
                        </div>

                        {/* Total Insumos del Servicio */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-center h-12 bg-white/40 shadow-inner rounded-2xl px-6 border border-orange-200/30">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] flex-1">Total Insumos del Servicio</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-black text-orange-600 tracking-tighter">
                                {formatCurrency(baseInsumosCost * activePackageMultiplier)}
                              </span>
                            </div>
                          </div>
                          <div className="w-10 shrink-0" />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Columna de Personal del Servicio (Placeholder para consistencia) */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-inner border border-blue-200/20">
                  <Users size={18} />
                </div>
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">Tiempos del Personal</h4>
              </div>

              <div className="space-y-2 pr-2">
                {/* Encabezado Simple */}
                <div className="flex px-4 mb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="flex-1">Tipo</span>
                  <span className="w-20 text-center">Minutos</span>
                  <span className="w-24 text-right">Valor</span>
                </div>

                {/* Filas de Personal */}
                {serviceStaffTimes[activeService]?.filter(row => row.tipo !== 'Administrativos').map((row) => {
                  const depPrice = dependencyPrices[row.tipo === 'Doctor' ? 'Doctores' : row.tipo === 'Enfermera' ? 'Enfermeras' : ''] || 0;
                  const calculatedValor = row.mins * depPrice;
                  
                  return (
                    <div key={row.id} className="flex items-center h-10 bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] rounded-xl px-4 border border-white/40">
                      <span className="flex-1 text-[10px] font-bold text-slate-600 uppercase tracking-tight">{row.tipo}</span>
                      
                      <div className="w-20 flex justify-center">
                        <div className="relative group/qty w-14">
                          <input 
                            type="number"
                            value={row.mins}
                            onChange={(e) => handleUpdateServiceStaffTime(activeService, row.id, 'mins', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white/40 shadow-inner rounded-lg py-1 text-center text-[11px] font-black text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-400/30 transition-all tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="w-24 flex justify-end items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-black">$</span>
                        <span className={`text-[11px] font-black tabular-nums ${row.tipo === 'Doctor' ? 'text-blue-600' : 'text-emerald-600'}`}>
                          {calculatedValor.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Fila de Operativos (Plan C) */}
                {(() => {
                  const activeServiceDistribution = calculatedDistribution.find(item => item.name.toLowerCase() === activeService.toLowerCase());
                  const activeServiceCostPerSession = activeServiceDistribution 
                    ? (activeServiceDistribution.count > 0 ? (activeServiceDistribution.allocMixed / activeServiceDistribution.count) : 0)
                    : 0;

                  return (
                    <div className="flex items-center h-10 bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] rounded-xl px-4 border border-white/40 border-l-4 border-l-blue-500">
                      <span className="flex-1 text-[10px] font-black text-blue-700 uppercase tracking-tight">OPERATIVOS</span>
                      
                      <div className="w-20 flex justify-center">
                        <NeumorphicExplanationTooltip
                          title="Costo Indirecto Prorrateado"
                          text="Este costo representa la parte proporcional de tiempo ocioso y operativo asignado por el Plan C por sesión de tratamiento."
                        >
                          <span className="text-[11px] font-bold text-slate-400 cursor-help uppercase tracking-tight">Indirecto</span>
                        </NeumorphicExplanationTooltip>
                      </div>

                      <div className="w-24 flex justify-end items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-black">$</span>
                        <span className="text-[11px] font-black tabular-nums text-blue-700">
                          {activeServiceCostPerSession.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Sumatoria Total de Personal */}
              <div className="flex items-center gap-3 mt-0 pt-0.5 border-t border-slate-300/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex-1 flex items-center h-12 bg-white/40 shadow-inner rounded-2xl px-6 border border-blue-200/30">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] flex-1">Total Personal</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-blue-600 tracking-tighter">
                      {(() => {
                        const directStaffCost = serviceStaffTimes[activeService]?.reduce((acc, row) => {
                          const depPrice = dependencyPrices[row.tipo === 'Doctor' ? 'Doctores' : row.tipo === 'Enfermera' ? 'Enfermeras' : ''] || 0;
                          return acc + (row.tipo === 'Administrativos' ? row.valor : row.mins * depPrice);
                        }, 0) || 0;

                        const activeServiceDistribution = calculatedDistribution.find(item => item.name.toLowerCase() === activeService.toLowerCase());
                        const activeServiceCostPerSession = activeServiceDistribution 
                          ? (activeServiceDistribution.count > 0 ? (activeServiceDistribution.allocMixed / activeServiceDistribution.count) : 0)
                          : 0;

                        return formatCurrency(directStaffCost + activeServiceCostPerSession);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna de Gastos Administrativos del Servicio */}
            <div className="space-y-6">
              <div className="flex flex-col gap-4 px-2 relative z-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner border border-emerald-200/20">
                    <Briefcase size={18} />
                  </div>
                  <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">Gastos Administrativos</h4>
                </div>
              </div>

              <div className="space-y-2 pr-2">
                {/* Encabezado Simple */}
                <div className="flex px-4 mb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="flex-1">Tipo</span>
                  <span className="w-20 text-center">Kw</span>
                  <span className="w-24 text-right">Valor</span>
                </div>

                {/* Fila de Energía Fija */}
                {(() => {
                  const energiaRow = (serviceAdminCosts[activeService] || []).find(r => r.id === 'energia' || r.adminId === '1') || { id: 'energia', adminId: '1', kw: 0, valor: 0 };
                  const calculatedValor = (energiaRow.kw || 0) * precioPorKw;
                  
                  const isEditingThis = editingKw && editingKw.serviceName === activeService && editingKw.id === energiaRow.id;
                  const inputValue = isEditingThis ? editingKw.value : (energiaRow.kw !== undefined ? energiaRow.kw : 0);
                  
                  return (
                    <div key={energiaRow.id} className="flex items-center h-10 bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] rounded-xl px-4 border border-white/40">
                      <span className="flex-1 text-[10px] font-bold text-slate-600 uppercase tracking-tight">ENERGÍA</span>
                      
                      <div className="w-20 flex justify-center">
                        <div className="relative group/qty w-14">
                          <input 
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={inputValue}
                            onFocus={() => setEditingKw({ serviceName: activeService, id: energiaRow.id, value: energiaRow.kw !== undefined ? String(energiaRow.kw) : '0' })}
                            onChange={(e) => {
                              const valStr = e.target.value;
                              setEditingKw({ serviceName: activeService, id: energiaRow.id, value: valStr });
                              handleUpdateServiceAdminKw(activeService, energiaRow.id, parseFloat(valStr) || 0);
                            }}
                            onBlur={() => setEditingKw(null)}
                            className="w-full bg-white/40 shadow-inner rounded-lg py-1 text-center text-[11px] font-black text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-400/30 transition-all tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="w-24 flex justify-end items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-black">$</span>
                        <span className="text-[11px] font-black tabular-nums text-emerald-600">
                          {calculatedValor.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Fila de Indirectos (Plan C) */}
                {(() => {
                  const activeServiceAdminDistribution = calculatedAdminDistribution.find(item => item.name.toLowerCase() === activeService.toLowerCase());
                  const activeServiceAdminCostPerSession = activeServiceAdminDistribution 
                    ? (activeServiceAdminDistribution.count > 0 ? (activeServiceAdminDistribution.allocMixed / activeServiceAdminDistribution.count) : 0)
                    : 0;

                  return (
                    <div className="flex items-center h-10 bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] rounded-xl px-4 border border-white/40 border-l-4 border-l-emerald-500">
                      <span className="flex-1 text-[10px] font-black text-emerald-700 uppercase tracking-tight">ADMINISTRATIVO</span>
                      
                      <div className="w-20 flex justify-center">
                        <NeumorphicExplanationTooltip
                          title="Costo Administrativo Indirecto Prorrateado"
                          text="Este costo representa la porción de los gastos administrativos generales (arriendo, agua, energía restante) asignada a este tratamiento por el Plan C por sesión."
                        >
                          <span className="text-[11px] font-bold text-slate-400 cursor-help uppercase tracking-tight">Indirecto</span>
                        </NeumorphicExplanationTooltip>
                      </div>

                      <div className="w-24 flex justify-end items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-black">$</span>
                        <span className="text-[11px] font-black tabular-nums text-emerald-700">
                          {activeServiceAdminCostPerSession.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Sumatoria Total de Administrativos */}
              <div className="flex items-center gap-3 mt-0 pt-0.5 border-t border-slate-300/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex-1 flex items-center h-12 bg-white/40 shadow-inner rounded-2xl px-6 border border-emerald-200/30">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] flex-1">Total Administrativo</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-emerald-600 tracking-tighter">
                      {(() => {
                        const energiaRow = (serviceAdminCosts[activeService] || []).find(r => r.id === 'energia' || r.adminId === '1');
                        const directEnergiaCost = energiaRow ? ((energiaRow.kw || 0) * precioPorKw) : 0;

                        const activeServiceAdminDistribution = calculatedAdminDistribution.find(item => item.name.toLowerCase() === activeService.toLowerCase());
                        const activeServiceAdminCostPerSession = activeServiceAdminDistribution 
                          ? (activeServiceAdminDistribution.count > 0 ? (activeServiceAdminDistribution.allocMixed / activeServiceAdminDistribution.count) : 0)
                          : 0;

                        return formatCurrency(directEnergiaCost + activeServiceAdminCostPerSession);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla Alargada Inferior */}
          {(() => {
            const stats = serviceRevenueStats[activeService] || { count: 0, revenue: 0 };
            const activeInsumos = serviceInsumos[activeService] || [];
            const insumosFiltered = activeInsumos.filter(row => row.insumoId !== 'multiplier');
            const multiplierRow = activeInsumos.find(row => row.insumoId === 'multiplier');
            const currentPackageMultiplier = multiplierRow ? multiplierRow.cantidad : 1;
            const insumosTotal = insumosFiltered.reduce((acc, row) => acc + (insumos.find(i => i.id === row.insumoId)?.valor || 0) * row.cantidad, 0) * currentPackageMultiplier;
            
            const activeServiceDistribution = calculatedDistribution.find(item => item.name.toLowerCase() === activeService.toLowerCase());
            const activeServiceCostPerSession = activeServiceDistribution 
              ? (activeServiceDistribution.count > 0 ? (activeServiceDistribution.allocMixed / activeServiceDistribution.count) : 0)
              : 0;

            const staffTotal = (serviceStaffTimes[activeService]?.reduce((acc, row) => {
              const depPrice = dependencyPrices[row.tipo === 'Doctor' ? 'Doctores' : row.tipo === 'Enfermera' ? 'Enfermeras' : ''] || 0;
              return acc + (row.tipo === 'Administrativos' ? row.valor : row.mins * depPrice);
            }, 0) || 0) + activeServiceCostPerSession;

            const activeServiceAdminDistribution = calculatedAdminDistribution.find(item => item.name.toLowerCase() === activeService.toLowerCase());
            const activeServiceAdminCostPerSession = activeServiceAdminDistribution 
              ? (activeServiceAdminDistribution.count > 0 ? (activeServiceAdminDistribution.allocMixed / activeServiceAdminDistribution.count) : 0)
              : 0;

            const energiaRowForTotal = (serviceAdminCosts[activeService] || []).find(r => r.id === 'energia' || r.adminId === '1');
            const directEnergiaCostForTotal = energiaRowForTotal ? ((energiaRowForTotal.kw || 0) * precioPorKw) : 0;
            const adminTotal = directEnergiaCostForTotal + activeServiceAdminCostPerSession;
            const totalServiceCost = insumosTotal + staffTotal + adminTotal;

            const unitRevenue = stats.count > 0 ? stats.revenue / stats.count : 0;
            const estimatedProfit = stats.revenue - (totalServiceCost * stats.count);
            const sessionProfit = unitRevenue - totalServiceCost;

            return (
              <div className="mt-8 pt-8 border-t border-white/50 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-[#e6e7ee] rounded-[2rem] p-4 shadow-[inset_8px_8px_16px_#b8b9be,inset_-8px_-8px_16px_#ffffff] overflow-x-auto border border-white/40">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr>
                        <th className="pb-3 font-black text-slate-400 uppercase text-[10px] tracking-widest pl-4">Servicio</th>
                        <th className="pb-3 font-black text-slate-400 uppercase text-[10px] tracking-widest px-4 text-right">Servicios</th>
                        <th className="pb-3 font-black text-slate-400 uppercase text-[10px] tracking-widest px-4 text-right">Acumulado</th>
                        <th className="pb-3 font-black text-slate-400 uppercase text-[10px] tracking-widest px-4 text-right">Valor cobrado</th>
                        <th className="pb-3 font-black text-slate-400 uppercase text-[10px] tracking-widest px-4 text-right">Costo por sesión</th>
                        <th className="pb-3 font-black text-slate-400 uppercase text-[10px] tracking-widest px-4 text-right">Ganancia por sesión</th>
                        <th className="pb-3 font-black text-slate-400 uppercase text-[10px] tracking-widest px-4 text-right">Ganancia estimada</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white/40 rounded-2xl relative shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] group/row transition-all hover:bg-white/60">
                        <td className="py-4 px-5 font-black text-slate-600 whitespace-nowrap bg-indigo-500/10 rounded-l-2xl uppercase text-[11px] tracking-tight">Ingreso {activeService}</td>
                        <td className="py-4 px-5 text-right font-bold text-slate-500 tabular-nums">{stats.count.toLocaleString()}</td>
                        <td className="py-4 px-5 text-right font-black text-emerald-600 tabular-nums">{formatCurrency(stats.revenue)}</td>
                        <td className="py-4 px-5 text-right font-black text-slate-700 tabular-nums">{formatCurrency(unitRevenue)}</td>
                        <td className="py-4 px-5 text-right font-black text-red-650 tabular-nums">{formatCurrency(totalServiceCost)}</td>
                        <td className={`py-4 px-5 text-right font-black tabular-nums ${sessionProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(sessionProfit)}</td>
                        <td className="py-4 px-5 text-right font-black text-indigo-600 rounded-r-2xl bg-indigo-500/5 tabular-nums">{formatCurrency(estimatedProfit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      );
    })()}
      </div>
    </div>
  );
}

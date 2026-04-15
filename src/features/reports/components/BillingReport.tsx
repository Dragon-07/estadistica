'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import {
  DollarSign,
  Building2,
  Calendar,
  X,
  Check,
  TrendingUp,
  Stethoscope,
  Users,
  FileText,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';

/* ─────────────────────────────────────────────
   Tipos internos
   ───────────────────────────────────────────── */
interface RecordWithRevenue {
  entity_name: string;
  treatment_date: string | null;
  doctor_name: string | null;
  treatment_name: string | null;
  patient_name: string;
  patient_doc: string | null;
  revenue: number;
  extra_data: Record<string, unknown> | null;
}

/* ─────────────────────────────────────────────
   Utilidades
   ───────────────────────────────────────────── */
/** Parseo inteligente de números: distingue punto decimal de punto de miles */
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
      // Es decimal (ej: 41999.86), dejarlo como está
    } else {
      // Es separador de miles (ej: 1.234.567)
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseRevenue(extraData: Record<string, unknown> | null): number {
  if (!extraData) return 0;
  return smartParseNumber(extraData['Total final']);
}

/** Parsea un campo de extra_data a número puro (0 si no se puede) */
function parseNumericField(extraData: Record<string, unknown> | null, key: string): number {
  if (!extraData) return 0;
  return smartParseNumber(extraData[key]);
}

function formatCurrency(n: number): string {
  // Formato continuo: sin separadores de miles, punto para decimales
  const hasDecimals = n % 1 !== 0;
  const formatted = hasDecimals ? n.toFixed(2) : n.toFixed(0);
  return `$ ${formatted}`;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

/* Generar un color consistente por índice */
const PALETTE = [
  { from: '#3b82f6', to: '#2563eb' },   // azul
  { from: '#10b981', to: '#059669' },   // verde
  { from: '#8b5cf6', to: '#7c3aed' },   // morado
  { from: '#f59e0b', to: '#d97706' },   // ámbar
  { from: '#ef4444', to: '#dc2626' },   // rojo
  { from: '#06b6d4', to: '#0891b2' },   // cyan
  { from: '#ec4899', to: '#db2777' },   // rosa
  { from: '#14b8a6', to: '#0d9488' },   // teal
  { from: '#f97316', to: '#ea580c' },   // naranja
  { from: '#6366f1', to: '#4f46e5' },   // índigo
];

function getColor(idx: number) {
  return PALETTE[idx % PALETTE.length];
}

/* ─────────────────────────────────────────────
   Componente principal
   ───────────────────────────────────────────── */
export function BillingReport() {
  const [allRecords, setAllRecords] = useState<RecordWithRevenue[]>([]);
  const [availableEntities, setAvailableEntities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros activos
  const [entityFilters, setEntityFilters] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filtros temporales (antes de "Aplicar")
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');

  /* ── Fetch datos ── */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();

      let records: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('medical_records')
          .select('entity_name, treatment_date, doctor_name, treatment_name, patient_name, patient_doc, extra_data');

        if (entityFilters.length > 0) query = query.in('entity_name', entityFilters);
        if (startDate) query = query.gte('treatment_date', startDate);
        if (endDate) query = query.lte('treatment_date', endDate);

        query = query.range(from, from + step - 1);
        const { data, error } = await query;

        if (error) { console.error(error); break; }
        if (data && data.length > 0) {
          records = [...records, ...data];
          from += step;
          if (data.length < step) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      // Mapear a tipo con revenue y extra_data
      const mapped: RecordWithRevenue[] = records.map((r) => ({
        entity_name: r.entity_name || 'N/A',
        treatment_date: r.treatment_date,
        doctor_name: r.doctor_name,
        treatment_name: r.treatment_name,
        patient_name: r.patient_name,
        patient_doc: r.patient_doc,
        revenue: parseRevenue(r.extra_data as Record<string, unknown>),
        extra_data: (r.extra_data as Record<string, unknown>) ?? null,
      }));

      setAllRecords(mapped);

      // Entidades disponibles (solo la primera vez)
      if (availableEntities.length === 0) {
        const { data: entsData } = await supabase.from('unique_entities_view').select('entity_name');
        if (entsData) {
          const unique = entsData
            .map((r) => r.entity_name || 'N/A')
            .sort((a, b) => {
              if (a === 'N/A') return -1;
              if (b === 'N/A') return 1;
              return a.localeCompare(b, 'es', { sensitivity: 'base' });
            });
          setAvailableEntities(unique);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [entityFilters, startDate, endDate]);

  /* ── Cálculos derivados ── */
  const stats = useMemo(() => {
    const totalRevenue = allRecords.reduce((s, r) => s + r.revenue, 0);
    const totalRecords = allRecords.length;
    const uniquePatients = new Set(allRecords.map((r) => r.patient_name)).size;
    const uniqueEntities = new Set(allRecords.map((r) => r.entity_name)).size;
    const avgPerPatient = uniquePatients > 0 ? totalRevenue / uniquePatients : 0;
    const avgPerRecord = totalRecords > 0 ? totalRevenue / totalRecords : 0;
    return { totalRevenue, totalRecords, uniquePatients, uniqueEntities, avgPerPatient, avgPerRecord };
  }, [allRecords]);

  /* Revenue por entidad */
  const revenueByEntity = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number; patients: Set<string> }>();
    allRecords.forEach((r) => {
      if (!map.has(r.entity_name)) map.set(r.entity_name, { revenue: 0, count: 0, patients: new Set() });
      const e = map.get(r.entity_name)!;
      e.revenue += r.revenue;
      e.count += 1;
      e.patients.add(r.patient_name);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, revenue: d.revenue, count: d.count, patients: d.patients.size }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [allRecords]);

  /* Revenue por mes */
  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>();
    allRecords.forEach((r) => {
      if (!r.treatment_date) return;
      const month = r.treatment_date.slice(0, 7); // YYYY-MM
      map.set(month, (map.get(month) || 0) + r.revenue);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, revenue]) => {
        const [y, m] = month.split('-');
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return { month, label: `${monthNames[parseInt(m, 10) - 1]} ${y}`, revenue };
      });
  }, [allRecords]);

  /* Revenue por semana */
  const revenueByWeek = useMemo(() => {
    const map = new Map<string, number>();
    allRecords.forEach((r) => {
      if (!r.treatment_date) return;
      const d = new Date(r.treatment_date + 'T00:00:00');
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const weekKey = monday.toISOString().slice(0, 10);
      map.set(weekKey, (map.get(weekKey) || 0) + r.revenue);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, revenue]) => ({ week, revenue }));
  }, [allRecords]);

  /* Top tratamientos por ingresos */
  const topTreatments = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>();
    allRecords.forEach((r) => {
      const name = r.treatment_name || 'Sin especificar';
      if (!map.has(name)) map.set(name, { revenue: 0, count: 0 });
      const e = map.get(name)!;
      e.revenue += r.revenue;
      e.count += 1;
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, revenue: d.revenue, count: d.count }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [allRecords]);

  /* Top médicos por ingresos */
  const topDoctors = useMemo(() => {
    const map = new Map<string, { revenue: number; patients: Set<string>; count: number }>();
    allRecords.forEach((r) => {
      const name = r.doctor_name || 'Sin asignar';
      if (!map.has(name)) map.set(name, { revenue: 0, patients: new Set(), count: 0 });
      const e = map.get(name)!;
      e.revenue += r.revenue;
      e.patients.add(r.patient_name);
      e.count += 1;
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, revenue: d.revenue, patients: d.patients.size, count: d.count }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [allRecords]);

  /* Revenue por día de la semana */
  const revenueByDayOfWeek = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const totals = new Array(7).fill(0);
    allRecords.forEach((r) => {
      if (!r.treatment_date) return;
      const d = new Date(r.treatment_date + 'T00:00:00');
      totals[d.getDay()] += r.revenue;
    });
    return days.map((label, i) => ({ label, revenue: totals[i] }));
  }, [allRecords]);

  /* ── Handlers ── */
  const handleApplyFilters = () => {
    if (tempStartDate && tempEndDate && tempStartDate > tempEndDate) {
      alert('La fecha de inicio no puede ser posterior a la fecha de fin');
      return;
    }
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
  };

  const handleClearDates = () => {
    setTempStartDate('');
    setTempEndDate('');
    setStartDate('');
    setEndDate('');
  };

  const toggleEntityFilter = (name: string) => {
    if (name === '') { setEntityFilters([]); return; }
    setEntityFilters((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]
    );
  };

  const handleExportExcel = () => {
    // 1. Hoja de Resumen por Entidad
    const summaryRows: any[] = revenueByEntity.map((e, i) => ({
      '#': i + 1,
      'Entidad': e.name,
      'Total Ingresos': e.revenue,
      '# Registros': e.count,
      '# Pacientes': e.patients,
    }));

    // Fila de totales al resumen
    summaryRows.push({
      '#': 'TOTAL',
      'Entidad': '',
      'Total Ingresos': revenueByEntity.reduce((acc, e) => acc + e.revenue, 0),
      '# Registros': revenueByEntity.reduce((acc, e) => acc + e.count, 0),
      '# Pacientes': revenueByEntity.reduce((acc, e) => acc + e.patients, 0),
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

    // 2. Hoja de Detalle Completo de Registros (con columnas numéricas del extra_data)
    const detailRows: any[] = allRecords.map((r, i) => {
      // Número Documento: intentar como número puro
      const docRaw = String(r.patient_doc ?? '').replace(/\s/g, '');
      const docNum = parseFloat(docRaw);
      return {
        '#': i + 1,
        'Fecha': r.treatment_date || 'Sin fecha',
        'Paciente': r.patient_name,
        'Número Documento': isNaN(docNum) ? (r.patient_doc || '') : docNum,
        'Entidad': r.entity_name,
        'Médico': r.doctor_name || 'Sin asignar',
        'Tratamiento': r.treatment_name || 'Sin especificar',
        'Pagos Recibidos': parseNumericField(r.extra_data, 'Pagos Recibidos'),
        'Pagos Pendientes': parseNumericField(r.extra_data, 'Pagos Pendientes'),
        'Valor': parseNumericField(r.extra_data, 'Valor'),
        'Cantidad': parseNumericField(r.extra_data, 'Cantidad'),
        'IVA': parseNumericField(r.extra_data, 'IVA'),
        'TIPO DE IVA': parseNumericField(r.extra_data, 'TIPO DE IVA'),
        'Total Item': parseNumericField(r.extra_data, 'Total Item'),
        'Valor Servicio (Particular o por convenio)': parseNumericField(r.extra_data, 'Valor Servicio (Particular o por convenio)'),
        'Total final': r.revenue,
      };
    });

    // Fila de totales al detalle
    detailRows.push({
      '#': 'TOTAL',
      'Fecha': '',
      'Paciente': '',
      'Número Documento': '',
      'Entidad': '',
      'Médico': '',
      'Tratamiento': '',
      'Pagos Recibidos': allRecords.reduce((acc, r) => acc + parseNumericField(r.extra_data, 'Pagos Recibidos'), 0),
      'Pagos Pendientes': allRecords.reduce((acc, r) => acc + parseNumericField(r.extra_data, 'Pagos Pendientes'), 0),
      'Valor': allRecords.reduce((acc, r) => acc + parseNumericField(r.extra_data, 'Valor'), 0),
      'Cantidad': allRecords.reduce((acc, r) => acc + parseNumericField(r.extra_data, 'Cantidad'), 0),
      'IVA': allRecords.reduce((acc, r) => acc + parseNumericField(r.extra_data, 'IVA'), 0),
      'TIPO DE IVA': '',
      'Total Item': allRecords.reduce((acc, r) => acc + parseNumericField(r.extra_data, 'Total Item'), 0),
      'Valor Servicio (Particular o por convenio)': allRecords.reduce((acc, r) => acc + parseNumericField(r.extra_data, 'Valor Servicio (Particular o por convenio)'), 0),
      'Total final': allRecords.reduce((acc, r) => acc + r.revenue, 0),
    });

    const wsDetails = XLSX.utils.json_to_sheet(detailRows);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen por Entidad');
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Detalle de Registros');

    const range = startDate && endDate ? `${startDate}_a_${endDate}` : 'Historico';
    XLSX.writeFile(wb, `Reporte_Ingresos_${range}.xlsx`);
  };

  /* ── Render loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 rounded-full bg-[#e6e7ee] shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] flex items-center justify-center animate-pulse">
          <div className="w-5 h-5 rounded-full bg-blue-400" />
        </div>
      </div>
    );
  }

  /* ── Sin datos ── */
  if (allRecords.length === 0 && entityFilters.length === 0 && !startDate && !endDate) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-16 h-16 rounded-3xl bg-[#e6e7ee] shadow-[6px_6px_14px_#b8b9be,-6px_-6px_14px_#ffffff] flex items-center justify-center">
          <DollarSign className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">Sin datos de ingresos</p>
        <p className="text-gray-400 text-sm">Sube tus archivos Excel en la pestaña &quot;Procesar Datos&quot;</p>
      </div>
    );
  }

  const maxEntityRevenue = revenueByEntity[0]?.revenue || 1;
  const maxMonthRevenue = Math.max(...revenueByMonth.map((m) => m.revenue), 1);
  const maxDayRevenue = Math.max(...revenueByDayOfWeek.map((d) => d.revenue), 1);
  const maxTreatmentRevenue = topTreatments[0]?.revenue || 1;
  const maxDoctorRevenue = topDoctors[0]?.revenue || 1;

  /* Calcular tendencia mensual */
  const monthTrend = revenueByMonth.length >= 2
    ? ((revenueByMonth[revenueByMonth.length - 1].revenue - revenueByMonth[revenueByMonth.length - 2].revenue) / (revenueByMonth[revenueByMonth.length - 2].revenue || 1)) * 100
    : 0;

  /* ── Render principal ── */
  return (
    <div className="space-y-8 animate-fade-in">

      {/* ═══════════════════ FILTROS SUPERIORES ═══════════════════ */}
      <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Desde */}
            <div className="flex items-center gap-2 px-4 py-2 bg-[#e6e7ee] rounded-2xl shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff]">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Desde:</span>
              <input
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 cursor-pointer outline-none"
              />
            </div>
            {/* Hasta */}
            <div className="flex items-center gap-2 px-4 py-2 bg-[#e6e7ee] rounded-2xl shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff]">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Hasta:</span>
              <input
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 cursor-pointer outline-none"
              />
            </div>

            {/* Aplicar */}
            <button
              onClick={handleApplyFilters}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-2xl text-xs font-bold shadow-[4px_4px_8px_rgba(22,163,74,0.3)] hover:bg-green-700 transition-all transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              Aplicar Periodo
            </button>

            {/* Limpiar */}
            {(tempStartDate || tempEndDate) && (
              <button
                onClick={handleClearDates}
                className="flex items-center gap-2 px-4 py-2 bg-white text-red-500 rounded-2xl text-xs font-bold shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] hover:bg-red-50 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpiar Fechas
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Exportar Excel */}
            <button
              onClick={handleExportExcel}
              disabled={revenueByEntity.length === 0}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-xs font-bold shadow-[4px_4px_10px_rgba(37,99,235,0.3)] hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>

            {/* Badge total */}
            <div className="px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col items-center min-w-[120px]">
              <span className="text-[10px] font-bold text-blue-500 uppercase block leading-tight">Ingreso Total</span>
              <span className="text-lg font-black text-blue-700 leading-tight">{formatCompact(stats.totalRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Filtro por entidad */}
        {availableEntities.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 ml-1">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Filtrar por Entidad</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => toggleEntityFilter('')}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] ${
                  entityFilters.length === 0
                    ? 'bg-blue-600 text-white shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2)]'
                    : 'bg-[#e6e7ee] text-gray-600 hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff]'
                }`}
              >
                Todas
              </button>
              {availableEntities.map((entityName) => {
                const isActive = entityFilters.includes(entityName);
                return (
                  <button
                    key={entityName}
                    onClick={() => toggleEntityFilter(entityName)}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2)]'
                        : 'bg-[#e6e7ee] text-gray-600 hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff]'
                    }`}
                  >
                    {entityName}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════ TARJETAS DE RESUMEN ═══════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'Ingresos Totales',
            value: formatCurrency(stats.totalRevenue),
            subtitle: `${stats.totalRecords.toString()} registros`,
            icon: DollarSign,
            bg: 'from-green-400 to-green-600',
            trend: monthTrend,
          },
          {
            label: 'Promedio / Paciente',
            value: formatCurrency(stats.avgPerPatient),
            subtitle: `${stats.uniquePatients.toString()} pacientes`,
            icon: Users,
            bg: 'from-blue-400 to-blue-600',
          },
          {
            label: 'Promedio / Servicio',
            value: formatCurrency(stats.avgPerRecord),
            subtitle: `${stats.totalRecords.toString()} servicios`,
            icon: Activity,
            bg: 'from-purple-400 to-purple-600',
          },
          {
            label: 'Entidades Activas',
            value: stats.uniqueEntities.toString(),
            subtitle: revenueByEntity[0] ? `Top: ${revenueByEntity[0].name.slice(0, 20)}…` : '',
            icon: Building2,
            bg: 'from-amber-400 to-amber-600',
          },
        ].map(({ label, value, subtitle, icon: Icon, bg, trend }) => (
          <div
            key={label}
            className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${bg} flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)]`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              {trend !== undefined && trend !== 0 && (
                <div className={`flex items-center gap-1 text-xs font-bold ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(trend).toFixed(1)}%
                </div>
              )}
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800 leading-tight">{value}</p>
              <p className="text-gray-400 text-xs mt-1">{subtitle}</p>
            </div>
            <p className="text-gray-500 text-sm font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* ═══════════════════ GRÁFICA: INGRESOS POR MES ═══════════════════ */}
      {revenueByMonth.length > 0 && (
        <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-gray-700 font-bold text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Tendencia de Ingresos Mensuales
            </h3>
            <span className="text-xs font-medium bg-green-100 text-green-700 px-3 py-1 rounded-full">
              {revenueByMonth.length} meses
            </span>
          </div>

          {/* Barras verticales */}
          <div className="flex items-end gap-3 h-52 px-2">
            {revenueByMonth.map((m, i) => {
              const pct = Math.max((m.revenue / maxMonthRevenue) * 100, 4);
              const color = getColor(i);
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatCurrency(m.revenue)}
                  </span>
                  <div
                    className="w-full rounded-xl transition-all duration-500 hover:scale-105 cursor-pointer relative"
                    style={{
                      height: `${pct}%`,
                      background: `linear-gradient(to top, ${color.from}, ${color.to})`,
                      boxShadow: `0 4px 14px ${color.from}40`,
                    }}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-gray-600 whitespace-nowrap">
                      {formatCompact(m.revenue)}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════ GRÁFICA: INGRESOS POR ENTIDAD ═══════════════════ */}
      {revenueByEntity.length > 0 && (
        <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-gray-700 font-bold text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Ingresos por Entidad
            </h3>
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
              {revenueByEntity.length} entidades
            </span>
          </div>

          <div className="space-y-4">
            {revenueByEntity.map((ent, idx) => {
              const pct = Math.round((ent.revenue / maxEntityRevenue) * 100);
              const color = getColor(idx);
              const sharePercent = stats.totalRevenue > 0 ? ((ent.revenue / stats.totalRevenue) * 100).toFixed(1) : '0';
              return (
                <div key={ent.name} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md"
                        style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-gray-700 font-semibold text-sm">{ent.name}</span>
                        <div className="flex items-center gap-3 text-[11px] text-gray-400">
                          <span>{ent.count} registros</span>
                          <span>•</span>
                          <span>{ent.patients} pacientes</span>
                          <span>•</span>
                          <span className="font-bold text-blue-500">{sharePercent}%</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-gray-800 font-bold text-sm">{formatCurrency(ent.revenue)}</span>
                  </div>
                  <div className="h-3 bg-[#e6e7ee] rounded-full shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(to right, ${color.from}, ${color.to})`,
                        boxShadow: `0 2px 8px ${color.from}40`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════ FILA 2: Tratamientos + Médicos ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Tratamientos */}
        {topTreatments.length > 0 && (
          <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
            <h3 className="text-gray-700 font-bold text-lg mb-5 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              Top 10 Tratamientos por Ingreso
            </h3>
            <div className="space-y-3">
              {topTreatments.map((t, idx) => {
                const pct = Math.round((t.revenue / maxTreatmentRevenue) * 100);
                const color = getColor(idx);
                return (
                  <div key={t.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-gray-700 font-medium text-sm truncate max-w-[200px]">{t.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-400 text-xs">{t.count} serv.</span>
                        <span className="font-bold text-gray-700">{formatCompact(t.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#e6e7ee] rounded-full shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(to right, ${color.from}, ${color.to})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Médicos */}
        {topDoctors.length > 0 && (
          <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
            <h3 className="text-gray-700 font-bold text-lg mb-5 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-green-500" />
              Top 10 Médicos por Ingreso
            </h3>
            <div className="space-y-3">
              {topDoctors.map((doc, idx) => {
                const pct = Math.round((doc.revenue / maxDoctorRevenue) * 100);
                const color = getColor(idx);
                return (
                  <div key={doc.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-gray-700 font-medium text-sm">{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-400 text-xs">{doc.patients} pac.</span>
                        <span className="font-bold text-gray-700">{formatCompact(doc.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#e6e7ee] rounded-full shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(to right, ${color.from}, ${color.to})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════ GRÁFICA: INGRESOS POR DÍA DE LA SEMANA ═══════════════════ */}
      {revenueByDayOfWeek.some((d) => d.revenue > 0) && (
        <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
          <h3 className="text-gray-700 font-bold text-lg mb-5 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            Distribución de Ingresos por Día de la Semana
          </h3>
          <div className="flex items-end gap-4 h-44 px-4">
            {revenueByDayOfWeek.map((d, i) => {
              const pct = Math.max((d.revenue / maxDayRevenue) * 100, 3);
              const color = getColor(i);
              const isWeekend = i === 0 || i === 6;
              return (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatCurrency(d.revenue)}
                  </span>
                  <div
                    className="w-full rounded-xl transition-all duration-500 hover:scale-105 cursor-pointer"
                    style={{
                      height: `${pct}%`,
                      background: isWeekend
                        ? 'linear-gradient(to top, #d1d5db, #9ca3af)'
                        : `linear-gradient(to top, ${color.from}, ${color.to})`,
                      boxShadow: isWeekend ? 'none' : `0 4px 14px ${color.from}40`,
                      opacity: isWeekend ? 0.6 : 1,
                    }}
                  />
                  <span className={`text-xs font-semibold ${isWeekend ? 'text-gray-400' : 'text-gray-600'}`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════ TABLA RESUMEN: DISTRIBUCIÓN SEMANAL ═══════════════════ */}
      {revenueByWeek.length > 0 && (
        <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
          <h3 className="text-gray-700 font-bold text-lg mb-5 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-500" />
            Evolución Semanal de Ingresos
          </h3>
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#dcdde3]">
                  <th className="px-5 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wide">Semana (Inicio)</th>
                  <th className="px-5 py-3 text-right text-gray-500 font-semibold text-xs uppercase tracking-wide">Ingresos</th>
                  <th className="px-5 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wide w-1/2">Proporción</th>
                </tr>
              </thead>
              <tbody>
                {revenueByWeek.map((w, i) => {
                  const maxW = Math.max(...revenueByWeek.map((x) => x.revenue), 1);
                  const pct = Math.round((w.revenue / maxW) * 100);
                  const color = getColor(i % PALETTE.length);
                  return (
                    <tr key={w.week} className={`border-t border-[#d0d1d8] ${i % 2 !== 0 ? 'bg-[#e9eaf0]' : ''}`}>
                      <td className="px-5 py-3 text-gray-600 font-mono text-xs">{w.week}</td>
                      <td className="px-5 py-3 text-right text-gray-800 font-bold">{formatCurrency(w.revenue)}</td>
                      <td className="px-5 py-3">
                        <div className="h-2.5 bg-[#e6e7ee] rounded-full shadow-[inset_1px_1px_3px_#b8b9be,inset_-1px_-1px_3px_#ffffff] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(to right, ${color.from}, ${color.to})`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

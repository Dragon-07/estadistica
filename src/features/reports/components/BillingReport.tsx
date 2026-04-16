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

  // Simulador
  const [simIncreasePercent, setSimIncreasePercent] = useState(0);
  const [simPatientsPercent, setSimPatientsPercent] = useState(0);
  const [simOpen, setSimOpen] = useState(false);

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

  /* Top médicos por ingresos (usando columna 'M Tratante') */
  const topDoctors = useMemo(() => {
    const map = new Map<string, { revenue: number; patients: Set<string>; count: number }>();
    allRecords.forEach((r) => {
      const mTratante = r.extra_data?.['M Tratante'];
      const name = mTratante && String(mTratante).trim() !== '' && String(mTratante).trim() !== '-'
        ? String(mTratante).trim()
        : 'Sin asignar';
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

  /* Proyecciones anuales (Forecasting) */
  const forecast = useMemo(() => {
    if (revenueByMonth.length === 0) return null;

    const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth(); // 0-based

    // Determinar el año a proyectar (del último dato disponible)
    const lastDataMonth = revenueByMonth[revenueByMonth.length - 1].month;
    const forecastYear = parseInt(lastDataMonth.split('-')[0], 10);

    // Construir mapa de ingresos reales del año del forecast
    const realMonthMap = new Map<number, number>();
    revenueByMonth.forEach((m) => {
      const [y, mo] = m.month.split('-');
      if (parseInt(y, 10) === forecastYear) {
        realMonthMap.set(parseInt(mo, 10) - 1, m.revenue); // 0-indexed
      }
    });

    // Media ponderada de los últimos 3 meses disponibles (pesos: 50%, 30%, 20%)
    const realEntries = Array.from(realMonthMap.entries()).sort((a, b) => a[0] - b[0]);
    const lastN = realEntries.slice(-3);
    const weights = [0.2, 0.3, 0.5];
    let projectedMonthly = 0;
    if (lastN.length >= 3) {
      projectedMonthly = lastN.reduce((acc, [, rev], i) => acc + rev * weights[i], 0);
    } else if (lastN.length > 0) {
      projectedMonthly = lastN.reduce((acc, [, rev]) => acc + rev, 0) / lastN.length;
    }

    // Construir los 12 meses
    const months: { label: string; monthIdx: number; revenue: number; isReal: boolean; isProjected: boolean }[] = [];
    let totalReal = 0;
    let totalProjected = 0;

    for (let i = 0; i < 12; i++) {
      const isReal = realMonthMap.has(i);
      const rev = isReal ? realMonthMap.get(i)! : projectedMonthly;
      
      if (isReal) {
        totalReal += rev;
      } else {
        totalProjected += rev;
      }

      months.push({
        label: MONTH_LABELS[i],
        monthIdx: i,
        revenue: rev,
        isReal,
        isProjected: !isReal,
      });
    }

    const totalAnnual = totalReal + totalProjected;
    const realMonths = realEntries.length;
    const remainingMonths = 12 - realMonths;
    const bestMonth = months.reduce((best, m) => m.revenue > best.revenue ? m : best, months[0]);
    const avgMonthly = totalAnnual / 12;

    return {
      year: forecastYear,
      months,
      totalReal,
      totalProjected,
      totalAnnual,
      projectedMonthly,
      realMonths,
      remainingMonths,
      bestMonth,
      avgMonthly,
    };
  }, [revenueByMonth]);

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

      {/* ═══════════════════ PROYECCIONES DEL AÑO (FORECASTING) ═══════════════════ */}
      {forecast && forecast.realMonths >= 1 && (() => {
        const f = forecast;
        const allRevenues = f.months.map((m) => m.revenue);
        const chartMax = Math.max(...allRevenues) * 1.15;
        const chartH = 220;
        const chartW = 100; // porcentaje
        const stepX = chartW / 11;

        // Generar puntos para la línea SVG
        const points = f.months.map((m, i) => {
          const x = (i / 11) * 100;
          const y = chartMax > 0 ? (1 - m.revenue / chartMax) * chartH : chartH;
          return { x, y, ...m };
        });

        // Separar puntos reales de proyectados
        const lastRealIdx = f.months.findLastIndex((m) => m.isReal);
        const realPoints = points.filter((_, i) => i <= lastRealIdx);
        const projPoints = points.filter((_, i) => i >= lastRealIdx);

        // Path para líneas
        const toPath = (pts: typeof points) =>
          pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        
        // Path para área (cerrar abajo)
        const toAreaPath = (pts: typeof points) => {
          if (pts.length === 0) return '';
          const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          return `${line} L ${pts[pts.length - 1].x} ${chartH} L ${pts[0].x} ${chartH} Z`;
        };

        return (
          <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
            {/* Header */}
            <div className="mb-5">
              <h3 className="text-gray-800 font-bold text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Proyecciones del Año {f.year}
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">
                Media ponderada de los últimos {Math.min(f.realMonths, 3)} meses. Línea punteada = futuro proyectado.
              </p>
            </div>

            {/* Tarjetas de Forecast */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: 'INGRESOS AÑO',
                  subtitle: 'Real + proyección',
                  value: formatCurrency(f.totalAnnual),
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                  border: 'border-emerald-100',
                  icon: '📊',
                },
                {
                  label: 'INGRESOS REALES',
                  subtitle: `${f.realMonths} meses registrados`,
                  value: formatCurrency(f.totalReal),
                  color: 'text-blue-600',
                  bg: 'bg-blue-50',
                  border: 'border-blue-100',
                  icon: '💰',
                },
                {
                  label: 'PROMEDIO MENSUAL',
                  subtitle: 'Proyectado por mes',
                  value: formatCurrency(f.projectedMonthly),
                  color: 'text-purple-600',
                  bg: 'bg-purple-50',
                  border: 'border-purple-100',
                  icon: '📈',
                },
                {
                  label: 'MESES RESTANTES',
                  subtitle: `Para cerrar diciembre ${f.year}`,
                  value: `${f.remainingMonths} meses`,
                  color: 'text-amber-600',
                  bg: 'bg-amber-50',
                  border: 'border-amber-100',
                  icon: '📅',
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className={`${card.bg} border ${card.border} rounded-2xl px-4 py-3.5 flex flex-col gap-1`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{card.icon}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{card.label}</span>
                  </div>
                  <p className="text-xs text-gray-400">{card.subtitle}</p>
                  <p className={`text-lg font-black ${card.color} leading-tight`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Leyenda */}
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-emerald-500 rounded-full" />
                <span className="text-xs text-gray-500 font-medium">Ingresos reales</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 border-t-2 border-dashed border-emerald-400 rounded-full" />
                <span className="text-xs text-gray-500 font-medium">Proyección</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-purple-200/60 rounded-sm border border-purple-300/40" />
                <span className="text-xs text-gray-500 font-medium">Promedio</span>
              </div>
            </div>

            {/* Gráfica SVG */}
            <div className="bg-white rounded-2xl p-4 shadow-[inset_2px_2px_5px_#d1d1d6,inset_-2px_-2px_5px_#ffffff]">
              <div className="relative" style={{ height: `${chartH + 40}px` }}>
                {/* Eje Y - etiquetas */}
                <div className="absolute left-0 top-0 bottom-8 w-14 flex flex-col justify-between text-right pr-2 z-10">
                  {[1, 0.75, 0.5, 0.25, 0].map((pct) => (
                    <span key={pct} className="text-[9px] font-medium text-gray-400">
                      {formatCompact(chartMax * pct)}
                    </span>
                  ))}
                </div>

                {/* Área de la gráfica */}
                <div className="absolute left-14 right-0 top-0 bottom-0">
                  {/* Líneas de guía horizontales */}
                  <div className="absolute inset-0 bottom-8 flex flex-col justify-between">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="border-b border-gray-100 w-full" />
                    ))}
                  </div>

                  {/* Línea de promedio */}
                  <div
                    className="absolute left-0 right-0 border-t border-dashed border-purple-300/60 z-10"
                    style={{ top: `${chartMax > 0 ? (1 - f.avgMonthly / chartMax) * chartH : 0}px` }}
                  >
                    <span className="absolute -top-3.5 right-0 text-[8px] font-bold text-purple-400 bg-white px-1 rounded">
                      Prom: {formatCompact(f.avgMonthly)}
                    </span>
                  </div>

                  {/* SVG Chart */}
                  <svg
                    viewBox={`0 0 100 ${chartH}`}
                    preserveAspectRatio="none"
                    className="w-full absolute top-0"
                    style={{ height: `${chartH}px` }}
                  >
                    <defs>
                      <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                      </linearGradient>
                      <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    {/* Área real */}
                    {realPoints.length > 1 && (
                      <path d={toAreaPath(realPoints)} fill="url(#realGrad)" />
                    )}

                    {/* Área proyectada */}
                    {projPoints.length > 1 && (
                      <path d={toAreaPath(projPoints)} fill="url(#projGrad)" />
                    )}

                    {/* Línea real (sólida) */}
                    {realPoints.length > 1 && (
                      <path
                        d={toPath(realPoints)}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="0.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Línea proyectada (punteada) */}
                    {projPoints.length > 1 && (
                      <path
                        d={toPath(projPoints)}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="0.5"
                        strokeDasharray="1.5 1"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Puntos de datos */}
                    {points.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={p.isReal ? 0.9 : 0.7}
                        fill={p.isReal ? '#10b981' : '#8b5cf6'}
                        stroke="white"
                        strokeWidth="0.3"
                      />
                    ))}
                  </svg>

                  {/* Etiquetas de meses (eje X) */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between" style={{ height: '28px' }}>
                    {f.months.map((m, i) => (
                      <div key={m.label} className="flex flex-col items-center" style={{ width: `${100 / 12}%` }}>
                        <span className={`text-[9px] font-semibold ${m.isReal ? 'text-gray-600' : 'text-gray-400'}`}>
                          {m.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Mejor mes */}
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-xs text-gray-400">
                Mejor mes: <span className="font-bold text-gray-600">{f.bestMonth.label}</span> ({formatCurrency(f.bestMonth.revenue)})
              </p>
              <p className="text-xs text-gray-400">
                Cierre estimado {f.year}: <span className="font-bold text-emerald-600">{formatCurrency(f.totalAnnual)}</span>
              </p>
            </div>

            {/* ── SIMULADOR ── */}
            <div className="mt-6 border-t border-gray-300/40 pt-4">
              {/* Botón colapsable */}
              <button
                onClick={() => setSimOpen(!simOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/60 hover:bg-white/90 transition-all duration-300 shadow-[2px_2px_6px_#b8b9be,-2px_-2px_6px_#ffffff] group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎛️</span>
                  <span className="text-sm font-bold text-gray-700">Simulador: ¿Qué pasa si...?</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${simOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Panel del simulador */}
              <div className={`overflow-hidden transition-all duration-500 ${simOpen ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                <div className="space-y-5 px-1">
                  {/* Slider 1: Aumento de ingresos */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 font-medium flex items-center gap-1.5">
                        📈 Aumento mis ingresos mensuales en
                      </span>
                      <span className={`text-sm font-black ${simIncreasePercent > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {simIncreasePercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={simIncreasePercent}
                      onChange={(e) => setSimIncreasePercent(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #10b981 0%, #10b981 ${simIncreasePercent}%, #d1d5db ${simIncreasePercent}%, #d1d5db 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                    </div>
                  </div>

                  {/* Slider 2: Aumento de pacientes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 font-medium flex items-center gap-1.5">
                        👥 Aumento de pacientes en
                      </span>
                      <span className={`text-sm font-black ${simPatientsPercent > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                        {simPatientsPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={simPatientsPercent}
                      onChange={(e) => setSimPatientsPercent(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${simPatientsPercent}%, #d1d5db ${simPatientsPercent}%, #d1d5db 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                    </div>
                  </div>

                  {/* Resultados del simulador */}
                  {(simIncreasePercent > 0 || simPatientsPercent > 0) && (() => {
                    const combinedMultiplier = (1 + simIncreasePercent / 100) * (1 + simPatientsPercent / 100);
                    const newProjectedMonthly = f.projectedMonthly * combinedMultiplier;
                    const newTotalProjected = newProjectedMonthly * f.remainingMonths;
                    const newTotalAnnual = f.totalReal + newTotalProjected;
                    const difference = newTotalAnnual - f.totalAnnual;

                    return (
                      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-4 border border-emerald-100/50">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Impacto simulado</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <p className="text-[10px] text-gray-400">Nuevo mensual</p>
                            <p className="text-sm font-black text-emerald-600">{formatCurrency(newProjectedMonthly)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-gray-400">Cierre anual</p>
                            <p className="text-sm font-black text-blue-600">{formatCurrency(newTotalAnnual)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-gray-400">Diferencia</p>
                            <p className="text-sm font-black text-purple-600">+{formatCurrency(difference)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        );
      })()}


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
      {revenueByDayOfWeek.some((d) => d.revenue > 0) && (() => {
        const maxDay = Math.max(...revenueByDayOfWeek.map((d) => d.revenue));
        const totalWeekRevenue = revenueByDayOfWeek.reduce((s, d) => s + d.revenue, 0);
        const bestDayIdx = revenueByDayOfWeek.reduce((best, d, i) => d.revenue > revenueByDayOfWeek[best].revenue ? i : best, 0);

        const dayColors = [
          { from: '#94a3b8', to: '#cbd5e1' }, // Dom - gris
          { from: '#3b82f6', to: '#60a5fa' }, // Lun - azul
          { from: '#10b981', to: '#34d399' }, // Mar - verde
          { from: '#8b5cf6', to: '#a78bfa' }, // Mié - púrpura
          { from: '#f59e0b', to: '#fbbf24' }, // Jue - ámbar
          { from: '#ec4899', to: '#f472b6' }, // Vie - rosa
          { from: '#94a3b8', to: '#cbd5e1' }, // Sáb - gris
        ];

        return (
          <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-700 font-bold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                Distribución de Ingresos por Día
              </h3>
              <span className="text-xs font-medium bg-amber-50 text-amber-600 px-3 py-1 rounded-full">
                Mejor día: {revenueByDayOfWeek[bestDayIdx].label}
              </span>
            </div>

            <div className="flex items-end gap-3 px-2" style={{ height: '240px' }}>
              {revenueByDayOfWeek.map((d, i) => {
                const pct = maxDay > 0 ? Math.max((d.revenue / maxDay) * 100, 5) : 5;
                const isWeekend = i === 0 || i === 6;
                const isBest = i === bestDayIdx;
                const sharePercent = totalWeekRevenue > 0 ? ((d.revenue / totalWeekRevenue) * 100).toFixed(1) : '0';
                const color = dayColors[i];

                return (
                  <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 group">
                    {/* Valor */}
                    <div className="flex flex-col items-center mb-1">
                      <span className={`text-xs font-bold ${isBest ? 'text-amber-600' : 'text-gray-600'}`}>
                        {formatCompact(d.revenue)}
                      </span>
                      <span className="text-[9px] text-gray-400 font-medium">
                        {sharePercent}%
                      </span>
                    </div>

                    {/* Barra */}
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={`w-full rounded-2xl transition-all duration-500 hover:scale-[1.05] cursor-pointer relative overflow-hidden ${isBest ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#e6e7ee]' : ''}`}
                        style={{
                          height: `${pct}%`,
                          background: `linear-gradient(to top, ${color.from}, ${color.to})`,
                          boxShadow: isWeekend ? 'none' : `0 4px 14px ${color.from}30`,
                          opacity: isWeekend ? 0.55 : 1,
                          minHeight: '20px',
                        }}
                      >
                        {/* Brillo */}
                        <div className="absolute inset-0 opacity-25" style={{
                          background: 'linear-gradient(to right, transparent 20%, rgba(255,255,255,0.5) 50%, transparent 80%)',
                        }} />
                        {/* Monto al hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-[9px] font-bold bg-black/30 px-1.5 py-0.5 rounded-md backdrop-blur-sm whitespace-nowrap">
                            {formatCurrency(d.revenue)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Etiqueta */}
                    <span className={`text-xs font-semibold ${isBest ? 'text-amber-600' : isWeekend ? 'text-gray-400' : 'text-gray-600'}`}>
                      {d.label}
                    </span>
                    {isBest && <span className="text-[8px] text-amber-500 font-bold -mt-1">⭐</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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

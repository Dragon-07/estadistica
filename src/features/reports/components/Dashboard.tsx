'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { DashboardStats, DoctorSummary, EntitySummary } from '@/shared/types/medical';
import { Users, Building2, Stethoscope, FileText, TrendingUp, TrendingDown, Calendar, X, Download, Check, PieChart, Activity, Repeat, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GLOBAL_REPORT_COLUMNS } from '@/features/data-parser/reportes';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [availableEntities, setAvailableEntities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilters, setEntityFilters] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  const [currentRecords, setCurrentRecords] = useState<any[]>([]);

  // Nuevos estados
  const [patientRecurrence, setPatientRecurrence] = useState<{ new: number, returning: number, avgVisits: number } | null>(null);
  const [volumeByMonth, setVolumeByMonth] = useState<{ month: string, count: number }[]>([]);
  const [volumeByDay, setVolumeByDay] = useState<{ day: string, count: number }[]>([]);
  const [topTreatments, setTopTreatments] = useState<{ name: string, count: number }[]>([]);


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();

      let allRecords: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase.from('medical_records').select('*');
        
        // Aplicamos filtros ANTES del range para asegurar que la paginación sea sobre el set correcto
        if (entityFilters.length > 0) query = query.in('entity_name', entityFilters);
        if (startDate) query = query.gte('treatment_date', startDate);
        if (endDate) query = query.lte('treatment_date', endDate);

        query = query.range(from, from + step - 1);

        const { data, error } = await query;
        
        if (error) {
          console.warn('Advertencia al cargar registros:', error);
          break;
        }

        if (data && data.length > 0) {
          allRecords = [...allRecords, ...data];
          from += step;
          // Si recibimos menos del paso, es que llegamos al final
          if (data.length < step) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      const records = allRecords;

      // Cargar lista de entidades disponibles desde la vista optimizada si aún no existe
      if (availableEntities.length === 0) {
        const { data: allEntities } = await supabase.from('unique_entities_view').select('entity_name');
        if (allEntities) {
          const unique = allEntities.map(r => r.entity_name || 'N/A')

            .sort((a, b) => {
              if (a === 'N/A') return -1;
              if (b === 'N/A') return 1;
              return a.localeCompare(b, 'es', { sensitivity: 'base' });
            });
          setAvailableEntities(unique);
        }
      }

      if (!records) { setLoading(false); return; }

      // Calcular estadísticas generales
      const patientVisitsMap = new Map<string, number>();
      records.forEach(r => {
        patientVisitsMap.set(r.patient_name, (patientVisitsMap.get(r.patient_name) || 0) + 1);
      });
      
      const uniquePatients = patientVisitsMap.size;
      const uniqueEntities = new Set(records.map((r) => r.entity_name)).size;
      const uniqueDoctors = new Set(records.map((r) => r.doctor_name).filter(Boolean)).size;

      setStats({
        totalPatients: uniquePatients,
        totalEntities: uniqueEntities,
        totalDoctors: uniqueDoctors,
        totalRecords: records.length,
      });

      // 1. Recurrencia
      let newPatientsCount = 0;
      let returningPatientsCount = 0;
      patientVisitsMap.forEach(count => {
        if (count === 1) newPatientsCount++;
        else returningPatientsCount++;
      });
      const avgVisits = uniquePatients > 0 ? records.length / uniquePatients : 0;
      
      setPatientRecurrence({ new: newPatientsCount, returning: returningPatientsCount, avgVisits });

      // 2. Heatmap / Volume
      const monthMap = new Map<string, number>();
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const dayTotals = new Array(7).fill(0);

      records.forEach(r => {
        if (r.treatment_date) {
          // Month
          const monthKey = r.treatment_date.slice(0, 7);
          monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
          // Day
          const d = new Date(r.treatment_date + 'T00:00:00');
          dayTotals[d.getDay()] += 1;
        }
      });
      
      setVolumeByMonth(
        Array.from(monthMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([month, count]) => {
            const [y, m] = month.split('-');
            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            return { month: `${monthNames[parseInt(m, 10) - 1]} ${y}`, count };
          })
      );
      setVolumeByDay(days.map((day, i) => ({ day, count: dayTotals[i] })));

      // 3. Top Tratamientos por volumen
      const treatmentMap = new Map<string, number>();
      records.forEach(r => {
        const name = r.treatment_name || 'Sin especificar';
        treatmentMap.set(name, (treatmentMap.get(name) || 0) + 1);
      });
      setTopTreatments(
        Array.from(treatmentMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );

      // Resumen por Doctor
      const doctorMap = new Map<string, { patients: Set<string>; treatments: number }>();
      records.forEach((r) => {
        if (!r.doctor_name) return;
        if (!doctorMap.has(r.doctor_name)) {
          doctorMap.set(r.doctor_name, { patients: new Set(), treatments: 0 });
        }
        const entry = doctorMap.get(r.doctor_name)!;
        entry.patients.add(r.patient_name);
        entry.treatments += 1;
      });
      setDoctors(
        Array.from(doctorMap.entries())
          .map(([name, d]) => ({
            doctor_name: name,
            patient_count: d.patients.size,
            treatment_count: d.treatments,
          }))
          .sort((a, b) => b.patient_count - a.patient_count)
      );

      // Resumen por Entidad
      const entityMap = new Map<string, { patients: Set<string>; records: number }>();
      records.forEach((r) => {
        if (!entityMap.has(r.entity_name)) {
          entityMap.set(r.entity_name, { patients: new Set(), records: 0 });
        }
        const entry = entityMap.get(r.entity_name)!;
        entry.patients.add(r.patient_name);
        entry.records += 1;
      });
      setEntities(
        Array.from(entityMap.entries())
          .map(([name, e]) => ({
            entity_name: name,
            patient_count: e.patients.size,
            record_count: e.records,
          }))
          .sort((a, b) => {
            if (a.entity_name === 'N/A') return -1;
            if (b.entity_name === 'N/A') return 1;
            return a.entity_name.localeCompare(b.entity_name, 'es', { sensitivity: 'base' });
          })
      );

      setCurrentRecords(allRecords);
      setLoading(false);
    };

    fetchData();
  }, [entityFilters, startDate, endDate]);


  const handleApplyFilters = () => {
    // Validamos que el rango sea coherente si ambas están presentes
    if (tempStartDate && tempEndDate && tempStartDate > tempEndDate) {
      alert('La fecha de inicio no puede ser posterior a la fecha de fin');
      return;
    }
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
  };

  const exportToExcel = () => {
    if (currentRecords.length === 0) return;

    const dataToExport = currentRecords.map(r => {
      const rowData: Record<string, any> = {};
      
      GLOBAL_REPORT_COLUMNS.forEach(col => {
        // Ignoramos la columna vacía usada como separador
        if (col === '') return; 
        
        // extra_data contiene exactamente los valores asociados a los nombres de columna originales
        rowData[col] = r.extra_data?.[col] || '';
      });
      
      return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    
    // Nombre del archivo con el rango
    const rangeStr = startDate && endDate ? `${startDate}_a_${endDate}` : 'Historico_Total';
    XLSX.writeFile(wb, `Reporte_Todexo_${rangeStr}.xlsx`);
  };

  const handleDateChange = (val: string, type: 'start' | 'end') => {
    if (type === 'start') setTempStartDate(val);
    else setTempEndDate(val);
    // Ya no aplicamos automáticamente, esperamos al botón
  };

  const handleClearDates = () => {
    setTempStartDate('');
    setTempEndDate('');
    setStartDate('');
    setEndDate('');
  };

  const toggleEntityFilter = (name: string) => {
    if (name === '') {
      setEntityFilters([]);
      return;
    }

    setEntityFilters(prev => 
      prev.includes(name) 
        ? prev.filter(f => f !== name)
        : [...prev, name]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 rounded-full bg-[#e6e7ee] shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] flex items-center justify-center animate-pulse">
          <div className="w-5 h-5 rounded-full bg-blue-400" />
        </div>
      </div>
    );
  }

  if (!stats || stats.totalRecords === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-16 h-16 rounded-3xl bg-[#e6e7ee] shadow-[6px_6px_14px_#b8b9be,-6px_-6px_14px_#ffffff] flex items-center justify-center">
          <FileText className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">Sin datos</p>
        <p className="text-gray-400 text-sm">Sube tus archivos Excel en la pestaña "Cargar Datos"</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Pacientes únicos', value: stats.totalPatients, icon: Users, color: 'text-blue-500', bg: 'from-blue-400 to-blue-500' },
    { label: 'Entidades', value: stats.totalEntities, icon: Building2, color: 'text-green-500', bg: 'from-green-400 to-green-500' },
    { label: 'Médicos activos', value: stats.totalDoctors, icon: Stethoscope, color: 'text-purple-500', bg: 'from-purple-400 to-purple-500' },
    { label: 'Registros totales', value: stats.totalRecords, icon: FileText, color: 'text-amber-500', bg: 'from-amber-400 to-amber-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Selector de Fechas y Filtros Superiores */}
      <div className="bg-[#e6e7ee] rounded-3xl p-4 sm:p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#e6e7ee] rounded-2xl shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] flex-1 sm:flex-none">
              <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-tight shrink-0">Desde:</span>
              <input 
                type="date" 
                value={tempStartDate}
                onChange={(e) => handleDateChange(e.target.value, 'start')}
                className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 cursor-pointer w-full"
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#e6e7ee] rounded-2xl shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] flex-1 sm:flex-none">
              <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-tight shrink-0">Hasta:</span>
              <input 
                type="date" 
                value={tempEndDate}
                onChange={(e) => handleDateChange(e.target.value, 'end')}
                className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 cursor-pointer w-full"
              />
            </div>
            
            <button 
              onClick={handleApplyFilters}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-2xl text-xs font-bold shadow-[4px_4px_8px_rgba(22,163,74,0.3)] hover:bg-green-700 transition-all transform active:scale-95 w-full sm:w-auto"
            >
              <Check className="w-4 h-4" />
              Aplicar Periodo
            </button>

            {(tempStartDate || tempEndDate) && (
              <button 
                onClick={handleClearDates}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-red-500 rounded-2xl text-xs font-bold shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] hover:bg-red-50 transition-colors w-full sm:w-auto"
              >
                <X className="w-3 h-3 shrink-0" />
                Limpiar Fechas
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between sm:justify-start w-full xl:w-auto gap-3 border-t border-gray-300 xl:border-none pt-4 xl:pt-0">
            <button
              onClick={exportToExcel}
              disabled={loading || currentRecords.length === 0}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-xs font-bold shadow-[4px_4px_10px_rgba(37,99,235,0.3)] hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>

            <div className="px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col items-center min-w-[100px]">
              <span className="text-[10px] font-bold text-blue-500 uppercase block leading-tight">Total Periodo</span>
              <span className="text-lg font-black text-blue-700 leading-tight">{stats.totalRecords.toLocaleString('de-DE')}</span>
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

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] flex flex-col gap-4"
          >
            <div className="flex items-start justify-between">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${bg} flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)]`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">{value.toLocaleString('de-DE')}</p>
              <p className="text-gray-500 text-sm mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════ NUEVAS MÉTRICAS ESTRATÉGICAS ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Recurrencia y Retención */}
        {patientRecurrence && (
          <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] flex flex-col justify-between">
            <div>
              <h3 className="text-gray-700 font-bold text-lg mb-2 flex items-center gap-2">
                <Repeat className="w-5 h-5 text-blue-500" />
                Retención de Pacientes
              </h3>
              <p className="text-sm text-gray-500 mb-6">Proporción de pacientes nuevos vs recurrentes y frecuencia de visita.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="relative w-32 h-32 flex-shrink-0">
                <div 
                  className="absolute inset-0 rounded-full shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]"
                  style={{
                    background: `conic-gradient(#3b82f6 ${(patientRecurrence.new / stats.totalPatients) * 100}%, #10b981 0)`
                  }}
                />
                <div className="absolute inset-4 bg-[#e6e7ee] rounded-full shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff] flex items-center justify-center flex-col">
                  <span className="text-xl font-black text-gray-700">{Math.round((patientRecurrence.returning / stats.totalPatients) * 100)}%</span>
                  <span className="text-[10px] font-bold text-gray-400">Recurrentes</span>
                </div>
              </div>
              
              <div className="flex-1 w-full space-y-4">
                <div className="bg-[#e6e7ee] rounded-2xl p-3 shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"/> Nuevos</span>
                    <span className="font-bold text-gray-700">{patientRecurrence.new.toLocaleString('de-DE')}</span>
                  </div>
                </div>
                <div className="bg-[#e6e7ee] rounded-2xl p-3 shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"/> Recurrentes</span>
                    <span className="font-bold text-gray-700">{patientRecurrence.returning.toLocaleString('de-DE')}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center px-2 mt-2 border-t border-gray-300 pt-3">
                  <span className="text-sm font-medium text-gray-600">Promedio de visitas:</span>
                  <span className="font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-xl">{patientRecurrence.avgVisits.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Top Tratamientos por Volumen */}
        {topTreatments.length > 0 && (
          <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
            <h3 className="text-gray-700 font-bold text-lg mb-2 flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500" />
              Top 5 Tratamientos (Volumen)
            </h3>
            <p className="text-sm text-gray-500 mb-5">Los procedimientos que más se realizan (operatividad).</p>
            
            <div className="space-y-3">
              {topTreatments.map((t, idx) => {
                const pct = Math.round((t.count / topTreatments[0].count) * 100);
                return (
                  <div key={t.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-gray-700 font-medium text-sm truncate max-w-[180px]" title={t.name}>{t.name}</span>
                      </div>
                      <span className="font-bold text-gray-700">{t.count.toLocaleString('de-DE')} <span className="text-xs font-normal text-gray-400">veces</span></span>
                    </div>
                    <div className="h-1.5 bg-[#e6e7ee] rounded-full shadow-[inset_1px_1px_3px_#b8b9be,inset_-1px_-1px_3px_#ffffff] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Mapa de Calor / Curva Operativa */}
      <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
        <h3 className="text-gray-700 font-bold text-lg mb-2 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          Demanda Operativa
        </h3>
        <p className="text-sm text-gray-500 mb-6">Evolución mensual y distribución de la carga de trabajo por día de la semana.</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Evolución Mensual */}
          {volumeByMonth.length > 0 && (() => {
            const maxCount = Math.max(...volumeByMonth.map(m => m.count));
            return (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Evolución Mensual</h4>
                <div className="flex items-end h-40 gap-2 border-b border-gray-300 pb-2">
                  {volumeByMonth.slice(-12).map((m) => ( // Show last 12 months max
                    <div key={m.month} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                      <div className="absolute -top-8 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                        {m.count.toLocaleString('de-DE')} atenciones
                      </div>
                      <div 
                        className="w-full bg-gradient-to-t from-indigo-400 to-indigo-500 rounded-t-md transition-all duration-500 ease-out hover:brightness-110 shadow-[2px_0_5px_rgba(0,0,0,0.1)] flex items-start justify-center pt-2 overflow-hidden"
                        style={{ height: `${(m.count / maxCount) * 100}%`, minHeight: '28px' }}
                      >
                        <span className="text-white font-bold text-xs leading-none drop-shadow-md">
                          {m.count.toLocaleString('de-DE')}
                        </span>
                      </div>
                      <span className="text-[9px] font-medium text-gray-500 mt-2 rotate-45 origin-left truncate w-8 text-center absolute -bottom-6">{m.month.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Días de la semana */}
          {volumeByDay.some(d => d.count > 0) && (() => {
            const maxCount = Math.max(...volumeByDay.map(d => d.count));
            const bestDayIdx = volumeByDay.reduce((best, d, i) => d.count > volumeByDay[best].count ? i : best, 0);
            return (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                  Días con más pacientes
                  <span className="text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md shadow-sm">Pico: {volumeByDay[bestDayIdx].day}</span>
                </h4>
                <div className="space-y-3">
                  {volumeByDay.map((d, i) => {
                    const pct = Math.round((d.count / maxCount) * 100);
                    return (
                      <div key={d.day} className="flex items-center gap-3">
                        <span className="w-8 text-xs font-medium text-gray-500 text-right">{d.day}</span>
                        <div className="flex-1 h-3.5 bg-[#e6e7ee] rounded-full shadow-[inset_1px_1px_3px_#b8b9be,inset_-1px_-1px_3px_#ffffff] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${i === bestDayIdx ? 'bg-gradient-to-r from-indigo-500 to-indigo-400' : 'bg-gradient-to-r from-gray-400 to-gray-300'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-xs font-bold text-gray-600 text-right">{d.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Tabla: Por Médico */}
      {doctors.length > 0 && (
        <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
          <h3 className="text-gray-700 font-bold text-lg mb-5 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-purple-500" />
            Rendimiento por Médico
          </h3>
          <div className="space-y-3">
            {doctors.map((doc, idx) => (
              <div
                key={doc.doctor_name}
                className="flex items-center justify-between bg-[#e6e7ee] rounded-2xl px-5 py-4 shadow-[inset_3px_3px_7px_#b8b9be,inset_-3px_-3px_7px_#ffffff]"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-gray-700 font-medium">{doc.doctor_name}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-blue-600">{doc.patient_count}</p>
                    <p className="text-gray-400 text-xs">Pacientes</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-green-600">{doc.treatment_count}</p>
                    <p className="text-gray-400 text-xs">Tratamientos</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla: Por Entidad */}
      {entities.length > 0 && entityFilters.length === 0 && (
        <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
          <h3 className="text-gray-700 font-bold text-lg mb-5 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-green-500" />
            Pacientes por Entidad
          </h3>
          <div className="space-y-3">
            {entities.map((ent, idx) => {
              const maxCount = entities[0]?.patient_count || 1;
              const pct = Math.round((ent.patient_count / maxCount) * 100);
              return (
                <div key={ent.entity_name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs w-5 text-right">{idx + 1}</span>
                      <span className="text-gray-700 font-medium text-sm">{ent.entity_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-bold text-blue-600">{ent.patient_count} pacientes</span>
                      <span className="font-medium text-gray-500">{ent.record_count} registros</span>
                    </div>
                  </div>
                  {/* Barra de progreso estilo Neumorphism */}
                  <div className="h-2.5 bg-[#e6e7ee] rounded-full shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

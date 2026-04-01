'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { DashboardStats, DoctorSummary, EntitySummary } from '@/shared/types/medical';
import { Users, Building2, Stethoscope, FileText, TrendingUp, TrendingDown } from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();

      let query = supabase.from('medical_records').select('*');
      if (entityFilter) query = query.eq('entity_name', entityFilter);

      const { data: records } = await query;

      if (!records) { setLoading(false); return; }

      // Calcular estadísticas generales
      const uniquePatients = new Set(records.map((r) => r.patient_name)).size;
      const uniqueEntities = new Set(records.map((r) => r.entity_name)).size;
      const uniqueDoctors = new Set(records.map((r) => r.doctor_name).filter(Boolean)).size;

      setStats({
        totalPatients: uniquePatients,
        totalEntities: uniqueEntities,
        totalDoctors: uniqueDoctors,
        totalRecords: records.length,
      });

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
          .sort((a, b) => b.patient_count - a.patient_count)
      );

      setLoading(false);
    };

    fetchData();
  }, [entityFilter]);

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
      {/* Filtro por entidad */}
      {entities.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-gray-500 text-sm font-medium">Filtrar entidad:</span>
          <button
            onClick={() => setEntityFilter('')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              !entityFilter
                ? 'bg-blue-500 text-white shadow-[0_4px_14px_rgba(59,130,246,0.4)]'
                : 'bg-[#e6e7ee] text-gray-600 shadow-[3px_3px_7px_#b8b9be,-3px_-3px_7px_#ffffff] hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff]'
            }`}
          >
            Todas
          </button>
          {entities.map((e) => (
            <button
              key={e.entity_name}
              onClick={() => setEntityFilter(e.entity_name)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                entityFilter === e.entity_name
                  ? 'bg-blue-500 text-white shadow-[0_4px_14px_rgba(59,130,246,0.4)]'
                  : 'bg-[#e6e7ee] text-gray-600 shadow-[3px_3px_7px_#b8b9be,-3px_-3px_7px_#ffffff] hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff]'
              }`}
            >
              {e.entity_name}
            </button>
          ))}
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
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
              <p className="text-3xl font-bold text-gray-800">{value.toLocaleString()}</p>
              <p className="text-gray-500 text-sm mt-0.5">{label}</p>
            </div>
          </div>
        ))}
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
      {entities.length > 0 && !entityFilter && (
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
                      <span className="font-bold text-blue-600">{ent.patient_count} pac.</span>
                      <span className="text-gray-400">{ent.record_count} reg.</span>
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

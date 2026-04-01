'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { MedicalRecord } from '@/shared/types/medical';
import * as XLSX from 'xlsx';
import { Download, FileText, Search, ChevronDown } from 'lucide-react';

export function BillingReport() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [entities, setEntities] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('medical_records')
        .select('*')
        .order('entity_name')
        .order('patient_name');
      if (data) {
        setRecords(data);
        const ents = [...new Set(data.map((r) => r.entity_name))].sort();
        setEntities(ents);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = records.filter((r) => {
    const matchEntity = !selectedEntity || r.entity_name === selectedEntity;
    const matchSearch = !search ||
      r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      r.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.treatment_name?.toLowerCase().includes(search.toLowerCase());
    return matchEntity && matchSearch;
  });

  const exportToExcel = () => {
    const rows = filtered.map((r, i) => ({
      '#': i + 1,
      Paciente: r.patient_name,
      Documento: r.patient_doc ?? '',
      Médico: r.doctor_name ?? '',
      Entidad: r.entity_name,
      Tratamiento: r.treatment_name ?? '',
      'Nro. Factura': r.invoice_number ?? '',
      Fecha: r.treatment_date ?? '',
      Archivo: r.source_file ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cuenta de Cobro');
    XLSX.writeFile(wb, `cuenta-cobro-${selectedEntity || 'todas'}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return <div className="h-48 flex items-center justify-center text-gray-400">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Búsqueda */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar paciente, médico, factura..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#e6e7ee] text-gray-700 placeholder-gray-400 outline-none text-sm
              shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff]
              focus:shadow-[inset_5px_5px_10px_#b8b9be,inset_-5px_-5px_10px_#ffffff]
              transition-shadow duration-200"
          />
        </div>

        {/* Filtro entidad */}
        <div className="relative">
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="appearance-none pl-4 pr-10 py-3.5 rounded-2xl bg-[#e6e7ee] text-gray-700 outline-none text-sm font-medium
              shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff]
              focus:shadow-[inset_5px_5px_10px_#b8b9be,inset_-5px_-5px_10px_#ffffff]
              transition-shadow duration-200 cursor-pointer"
          >
            <option value="">Todas las entidades</option>
            {entities.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Exportar */}
        <button
          onClick={exportToExcel}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-white text-sm
            bg-gradient-to-r from-green-500 to-green-600
            shadow-[0_4px_14px_rgba(16,185,129,0.4)]
            hover:shadow-[0_6px_18px_rgba(16,185,129,0.5)] hover:-translate-y-0.5
            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
            transition-all duration-200"
        >
          <Download className="w-4 h-4" />
          Exportar ({filtered.length})
        </button>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2">
          <FileText className="w-8 h-8 text-gray-300" />
          <p className="text-gray-400 text-sm">No se encontraron registros</p>
        </div>
      ) : (
        <div className="bg-[#e6e7ee] rounded-3xl shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#dcdde3]">
                  {['#', 'Paciente', 'Médico', 'Entidad', 'Tratamiento', 'Nro. Factura', 'Fecha'].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-gray-500 font-semibold text-xs uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-t border-[#d0d1d8] hover:bg-[#e0e1e8] transition-colors duration-150 ${i % 2 === 0 ? '' : 'bg-[#e9eaf0]'}`}
                  >
                    <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-5 py-3.5 text-gray-700 font-medium">{r.patient_name}</td>
                    <td className="px-5 py-3.5 text-gray-600">{r.doctor_name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3.5">
                      <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                        {r.entity_name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 max-w-[200px] truncate">{r.treatment_name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-600 text-xs">{r.invoice_number ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{r.treatment_date ?? <span className="text-gray-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

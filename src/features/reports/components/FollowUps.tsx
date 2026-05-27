'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { Gift, Calendar, User, Phone, Search, PartyPopper, ChevronDown } from 'lucide-react';

interface PatientBirthday {
  doc: string;
  name: string;
  birthDateRaw: string;
  gender: string;
  phone: string;
  parsedDate: { month: number; day: number; year?: number } | null;
  isToday: boolean;
  isThisMonth: boolean;
}

/** Intentar parsear de forma robusta la fecha de nacimiento que viene del Excel */
function parseBirthDate(val: any): { month: number, day: number, year?: number } | null {
  if (!val) return null;
  const str = String(val).trim();
  
  // Manejar fechas de Excel que llegan como número (ej. 32954)
  if (!isNaN(Number(str)) && Number(str) > 10000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + Number(str) * 86400000);
    return { month: date.getMonth() + 1, day: date.getDate(), year: date.getFullYear() };
  }

  // Manejar DD/MM/YYYY o DD-MM-YYYY
  const parts = str.split(/[\/\-]/);
  if (parts.length >= 3) {
    // Usualmente DD/MM/YYYY en Latam
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parseInt(parts[2], 10); // Puede incluir hora, parseInt lo ignora
    if (p1 <= 31 && p2 <= 12) {
      return { day: p1, month: p2, year: p3 };
    } else if (p2 <= 31 && p1 <= 12) {
      // MM/DD/YYYY
      return { day: p2, month: p1, year: p3 };
    }
  }

  // Intentar parseo directo (para ISO strings)
  const dateObj = new Date(str);
  if (!isNaN(dateObj.getTime())) {
    // getUTCMonth para evitar desfases de zona horaria si viene como ISO sin tiempo
    return { month: dateObj.getUTCMonth() + 1, day: dateObj.getUTCDate(), year: dateObj.getUTCFullYear() };
  }
  
  return null;
}

function calculateAge(parsed: { month: number, day: number, year?: number } | null): number | null {
  if (!parsed || !parsed.year) return null;
  const today = new Date();
  let age = today.getFullYear() - parsed.year;
  const m = today.getMonth() + 1 - parsed.month;
  if (m < 0 || (m === 0 && today.getDate() < parsed.day)) {
    age--;
  }
  return age;
}

export function FollowUps() {
  const [patients, setPatients] = useState<PatientBirthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTodayCollapsed, setIsTodayCollapsed] = useState(false);
  const [isMonthCollapsed, setIsMonthCollapsed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();

      // Vamos a extraer registros, pero solo nos interesa información única de pacientes.
      // Ya que no tenemos tabla de pacientes, deducimos de medical_records
      let records: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('medical_records')
          .select('patient_doc, patient_name, extra_data')
          .range(from, from + step - 1);
          
        const { data, error } = await query;
        if (error) {
          console.error(error);
          break;
        }

        if (data && data.length > 0) {
          records = [...records, ...data];
          from += step;
          if (data.length < step) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentDay = today.getDate();

      // Unificar pacientes (usando doc o nombre como llave)
      const patientMap = new Map<string, PatientBirthday>();

      records.forEach(r => {
        const doc = r.patient_doc ? String(r.patient_doc).trim() : '';
        const nameFallback = r.patient_name || 'Desconocido';
        const key = doc || nameFallback;

        if (!patientMap.has(key)) {
          const extra = r.extra_data || {};
          const name = extra['Cliente'] ? String(extra['Cliente']).trim() : nameFallback;
          const birthDateRaw = extra['Fecha de Nacimiento'] ? String(extra['Fecha de Nacimiento']).trim() : '';
          const gender = extra['Género'] ? String(extra['Género']).trim() : '';
          const phone = extra['Teléfono'] ? String(extra['Teléfono']).trim() : '';

          const parsedDate = parseBirthDate(birthDateRaw);
          
          let isToday = false;
          let isThisMonth = false;

          if (parsedDate) {
            isThisMonth = parsedDate.month === currentMonth;
            isToday = isThisMonth && parsedDate.day === currentDay;
          }

          patientMap.set(key, {
            doc,
            name,
            birthDateRaw,
            gender,
            phone,
            parsedDate,
            isToday,
            isThisMonth
          });
        }
      });

      setPatients(Array.from(patientMap.values()));
      setLoading(false);
    };

    fetchData();
  }, []);

  const { birthdaysToday, birthdaysThisMonth } = useMemo(() => {
    let today: PatientBirthday[] = [];
    let thisMonth: PatientBirthday[] = [];
    
    const filtered = patients.filter(p => {
      if (!searchTerm) return true;
      const lowerSearch = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(lowerSearch) || p.doc.toLowerCase().includes(lowerSearch);
    });

    filtered.forEach(p => {
      if (p.isToday) {
        today.push(p);
      } else if (p.isThisMonth) {
        thisMonth.push(p);
      }
    });

    // Ordenar por día del mes
    thisMonth.sort((a, b) => (a.parsedDate?.day || 0) - (b.parsedDate?.day || 0));

    return { birthdaysToday: today, birthdaysThisMonth: thisMonth };
  }, [patients, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 rounded-full bg-[#e6e7ee] shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] flex items-center justify-center animate-pulse">
          <div className="w-5 h-5 rounded-full bg-blue-400" />
        </div>
      </div>
    );
  }

  const renderTable = (list: PatientBirthday[], isTodayList: boolean) => {
    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 opacity-60">
          <Gift className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-500 font-medium">No hay cumpleaños en esta lista</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-2xl bg-[#e6e7ee] shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] p-2">
        <table className="w-full text-left text-sm text-gray-600">
          <thead>
            <tr className="border-b border-gray-300 text-gray-500 font-bold">
              <th className="px-4 py-3 uppercase text-[10px] tracking-wider">Cliente</th>
              <th className="px-4 py-3 uppercase text-[10px] tracking-wider text-center">Fecha de Nacimiento</th>
              <th className="px-4 py-3 uppercase text-[10px] tracking-wider text-center">Género</th>
              <th className="px-4 py-3 uppercase text-[10px] tracking-wider text-center">Teléfono</th>
              <th className="px-4 py-3 uppercase text-[10px] tracking-wider text-right">Edad</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p, idx) => {
              const age = calculateAge(p.parsedDate);
              const day = p.parsedDate?.day;
              const monthStr = p.parsedDate ? new Date(2000, p.parsedDate.month - 1).toLocaleString('es', { month: 'short' }) : '';
              
              return (
                <tr key={`${p.doc}-${idx}`} className="border-b border-gray-200/60 last:border-0 hover:bg-[#d8d9e0] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700">{p.name}</span>
                      {p.doc && <span className="text-xs text-gray-400">{p.doc}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center justify-center gap-2">
                      {isTodayList ? (
                         <div className="bg-gradient-to-br from-indigo-400 to-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                           <PartyPopper className="w-3 h-3" /> ¡Hoy!
                         </div>
                      ) : (
                        <div className="bg-[#e6e7ee] text-indigo-600 text-xs font-bold px-3 py-1 rounded-xl shadow-[2px_2px_5px_#b8b9be,-2px_-2px_5px_#ffffff]">
                          {day} de {monthStr}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.gender ? (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-md">{p.gender}</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.phone ? (
                      <div className="flex items-center justify-center gap-1 text-gray-600 font-medium">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {p.phone}
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {age !== null ? (
                      <span className="font-bold text-gray-700">{age} <span className="text-xs font-normal text-gray-400">años</span></span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header y Buscador */}
      <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
            <Gift className="w-6 h-6 text-indigo-500" />
            Cumpleaños y Fidelización
          </h2>
          <p className="text-sm text-gray-500 mt-1">Identifica a los pacientes que cumplen años para enviarles beneficios especiales.</p>
        </div>

        <div className="w-full md:w-auto flex items-center px-4 py-2 bg-[#e6e7ee] rounded-2xl shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff]">
          <Search className="w-4 h-4 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 outline-none w-full md:w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Cumpleaños de HOY */}
        <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
          <div 
            onClick={() => setIsTodayCollapsed(!isTodayCollapsed)}
            className="flex items-center justify-between mb-4 cursor-pointer select-none group"
          >
            <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
              <PartyPopper className="w-5 h-5 text-indigo-500" />
              Cumplen Hoy
            </h3>
            <div className="flex items-center gap-3">
              <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-3 py-1 rounded-full shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05),inset_-2px_-2px_4px_#ffffff]">
                {birthdaysToday.length} paciente(s)
              </span>
              <button className={`p-1.5 rounded-full bg-[#e6e7ee] shadow-[2px_2px_5px_#b8b9be,-2px_-2px_5px_#ffffff] hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] text-indigo-500 transition-all duration-300 ${isTodayCollapsed ? '' : 'rotate-180'}`}>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isTodayCollapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-[1000px] opacity-100 mt-2'}`}>
            {renderTable(birthdaysToday, true)}
          </div>
        </div>

        {/* Cumpleaños del MES */}
        <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
          <div 
            onClick={() => setIsMonthCollapsed(!isMonthCollapsed)}
            className="flex items-center justify-between mb-4 cursor-pointer select-none group"
          >
            <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Cumplen el resto del mes
            </h3>
            <div className="flex items-center gap-3">
              <span className="bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1 rounded-full shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05),inset_-2px_-2px_4px_#ffffff]">
                {birthdaysThisMonth.length} paciente(s)
              </span>
              <button className={`p-1.5 rounded-full bg-[#e6e7ee] shadow-[2px_2px_5px_#b8b9be,-2px_-2px_5px_#ffffff] hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] text-blue-500 transition-all duration-300 ${isMonthCollapsed ? '' : 'rotate-180'}`}>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isMonthCollapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-[2500px] opacity-100 mt-2'}`}>
            {renderTable(birthdaysThisMonth, false)}
          </div>
        </div>
      </div>
    </div>
  );
}

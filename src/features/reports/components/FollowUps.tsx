'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { 
  Gift, 
  Calendar, 
  User, 
  Phone, 
  Search, 
  PartyPopper, 
  ChevronDown, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  X 
} from 'lucide-react';
import * as XLSX from 'xlsx';

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

interface AuthRecord {
  documento: string;
  paciente: string;
  autorizacion: string;
  servicio: string;
  cantidadAutorizada: number | string;
  cantidadAsistida: number | string;
  fechaAdmision: string;
  telefono: string;
}

export function FollowUps() {
  const [patients, setPatients] = useState<PatientBirthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTodayCollapsed, setIsTodayCollapsed] = useState(false);
  const [isMonthCollapsed, setIsMonthCollapsed] = useState(false);

  // Estados para la pestaña de Autorizaciones (Excel)
  const [activeSubTab, setActiveSubTab] = useState<'birthdays' | 'authorizations'>('birthdays');
  const [authPatients, setAuthPatients] = useState<AuthRecord[]>([]);
  const [authSearchTerm, setAuthSearchTerm] = useState('');
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [copiedDoc, setCopiedDoc] = useState<string | null>(null);

  // Función auxiliar para buscar valor por múltiples llaves posibles de forma flexible
  const findValueByPossibleKeys = (row: any, keys: string[]): any => {
    for (const key of keys) {
      if (row[key] !== undefined) return row[key];
      // Búsqueda flexible sin espacios, tildes ni mayúsculas
      const cleanKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      for (const rowKey of Object.keys(row)) {
        const cleanRowKey = rowKey.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        if (cleanRowKey === cleanKey) {
          return row[rowKey];
        }
      }
    }
    return undefined;
  };

  // Función para parsear fechas de Excel de forma robusta
  const parseExcelDate = (val: any): string => {
    if (val === undefined || val === null || val === '') return '-';
    const str = String(val).trim();
    
    // Si es número de fecha de Excel (ej: 45700)
    if (!isNaN(Number(str)) && Number(str) > 10000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + Number(str) * 86400000);
      return date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    // Si es un formato ISO o string parseable
    const dateObj = new Date(str);
    if (!isNaN(dateObj.getTime())) {
      // Para evitar desfases por zona horaria de strings tipo 'YYYY-MM-DD'
      if (str.includes('-') && !str.includes('T')) {
        const parts = str.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          return new Date(year, month, day).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }
      }
      return dateObj.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    return str;
  };

  // Función principal para procesar el Excel subido
  const handleExcelUpload = async (file: File) => {
    if (!file) return;
    
    setIsProcessingExcel(true);
    setExcelError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (workbook.SheetNames.length === 0) {
          throw new Error('El archivo Excel está vacío.');
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (jsonData.length === 0) {
          throw new Error('No se encontraron registros en la primera hoja del Excel.');
        }

        // Mapear llaves flexibles a nuestro tipo AuthRecord
        const mappedRows = jsonData.map((row: any) => {
          const docRaw = findValueByPossibleKeys(row, ['Documento', 'Cédula', 'Cedula', 'Identificación', 'Identificacion', 'Doc']);
          const doc = docRaw !== undefined ? String(docRaw).trim() : '';

          const paciente = findValueByPossibleKeys(row, ['Paciente', 'Nombre', 'Cliente', 'Nombre Paciente', 'Nombres']) || '-';
          const autorizacion = findValueByPossibleKeys(row, ['Número', 'Numero', 'Autorización', 'Autorizacion', 'Número de Autorización', 'Numero de Autorizacion']) || '-';
          const servicio = findValueByPossibleKeys(row, ['Servicio', 'Concepto', 'Procedimiento']) || '-';
          const cantAut = findValueByPossibleKeys(row, ['Cantidad Autorizada', 'Cant Autorizada', 'Cantidad Aut', 'Cant Aut', 'Autorizado', 'Cantidad']) ?? '-';
          const cantAsis = findValueByPossibleKeys(row, ['Cantidad Asistida', 'Cant Asistida', 'Cantidad Asis', 'Cant Asis', 'Asistido', 'Asistidos']) ?? '-';
          
          const fechaAdmRaw = findValueByPossibleKeys(row, ['Fecha Admisión', 'Fecha Admision', 'Fecha de Admisión', 'Fecha de Admision', 'Admisión', 'Admision', 'Fecha']);
          const fechaAdmision = parseExcelDate(fechaAdmRaw);

          return {
            documento: doc,
            paciente: String(paciente).trim(),
            autorizacion: String(autorizacion).trim(),
            servicio: String(servicio).trim(),
            cantidadAutorizada: cantAut,
            cantidadAsistida: cantAsis,
            fechaAdmision,
            telefono: '-' // Se rellena en el cruce de Supabase
          };
        });

        // Obtener documentos únicos no vacíos
        const uniqueDocs = Array.from(
          new Set(
            mappedRows
              .map(r => r.documento)
              .filter(Boolean)
          )
        );

        const phoneMap = new Map<string, string>();
        const supabase = createClient();

        if (uniqueDocs.length > 0) {
          // Consultar Supabase en lotes de 500 para evitar desbordamiento
          const chunkSize = 500;
          for (let i = 0; i < uniqueDocs.length; i += chunkSize) {
            const chunk = uniqueDocs.slice(i, i + chunkSize);
            const { data: dbRecords, error } = await supabase
              .from('medical_records')
              .select('patient_doc, extra_data')
              .in('patient_doc', chunk);

            if (error) {
              console.error('Error al realizar cruce de teléfonos:', error);
              continue;
            }

            dbRecords?.forEach(rec => {
              const doc = rec.patient_doc ? String(rec.patient_doc).trim() : '';
              const extra = rec.extra_data || {};
              const phone = extra['Teléfono'] ? String(extra['Teléfono']).trim() : '';
              if (doc && phone) {
                phoneMap.set(doc, phone);
              }
            });
          }
        }

        // Rellenar la columna de teléfono final
        const finalRows = mappedRows.map(r => {
          const phone = phoneMap.get(r.documento) || '-';
          return { ...r, telefono: phone };
        });

        setAuthPatients(finalRows);
      } catch (err: any) {
        console.error(err);
        setExcelError(err.message || 'Error al procesar el archivo Excel.');
      } finally {
        setIsProcessingExcel(false);
      }
    };

    reader.onerror = () => {
      setExcelError('Error al leer el archivo.');
      setIsProcessingExcel(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Función para procesar el segundo Excel de base de datos local y cruzar teléfonos
  const handleDatabaseExcelUpload = async (file: File) => {
    if (!file || authPatients.length === 0) return;

    setIsProcessingExcel(true);
    setExcelError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (workbook.SheetNames.length === 0) {
          throw new Error('El archivo Excel de base de datos está vacío.');
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (jsonData.length === 0) {
          throw new Error('No se encontraron registros en la primera hoja del Excel de base de datos.');
        }

        // Crear mapa de documento -> teléfono a partir del Excel subido
        const localPhoneMap = new Map<string, string>();
        
        jsonData.forEach((row: any) => {
          const docRaw = findValueByPossibleKeys(row, ['Documento', 'Cédula', 'Cedula', 'Identificación', 'Identificacion', 'Doc']);
          const doc = docRaw !== undefined ? String(docRaw).trim() : '';

          const phoneRaw = findValueByPossibleKeys(row, ['Teléfono', 'Telefono', 'Tel', 'Celular', 'Cel', 'Phone', 'Móvil', 'Movil']);
          const phone = phoneRaw !== undefined ? String(phoneRaw).trim() : '';

          if (doc && phone && phone !== '-') {
            localPhoneMap.set(doc, phone);
          }
        });

        // Cruzar con los pacientes actualmente en pantalla
        let matchedCount = 0;
        const updatedPatients = authPatients.map(p => {
          const currentPhone = p.telefono;
          const docKey = p.documento ? String(p.documento).trim() : '';
          const localPhone = localPhoneMap.get(docKey);

          if (localPhone && localPhone !== '-' && (currentPhone === '-' || !currentPhone)) {
            matchedCount++;
            return { ...p, telefono: localPhone };
          }
          return p;
        });

        setAuthPatients(updatedPatients);
        
        // Dar feedback al usuario
        alert(`¡Base de datos cruzada con éxito! Se encontraron e inyectaron ${matchedCount} números telefónicos adicionales.`);
      } catch (err: any) {
        console.error(err);
        setExcelError(err.message || 'Error al procesar la base de datos de Excel.');
      } finally {
        setIsProcessingExcel(false);
      }
    };

    reader.onerror = () => {
      setExcelError('Error al leer el archivo de base de datos.');
      setIsProcessingExcel(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Función para copiar texto al portapapeles con feedback
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDoc(text);
    setTimeout(() => setCopiedDoc(null), 2000);
  };

  // Filtrado de autorizaciones por término de búsqueda
  const filteredAuthList = useMemo(() => {
    return authPatients.filter(p => {
      if (!authSearchTerm) return true;
      const lowerSearch = authSearchTerm.toLowerCase();
      return p.paciente.toLowerCase().includes(lowerSearch) || p.documento.toLowerCase().includes(lowerSearch);
    });
  }, [authPatients, authSearchTerm]);

  // Estadísticas del cruce de autorizaciones
  const authStats = useMemo(() => {
    const total = authPatients.length;
    const withPhone = authPatients.filter(p => p.telefono && p.telefono !== '-').length;
    return { total, withPhone };
  }, [authPatients]);

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
      {/* Pestañas Neumórficas Internas */}
      <div className="flex gap-4 p-2 bg-[#e6e7ee] rounded-3xl shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] max-w-md">
        <button
          onClick={() => setActiveSubTab('birthdays')}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 flex-1 ${
            activeSubTab === 'birthdays'
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.35)]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Cumpleaños</span>
        </button>
        <button
          onClick={() => setActiveSubTab('authorizations')}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 flex-1 ${
            activeSubTab === 'authorizations'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_4px_12px_rgba(59,130,246,0.35)]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Autorizaciones</span>
        </button>
      </div>

      {/* VISTA 1: CUMPLEAÑOS */}
      {activeSubTab === 'birthdays' && (
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
      )}

      {/* VISTA 2: AUTORIZACIONES (EXCEL) */}
      {activeSubTab === 'authorizations' && (
        <div className="space-y-8 animate-fade-in">
          {/* Header y Buscador */}
          <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-blue-500" />
                Control y Seguimiento de Autorizaciones
              </h2>
              <p className="text-sm text-gray-500 mt-1">Carga un archivo Excel de autorizaciones para visualizar la asistencia de pacientes y sus números telefónicos.</p>
            </div>

            {authPatients.length > 0 && (
              <div className="w-full md:w-auto flex items-center px-4 py-2 bg-[#e6e7ee] rounded-2xl shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff]">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Buscar por paciente o documento..."
                  value={authSearchTerm}
                  onChange={(e) => setAuthSearchTerm(e.target.value)}
                  className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 outline-none w-full md:w-64"
                />
              </div>
            )}
          </div>

          {/* Área de Carga o Tabla */}
          {authPatients.length === 0 ? (
            <div className="bg-[#e6e7ee] rounded-3xl p-8 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] flex flex-col items-center justify-center min-h-[350px] transition-all">
              <input
                type="file"
                id="excel-file-upload"
                accept=".xlsx, .xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleExcelUpload(file);
                }}
                className="hidden"
              />
              
              {isProcessingExcel ? (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#e6e7ee] shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] flex items-center justify-center animate-spin">
                    <RefreshCw className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-700">Procesando archivo...</h3>
                  <p className="text-sm text-gray-400 max-w-xs">Leyendo las columnas del Excel y cruzando datos con la base de datos para obtener los números de teléfono...</p>
                </div>
              ) : (
                <label 
                  htmlFor="excel-file-upload"
                  className="flex flex-col items-center gap-6 cursor-pointer text-center max-w-lg p-8 rounded-3xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/10 transition-all duration-300 group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-[#e6e7ee] shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-700 group-hover:text-blue-500 transition-colors">Sube tu archivo Excel</h3>
                    <p className="text-sm text-gray-400 mt-1">Haz clic para buscar o arrastra tu archivo aquí</p>
                    <div className="mt-4 inline-flex items-center gap-2 bg-blue-50/60 border border-blue-100 rounded-xl px-3 py-1.5 text-xs text-blue-600 font-semibold shadow-sm">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Extrae: Documento, Paciente, Autorización, Servicio, Cantidades, Fechas y busca el Teléfono en Supabase</span>
                    </div>
                  </div>
                  {excelError && (
                    <div className="mt-2 text-xs text-red-500 font-bold bg-red-50 border border-red-100 rounded-xl px-4 py-2 flex items-center gap-2 animate-bounce">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{excelError}</span>
                    </div>
                  )}
                </label>
              )}
            </div>
          ) : (
            <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff] space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                    {authStats.total} filas importadas
                  </span>
                  <span className="bg-green-100 text-green-600 text-xs font-bold px-3 py-1.5 rounded-full shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-green-500" />
                    {authStats.withPhone} teléfonos cruzados
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Selector e Input oculto para subir base de datos local */}
                  <input
                    type="file"
                    id="excel-db-upload"
                    accept=".xlsx, .xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDatabaseExcelUpload(file);
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="excel-db-upload"
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-600 rounded-xl bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff] transition-all cursor-pointer select-none"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-500" />
                    Subir base de datos
                  </label>

                  <button
                    onClick={() => {
                      setAuthPatients([]);
                      setAuthSearchTerm('');
                      setExcelError(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-500 rounded-xl bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff] transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    Limpiar y subir otro
                  </button>
                </div>
              </div>

              {filteredAuthList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-60">
                  <Search className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-gray-500 font-medium">No se encontraron pacientes que coincidan con la búsqueda</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl bg-[#e6e7ee] shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] p-2 max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead>
                      <tr className="border-b border-gray-300 text-gray-500 font-bold uppercase text-[9px] tracking-wider sticky top-0 bg-[#e6e7ee] z-10">
                        <th className="px-4 py-3">Documento</th>
                        <th className="px-4 py-3">Paciente</th>
                        <th className="px-4 py-3 text-center">N° Autorización</th>
                        <th className="px-4 py-3">Servicio</th>
                        <th className="px-4 py-3 text-center">Cant. Aut</th>
                        <th className="px-4 py-3 text-center">Cant. Asis</th>
                        <th className="px-4 py-3 text-center">Fecha Admisión</th>
                        <th className="px-4 py-3 text-center">Teléfono</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuthList.map((row, idx) => {
                        const hasPhone = row.telefono && row.telefono !== '-';
                        
                        return (
                          <tr key={`${row.documento}-${idx}`} className="border-b border-gray-200/60 last:border-0 hover:bg-[#d8d9e0] transition-colors">
                            <td className="px-4 py-3">
                              <button 
                                onClick={() => handleCopyText(row.documento)}
                                className="group/btn flex items-center gap-1.5 font-mono font-medium text-gray-700 bg-gray-200/50 hover:bg-gray-200 px-2 py-1 rounded text-left transition-colors relative"
                                title="Copiar Documento"
                              >
                                {row.documento || '-'}
                                <Copy className="w-3 h-3 text-gray-400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                {copiedDoc === row.documento && (
                                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded shadow z-20 whitespace-nowrap animate-fade-in">
                                    ¡Copiado!
                                  </span>
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-700 uppercase">
                              {row.paciente}
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-gray-600 font-semibold">
                              {row.autorizacion}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {row.servicio}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-blue-600">
                              {row.cantidadAutorizada}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-indigo-600">
                              {row.cantidadAsistida}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-500 whitespace-nowrap">
                              {row.fechaAdmision}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {hasPhone ? (
                                <div className="flex items-center justify-center gap-2">
                                  <a 
                                    href={`tel:${row.telefono}`}
                                    className="inline-flex items-center gap-1 bg-[#e6e7ee] text-green-600 hover:text-green-700 font-semibold px-2.5 py-1 rounded-lg shadow-[2px_2px_5px_#b8b9be,-2px_-2px_5px_#ffffff] hover:shadow-[inset_1px_1px_3px_#b8b9be,inset_-1px_-1px_3px_#ffffff] transition-all"
                                    title="Llamar"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>{row.telefono}</span>
                                  </a>
                                  <a 
                                    href={`https://wa.me/57${row.telefono.replace(/\s+/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-green-500 bg-[#e6e7ee] hover:bg-green-50 rounded-lg shadow-[2px_2px_5px_#b8b9be,-2px_-2px_5px_#ffffff] hover:shadow-[inset_1px_1px_3px_#b8b9be,inset_-1px_-1px_3px_#ffffff] transition-all"
                                    title="Escribir por WhatsApp"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-gray-300 italic">No encontrado</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import * as XLSX from 'xlsx';
import { createClient } from '@/shared/lib/supabase/client';

export const GLOBAL_REPORT_COLUMNS = [
  'M Tratante',
  'Fecha Creación',
  'Factura',
  'Número Documento',
  'Cliente',
  'EPS/Entidad Paciente',
  'Pagos Recibidos',
  'Pagos Pendientes',
  'Medios Pago',
  'Estado Factura',
  'Dirección',
  'Teléfono',
  'Correo',
  'Tipo Cliente',
  '', // Columna vacía
  'Código (CUP)',
  'Concepto',
  'Valor',
  'Cantidad',
  'IVA',
  'TIPO DE IVA',
  'Total Item',
  'Fecha Anulación',
  'Valor Servicio (Particular o por convenio)',
  'Facturado a la entidad del Paciente',
  'Total final'
];

function internalParseToNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  // Limpiar símbolos de moneda y espacios
  let cleaned = String(val).replace(/[$\s]/g, '');
  
  // Detectar formato numérico inteligentemente:
  // Si tiene coma y punto, determinar cuál es decimal y cuál es miles
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  if (hasComma && hasDot) {
    // Formato con ambos: el último separador es el decimal
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Formato: 1.234,56 → quitar puntos de miles, coma es decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato: 1,234.56 → quitar comas de miles, punto es decimal
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Solo coma: si hay exactamente 2 dígitos después, es decimal; sino es miles
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasDot) {
    // Solo punto: si hay un único punto con ≤2 dígitos después, es decimal
    const parts = cleaned.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Es decimal, dejarlo como está (ej: 41999.86)
    } else {
      // Es separador de miles (ej: 1.234.567), quitar todos los puntos
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

const ENTIDADES_PERMITIDAS = [
  'COLSANITAS MEDICINA PREPAGADA',
  'COLMENA SEGUROS RIESGOS LABORALES',
  'ECOPETROL S A',
  'CAJA DE COMPENSACION FAMILIAR DEL VALLE DEL CAUCA - COMFENALCO VALLE DELAGENTE'
];

export async function processReporteFacturacion(file: File): Promise<{ data: any[][], filteredCount: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          raw: false,
          defval: '',
        });

        if (rawRows.length === 0) throw new Error("El archivo Excel está vacío.");

        const wsData: any[][] = [GLOBAL_REPORT_COLUMNS];
        let filteredCount = 0;

        for (const row of rawRows) {
          const keys = Object.keys(row);
          const tipoClienteKey = keys.find(k => k.trim().toLowerCase() === 'tipo cliente');
          const tipoClienteVal = tipoClienteKey ? String(row[tipoClienteKey]).trim().toLowerCase() : '';

          if (tipoClienteVal === 'empresa') {
            filteredCount++;
            continue;
          }

          const rowData: any[] = [];
          for (let i = 0; i < GLOBAL_REPORT_COLUMNS.length; i++) {
            const targetCol = GLOBAL_REPORT_COLUMNS[i];
            
            if (targetCol === 'Total final') {
              // Lógica de Total final: Total Item o Valor Servicio
              // Nuevos índices: Total Item (21), Valor Servicio (23)
              const totalItem = rowData[21];
              const valorServicio = rowData[23];
              
              let totalFinalValue = internalParseToNumber(totalItem);
              if (totalFinalValue === 0) totalFinalValue = internalParseToNumber(valorServicio);
              
              rowData.push(totalFinalValue);
              continue;
            }

            if (targetCol === '') {
              rowData.push('');
            } else {
              const originalKey = keys.find(k => k.trim().toLowerCase() === targetCol.toLowerCase());
              rowData.push(originalKey ? row[originalKey] : '');
            }
          }
          wsData.push(rowData);
        }
        resolve({ data: wsData, filteredCount });
      } catch (err: any) {
        reject(new Error('Error al procesar Facturación: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo Excel.'));
    reader.readAsBinaryString(file);
  });
}

export async function processReporteTransaccion(file: File): Promise<{ data: any[][], filteredCount: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          raw: false,
          defval: '',
        });

        if (rawRows.length === 0) throw new Error("El archivo Excel está vacío.");

        const wsData: any[][] = [GLOBAL_REPORT_COLUMNS];
        let filteredCount = 0;

        for (const row of rawRows) {
          const keys = Object.keys(row);
          
          const entidadKey = keys.find(k => k.trim().toLowerCase() === 'entidad');
          const entidadVal = entidadKey ? String(row[entidadKey]).trim() : '';

          if (!ENTIDADES_PERMITIDAS.includes(entidadVal)) {
            filteredCount++;
            continue;
          }

          const rowData = new Array(GLOBAL_REPORT_COLUMNS.length).fill('');
          
          const getVal = (targetName: string) => {
            const k = keys.find(key => key.trim().toLowerCase() === targetName.toLowerCase());
            return k ? row[k] : '';
          };

          // Mapeo solicitado: Índices ajustados tras eliminar duplicados
          rowData[1] = getVal('Fecha');                           // Fecha Creación
          rowData[3] = getVal('Documento');                       // Número Documento
          rowData[4] = getVal('Paciente');                        // Cliente
          rowData[5] = getVal('Entidad');                         // EPS/Entidad Paciente
          rowData[15] = getVal('CUP');                            // Código (CUP) (antes 20)
          rowData[16] = getVal('Servicio');                       // Concepto (antes 21)
          rowData[23] = getVal('Valor Servicio (Particular o por convenio)'); // (antes 28)
          rowData[24] = getVal('Facturado a la entidad del Paciente'); // (antes 29)

          // Calcular Total final para transacciones
          const totalItemVal = rowData[21] || ''; // Total Item (antes 12/26)
          const valorServicioVal = rowData[23];
          let totalFinalTrans = internalParseToNumber(totalItemVal);
          if (totalFinalTrans === 0) totalFinalTrans = internalParseToNumber(valorServicioVal);
          rowData[25] = totalFinalTrans; // Total final (antes 30)

          wsData.push(rowData);
        }
        resolve({ data: wsData, filteredCount });
      } catch (err: any) {
        reject(new Error('Error al procesar Transacciones: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo Excel.'));
    reader.readAsBinaryString(file);
  });
}

/**
 * Procesa un archivo Excel de médicos tratantes y actualiza los datos actuales.
 * Compara 'Documento' (Excel) con 'Número Documento' (Tabla, índice 3).
 */
export async function processMedicoTratante(file: File, currentData: any[][]): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          raw: false,
          defval: '',
        });

        if (rawRows.length === 0) throw new Error("El archivo de médicos está vacío.");

        // Normalizador auxiliar para mejorar el emparejamiento ignorando tildes y mayúsculas
        const normalizeStr = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // Limpieza robusta de números de documento
        const cleanDocument = (val: unknown): string => {
          if (val === null || val === undefined) return '';
          let str = String(val);
          // 1. Eliminar todos los espacios
          str = str.replace(/\s+/g, '');
          // 2. Si Excel lo tomó como número y le puso .0 al final
          if (str.endsWith('.0')) {
            str = str.slice(0, -2);
          }
          // 3. Eliminar puntos, comas o guiones (ej: separadores de miles formateaods como texto)
          str = str.replace(/[.,\-]/g, '');
          return str.toUpperCase();
        };

        // Crear un mapa para búsqueda rápida: Documento -> Medico Tratante
        const medicosMap = new Map<string, string>();
        for (const row of rawRows) {
          const keys = Object.keys(row);
          
          const docKey = keys.find(k => {
            const norm = normalizeStr(k);
            return norm === 'documento' || norm === 'numero documento' || norm === 'identificacion' || norm === 'cedula' || norm === 'doc';
          });
          const medicoKey = keys.find(k => {
            const norm = normalizeStr(k);
            return norm === 'medico tratante' || norm === 'medico' || norm === 'm tratante';
          });
          
          if (docKey && medicoKey) {
            const docVal = cleanDocument(row[docKey]);
            const medicoVal = String(row[medicoKey]).trim();
            if (docVal && medicoVal) medicosMap.set(docVal, medicoVal);
          }
        }

        // Clonar los datos actuales y actualizar la columna 'M Tratante' (índice 0)
        // El índice 3 es 'Número Documento'
        const updatedData = currentData.map((row, idx) => {
          if (idx === 0) return row; // Mantener encabezado
          
          const numDoc = cleanDocument(row[3]);

          const newRow = [...row];
          if (numDoc && medicosMap.has(numDoc)) {
            newRow[0] = medicosMap.get(numDoc);
          } else {
            // El usuario pidió dejar el espacio en vacío si no encuentra la coincidencia
            newRow[0] = '';
          }
          return newRow;
        });

        resolve(updatedData);
      } catch (err: any) {
        reject(new Error('Error al procesar Médicos: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo Excel de médicos.'));
    reader.readAsBinaryString(file);
  });
}

export function exportToExcel(data: any[][], fileName: string = 'Reporte_Consolidado') {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
  
  const timestamp = new Date().getTime();
  XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`);
}

/**
 * Guarda los datos de la tabla unificada en Supabase.
 */
export async function saveUnifiedToSupabase(data: any[][]) {
  const supabase = createClient();
  
  // Omitir encabezado
  const rowsToInsert = data.slice(1).map(row => {
    // Convertir fecha a string ISO si es un objeto Date
    let treatmentDate = row[1];
    if (treatmentDate instanceof Date) {
      treatmentDate = treatmentDate.toISOString().split('T')[0];
    } else if (typeof treatmentDate === 'string' && treatmentDate.includes('/')) {
      // Intento básico de normalización si viene como DD/MM/YYYY
      const parts = treatmentDate.split('/');
      if (parts.length === 3) {
        treatmentDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // Mapeo detallado a medical_records
    return {
      doctor_name: row[0] ? String(row[0]).trim() : null,
      treatment_date: treatmentDate || null,
      invoice_number: row[2] ? String(row[2]).trim() : null,
      patient_doc: row[3] ? String(row[3]).trim() : null,
      patient_name: row[4] ? String(row[4]).trim() : 'Paciente Desconocido',
      entity_name: row[5] ? String(row[5]).trim() : 'PARTICULAR',
      treatment_name: row[16] ? String(row[16]).trim() : null, // Concepto (antes 21)
      extra_data: row.reduce((acc, val, idx) => {
        const key = GLOBAL_REPORT_COLUMNS[idx] || `col_${idx}`;
        acc[key] = val;
        return acc;
      }, {} as Record<string, any>)
    };
  });

  // Dividir en lotes de 100 para evitar límites de tamaño en payloads si la tabla es gigante
  const batchSize = 100;
  for (let i = 0; i < rowsToInsert.length; i += batchSize) {
    const batch = rowsToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('medical_records').insert(batch);
    if (error) {
      console.error('Error in batch insert:', error);
      throw new Error(`Error al guardar lote ${i / batchSize + 1}: ${error.message}`);
    }
  }
}

/**
 * Obtiene el total exacto de registros en la tabla medical_records.
 */
export async function getDatabaseTotalCount(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from('medical_records')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error('Error fetching total count:', error);
    return 0;
  }
  return count || 0;
}

/**
 * Obtiene los primeros N registros de Supabase y los formatea respetando GLOBAL_REPORT_COLUMNS.
 */
export async function fetchDatabasePreview(limit: number = 50): Promise<any[][]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('medical_records')
    .select('extra_data')
    .limit(limit)
    .order('treatment_date', { ascending: true });

  if (error) {
    console.error('Error fetching preview:', error);
    throw new Error('No se pudo obtener la previsualización de la base de datos.');
  }

  // Si no hay datos, retornamos null
  if (!data || data.length === 0) return [];

  const previewTable = data.map(record => {
    const rowData: any[] = [];
    GLOBAL_REPORT_COLUMNS.forEach(col => {
      // Recreamos la fila asegurando que cada columna quede en su índice correcto
      rowData.push(col === '' ? '' : (record.extra_data?.[col] || ''));
    });
    return rowData;
  });

  return [GLOBAL_REPORT_COLUMNS, ...previewTable];
}

/**
 * Elimina TODO el contenido de la tabla medical_records en Supabase.
 */
export async function deleteAllRecords() {
  const supabase = createClient();
  // Borrado masivo (gt uuid default)
  const { error } = await supabase
    .from('medical_records')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Siempre verdadero, borra todo
    
  if (error) {
    console.error('Error deleting records:', error);
    throw new Error('No se pudo borrar la base de datos: ' + error.message);
  }
}

/**
 * Elimina registros de la tabla medical_records en Supabase según un rango de fechas.
 */
export async function deleteRecordsByDateRange(startDate: string, endDate: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('medical_records')
    .delete()
    .gte('treatment_date', startDate)
    .lte('treatment_date', endDate);
    
  if (error) {
    console.error('Error deleting records by date range:', error);
    throw new Error('No se pudo borrar los registros: ' + error.message);
  }
}

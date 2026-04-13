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
  'Valor',
  'Cantidad',
  'IVA',
  'TIPO DE IVA',
  'Total Item',
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
  'Facturado a la entidad del Paciente'
];

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
            
            if (i >= 27) {
              rowData.push('');
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

          // Mapeo solicitado en la tercera imagen/texto - Índices desplazados por 'M Tratante'
          rowData[1] = getVal('Fecha');                           // Fecha Creación
          rowData[3] = getVal('Documento');                       // Número Documento
          rowData[4] = getVal('Paciente');                        // Cliente
          rowData[5] = getVal('Entidad');                         // EPS/Entidad Paciente
          rowData[20] = getVal('CUP');                            // Código (CUP)
          rowData[21] = getVal('Servicio');                       // Concepto
          rowData[28] = getVal('Valor Servicio (Particular o por convenio)');
          rowData[29] = getVal('Facturado a la entidad del Paciente');

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
            let docVal = String(row[docKey]).trim();
            // A veces Excel exporta números grandes con un .0 al final (ej 94449832.0)
            if (docVal.endsWith('.0')) docVal = docVal.slice(0, -2);
            
            const medicoVal = String(row[medicoKey]).trim();
            if (docVal) medicosMap.set(docVal, medicoVal);
          }
        }

        // Clonar los datos actuales y actualizar la columna 'M Tratante' (índice 0)
        // El índice 3 es 'Número Documento'
        const updatedData = currentData.map((row, idx) => {
          if (idx === 0) return row; // Mantener encabezado
          
          let numDoc = String(row[3] || '').trim();
          if (numDoc.endsWith('.0')) numDoc = numDoc.slice(0, -2);

          const newRow = [...row];
          if (numDoc && medicosMap.has(numDoc)) {
            newRow[0] = medicosMap.get(numDoc);
          } else {
            // El usuario pidió que se coloque explícitamente "no encontrado"
            newRow[0] = 'no encontrado';
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
      treatment_name: row[21] ? String(row[21]).trim() : null,
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
    .order('created_at', { ascending: false });

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

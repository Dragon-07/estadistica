import * as XLSX from 'xlsx';
import { createClient } from '@/shared/lib/supabase/client';

export const GLOBAL_REPORT_COLUMNS = [
  'M Tratante',
  'Fecha Creación',
  'Factura',
  'Número Documento',
  'Cliente',
  'Fecha de Nacimiento', // NUEVA
  'Género',             // NUEVA
  'EPS/Entidad Paciente',
  'Pagos Recibidos',
  'Pago Pendiente por la entidad',
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
              // Índices: Total Item (23), Valor Servicio (25)
              const totalItem = rowData[23];
              const valorServicio = rowData[25];
              
              let totalFinalValue = internalParseToNumber(totalItem);
              if (totalFinalValue === 0) totalFinalValue = internalParseToNumber(valorServicio);
              
              rowData.push(totalFinalValue);
              continue;
            }

            if (targetCol === '') {
              rowData.push('');
            } else {
              let originalKey = keys.find(k => k.trim().toLowerCase() === targetCol.toLowerCase());
              if (!originalKey && targetCol === 'Valor Servicio (Particular o por convenio)') {
                originalKey = keys.find(k => {
                  const norm = k.trim().toLowerCase();
                  return norm === 'valor servicio (particular o convenio)' || norm === 'valor servicio' || norm.includes('valor servicio');
                });
              }
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

export async function processReporteTransaccion(
  file: File,
  currentData?: any[][] | null
): Promise<{ data: any[][], filteredCount: number } | any[][]> {
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

        const normalizeStr = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const cleanDoc = (val: unknown): string => {
          if (val === null || val === undefined) return '';
          let str = String(val).trim().replace(/\s+/g, '');
          if (str.endsWith('.0')) str = str.slice(0, -2);
          return str.replace(/[.,\-]/g, '').toUpperCase();
        };

        const cleanFact = (val: unknown): string => {
          if (val === null || val === undefined) return '';
          return String(val).trim().toUpperCase();
        };

        const cleanDate = (val: unknown): string => {
          if (!val) return '';
          if (val instanceof Date) return val.toISOString().slice(0, 10);
          const str = String(val).trim();
          if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3 && parts[2].length === 4) {
              return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          return str.slice(0, 10);
        };

        const cleanCup = (val: unknown): string => {
          if (!val) return '';
          const str = String(val).trim();
          const m = str.match(/^(\d+)/);
          return m ? m[1] : str.toLowerCase();
        };

        const getValFromRow = (row: Record<string, unknown>, ...targetNames: string[]) => {
          const keys = Object.keys(row);
          for (const targetName of targetNames) {
            const targetNorm = normalizeStr(targetName);
            const k = keys.find(key => normalizeStr(key) === targetNorm);
            if (k && row[k] !== undefined && row[k] !== null && row[k] !== '') {
              return row[k];
            }
          }
          return '';
        };

        const isTargetEntity = (entVal: unknown): boolean => {
          if (!entVal) return false;
          const norm = normalizeStr(String(entVal));
          return norm.includes('colmena') || norm.includes('ecopetrol');
        };

        const createRowFromTransaction = (row: Record<string, unknown>): any[] => {
          const rowData = new Array(GLOBAL_REPORT_COLUMNS.length).fill('');

          const rawDate = getValFromRow(row, 'Fecha', 'Fecha Creacion');
          const dateStr = cleanDate(rawDate) || String(rawDate || '');
          const factStr = cleanFact(getValFromRow(row, '# Factura del Paciente', 'Factura del Paciente', 'Factura'));
          const docStr = cleanDoc(getValFromRow(row, 'Documento', 'Numero Documento', 'Cedula', 'Identificacion'));
          const pacienteStr = String(getValFromRow(row, 'Paciente', 'Cliente', 'Nombre') || '').trim();
          const entidadStr = String(getValFromRow(row, 'Entidad', 'EPS/Entidad Paciente', 'EPS') || '').trim();
          const medioPagoStr = String(getValFromRow(row, 'Medio Pago', 'Medios Pago') || '').trim();
          const cupStr = String(getValFromRow(row, 'CUP', 'Codigo (CUP)', 'Codigo CUP', 'Código (CUP)') || '').trim();
          const servicioStr = String(getValFromRow(row, 'Servicio', 'Concepto', 'Tratamiento') || '').trim();
          const medicoStr = String(getValFromRow(row, 'Profesional Atendió', 'Profesional Atendio', 'Agenda', 'Medico') || '').trim();

          const valServRaw = getValFromRow(row,
            'Valor Servicio (Particular o por convenio)',
            'Valor Servicio (Particular o convenio)',
            'Valor Servicio',
            'Valor'
          );
          const factEntRaw = getValFromRow(row, 'Facturado a la entidad del Paciente', 'Facturado a la entidad', 'Facturado');

          const valorServicio = internalParseToNumber(valServRaw);
          let facturadoEntidad: any = 0;
          if (factEntRaw && String(factEntRaw).toLowerCase() !== 'no' && factEntRaw !== '-') {
            facturadoEntidad = internalParseToNumber(factEntRaw);
          }

          rowData[0] = medicoStr;
          rowData[1] = dateStr;
          rowData[2] = (factStr && factStr !== '-') ? factStr : '';
          rowData[3] = docStr;
          rowData[4] = pacienteStr;
          rowData[5] = '';
          rowData[6] = '';
          rowData[7] = entidadStr;
          rowData[8] = 0;
          rowData[9] = 0;
          rowData[10] = (medioPagoStr && medioPagoStr !== '-') ? medioPagoStr : '';
          rowData[11] = '';
          rowData[12] = '';
          rowData[13] = '';
          rowData[14] = '';
          rowData[15] = '';
          rowData[16] = '';
          rowData[17] = cupStr;
          rowData[18] = servicioStr;
          rowData[19] = 0;
          rowData[20] = 0;
          rowData[21] = 0;
          rowData[22] = 0;
          rowData[23] = 0;
          rowData[24] = '';
          rowData[25] = valorServicio;
          rowData[26] = facturadoEntidad;
          rowData[27] = valorServicio;

          return rowData;
        };

        // MODO A: Si se pasa la tabla actual de facturación, actualizamos cada fila con los datos de transacción
        if (currentData && currentData.length > 1) {
          const byFactura = new Map<string, { valServ: any; factEnt: any }>();
          const byDocDateCup = new Map<string, { valServ: any; factEnt: any }>();
          const byDocDate = new Map<string, { valServ: any; factEnt: any }[]>();

          for (const row of rawRows) {
            const fact = cleanFact(getValFromRow(row, '# Factura del Paciente', 'Factura del Paciente', 'Factura'));
            const doc = cleanDoc(getValFromRow(row, 'Documento', 'Numero Documento', 'Identificacion'));
            const date = cleanDate(getValFromRow(row, 'Fecha', 'Fecha Creacion'));
            const cup = cleanCup(getValFromRow(row, 'CUP', 'Codigo (CUP)', 'Codigo CUP'));
            const valServ = getValFromRow(row,
              'Valor Servicio (Particular o por convenio)',
              'Valor Servicio (Particular o convenio)',
              'Valor Servicio',
              'Valor'
            );
            const factEnt = getValFromRow(row, 'Facturado a la entidad del Paciente', 'Facturado a la entidad', 'Facturado');

            const payload = { valServ, factEnt };

            if (fact && fact !== '-') {
              byFactura.set(fact, payload);
            }
            if (doc && date && cup) {
              byDocDateCup.set(`${doc}_${date}_${cup}`, payload);
            }
            if (doc && date) {
              if (!byDocDate.has(`${doc}_${date}`)) byDocDate.set(`${doc}_${date}`, []);
              byDocDate.get(`${doc}_${date}`)!.push(payload);
            }
          }

          const updatedData = currentData.map((row, idx) => {
            if (idx === 0) return row; // Encabezado

            const factNum = cleanFact(row[2]);  // Factura
            const docNum = cleanDoc(row[3]);    // Número Documento
            const dateStr = cleanDate(row[1]);  // Fecha Creación
            const cupStr = cleanCup(row[17]);   // Código (CUP)

            let match: { valServ: any; factEnt: any } | null = null;
            if (factNum && byFactura.has(factNum)) {
              match = byFactura.get(factNum)!;
            } else if (docNum && dateStr && cupStr && byDocDateCup.has(`${docNum}_${dateStr}_${cupStr}`)) {
              match = byDocDateCup.get(`${docNum}_${dateStr}_${cupStr}`)!;
            } else if (docNum && dateStr && byDocDate.has(`${docNum}_${dateStr}`)) {
              match = byDocDate.get(`${docNum}_${dateStr}`)![0];
            }

            const newRow = [...row];
            if (match) {
              if (match.valServ !== undefined && match.valServ !== null && match.valServ !== '') {
                newRow[25] = match.valServ; // Valor Servicio (Particular o por convenio)
              }
              if (match.factEnt !== undefined && match.factEnt !== null && match.factEnt !== '') {
                newRow[26] = match.factEnt; // Facturado a la entidad del Paciente
              }

              // Recalcular Total final (índice 27)
              const totalItemVal = newRow[23] || '';
              let totalFinal = internalParseToNumber(totalItemVal);
              if (totalFinal === 0) {
                totalFinal = internalParseToNumber(newRow[25]);
              }
              newRow[27] = totalFinal;
            }
            return newRow;
          });

          // Añadir a la tabla los ítems de "COLMENA SEGUROS RIESGOS LABORALES" y "ECOPETROL S A"
          const existingCountMap = new Map<string, number>();
          for (let i = 1; i < currentData.length; i++) {
            const r = currentData[i];
            const d = cleanDoc(r[3]);
            const dt = cleanDate(r[1]);
            const c = cleanCup(r[17]);
            const val = internalParseToNumber(r[25]);
            const key = `${d}_${dt}_${c}_${val}`;
            existingCountMap.set(key, (existingCountMap.get(key) || 0) + 1);
          }

          for (const row of rawRows) {
            const entidad = getValFromRow(row, 'Entidad', 'EPS/Entidad Paciente', 'EPS');
            if (isTargetEntity(entidad)) {
              const doc = cleanDoc(getValFromRow(row, 'Documento', 'Numero Documento', 'Cedula', 'Identificacion'));
              const dt = cleanDate(getValFromRow(row, 'Fecha', 'Fecha Creacion'));
              const cup = cleanCup(getValFromRow(row, 'CUP', 'Codigo (CUP)', 'Codigo CUP'));
              const valServ = internalParseToNumber(getValFromRow(row,
                'Valor Servicio (Particular o por convenio)',
                'Valor Servicio (Particular o convenio)',
                'Valor Servicio',
                'Valor'
              ));
              const key = `${doc}_${dt}_${cup}_${valServ}`;

              const currentCount = existingCountMap.get(key) || 0;
              if (currentCount > 0) {
                existingCountMap.set(key, currentCount - 1);
                continue;
              }

              const newRow = createRowFromTransaction(row);
              updatedData.push(newRow);
            }
          }

          resolve(updatedData);
          return;
        }

        // MODO B: Si no hay tabla previa, generamos las filas desde el reporte de transacciones
        const wsData: any[][] = [GLOBAL_REPORT_COLUMNS];

        for (const row of rawRows) {
          wsData.push(createRowFromTransaction(row));
        }
        resolve({ data: wsData, filteredCount: 0 });
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

        // Crear un mapa para búsqueda rápida: Documento -> Datos Extras
        const medicosMap = new Map<string, { medico: string, fechaNac: string, genero: string }>();
        
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
          const fechaNacKey = keys.find(k => {
            const norm = normalizeStr(k);
            return norm === 'fecha de nacimiento' || norm === 'fecha nacimiento' || norm === 'nacimiento' || norm === 'f nacimiento';
          });
          const generoKey = keys.find(k => {
            const norm = normalizeStr(k);
            return norm === 'genero' || norm === 'sexo' || norm === 'f/m';
          });
          
          if (docKey) {
            const docVal = cleanDocument(row[docKey]);
            const medicoVal = medicoKey ? String(row[medicoKey]).trim() : '';
            const fechaNacVal = fechaNacKey ? String(row[fechaNacKey]).trim() : '';
            const generoVal = generoKey ? String(row[generoKey]).trim() : '';
            
            if (docVal) {
              medicosMap.set(docVal, { medico: medicoVal, fechaNac: fechaNacVal, genero: generoVal });
            }
          }
        }

        // Clonar los datos actuales y actualizar la columna 'M Tratante' (índice 0), 'Fecha de Nacimiento' (5) y 'Género' (6)
        // El índice 3 es 'Número Documento'
        const updatedData = currentData.map((row, idx) => {
          if (idx === 0) return row; // Mantener encabezado
          
          const numDoc = cleanDocument(row[3]);

          const newRow = [...row];
          if (numDoc && medicosMap.has(numDoc)) {
            const data = medicosMap.get(numDoc)!;
            newRow[0] = data.medico;
            newRow[5] = data.fechaNac;
            newRow[6] = data.genero;
          } else {
            newRow[0] = '';
            newRow[5] = '';
            newRow[6] = '';
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

/**
 * Cruza las tarifas de la tabla 'entity_values' con los datos procesados en memoria (reporteFacturacionData).
 * Permite completar 'Pago Pendiente por la entidad' (índice 9) y recalcular 'Total final' (índice 27)
 * después de subir los archivos Excel y ANTES de guardar en Supabase.
 */
export async function processCompletarValoresLocal(
  currentData: any[][]
): Promise<{ updatedData: any[][]; updatedCount: number }> {
  const supabase = createClient();
  const { data: entityValues, error } = await supabase
    .from('entity_values')
    .select('*');

  if (error) {
    throw new Error('Error al obtener tarifas de entidades: ' + error.message);
  }

  if (!entityValues || entityValues.length === 0 || !currentData || currentData.length <= 1) {
    return { updatedData: currentData || [], updatedCount: 0 };
  }

  let updatedCount = 0;

  const updatedData = currentData.map((row, idx) => {
    if (idx === 0) return row; // Mantener encabezados

    const normRowEntity = String(row[7] || '').trim().toUpperCase();
    const normRowTreatment = String(row[18] || '').trim().toUpperCase();
    const rowCopayNum = internalParseToNumber(row[8]);

    // Buscar coincidencia en entity_values
    const match = entityValues.find((ev) => {
      const evEntity = String(ev.entity_name || '').trim().toUpperCase();
      const evService = String(ev.service_name || '').trim().toUpperCase();
      const evCopayNum = Number(ev.copay) || 0;

      // 1. Coincidencia de Entidad (exacta o por inclusión si >= 4 caracteres)
      let entityMatch = normRowEntity === evEntity;
      if (!entityMatch && evEntity.length >= 4 && normRowEntity.length >= 4) {
        entityMatch = normRowEntity.includes(evEntity) || evEntity.includes(normRowEntity);
      }

      // 2. Coincidencia de Servicio / Concepto
      const serviceMatch = normRowTreatment === evService;

      // 3. Coincidencia de Copago / Pagos Recibidos
      const copayMatch = Math.abs(rowCopayNum - evCopayNum) < 0.01;

      return entityMatch && serviceMatch && copayMatch;
    });

    if (match) {
      const newRow = [...row];
      const entityVal = Number(match.entity_value) || 0;

      newRow[9] = entityVal; // Pago Pendiente por la entidad
      newRow[27] = rowCopayNum + entityVal; // Total final = Pagos Recibidos + Pago Pendiente por la entidad

      updatedCount++;
      return newRow;
    }

    return row;
  });

  return { updatedData, updatedCount };
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
      entity_name: row[7] ? String(row[7]).trim() : 'PARTICULAR',
      treatment_name: row[18] ? String(row[18]).trim() : null, // Concepto
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
 * Obtiene la fecha mínima y máxima de los registros.
 */
export async function getDatabaseDateRange(): Promise<{ min: string | null, max: string | null }> {
  const supabase = createClient();
  
  const { data: minData, error: minError } = await supabase
    .from('medical_records')
    .select('treatment_date')
    .not('treatment_date', 'is', null)
    .order('treatment_date', { ascending: true })
    .limit(1);

  const { data: maxData, error: maxError } = await supabase
    .from('medical_records')
    .select('treatment_date')
    .not('treatment_date', 'is', null)
    .order('treatment_date', { ascending: false })
    .limit(1);

  if (minError || maxError) {
    console.error('Error fetching dates', minError || maxError);
    return { min: null, max: null };
  }

  const min = minData && minData.length > 0 ? minData[0].treatment_date : null;
  const max = maxData && maxData.length > 0 ? maxData[0].treatment_date : null;

  return { min, max };
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

export interface ProcessPacientesResult {
  totalProcessed: number;
  newPatientsCount: number;
  existingUpdatedCount: number;
  newPatients: Array<{
    doc_id: string;
    full_name: string;
    phone: string;
    referral_code: string | null;
    referred_by_code?: string;
  }>;
  referralsDetected: Array<{
    patient_doc: string;
    patient_name: string;
    referrer_code?: string;
    referrer_doc: string;
    referrer_name?: string;
    reward_amount?: number;
  }>;
}

/**
 * Obtiene todos los registros de patients_directory paginando de 1000 en 1000
 * para superar el límite por defecto de PostgREST.
 */
export async function fetchAllPatientsDirectory() {
  const supabase = createClient();
  const allRows: Array<any> = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('patients_directory')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error cargando patients_directory:', error);
      break;
    }

    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

/**
 * Genera un código de referido único basado en el primer nombre y los últimos dígitos de la cédula.
 */
export function buildUniqueReferralCode(
  fullNameOrFirstName: string,
  docId: string,
  existingCodesSet: Set<string>
): string {
  const rawFirst = (fullNameOrFirstName || '').trim().split(/\s+/)[0] || 'PACIENTE';
  const cleanFirst =
    rawFirst
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '') || 'PACIENTE';

  const cleanDoc = docId.replace(/\D/g, '') || docId;
  let baseCode = cleanFirst + cleanDoc.slice(-4);
  let suffixLength = 4;

  while (existingCodesSet.has(baseCode) && suffixLength < cleanDoc.length) {
    suffixLength++;
    baseCode = cleanFirst + cleanDoc.slice(-suffixLength);
  }

  if (existingCodesSet.has(baseCode)) {
    let counter = 1;
    while (existingCodesSet.has(`${baseCode}${counter}`)) {
      counter++;
    }
    baseCode = `${baseCode}${counter}`;
  }

  existingCodesSet.add(baseCode);
  return baseCode;
}

/**
 * Verifica qué pacientes referidos en estado 'pending' ya se encuentran en la Base de Datos
 * de Pacientes (patients_directory). Cuando un paciente referido ya aparece en la base de datos:
 * 1. Pasa su estado a 'completed' (Asistió).
 * 2. Vincula referred_by_doc y referred_by_code en patients_directory.
 * 3. Asigna automáticamente la bonificación correspondiente a la billetera de quien lo refirió.
 */
export async function syncPendingReferralsWithDatabase(): Promise<ProcessPacientesResult['referralsDetected']> {
  const supabase = createClient();
  const confirmedList: ProcessPacientesResult['referralsDetected'] = [];

  // 1. Obtener todos los referidos pendientes
  const { data: pendingRefs, error: refErr } = await supabase
    .from('referrals')
    .select('*')
    .eq('status', 'pending');

  if (refErr || !pendingRefs || pendingRefs.length === 0) {
    return confirmedList;
  }

  // 2. Obtener configuración de campaña por si algún registro no tenía monto
  const { data: campaignCfg } = await supabase
    .from('referral_settings')
    .select('referrer_reward, referred_discount')
    .eq('id', 1)
    .maybeSingle();

  const defaultReward = Number(campaignCfg?.referrer_reward) || 15000;
  const defaultDiscount = Number(campaignCfg?.referred_discount) || 15000;

  // 3. Consultar si los documentos de los referidos pendientes ya existen en patients_directory
  const referredDocs = Array.from(new Set(pendingRefs.map((r) => String(r.referred_doc).trim())));
  const referrerDocs = Array.from(new Set(pendingRefs.map((r) => String(r.referrer_doc).trim())));

  const { data: matchedPatients } = await supabase
    .from('patients_directory')
    .select('doc_id, full_name, referral_code')
    .in('doc_id', [...referredDocs, ...referrerDocs]);

  const patientMap = new Map<string, { full_name: string; referral_code: string | null }>();
  (matchedPatients || []).forEach((p) => {
    patientMap.set(String(p.doc_id).trim(), {
      full_name: p.full_name,
      referral_code: p.referral_code,
    });
  });

  // 4. Procesar cada referido pendiente que YA aparece en la base de datos de pacientes
  for (const ref of pendingRefs) {
    const cleanReferredDoc = String(ref.referred_doc).trim();
    const cleanReferrerDoc = String(ref.referrer_doc).trim();

    if (!patientMap.has(cleanReferredDoc)) {
      continue; // Todavía no figura en la base de datos de pacientes de la clínica
    }

    const referredPatient = patientMap.get(cleanReferredDoc)!;
    const referrerPatient = patientMap.get(cleanReferrerDoc);
    const rewardVal = Number(ref.reward_amount) || defaultReward;
    const discountVal = Number(ref.discount_amount) || defaultDiscount;
    const referrerName = ref.referrer_name || referrerPatient?.full_name || `Paciente ${cleanReferrerDoc}`;
    const referredName = ref.referred_name || referredPatient.full_name || `Paciente ${cleanReferredDoc}`;
    const referrerCode = referrerPatient?.referral_code || undefined;

    // A) Actualizar estado del referido a 'completed'
    const { error: updRefErr } = await supabase
      .from('referrals')
      .update({
        status: 'completed',
        referrer_name: referrerName,
        referred_name: referredName,
        reward_amount: rewardVal,
        discount_amount: discountVal,
        treatment_name: ref.treatment_name || 'Confirmado en Base de Datos de Pacientes (1ra Atención)',
        notes: ref.notes
          ? `${ref.notes} | Confirmado en BD de pacientes`
          : 'Asistencia verificada en Base de Datos de Pacientes',
      })
      .eq('id', ref.id);

    if (updRefErr) {
      console.error('Error actualizando referido pendiente:', updRefErr);
      continue;
    }

    // B) Marcar en patients_directory quién lo refirió
    await supabase
      .from('patients_directory')
      .update({
        referred_by_doc: cleanReferrerDoc,
        referred_by_code: referrerCode || null,
        updated_at: new Date().toISOString(),
      })
      .eq('doc_id', cleanReferredDoc);

    // C) Acreditar la bonificación a la billetera del embajador que lo refirió
    const { data: walletData } = await supabase
      .from('ambassador_wallets')
      .select('*')
      .eq('doc_id', cleanReferrerDoc)
      .maybeSingle();

    const currentEarned = Number(walletData?.total_earned) || 0;
    const currentRedeemed = Number(walletData?.total_redeemed) || 0;
    const currentBalance = Number(walletData?.balance) || 0;

    await supabase.from('ambassador_wallets').upsert(
      [
        {
          doc_id: cleanReferrerDoc,
          full_name: referrerName,
          total_earned: currentEarned + rewardVal,
          total_redeemed: currentRedeemed,
          balance: currentBalance + rewardVal,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'doc_id' }
    );

    confirmedList.push({
      patient_doc: cleanReferredDoc,
      patient_name: referredName,
      referrer_code: referrerCode,
      referrer_doc: cleanReferrerDoc,
      referrer_name: referrerName,
      reward_amount: rewardVal,
    });
  }

  return confirmedList;
}

/**
 * Procesa el archivo Excel 'reporte_datos_pacientes' para actualizar la base de datos maestra de pacientes.
 * - Conserva los códigos de referido de los pacientes que ya los hayan creado en el Portal de Pacientes.
 * - Para los pacientes nuevos de la base de datos, los registra con referral_code = null hasta que ellos mismos
 *   ingresen al Portal de Pacientes y creen su código.
 * - Si un paciente que estaba inscrito con código de referido ('pending') ya aparece en este archivo Excel,
 *   automáticamente confirma su asistencia y le acredita la bonificación a la persona que lo refirió.
 */
export async function processReportePacientes(file: File): Promise<ProcessPacientesResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          raw: false,
          defval: '',
        });

        if (rawRows.length === 0) {
          throw new Error('El archivo de pacientes está vacío.');
        }

        const normalizeStr = (s: string) =>
          s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const cleanDoc = (val: unknown): string => {
          if (val === null || val === undefined) return '';
          let str = String(val).trim().replace(/\s+/g, '');
          if (str.endsWith('.0')) str = str.slice(0, -2);
          return str.replace(/[.,\-]/g, '').toUpperCase();
        };

        const supabase = createClient();

        // 1. Obtener todos los pacientes existentes en la base de datos (sin truncar en 1000)
        const existingPatients = await fetchAllPatientsDirectory();

        const existingDocMap = new Map<
          string,
          {
            full_name: string;
            referral_code: string | null;
            referred_by_code: string | null;
            referred_by_doc: string | null;
          }
        >();

        (existingPatients || []).forEach((p) => {
          existingDocMap.set(String(p.doc_id).trim(), {
            full_name: p.full_name,
            referral_code: p.referral_code || null,
            referred_by_code: p.referred_by_code || null,
            referred_by_doc: p.referred_by_doc || null,
          });
        });

        // 2. Extraer y limpiar registros del archivo Excel
        const parsedRows: Array<{
          doc_id: string;
          first_name: string;
          last_name: string;
          full_name: string;
          phone: string;
          email: string;
          how_found: string;
        }> = [];

        const seenInFile = new Set<string>();

        for (const row of rawRows) {
          const keys = Object.keys(row);

          const docKey = keys.find((k) => {
            const n = normalizeStr(k);
            return n === 'documento' || n === 'numero documento' || n === 'cedula' || n === 'doc';
          });
          const nameKey = keys.find((k) => {
            const n = normalizeStr(k);
            return n === 'nombres' || n === 'nombre' || n === 'paciente' || n === 'cliente';
          });
          const lastNameKey = keys.find((k) => {
            const n = normalizeStr(k);
            return n === 'apellidos' || n === 'apellido';
          });
          const phoneKey = keys.find((k) => {
            const n = normalizeStr(k);
            return n === 'celular' || n === 'telefono' || n === 'tel';
          });
          const emailKey = keys.find((k) => {
            const n = normalizeStr(k);
            return n === 'correo' || n === 'email' || n === 'correo electronico';
          });
          const howFoundKey = keys.find((k) => {
            const n = normalizeStr(k);
            return n.includes('como se enter') || n.includes('entero') || n.includes('medio');
          });

          if (!docKey) continue;
          const doc = cleanDoc(row[docKey]);
          if (!doc || doc.length < 4 || seenInFile.has(doc)) continue;
          seenInFile.add(doc);

          const firstName = nameKey ? String(row[nameKey]).trim() : '';
          const lastName = lastNameKey ? String(row[lastNameKey]).trim() : '';
          const fullName = `${firstName} ${lastName}`.trim() || `Paciente ${doc.slice(-4)}`;
          const phone = phoneKey && row[phoneKey] ? String(row[phoneKey]).trim() : '';
          const email = emailKey && row[emailKey] ? String(row[emailKey]).trim() : '';
          const howFound = howFoundKey && row[howFoundKey] ? String(row[howFoundKey]).trim() : '';

          parsedRows.push({
            doc_id: doc,
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
            phone,
            email,
            how_found: howFound,
          });
        }

        // 3. Preparar registros para patients_directory (conservando códigos existentes sin autogenerar a los nuevos)
        const newPatientsList: ProcessPacientesResult['newPatients'] = [];
        const rowsToUpsert: Array<any> = [];
        let newCount = 0;
        let existingCount = 0;

        for (const p of parsedRows) {
          const existing = existingDocMap.get(p.doc_id);

          if (existing) {
            existingCount++;
          } else {
            newCount++;
            newPatientsList.push({
              doc_id: p.doc_id,
              full_name: p.full_name,
              phone: p.phone,
              referral_code: null,
            });
          }

          rowsToUpsert.push({
            doc_id: p.doc_id,
            first_name: p.first_name,
            last_name: p.last_name,
            full_name: p.full_name,
            phone: p.phone || null,
            email: p.email || null,
            referral_code: existing?.referral_code || null,
            referred_by_code: existing?.referred_by_code || null,
            referred_by_doc: existing?.referred_by_doc || null,
            how_found: p.how_found || null,
            updated_at: new Date().toISOString(),
          });
        }

        // 4. Guardar en lotes de 500 en Supabase
        const batchSize = 500;
        for (let i = 0; i < rowsToUpsert.length; i += batchSize) {
          const batch = rowsToUpsert.slice(i, i + batchSize);
          const { error: upsertErr } = await supabase
            .from('patients_directory')
            .upsert(batch, { onConflict: 'doc_id' });

          if (upsertErr) {
            console.error('Error guardando lote de pacientes:', upsertErr);
            throw new Error(`Error al guardar en Supabase: ${upsertErr.message}`);
          }
        }

        // Los bonos se hacen efectivos únicamente cuando el paciente los redime en Caja.
        resolve({
          totalProcessed: parsedRows.length,
          newPatientsCount: newCount,
          existingUpdatedCount: existingCount,
          newPatients: newPatientsList,
          referralsDetected: [],
        });
      } catch (err: any) {
        console.error('Error procesando archivo de pacientes:', err);
        reject(new Error(err.message || 'Error al procesar el archivo Excel de pacientes'));
      }
    };

    reader.onerror = () => reject(new Error('No se pudo leer el archivo Excel.'));
    reader.readAsBinaryString(file);
  });
}

/**
 * Borra TODOS los registros exclusivos del módulo de Referidos
 * (referral_redemptions, referrals, ambassador_wallets y patients_directory),
 * sin tocar ninguna otra tabla del resto de la aplicación.
 */
export async function deleteAllReferralsData(): Promise<void> {
  const supabase = createClient();

  const { error: redErr } = await supabase
    .from('referral_redemptions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (redErr) {
    throw new Error('Error al borrar historial de bonos redimidos: ' + redErr.message);
  }

  const { error: refErr } = await supabase
    .from('referrals')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (refErr) {
    throw new Error('Error al borrar historial de referidos: ' + refErr.message);
  }

  const { error: walletErr } = await supabase
    .from('ambassador_wallets')
    .delete()
    .neq('doc_id', '__NEVER_MATCH__');

  if (walletErr) {
    throw new Error('Error al borrar billeteras de referidos: ' + walletErr.message);
  }

  const { error: dirErr } = await supabase
    .from('patients_directory')
    .delete()
    .neq('doc_id', '__NEVER_MATCH__');

  if (dirErr) {
    throw new Error('Error al borrar base de datos de pacientes de referidos: ' + dirErr.message);
  }
}



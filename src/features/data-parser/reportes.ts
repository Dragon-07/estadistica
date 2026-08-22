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

          resolve(updatedData);
          return;
        }

        // MODO B: Si no hay tabla previa, generamos las filas desde el reporte de transacciones
        const wsData: any[][] = [GLOBAL_REPORT_COLUMNS];

        for (const row of rawRows) {
          const rowData = new Array(GLOBAL_REPORT_COLUMNS.length).fill('');

          rowData[1] = getValFromRow(row, 'Fecha', 'Fecha Creacion');
          rowData[3] = getValFromRow(row, 'Documento', 'Numero Documento', 'Cedula', 'Identificacion');
          rowData[4] = getValFromRow(row, 'Paciente', 'Cliente', 'Nombre');
          rowData[7] = getValFromRow(row, 'Entidad', 'EPS/Entidad Paciente', 'EPS');
          rowData[17] = getValFromRow(row, 'CUP', 'Codigo (CUP)', 'Codigo CUP', 'Código (CUP)');
          rowData[18] = getValFromRow(row, 'Servicio', 'Concepto', 'Tratamiento');
          rowData[25] = getValFromRow(row,
            'Valor Servicio (Particular o por convenio)',
            'Valor Servicio (Particular o convenio)',
            'Valor Servicio',
            'Valor'
          );
          rowData[26] = getValFromRow(row, 'Facturado a la entidad del Paciente', 'Facturado a la entidad', 'Facturado');

          // Calcular Total final para transacciones
          const totalItemVal = rowData[23] || '';
          const valorServicioVal = rowData[25];
          let totalFinalTrans = internalParseToNumber(totalItemVal);
          if (totalFinalTrans === 0) totalFinalTrans = internalParseToNumber(valorServicioVal);
          rowData[27] = totalFinalTrans;

          wsData.push(rowData);
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
        const patientsDirectoryToSave = new Map<string, any>(); // Guardar para Supabase
        
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
          const nameKey = keys.find(k => {
            const norm = normalizeStr(k);
            return norm === 'cliente' || norm === 'paciente' || norm === 'nombres' || norm === 'nombre';
          });
          const lastNameKey = keys.find(k => {
            const norm = normalizeStr(k);
            return norm === 'apellidos' || norm === 'apellido';
          });
          const phoneKey = keys.find(k => {
            const norm = normalizeStr(k);
            return norm === 'celular' || norm === 'telefono' || norm === 'tel';
          });
          
          if (docKey) {
            const docVal = cleanDocument(row[docKey]);
            const medicoVal = medicoKey ? String(row[medicoKey]).trim() : '';
            const fechaNacVal = fechaNacKey ? String(row[fechaNacKey]).trim() : '';
            const generoVal = generoKey ? String(row[generoKey]).trim() : '';
            
            if (docVal) {
              medicosMap.set(docVal, { medico: medicoVal, fechaNac: fechaNacVal, genero: generoVal });
              
              // Extraer datos para el directorio de pacientes
              if (docVal.length >= 4 && nameKey && row[nameKey]) {
                const firstNameStr = String(row[nameKey]).trim().split(' ')[0];
                const phoneVal = phoneKey && row[phoneKey] ? String(row[phoneKey]).trim() : '';
                let fullName = String(row[nameKey]).trim();
                if (lastNameKey && row[lastNameKey]) {
                   fullName += ' ' + String(row[lastNameKey]).trim();
                }
                
                if (firstNameStr) {
                  const safeFirstName = normalizeStr(firstNameStr).toUpperCase().replace(/[^A-Z]/g, '');
                  const referralCode = `${safeFirstName}${docVal.slice(-4)}`;
                  patientsDirectoryToSave.set(docVal, {
                    doc_id: docVal,
                    full_name: fullName,
                    phone: phoneVal,
                    referral_code: referralCode
                  });
                }
              }
            }
          }
        }
        
        // Ejecutar guardado asíncrono en Supabase sin bloquear el flujo
        if (patientsDirectoryToSave.size > 0) {
          const rowsToUpsert = Array.from(patientsDirectoryToSave.values());
          (async () => {
             const supabase = createClient();
             
             // 1. Guardar pacientes en el directorio
             for(let i=0; i<rowsToUpsert.length; i+=500) {
               const batch = rowsToUpsert.slice(i, i+500);
               await supabase.from('patients_directory').upsert(batch, { onConflict: 'doc_id', ignoreDuplicates: true });
             }

             // 2. Automatización: Marcar referidos potenciales como 'Asistió'
             // Si un paciente del Excel aparece en la tabla de referidos pendientes, se marca automáticamente como completado.
             const allExcelDocs = Array.from(patientsDirectoryToSave.keys());
             if (allExcelDocs.length > 0) {
               // Procesar en lotes de 100 para evitar que la URL de la petición sea demasiado larga (Error 414)
               for(let i=0; i<allExcelDocs.length; i+=100) {
                 const batchDocs = allExcelDocs.slice(i, i+100);
                 const { error: updateError } = await supabase
                   .from('referrals')
                   .update({ status: 'completed' })
                   .in('referred_doc', batchDocs)
                   .eq('status', 'pending');
                 
                 if (updateError) console.error('Error automatizando asistencia de referidos:', updateError);
               }
             }
          })().catch(err => console.error('Error en proceso asíncrono de directorio/referidos:', err));
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

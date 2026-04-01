import * as XLSX from 'xlsx';
import { ParsedExcelRow } from '@/shared/types/medical';

// Mapeo flexible de columnas - el sistema busca estas variantes
const COLUMN_ALIASES: Record<keyof ParsedExcelRow, string[]> = {
  patient_name: ['paciente', 'nombre paciente', 'nombre del paciente', 'patient', 'nombre'],
  patient_doc: ['documento', 'doc', 'cedula', 'cédula', 'identificacion', 'id paciente', 'nro doc'],
  doctor_name: ['medico', 'médico', 'doctor', 'dr', 'profesional', 'nombre medico', 'nombre médico'],
  entity_name: ['entidad', 'eps', 'aseguradora', 'empresa', 'aseguradora', 'entidad pagadora'],
  treatment_name: ['tratamiento', 'procedimiento', 'servicio', 'descripcion', 'descripción', 'concepto'],
  invoice_number: [
    'factura', 'nro factura', 'número factura', 'numero factura', 'numb_fact',
    'num factura', 'no factura', 'id factura', 'facturación', 'facturacion',
    'folio', 'consecutivo', 'remision'
  ],
  treatment_date: ['fecha', 'fecha atencion', 'fecha atención', 'date', 'fecha servicio', 'fecha consulta'],
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function findColumn(headers: string[], aliases: string[]): string | null {
  for (const header of headers) {
    const normalizedHeader = normalize(header);
    for (const alias of aliases) {
      if (normalizedHeader.includes(normalize(alias))) {
        return header;
      }
    }
  }
  return null;
}

export function parseExcelFile(file: File): Promise<ParsedExcelRow[]> {
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

        if (rawRows.length === 0) {
          resolve([]);
          return;
        }

        // Detectar columnas automáticamente
        const headers = Object.keys(rawRows[0]);
        const columnMap: Partial<Record<keyof ParsedExcelRow, string>> = {};

        for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
          const found = findColumn(headers, aliases);
          if (found) {
            columnMap[field as keyof ParsedExcelRow] = found;
          }
        }

        const rows: ParsedExcelRow[] = rawRows
          .map((row) => {
            const mapped: ParsedExcelRow = {
              patient_name: String(row[columnMap.patient_name ?? ''] ?? '').trim(),
              patient_doc: String(row[columnMap.patient_doc ?? ''] ?? '').trim() || undefined,
              doctor_name: String(row[columnMap.doctor_name ?? ''] ?? '').trim() || undefined,
              entity_name: String(row[columnMap.entity_name ?? ''] ?? '').trim(),
              treatment_name: String(row[columnMap.treatment_name ?? ''] ?? '').trim() || undefined,
              invoice_number: String(row[columnMap.invoice_number ?? ''] ?? '').trim() || undefined,
              treatment_date: String(row[columnMap.treatment_date ?? ''] ?? '').trim() || undefined,
            };
            return mapped;
          })
          .filter((row) => row.patient_name && row.entity_name); // Filtrar filas vacías

        resolve(rows);
      } catch (err) {
        reject(new Error('Error al leer el archivo Excel: ' + (err as Error).message));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsBinaryString(file);
  });
}

/**
 * Algoritmo de deduplicación:
 * - Si tiene número de factura: se usa como clave única
 * - Si no tiene: se usa combinación paciente+entidad+tratamiento+fecha
 */
export function deduplicateRecords(rows: ParsedExcelRow[]): {
  unique: ParsedExcelRow[];
  duplicates: ParsedExcelRow[];
} {
  const seen = new Map<string, ParsedExcelRow>();
  const duplicates: ParsedExcelRow[] = [];

  for (const row of rows) {
    let key: string;

    if (row.invoice_number) {
      key = `FACTURA:${row.invoice_number.toUpperCase()}`;
    } else {
      // Clave compuesta cuando no hay número de factura
      key = [
        normalize(row.patient_name),
        normalize(row.entity_name),
        normalize(row.treatment_name ?? ''),
        row.treatment_date ?? '',
      ].join('|');
    }

    if (seen.has(key)) {
      duplicates.push(row);
    } else {
      seen.set(key, row);
    }
  }

  return {
    unique: Array.from(seen.values()),
    duplicates,
  };
}

/** Combina y deduplica múltiples archivos Excel */
export function mergeAndDeduplicate(
  files: { rows: ParsedExcelRow[]; sourceFile: string }[]
): { unique: ParsedExcelRow[]; totalDuplicates: number } {
  const allRows = files.flatMap(({ rows, sourceFile }) =>
    rows.map((r) => ({ ...r, source_file: sourceFile }))
  );

  const { unique, duplicates } = deduplicateRecords(allRows);
  return { unique, totalDuplicates: duplicates.length };
}

import * as XLSX from 'xlsx';

const GLOBAL_REPORT_COLUMNS = [
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

          // Mapeo solicitado en la tercera imagen/texto
          rowData[0] = getVal('Fecha');                           // Fecha Creación
          rowData[2] = getVal('Documento');                       // Número Documento
          rowData[3] = getVal('Paciente');                        // Cliente
          rowData[4] = getVal('Entidad');                         // EPS/Entidad Paciente
          rowData[19] = getVal('CUP');                            // Código (CUP)
          rowData[20] = getVal('Servicio');                       // Concepto
          rowData[27] = getVal('Valor Servicio (Particular o por convenio)');
          rowData[28] = getVal('Facturado a la entidad del Paciente');

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
export function exportToExcel(data: any[][], fileName: string = 'Reporte_Consolidado') {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
  
  const timestamp = new Date().getTime();
  XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`);
}

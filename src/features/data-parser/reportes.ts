import * as XLSX from 'xlsx';

const REPORTE_FACTURACION_ORDER = [
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
  '', // Columna vacía solicitada
  'Código (CUP)',
  'Concepto',
  'Valor', // Duplicado intencional según solicitud
  'Cantidad', // Duplicado intencional
  'IVA', // Duplicado intencional
  'TIPO DE IVA', // Duplicado intencional
  'Total Item', // Duplicado intencional
  'Fecha Anulación'
];

export async function processReporteFacturacion(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a un arreglo de objetos genérico
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          raw: false,
          defval: '',
        });

        if (rawRows.length === 0) {
          throw new Error("El archivo Excel está vacío.");
        }

        const wsData: any[][] = [];
        // Primera fila: Encabezados exactamente como se solicitaron
        wsData.push(REPORTE_FACTURACION_ORDER);

        for (const row of rawRows) {
          const keys = Object.keys(row);
          
          // Buscar dinámicamente la columna "Tipo Cliente" para filtrar
          const tipoClienteKey = keys.find(k => k.trim().toLowerCase() === 'tipo cliente');
          const tipoClienteVal = tipoClienteKey ? String(row[tipoClienteKey]).trim().toLowerCase() : '';

          // Si el Tipo Cliente es "empresa", omitimos esta fila
          if (tipoClienteVal === 'empresa') {
            continue;
          }

          // Construir la nueva fila basada en el orden deseado
          const rowData: any[] = [];
          for (const targetCol of REPORTE_FACTURACION_ORDER) {
            if (targetCol === '') {
              rowData.push(''); // Celda vacía para la columna sin nombre
            } else {
              // Buscar la llave original que coincida (ignorando mayúsculas/minúsculas y espacios al inicio/fin)
              const originalKey = keys.find(k => k.trim().toLowerCase() === targetCol.toLowerCase());
              rowData.push(originalKey ? row[originalKey] : '');
            }
          }
          
          wsData.push(rowData);
        }

        // Crear nuevo libro de trabajo y descargar
        const newWorkbook = XLSX.utils.book_new();
        const newWorksheet = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Reporte Filtrado");
        
        const timestamp = new Date().getTime();
        XLSX.writeFile(newWorkbook, `Reporte_Facturacion_${timestamp}.xlsx`);
        
        resolve(wsData);
      } catch (err) {
        reject(new Error('Error al procesar el archivo: ' + (err as Error).message));
      }
    };
    
    reader.onerror = () => reject(new Error('No se pudo leer el archivo Excel.'));
    reader.readAsBinaryString(file);
  });
}

const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = path.join(__dirname, '..', '1 insumos.xlsx');
const workbook = xlsx.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Obtener todas las filas
const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

// La primera fila (índice 0) son las cabeceras: [ 'DETALLE DEL INSUMO', undefined, 'VALOR UNT' ]
// Las filas de datos empiezan en el índice 1

const insumos = [];
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length === 0 || !row[0]) continue;
  
  const detalle = String(row[0]).trim();
  const medida = row[1] ? String(row[1]).trim() : '';
  const valor = row[2] !== undefined ? Number(row[2]) : 0;
  
  insumos.push({
    id: String(i),
    detalle: detalle,
    medida: medida,
    valor: valor
  });
}

const outputPath = path.join(__dirname, '..', 'src', 'features', 'profitability', 'data', 'insumos-data.json');
fs.writeFileSync(outputPath, JSON.stringify(insumos, null, 2), 'utf-8');

console.log(`¡Éxito! Se procesaron ${insumos.length} insumos y se guardaron en ${outputPath}`);
console.log("Muestra de los primeros 5 insumos guardados:");
console.log(insumos.slice(0, 5));

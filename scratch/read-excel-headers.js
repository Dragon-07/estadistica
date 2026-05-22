const xlsx = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '..', '1 insumos.xlsx');
const workbook = xlsx.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Obtener todas las filas
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
console.log("Fila de cabecera original (Fila 0):", data[0]);
console.log("Fila 1:", data[1]);
console.log("Total de filas leídas:", data.length);

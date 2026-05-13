const xlsx = require('xlsx');
const workbook = xlsx.readFile('E:\\1A\\estadisticas\\insumos.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet);
console.log(JSON.stringify(data, null, 2));

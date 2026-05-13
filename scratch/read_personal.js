const xlsx = require('xlsx');
const workbook = xlsx.readFile('E:\\1A\\estadisticas\\personal.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }); // Read raw headers and rows
console.log(JSON.stringify(data, null, 2));

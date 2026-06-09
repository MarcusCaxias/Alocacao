const xlsx = require('xlsx');
const path = require('path');

const file = path.join(__dirname, '../data/alocacoes.xlsx');
const wb = xlsx.readFile(file);
const ws = wb.Sheets['alocacoes'];
let alocs = xlsx.utils.sheet_to_json(ws);

for (const a of alocs) {
  a.percentual_alocado = 0;
}

const newWs = xlsx.utils.json_to_sheet(alocs);
wb.Sheets['alocacoes'] = newWs;
xlsx.writeFile(wb, file);
console.log('Banco de dados limpo para destravar');

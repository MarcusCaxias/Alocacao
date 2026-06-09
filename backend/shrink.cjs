const xlsx = require('xlsx');
const path = require('path');

const file = path.join(__dirname, '../data/alocacoes.xlsx');
const wb = xlsx.readFile(file);
const ws = wb.Sheets['alocacoes'];
let alocs = xlsx.utils.sheet_to_json(ws);

const seen = new Map();
for (const a of alocs) {
  if (a.percentual_alocado > 0) {
    const key = `${a.projeto_id}-${a.colaborador_id}-${a.ano_mes}`;
    seen.set(key, a); // Sobrescreve mantendo apenas um por cruzamento
  }
}
const finalAlocs = Array.from(seen.values());

const newWs = xlsx.utils.json_to_sheet(finalAlocs);
wb.Sheets['alocacoes'] = newWs;
xlsx.writeFile(wb, file);

console.log(`Deduplicação concluída! De ${alocs.length} para apenas ${finalAlocs.length} registros únicos.`);

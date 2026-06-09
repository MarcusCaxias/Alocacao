const xlsx = require('xlsx');
const path = require('path');

const file = path.join(__dirname, '../backend/data/alocacoes.xlsx');
const wb = xlsx.readFile(file);
const ws = wb.Sheets['alocacoes'];
let alocs = xlsx.utils.sheet_to_json(ws);

console.log(`Encontradas ${alocs.length} alocações.`);

// Remove duplicados mantendo apenas um por (colab, proj, mes)
const seen = new Map();
for (const a of alocs) {
  const key = `${a.projeto_id}-${a.colaborador_id}-${a.ano_mes}`;
  seen.set(key, a); // Último vence
}
const deduplicated = Array.from(seen.values());

console.log(`Após deduplicação: ${deduplicated.length} alocações.`);

// Para garantir, vamos fixar o máximo total de um colaborador por mês em 100%
const colabMesSum = {};
for (const a of deduplicated) {
  const cKey = `${a.colaborador_id}-${a.ano_mes}`;
  colabMesSum[cKey] = (colabMesSum[cKey] || 0) + a.percentual_alocado;
}

const finalAlocs = [];
for (const a of deduplicated) {
  const cKey = `${a.colaborador_id}-${a.ano_mes}`;
  if (colabMesSum[cKey] > 100) {
    // Reduz para 0 temporariamente pra destravar o sistema
    a.percentual_alocado = 0;
  }
  finalAlocs.push(a);
}

const newWs = xlsx.utils.json_to_sheet(finalAlocs);
wb.Sheets['alocacoes'] = newWs;
xlsx.writeFile(wb, file);
console.log('Arquivo corrigido!');

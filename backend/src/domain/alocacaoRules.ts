import { Alocacao, Colaborador, RTBA_PROJECT_ID } from './types';

export function validateAlocacoes(existingAlocacoes: Alocacao[], newAlocacoes: Alocacao[], colaboradores: Colaborador[]): void {
  // Combine existing and new to check the sums.
  // Note: If updating, newAlocacoes should replace existing ones with same ID.
  const map = new Map<string, Alocacao>();
  
  existingAlocacoes.forEach(a => map.set(a.id, a));
  newAlocacoes.forEach(a => map.set(a.id, a));

  const alocacoesPorColaboradorEMes: Record<string, Record<string, number>> = {};

  Array.from(map.values()).forEach(alocacao => {
    // Ignore RTBA if it somehow gets passed here, though it shouldn't.
    if (alocacao.projeto_id === RTBA_PROJECT_ID) return;

    if (!alocacoesPorColaboradorEMes[alocacao.colaborador_id]) {
      alocacoesPorColaboradorEMes[alocacao.colaborador_id] = {};
    }
    const mes = alocacao.ano_mes;
    if (!alocacoesPorColaboradorEMes[alocacao.colaborador_id][mes]) {
      alocacoesPorColaboradorEMes[alocacao.colaborador_id][mes] = 0;
    }
    alocacoesPorColaboradorEMes[alocacao.colaborador_id][mes] += alocacao.percentual_alocado;
  });

  // Check limits
  for (const colabId in alocacoesPorColaboradorEMes) {
    for (const mes in alocacoesPorColaboradorEMes[colabId]) {
      const totalRaw = alocacoesPorColaboradorEMes[colabId][mes];
      const total = Math.round(totalRaw * 100) / 100; // Tratamento de casas decimais
      if (total > 100) {
        const colab = colaboradores.find(c => c.id === colabId);
        const colabName = colab ? colab.nome : colabId;
        throw new Error(`Validação falhou: O colaborador "${colabName}" possui ${total}% de alocação no mês ${mes}, excedendo o limite de 100%.`);
      }
    }
  }
}

export function calculateRTBA(alocacoes: Alocacao[]): number {
  const totalAlocadoReal = alocacoes
    .filter(a => a.projeto_id !== RTBA_PROJECT_ID)
    .reduce((sum, a) => sum + a.percentual_alocado, 0);
  
  const rtba = 100 - totalAlocadoReal;
  return rtba < 0 ? 0 : rtba;
}

const fetch = require('node-fetch');

async function run() {
  try {
    const projs = await fetch('http://localhost:3001/api/projetos').then(r => r.json());
    const colabs = await fetch('http://localhost:3001/api/colaboradores').then(r => r.json());
    
    const pId = projs.find(p => p.nome !== 'RTBA').id;
    const cId = colabs[0].id;
    const mes = '2026-05';

    console.log(`Sending 33.33 to project ${pId}, colab ${cId}, mes ${mes}`);

    const res = await fetch('http://localhost:3001/api/alocacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alocacoes: [{
          projeto_id: pId,
          colaborador_id: cId,
          ano_mes: mes,
          percentual_alocado: 33.33
        }]
      })
    });

    if (!res.ok) {
      console.log('Error saving:', await res.text());
      return;
    }
    console.log('Saved successfully');

    const alocs = await fetch(`http://localhost:3001/api/alocacoes/projeto/${pId}`).then(r => r.json());
    console.log('Returned alocacoes:', alocs.find(a => a.colaborador_id === cId && a.ano_mes === mes));
  } catch (e) {
    console.error(e);
  }
}
run();

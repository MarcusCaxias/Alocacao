import express from 'express';
import cors from 'cors';
import { routes } from './presentation/routes';
import { initDb } from './infrastructure/dbInit';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api', routes);

async function startServer() {
  try {
    await initDb();
    app.listen(Number(port), '0.0.0.0', () => {
      console.log(`Backend rodando na porta ${port}`);
    });
  } catch (err) {
    console.error('Falha ao inicializar o banco de dados e iniciar o servidor:', err);
    process.exit(1);
  }
}

startServer();

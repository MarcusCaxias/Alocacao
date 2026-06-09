import express from 'express';
import cors from 'cors';
import { routes } from './presentation/routes';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api', routes);

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Backend rodando na porta ${port}`);
});

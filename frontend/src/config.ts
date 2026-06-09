// Se estiver rodando em produção (Docker/VPS com proxy no mesmo host),
// usamos o caminho relativo '/api'. Em desenvolvimento, usamos a porta 3001.
export const API_URL = import.meta.env.PROD 
  ? '/api' 
  : `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001/api`;

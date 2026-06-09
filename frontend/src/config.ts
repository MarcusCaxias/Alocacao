// Configuração dinâmica da URL da API com base no host que está servindo o frontend.
// Se o frontend for acessado por outro computador na mesma rede (ex: http://192.168.1.50:5173),
// as chamadas da API serão direcionadas para http://192.168.1.50:3001/api.
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_URL = `http://${hostname}:3001/api`;

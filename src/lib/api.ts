/**
 * src/lib/api.ts
 * ============================================================
 * Cliente de API para substituir o Supabase
 * Centraliza todas as chamadas para a API PHP na HostGator.
 */

const API_URL = 'https://api.financeiro.infornexa.com.br';

async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('inforcontrol_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expirado ou inválido — limpa e redireciona se necessário
    localStorage.removeItem('inforcontrol_token');
    if (!window.location.pathname.includes('/auth')) {
      window.location.href = '/auth';
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }

  return data;
}

export const api = {
  get: (endpoint: string) => request(endpoint, { method: 'GET' }),
  post: (endpoint: string, body: any) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body: any) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint: string) => request(endpoint, { method: 'DELETE' }),
};

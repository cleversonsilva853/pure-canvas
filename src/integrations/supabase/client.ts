/**
 * src/integrations/supabase/client.ts
 * ============================================================
 * SHIM DE COMPATIBILIDADE
 * Este arquivo emula o cliente Supabase para que as páginas legadas
 * continuem funcionando, mas redireciona as chamadas para a API PHP.
 */

import { api } from '@/lib/api';

const mockResponse = (data: any, error: any = null) => ({ data, error, count: 0 });

export const supabase = {
  from: (table: string) => {
    const endpoint = `/${table.replace(/_/g, '-')}`;

    // Helper para lidar com múltiplos filtros
    const buildQuery = (filters: Record<string, any>) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => params.append(k, v));
      return params.toString() ? `?${params.toString()}` : '';
    };

    const createQueryBuilder = (filters: Record<string, any> = {}) => ({
      eq: function(col: string, val: any) {
        return createQueryBuilder({ ...filters, [col]: val });
      },
      order: function() { return this; },
      limit: function() { return this; },
      single: async () => {
        try {
          const id = filters.id;
          const url = id ? `${endpoint}/${id}` : `${endpoint}${buildQuery(filters)}`;
          const data = await api.get(url);
          return mockResponse(Array.isArray(data) ? data[0] : data);
        } catch (e: any) { return mockResponse(null, e); }
      },
      then: async (resolve: any) => {
        try {
          const data = await api.get(`${endpoint}${buildQuery(filters)}`);
          resolve(mockResponse(data));
        } catch (e: any) { resolve(mockResponse(null, e)); }
      }
    });

    return {
      select: (columns: string = '*') => createQueryBuilder(),
      insert: async (values: any) => {
        try {
          // Se for array, envia como está (o backend deve tratar)
          const data = await api.post(endpoint, values);
          return mockResponse(data);
        } catch (e: any) { return mockResponse(null, e); }
      },
      upsert: async (values: any) => {
        try {
          // Emula upsert usando POST (o backend deve decidir se insere ou atualiza)
          const data = await api.post(`${endpoint}/upsert`, values);
          return mockResponse(data);
        } catch (e: any) { return mockResponse(null, e); }
      },
      update: (values: any) => ({
        eq: async (col: string, val: any) => {
          try {
            const data = await api.put(`${endpoint}/${val}`, values);
            return mockResponse(data);
          } catch (e: any) { return mockResponse(null, e); }
        }
      }),
      delete: () => ({
        eq: async (col: string, val: any) => {
          try {
            const data = await api.delete(`${endpoint}/${val}`);
            return mockResponse(data);
          } catch (e: any) { return mockResponse(null, e); }
        }
      })
    };
  },
  auth: {
    getSession: async () => ({ data: { session: { user: { id: 'temp' } } }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async ({ username, email, password }: any) => {
        try {
            const data = await api.post('/auth/login', { 
                username: username || email, 
                password 
            });
            if (data.token) {
                localStorage.setItem('inforcontrol_token', data.token);
                return mockResponse({ user: data.user, session: { access_token: data.token } });
            }
            return mockResponse(null, { message: 'Erro no login' });
        } catch (e: any) {
            return mockResponse(null, e);
        }
    },
    signOut: async () => {
        localStorage.removeItem('inforcontrol_token');
        return { error: null };
    }
  }
};

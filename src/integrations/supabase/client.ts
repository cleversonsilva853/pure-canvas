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
    // Mapeia nomes de tabelas se necessário (ex: 'transactions' -> '/transactions')
    const endpoint = `/${table.replace(/_/g, '-')}`;

    return {
      select: (columns: string = '*') => ({
        eq: function(col: string, val: any) {
          return {
            single: async () => {
              try {
                const data = await api.get(`${endpoint}/${val}`);
                return mockResponse(data);
              } catch (e: any) { return mockResponse(null, e); }
            },
            then: async (resolve: any) => {
              try {
                const data = await api.get(`${endpoint}?${col}=${val}`);
                resolve(mockResponse(data));
              } catch (e: any) { resolve(mockResponse(null, e)); }
            }
          };
        },
        limit: (n: number) => ({
           then: async (resolve: any) => {
             try {
               const data = await api.get(endpoint);
               resolve(mockResponse(data.slice(0, n)));
             } catch (e: any) { resolve(mockResponse(null, e)); }
           }
        }),
        order: (col: string, { ascending = true } = {}) => ({
          then: async (resolve: any) => {
             try {
               const data = await api.get(endpoint);
               resolve(mockResponse(data));
             } catch (e: any) {
               resolve(mockResponse(null, e));
             }
          }
        }),
        then: async (resolve: any) => {
          try {
            const data = await api.get(endpoint);
            resolve(mockResponse(data));
          } catch (e: any) {
            resolve(mockResponse(null, e));
          }
        }
      }),
      insert: async (values: any) => {
        try {
          const data = await api.post(endpoint, values);
          return mockResponse(data);
        } catch (e: any) {
          return mockResponse(null, e);
        }
      },
      update: (values: any) => ({
        eq: async (col: string, val: any) => {
          try {
            const data = await api.put(`${endpoint}/${val}`, values);
            return mockResponse(data);
          } catch (e: any) {
            return mockResponse(null, e);
          }
        }
      }),
      delete: () => ({
        eq: async (col: string, val: any) => {
          try {
            const data = await api.delete(`${endpoint}/${val}`);
            return mockResponse(data);
          } catch (e: any) {
            return mockResponse(null, e);
          }
        }
      })
    };
  },
  auth: {
    getSession: async () => ({ data: { session: { user: { id: 'temp' } } }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async ({ email, password }: any) => {
        try {
            const data = await api.post('/auth/login', { email, password });
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

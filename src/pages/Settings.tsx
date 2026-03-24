import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from '@tanstack/react-query';

const Settings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleResetData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Deletion order to respect foreign keys (if any)
      const tables = [
        'transactions',
        'budgets',
        'goals',
        'accounts',
        'credit_cards',
        'categories'
      ];

      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', user.id);
        
        if (error) {
          console.error(`Error deleting from ${table}:`, error);
          throw new Error(`Erro ao apagar dados de ${table}: ${error.message}`);
        }
      }

      toast.success('Todos os dados foram apagados com sucesso!');
      
      // Invalidate all queries to refresh the UI
      queryClient.invalidateQueries();
      
    } catch (error: any) {
      toast.error(error.message || 'Ocorreu um erro ao apagar os dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8 px-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua conta e preferências do aplicativo.</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-destructive/20 shadow-sm overflow-hidden">
          <CardHeader className="bg-destructive/5 border-b border-destructive/10">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Zona de Perigo</CardTitle>
            </div>
            <CardDescription>
              Ações irreversíveis que afetam permanentemente seus dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
              <div className="space-y-1">
                <p className="font-semibold text-destructive">Apagar todos os registros</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Isso apagará permanentemente suas transações, contas, categorias, metas e orçamentos. Esta ação não pode ser desfeita.
                </p>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2 shrink-0">
                    <Trash2 className="h-4 w-4" />
                    Apagar Tudo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso apagará permanentemente todos os seus dados financeiros do nosso sistema.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleResetData}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Apagando...
                        </>
                      ) : (
                        'Sim, apagar tudo'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;

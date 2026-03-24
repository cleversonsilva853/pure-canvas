import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, RefreshCw, Users } from 'lucide-react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';

const Settings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [coupleEmail, setCoupleEmail] = useState('');
  const [couplePassword, setCouplePassword] = useState('');
  const [creatingCouple, setCreatingCouple] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);

  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ['couple_members'],
    queryFn: async () => {
      const { data, error } = await supabase.from('couple_members').select('*');
      if (error) throw error;
      return data;
    }
  });

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !memberName) return;
    setLoadingMembers(true);
    try {
      let coupleId = members[0]?.couple_id || crypto.randomUUID();
      const { error } = await supabase.from('couple_members').insert({
        couple_id: coupleId,
        user_id: user.id,
        name: memberName
      });
      if (error) throw error;
      toast.success('Membro adicionado!');
      setMemberName('');
      refetchMembers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar membro');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      const { error } = await supabase.from('couple_members').delete().eq('id', id);
      if (error) throw error;
      toast.success('Membro removido');
      refetchMembers();
    } catch (error: any) {
      toast.error('Erro ao remover');
    }
  };

  const handleCreateCoupleAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCouple(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: coupleEmail,
        password: couplePassword,
        options: {
          data: {
            full_name: 'Conta Casal',
            created_by: user?.id
          },
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      toast.success('Conta casal criada! Verifique o email antes de acessar.');
      setCoupleEmail('');
      setCouplePassword('');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta casal');
    } finally {
      setCreatingCouple(false);
    }
  };

  const handleResetData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const tables = ['transactions', 'budgets', 'goals', 'accounts', 'credit_cards', 'categories'];
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq('user_id', user.id);
        if (error) throw new Error(`Erro em ${table}: ${error.message}`);
      }
      toast.success('Dados pessoais apagados!');
      queryClient.invalidateQueries();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao apagar dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8 px-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua conta e preferências.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Acesso e Membros do Casal</CardTitle>
            </div>
            <CardDescription>
              Gerencie a conta compartilhada e os participantes das despesas do casal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <form onSubmit={handleCreateCoupleAccount} className="space-y-4">
                <p className="text-sm font-semibold">Criar Novo Acesso Casal</p>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={coupleEmail} onChange={(e) => setCoupleEmail(e.target.value)} required placeholder="casal@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={couplePassword} onChange={(e) => setCouplePassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" disabled={creatingCouple} className="w-full">
                  {creatingCouple ? 'Criando...' : 'Criar Acesso'}
                </Button>
              </form>

              <div className="space-y-4">
                <p className="text-sm font-semibold">Membros (Para "Quem Pagou?")</p>
                <form onSubmit={handleAddMember} className="flex gap-2">
                  <Input placeholder="Nome" value={memberName} onChange={(e) => setMemberName(e.target.value)} />
                  <Button type="submit" disabled={loadingMembers}>Add</Button>
                </form>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 bg-secondary/20 rounded border text-sm">
                      <span>{m.name}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteMember(m.id)} className="h-6 w-6">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t font-mono text-[10px] text-muted-foreground">
              <p>ESTADO DA CONEXÃO:</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${user?.user_metadata?.created_by ? 'bg-blue-500' : 'bg-green-500'}`} />
                <span>{user?.user_metadata?.created_by ? 'ACESSO CASAL' : 'CONTA PRINCIPAL'} (ID: {user?.id?.slice(0,8)})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Zona de Perigo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-destructive">Apagar registros (Pessoal)</p>
              <p className="text-sm text-muted-foreground">Apaga transações, contas e categorias do perfil Pessoal.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Apagar Dados</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetData} className="bg-destructive hover:bg-destructive/90">Apagar tudo</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;

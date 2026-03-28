import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, RefreshCw, Users, Shield } from 'lucide-react';
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
  const [memberUserId, setMemberUserId] = useState('');
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
      // Use the first member's couple_id if exists, otherwise create new
      const coupleId = members[0]?.couple_id || crypto.randomUUID();
      
      // If memberUserId is provided, use it. Otherwise use current user ID.
      const targetUserId = memberUserId.trim() || user.id;

      const { error } = await supabase.from('couple_members').insert({
        couple_id: coupleId,
        user_id: targetUserId,
        name: memberName
      });
      if (error) throw error;
      toast.success('Membro vinculado!');
      setMemberName('');
      setMemberUserId('');
      refetchMembers();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao vincular membro');
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
    } catch (error: unknown) {
      toast.error('Erro ao remover');
    }
  };

  const handleCreateCoupleAccount = async (e: React.FormEvent) => {
// ... (rest of the handleCreateCoupleAccount logic)
// I'll skip some lines but the replace_file_content tool needs the exact content.

// Wait, I should make sure I don't delete handleCreateCoupleAccount by mistake.
// Let's rewrite the replacement chunk to be more precise.

    e.preventDefault();
    setCreatingCouple(true);
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
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

      // Register business membership in server-controlled table
      if (signUpData?.user?.id) {
        await supabase.from('business_members').insert({
          owner_id: user!.id,
          member_id: signUpData.user.id,
        });
      }

      toast.success('Conta casal criada! Verifique o email antes de acessar.');
      setCoupleEmail('');
      setCouplePassword('');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar conta casal');
    } finally {
      setCreatingCouple(false);
    }
  };

  const handleResetData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const tables = ['transactions', 'budgets', 'goals', 'accounts', 'credit_cards', 'categories'] as const;
      for (const table of tables) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from(table as any)).delete().eq('user_id', user.id);
        if (error) throw new Error(`Erro em ${table}: ${error.message}`);
      }
      toast.success('Dados pessoais apagados!');
      queryClient.invalidateQueries();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao apagar dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie sua conta e preferências do aplicativo.</p>
        </div>
        
        {/* User Badge/ID Section */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm self-start">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Seu ID de Acesso</span>
              <div className="flex items-center gap-1 bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                ONLINE
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-mono text-xs font-semibold select-all">{user?.id}</p>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-primary/10" 
                onClick={() => {
                  navigator.clipboard.writeText(user?.id || '');
                  toast.success('ID copiado!');
                }}
              >
                <PlusIcon className="w-3 h-3 rotate-45" /> {/* Using Plus rotated as a small copy/action icon or just use Lucide Copy if imported */}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Acesso e Membros do Casal</CardTitle>
            </div>
            <CardDescription>
              Gerencie a conta compartilhada e os participantes do casal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              {!user?.user_metadata?.created_by ? (
                <form onSubmit={handleCreateCoupleAccount} className="space-y-4">
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-sm font-semibold mb-3">Criar Novo Acesso Casal</p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Email do Parceiro(a)</Label>
                        <Input type="email" value={coupleEmail} onChange={(e) => setCoupleEmail(e.target.value)} required placeholder="casal@exemplo.com" />
                      </div>
                      <div className="space-y-2">
                        <Label>Senha Temporária</Label>
                        <Input type="password" value={couplePassword} onChange={(e) => setCouplePassword(e.target.value)} required minLength={6} />
                      </div>
                      <Button type="submit" disabled={creatingCouple} className="w-full">
                        {creatingCouple ? 'Criando...' : 'Criar Conta de Acesso'}
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-xl bg-muted border border-border flex flex-col items-center justify-center text-center">
                  <Shield className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-semibold">Acesso Restrito</p>
                  <p className="text-xs text-muted-foreground">Apenas o administrador da conta principal pode criar novos acessos.</p>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-sm font-semibold">Participantes (Para o Dashboard)</p>
                <form onSubmit={handleAddMember} className="space-y-2">
                  <Input 
                    placeholder="Nome do membro" 
                    value={memberName} 
                    onChange={(e) => setMemberName(e.target.value)} 
                    required
                  />
                  <div className="flex gap-2">
                    <Input 
                      placeholder="ID de Acesso do parceiro (Opcional)" 
                      value={memberUserId} 
                      onChange={(e) => setMemberUserId(e.target.value)}
                      className="text-xs font-mono"
                    />
                    <Button type="submit" disabled={loadingMembers} size="icon" className="shrink-0">
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
                <p className="text-[10px] text-muted-foreground px-1">
                  * Deixe o ID vazio para cadastrar a si mesmo.
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {members.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhum membro cadastrado.</p>
                  ) : (
                    members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/50 text-sm group transition-all hover:bg-secondary/50">
                        <span className="font-medium">{m.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteMember(m.id)} className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t font-mono text-[10px] text-muted-foreground flex items-center justify-between">
              <p>TIPO DE CONTA: <span className="font-bold text-primary">{user?.user_metadata?.created_by ? 'ACESSO VINCULADO (PARCEIRO)' : 'CONTA PRINCIPAL (PROPRIETÁRIO)'}</span></p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${user?.user_metadata?.created_by ? 'bg-blue-500' : 'bg-green-500'}`} />
                <span>Status: Sincronizado</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/20 shadow-sm overflow-hidden">
          <CardHeader className="bg-destructive/5 border-b border-destructive/10">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Zona de Perigo</CardTitle>
            </div>
            <CardDescription>
              Ações irreversíveis que afetam permanentemente seus dados financeiros pessoais.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
              <div className="space-y-1">
                <p className="font-semibold text-destructive">Apagar todos os registros</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Isso apagará permanentemente suas transações, contas e categorias do seu perfil. Esta ação não pode ser desfeita.
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

const PlusIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

export default Settings;

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Heart, Copy, Mail, Key, Check } from 'lucide-react';
import { useCouple, useCoupleInvites, usePendingInvitesForUser } from '@/hooks/useCoupleData';
import { motion } from 'framer-motion';

const CoupleInvite = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: couple } = useCouple();
  const { data: myInvites = [] } = useCoupleInvites();
  const { data: pendingForMe = [] } = usePendingInvitesForUser();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateInvite = async (withEmail?: boolean) => {
    if (!user) return;
    setLoading(true);
    try {
      const insertData: any = { inviter_id: user.id };
      if (withEmail && email) insertData.invitee_email = email;

      const { data, error } = await supabase
        .from('couple_invites' as any)
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;

      toast.success('Convite criado!');
      queryClient.invalidateQueries({ queryKey: ['couple_invites'] });
      setEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (invite: any) => {
    if (!user) return;
    setLoading(true);
    try {
      // Create couple
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples' as any)
        .insert({
          user1_id: invite.inviter_id,
          user2_id: user.id,
        })
        .select()
        .single();
      if (coupleError) throw coupleError;

      // Update invite status
      await supabase
        .from('couple_invites' as any)
        .update({ status: 'accepted' } as any)
        .eq('id', invite.id);

      // Create default wallets
      const coupleId = (coupleData as any).id;
      await supabase.from('couple_wallets' as any).insert([
        { couple_id: coupleId, name: 'Carteira Compartilhada', type: 'shared', color: '#EC4899' },
        { couple_id: coupleId, name: 'Minha Carteira', type: 'individual', owner_id: invite.inviter_id, color: '#3B82F6' },
        { couple_id: coupleId, name: 'Minha Carteira', type: 'individual', owner_id: user.id, color: '#8B5CF6' },
      ]);

      toast.success('Vínculo criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['couple'] });
      queryClient.invalidateQueries({ queryKey: ['couple_invites_pending'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aceitar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptByCode = async () => {
    if (!user || !code) return;
    setLoading(true);
    try {
      const { data: invite, error } = await supabase
        .from('couple_invites' as any)
        .select('*')
        .eq('invite_code', code.trim())
        .eq('status', 'pending')
        .maybeSingle();
      if (error) throw error;
      if (!invite) {
        toast.error('Código inválido ou já utilizado');
        return;
      }
      await handleAcceptInvite(invite);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar convite');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (inviteCode: string) => {
    navigator.clipboard.writeText(inviteCode);
    toast.success('Código copiado!');
  };

  if (couple) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">💕 Casal Vinculado</h1>
          <p className="text-muted-foreground">Vocês já estão conectados! Acesse o dashboard do casal pelo menu.</p>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <Heart className="h-12 w-12 text-pink-500 mx-auto mb-4" />
            <p className="text-lg font-semibold">{couple.name}</p>
            <p className="text-sm text-muted-foreground mt-2">Vinculados desde {new Date(couple.created_at).toLocaleDateString('pt-BR')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">💕 Financeiro Casal</h1>
        <p className="text-muted-foreground">Vincule sua conta com seu parceiro(a)</p>
      </div>

      {/* Pending invites for this user */}
      {pendingForMe.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-pink-500/30 bg-pink-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Convite Recebido!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingForMe.map((invite: any) => (
                <div key={invite.id} className="flex items-center justify-between p-3 rounded-xl bg-card border">
                  <p className="text-sm">Alguém quer vincular a conta com você</p>
                  <Button onClick={() => handleAcceptInvite(invite)} disabled={loading} size="sm" className="bg-pink-500 hover:bg-pink-600">
                    <Check className="h-4 w-4 mr-1" /> Aceitar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create invite */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Convidar Parceiro(a)
            </CardTitle>
            <CardDescription>Gere um código ou envie por email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email do parceiro(a) (opcional)</Label>
              <Input
                type="email"
                placeholder="parceiro@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={() => handleCreateInvite(!!email)}
              disabled={loading}
              className="w-full bg-pink-500 hover:bg-pink-600"
            >
              Gerar Convite
            </Button>

            {myInvites.filter((i: any) => i.status === 'pending').length > 0 && (
              <div className="space-y-2 pt-2">
                <Label className="text-xs text-muted-foreground">Convites pendentes:</Label>
                {myInvites.filter((i: any) => i.status === 'pending').map((invite: any) => (
                  <div key={invite.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                    <code className="text-sm font-mono flex-1">{invite.invite_code}</code>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyCode(invite.invite_code)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accept by code */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5" />
              Tenho um Código
            </CardTitle>
            <CardDescription>Insira o código recebido do(a) parceiro(a)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Código de convite</Label>
              <Input
                placeholder="Ex: a1b2c3d4"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAcceptByCode}
              disabled={loading || !code}
              className="w-full"
              variant="outline"
            >
              Vincular Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CoupleInvite;

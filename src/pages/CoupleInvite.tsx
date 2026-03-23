import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Heart, UserPlus, Check, Eye, EyeOff } from 'lucide-react';
import { useCouple, usePartnerProfile } from '@/hooks/useCoupleData';
import { motion } from 'framer-motion';

const CoupleInvite = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: couple, isLoading } = useCouple();

  const partnerId = couple
    ? couple.user1_id === user?.id ? couple.user2_id : couple.user1_id
    : undefined;
  const { data: partnerProfile } = usePartnerProfile(partnerId);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreatePartner = async () => {
    if (!user) return;
    if (!name.trim() || !email.trim() || !password) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-partner', {
        body: { name: name.trim(), email: email.trim().toLowerCase(), password },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success('Parceiro(a) criado(a) com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['couple'] });
      setName('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar parceiro(a)');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  if (couple) {
    const partnerName = partnerProfile?.full_name || 'Parceiro(a)';
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">💕 Casal Vinculado</h1>
          <p className="text-muted-foreground">Vocês já estão conectados!</p>
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-pink-500/30">
            <CardContent className="p-6 text-center space-y-4">
              <Heart className="h-12 w-12 text-pink-500 mx-auto" />
              <div>
                <p className="text-lg font-semibold">{couple.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Vinculados desde {new Date(couple.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-secondary/50">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Parceiro(a): {partnerName}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">💕 Financeiro Casal</h1>
        <p className="text-muted-foreground">Crie uma conta para seu parceiro(a) e vincule automaticamente</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-pink-500" />
              Criar Parceiro(a)
            </CardTitle>
            <CardDescription>
              Preencha os dados abaixo para criar a conta do seu parceiro(a). Após a criação, ele(a) poderá fazer login normalmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partner-name">Nome do parceiro(a)</Label>
              <Input
                id="partner-name"
                placeholder="Ex: Maria Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner-email">Email</Label>
              <Input
                id="partner-email"
                type="email"
                placeholder="parceiro@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner-password">Senha</Label>
              <div className="relative">
                <Input
                  id="partner-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              onClick={handleCreatePartner}
              disabled={loading || !name || !email || !password}
              className="w-full bg-pink-500 hover:bg-pink-600"
            >
              {loading ? 'Criando...' : 'Criar Parceiro(a) e Vincular'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default CoupleInvite;

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCategories } from '@/hooks/useFinanceData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Tag, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Categories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('expense');
  const [color, setColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(false);

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('categories').insert({
        user_id: user.id,
        name,
        type,
        color,
      });
      if (error) throw error;
      toast.success('Categoria criada!');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDialogOpen(false);
      setName('');
      setColor('#3B82F6');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir. A categoria pode estar em uso.');
    else {
      toast.success('Categoria excluída');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  };

  const presetColors = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#6B7280'];

  const CategoryList = ({ items }: { items: typeof categories }) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((cat, i) => (
        <motion.div key={cat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#6B7280' }} />
                <span className="font-medium text-sm">{cat.name}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(cat.id)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">Organize suas receitas e despesas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Nova categoria</span></Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={type === 'expense' ? 'default' : 'outline'}
                  onClick={() => setType('expense')}
                  className={type === 'expense' ? 'bg-destructive hover:bg-destructive/90' : ''}
                >
                  Despesa
                </Button>
                <Button
                  type="button"
                  variant={type === 'income' ? 'default' : 'outline'}
                  onClick={() => setType('income')}
                  className={type === 'income' ? 'bg-accent hover:bg-accent/90 text-accent-foreground' : ''}
                >
                  Receita
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Ex: Alimentação" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2 flex-wrap">
                  {presetColors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Criar categoria'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : (
        <Tabs defaultValue="expense">
          <TabsList className="mb-4">
            <TabsTrigger value="expense" className="gap-2">
              <TrendingDown className="h-4 w-4" />
              Despesas ({expenseCategories.length})
            </TabsTrigger>
            <TabsTrigger value="income" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Receitas ({incomeCategories.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="expense">
            {expenseCategories.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma categoria de despesa.</p>
            ) : (
              <CategoryList items={expenseCategories} />
            )}
          </TabsContent>
          <TabsContent value="income">
            {incomeCategories.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma categoria de receita.</p>
            ) : (
              <CategoryList items={incomeCategories} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Categories;

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFoodPricing, useCreateFoodPricing, useDeleteFoodPricing } from '@/hooks/useBusinessData';
import { Plus, Trash2, Calculator, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const FoodPricing = () => {
  const { data: items = [], isLoading } = useFoodPricing();
  const createItem = useCreateFoodPricing();
  const deleteItem = useDeleteFoodPricing();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'simple' | 'combo'>('simple');
  const [form, setForm] = useState({ name: '', total_quantity: '1000', unit: 'g', total_cost: '', portion_quantity: '100', sale_price: '' });
  const [selectedIngredients, setSelectedIngredients] = useState<{ id: string, quantity: string }[]>([]);

  // Calculation for Combo Cost
  const calculatedComboCost = useMemo(() => {
    if (mode === 'simple') return 0;
    return selectedIngredients.reduce((acc, ing) => {
      const item = items.find(i => i.id === ing.id);
      if (!item) return acc;
      const unitCost = Number(item.total_cost) / Number(item.total_quantity);
      return acc + (unitCost * Number(ing.quantity || 0));
    }, 0);
  }, [mode, selectedIngredients, items]);

  const currentTotalCost = mode === 'combo' ? calculatedComboCost : Number(form.total_cost || 0);
  const costPerUnit = currentTotalCost / Number(form.total_quantity || 1);
  const portionCost = costPerUnit * Number(form.portion_quantity || 0);
  const currentSalePrice = Number(form.sale_price || 0);
  const profitPerUnit = currentSalePrice - portionCost;
  const currentMargin = currentSalePrice > 0 ? (profitPerUnit / currentSalePrice) * 100 : 0;

  const calcItem = (item: any) => {
    const cpu = Number(item.total_cost) / Number(item.total_quantity);
    const pc = cpu * Number(item.portion_quantity);
    const md = Number(item.profit_percentage) / 100;
    const sp = md < 1 ? pc / (1 - md) : pc * (1 + md);
    const ppu = sp - pc;
    return { costPerUnit: cpu, portionCost: pc, salePrice: sp, profitPerUnit: ppu };
  };

  const addIngredient = () => {
    setSelectedIngredients([...selectedIngredients, { id: '', quantity: '' }]);
  };

  const removeIngredient = (index: number) => {
    setSelectedIngredients(selectedIngredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: 'id' | 'quantity', value: string) => {
    const newIngs = [...selectedIngredients];
    newIngs[index][field] = value;
    setSelectedIngredients(newIngs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const margin = currentSalePrice > 0 ? (profitPerUnit / currentSalePrice) * 100 : 0;
    
    // For combos, the "name" can include a visual indicator
    const finalName = mode === 'combo' ? `🛒 ${form.name}` : form.name;

    await createItem.mutateAsync({
      name: finalName,
      total_quantity: Number(form.total_quantity),
      unit: mode === 'combo' ? 'un' : form.unit,
      total_cost: currentTotalCost,
      portion_quantity: mode === 'combo' ? Number(form.portion_quantity) : Number(form.total_quantity),
      profit_percentage: mode === 'combo' ? margin : 0,
    });
    
    setForm({ name: '', total_quantity: '1000', unit: 'g', total_cost: '', portion_quantity: '100', sale_price: '' });
    setSelectedIngredients([]);
    setMode('simple');
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Precificação Food</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Item</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Precificação de Produto</DialogTitle></DialogHeader>
            
            <div className="flex gap-2 p-1 bg-muted rounded-lg mb-4">
              <Button 
                type="button" 
                variant={mode === 'simple' ? 'default' : 'ghost'} 
                className="flex-1 h-8 text-xs" 
                onClick={() => setMode('simple')}
              >Item Simples</Button>
              <Button 
                type="button" 
                variant={mode === 'combo' ? 'default' : 'ghost'} 
                className="flex-1 h-8 text-xs" 
                onClick={() => setMode('combo')}
              >Combo / Ficha Técnica</Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>{mode === 'combo' ? 'Nome do Combo' : 'Nome do Produto'}</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              
              {mode === 'combo' && (
                <div className="space-y-3 p-3 border rounded-xl bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-secondary-foreground font-semibold">Composição do Combo</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="h-7 text-[10px]"><Plus className="h-3 w-3 mr-1" />Add Insumo</Button>
                  </div>
                  {selectedIngredients.map((ing, idx) => {
                    const selectedItem = items.find(i => i.id === ing.id);
                    return (
                      <div key={idx} className="grid grid-cols-7 gap-2 items-end">
                        <div className="col-span-4">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full h-8 text-xs justify-between px-2 font-normal",
                                  !ing.id && "text-muted-foreground"
                                )}
                              >
                                {ing.id ? selectedItem?.name : "Selecionar insumo..."}
                                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                              <Command>
                                <CommandInput placeholder="Pesquisar insumo..." className="h-8 text-xs" />
                                <CommandList>
                                  <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                                  <CommandGroup>
                                    {items.map((p) => (
                                      <CommandItem
                                        key={p.id}
                                        value={p.name}
                                        onSelect={() => updateIngredient(idx, 'id', p.id)}
                                        className="text-xs"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-3 w-3",
                                            ing.id === p.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {p.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="col-span-2">
                          <Input 
                            placeholder="Qtd" 
                            className="h-8 text-xs" 
                            value={ing.quantity} 
                            onChange={e => updateIngredient(idx, 'quantity', e.target.value)} 
                          />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => removeIngredient(idx)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    );
                  })}
                  {selectedIngredients.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">Nenhum insumo adicionado.</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Quantidade Total</Label><Input required type="number" step="0.01" min="0" value={form.total_quantity} onChange={e => setForm(f => ({ ...f, total_quantity: e.target.value }))} /></div>
                <div><Label>Unidade</Label>
                  <Select value={form.unit} disabled={mode === 'combo'} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="un">Unidade (un)</SelectItem>
                      <SelectItem value="kg">Quilos (kg)</SelectItem>
                      <SelectItem value="g">Gramas (g)</SelectItem>
                      <SelectItem value="L">Litros (L)</SelectItem>
                      <SelectItem value="ml">Mililitros (ml)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Custo Total (R$)</Label><Input required type="number" step="0.01" min="0" value={mode === 'combo' ? calculatedComboCost.toFixed(2) : form.total_cost} readOnly={mode === 'combo'} onChange={e => setForm(f => ({ ...f, total_cost: e.target.value }))} className={mode === 'combo' ? 'bg-muted opacity-80' : ''} /></div>
              
              {mode === 'combo' && (
                <>
                  <div><Label>Quantidade por Porção (un)</Label><Input required type="number" step="0.01" min="0" value={form.portion_quantity} onChange={e => setForm(f => ({ ...f, portion_quantity: e.target.value }))} /></div>
                  <div>
                    <Label>Preço de Venda Desejado (R$)</Label>
                    <Input required type="number" step="0.01" min="0" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} />
                    <p className="text-[10px] text-muted-foreground mt-1 px-1">
                      Margem de lucro de <strong>{currentMargin.toFixed(1)}%</strong> sobre o valor de venda.
                    </p>
                  </div>

                  {Number(currentTotalCost) > 0 && (
                    <div className="p-4 rounded-xl bg-secondary space-y-2">
                      <div className="flex items-center gap-2 mb-2"><Calculator className="h-4 w-4 text-primary" /><span className="font-semibold text-sm">Resumo da Precificação</span></div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">Custo da porção:</span><span className="font-medium">{fmt(portionCost)}</span>
                        <span className="text-muted-foreground">Lucro p/ porção:</span><span className="font-medium text-emerald-600">{fmt(profitPerUnit)}</span>
                        <span className="text-muted-foreground">Margem Final:</span><span className="font-bold text-primary">{currentMargin.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Button type="submit" className="w-full" disabled={createItem.isPending}>
                <Calculator className="h-4 w-4 mr-2" />Calcular e Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Itens Cadastrados</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : items.length === 0 ? <p className="text-muted-foreground text-sm">Nenhum item cadastrado.</p> : (
            <div className="space-y-3">
              {items.map(item => {
                const c = calcItem(item);
                return (
                  <div key={item.id} className="p-4 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.total_quantity}{item.unit} • Custo: {fmt(Number(item.total_cost))} • Porção: {item.portion_quantity}{item.unit}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center"><p className="text-muted-foreground text-xs">Preço Venda</p><p className="font-bold text-primary">{fmt(c.salePrice)}</p></div>
                      <div className="text-center"><p className="text-muted-foreground text-xs">Lucro/Un.</p><p className="font-semibold text-emerald-600">{fmt(c.profitPerUnit)}</p></div>
                      <div className="text-center"><p className="text-muted-foreground text-xs">Margem</p><p className="font-semibold">{Number(item.profit_percentage)}%</p></div>
                      <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FoodPricing;

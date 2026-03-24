import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  Scale, 
  Utensils, 
  DollarSign, 
  TrendingUp, 
  Info,
  Package,
  ArrowRight,
  Pencil,
  X
} from 'lucide-react';
import { 
  useBusinessIngredients, 
  useCreateBusinessIngredient, 
  useUpdateBusinessIngredient,
  useDeleteBusinessIngredient,
  useBusinessProducts,
  useBusinessProductCompositions,
  useUpdateProductComposition
} from '@/hooks/useBusinessData';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const BusinessPricing = () => {
  const [activeTab, setActiveTab] = useState('ingredients');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  // Data
  const { data: ingredients = [], isLoading: loadingIng } = useBusinessIngredients();
  const { data: products = [], isLoading: loadingProd } = useBusinessProducts();
  const { data: compositions = [], isLoading: loadingComp } = useBusinessProductCompositions(selectedProductId || undefined);
  
  // Mutations
  const createIngredient = useCreateBusinessIngredient();
  const updateIngredient = useUpdateBusinessIngredient();
  const deleteIngredient = useDeleteBusinessIngredient();
  const updateComposition = useUpdateProductComposition();

  // Ingredient State
  const [editingIngId, setEditingIngId] = useState<string | null>(null);
  const [newIng, setNewIng] = useState({ name: '', unit: 'KG', purchase_price: '', purchase_quantity: '' });
  
  // New Composition Entry
  const [newComp, setNewComp] = useState({ ingredient_id: '', quantity: '' });

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: newIng.name,
      unit: newIng.unit,
      purchase_price: Number(newIng.purchase_price),
      purchase_quantity: Number(newIng.purchase_quantity)
    };

    if (editingIngId) {
      updateIngredient.mutate({ id: editingIngId, ...data }, {
        onSuccess: () => {
          setEditingIngId(null);
          setNewIng({ name: '', unit: 'KG', purchase_price: '', purchase_quantity: '' });
        }
      });
    } else {
      createIngredient.mutate(data, {
        onSuccess: () => setNewIng({ name: '', unit: 'KG', purchase_price: '', purchase_quantity: '' })
      });
    }
  };

  const handleEditIngredient = (ing: any) => {
    setEditingIngId(ing.id);
    setNewIng({
      name: ing.name,
      unit: ing.unit,
      purchase_price: String(ing.purchase_price),
      purchase_quantity: String(ing.purchase_quantity)
    });
  };

  const handleCancelEdit = () => {
    setEditingIngId(null);
    setNewIng({ name: '', unit: 'KG', purchase_price: '', purchase_quantity: '' });
  };

  const handleAddComposition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    
    const updatedComps = [
      ...compositions.map(c => ({ ingredient_id: c.ingredient_id, quantity: Number(c.quantity) })),
      { ingredient_id: newComp.ingredient_id, quantity: Number(newComp.quantity) }
    ];
    
    updateComposition.mutate({
      productId: selectedProductId,
      compositions: updatedComps
    });
    setNewComp({ ingredient_id: '', quantity: '' });
  };

  const handleRemoveComposition = (ingId: string) => {
    if (!selectedProductId) return;
    const updatedComps = compositions
      .filter(c => c.ingredient_id !== ingId)
      .map(c => ({ ingredient_id: c.ingredient_id, quantity: Number(c.quantity) }));
    
    updateComposition.mutate({ productId: selectedProductId, compositions: updatedComps });
  };

  // Calculations
  const selectedProduct = useMemo(() => 
    products.find(p => p.id === selectedProductId), 
  [products, selectedProductId]);

  const totalCost = useMemo(() => {
    return compositions.reduce((acc, c) => {
      const ing = ingredients.find(i => i.id === c.ingredient_id);
      if (!ing) return acc;
      
      const costPerUnit = Number(ing.purchase_price) / (Number(ing.purchase_quantity) * (ing.unit === 'KG' ? 1000 : 1));
      return acc + (costPerUnit * Number(c.quantity));
    }, 0);
  }, [compositions, ingredients]);

  const profitValue = useMemo(() => {
    if (!selectedProduct) return 0;
    return Number(selectedProduct.sale_price) - totalCost;
  }, [selectedProduct, totalCost]);

  const profitMargin = useMemo(() => {
    if (!selectedProduct || selectedProduct.sale_price <= 0) return 0;
    return (profitValue / Number(selectedProduct.sale_price)) * 100;
  }, [selectedProduct, profitValue]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Precificação e Ficha Técnica
        </h1>
        <p className="text-muted-foreground italic">
          Domine seus custos e maximize seus lucros com cálculos automáticos.
        </p>
      </div>

      <Tabs defaultValue="ingredients" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-2xl">
          <TabsTrigger value="ingredients" className="rounded-xl gap-2 h-10">
            <Package className="h-4 w-4" /> Insumos (KG/UN)
          </TabsTrigger>
          <TabsTrigger value="pricing" className="rounded-xl gap-2 h-10">
            <TrendingUp className="h-4 w-4" /> Ficha Técnica
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          {activeTab === 'ingredients' && (
            <TabsContent value="ingredients" forceMount>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid lg:grid-cols-3 gap-6 mt-6"
              >
                {/* Add/Edit Ingredient Form */}
                <Card className="lg:col-span-1 shadow-lg border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-lg">{editingIngId ? 'Editar Insumo' : 'Cadastrar Insumo'}</CardTitle>
                    <CardDescription>
                      {editingIngId ? 'Ajuste os valores do insumo selecionado.' : 'Cadastre o preço de compra em atacado.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddIngredient} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nome do Insumo</Label>
                        <Input 
                          placeholder="Ex: Arroz Branco" 
                          value={newIng.name} 
                          onChange={e => setNewIng({...newIng, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Preço Pago (Comprou)</Label>
                          <Input 
                            type="number" step="0.01" 
                            placeholder="R$ 30,00"
                            value={newIng.purchase_price}
                            onChange={e => setNewIng({...newIng, purchase_price: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Quantidade (Fardo/Kg)</Label>
                          <Input 
                            type="number" step="0.01" 
                            placeholder="5"
                            value={newIng.purchase_quantity}
                            onChange={e => setNewIng({...newIng, purchase_quantity: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Unidade de Medida</Label>
                        <Select 
                          value={newIng.unit} 
                          onValueChange={v => setNewIng({...newIng, unit: v})}
                        >
                          <SelectTrigger className="bg-secondary/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="KG">Kilogramas (KG)</SelectItem>
                            <SelectItem value="UN">Unidades (UN)</SelectItem>
                            <SelectItem value="L">Litros (L)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        {editingIngId && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="flex-1 rounded-xl"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4 mr-2" /> Cancelar
                          </Button>
                        )}
                        <Button 
                          className="flex-[2] gap-2 rounded-xl" 
                          disabled={createIngredient.isPending || updateIngredient.isPending}
                        >
                          {editingIngId ? <TrendingUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          {editingIngId ? 'Atualizar Insumo' : 'Cadastrar Insumo'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* List of Ingredients */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {ingredients.length === 0 ? (
                      <div className="col-span-2 h-40 flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-2xl opacity-50">
                        <Info className="h-8 w-8 mb-2" />
                        <p className="text-sm">Nenhum insumo cadastrado ainda.</p>
                      </div>
                    ) : (
                      ingredients.map((ing) => {
                        const costPerGram = Number(ing.purchase_price) / (Number(ing.purchase_quantity) * (ing.unit === 'KG' ? 1000 : 1));
                        return (
                          <motion.div key={ing.id} layout>
                            <Card className="hover:shadow-md transition-shadow overflow-hidden group">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <h3 className="font-bold flex items-center gap-2">
                                      <Scale className="h-4 w-4 text-primary" />
                                      {ing.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                      Comprado: {ing.purchase_quantity}{ing.unit} por {formatCurrency(Number(ing.purchase_price))}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                      variant="ghost" size="icon" 
                                      className="text-primary h-8 w-8"
                                      onClick={() => handleEditIngredient(ing)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" size="icon" 
                                      className="text-destructive h-8 w-8"
                                      onClick={() => deleteIngredient.mutate(ing.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="mt-4 pt-4 border-t flex justify-between items-end">
                                  <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Custo p/ {ing.unit === 'KG' ? 'grama' : 'un'}</p>
                                    <p className="text-lg font-bold text-primary">{formatCurrency(costPerGram)}</p>
                                  </div>
                                  <div className="bg-primary/5 px-2 py-1 rounded-lg text-[10px] font-bold text-primary">
                                    {ing.unit}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          )}

          {activeTab === 'pricing' && (
            <TabsContent value="pricing" forceMount>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid lg:grid-cols-5 gap-6 mt-6"
              >
                {/* Product Selection List */}
                <Card className="lg:col-span-2 overflow-hidden border-primary/5 bg-secondary/20 h-fit">
                  <CardHeader className="p-4 bg-muted/30">
                    <CardTitle className="text-sm">Selecione o Produto (Venda)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/40">
                      {products.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedProductId(p.id)}
                          className={cn(
                            "w-full p-4 flex items-center justify-between text-left transition-colors",
                            selectedProductId === p.id ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-muted/50"
                          )}
                        >
                          <div className="space-y-1">
                            <p className="font-semibold text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground">Preço: {formatCurrency(Number(p.sale_price))}</p>
                          </div>
                          <ChevronRight className={cn("h-4 w-4 transition-transform", selectedProductId === p.id && "rotate-90")} />
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing Editor */}
                <div className="lg:col-span-3 space-y-6">
                  {selectedProductId ? (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedProductId}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                      >
                        {/* Summary Card */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="p-4 rounded-3xl bg-primary text-primary-foreground shadow-lg h-24 flex flex-col justify-between">
                            <p className="text-[10px] font-bold uppercase opacity-80">Custo Total</p>
                            <p className="text-xl font-bold truncate">{formatCurrency(totalCost)}</p>
                          </div>
                          <div className="p-4 rounded-3xl bg-secondary shadow-lg h-24 border border-border flex flex-col justify-between">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Preço Venda</p>
                            <p className="text-xl font-bold truncate">{formatCurrency(Number(selectedProduct?.sale_price || 0))}</p>
                          </div>
                          <div className={cn(
                            "p-4 rounded-3xl shadow-lg h-24 border border-border flex flex-col justify-between",
                            profitValue > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          )}>
                            <p className="text-[10px] font-bold uppercase opacity-80">Lucro (R$)</p>
                            <p className="text-xl font-bold truncate">{formatCurrency(profitValue)}</p>
                          </div>
                          <div className={cn(
                            "p-4 rounded-3xl shadow-lg h-24 flex flex-col justify-between text-white",
                            profitMargin > 30 ? "bg-green-500" : profitMargin > 0 ? "bg-orange-500" : "bg-red-500"
                          )}>
                            <p className="text-[10px] font-bold uppercase opacity-80">Margem (%)</p>
                            <p className="text-xl font-bold truncate">{profitMargin.toFixed(1)}%</p>
                          </div>
                        </div>

                        {/* Ingredients Table */}
                        <Card className="rounded-3xl shadow-sm border-primary/5">
                          <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Utensils className="h-5 w-5 text-primary" />
                              Composição dos Insumos
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-3">
                              {compositions.map(c => {
                                const ing = ingredients.find(i => i.id === c.ingredient_id);
                                if (!ing) return null;
                                const costPerUnit = Number(ing.purchase_price) / (Number(ing.purchase_quantity) * (ing.unit === 'KG' ? 1000 : 1));
                                const itemCost = costPerUnit * Number(c.quantity);

                                return (
                                  <div key={c.id} className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 group hover:bg-secondary/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                        {ing.name[0]}
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold">{ing.name}</p>
                                        <p className="text-xs text-muted-foreground">{c.quantity}{ing.unit === 'KG' ? 'g' : ing.unit} • {formatCurrency(itemCost)}</p>
                                      </div>
                                    </div>
                                    <Button 
                                      variant="ghost" size="icon" 
                                      className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => handleRemoveComposition(c.ingredient_id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}

                              {compositions.length === 0 && (
                                <div className="text-center p-8 border-2 border-dashed rounded-3xl opacity-50">
                                  <p className="text-sm">Nenhum ingrediente adicionado à ficha técnica.</p>
                                </div>
                              )}
                            </div>

                            {/* Add to Composition Form */}
                            <form onSubmit={handleAddComposition} className="pt-4 border-t grid grid-cols-12 gap-2">
                              <div className="col-span-7">
                                <Select 
                                  value={newComp.ingredient_id} 
                                  onValueChange={v => setNewComp({...newComp, ingredient_id: v})}
                                >
                                  <SelectTrigger className="rounded-xl bg-muted/40 h-10">
                                    <SelectValue placeholder="Selecione Insumo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ingredients.map(ing => (
                                      <SelectItem key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-3">
                                <Input 
                                  type="number" 
                                  placeholder="Qtde" 
                                  value={newComp.quantity}
                                  onChange={e => setNewComp({...newComp, quantity: e.target.value})}
                                  className="rounded-xl h-10 text-center"
                                />
                              </div>
                              <div className="col-span-2">
                                <Button size="icon" className="w-full h-10 rounded-xl" disabled={!newComp.ingredient_id || !newComp.quantity}>
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </form>
                          </CardContent>
                        </Card>

                        {/* Margin Strategy Alert */}
                        <motion.div
                          animate={profitMargin < 20 ? { scale: [1, 1.02, 1] } : {}}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          <Card className={cn(
                            "rounded-3xl border-none shadow-md",
                            profitMargin < 20 ? "bg-red-50 text-red-900" : "bg-blue-50 text-blue-900"
                          )}>
                            <CardContent className="p-4 flex gap-3">
                              <Info className="h-5 w-5 shrink-0" />
                              <div className="text-xs font-medium">
                                {profitMargin < 20 
                                  ? "Alerta: Sua margem está muito baixa. Considere reduzir a quantidade dos insumos ou aumentar o preço de venda para pelo menos " + formatCurrency(totalCost * 2)
                                  : "Ficha Técnica Saudável! Sua margem bruta está acima de 20%. Isso garante uma boa operação no dia a dia."}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40 py-20">
                      <Utensils className="h-12 w-12 mb-4" />
                      <p className="text-lg font-medium">Escolha um produto para precificar</p>
                      <p className="text-sm">A sua ficha técnica aparecerá aqui.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </TabsContent>
          )}
        </AnimatePresence>
      </Tabs>
    </div>
  );
};

export default BusinessPricing;

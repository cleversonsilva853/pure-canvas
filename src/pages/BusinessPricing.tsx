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
  X,
  Calculator,
  History,
  Tag,
  Percent,
  Layers
} from 'lucide-react';
import { 
  useBusinessProducts,
  useUpdateBusinessProduct,
  useBusinessProductAdditions,
  useCreateBusinessProductAddition,
  useDeleteBusinessProductAddition,
  useBusinessProductSaleUnits,
  useCreateBusinessProductSaleUnit,
  useDeleteBusinessProductSaleUnit,
  useBusinessProductPurchases,
  useCreateBusinessProductPurchase,
  useDeleteBusinessProductPurchase
} from '@/hooks/useBusinessData';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatDate } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const BusinessPricing = () => {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  // Data
  const { data: products = [], isLoading: loadingProd } = useBusinessProducts();
  const { data: additions = [] } = useBusinessProductAdditions(selectedProductId || undefined);
  const { data: saleUnits = [] } = useBusinessProductSaleUnits(selectedProductId || undefined);
  const { data: purchases = [] } = useBusinessProductPurchases(selectedProductId || undefined);
  
  // Mutations
  const updateProduct = useUpdateBusinessProduct();
  const createAddition = useCreateBusinessProductAddition();
  const deleteAddition = useDeleteBusinessProductAddition();
  const createSaleUnit = useCreateBusinessProductSaleUnit();
  const deleteSaleUnit = useDeleteBusinessProductSaleUnit();
  const createPurchase = useCreateBusinessProductPurchase();
  const deletePurchase = useDeleteBusinessProductPurchase();

  // Selected Product Reference
  const selectedProduct = useMemo(() => 
    products.find(p => p.id === selectedProductId), 
  [products, selectedProductId]);

  // Local state for product pricing factors
  const [pricingFactors, setPricingFactors] = useState({
    base_unit: 'un',
    fixed_cost: 0,
    loss_percentage: 0,
    tax_percentage: 0,
    margin_percentage: 0
  });

  // Load product factors when selected
  useMemo(() => {
    if (selectedProduct) {
      setPricingFactors({
        base_unit: selectedProduct.base_unit || 'un',
        fixed_cost: Number(selectedProduct.fixed_cost || 0),
        loss_percentage: Number(selectedProduct.loss_percentage || 0),
        tax_percentage: Number(selectedProduct.tax_percentage || 0),
        margin_percentage: Number(selectedProduct.margin_percentage || 0)
      });
    }
  }, [selectedProduct]);

  // Addition Form State
  const [newAddition, setNewAddition] = useState({ name: '', type: 'fixed', value: '' });
  const [newSaleUnit, setNewSaleUnit] = useState({ name: '', factor: '' });
  const [newPurchase, setNewPurchase] = useState({ quantity: '', unit: 'un', total_value: '', date: new Date().toISOString().split('T')[0] });

  // Calculation Logic
  const calculatedPricing = useMemo(() => {
    if (!selectedProduct) return null;

    // 1. Base Cost (from last purchase or cost_price)
    let baseCost = Number(selectedProduct.cost_price || 0);
    if (purchases.length > 0) {
      const lastPurchase = purchases[0];
      baseCost = Number(lastPurchase.total_value) / Number(lastPurchase.quantity);
    }

    // 2. Application of Losses
    const costWithLoss = baseCost * (1 + pricingFactors.loss_percentage / 100);

    // 3. Soma de Custo Fixo
    const costWithFixed = costWithLoss + pricingFactors.fixed_cost;

    // 4. Application of Additions
    let finalCost = costWithFixed;
    const additionsList = additions.map(add => {
      let val = 0;
      if (add.type === 'fixed') {
        val = Number(add.value);
      } else {
        val = finalCost * (Number(add.value) / 100);
      }
      return { ...add, calculatedValue: val };
    });

    const totalAdditions = additionsList.reduce((acc, a) => acc + a.calculatedValue, 0);
    finalCost += totalAdditions;

    // 5. Application of Tax
    const costWithTax = finalCost * (1 + pricingFactors.tax_percentage / 100);

    // 6. Application of Margin
    const finalPrice = costWithTax * (1 + pricingFactors.margin_percentage / 100);

    return {
      baseCost,
      costWithLoss,
      costWithFixed,
      additionsList,
      totalAdditions,
      costWithTax,
      finalPrice
    };
  }, [selectedProduct, purchases, additions, pricingFactors]);

  const handleUpdatePricing = () => {
    if (!selectedProductId || !calculatedPricing) return;

    updateProduct.mutate({
      id: selectedProductId,
      ...pricingFactors,
      cost_price: calculatedPricing.baseCost,
      sale_price: calculatedPricing.finalPrice
    }, {
      onSuccess: () => toast.success('Precificação atualizada com sucesso!')
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Precificação Estratégica Avançada
        </h1>
        <p className="text-muted-foreground italic">
          Gestão de custos dinâmicos, perdas e múltiplas unidades de venda.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Product Selection List */}
        <Card className="lg:col-span-1 overflow-hidden border-primary/5 bg-secondary/20 h-fit">
          <CardHeader className="p-4 bg-muted/30">
            <CardTitle className="text-sm">Produtos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40 max-h-[600px] overflow-y-auto">
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
                    <p className="font-semibold text-xs truncate w-32">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{p.base_unit || 'un'}</p>
                  </div>
                  <ChevronRight className={cn("h-3 w-3 transition-transform", selectedProductId === p.id && "rotate-90")} />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pricing Editor */}
        <div className="lg:col-span-4 space-y-6">
          {selectedProductId ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedProductId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Header Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-3xl bg-secondary shadow-lg h-24 flex flex-col justify-between border border-border">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Custo Base</p>
                    <p className="text-xl font-bold truncate">{formatCurrency(calculatedPricing?.baseCost || 0)}</p>
                  </div>
                  <div className="p-4 rounded-3xl bg-primary text-primary-foreground shadow-lg h-24 flex flex-col justify-between">
                    <p className="text-[10px] font-bold uppercase opacity-80">Preço Final</p>
                    <p className="text-xl font-bold truncate">{formatCurrency(calculatedPricing?.finalPrice || 0)}</p>
                  </div>
                  <div className="p-4 rounded-3xl bg-emerald-50 text-emerald-700 shadow-lg h-24 border border-emerald-100 flex flex-col justify-between">
                    <p className="text-[10px] font-bold uppercase opacity-80">Margem Real</p>
                    <p className="text-xl font-bold truncate">
                      {(((calculatedPricing?.finalPrice || 0) - (calculatedPricing?.baseCost || 0)) / (calculatedPricing?.finalPrice || 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 rounded-3xl bg-blue-50 text-blue-700 shadow-lg h-24 border border-blue-100 flex flex-col justify-between">
                    <p className="text-[10px] font-bold uppercase opacity-80">Custos Extras</p>
                    <p className="text-xl font-bold truncate">{formatCurrency(calculatedPricing?.totalAdditions || 0)}</p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Left Column: Factors and Additions */}
                  <div className="space-y-6">
                    {/* Factors Card */}
                    <Card className="rounded-3xl shadow-sm border-primary/5">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Percent className="h-4 w-4 text-primary" />
                          Fatores de Precificação
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Unidade Base</Label>
                            <Select 
                              value={pricingFactors.base_unit} 
                              onValueChange={v => setPricingFactors({...pricingFactors, base_unit: v})}
                            >
                              <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="un">Unidade (un)</SelectItem>
                                <SelectItem value="g">Grama (g)</SelectItem>
                                <SelectItem value="ml">Mililitro (ml)</SelectItem>
                                <SelectItem value="kg">Quilo (kg)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Custo Fixo (R$)</Label>
                            <Input 
                              type="number" step="0.01" value={pricingFactors.fixed_cost}
                              onChange={e => setPricingFactors({...pricingFactors, fixed_cost: Number(e.target.value)})}
                              className="h-9 rounded-xl"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Perda (%)</Label>
                            <Input 
                              type="number" step="0.1" value={pricingFactors.loss_percentage}
                              onChange={e => setPricingFactors({...pricingFactors, loss_percentage: Number(e.target.value)})}
                              className="h-9 rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Imposto (%)</Label>
                            <Input 
                              type="number" step="0.1" value={pricingFactors.tax_percentage}
                              onChange={e => setPricingFactors({...pricingFactors, tax_percentage: Number(e.target.value)})}
                              className="h-9 rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Margem (%)</Label>
                            <Input 
                              type="number" step="0.1" value={pricingFactors.margin_percentage}
                              onChange={e => setPricingFactors({...pricingFactors, margin_percentage: Number(e.target.value)})}
                              className="h-9 rounded-xl"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Additions Card */}
                    <Card className="rounded-3xl shadow-sm border-primary/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Layers className="h-4 w-4 text-primary" />
                          Custos Adicionais Dinâmicos
                        </CardTitle>
                        <CardDescription className="text-[10px]">Embalagens, taxas, mão de obra, etc.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          {additions.map(add => (
                            <div key={add.id} className="flex items-center justify-between p-2 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group text-xs">
                              <span className="font-medium">{add.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">
                                  {add.type === 'fixed' ? formatCurrency(Number(add.value)) : `${add.value}%`}
                                </span>
                                <Button 
                                  variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
                                  onClick={() => deleteAddition.mutate({ id: add.id, productId: selectedProductId })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-12 gap-2 pt-2 border-t">
                          <Input 
                            placeholder="Nome" className="col-span-5 h-8 text-xs rounded-lg"
                            value={newAddition.name} onChange={e => setNewAddition({...newAddition, name: e.target.value})}
                          />
                          <Select 
                            value={newAddition.type} onValueChange={v => setNewAddition({...newAddition, type: v})}
                          >
                            <SelectTrigger className="col-span-3 h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixo (R$)</SelectItem>
                              <SelectItem value="percentage">Perc (%)</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input 
                            type="number" placeholder="Valor" className="col-span-3 h-8 text-xs rounded-lg"
                            value={newAddition.value} onChange={e => setNewAddition({...newAddition, value: e.target.value})}
                          />
                          <Button 
                            size="icon" className="col-span-1 h-8 w-full rounded-lg"
                            disabled={!newAddition.name || !newAddition.value}
                            onClick={() => {
                              createAddition.mutate({ ...newAddition, product_id: selectedProductId, value: Number(newAddition.value) });
                              setNewAddition({ name: '', type: 'fixed', value: '' });
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Purchases and Sale Units */}
                  <div className="space-y-6">
                    {/* Purchases History */}
                    <Card className="rounded-3xl shadow-sm border-primary/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <History className="h-4 w-4 text-primary" />
                          Registro de Compras
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1">
                          {purchases.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-2 rounded-xl border text-[10px]">
                              <div>
                                <p className="font-bold">{p.quantity}{p.unit} por {formatCurrency(Number(p.total_value))}</p>
                                <p className="text-muted-foreground">{formatDate(p.date)}</p>
                              </div>
                              <Button 
                                variant="ghost" size="icon" className="h-5 w-5 text-destructive"
                                onClick={() => deletePurchase.mutate({ id: p.id, productId: selectedProductId })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-12 gap-2 pt-2 border-t">
                          <Input 
                            type="number" placeholder="Qtde" className="col-span-3 h-8 text-xs rounded-lg"
                            value={newPurchase.quantity} onChange={e => setNewPurchase({...newPurchase, quantity: e.target.value})}
                          />
                          <Input 
                            type="number" placeholder="Valor Total" className="col-span-4 h-8 text-xs rounded-lg"
                            value={newPurchase.total_value} onChange={e => setNewPurchase({...newPurchase, total_value: e.target.value})}
                          />
                          <Input 
                            type="date" className="col-span-4 h-8 text-[10px] rounded-lg"
                            value={newPurchase.date} onChange={e => setNewPurchase({...newPurchase, date: e.target.value})}
                          />
                          <Button 
                            size="icon" className="col-span-1 h-8 w-full rounded-lg"
                            disabled={!newPurchase.quantity || !newPurchase.total_value}
                            onClick={() => {
                              createPurchase.mutate({ ...newPurchase, product_id: selectedProductId, quantity: Number(newPurchase.quantity), total_value: Number(newPurchase.total_value) });
                              setNewPurchase({ quantity: '', unit: pricingFactors.base_unit, total_value: '', date: new Date().toISOString().split('T')[0] });
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sale Units */}
                    <Card className="rounded-3xl shadow-sm border-primary/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Tag className="h-4 w-4 text-primary" />
                          Unidades de Venda & Conversão
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          {saleUnits.map(unit => {
                            const unitPrice = (calculatedPricing?.finalPrice || 0) * Number(unit.conversion_factor);
                            return (
                              <div key={unit.id} className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/10">
                                <div>
                                  <p className="text-xs font-bold text-primary uppercase">{unit.name}</p>
                                  <p className="text-[10px] text-muted-foreground">Fator: {unit.conversion_factor}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-sm">{formatCurrency(unitPrice)}</span>
                                  <Button 
                                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                    onClick={() => deleteSaleUnit.mutate({ id: unit.id, productId: selectedProductId })}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="grid grid-cols-12 gap-2 pt-2 border-t">
                          <Input 
                            placeholder="Nome (ex: Cento)" className="col-span-7 h-9 text-xs rounded-xl"
                            value={newSaleUnit.name} onChange={e => setNewSaleUnit({...newSaleUnit, name: e.target.value})}
                          />
                          <Input 
                            type="number" placeholder="Fator" className="col-span-3 h-9 text-xs rounded-xl"
                            value={newSaleUnit.factor} onChange={e => setNewSaleUnit({...newSaleUnit, factor: e.target.value})}
                          />
                          <Button 
                            size="icon" className="col-span-2 h-9 w-full rounded-xl"
                            disabled={!newSaleUnit.name || !newSaleUnit.factor}
                            onClick={() => {
                              createSaleUnit.mutate({ ...newSaleUnit, product_id: selectedProductId, conversion_factor: Number(newSaleUnit.factor) });
                              setNewSaleUnit({ name: '', factor: '' });
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Main Action Button */}
                <div className="flex justify-end pt-4">
                  <Button 
                    size="lg" 
                    className="rounded-3xl px-12 h-14 text-lg font-bold shadow-xl gap-3 animate-pulse hover:animate-none"
                    onClick={handleUpdatePricing}
                    disabled={updateProduct.isPending}
                  >
                    <Calculator className="h-6 w-6" />
                    Calcular & Salvar Precificação
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40 py-40">
              <Calculator className="h-16 w-16 mb-4" />
              <p className="text-xl font-bold">Inicie sua Precificação Estratégica</p>
              <p className="text-sm">Selecione um produto na lista à esquerda para começar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessPricing;

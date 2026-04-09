type NumericLike = number | string | null | undefined;

type ProductCostSource = {
  id: string;
  cost_price?: NumericLike;
};

type IngredientCostSource = {
  id: string;
  purchase_price?: NumericLike;
  purchase_quantity?: NumericLike;
  unit?: string | null;
};

type CompositionCostSource = {
  product_id?: string | null;
  ingredient_id?: string | null;
  quantity?: NumericLike;
};

type SaleCostSource = {
  product_id?: string | null;
  quantity?: NumericLike;
};

const toNumber = (value: NumericLike) => Number(value ?? 0);

const getIngredientBaseQuantity = (ingredient: IngredientCostSource) => {
  const purchaseQuantity = toNumber(ingredient.purchase_quantity);

  if (purchaseQuantity <= 0) {
    return 0;
  }

  return ingredient.unit === 'KG' ? purchaseQuantity * 1000 : purchaseQuantity;
};

export const buildBusinessProductUnitCostMap = ({
  products,
  ingredients,
  compositions,
}: {
  products: ProductCostSource[];
  ingredients: IngredientCostSource[];
  compositions: CompositionCostSource[];
}) => {
  const ingredientsById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const compositionsByProductId = new Map<string, CompositionCostSource[]>();

  compositions.forEach((composition) => {
    if (!composition.product_id) {
      return;
    }

    const productCompositions = compositionsByProductId.get(composition.product_id) ?? [];
    productCompositions.push(composition);
    compositionsByProductId.set(composition.product_id, productCompositions);
  });

  return products.reduce<Record<string, number>>((costMap, product) => {
    const productCompositions = compositionsByProductId.get(product.id) ?? [];

    const calculatedUnitCost = productCompositions.reduce((total, composition) => {
      if (!composition.ingredient_id) {
        return total;
      }

      const ingredient = ingredientsById.get(composition.ingredient_id);

      if (!ingredient) {
        return total;
      }

      const baseQuantity = getIngredientBaseQuantity(ingredient);

      if (baseQuantity <= 0) {
        return total;
      }

      const ingredientUnitCost = toNumber(ingredient.purchase_price) / baseQuantity;
      return total + ingredientUnitCost * toNumber(composition.quantity);
    }, 0);

    costMap[product.id] = calculatedUnitCost > 0 ? calculatedUnitCost : toNumber(product.cost_price);
    return costMap;
  }, {});
};

export const calculateBusinessSalesCost = (
  sales: SaleCostSource[],
  productUnitCostMap: Record<string, number>,
) => {
  return sales.reduce((total, sale) => {
    const unitCost = sale.product_id ? productUnitCostMap[sale.product_id] ?? 0 : 0;
    return total + unitCost * toNumber(sale.quantity);
  }, 0);
};
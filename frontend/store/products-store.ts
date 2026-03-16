import { create } from "zustand";
import type { Product } from "@/types";
import type { ApiInventoryItem } from "@/lib/api";

export function mapApiItemToProduct(item: ApiInventoryItem): Product {
  return {
    id: item.id,
    brand: item.brand,
    model: item.name,
    type: item.type as Product["type"],
    transparency: item.transparency,
    availableMeters: item.quantity,
    costPrice: item.costPrice,
    pricePerMeter: item.pricePerUnit,
    minimumStock: item.minQuantity,
    sku: item.sku ?? undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    createdBy: item.createdBy ?? null,
  };
}

interface ProductsState {
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
}

export const useProductsStore = create<ProductsState>((set) => ({
  products: [],

  setProducts: (products) => set({ products }),

  addProduct: (product) =>
    set((state) => ({ products: [product, ...state.products] })),

  updateProduct: (product) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === product.id ? product : p)),
    })),

  deleteProduct: (id) =>
    set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
}));

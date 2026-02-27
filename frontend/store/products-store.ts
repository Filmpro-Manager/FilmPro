import { create } from "zustand";
import type { Product } from "@/types";
import { mockProducts } from "@/data/mock";

interface ProductsState {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
}

export const useProductsStore = create<ProductsState>((set) => ({
  products: [...mockProducts],

  addProduct: (product) =>
    set((state) => ({ products: [product, ...state.products] })),

  updateProduct: (product) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === product.id ? product : p)),
    })),

  deleteProduct: (id) =>
    set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
}));

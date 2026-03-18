import { create } from "zustand";
import type { ServiceCatalog } from "@/types";

interface ServiceCatalogState {
  services: ServiceCatalog[];
  setServices: (services: ServiceCatalog[]) => void;
  addService: (service: ServiceCatalog) => void;
  updateService: (service: ServiceCatalog) => void;
  toggleActive: (id: string) => void;
  deleteItem: (id: string) => void;
}

export const useServiceCatalogStore = create<ServiceCatalogState>((set) => ({
  services: [],

  setServices: (services) => set({ services }),

  addService: (service) =>
    set((state) => ({ services: [service, ...state.services] })),

  updateService: (service) =>
    set((state) => ({
      services: state.services.map((s) => (s.id === service.id ? service : s)),
    })),

  toggleActive: (id) =>
    set((state) => ({
      services: state.services.map((s) =>
        s.id === id ? { ...s, isActive: !s.isActive } : s
      ),
    })),

  deleteItem: (id) =>
    set((state) => ({ services: state.services.filter((s) => s.id !== id) })),
}));

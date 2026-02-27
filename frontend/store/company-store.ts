import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CompanySettings } from "@/types";

const defaultSettings: CompanySettings = {
  name: "AutoVision Películas Ltda.",
  tradeName: "AutoVision",
  cnpj: "12.345.678/0001-99",
  phone: "(11) 3344-5566",
  email: "contato@autovision.com",
  address: {
    street: "Rua das Películas",
    number: "472",
    complement: "Sala 2",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
    zipCode: "01001-000",
  },
  logoUrl: undefined,
  plan: "pro",
  modules: {
    hasService: true,
    hasProducts: true,
    hasWholesale: false,
    hasTeam: true,
  },
};

interface CompanyStore {
  settings: CompanySettings;
  update: (data: Partial<CompanySettings>) => void;
  updateModules: (modules: Partial<NonNullable<CompanySettings["modules"]>>) => void;
  removeLogo: () => void;
}

export const useCompanyStore = create<CompanyStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      update: (data) =>
        set((s) => ({ settings: { ...s.settings, ...data } })),
      updateModules: (modules) =>
        set((s) => ({
          settings: {
            ...s.settings,
            modules: { ...s.settings.modules, ...defaultSettings.modules!, ...modules },
          },
        })),
      removeLogo: () =>
        set((s) => ({ settings: { ...s.settings, logoUrl: undefined } })),
    }),
    { name: "filmpro-company" }
  )
);


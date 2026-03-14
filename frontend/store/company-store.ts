import { create } from "zustand";
import type { CompanySettings } from "@/types";

const defaultSettings: CompanySettings = {
  name: "",
  tradeName: "",
  cnpj: "",
  phone: "",
  email: "",
  address: {
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
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

export const useCompanyStore = create<CompanyStore>()((set) => ({
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
}));


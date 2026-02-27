import { create } from "zustand";
import type { Invoice } from "@/types";
import { mockInvoices } from "@/data/mock";

interface InvoicesState {
  invoices: Invoice[];
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
}

export const useInvoicesStore = create<InvoicesState>((set) => ({
  invoices: [...mockInvoices],

  addInvoice: (invoice) =>
    set((state) => ({ invoices: [invoice, ...state.invoices] })),

  updateInvoice: (invoice) =>
    set((state) => ({
      invoices: state.invoices.map((i) => (i.id === invoice.id ? invoice : i)),
    })),

  deleteInvoice: (id) =>
    set((state) => ({ invoices: state.invoices.filter((i) => i.id !== id) })),
}));

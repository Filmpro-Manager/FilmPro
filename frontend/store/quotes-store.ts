import { create } from "zustand";
import type { Quote, QuoteStatus } from "@/types";

interface QuotesState {
  quotes: Quote[];
  setQuotes: (quotes: Quote[]) => void;
  addQuote: (quote: Quote) => void;
  updateQuote: (quote: Quote) => void;
  updateStatus: (id: string, status: QuoteStatus) => void;
  deleteQuote: (id: string) => void;
  convertToAppointment: (id: string, appointmentId: string) => void;
}

export const useQuotesStore = create<QuotesState>((set) => ({
  quotes: [],

  setQuotes: (quotes) => set({ quotes }),

  addQuote: (quote) =>
    set((state) => ({ quotes: [quote, ...state.quotes] })),

  updateQuote: (quote) =>
    set((state) => ({
      quotes: state.quotes.map((q) => (q.id === quote.id ? quote : q)),
    })),

  updateStatus: (id, status) =>
    set((state) => ({
      quotes: state.quotes.map((q) => (q.id === id ? { ...q, status } : q)),
    })),

  deleteQuote: (id) =>
    set((state) => ({ quotes: state.quotes.filter((q) => q.id !== id) })),

  convertToAppointment: (id, appointmentId) =>
    set((state) => ({
      quotes: state.quotes.map((q) =>
        q.id === id
          ? {
              ...q,
              status: "converted" as QuoteStatus,
              convertedAt: new Date().toISOString(),
              convertedToAppointmentId: appointmentId,
            }
          : q
      ),
    })),
}));

import { create } from "zustand";
import type { Quote, QuoteStatus } from "@/types";
import { mockQuotes } from "@/data/mock";

interface QuotesState {
  quotes: Quote[];
  addQuote: (quote: Quote) => void;
  updateQuote: (id: string, quote: Quote) => void;
  updateStatus: (id: string, status: QuoteStatus) => void;
  deleteQuote: (id: string) => void;
  convertToAppointment: (id: string, appointmentId: string) => void;
}

export const useQuotesStore = create<QuotesState>((set) => ({
  quotes: [...mockQuotes],

  addQuote: (quote) =>
    set((state) => ({ quotes: [quote, ...state.quotes] })),

  updateQuote: (id, quote) =>
    set((state) => ({
      quotes: state.quotes.map((q) => (q.id === id ? quote : q)),
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
              status: "sent" as QuoteStatus,
              convertedAt: new Date().toISOString().slice(0, 10),
              convertedToAppointmentId: appointmentId,
            }
          : q
      ),
    })),
}));

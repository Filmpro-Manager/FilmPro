import { create } from "zustand";
import type { Transaction } from "@/types";
import { mockTransactions } from "@/data/mock";

interface TransactionsState {
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
}

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [...mockTransactions],

  addTransaction: (transaction) =>
    set((state) => ({ transactions: [transaction, ...state.transactions] })),

  deleteTransaction: (id) =>
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) })),
}));

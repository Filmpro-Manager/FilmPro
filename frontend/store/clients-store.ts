import { create } from "zustand";
import type { Client } from "@/types";
import { mockClients } from "@/data/mock";

interface ClientsState {
  clients: Client[];
  addClient: (client: Client) => void;
  addClients: (clients: Client[]) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
}

export const useClientsStore = create<ClientsState>((set) => ({
  clients: [...mockClients],

  addClient: (client) =>
    set((state) => ({ clients: [client, ...state.clients] })),

  addClients: (newClients) =>
    set((state) => ({ clients: [...newClients, ...state.clients] })),

  updateClient: (client) =>
    set((state) => ({
      clients: state.clients.map((c) => (c.id === client.id ? client : c)),
    })),

  deleteClient: (id) =>
    set((state) => ({ clients: state.clients.filter((c) => c.id !== id) })),
}));

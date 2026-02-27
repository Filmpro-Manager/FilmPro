import { create } from "zustand";
import type { Alert, AlertType, AlertSeverity } from "@/types";
import { mockAlerts } from "@/data/mock";

interface AlertsState {
  alerts: Alert[];
  unreadCount: number;
  addAlert: (alert: Alert) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissAlert: (id: string) => void;
  /** Gera alertas automáticos com base no estado atual do sistema */
  generateAlerts: (data: {
    lowStockProducts: { id: string; name: string }[];
    overdueTransactions: { id: string; description: string; dueDate: string }[];
    idleClients: { id: string; name: string; daysSince: number }[];
    goalsAtRisk: { id: string; type: string; progressPct: number }[];
  }) => void;
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [...mockAlerts],
  unreadCount: mockAlerts.filter((a) => !a.isRead).length,

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts],
      unreadCount: state.unreadCount + 1,
    })),

  markAsRead: (id) =>
    set((state) => {
      const alerts = state.alerts.map((a) =>
        a.id === id ? { ...a, isRead: true } : a
      );
      return { alerts, unreadCount: alerts.filter((a) => !a.isRead).length };
    }),

  markAllAsRead: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, isRead: true })),
      unreadCount: 0,
    })),

  dismissAlert: (id) =>
    set((state) => {
      const alerts = state.alerts.filter((a) => a.id !== id);
      return { alerts, unreadCount: alerts.filter((a) => !a.isRead).length };
    }),

  generateAlerts: (data) => {
    const now = new Date().toISOString();
    const newAlerts: Alert[] = [];

    data.lowStockProducts.forEach((p) => {
      const exists = get().alerts.find(
        (a) => a.type === "low_stock" && a.entityId === p.id && !a.isRead
      );
      if (!exists) {
        newAlerts.push({
          id: `alert-stock-${p.id}-${Date.now()}`,
          type: "low_stock",
          severity: "warning",
          title: "Estoque baixo",
          message: `${p.name} está abaixo do estoque mínimo.`,
          entityId: p.id,
          entityType: "product",
          isRead: false,
          createdAt: now,
        });
      }
    });

    data.overdueTransactions.forEach((t) => {
      const exists = get().alerts.find(
        (a) => a.type === "overdue_payment" && a.entityId === t.id && !a.isRead
      );
      if (!exists) {
        newAlerts.push({
          id: `alert-pay-${t.id}-${Date.now()}`,
          type: "overdue_payment",
          severity: "critical",
          title: "Pagamento em atraso",
          message: `"${t.description}" venceu em ${t.dueDate}.`,
          entityId: t.id,
          entityType: "transaction",
          isRead: false,
          createdAt: now,
        });
      }
    });

    data.idleClients.forEach((c) => {
      const exists = get().alerts.find(
        (a) => a.type === "idle_client" && a.entityId === c.id && !a.isRead
      );
      if (!exists) {
        newAlerts.push({
          id: `alert-client-${c.id}-${Date.now()}`,
          type: "idle_client",
          severity: "info",
          title: "Cliente inativo",
          message: `${c.name} não compra há ${c.daysSince} dias.`,
          entityId: c.id,
          entityType: "client",
          isRead: false,
          createdAt: now,
        });
      }
    });

    data.goalsAtRisk.forEach((g) => {
      const exists = get().alerts.find(
        (a) => a.type === "goal_at_risk" && a.entityId === g.id && !a.isRead
      );
      if (!exists) {
        newAlerts.push({
          id: `alert-goal-${g.id}-${Date.now()}`,
          type: "goal_at_risk",
          severity: "warning",
          title: "Meta em risco",
          message: `Meta de ${g.type} está em ${g.progressPct.toFixed(0)}% do objetivo.`,
          entityId: g.id,
          entityType: "goal",
          isRead: false,
          createdAt: now,
        });
      }
    });

    if (newAlerts.length > 0) {
      set((state) => ({
        alerts: [...newAlerts, ...state.alerts],
        unreadCount: state.unreadCount + newAlerts.length,
      }));
    }
  },
}));

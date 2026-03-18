import { create } from "zustand";
import type { Goal } from "@/types";

interface GoalsState {
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goal: Goal) => void;
  updateAchieved: (id: string, achieved: number) => void;
  deleteGoal: (id: string) => void;
  syncAchieved: (
    period: string,
    data: {
      revenue: number;
      services: number;
      newClients: number;
      ticketAverage: number;
      conversionRate: number;
    }
  ) => void;
}

export const useGoalsStore = create<GoalsState>((set) => ({
  goals: [],

  setGoals: (goals) => set({ goals }),

  addGoal: (goal) =>
    set((state) => ({ goals: [goal, ...state.goals] })),

  updateGoal: (goal) =>
    set((state) => ({
      goals: state.goals.map((g) => (g.id === goal.id ? goal : g)),
    })),

  updateAchieved: (id, achieved) =>
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === id
          ? { ...g, achieved, progressPct: g.target > 0 ? (achieved / g.target) * 100 : 0 }
          : g
      ),
    })),

  deleteGoal: (id) =>
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) })),

  syncAchieved: (period, data) =>
    set((state) => ({
      goals: state.goals.map((g) => {
        if (g.period !== period || g.employeeId) return g;
        let achieved = g.achieved;
        switch (g.type) {
          case "revenue":        achieved = data.revenue; break;
          case "services":       achieved = data.services; break;
          case "new_clients":    achieved = data.newClients; break;
          case "ticket_average": achieved = data.ticketAverage; break;
          case "conversion_rate": achieved = data.conversionRate; break;
        }
        return {
          ...g,
          achieved,
          progressPct: g.target > 0 ? Math.round((achieved / g.target) * 100) : 0,
        };
      }),
    })),
}));

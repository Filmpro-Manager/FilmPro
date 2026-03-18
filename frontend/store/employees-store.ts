import { create } from "zustand";
import type { Employee } from "@/types";

interface EmployeesState {
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (employee: Employee) => void;
  deleteEmployee: (id: string) => void;
}

export const useEmployeesStore = create<EmployeesState>((set) => ({
  employees: [],

  setEmployees: (employees) => set({ employees }),

  addEmployee: (employee) =>
    set((state) => ({ employees: [employee, ...state.employees] })),

  updateEmployee: (employee) =>
    set((state) => ({
      employees: state.employees.map((e) => (e.id === employee.id ? employee : e)),
    })),

  deleteEmployee: (id) =>
    set((state) => ({ employees: state.employees.filter((e) => e.id !== id) })),
}));

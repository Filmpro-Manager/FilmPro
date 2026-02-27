import { create } from "zustand";
import type { Appointment, AppointmentStatus } from "@/types";
import { mockAppointments } from "@/data/mock";

interface ServicesState {
  services: Appointment[];
  addService: (service: Appointment) => void;
  updateService: (service: Appointment) => void;
  updateStatus: (id: string, status: AppointmentStatus) => void;
  deleteService: (id: string) => void;
}

export const useServicesStore = create<ServicesState>((set) => ({
  services: [...mockAppointments],

  addService: (service) =>
    set((state) => ({ services: [service, ...state.services] })),

  updateService: (service) =>
    set((state) => ({
      services: state.services.map((s) => (s.id === service.id ? service : s)),
    })),

  updateStatus: (id, status) =>
    set((state) => ({
      services: state.services.map((s) =>
        s.id === id ? { ...s, status } : s
      ),
    })),

  deleteService: (id) =>
    set((state) => ({ services: state.services.filter((s) => s.id !== id) })),
}));

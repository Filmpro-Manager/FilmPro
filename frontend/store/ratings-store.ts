import { create } from "zustand";
import type { ClientRating } from "@/types";
import { mockRatings } from "@/data/mock";

interface RatingsState {
  ratings: ClientRating[];
  /** NPS calculado: % promotores (9-10) - % detratores (0-6) */
  npsScore: number;
  addRating: (rating: ClientRating) => void;
  getByClient: (clientId: string) => ClientRating[];
  getByAppointment: (appointmentId: string) => ClientRating | undefined;
}

function calcNPS(ratings: ClientRating[]): number {
  if (ratings.length === 0) return 0;
  const promoters = ratings.filter((r) => r.score >= 9).length;
  const detractors = ratings.filter((r) => r.score <= 6).length;
  return Math.round(((promoters - detractors) / ratings.length) * 100);
}

export const useRatingsStore = create<RatingsState>((set, get) => ({
  ratings: [...mockRatings],
  npsScore: calcNPS(mockRatings),

  addRating: (rating) =>
    set((state) => {
      const ratings = [rating, ...state.ratings];
      return { ratings, npsScore: calcNPS(ratings) };
    }),

  getByClient: (clientId) => get().ratings.filter((r) => r.clientId === clientId),

  getByAppointment: (appointmentId) =>
    get().ratings.find((r) => r.appointmentId === appointmentId),
}));

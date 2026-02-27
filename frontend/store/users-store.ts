import { create } from "zustand";
import type { User } from "@/types";
import { mockUsers } from "@/data/mock";

interface UsersState {
  users: User[];
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [...mockUsers],

  addUser: (user) =>
    set((state) => ({ users: [user, ...state.users] })),

  updateUser: (user) =>
    set((state) => ({
      users: state.users.map((u) => (u.id === user.id ? user : u)),
    })),

  deleteUser: (id) =>
    set((state) => ({ users: state.users.filter((u) => u.id !== id) })),
}));

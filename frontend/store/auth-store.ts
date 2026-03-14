import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { apiLogin } from "@/lib/api";

// Helpers para sincronizar o token num cookie (lido pelo middleware)
function setTokenCookie(token: string) {
  const maxAge = 7 * 24 * 60 * 60; // 7 dias
  document.cookie = `filmpro-auth-token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function removeTokenCookie() {
  document.cookie = 'filmpro-auth-token=; path=/; max-age=0';
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
  setActiveStore: (storeId: string) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        try {
          const { token, user } = await apiLogin(email, password);

          const mappedUser: User = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: (user.role as string).toUpperCase() as User["role"],
            active: true,
            companyId: user.companyId,
            storeId: user.storeId ?? null,
            createdAt: new Date().toISOString(),
          };

          set({ user: mappedUser, token, isAuthenticated: true });
          setTokenCookie(token);
          return { success: true };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erro ao autenticar";
          return { success: false, error: message };
        }
      },

      logout: () => {
        removeTokenCookie();
        set({ user: null, token: null, isAuthenticated: false });
      },

      setActiveStore: (storeId) => {
        set((state) => ({
          user: state.user ? { ...state.user, storeId } : null,
        }));
      },

      setToken: (token) => {
        set({ token });
        setTokenCookie(token);
      },

      hasRole: (...roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role as string);
      },
    }),
    {
      name: "filmpro-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

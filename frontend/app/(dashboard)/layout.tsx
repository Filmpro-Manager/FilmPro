"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useCompanyStore } from "@/store/company-store";
import { apiGetStore } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user  = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { update } = useCompanyStore();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, router]);

  // Hidrata o company store com dados reais da API sempre que o storeId mudar
  useEffect(() => {
    if (!user?.storeId || !token) return;
    apiGetStore(user.storeId, token)
      .then((store) => {
        update({
          name: store.razaoSocial,
          tradeName: store.nomeFantasia,
          cnpj: store.cnpj,
          phone: store.phone,
          email: store.email,
          logoUrl: store.logoUrl ?? undefined,
          address: {
            street: store.addressStreet,
            number: store.addressNumber,
            complement: store.addressComplement ?? undefined,
            neighborhood: store.addressDistrict,
            city: store.addressCity,
            state: store.addressState,
            zipCode: store.addressZipcode,
          },
        });
      })
      .catch(() => { /* ignora se offline */ });
  }, [user?.storeId, token]);

  const handleDesktopToggle = useCallback(() => setCollapsed((v) => !v), []);
  const handleMobileToggle  = useCallback(() => setMobileOpen((v) => !v), []);
  const handleMobileClose   = useCallback(() => setMobileOpen(false), []);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={handleDesktopToggle}
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuToggle={handleMobileToggle} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-2xl mx-auto p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { CompanyInfoSection } from "@/components/configuracoes/company-info-section";
import { LogoUploadSection } from "@/components/configuracoes/logo-upload-section";
import { Separator } from "@/components/ui/separator";

export default function CompanySettingsPage() {
  const { hasRole, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && !hasRole("COMPANY_ADMIN", "MASTER_ADMIN")) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, hasRole, router]);

  if (!isAuthenticated || !hasRole("COMPANY_ADMIN", "MASTER_ADMIN")) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Configurações da Empresa"
        description="Gerencie os dados da empresa exibidos em todo o sistema."
      />

      <LogoUploadSection />

      <Separator />

      <CompanyInfoSection />
    </div>
  );
}

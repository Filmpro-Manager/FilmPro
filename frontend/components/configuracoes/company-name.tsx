"use client";

import { useCompanyStore } from "@/store/company-store";

export function CompanyName() {
  const { settings } = useCompanyStore();
  return <>{settings.tradeName || settings.name}</>;
}

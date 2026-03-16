"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  CalendarDays,
  ClipboardList,
  TrendingUp,
  FileText,
  UserCog,
  PanelLeftClose,
  PanelLeftOpen,
  Film,
  Building2,
  Wrench,
  FileSignature,
  Target,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useCompanyStore } from "@/store/company-store";
import type { CompanyModules } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  module?: keyof CompanyModules;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { label: "Dashboard",     href: "/dashboard",     icon: LayoutDashboard },
      { label: "Clientes",      href: "/clientes",      icon: Users },
      { label: "Financeiro",    href: "/financeiro",    icon: TrendingUp,  roles: ["OWNER", "MANAGER"] },
      { label: "Notas Fiscais", href: "/notas-fiscais", icon: FileText,    roles: ["OWNER", "MANAGER"] },
    ],
  },
  {
    label: "Operações",
    items: [
      { label: "Agenda",            href: "/agenda",            icon: CalendarDays,  module: "hasService" },
      { label: "Ordens de Serviço", href: "/ordens-de-servico", icon: ClipboardList, module: "hasService" },
      { label: "Serviços",          href: "/servicos",          icon: Wrench,        module: "hasService" },
      { label: "Orçamentos",        href: "/orcamentos",        icon: FileSignature, module: "hasService" },
      { label: "Estoque",           href: "/estoque",           icon: Package,       roles: ["OWNER", "MANAGER"], module: "hasProducts" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { label: "Equipe",     href: "/equipe",                icon: UserCog,   roles: ["OWNER","MANAGER"], module: "hasTeam" },
      { label: "Metas",      href: "/metas",                 icon: Target,    roles: ["OWNER","MANAGER"] },
      { label: "Relatórios", href: "/relatorios",            icon: BarChart3, roles: ["OWNER"] },
      { label: "Empresa",    href: "/configuracoes/empresa", icon: Building2, roles: ["OWNER"] },
      { label: "Meu Perfil", href: "/configuracoes/perfil",  icon: Settings },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname      = usePathname();
  const { user } = useAuthStore();
  const { settings }  = useCompanyStore();

  const { logoUrl, modules } = settings;
  const companyName = settings.tradeName || settings.name;
  const mods: CompanyModules = {
    hasService:   true,
    hasProducts:  true,
    hasWholesale: false,
    hasTeam:      true,
    ...modules,
  };

  function isVisible(item: NavItem): boolean {
    if (item.roles && user && !item.roles.includes(user.role)) return false;
    if (item.module && !mods[item.module]) return false;
    return true;
  }

  return (
    <>
      {/* Backdrop mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

    <aside
      className={cn(
        // Base
        "flex flex-col h-full shrink-0 border-r",
        "bg-[hsl(222,30%,7%)] border-[hsl(222,25%,13%)]",
        "transition-transform duration-300 ease-in-out",
        // Mobile: fixed overlay, slide from left
        "fixed inset-y-0 left-0 z-40",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: reset to normal in-flow element
        "lg:relative lg:translate-x-0 lg:z-auto",
        // Width
        collapsed ? "lg:w-[62px] w-[228px]" : "w-[228px]"
      )}
    >
      {/* ── Logo / Empresa ────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-14 shrink-0 border-b border-[hsl(222,25%,13%)]",
          collapsed ? "justify-center px-0" : "px-3 gap-3"
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0 overflow-hidden shadow-lg shadow-primary/25">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} className="w-full h-full object-contain" />
          ) : (
            <Film className="w-4 h-4 text-white" />
          )}
        </div>

        {!collapsed && (
          <div className="min-w-0 animate-fade-in">
            <p className="text-[13px] font-semibold text-white leading-tight truncate tracking-tight">
              {companyName}
            </p>
            <p className="text-[10px] text-[hsl(222,15%,38%)] leading-tight truncate mt-0.5">
              FilmPro Manager
            </p>
          </div>
        )}
      </div>

      {/* ── Navegação ─────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4">
        {navGroups.map((group, gi) => {
          const visible = group.items.filter(isVisible);
          if (visible.length === 0) return null;

          return (
            <div key={gi}>
              {/* Separador e label do grupo */}
              {!collapsed ? (
                <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[hsl(222,15%,35%)] select-none">
                  {group.label}
                </p>
              ) : (
                gi > 0 && <div className="h-px bg-[hsl(222,25%,13%)] mx-1 mb-2" />
              )}

              <div className="space-y-0.5">
                {visible.map((item) => {
                  const Icon   = item.icon;
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      onClick={onMobileClose}
                      className={cn(
                        "group relative flex items-center rounded-lg text-[13px] transition-all duration-150",
                        collapsed
                          ? "justify-center h-9 w-full"
                          : "h-8 gap-2.5 pl-3 pr-2",
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-[hsl(222,15%,50%)] hover:bg-[hsl(222,25%,12%)] hover:text-[hsl(222,15%,78%)]"
                      )}
                    >
                      {/* Barra lateral ativa */}
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-primary" />
                      )}
                      {/* Ponto ativo no modo colapsado */}
                      {active && collapsed && (
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}

                      <Icon
                        className={cn(
                          "shrink-0 transition-transform duration-150 group-hover:scale-110",
                          collapsed ? "w-[18px] h-[18px]" : "w-[14px] h-[14px]",
                          active && "text-primary"
                        )}
                      />

                      {!collapsed && (
                        <span className="truncate leading-none">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Botão toggle (apenas desktop) ───────────────────────── */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        className={cn(
          "hidden lg:flex",
          "absolute -right-3 top-[calc(50%-12px)] z-20",
          "items-center justify-center w-6 h-6 rounded-full cursor-pointer",
          "bg-[hsl(222,30%,10%)] border border-[hsl(222,25%,22%)]",
          "text-[hsl(222,15%,42%)] shadow-sm",
          "hover:border-primary/40 hover:text-primary hover:bg-[hsl(222,30%,13%)]",
          "transition-all duration-200"
        )}
      >
        {collapsed
          ? <PanelLeftOpen  className="w-3 h-3" />
          : <PanelLeftClose className="w-3 h-3" />
        }
      </button>
    </aside>
    </>
  );
}


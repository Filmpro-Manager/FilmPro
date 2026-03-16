"use client";

import { useState, useEffect } from "react";
import { Bell, LogOut, Settings, Moon, Sun, Menu, Zap, Store, User as UserIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { apiGetProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { QuickServiceDialog } from "@/components/shared/quick-service-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuToggle?: () => void;
  className?: string;
}

export function Header({ onMenuToggle, className }: HeaderProps) {
  const { user, token, logout, hasRole } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [quickOpen, setQuickOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar ?? null);

  // Busca o avatar atualizado da API sempre que o token mudar (login, troca de loja, etc.)
  useEffect(() => {
    if (!token) return;
    apiGetProfile(token)
      .then((profile) => setAvatarUrl(profile.avatarUrl ?? null))
      .catch(() => {/* ignora erros silenciosamente */});
  }, [token]);

  // Sincroniza quando o store for atualizado (inclusive remoção de foto)
  useEffect(() => {
    setAvatarUrl(user?.avatar ?? null);
  }, [user?.avatar, user?.name]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <>
      <header
      className={cn(
        "flex items-center justify-between h-14 px-4 border-b border-border bg-card/80 backdrop-blur-sm shrink-0",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {onMenuToggle && (
          <Button variant="ghost" size="icon" onClick={onMenuToggle} className="lg:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs hidden sm:flex"
          onClick={() => setQuickOpen(true)}
        >
          <Zap className="w-3.5 h-3.5" />
          Lançamento Rápido
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Alternar tema"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <Button variant="ghost" size="icon" aria-label="Notificações">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full cursor-pointer p-0 overflow-hidden focus-visible:ring-0 focus-visible:ring-offset-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={user?.name} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                  {user?.name.charAt(0).toUpperCase() ?? "U"}
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hasRole("OWNER") && (
              <>
                <DropdownMenuItem
                  onClick={() => router.push("/selecionar-loja")}
                  className="cursor-pointer"
                >
                  <Store className="mr-2 h-4 w-4" />
                  Trocar de Loja
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/configuracoes/empresa")}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações da Empresa
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/configuracoes/perfil")}
              className="cursor-pointer"
            >
              <UserIcon className="mr-2 h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

      <QuickServiceDialog open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}

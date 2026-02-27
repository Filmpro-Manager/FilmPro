"use client";

import { useState } from "react";
import { Bell, LogOut, Settings, Moon, Sun, Menu, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
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
  const { user, logout, hasRole } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [quickOpen, setQuickOpen] = useState(false);

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
            <Button variant="ghost" className="relative h-9 w-9 rounded-full cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user?.name.charAt(0).toUpperCase() ?? "U"}</AvatarFallback>
              </Avatar>
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
            {hasRole("COMPANY_ADMIN", "MASTER_ADMIN") && (
              <DropdownMenuItem
                onClick={() => router.push("/configuracoes/empresa")}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                Configurações da Empresa
              </DropdownMenuItem>
            )}
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

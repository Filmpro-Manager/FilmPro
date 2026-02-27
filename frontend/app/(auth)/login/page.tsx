"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Film, Eye, EyeOff, Loader2 } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validators";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const { login } = useAuthStore();
  const router = useRouter()
  // const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setAuthError("");
    const result = await login(data.email, data.password);

    if (!result.success) {
      setAuthError(result.error ?? "Erro ao autenticar.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-start justify-between p-12 bg-[hsl(220,25%,8%)] text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary">
            <Film className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-base tracking-tight">FilmPro Manager</span>
        </div>

        <div className="space-y-4 max-w-sm">
          <div className="w-12 h-1 rounded-full bg-primary" />
          <h2 className="text-2xl font-semibold leading-tight">
            Gestão completa para sua empresa de películas
          </h2>
          <p className="text-sm text-[hsl(220,15%,60%)] leading-relaxed">
            Controle de estoque, agenda, financeiro, clientes e equipe em uma plataforma integrada e profissional.
          </p>
        </div>

        <div className="flex items-center gap-6">
          {["Estoque", "Agenda", "Financeiro", "Clientes"].map((item) => (
            <div key={item} className="text-xs text-[hsl(220,15%,50%)]">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-2 lg:hidden mb-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">FilmPro Manager</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Acesse sua conta</h1>
            <p className="text-sm text-muted-foreground">
              Insira suas credenciais para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                {...register("email")}
                className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                  className={cn(
                    "pr-10",
                    errors.password && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {authError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-xs text-destructive">{authError}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Autenticando..." : "Entrar"}
            </Button>
          </form>

          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Contas de demonstração</p>
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <p><span className="font-mono">master@filmpromanager.com</span> — Master Admin</p>
              <p><span className="font-mono">carlos@autovision.com</span> — Administrador</p>
              <p><span className="font-mono">rafael@autovision.com</span> — Funcionário</p>
              <p className="pt-1 text-muted-foreground/70">Senha: <span className="font-mono">123456</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

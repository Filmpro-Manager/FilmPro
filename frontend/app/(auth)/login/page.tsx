"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Film, Eye, EyeOff, Loader2, ArrowRight,
  BarChart2, CalendarDays, Wallet, Users,
  ShieldCheck, BadgeCheck, Sparkles,
} from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validators";
import { useAuthStore } from "@/store/auth-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const FEATURES = [
  { label: "Estoque inteligente", desc: "Controle em tempo real com alertas automáticos", icon: BarChart2 },
  { label: "Agenda integrada", desc: "Sem conflito de horários entre equipes", icon: CalendarDays },
  { label: "Financeiro", desc: "Fluxo de caixa, DRE e relatórios em segundos", icon: Wallet },
  { label: "Clientes & CRM", desc: "Histórico completo e gestão de relacionamento", icon: Users },
];

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const { login } = useAuthStore();
  const router = useRouter();

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

    const loggedUser = useAuthStore.getState().user;
    if (loggedUser?.role === "owner") {
      router.push("/selecionar-loja");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo ───────────────────────────── */}
      <div className="hidden lg:flex w-[58%] items-stretch bg-[#070c1a] text-white relative overflow-hidden">

        {/* Blobs flutuantes */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="animate-float absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-600/12 blur-[140px]" />
          <div className="animate-float-reverse absolute top-1/2 right-0 w-[380px] h-[480px] rounded-full bg-indigo-600/10 blur-[120px]" />
          <div className="animate-float-slow absolute -bottom-20 left-1/3 w-[320px] h-[320px] rounded-full bg-blue-400/8 blur-[100px]" />
          {/* Orbs decorativos menores */}
          <div className="animate-float absolute top-1/4 right-1/4 w-[80px] h-[80px] rounded-full bg-blue-400/15 blur-[30px]" />
          <div className="animate-float-reverse absolute bottom-1/3 left-1/4 w-[60px] h-[60px] rounded-full bg-indigo-400/12 blur-[24px]" />
        </div>

        {/* Grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />

        {/* Container centralizado */}
        <div className="relative z-10 flex flex-col justify-between w-full max-w-xl mx-auto py-12 px-10">

          {/* Logo */}
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="animate-glow-pulse flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight">FilmPro Manager</span>
            <div className="ml-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/20 text-[10px] text-blue-300 font-medium animate-scale-in delay-300">
              <BadgeCheck className="w-3 h-3" />
              v2.0
            </div>
          </div>

          {/* Conteúdo central */}
          <div className="space-y-8">

            {/* Título */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/60 animate-fade-up delay-100">
                <Sparkles className="w-3 h-3 text-blue-400" />
                Plataforma nº1 para aplicadoras de películas
              </div>
              <h2 className="text-[2.5rem] font-extrabold leading-[1.12] tracking-tight animate-fade-up delay-150">
                Gerencie todo o negócio{" "}
                <span className="animate-shimmer-text text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-400">
                  em um só lugar
                </span>
              </h2>
              <p className="text-[14.5px] text-white/50 leading-relaxed max-w-sm animate-fade-up delay-200">
                Controle de estoque, agendamentos, finanças e clientes{" "}
                <span className="text-white/70">integrado</span>{" "}
                para você focar no que importa.
              </p>
            </div>

            {/* Features com ícones — stagger individual */}
            <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.label}
                    style={{ animationDelay: `${260 + i * 80}ms` }}
                    className="animate-fade-up flex items-start gap-3 group p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-blue-500/20 transition-all duration-300"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 shrink-0 mt-0.5 group-hover:bg-blue-500/25 group-hover:border-blue-500/30 group-hover:scale-110 transition-all duration-300">
                      <Icon className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-white/90 group-hover:text-white transition-colors">{f.label}</p>
                      <p className="text-[11px] text-white/40 mt-0.5 leading-tight">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          <p className="text-xs text-white/25 animate-fade-in delay-500">© {new Date().getFullYear()} FilmPro Manager</p>

        </div>{/* fim container centralizado */}
      </div>

      {/* ── Painel direito ────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-background relative overflow-hidden">

        {/* Decoração sutil no fundo do painel direito */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-primary/4 blur-[80px] animate-float-slow" />
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] rounded-full bg-primary/3 blur-[60px] animate-float-reverse" />
        </div>

        {/* Header mobile */}
        <div className="flex items-center px-8 py-5 lg:hidden border-b animate-fade-in relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">FilmPro Manager</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-10 py-8 relative z-10">
          <div className="w-full max-w-[380px] space-y-8">

            {/* Cabeçalho */}
            <div className="space-y-2 animate-slide-in-right">
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground px-2.5 py-1 rounded-full bg-muted border mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sistema operacional
              </div>
              <h1 className="text-[1.75rem] font-bold tracking-tight">Bem-vindo de volta</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Acesse sua conta para gerenciar sua empresa de películas.
              </p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              <div className="space-y-2 animate-slide-in-right delay-100">
                <Label htmlFor="email" className="text-sm font-medium">Endereço de e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  {...register("email")}
                  className={cn(
                    "h-11 text-sm transition-shadow focus:shadow-md focus:shadow-primary/10",
                    errors.email && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {errors.email && (
                  <p className="text-xs text-destructive animate-fade-up">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2 animate-slide-in-right delay-150">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register("password")}
                    className={cn(
                      "h-11 text-sm pr-10 transition-shadow focus:shadow-md focus:shadow-primary/10",
                      errors.password && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive animate-fade-up">{errors.password.message}</p>
                )}
              </div>

              {authError && (
                <div className="flex items-start gap-2.5 rounded-lg bg-destructive/8 border border-destructive/15 px-3.5 py-3 animate-scale-in">
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                  <p className="text-xs text-destructive leading-relaxed">{authError}</p>
                </div>
              )}

              <div className="animate-slide-in-right delay-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Autenticando...
                    </>
                  ) : (
                    <>
                      Entrar na conta
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Rodapé */}
            <div className="space-y-4 animate-fade-up delay-300">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">segurança</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Conexão segura · Dados criptografados com SSL
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Sem acesso?{" "}
                <span className="text-foreground font-medium cursor-pointer hover:underline underline-offset-4">
                  Fale com o administrador
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

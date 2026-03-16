"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Film, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2,
  ShieldCheck, BadgeCheck, Sparkles, Lock,
} from "lucide-react";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validators";
import { apiResetPassword } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: tokenFromUrl },
  });

  async function onSubmit(data: ResetPasswordInput) {
    setErrorMsg("");
    try {
      await apiResetPassword(data.token, data.password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao redefinir senha");
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 py-2 animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-[1.75rem] font-bold tracking-tight">Senha redefinida!</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
            Sua senha foi alterada com sucesso. Redirecionando para o login...
          </p>
        </div>
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mt-2" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Token oculto — vem da URL */}
      <input type="hidden" {...register("token")} />

      {/* Nova senha */}
      <div className="space-y-2 animate-slide-in-right delay-100">
        <Label htmlFor="password" className="text-sm font-medium">Nova senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("password")}
            className={cn(
              "h-11 text-sm pr-10 transition-shadow focus:shadow-md focus:shadow-primary/10",
              errors.password && "border-destructive focus-visible:ring-destructive"
            )}
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" tabIndex={-1}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive animate-fade-up">{errors.password.message}</p>}
      </div>

      {/* Confirmar senha */}
      <div className="space-y-2 animate-slide-in-right delay-200">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar nova senha</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("confirmPassword")}
            className={cn(
              "h-11 text-sm pr-10 transition-shadow focus:shadow-md focus:shadow-primary/10",
              errors.confirmPassword && "border-destructive focus-visible:ring-destructive"
            )}
          />
          <button type="button" onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" tabIndex={-1}>
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-xs text-destructive animate-fade-up">{errors.confirmPassword.message}</p>}
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 rounded-lg bg-destructive/8 border border-destructive/15 px-3.5 py-3 animate-scale-in">
          <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
          <p className="text-xs text-destructive leading-relaxed">{errorMsg}</p>
        </div>
      )}

      <div className="animate-slide-in-right delay-250">
        <button
          type="submit"
          disabled={isSubmitting}
          className="group w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Redefinindo...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Redefinir senha
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo ─────────────────────────────── */}
      <div className="hidden lg:flex w-[55%] items-stretch bg-[#070c1a] text-white relative overflow-hidden">

        {/* Blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="animate-float absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-600/12 blur-[140px]" />
          <div className="animate-float-reverse absolute top-1/2 right-0 w-[380px] h-[480px] rounded-full bg-indigo-600/10 blur-[120px]" />
          <div className="animate-float-slow absolute -bottom-20 left-1/3 w-[320px] h-[320px] rounded-full bg-blue-400/8 blur-[100px]" />
          <div className="animate-float absolute top-1/4 right-1/4 w-[80px] h-[80px] rounded-full bg-blue-400/15 blur-[30px]" />
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

        <div className="relative z-10 flex flex-col justify-between w-full max-w-xl mx-auto py-12 px-10">

          {/* Logo */}
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="animate-glow-pulse flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight">FilmPro Manager</span>
            <div className="ml-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/20 text-[10px] text-blue-300 font-medium">
              <BadgeCheck className="w-3 h-3" />
              v2.0
            </div>
          </div>

          {/* Conteúdo central */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/60 animate-fade-up delay-100">
                <Sparkles className="w-3 h-3 text-blue-400" />
                Nova senha segura em instantes
              </div>
              <h2 className="text-[2.5rem] font-extrabold leading-[1.12] tracking-tight animate-fade-up delay-150">
                Crie uma{" "}
                <span className="animate-shimmer-text text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-400">
                  senha segura
                </span>
              </h2>
              <p className="text-[14.5px] text-white/50 leading-relaxed max-w-sm animate-fade-up delay-200">
                Use o token recebido e escolha uma nova senha para recuperar o acesso à sua conta FilmPro.
              </p>
            </div>

            {/* Dicas de senha */}
            <div className="space-y-2.5 animate-fade-up delay-300">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                Dicas para uma boa senha
              </p>
              {[
                "Pelo menos 6 caracteres",
                "Misture letras maiúsculas e minúsculas",
                "Use números e símbolos",
                "Evite dados pessoais óbvios",
              ].map((tip) => (
                <div key={tip} className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60 shrink-0" />
                  <p className="text-[13px] text-white/50">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/25 animate-fade-in delay-500">© {new Date().getFullYear()} FilmPro Manager</p>
        </div>
      </div>

      {/* ── Painel direito ──────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-background relative overflow-hidden">

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
                <Lock className="w-3 h-3" />
                Nova senha
              </div>
              <h1 className="text-[1.75rem] font-bold tracking-tight">Redefinir senha</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Insira o token recebido e escolha uma nova senha.
              </p>
            </div>

            <Suspense fallback={<div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />}>
              <ResetPasswordForm />
            </Suspense>

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
              <div className="flex justify-center">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar ao login
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}

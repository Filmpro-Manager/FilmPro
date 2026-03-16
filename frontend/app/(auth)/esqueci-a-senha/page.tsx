"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Film, Loader2, ArrowLeft, Mail,
  ShieldCheck, KeyRound, BadgeCheck, Sparkles, RefreshCw, ArrowRight,
} from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validators";
import { apiForgotPassword, apiVerifyResetCode } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const CODE_EXPIRY_SECONDS = 60;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [sentEmail, setSentEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  function startCountdown() {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(CODE_EXPIRY_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function onSubmit(data: ForgotPasswordInput) {
    setErrorMsg("");
    try {
      await apiForgotPassword(data.email);
      setSentEmail(data.email);
      startCountdown();
      setStep("code");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao solicitar redefinição");
    }
  }

  async function handleResend() {
    setResending(true);
    setCodeError("");
    setCode("");
    try {
      await apiForgotPassword(sentEmail);
      startCountdown();
    } catch {
      // silencioso
    } finally {
      setResending(false);
    }
  }

  async function handleCodeSubmit() {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setCodeError("O código deve ter exatamente 6 dígitos");
      return;
    }
    setCodeError("");
    setVerifying(true);
    try {
      await apiVerifyResetCode(trimmed);
      router.push(`/redefinir-senha?token=${trimmed}`);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : "Código inválido ou expirado");
    } finally {
      setVerifying(false);
    }
  }

  const minutes = String(Math.floor(countdown / 60)).padStart(2, "0");
  const seconds = String(countdown % 60).padStart(2, "0");

  return (
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo ─────────────────────────── */}
      <div className="hidden lg:flex w-[55%] items-stretch bg-[#070c1a] text-white relative overflow-hidden">

        {/* Blobs flutuantes */}
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
                Recuperação de acesso segura
              </div>
              <h2 className="text-[2.5rem] font-extrabold leading-[1.12] tracking-tight animate-fade-up delay-150">
                Recupere o{" "}
                <span className="animate-shimmer-text text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-400">
                  acesso à sua conta
                </span>
              </h2>
              <p className="text-[14.5px] text-white/50 leading-relaxed max-w-sm animate-fade-up delay-200">
                Informe seu e-mail cadastrado e enviaremos um link para criar uma nova senha com segurança.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-3 animate-fade-up delay-300">
              {[
                { step: "01", label: "Informe seu e-mail", desc: "O e-mail usado no cadastro da conta" },
                { step: "02", label: "Receba o código no e-mail", desc: "Um código de 6 dígitos válido por 1 minuto" },
                { step: "03", label: "Crie uma nova senha", desc: "Escolha uma senha forte e segura" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-blue-400">{item.step}</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white/90">{item.label}</p>
                    <p className="text-[11px] text-white/40 mt-0.5 leading-tight">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/25 animate-fade-in delay-500">© {new Date().getFullYear()} FilmPro Manager</p>
        </div>
      </div>

      {/* ── Painel direito ──────────────────────────── */}
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

            {step === "email" ? (
              <>
                {/* Cabeçalho */}
                <div className="space-y-2 animate-slide-in-right">
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground px-2.5 py-1 rounded-full bg-muted border mb-1">
                    <KeyRound className="w-3 h-3" />
                    Recuperação de senha
                  </div>
                  <h1 className="text-[1.75rem] font-bold tracking-tight">Esqueceu a senha?</h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Informe seu e-mail e enviaremos um código para redefinir sua senha.
                  </p>
                </div>

                {/* Formulário de e-mail */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2 animate-slide-in-right delay-100">
                    <Label htmlFor="email" className="text-sm font-medium">Endereço de e-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        autoComplete="email"
                        {...register("email")}
                        className={cn(
                          "h-11 text-sm pl-9 transition-shadow focus:shadow-md focus:shadow-primary/10",
                          errors.email && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-destructive animate-fade-up">{errors.email.message}</p>
                    )}
                  </div>

                  {errorMsg && (
                    <div className="flex items-start gap-2.5 rounded-lg bg-destructive/8 border border-destructive/15 px-3.5 py-3 animate-scale-in">
                      <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                      <p className="text-xs text-destructive leading-relaxed">{errorMsg}</p>
                    </div>
                  )}

                  <div className="animate-slide-in-right delay-150">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        "Enviar código"
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Etapa 2: inserir código */
              <div className="space-y-6 animate-scale-in">
                {/* Cabeçalho */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground px-2.5 py-1 rounded-full bg-muted border mb-1">
                    <Mail className="w-3 h-3" />
                    Código enviado
                  </div>
                  <h1 className="text-[1.75rem] font-bold tracking-tight">Verifique seu e-mail</h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Enviamos um código de 6 dígitos para{" "}
                    <span className="font-semibold text-foreground">{sentEmail}</span>.
                  </p>
                </div>

                {/* Campo do código */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-sm font-medium">Código de verificação</Label>
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setCodeError("");
                      }}
                      className={cn(
                        "h-14 text-center text-2xl font-bold tracking-[0.4em] font-mono transition-shadow focus:shadow-md focus:shadow-primary/10",
                        codeError && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {codeError && (
                      <p className="text-xs text-destructive animate-fade-up">{codeError}</p>
                    )}
                  </div>

                  {/* Countdown */}
                  <div className="flex items-center justify-between">
                    {countdown > 0 ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          countdown <= 15 ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                        )} />
                        Expira em{" "}
                        <span className={cn(
                          "font-mono font-semibold",
                          countdown <= 15 ? "text-red-500" : "text-foreground"
                        )}>
                          {minutes}:{seconds}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500">Código expirado</p>
                    )}

                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={countdown > 0 || resending}
                      className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline underline-offset-4 disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline transition-opacity cursor-pointer"
                    >
                      {resending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Reenviar código
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCodeSubmit}
                    disabled={code.length < 6 || countdown === 0 || verifying}
                    className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-primary/20"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        Continuar
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Usar outro e-mail
                  </button>
                </div>
              </div>
            )}

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

"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Camera, Loader2, CheckCircle2, AlertCircle,
  Eye, EyeOff, Lock, Mail, Phone, User as UserIcon, Pencil,
} from "lucide-react";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validators";
import { useAuthStore } from "@/store/auth-store";
import { apiGetProfile } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, token, updateUserProfile } = useAuthStore();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar ?? null);
  const [avatarBase64, setAvatarBase64] = useState<string | null | undefined>(undefined);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user?.name ?? "", phone: "" },
  });

  useEffect(() => {
    if (!token) return;
    apiGetProfile(token)
      .then((profile) => {
        reset({ name: profile.name, phone: profile.phone });
        if (profile.avatarUrl) setAvatarPreview(profile.avatarUrl);
      })
      .catch(() => reset({ name: user?.name ?? "", phone: "" }));
  }, [token]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: "error", message: "A foto deve ter no máximo 2 MB." });
      return;
    }
    setLoadingAvatar(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      setAvatarBase64(base64);
      setLoadingAvatar(false);
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatarPreview(null);
    setAvatarBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(data: UpdateProfileInput) {
    setFeedback(null);
    const payload: Parameters<typeof updateUserProfile>[0] = {
      name: data.name,
      phone: data.phone,
    };
    if (avatarBase64 !== undefined) payload.avatarUrl = avatarBase64;
    if (data.newPassword) {
      payload.currentPassword = data.currentPassword;
      payload.newPassword = data.newPassword;
    }
    const result = await updateUserProfile(payload);
    if (result.success) {
      setFeedback({ type: "success", message: "Perfil atualizado com sucesso!" });
      setAvatarBase64(undefined);
      reset((values) => ({ ...values, currentPassword: "", newPassword: "", confirmNewPassword: "" }));
    } else {
      setFeedback({ type: "error", message: result.error ?? "Erro ao atualizar perfil." });
    }
  }

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w) => w[0].toUpperCase()).join("")
    : "?";

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Hero card ─────────────────────────────────────────── */}
      <div className="relative rounded-2xl border bg-card overflow-hidden">
        {/* Faixa decorativa */}
        <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />

        <div className="px-6 pb-6 -mt-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          {/* Avatar + identidade */}
          <div className="flex items-end gap-4">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-full ring-4 ring-background shadow-lg bg-primary overflow-hidden flex items-center justify-center">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {loadingAvatar
                  ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                  : <Camera className="w-5 h-5 text-white" />
                }
              </button>
            </div>

            <div className="mb-1 space-y-0.5">
              <h1 className="text-lg font-bold leading-tight">{user?.name ?? "—"}</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          {/* Botões da foto */}
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium hover:bg-accent transition-colors cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
              Alterar foto
            </button>
            {avatarPreview && (
              <button
                type="button"
                onClick={removeAvatar}
                className="h-8 px-3 rounded-lg border border-destructive/30 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
              >
                Remover
              </button>
            )}
          </div>
        </div>

        <p className="px-6 pb-4 text-xs text-muted-foreground -mt-2">
          JPG, PNG ou WebP · Máximo 2 MB
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Dados pessoais ────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b bg-muted/30">
            <UserIcon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Dados pessoais</h2>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Nome completo
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    {...register("name")}
                    className={cn(
                      "h-10 text-sm pl-9",
                      errors.name && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </div>
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Telefone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    {...register("phone")}
                    className={cn(
                      "h-10 text-sm pl-9",
                      errors.phone && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </div>
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={user?.email ?? ""}
                  readOnly
                  disabled
                  className="h-10 text-sm pl-9 bg-muted/50 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
            </div>
          </div>
        </div>

        {/* ── Alterar senha ─────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b bg-muted/30">
            <Lock className="w-4 h-4 text-primary" />
            <div>
              <h2 className="text-sm font-semibold">Alterar senha</h2>
              <p className="text-xs text-muted-foreground">Deixe em branco para não alterar.</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Senha atual
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPwd ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("currentPassword")}
                  className={cn(
                    "h-10 text-sm pr-10",
                    errors.currentPassword && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <button type="button" onClick={() => setShowCurrentPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" tabIndex={-1}>
                  {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Nova senha
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPwd ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register("newPassword")}
                    className={cn(
                      "h-10 text-sm pr-10",
                      errors.newPassword && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <button type="button" onClick={() => setShowNewPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" tabIndex={-1}>
                    {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Confirmar nova senha
                </Label>
                <div className="relative">
                  <Input
                    id="confirmNewPassword"
                    type={showConfirmPwd ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register("confirmNewPassword")}
                    className={cn(
                      "h-10 text-sm pr-10",
                      errors.confirmNewPassword && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <button type="button" onClick={() => setShowConfirmPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" tabIndex={-1}>
                    {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmNewPassword && <p className="text-xs text-destructive">{errors.confirmNewPassword.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Feedback ─────────────────────────────────────────── */}
        {feedback && (
          <div className={cn(
            "flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm border",
            feedback.type === "success"
              ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : "bg-destructive/8 border-destructive/20 text-destructive"
          )}>
            {feedback.type === "success"
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />
            }
            {feedback.message}
          </div>
        )}

        {/* ── Ações ────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-primary/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar alterações"
            )}
          </button>
        </div>

      </form>
    </div>
  );
}


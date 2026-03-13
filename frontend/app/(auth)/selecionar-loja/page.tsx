"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Film, MapPin, Loader2, LogOut, ArrowRight,
  Store, Building2, ChevronRight, AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { apiGetStores, type StoreOption } from "@/lib/api";

export default function SelecionarLojaPage() {
  const { user, token, logout, setActiveStore } = useAuthStore();
  const router = useRouter();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) { router.replace("/login"); return; }
    if (user.role !== "owner") { router.replace("/dashboard"); return; }

    apiGetStores(user.companyId!, token)
      .then(setStores)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, token, router]);

  function handleSelectStore(store: StoreOption) {
    setSelecting(store.id);
    setActiveStore(store.id);
    router.push("/dashboard");
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?";

  const activeStores = stores.filter((s) => s.status === "active");
  const inactiveStores = stores.filter((s) => s.status !== "active");

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Header ─────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#070c1a]/95 backdrop-blur-sm sticky top-0 z-20 border-b border-white/[0.06] animate-fade-in">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shadow-sm shadow-blue-600/40 animate-glow-pulse">
            <Film className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">FilmPro Manager</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-white/[0.06]"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </header>

      {/* ── Hero ───────────────────────────────────────── */}
      <div className="bg-[#070c1a] text-white relative overflow-hidden">
        {/* Blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="animate-float absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[100px]" />
          <div className="animate-float-reverse absolute -bottom-10 right-0 w-[300px] h-[300px] rounded-full bg-indigo-600/8 blur-[80px]" />
        </div>
        {/* Grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
          {/* Avatar + saudação */}
          <div className="flex items-center gap-5 animate-fade-up">
            <div className="relative shrink-0">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/25 text-blue-200 font-bold text-xl">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#070c1a]" />
            </div>
            <div>
              <p className="text-sm text-white/45 mb-0.5">Olá,</p>
              <h1 className="text-2xl font-bold tracking-tight">{user?.name}</h1>
              <p className="text-sm text-white/40 mt-0.5">
                {loading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> carregando...
                  </span>
                ) : (
                  <span>
                    {activeStores.length} {activeStores.length === 1 ? "loja disponível" : "lojas disponíveis"}
                    {inactiveStores.length > 0 && ` · ${inactiveStores.length} inativa${inactiveStores.length > 1 ? "s" : ""}`}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Heading */}
          <div className="mt-8 space-y-1.5 animate-fade-up delay-100">
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
              Qual loja você vai{" "}
              <span className="animate-shimmer-text text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-400">
                gerenciar hoje?
              </span>
            </h2>
            <p className="text-[14px] text-white/45 leading-relaxed">
              Selecione uma unidade para acessar o painel de controle.
            </p>
          </div>
        </div>
      </div>

      {/* ── Lista de lojas ─────────────────────────────── */}
      <main className="flex-1 bg-background">
        <div className="max-w-2xl mx-auto px-6 py-8">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Carregando suas lojas...</p>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl bg-destructive/8 border border-destructive/15 px-4 py-3.5 animate-scale-in">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Lojas ativas */}
          {!loading && !error && (
            <div className="space-y-6">

              {stores.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-up">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">Nenhuma loja encontrada</p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Sua conta não possui lojas associadas. Entre em contato com o suporte.
                    </p>
                  </div>
                </div>
              )}

              {/* Lojas ativas */}
              {activeStores.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 animate-fade-up">
                    Disponíveis
                  </p>
                  <div className="space-y-2">
                    {activeStores.map((store, i) => {
                      const isLoading = selecting === store.id;
                      return (
                        <button
                          key={store.id}
                          onClick={() => handleSelectStore(store)}
                          disabled={!!selecting}
                          style={{ animationDelay: `${i * 70}ms` }}
                          className={[
                            "animate-fade-up group w-full rounded-xl border bg-card text-left transition-all duration-200",
                            "flex items-center gap-4 p-4",
                            "hover:border-primary hover:shadow-md hover:shadow-primary/8 active:scale-[0.99] cursor-pointer",
                            selecting && !isLoading ? "opacity-40 pointer-events-none" : "",
                          ].join(" ")}
                        >
                          {/* Ícone */}
                          <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-primary/8 border border-primary/12 group-hover:bg-primary/15 group-hover:border-primary/20 group-hover:scale-105 transition-all duration-200">
                            {isLoading
                              ? <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              : <Store className="w-5 h-5 text-primary" />}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                              {store.nomeFantasia || store.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate italic">
                              {store.name}
                            </p>
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{store.addressCity}, {store.addressState}</span>
                            </div>
                          </div>

                          {/* Badge ativa + seta */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/15">
                              Ativa
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lojas inativas */}
              {inactiveStores.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 animate-fade-up">
                    Inativas
                  </p>
                  <div className="space-y-2">
                    {inactiveStores.map((store, i) => (
                      <div
                        key={store.id}
                        style={{ animationDelay: `${(activeStores.length + i) * 70}ms` }}
                        className="animate-fade-up flex items-center gap-4 p-4 rounded-xl border border-dashed bg-muted/30 opacity-50"
                      >
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-muted">
                          <Store className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm leading-tight text-muted-foreground">
                            {store.nomeFantasia || store.name}
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{store.addressCity}, {store.addressState}</span>
                          </div>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border shrink-0">
                          Inativa
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

    </div>
  );
}



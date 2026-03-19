"use client";

import { useState, useEffect } from "react";
import { Settings2, ShieldCheck, Sliders, Save, Check } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// ─── Local settings persisted in localStorage ─────────────────────────────────

const STORAGE_KEY = "filmPro:sysSettings";

interface SysSettings {
  quoteDaysValid: number;
  defaultPaymentMethod: string;
  defaultQuoteNotes: string;
  defaultOsNotes: string;
  currency: string;
}

const DEFAULT_SETTINGS: SysSettings = {
  quoteDaysValid: 30,
  defaultPaymentMethod: "PIX",
  defaultQuoteNotes: "",
  defaultOsNotes: "",
  currency: "BRL",
};

function loadSettings(): SysSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: SysSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ─── Permissions Matrix ───────────────────────────────────────────────────────

type Role = "OWNER" | "MANAGER" | "EMPLOYEE";

const PERMISSIONS: Array<{ feature: string; owner: boolean; manager: boolean; employee: boolean }> = [
  { feature: "Visualizar dashboard",       owner: true,  manager: true,  employee: true  },
  { feature: "Gerenciar agenda",           owner: true,  manager: true,  employee: true  },
  { feature: "Criar orçamentos",           owner: true,  manager: true,  employee: false },
  { feature: "Aprovar orçamentos",         owner: true,  manager: true,  employee: false },
  { feature: "Ver valores de orçamentos",  owner: true,  manager: true,  employee: false },
  { feature: "Gerenciar clientes",         owner: true,  manager: true,  employee: true  },
  { feature: "Visualizar financeiro",      owner: true,  manager: true,  employee: false },
  { feature: "Lançar receitas/despesas",   owner: true,  manager: true,  employee: false },
  { feature: "Gerenciar estoque",          owner: true,  manager: true,  employee: false },
  { feature: "Gerenciar equipe",           owner: true,  manager: true,  employee: false },
  { feature: "Ver metas",                  owner: true,  manager: true,  employee: false },
  { feature: "Ver relatórios",             owner: true,  manager: false, employee: false },
  { feature: "Configurar empresa",         owner: true,  manager: false, employee: false },
  { feature: "Configurações do sistema",   owner: true,  manager: false, employee: false },
];

function PermBadge({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
    </span>
  ) : (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted">
      <span className="w-2 h-0.5 bg-muted-foreground/40 rounded-full" />
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SistemaPage() {
  const [settings, setSettings] = useState<SysSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function update(key: keyof SysSettings, value: string | number) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações do Sistema"
        description="Permissões de acesso, valores padrão e preferências gerais"
      />

      <Tabs defaultValue="permissoes">
        <TabsList>
          <TabsTrigger value="permissoes" className="gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Permissões
          </TabsTrigger>
          <TabsTrigger value="padroes" className="gap-1.5">
            <Sliders className="w-4 h-4" />
            Padrões
          </TabsTrigger>
          <TabsTrigger value="ajustes" className="gap-1.5">
            <Settings2 className="w-4 h-4" />
            Ajustes
          </TabsTrigger>
        </TabsList>

        {/* ── Permissões ─────────────────────────────────────────────── */}
        <TabsContent value="permissoes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Permissões</CardTitle>
              <CardDescription>
                Recurso de acesso por perfil de usuário. As permissões são fixas e controladas pelo sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 pl-6 font-medium text-muted-foreground">Funcionalidade</th>
                      <th className="text-center p-3 w-28 font-medium">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">Proprietário</span>
                      </th>
                      <th className="text-center p-3 w-28 font-medium">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">Gerente</span>
                      </th>
                      <th className="text-center p-3 w-28 font-medium">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">Colaborador</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {PERMISSIONS.map((row) => (
                      <tr key={row.feature} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 pl-6 text-foreground">{row.feature}</td>
                        <td className="p-3 text-center"><PermBadge allowed={row.owner} /></td>
                        <td className="p-3 text-center"><PermBadge allowed={row.manager} /></td>
                        <td className="p-3 text-center"><PermBadge allowed={row.employee} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Padrões ────────────────────────────────────────────────── */}
        <TabsContent value="padroes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Valores Padrão</CardTitle>
              <CardDescription>
                Esses valores são aplicados automaticamente ao criar novos documentos. Salvos localmente neste dispositivo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="quoteDaysValid">Validade padrão de orçamento (dias)</Label>
                  <Input
                    id="quoteDaysValid"
                    type="number"
                    min={1}
                    max={365}
                    value={settings.quoteDaysValid}
                    onChange={(e) => update("quoteDaysValid", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Padrão: 30 dias</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="defaultPaymentMethod">Forma de pagamento padrão</Label>
                  <Select
                    value={settings.defaultPaymentMethod}
                    onValueChange={(v) => update("defaultPaymentMethod", v)}
                  >
                    <SelectTrigger id="defaultPaymentMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["PIX", "Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Transferência"].map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="defaultQuoteNotes">Observações padrão em orçamentos</Label>
                <Textarea
                  id="defaultQuoteNotes"
                  rows={3}
                  placeholder="Ex.: Serviço com garantia de 90 dias. Pagamento antecipado de 50%."
                  value={settings.defaultQuoteNotes}
                  onChange={(e) => update("defaultQuoteNotes", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="defaultOsNotes">Observações padrão em ordens de serviço</Label>
                <Textarea
                  id="defaultOsNotes"
                  rows={3}
                  placeholder="Ex.: Veículo inspecionado antes e após o serviço."
                  value={settings.defaultOsNotes}
                  onChange={(e) => update("defaultOsNotes", e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} className="gap-2">
                  {saved ? (
                    <><Check className="w-4 h-4" /> Salvo!</>
                  ) : (
                    <><Save className="w-4 h-4" /> Salvar padrões</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Ajustes ────────────────────────────────────────────────── */}
        <TabsContent value="ajustes" className="mt-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Moeda</CardTitle>
                <CardDescription>Moeda utilizada nos relatórios e documentos.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 max-w-xs">
                  <Select
                    value={settings.currency}
                    onValueChange={(v) => update("currency", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real Brasileiro (R$)</SelectItem>
                      <SelectItem value="USD">Dólar Americano ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5 shrink-0">
                    {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    {saved ? "Salvo" : "Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sobre o Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-40">Nome</dt>
                    <dd className="font-medium">FilmPro</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-40">Versão</dt>
                    <dd className="font-medium">1.0.0</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-40">Suporte</dt>
                    <dd className="font-medium">suporte@filmpro.com.br</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

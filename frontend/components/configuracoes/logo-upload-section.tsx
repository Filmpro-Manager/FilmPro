"use client";

import { useRef, useState } from "react";
import { useCompanyStore } from "@/store/company-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, ImagePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ACCEPTED = ["image/png", "image/jpeg", "image/svg+xml"];
const MAX_MB = 2;

export function LogoUploadSection() {
  const { settings, update, removeLogo } = useCompanyStore();
  const [preview, setPreview] = useState<string | undefined>(settings.logoUrl);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG ou SVG.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Tamanho máximo permitido: ${MAX_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!preview || preview === settings.logoUrl) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    update({ logoUrl: preview });
    setSaving(false);
    toast.success("Logo atualizada com sucesso.");
  }

  function handleRemove() {
    removeLogo();
    setPreview(undefined);
    if (fileRef.current) fileRef.current.value = "";
    toast.success("Logo removida.");
  }

  const hasChanges = preview !== settings.logoUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Logotipo</CardTitle>
        <CardDescription>
          Exibido na barra lateral. Aceita PNG, JPG ou SVG — máximo {MAX_MB}MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-start gap-6">
        <div
          className={cn(
            "flex items-center justify-center w-28 h-28 rounded-xl border-2 border-dashed border-border bg-muted/40 shrink-0 overflow-hidden",
            preview && "border-solid"
          )}
        >
          {preview ? (
            <img src={preview} alt="Logo" className="w-full h-full object-contain p-2" />
          ) : (
            <Film className="w-9 h-9 text-muted-foreground/40" />
          )}
        </div>

        <div className="flex flex-col gap-3 flex-1 pt-1">
          <p className="text-sm text-muted-foreground">
            A logo substitui o ícone padrão na sidebar e é usada em documentos gerados.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="w-4 h-4 mr-2" />
              {preview ? "Substituir" : "Enviar logo"}
            </Button>
            {preview && (
              <>
                {hasChanges && (
                  <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar logo"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleRemove}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </Button>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.svg"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}

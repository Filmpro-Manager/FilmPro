"use client";

import { FileText } from "lucide-react";

export default function NotasFiscaisPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in-up">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-muted">
        <FileText className="w-10 h-10 text-muted-foreground" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Em breve</h1>
        <p className="text-muted-foreground max-w-sm">
          O módulo de Notas Fiscais está sendo desenvolvido e estará disponível em breve.
        </p>
      </div>
    </div>
  );
}


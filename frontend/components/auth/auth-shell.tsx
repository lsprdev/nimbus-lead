import type { ReactNode } from "react";
import { Quote } from "lucide-react";

import { BrandWordmark } from "@/components/brand";
import AITextLoading from "@/components/kokonutui/ai-text-loading";
import { ThemeToggle } from "@/components/theme-toggle";

const LEAD_LOADING_PHRASES = [
  "Encontrando contatos em São Paulo, SP...",
  "Filtrando empresas por segmento...",
  "Validando telefones e endereços...",
  "Montando lista de prospecção...",
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Painel do formulário */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <BrandWordmark />
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex flex-col gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground text-pretty">
                {subtitle}
              </p>
            </div>
            {children}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground lg:text-left">
          © {new Date().getFullYear()} Karta Pro. Todos os direitos reservados.
        </p>
      </div>

      {/* Painel decorativo */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <ThemeToggle className="absolute right-8 top-8 z-10 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground" />
        <div className="auth-dot-wave" aria-hidden="true" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden="true"
        />
        <div className="relative" />
        <div className="relative mt-8 max-w-md">
          <Quote className="mb-4 size-8 opacity-60" />
          <p className="text-2xl font-medium leading-relaxed text-balance">
            Encontre empresas por segmento e região, acompanhe os contatos
            encontrados e organize listas prontas para prospecção.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/15 font-semibold">
              EK
            </div>
            <div>
              <p className="font-brand font-medium">Equipe Karta</p>
              <p className="text-sm opacity-70">Lead Intelligence</p>
            </div>
          </div>
        </div>
        <div className="relative text-primary-foreground">
          <AITextLoading
            texts={LEAD_LOADING_PHRASES}
            interval={1800}
            className="max-w-full text-2xl leading-tight whitespace-nowrap lg:text-2xl"
          />
        </div>
      </div>
    </main>
  );
}

import type { ReactNode } from 'react'
import { Quote } from 'lucide-react'

import { BrandWordmark } from '@/components/brand'

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Painel do formulário */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <BrandWordmark />
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex flex-col gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
              <p className="text-sm text-muted-foreground text-pretty">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground lg:text-left">
          © {new Date().getFullYear()} Nimbus. Todos os direitos reservados.
        </p>
      </div>

      {/* Painel decorativo */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />
        <div className="relative">
          <span className="inline-flex items-center rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium">
            Leads Finder
          </span>
        </div>
        <div className="relative max-w-md">
          <Quote className="mb-4 size-8 opacity-60" />
          <p className="text-2xl font-medium leading-relaxed text-balance">
            Encontre empresas no Google Maps, acompanhe cada contato em tempo real e organize
            listas prontas para prospecção.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/15 font-semibold">
              NB
            </div>
            <div>
              <p className="font-medium">Equipe Nimbus</p>
              <p className="text-sm opacity-70">Lead Intelligence</p>
            </div>
          </div>
        </div>
        <div className="relative flex gap-8 text-sm opacity-80">
          <div>
            <p className="text-2xl font-semibold opacity-100">60+</p>
            <p>Resultados</p>
          </div>
          <div>
            <p className="text-2xl font-semibold opacity-100">Maps</p>
            <p>Origem</p>
          </div>
          <div>
            <p className="text-2xl font-semibold opacity-100">Live</p>
            <p>Mapa</p>
          </div>
        </div>
      </div>
    </main>
  )
}

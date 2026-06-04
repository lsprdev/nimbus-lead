'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { normalizeList, statusLabel, type LeadList } from '@/lib/leads'
import { useAuth } from '@/lib/auth'

export default function SearchPage() {
  const router = useRouter()
  const { authFetch } = useAuth()
  const [lists, setLists] = React.useState<LeadList[]>([])
  const [loadingLists, setLoadingLists] = React.useState(true)
  const [creating, setCreating] = React.useState(false)

  const loadLists = React.useCallback(async () => {
    setLoadingLists(true)
    try {
      const response = await authFetch('/api/lead-lists')
      const payload = await response.json().catch(() => [])

      if (!response.ok) {
        throw new Error('Não foi possível carregar suas listas.')
      }

      setLists(Array.isArray(payload) ? payload.map(normalizeList) : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar listas.')
    } finally {
      setLoadingLists(false)
    }
  }, [authFetch])

  React.useEffect(() => {
    void loadLists()
  }, [loadLists])

  async function handleCreateList(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '')
    const searchTerm = String(formData.get('searchTerm') ?? '')
    const location = String(formData.get('location') ?? '')

    try {
      const response = await authFetch('/api/lead-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, searchTerm, location }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Não foi possível criar a lista.')
      }

      const list = normalizeList(payload)
      toast.success('Lista criada. A busca foi iniciada.')
      router.push(`/dashboard/listas/${list.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar lista.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <DashboardHeader title="Buscar" />
      <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Buscar contatos
          </h1>
          <p className="text-sm text-muted-foreground">
            Crie uma lista com uma palavra-chave e acompanhe os contatos encontrados no mapa.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Nova lista</CardTitle>
              <CardDescription>
                Esses campos seguem o endpoint de criação de listas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateList} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Nome da lista</Label>
                  <Input id="name" name="name" placeholder="Restaurantes em São Paulo" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="searchTerm">Palavra-chave</Label>
                  <Input
                    id="searchTerm"
                    name="searchTerm"
                    placeholder="restaurantes japoneses"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="location">Localização</Label>
                  <Input id="location" name="location" placeholder="São Paulo, SP" />
                </div>
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Criar lista
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Listas recentes</CardTitle>
              <CardDescription>
                Continue acompanhando buscas em andamento ou revise listas finalizadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {loadingLists ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : lists.length ? (
                lists.map((list) => (
                  <Link
                    key={list.id}
                    href={`/dashboard/listas/${list.id}`}
                    className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Search className="size-4 text-muted-foreground" />
                          <p className="truncate text-sm font-medium">{list.name}</p>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {list.search_term}
                          {list.location ? ` em ${list.location}` : null}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="secondary">{statusLabel(list.status)}</Badge>
                        <span className="text-sm text-muted-foreground">{list.total_found}</span>
                        <ArrowRight className="size-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
                  <Search className="size-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Nenhuma lista criada</p>
                    <p className="text-xs text-muted-foreground">
                      Crie sua primeira busca para começar a coletar contatos.
                    </p>
                  </div>
                </div>
              )}
              <Separator />
              <p className="text-xs text-muted-foreground">
                O backend executa a busca em segundo plano e salva cada contato assim que ele é encontrado.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

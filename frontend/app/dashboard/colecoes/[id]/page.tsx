'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Phone, Search, Star } from 'lucide-react'
import { toast } from 'sonner'

import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { RadixBookmarkIcon } from '@/components/icons/radix-bookmark-icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth'
import {
  normalizeContactCollection,
  type ContactCollection,
} from '@/lib/collections'
import { normalizeContact, type Contact } from '@/lib/leads'
import { cn } from '@/lib/utils'

type CollectionContactsPayload = {
  collection?: Partial<ContactCollection>
  contacts?: Partial<Contact>[]
}

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function ratingValue(contact: Contact) {
  const value = Number.parseFloat(String(contact.rating ?? '').replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

function hasHighRating(contact: Contact) {
  const value = ratingValue(contact)
  return value !== null && value >= 4.5
}

export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const { authFetch } = useAuth()
  const [collection, setCollection] = React.useState<ContactCollection | null>(null)
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [query, setQuery] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadCollectionContacts() {
      setLoading(true)
      try {
        const response = await authFetch(`/api/contact-collections/${id}/contacts`)
        const payload: CollectionContactsPayload = await response
          .json()
          .catch(() => ({}))
        if (!response.ok) {
          throw new Error(
            (payload as { message?: string })?.message ??
              'Não foi possível carregar a coleção.',
          )
        }

        setCollection(normalizeContactCollection(payload.collection ?? {}))
        setContacts(
          Array.isArray(payload.contacts)
            ? payload.contacts.map(normalizeContact)
            : [],
        )
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Erro ao carregar coleção.',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadCollectionContacts()
  }, [authFetch, id])

  const filteredContacts = React.useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query.trim())
    if (!normalizedQuery) return contacts

    return contacts.filter((contact) =>
      normalizeSearchValue(
        [contact.name, contact.category, contact.phone].join(' '),
      ).includes(normalizedQuery),
    )
  }, [contacts, query])

  const title = collection?.name || 'Coleção'

  return (
    <>
      <DashboardHeader title={title} />
      <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5">
          <Button
            asChild
            variant="ghost"
            className="w-fit gap-2 px-0 hover:bg-transparent"
          >
            <Link href="/dashboard/colecoes">
              <ArrowLeft className="size-4" />
              Voltar para coleções
            </Link>
          </Button>

          <div className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {loading ? (
                <Skeleton className="size-14 rounded-2xl" />
              ) : (
                <span
                  className="flex size-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: `${collection?.color ?? '#2563eb'}1A`,
                    color: collection?.color ?? '#2563eb',
                  }}
                >
                  <RadixBookmarkIcon className="size-7" />
                </span>
              )}
              <div className="min-w-0">
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="mt-2 h-5 w-32" />
                  </>
                ) : (
                  <>
                    <h1 className="truncate text-2xl font-semibold tracking-tight">
                      {title}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {contacts.length.toLocaleString('pt-BR')}{' '}
                      {contacts.length === 1 ? 'contato salvo' : 'contatos salvos'}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="relative min-w-0 sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar nome, categoria ou telefone..."
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : filteredContacts.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredContacts.map((contact) => (
              <CollectionContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        ) : (
          <Empty className="min-h-80 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search />
              </EmptyMedia>
              <EmptyTitle>Nenhum contato encontrado</EmptyTitle>
              <EmptyDescription>
                {contacts.length
                  ? 'Ajuste a busca para ver os contatos desta coleção.'
                  : 'Esta coleção ainda não tem contatos salvos.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </>
  )
}

function CollectionContactCard({ contact }: { contact: Contact }) {
  return (
    <div className="min-w-0 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 text-lg font-semibold leading-7">
              {contact.name}
            </p>
            {contact.rating ? (
              <Badge
                className={cn(
                  'gap-1 rounded-full px-2.5 py-1 text-sm',
                  hasHighRating(contact)
                    ? 'bg-emerald-500 text-white hover:bg-emerald-500'
                    : '',
                )}
                variant={hasHighRating(contact) ? 'default' : 'outline'}
              >
                <Star className="size-3.5 fill-current" />
                {contact.rating}
              </Badge>
            ) : null}
          </div>
          {contact.category ? (
            <p className="mt-2 truncate text-sm text-muted-foreground">
              {contact.category}
            </p>
          ) : null}
        </div>
        {contact.place_url ? (
          <Button asChild variant="outline" size="icon" className="shrink-0 rounded-xl">
            <a href={contact.place_url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
            </a>
          </Button>
        ) : null}
      </div>

      {contact.phone ? (
        <div className="mt-5 grid min-w-0 grid-cols-[1.25rem_1fr] items-center gap-3 text-sm text-muted-foreground">
          <Phone className="size-5" />
          <span className="min-w-0 truncate">{contact.phone}</span>
        </div>
      ) : null}
    </div>
  )
}

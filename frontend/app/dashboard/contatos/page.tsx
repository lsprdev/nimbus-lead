'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ExternalLink,
  FilterX,
  Globe2,
  Layers3,
  Phone,
  Search,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'

import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/lib/auth'
import { normalizeContact, normalizeList, type Contact, type LeadList } from '@/lib/leads'
import { cn } from '@/lib/utils'

const ALL_FILTER_VALUE = 'all'

type ContactQualityFilter = 'all' | 'phone' | 'website' | 'high-rating'

type ContactSegment = {
  key: string
  title: string
  lists: LeadList[]
  contacts: Contact[]
  locations: string[]
}

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function segmentKey(list?: LeadList) {
  return normalizeSearchValue(list?.search_term || list?.name || 'sem-segmento')
}

function segmentTitle(list?: LeadList) {
  const value = (list?.name || list?.search_term || 'Sem segmento').trim()
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function ratingValue(contact: Contact) {
  const value = Number.parseFloat(String(contact.rating ?? '').replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

function hasHighRating(contact: Contact) {
  const value = ratingValue(contact)
  return value !== null && value >= 4.5
}

function buildSegments(contacts: Contact[], listsById: Record<string, LeadList>) {
  const groups = new Map<string, ContactSegment>()

  contacts.forEach((contact) => {
    const list = listsById[contact.list]
    const key = segmentKey(list)
    const current = groups.get(key) ?? {
      key,
      title: segmentTitle(list),
      lists: [],
      contacts: [],
      locations: [],
    }

    current.contacts.push(contact)
    if (list && !current.lists.some((item) => item.id === list.id)) {
      current.lists.push(list)
    }
    if (list?.location && !current.locations.includes(list.location)) {
      current.locations.push(list.location)
    }

    groups.set(key, current)
  })

  return Array.from(groups.values()).sort((a, b) => b.contacts.length - a.contacts.length)
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export default function ContactsPage() {
  const { authFetch } = useAuth()
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [listsById, setListsById] = React.useState<Record<string, LeadList>>({})
  const [query, setQuery] = React.useState('')
  const [segmentFilter, setSegmentFilter] = React.useState(ALL_FILTER_VALUE)
  const [locationFilter, setLocationFilter] = React.useState(ALL_FILTER_VALUE)
  const [qualityFilter, setQualityFilter] = React.useState<ContactQualityFilter>('all')
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadContacts() {
      setLoading(true)
      try {
        const listsResponse = await authFetch('/api/lead-lists')
        const listsPayload = await listsResponse.json().catch(() => [])

        if (!listsResponse.ok) {
          throw new Error('Não foi possível carregar suas listas.')
        }

        const lists = Array.isArray(listsPayload) ? listsPayload.map(normalizeList) : []
        const nextListsById = Object.fromEntries(lists.map((list) => [list.id, list]))
        setListsById(nextListsById)

        const contactGroups = await Promise.all(
          lists.map(async (list) => {
            const response = await authFetch(`/api/lead-lists/${list.id}/contacts`)
            const payload = await response.json().catch(() => [])
            return response.ok && Array.isArray(payload) ? payload.map(normalizeContact) : []
          }),
        )

        setContacts(contactGroups.flat())
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar contatos.')
      } finally {
        setLoading(false)
      }
    }

    void loadContacts()
  }, [authFetch])

  const lists = React.useMemo(() => Object.values(listsById), [listsById])
  const segments = React.useMemo(() => buildSegments(contacts, listsById), [contacts, listsById])
  const segmentOptions = React.useMemo(
    () => segments.map((segment) => ({ value: segment.key, label: segment.title })),
    [segments],
  )
  const locationOptions = React.useMemo(
    () => uniqueValues(lists.map((list) => list.location)),
    [lists],
  )

  const filteredContacts = React.useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query.trim())

    return contacts.filter((contact) => {
      const list = listsById[contact.list]
      const haystack = normalizeSearchValue(
        [
          contact.name,
          contact.category,
          contact.address,
          contact.phone,
          contact.website,
          list?.name,
          list?.search_term,
          list?.location,
        ].join(' '),
      )

      if (normalizedQuery && !haystack.includes(normalizedQuery)) return false
      if (segmentFilter !== ALL_FILTER_VALUE && segmentKey(list) !== segmentFilter) return false
      if (locationFilter !== ALL_FILTER_VALUE && list?.location !== locationFilter) return false
      if (qualityFilter === 'phone' && !contact.phone) return false
      if (qualityFilter === 'website' && !contact.website) return false
      if (qualityFilter === 'high-rating' && !hasHighRating(contact)) return false

      return true
    })
  }, [contacts, listsById, query, segmentFilter, locationFilter, qualityFilter])

  const contactsWithPhone = contacts.filter((contact) => Boolean(contact.phone)).length
  const contactsWithWebsite = contacts.filter((contact) => Boolean(contact.website)).length
  const strongContacts = contacts.filter(hasHighRating).length
  const hasActiveFilters =
    query ||
    segmentFilter !== ALL_FILTER_VALUE ||
    locationFilter !== ALL_FILTER_VALUE ||
    qualityFilter !== 'all'

  function resetFilters() {
    setQuery('')
    setSegmentFilter(ALL_FILTER_VALUE)
    setLocationFilter(ALL_FILTER_VALUE)
    setQualityFilter('all')
  }

  return (
    <>
      <DashboardHeader title="Contatos" />
      <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Contatos</h1>
          <p className="text-sm text-muted-foreground">
            Explore a base por segmento, localidade e qualidade dos dados coletados.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ContactMetricCard
            title="Contatos"
            value={contacts.length}
            icon={Layers3}
            loading={loading}
            tone="blue"
          />
          <ContactMetricCard
            title="Com telefone"
            value={contactsWithPhone}
            icon={Phone}
            loading={loading}
            tone="green"
          />
          <ContactMetricCard
            title="Com site"
            value={contactsWithWebsite}
            icon={Globe2}
            loading={loading}
            tone="violet"
          />
          <ContactMetricCard
            title="Notas altas"
            value={strongContacts}
            icon={Star}
            loading={loading}
            tone="amber"
          />
        </div>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Base de contatos</CardTitle>
                <CardDescription>
                  {filteredContacts.length.toLocaleString('pt-BR')} de{' '}
                  {contacts.length.toLocaleString('pt-BR')} contatos visíveis
                </CardDescription>
              </div>
              {hasActiveFilters ? (
                <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                  <FilterX className="size-4" />
                  Limpar filtros
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_160px]">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar nome, categoria, telefone..."
                  className="pl-9"
                />
              </div>

              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL_FILTER_VALUE}>Todos os segmentos</SelectItem>
                    {segmentOptions.map((segment) => (
                      <SelectItem key={segment.value} value={segment.value}>
                        {segment.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Localidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL_FILTER_VALUE}>Todas as localidades</SelectItem>
                    {locationOptions.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select
                value={qualityFilter}
                onValueChange={(value) => setQualityFilter(value as ContactQualityFilter)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Qualidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="phone">Com telefone</SelectItem>
                    <SelectItem value="website">Com site</SelectItem>
                    <SelectItem value="high-rating">Nota 4.5+</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="flex min-w-0 flex-col gap-5">
            {loading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : filteredContacts.length ? (
              <div className="min-w-0 overflow-hidden rounded-xl border">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[32%] px-4">Nome</TableHead>
                      <TableHead>Segmento</TableHead>
                      <TableHead>Localidade</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Avaliação</TableHead>
                      <TableHead className="text-right">Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => {
                      const list = listsById[contact.list]

                      return (
                        <TableRow key={contact.id}>
                          <TableCell className="max-w-[320px] px-4">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{contact.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {contact.category || contact.address || 'Sem categoria'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {list ? (
                              <Link
                                href={`/dashboard/listas/${contact.list}`}
                                className="inline-flex max-w-[220px] truncate hover:underline"
                              >
                                {segmentTitle(list)}
                              </Link>
                            ) : (
                              'Lista'
                            )}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate">
                            {list?.location || '-'}
                          </TableCell>
                          <TableCell>{contact.phone || '-'}</TableCell>
                          <TableCell>
                            {contact.rating ? (
                              <Badge variant={hasHighRating(contact) ? 'default' : 'outline'}>
                                {contact.rating}
                              </Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {contact.place_url ? (
                              <a
                                href={contact.place_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-end gap-2 hover:underline"
                              >
                                Maps
                                <ExternalLink className="size-4" />
                              </a>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Empty className="min-h-72 border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Search />
                  </EmptyMedia>
                  <EmptyTitle>Nenhum contato encontrado</EmptyTitle>
                  <EmptyDescription>
                    Ajuste os filtros ou crie novas buscas para ampliar sua base.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function ContactMetricCard({
  title,
  value,
  icon: Icon,
  loading,
  tone,
}: {
  title: string
  value: number
  icon: React.ElementType
  loading: boolean
  tone: 'blue' | 'green' | 'violet' | 'amber'
}) {
  const toneClasses = {
    blue: {
      icon: 'bg-primary/10 text-primary',
      glow: 'from-primary/18',
    },
    green: {
      icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      glow: 'from-emerald-500/18',
    },
    violet: {
      icon: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      glow: 'from-violet-500/18',
    },
    amber: {
      icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      glow: 'from-amber-500/18',
    },
  }[tone]

  return (
    <div className="relative min-w-0 overflow-hidden rounded-3xl border bg-card p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-4">
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-16 bg-linear-to-b to-transparent',
          toneClasses.glow,
        )}
      />
      <div className="relative flex min-h-16 items-center justify-between gap-2.5">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">
            {title}
          </p>
          {loading ? (
            <Skeleton className="h-7 w-14" />
          ) : (
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {value.toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        <span
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-2xl',
            toneClasses.icon,
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  )
}

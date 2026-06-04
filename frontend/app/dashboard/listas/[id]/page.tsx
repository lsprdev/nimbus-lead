'use client'

import * as React from 'react'
import maplibregl from 'maplibre-gl'
import { ChevronRight, Globe2, Loader2, MapPin, Phone, Search, Star } from 'lucide-react'
import { toast } from 'sonner'

import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  useMap,
} from '@/components/ui/map'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth'
import {
  hasCoordinates,
  normalizeContact,
  normalizeList,
  statusLabel,
  type Contact,
  type LeadList,
} from '@/lib/leads'

const fallbackCenter: [number, number] = [-46.6333, -23.5505]

export default function LeadListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const { authFetch } = useAuth()
  const [list, setList] = React.useState<LeadList | null>(null)
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  const contactsWithCoords = contacts.filter(hasCoordinates)
  const selectedContact = contactsWithCoords.find((contact) => contact.id === selectedContactId)
  const firstContact = contactsWithCoords[0]
  const center: [number, number] = firstContact
    ? [firstContact.longitude as number, firstContact.latitude as number]
    : fallbackCenter

  const loadList = React.useCallback(async () => {
    try {
      const [listResponse, contactsResponse] = await Promise.all([
        authFetch(`/api/lead-lists/${id}`),
        authFetch(`/api/lead-lists/${id}/contacts`),
      ])

      const listPayload = await listResponse.json().catch(() => null)
      const contactsPayload = await contactsResponse.json().catch(() => [])

      if (!listResponse.ok) {
        throw new Error(listPayload?.message ?? 'Lista não encontrada.')
      }
      if (!contactsResponse.ok) {
        throw new Error(contactsPayload?.message ?? 'Não foi possível carregar contatos.')
      }

      setList(normalizeList(listPayload))
      setContacts(Array.isArray(contactsPayload) ? contactsPayload.map(normalizeContact) : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar lista.')
    } finally {
      setLoading(false)
    }
  }, [authFetch, id])

  React.useEffect(() => {
    void loadList()
  }, [loadList])

  React.useEffect(() => {
    if (!list || (list.status !== 'pending' && list.status !== 'running')) return

    const interval = window.setInterval(() => {
      void loadList()
    }, 3000)

    return () => window.clearInterval(interval)
  }, [list, loadList])

  return (
    <>
      <DashboardHeader title={list?.name ?? 'Lista'} />
      <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        {loading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <Skeleton className="h-[620px]" />
              <Skeleton className="h-[620px]" />
            </div>
          </>
        ) : list ? (
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-balance">
                    {list.name}
                  </h1>
                  <Badge variant="secondary">{statusLabel(list.status)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {list.search_term}
                  {list.location ? ` em ${list.location}` : null}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {(list.status === 'pending' || list.status === 'running') && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {contacts.length} contatos encontrados
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <section className="h-[620px] min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-3 pb-4">
                  <CardTitle>Contatos encontrados</CardTitle>
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm">
                    {contacts.length} resultados
                  </Badge>
                </div>
                <ScrollArea className="h-[560px] pr-3">
                  <div className="flex min-w-0 flex-col gap-4">
                    {contacts.length ? (
                      contacts.map((contact) => (
                        <ContactCard
                          key={contact.id}
                          contact={contact}
                          isSelected={selectedContactId === contact.id}
                          onSelect={() => setSelectedContactId(contact.id)}
                        />
                      ))
                    ) : (
                      <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
                        <Search className="size-8 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Aguardando contatos</p>
                          <p className="text-xs text-muted-foreground">
                            Eles aparecem aqui conforme o scraper salva os resultados.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </section>

              <Card className="h-[620px] overflow-hidden p-0">
                <Map
                  center={center}
                  zoom={firstContact ? 12 : 10}
                  className="h-full"
                >
                  <MapControls showCompass showFullscreen />
                  <FitMapToContacts contacts={contactsWithCoords} />
                  <FocusMapOnContact contact={selectedContact} />
                  {contactsWithCoords.map((contact, index) => (
                    <MapMarker
                      key={contact.id}
                      longitude={contact.longitude as number}
                      latitude={contact.latitude as number}
                    >
                      <MarkerContent>
                        <div className="flex size-7 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-semibold text-primary-foreground shadow-lg">
                          {index + 1}
                        </div>
                      </MarkerContent>
                      <MarkerPopup>
                        <div className="w-64 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
                          <p className="truncate text-sm font-medium">{contact.name}</p>
                          {contact.address ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {contact.address}
                            </p>
                          ) : null}
                        </div>
                      </MarkerPopup>
                    </MapMarker>
                  ))}
                </Map>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}

function FitMapToContacts({ contacts }: { contacts: Contact[] }) {
  const { map, isLoaded } = useMap()
  const boundsKey = React.useMemo(
    () =>
      contacts
        .map((contact) => `${contact.id}:${contact.latitude},${contact.longitude}`)
        .join('|'),
    [contacts],
  )

  React.useEffect(() => {
    if (!map || !isLoaded || contacts.length === 0) return

    if (contacts.length === 1) {
      const contact = contacts[0]
      map.easeTo({
        center: [contact.longitude as number, contact.latitude as number],
        zoom: 15,
        duration: 600,
      })
      return
    }

    const first = contacts[0]
    const bounds = contacts.slice(1).reduce(
      (currentBounds, contact) =>
        currentBounds.extend([contact.longitude as number, contact.latitude as number]),
      new maplibregl.LngLatBounds(
        [first.longitude as number, first.latitude as number],
        [first.longitude as number, first.latitude as number],
      ),
    )

    map.fitBounds(bounds, {
      padding: 70,
      maxZoom: 15,
      duration: 700,
    })
  }, [boundsKey, contacts, isLoaded, map])

  return null
}

function FocusMapOnContact({ contact }: { contact?: Contact }) {
  const { map, isLoaded } = useMap()

  React.useEffect(() => {
    if (!map || !isLoaded || !contact || !hasCoordinates(contact)) return

    map.easeTo({
      center: [contact.longitude as number, contact.latitude as number],
      zoom: 15,
      duration: 600,
    })
  }, [contact, isLoaded, map])

  return null
}

function ContactCard({
  contact,
  isSelected,
  onSelect,
}: {
  contact: Contact
  isSelected: boolean
  onSelect: () => void
}) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={[
        'relative min-w-0 rounded-xl border bg-card p-5 shadow-xs outline-none transition-all',
        'hover:border-primary/35 hover:bg-primary/5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring',
        isSelected ? 'border-primary bg-primary/10 shadow-sm' : 'border-border',
      ].join(' ')}
    >
      {isSelected ? (
        <span className="absolute inset-y-6 left-0 w-1 rounded-r-full bg-primary" />
      ) : null}
      <div className="flex min-w-0 items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-start gap-2">
            <p className="min-w-0 flex-1 text-base font-semibold leading-6 text-foreground">
              {contact.name}
            </p>
            {contact.rating ? <RatingBadge rating={contact.rating} /> : null}
          </div>
          {contact.category ? (
            <p className="mt-2 truncate text-sm text-muted-foreground">{contact.category}</p>
          ) : null}
        </div>
        <span
          className={[
            'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors',
            isSelected ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground',
          ].join(' ')}
          aria-hidden="true"
        >
          <ChevronRight className="size-5" />
        </span>
      </div>
      <div className="mt-5 flex min-w-0 flex-col gap-3 text-sm text-muted-foreground">
        {contact.address ? (
          <span className="grid min-w-0 grid-cols-[1.25rem_1fr] gap-3">
            <MapPin className="mt-0.5 size-5 text-muted-foreground" />
            <span className="min-w-0 break-words leading-6">{contact.address}</span>
          </span>
        ) : null}
        {contact.phone ? (
          <span className="grid min-w-0 grid-cols-[1.25rem_1fr] items-center gap-3">
            <Phone className="size-5 text-muted-foreground" />
            <span className="min-w-0 truncate">{contact.phone}</span>
          </span>
        ) : null}
        {contact.website ? (
          <a
            href={contact.website}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="grid min-w-0 grid-cols-[1.25rem_1fr] items-center gap-3 font-medium text-primary hover:underline"
          >
            <Globe2 className="size-5" />
            <span className="min-w-0 truncate">Visitar website</span>
          </a>
        ) : null}
      </div>
    </div>
  )
}

function RatingBadge({ rating }: { rating: string }) {
  const value = Number.parseFloat(rating.replace(',', '.'))
  const isStrong = Number.isFinite(value) && value >= 4.5

  return (
    <span
      className={[
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold',
        isStrong
          ? 'bg-emerald-500 text-white'
          : 'bg-primary text-primary-foreground',
      ].join(' ')}
    >
      <Star className="size-3.5 fill-current" />
      {rating}
    </span>
  )
}

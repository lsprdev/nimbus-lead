'use client'

import * as React from 'react'
import maplibregl from 'maplibre-gl'
import {
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  Loader2,
  MapPin,
  Phone,
  Search,
  Share2,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'

import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Map,
  MapControls,
  MapMarker,
  MapPopup,
  MarkerContent,
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

function getGoogleMapsUrl(contact: Contact) {
  if (contact.place_url) return contact.place_url

  const query = [contact.name, contact.address].filter(Boolean).join(' ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export default function LeadListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const { authFetch } = useAuth()
  const [list, setList] = React.useState<LeadList | null>(null)
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null)
  const [contactQuery, setContactQuery] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const contactCardRefs = React.useRef(new globalThis.Map<string, HTMLDivElement>())

  const normalizedContactQuery = contactQuery.trim().toLowerCase()
  const filteredContacts = React.useMemo(
    () =>
      normalizedContactQuery
        ? contacts.filter((contact) =>
            [
              contact.name,
              contact.category,
              contact.address,
              contact.phone,
              contact.website,
            ]
              .filter(Boolean)
              .some((value) => value?.toLowerCase().includes(normalizedContactQuery)),
          )
        : contacts,
    [contacts, normalizedContactQuery],
  )
  const contactsWithCoords = React.useMemo(
    () => contacts.filter(hasCoordinates),
    [contacts],
  )
  const selectedContact = React.useMemo(
    () => contactsWithCoords.find((contact) => contact.id === selectedContactId),
    [contactsWithCoords, selectedContactId],
  )
  const firstContact = contactsWithCoords[0]
  const center: [number, number] = firstContact
    ? [firstContact.longitude as number, firstContact.latitude as number]
    : fallbackCenter

  const selectContact = React.useCallback((contactId: string, scrollIntoList = false) => {
    setSelectedContactId((currentContactId) => {
      const nextContactId = currentContactId === contactId ? null : contactId

      if (nextContactId && scrollIntoList) {
        window.requestAnimationFrame(() => {
          contactCardRefs.current.get(nextContactId)?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          })
        })
      }

      return nextContactId
    })
  }, [])

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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {(list.status === 'pending' || list.status === 'running') && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {contacts.length} contatos encontrados
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Download className="size-4" />
                        Exportar
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem>
                        <Download className="size-4" />
                        CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="size-4" />
                        PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button type="button" variant="outline" size="sm">
                    <Share2 className="size-4" />
                    Compartilhar
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <section className="flex h-[620px] min-w-0 flex-col">
                <div className="flex flex-col gap-3 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Contatos encontrados</CardTitle>
                    {contactQuery ? (
                      <span className="text-sm text-muted-foreground">
                        {filteredContacts.length} de {contacts.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="relative px-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={contactQuery}
                      onChange={(event) => setContactQuery(event.target.value)}
                      placeholder="Buscar por nome, categoria, endereço..."
                      className="pl-9"
                    />
                  </div>
                </div>
                <ScrollArea className="min-h-0 flex-1 pr-3">
                  <div className="flex min-w-0 flex-col gap-4">
                    {contacts.length ? (
                      filteredContacts.length ? (
                        filteredContacts.map((contact) => (
                          <ContactCard
                            key={contact.id}
                            contact={contact}
                            isSelected={selectedContactId === contact.id}
                            onSelect={() => selectContact(contact.id)}
                            cardRef={(element) => {
                              if (element) {
                                contactCardRefs.current.set(contact.id, element)
                              } else {
                                contactCardRefs.current.delete(contact.id)
                              }
                            }}
                          />
                        ))
                      ) : (
                        <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
                          <Search className="size-8 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Nenhum contato encontrado</p>
                            <p className="text-xs text-muted-foreground">
                              Tente buscar por outro nome, categoria ou endereço.
                            </p>
                          </div>
                        </div>
                      )
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
                  <FocusMapOnContact contact={selectedContact} contacts={contactsWithCoords} />
                  {contactsWithCoords.map((contact, index) => (
                    <MapMarker
                      key={contact.id}
                      longitude={contact.longitude as number}
                      latitude={contact.latitude as number}
                      onClick={() => selectContact(contact.id, true)}
                      zIndex={selectedContactId === contact.id ? 20 : 0}
                    >
                      <MarkerContent
                        className={selectedContactId === contact.id ? 'z-20' : 'z-0'}
                      >
                        <div
                          className={[
                            'flex items-center justify-center rounded-full border-2 border-background bg-primary font-semibold text-primary-foreground shadow-lg transition-all duration-200',
                            selectedContactId === contact.id
                              ? 'size-11 text-base ring-4 ring-primary/20'
                              : 'size-7 text-xs',
                          ].join(' ')}
                        >
                          {index + 1}
                        </div>
                      </MarkerContent>
                    </MapMarker>
                  ))}
                  {selectedContact ? (
                    <MapPopup
                      longitude={selectedContact.longitude as number}
                      latitude={selectedContact.latitude as number}
                      offset={28}
                      closeOnClick={false}
                      className="w-80 max-w-[min(22rem,calc(100vw-2rem))] rounded-xl p-4 shadow-lg"
                    >
                      <ContactMapPopup contact={selectedContact} />
                    </MapPopup>
                  ) : null}
                </Map>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}

function ContactMapPopup({ contact }: { contact: Contact }) {
  return (
    <div className="min-w-0">
      <p className="line-clamp-2 text-base font-semibold leading-5">
        {contact.name}
      </p>
      {contact.address ? (
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
          {contact.address}
        </p>
      ) : null}
      <a
        href={getGoogleMapsUrl(contact)}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Ver no Maps
        <ExternalLink className="size-4" />
      </a>
    </div>
  )
}

function FocusMapOnContact({
  contact,
  contacts,
}: {
  contact?: Contact
  contacts: Contact[]
}) {
  const { map, isLoaded } = useMap()
  const boundsKey = React.useMemo(
    () =>
      contacts
        .map((currentContact) => `${currentContact.id}:${currentContact.latitude},${currentContact.longitude}`)
        .join('|'),
    [contacts],
  )

  React.useEffect(() => {
    if (!map || !isLoaded) return

    if (!contact || !hasCoordinates(contact)) {
      fitMapToContacts(map, contacts)
      return
    }

    map.easeTo({
      center: [contact.longitude as number, contact.latitude as number],
      zoom: 15,
      duration: 600,
    })
  }, [boundsKey, contact, contacts, isLoaded, map])

  return null
}

function fitMapToContacts(map: maplibregl.Map, contacts: Contact[]) {
  if (contacts.length === 0) return

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
}

function ContactCard({
  contact,
  isSelected,
  onSelect,
  cardRef,
}: {
  contact: Contact
  isSelected: boolean
  onSelect: () => void
  cardRef?: (element: HTMLDivElement | null) => void
}) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={[
        'min-w-0 cursor-pointer rounded-xl border bg-card p-5 shadow-xs outline-none transition-all',
        'hover:border-primary/35 hover:bg-primary/5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring',
        isSelected ? 'border-primary/45 shadow-sm' : 'border-border',
      ].join(' ')}
    >
      <div className="min-w-0">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p
              className={[
                'min-w-0 text-base font-semibold leading-6',
                isSelected ? 'text-primary' : 'text-foreground',
              ].join(' ')}
            >
              {contact.name}
            </p>
            {contact.website ? (
              <a
                href={contact.website}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10"
              >
                <Globe2 className="size-3" />
                Site
              </a>
            ) : null}
            {contact.rating ? <RatingBadge rating={contact.rating} /> : null}
          </div>
          {contact.category ? (
            <p className="mt-2 truncate text-sm text-muted-foreground">{contact.category}</p>
          ) : null}
        </div>
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

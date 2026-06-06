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
  Pause,
  Phone,
  Play,
  Search,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'

import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import AITextLoading from '@/components/kokonutui/ai-text-loading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { DotmSquare1 } from '@/components/ui/dotm-square-1'
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
import { LEAD_LOADING_PHRASES } from '@/lib/loading-phrases'
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

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'contatos'
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function buildContactsCsv(contacts: Contact[]) {
  const headers = [
    'Nome',
    'Categoria',
    'Endereço',
    'Telefone',
    'Website',
    'Avaliação',
    'Qtd. avaliações',
    'Instagram',
    'Facebook',
    'LinkedIn',
    'Google Maps',
    'Latitude',
    'Longitude',
  ]
  const rows = contacts.map((contact) => [
    contact.name,
    contact.category,
    contact.address,
    contact.phone,
    contact.website,
    contact.rating,
    contact.reviews_count,
    contact.instagram,
    contact.facebook,
    contact.linkedin,
    getGoogleMapsUrl(contact),
    contact.latitude,
    contact.longitude,
  ])

  return `\uFEFF${[headers, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n')}`
}

function escapeCsvValue(value: unknown) {
  const stringValue = value === undefined || value === null ? '' : String(value)
  return `"${stringValue.replaceAll('"', '""')}"`
}

function buildContactsPdf(list: LeadList, contacts: Contact[]) {
  const pages: Array<Array<{ text: string; size: number }>> = []
  const currentPage = () => pages[pages.length - 1]
  const addPage = () => pages.push([])
  const addLine = (text: string, size = 10) => {
    if (!pages.length || currentPage().length >= 48) addPage()
    currentPage().push({ text, size })
  }

  addLine(list.name, 18)
  addLine(
    [list.search_term, list.location ? `em ${list.location}` : null]
      .filter(Boolean)
      .join(' '),
    11,
  )
  addLine(`${contacts.length} contatos exportados`, 11)
  addLine('', 10)

  contacts.forEach((contact, index) => {
    addLine(`${index + 1}. ${contact.name}`, 13)
    if (contact.category) addLine(`Categoria: ${contact.category}`)
    if (contact.rating) addLine(`Avaliacao: ${contact.rating}`)
    if (contact.phone) addLine(`Telefone: ${contact.phone}`)
    if (contact.address) wrapPdfLine(`Endereco: ${contact.address}`).forEach((line) => addLine(line))
    if (contact.website) wrapPdfLine(`Website: ${contact.website}`).forEach((line) => addLine(line))
    wrapPdfLine(`Maps: ${getGoogleMapsUrl(contact)}`).forEach((line) => addLine(line))
    addLine('', 10)
  })

  return new Blob([createPdfDocument(pages)], { type: 'application/pdf' })
}

function wrapPdfLine(value: string, maxLength = 82) {
  const words = value.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word
    if (nextLine.length > maxLength && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = nextLine
    }
  })

  if (currentLine) lines.push(currentLine)
  return lines
}

function createPdfDocument(pages: Array<Array<{ text: string; size: number }>>) {
  const objects: string[] = []
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')

  const pageObjectIds = pages.map((_, index) => 4 + index * 2)
  objects.push(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`)
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  pages.forEach((pageLines, index) => {
    const pageObjectId = 4 + index * 2
    const contentObjectId = pageObjectId + 1
    const stream = pageLines
      .map((line, lineIndex) => {
        const y = 800 - lineIndex * 15
        return `BT /F1 ${line.size} Tf 40 ${y} Td (${escapePdfText(line.text)}) Tj ET`
      })
      .join('\n')

    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`)
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return pdf
}

function escapePdfText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

export default function LeadListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const { authFetch } = useAuth()
  const [list, setList] = React.useState<LeadList | null>(null)
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null)
  const [contactQuery, setContactQuery] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [listAction, setListAction] = React.useState<'pause' | 'resume' | null>(null)
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

  function handleExport(format: 'csv' | 'pdf') {
    if (!list) return
    if (!filteredContacts.length) {
      toast.error('Não há contatos para exportar.')
      return
    }

    const filename = `${slugify(list.name)}-contatos`
    if (format === 'csv') {
      downloadBlob(
        buildContactsCsv(filteredContacts),
        `${filename}.csv`,
        'text/csv;charset=utf-8',
      )
      return
    }

    downloadBlob(
      buildContactsPdf(list, filteredContacts),
      `${filename}.pdf`,
      'application/pdf',
    )
  }

  async function handleListAction(action: 'pause' | 'resume') {
    if (!list) return

    setListAction(action)
    try {
      const response = await authFetch(`/api/lead-lists/${list.id}/${action}`, {
        method: 'POST',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          payload?.message ??
            (action === 'pause'
              ? 'Não foi possível pausar a busca.'
              : 'Não foi possível continuar a busca.'),
        )
      }

      setList(normalizeList(payload))
      toast.success(action === 'pause' ? 'Busca pausada.' : 'Busca retomada.')
      if (action === 'resume') {
        void loadList()
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : action === 'pause'
            ? 'Erro ao pausar busca.'
            : 'Erro ao continuar busca.',
      )
    } finally {
      setListAction(null)
    }
  }

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
                  {list.status === 'pending' || list.status === 'running' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={listAction !== null}
                      onClick={() => handleListAction('pause')}
                    >
                      {listAction === 'pause' ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Pause className="size-4" />
                      )}
                      Pausar
                    </Button>
                  ) : null}
                  {list.status === 'paused' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={listAction !== null}
                      onClick={() => handleListAction('resume')}
                    >
                      {listAction === 'resume' ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Play className="size-4" />
                      )}
                      Continuar
                    </Button>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Download className="size-4" />
                        Exportar
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onSelect={() => handleExport('csv')}>
                        <Download className="size-4" />
                        CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleExport('pdf')}>
                        <FileText className="size-4" />
                        PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                      <div className="flex h-[420px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed text-center">
                        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <DotmSquare1
                            size={32}
                            dotSize={4}
                            speed={1.2}
                            bloom
                            ariaLabel="Buscando contatos"
                          />
                        </div>
                        <div>
                          <AITextLoading
                            texts={LEAD_LOADING_PHRASES}
                            interval={1800}
                            className="text-center text-base leading-snug from-foreground via-muted-foreground to-foreground sm:text-lg"
                          />
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

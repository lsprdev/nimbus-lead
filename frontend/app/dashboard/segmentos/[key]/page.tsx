"use client";

import * as React from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import {
  ArrowLeft,
  ExternalLink,
  Globe2,
  MapPin,
  Phone,
  Search,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Map,
  MapControls,
  MapMarker,
  MapPopup,
  MarkerContent,
  useMap,
} from "@/components/ui/map";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import {
  hasCoordinates,
  normalizeContact,
  normalizeList,
  type Contact,
  type LeadList,
} from "@/lib/leads";
import { cn } from "@/lib/utils";

const fallbackCenter: [number, number] = [-46.6333, -23.5505];

type SegmentPayload = {
  lists?: Partial<LeadList>[];
  contacts?: Partial<Contact>[];
};

function getGoogleMapsUrl(contact: Contact) {
  if (contact.place_url) return contact.place_url;

  const query = [contact.name, contact.address].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function formatSegmentTitle(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "Segmento";

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function LeadSegmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ lists?: string; title?: string }>;
}) {
  const { key } = React.use(params);
  const query = React.use(searchParams);
  const { authFetch } = useAuth();
  const [lists, setLists] = React.useState<LeadList[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null);
  const [contactQuery, setContactQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const contactCardRefs = React.useRef(new globalThis.Map<string, HTMLDivElement>());

  const segmentTitle = query.title
    ? formatSegmentTitle(query.title)
    : formatSegmentTitle(decodeURIComponent(key));
  const listsParam = query.lists ?? "";
  const listById = React.useMemo(
    () => new globalThis.Map(lists.map((list) => [list.id, list])),
    [lists],
  );
  const normalizedContactQuery = contactQuery.trim().toLowerCase();
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
              listById.get(contact.list)?.location,
            ]
              .filter(Boolean)
              .some((value) => value?.toLowerCase().includes(normalizedContactQuery)),
          )
        : contacts,
    [contacts, listById, normalizedContactQuery],
  );
  const contactsWithCoords = React.useMemo(
    () => contacts.filter(hasCoordinates),
    [contacts],
  );
  const selectedContact = React.useMemo(
    () => contactsWithCoords.find((contact) => contact.id === selectedContactId),
    [contactsWithCoords, selectedContactId],
  );
  const firstContact = contactsWithCoords[0];
  const center: [number, number] = firstContact
    ? [firstContact.longitude as number, firstContact.latitude as number]
    : fallbackCenter;
  const totalRequested = lists.reduce(
    (total, list) => total + list.max_results,
    0,
  );
  const isSearching = lists.some(
    (list) => list.status === "pending" || list.status === "running",
  );

  const selectContact = React.useCallback((contactId: string, scrollIntoList = false) => {
    setSelectedContactId((currentContactId) => {
      const nextContactId = currentContactId === contactId ? null : contactId;

      if (nextContactId && scrollIntoList) {
        window.requestAnimationFrame(() => {
          contactCardRefs.current.get(nextContactId)?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        });
      }

      return nextContactId;
    });
  }, []);

  const loadSegment = React.useCallback(async () => {
    if (!listsParam) {
      toast.error("Nenhuma cidade foi informada para este segmento.");
      setLoading(false);
      return;
    }

    try {
      const response = await authFetch(
        `/api/lead-segments/contacts?lists=${encodeURIComponent(listsParam)}`,
      );
      const payload = (await response.json().catch(() => null)) as SegmentPayload | null;

      if (!response.ok) {
        throw new Error("Não foi possível carregar o mapa do segmento.");
      }

      setLists(Array.isArray(payload?.lists) ? payload.lists.map(normalizeList) : []);
      setContacts(
        Array.isArray(payload?.contacts)
          ? payload.contacts.map(normalizeContact)
          : [],
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar mapa do segmento.",
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch, listsParam]);

  React.useEffect(() => {
    void loadSegment();
  }, [loadSegment]);

  React.useEffect(() => {
    if (!isSearching) return;

    const interval = window.setInterval(() => {
      void loadSegment();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [isSearching, loadSegment]);

  return (
    <>
      <DashboardHeader title={segmentTitle} />
      <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        {loading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <Skeleton className="h-[620px]" />
              <Skeleton className="h-[620px]" />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-2">
                <Button asChild variant="ghost" size="sm" className="w-fit gap-2 px-0">
                  <Link href="/dashboard/buscar">
                    <ArrowLeft className="size-4" />
                    Voltar para segmentos
                  </Link>
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-balance">
                    {segmentTitle}
                  </h1>
                  <Badge variant="secondary">
                    {lists.length} {lists.length === 1 ? "cidade" : "cidades"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {contacts.length.toLocaleString("pt-BR")} contatos encontrados
                  {totalRequested
                    ? ` de ${totalRequested.toLocaleString("pt-BR")} solicitados`
                    : null}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {lists.map((list) => (
                  <Button
                    key={list.id}
                    asChild
                    variant="outline"
                    size="sm"
                  >
                    <Link href={`/dashboard/listas/${list.id}`}>
                      <MapPin className="size-4" />
                      {list.location || list.name}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <section className="flex h-[620px] min-w-0 flex-col">
                <div className="flex flex-col gap-3 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Contatos do segmento</CardTitle>
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
                      placeholder="Buscar por nome, categoria, endereço ou cidade..."
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
                            list={listById.get(contact.list)}
                            isSelected={selectedContactId === contact.id}
                            onSelect={() => selectContact(contact.id)}
                            cardRef={(element) => {
                              if (element) {
                                contactCardRefs.current.set(contact.id, element);
                              } else {
                                contactCardRefs.current.delete(contact.id);
                              }
                            }}
                          />
                        ))
                      ) : (
                        <EmptyContacts
                          title="Nenhum contato encontrado"
                          description="Tente buscar por outro nome, categoria, endereço ou cidade."
                        />
                      )
                    ) : (
                      <EmptyContacts
                        title="Nenhum contato neste segmento"
                        description="As buscas ainda não encontraram contatos para exibir no mapa."
                      />
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
                        className={selectedContactId === contact.id ? "z-20" : "z-0"}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center rounded-full border-2 border-background bg-primary font-semibold text-primary-foreground shadow-lg transition-all duration-200",
                            selectedContactId === contact.id
                              ? "size-11 text-base ring-4 ring-primary/20"
                              : "size-7 text-xs",
                          )}
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
                      <ContactMapPopup
                        contact={selectedContact}
                        list={listById.get(selectedContact.list)}
                      />
                    </MapPopup>
                  ) : null}
                </Map>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function EmptyContacts({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
      <Search className="size-8 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ContactMapPopup({
  contact,
  list,
}: {
  contact: Contact;
  list?: LeadList;
}) {
  return (
    <div className="min-w-0">
      <p className="line-clamp-2 text-base font-semibold leading-5">
        {contact.name}
      </p>
      {list?.location ? (
        <p className="mt-1 text-sm font-medium text-primary">{list.location}</p>
      ) : null}
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
  );
}

function FocusMapOnContact({
  contact,
  contacts,
}: {
  contact?: Contact;
  contacts: Contact[];
}) {
  const { map, isLoaded } = useMap();
  const boundsKey = React.useMemo(
    () =>
      contacts
        .map((currentContact) => `${currentContact.id}:${currentContact.latitude},${currentContact.longitude}`)
        .join("|"),
    [contacts],
  );

  React.useEffect(() => {
    if (!map || !isLoaded) return;

    if (!contact || !hasCoordinates(contact)) {
      fitMapToContacts(map, contacts);
      return;
    }

    map.easeTo({
      center: [contact.longitude as number, contact.latitude as number],
      zoom: 15,
      duration: 600,
    });
  }, [boundsKey, contact, contacts, isLoaded, map]);

  return null;
}

function fitMapToContacts(map: maplibregl.Map, contacts: Contact[]) {
  if (contacts.length === 0) return;

  if (contacts.length === 1) {
    const contact = contacts[0];
    map.easeTo({
      center: [contact.longitude as number, contact.latitude as number],
      zoom: 15,
      duration: 600,
    });
    return;
  }

  const first = contacts[0];
  const bounds = contacts.slice(1).reduce(
    (currentBounds, contact) =>
      currentBounds.extend([contact.longitude as number, contact.latitude as number]),
    new maplibregl.LngLatBounds(
      [first.longitude as number, first.latitude as number],
      [first.longitude as number, first.latitude as number],
    ),
  );

  map.fitBounds(bounds, {
    padding: 70,
    maxZoom: 15,
    duration: 700,
  });
}

function ContactCard({
  contact,
  list,
  isSelected,
  onSelect,
  cardRef,
}: {
  contact: Contact;
  list?: LeadList;
  isSelected: boolean;
  onSelect: () => void;
  cardRef?: (element: HTMLDivElement | null) => void;
}) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "min-w-0 cursor-pointer rounded-xl border bg-card p-5 shadow-xs outline-none transition-all",
        "hover:border-primary/35 hover:bg-primary/5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring",
        isSelected ? "border-primary/45 shadow-sm" : "border-border",
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p
            className={cn(
              "min-w-0 text-base font-semibold leading-6",
              isSelected ? "text-primary" : "text-foreground",
            )}
          >
            {contact.name}
          </p>
          {list?.location ? (
            <Badge variant="secondary" className="shrink-0">
              {list.location}
            </Badge>
          ) : null}
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
          <p className="mt-2 truncate text-sm text-muted-foreground">
            {contact.category}
          </p>
        ) : null}
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
  );
}

function RatingBadge({ rating }: { rating: string }) {
  const value = Number.parseFloat(rating.replace(",", "."));
  const isStrong = Number.isFinite(value) && value >= 4.5;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold",
        isStrong
          ? "bg-emerald-500 text-white"
          : "bg-primary text-primary-foreground",
      )}
    >
      <Star className="size-3.5 fill-current" />
      {rating}
    </span>
  );
}

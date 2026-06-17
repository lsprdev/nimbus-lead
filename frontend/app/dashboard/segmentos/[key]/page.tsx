"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Phone,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { RadixBookmarkIcon } from "@/components/icons/radix-bookmark-icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import {
  hasCoordinates,
  normalizeContact,
  normalizeList,
  type Contact,
  type LeadList,
} from "@/lib/leads";
import {
  DEFAULT_COLLECTION_COLOR,
  normalizeContactCollection,
  type ContactCollection,
} from "@/lib/collections";
import { cn } from "@/lib/utils";

const fallbackCenter: [number, number] = [-46.6333, -23.5505];
const ALL_LOCATIONS_VALUE = "all";
const NO_COLLECTION_VALUE = "__none__";

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
  const router = useRouter();
  const { authFetch } = useAuth();
  const [lists, setLists] = React.useState<LeadList[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null);
  const [contactQuery, setContactQuery] = React.useState("");
  const [locationFilter, setLocationFilter] = React.useState(ALL_LOCATIONS_VALUE);
  const [deletingLocation, setDeletingLocation] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [collections, setCollections] = React.useState<ContactCollection[]>([]);
  const [contactCollectionIds, setContactCollectionIds] = React.useState<
    Map<string, string[]>
  >(() => new globalThis.Map());
  const [loadingCollections, setLoadingCollections] = React.useState(true);
  const [savingToCollection, setSavingToCollection] = React.useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = React.useState(false);
  const [contactToSave, setContactToSave] = React.useState<Contact | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = React.useState("");
  const contactCardRefs = React.useRef(new globalThis.Map<string, HTMLDivElement>());

  const segmentTitle = query.title
    ? formatSegmentTitle(query.title)
    : formatSegmentTitle(decodeURIComponent(key));
  const listsParam = query.lists ?? "";
  const listById = React.useMemo(
    () => new globalThis.Map(lists.map((list) => [list.id, list])),
    [lists],
  );
  const collectionById = React.useMemo(
    () => new globalThis.Map(collections.map((collection) => [collection.id, collection])),
    [collections],
  );
  const locationOptions = React.useMemo(
    () =>
      Array.from(new Set(lists.map((list) => list.location).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [lists],
  );
  const filteredLists = React.useMemo(
    () =>
      locationFilter === ALL_LOCATIONS_VALUE
        ? lists
        : lists.filter((list) => list.location === locationFilter),
    [lists, locationFilter],
  );
  const locationContacts = React.useMemo(
    () =>
      locationFilter === ALL_LOCATIONS_VALUE
        ? contacts
        : contacts.filter(
            (contact) => listById.get(contact.list)?.location === locationFilter,
          ),
    [contacts, listById, locationFilter],
  );
  const normalizedContactQuery = contactQuery.trim().toLowerCase();
  const filteredContacts = React.useMemo(
    () =>
      normalizedContactQuery
        ? locationContacts.filter((contact) =>
            [
              contact.name,
              contact.category,
              contact.address,
              contact.phone,
              listById.get(contact.list)?.location,
            ]
              .filter(Boolean)
              .some((value) => value?.toLowerCase().includes(normalizedContactQuery)),
          )
        : locationContacts,
    [listById, locationContacts, normalizedContactQuery],
  );
  const contactsWithCoords = React.useMemo(
    () => filteredContacts.filter(hasCoordinates),
    [filteredContacts],
  );
  const selectedContact = React.useMemo(
    () => contactsWithCoords.find((contact) => contact.id === selectedContactId),
    [contactsWithCoords, selectedContactId],
  );
  const firstContact = contactsWithCoords[0];
  const center: [number, number] = firstContact
    ? [firstContact.longitude as number, firstContact.latitude as number]
    : fallbackCenter;
  const filteredRequested = filteredLists.reduce(
    (total, list) => total + list.max_results,
    0,
  );
  const isSearching = lists.some(
    (list) => list.status === "pending" || list.status === "running",
  );
  const selectedLocationLabel =
    locationFilter === ALL_LOCATIONS_VALUE ? "" : locationFilter;

  const loadCollections = React.useCallback(async () => {
    setLoadingCollections(true);
    try {
      const response = await authFetch("/api/contact-collections");
      const payload = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Não foi possível carregar coleções.");
      }

      const nextCollections = Array.isArray(payload)
        ? payload.map(normalizeContactCollection)
        : [];
      setCollections(nextCollections);
      setSelectedCollectionId((current) => current || nextCollections[0]?.id || "");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao carregar coleções.",
      );
    } finally {
      setLoadingCollections(false);
    }
  }, [authFetch]);

  React.useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  const loadContactCollectionMemberships = React.useCallback(async () => {
    try {
      const response = await authFetch("/api/contact-collections/memberships");
      const payload = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(
          payload?.message ?? "Não foi possível carregar contatos salvos.",
        );
      }

      const nextContactCollectionIds = new globalThis.Map<string, string[]>();
      if (Array.isArray(payload)) {
        for (const membership of payload) {
          const contactId = String(membership?.contact_id ?? "");
          const collectionId = String(membership?.collection_id ?? "");
          if (!contactId || !collectionId) continue;

          const collectionIds = nextContactCollectionIds.get(contactId) ?? [];
          if (!collectionIds.includes(collectionId)) {
            nextContactCollectionIds.set(contactId, [...collectionIds, collectionId]);
          }
        }
      }

      setContactCollectionIds(nextContactCollectionIds);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar contatos salvos.",
      );
    }
  }, [authFetch]);

  React.useEffect(() => {
    void loadContactCollectionMemberships();
  }, [loadContactCollectionMemberships]);

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

  function openCollectionDialog(contact: Contact) {
    const savedCollectionId = contactCollectionIds.get(contact.id)?.[0];
    setContactToSave(contact);
    setSelectedCollectionId(savedCollectionId || collections[0]?.id || "");
    setCollectionDialogOpen(true);
  }

  function getContactCollectionColor(contactId: string) {
    const collectionIds = contactCollectionIds.get(contactId) ?? [];
    const collection = collectionIds
      .map((collectionId) => collectionById.get(collectionId))
      .find(Boolean);

    return collection?.color ?? DEFAULT_COLLECTION_COLOR;
  }

  async function handleSaveToCollection() {
    if (!contactToSave || !selectedCollectionId) return;

    setSavingToCollection(true);
    try {
      const previousCollectionIds =
        contactCollectionIds.get(contactToSave.id) ?? [];

      if (selectedCollectionId === NO_COLLECTION_VALUE) {
        const response = await authFetch(
          `/api/contact-collections/contacts/${contactToSave.id}`,
          { method: "DELETE" },
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            payload?.message ?? "Não foi possível remover a coleção do contato.",
          );
        }

        setCollections((currentCollections) =>
          currentCollections.map((collection) =>
            previousCollectionIds.includes(collection.id)
              ? {
                  ...collection,
                  contact_count: Math.max(0, collection.contact_count - 1),
                }
              : collection,
          ),
        );
        setContactCollectionIds((currentContactCollectionIds) => {
          const nextContactCollectionIds = new globalThis.Map(
            currentContactCollectionIds,
          );
          nextContactCollectionIds.delete(contactToSave.id);
          return nextContactCollectionIds;
        });
        toast.success("Contato removido da coleção.");
        setCollectionDialogOpen(false);
        setContactToSave(null);
        return;
      }

      const response = await authFetch(
        `/api/contact-collections/${selectedCollectionId}/contacts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId: contactToSave.id }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Não foi possível salvar o contato.");
      }

      setCollections((currentCollections) =>
        currentCollections.map((collection) => {
          const wasLinked = previousCollectionIds.includes(collection.id);
          const isSelected = collection.id === selectedCollectionId;

          if (isSelected && !wasLinked) {
            return {
              ...collection,
              contact_count: collection.contact_count + 1,
            };
          }
          if (!isSelected && wasLinked) {
            return {
              ...collection,
              contact_count: Math.max(0, collection.contact_count - 1),
            };
          }

          return collection;
        }),
      );
      setContactCollectionIds((currentContactCollectionIds) => {
        const nextContactCollectionIds = new globalThis.Map(
          currentContactCollectionIds,
        );
        nextContactCollectionIds.set(contactToSave.id, [selectedCollectionId]);
        return nextContactCollectionIds;
      });
      toast.success(
        payload?.duplicate
          ? "Contato mantido nesta coleção."
          : "Contato salvo na coleção.",
      );
      setCollectionDialogOpen(false);
      setContactToSave(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar contato.",
      );
    } finally {
      setSavingToCollection(false);
    }
  }

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
    if (
      selectedContactId &&
      !filteredContacts.some((contact) => contact.id === selectedContactId)
    ) {
      setSelectedContactId(null);
    }
  }, [filteredContacts, selectedContactId]);

  React.useEffect(() => {
    if (!isSearching) return;

    const interval = window.setInterval(() => {
      void loadSegment();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [isSearching, loadSegment]);

  async function handleDeleteSelectedLocation() {
    if (locationFilter === ALL_LOCATIONS_VALUE || filteredLists.length === 0) {
      return;
    }

    setDeletingLocation(true);
    try {
      const listIds = new Set(filteredLists.map((list) => list.id));
      const responses = await Promise.all(
        filteredLists.map((list) =>
          authFetch(`/api/lead-lists/${list.id}`, { method: "DELETE" }),
        ),
      );
      const failedResponse = responses.find((response) => !response.ok);
      if (failedResponse) {
        const payload = await failedResponse.json().catch(() => null);
        throw new Error(payload?.message ?? "Não foi possível excluir a cidade.");
      }

      const remainingLists = lists.filter((list) => !listIds.has(list.id));
      setLists(remainingLists);
      setContacts((currentContacts) =>
        currentContacts.filter((contact) => !listIds.has(contact.list)),
      );
      setLocationFilter(ALL_LOCATIONS_VALUE);
      setSelectedContactId(null);
      toast.success("Cidade excluída do segmento.");

      if (remainingLists.length === 0) {
        router.push("/dashboard/buscar");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir cidade.",
      );
    } finally {
      setDeletingLocation(false);
    }
  }

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
                  {locationContacts.length.toLocaleString("pt-BR")} contatos encontrados
                  {filteredRequested
                    ? ` de ${filteredRequested.toLocaleString("pt-BR")} solicitados`
                    : null}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:items-center">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-11 w-full rounded-xl sm:w-64">
                    <SelectValue placeholder="Filtrar cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={ALL_LOCATIONS_VALUE}>
                        Todas as cidades
                      </SelectItem>
                      {locationOptions.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {locationFilter !== ALL_LOCATIONS_VALUE ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 gap-2 rounded-xl text-destructive hover:text-destructive"
                        disabled={deletingLocation}
                      >
                        {deletingLocation ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Excluir cidade
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir esta cidade?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação remove a busca e todos os contatos encontrados em {selectedLocationLabel}. Se a busca ainda estiver em andamento, ela será interrompida.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingLocation}>
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          disabled={deletingLocation}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={(event) => {
                            event.preventDefault();
                            void handleDeleteSelectedLocation();
                          }}
                        >
                          {deletingLocation ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                          Excluir cidade
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <section className="flex h-[620px] min-w-0 flex-col">
                <div className="flex flex-col gap-3 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Contatos do segmento</CardTitle>
                    {contactQuery || locationFilter !== ALL_LOCATIONS_VALUE ? (
                      <span className="text-sm text-muted-foreground">
                        {filteredContacts.length} de {locationContacts.length}
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
                            isSelected={selectedContactId === contact.id}
                            isSavedToCollection={contactCollectionIds.has(contact.id)}
                            savedCollectionColor={getContactCollectionColor(contact.id)}
                            onSelect={() => selectContact(contact.id)}
                            onSaveToCollection={() => openCollectionDialog(contact)}
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
                          description="Tente buscar por outro nome, categoria ou endereço."
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
        <Dialog
          open={collectionDialogOpen}
          onOpenChange={(open) => {
            setCollectionDialogOpen(open);
            if (!open) {
              setContactToSave(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salvar em coleção</DialogTitle>
              <DialogDescription>
                Escolha uma coleção para salvar {contactToSave?.name ?? "este contato"}.
              </DialogDescription>
            </DialogHeader>
            {loadingCollections ? (
              <Skeleton className="h-11 w-full" />
            ) : collections.length ? (
              <Select
                value={selectedCollectionId}
                onValueChange={setSelectedCollectionId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma coleção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={NO_COLLECTION_VALUE}>
                      Sem coleção
                    </SelectItem>
                    {collections.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Crie uma coleção antes de salvar contatos.
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                asChild
                disabled={savingToCollection}
              >
                <Link href="/dashboard/colecoes">Abrir coleções</Link>
              </Button>
              <Button
                type="button"
                disabled={
                  savingToCollection ||
                  loadingCollections ||
                  !collections.length ||
                  !selectedCollectionId
                }
                onClick={() => void handleSaveToCollection()}
              >
                {savingToCollection ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RadixBookmarkIcon className="size-4" />
                )}
                {selectedCollectionId === NO_COLLECTION_VALUE
                  ? "Remover coleção"
                  : "Salvar contato"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
  isSelected,
  isSavedToCollection,
  savedCollectionColor,
  onSelect,
  onSaveToCollection,
  cardRef,
}: {
  contact: Contact;
  isSelected: boolean;
  isSavedToCollection: boolean;
  savedCollectionColor: string;
  onSelect: () => void;
  onSaveToCollection: () => void;
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
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.25rem] items-start gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p
              className={cn(
                "min-w-0 max-w-full break-words text-base font-semibold leading-6",
                isSelected ? "text-primary" : "text-foreground",
              )}
            >
              {contact.name}
            </p>
            {contact.rating ? <RatingBadge rating={contact.rating} /> : null}
          </div>
          {contact.category ? (
            <p className="mt-2 truncate text-sm text-muted-foreground">
              {contact.category}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0 rounded-xl justify-self-end"
          aria-label={
            isSavedToCollection
              ? `${contact.name} já está em uma coleção`
              : `Salvar ${contact.name} em uma coleção`
          }
          title={
            isSavedToCollection
              ? "Contato salvo em coleção"
              : "Salvar em coleção"
          }
          onClick={(event) => {
            event.stopPropagation();
            onSaveToCollection();
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <RadixBookmarkIcon
            filled={isSavedToCollection}
            className={cn(
              "size-4 text-muted-foreground",
            )}
            style={
              isSavedToCollection ? { color: savedCollectionColor } : undefined
            }
          />
        </Button>
      </div>
      <div className="mt-5 flex min-w-0 flex-col gap-3 text-sm text-muted-foreground">
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

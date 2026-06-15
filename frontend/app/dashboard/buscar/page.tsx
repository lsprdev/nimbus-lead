"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Clock3,
  ListChecks,
  Loader2,
  MapPin,
  Plus,
  Search,
  Smartphone,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeList, statusLabel, type LeadList } from "@/lib/leads";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const KEYWORD_SUGGESTIONS = [
  "restaurantes japoneses",
  "restaurantes",
  "pizzarias",
  "padarias",
  "cafeterias",
  "clínicas odontológicas",
  "clínicas veterinárias",
  "academias",
  "imobiliárias",
  "autopeças",
  "oficinas mecânicas",
  "salões de beleza",
  "contabilidades",
  "escolas particulares",
  "pet shops",
  "farmácias",
  "fornecedores de parafusos",
  "distribuidoras",
  "supermercados",
  "hotéis",
  "lojas de móveis",
  "construtoras",
  "marcenarias",
];

type IbgeMunicipality = {
  id: number;
  nome: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: {
        sigla?: string;
      };
    };
  };
};

type ComboboxOption = {
  value: string;
  label: string;
};

type LeadListGroup = {
  key: string;
  title: string;
  searchTerm: string;
  lists: LeadList[];
  totalFound: number;
  totalRequested: number;
  completedCount: number;
  activeCount: number;
  locations: string[];
  updated: string;
};

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatSegmentTitle(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "Busca sem segmento";

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function groupLeadLists(lists: LeadList[]): LeadListGroup[] {
  const groups = new Map<string, LeadList[]>();

  lists.forEach((list) => {
    const key = normalizeSearchValue(
      list.search_term || list.name || "sem-segmento",
    );
    groups.set(key, [...(groups.get(key) ?? []), list]);
  });

  return Array.from(groups.entries())
    .map(([key, groupLists]) => {
      const orderedLists = [...groupLists].sort(
        (a, b) =>
          Date.parse(b.updated || b.created) -
          Date.parse(a.updated || a.created),
      );
      const totalFound = orderedLists.reduce(
        (total, list) => total + list.total_found,
        0,
      );
      const totalRequested = orderedLists.reduce(
        (total, list) => total + list.max_results,
        0,
      );
      const completedCount = orderedLists.filter(
        (list) => list.status === "completed" || list.status === "partial",
      ).length;
      const activeCount = orderedLists.filter(
        (list) => list.status === "pending" || list.status === "running",
      ).length;
      const locations = Array.from(
        new Set(orderedLists.map((list) => list.location).filter(Boolean)),
      );

      return {
        key,
        title: formatSegmentTitle(
          orderedLists[0]?.search_term || orderedLists[0]?.name || "",
        ),
        searchTerm: orderedLists[0]?.search_term || orderedLists[0]?.name || "",
        lists: orderedLists,
        totalFound,
        totalRequested,
        completedCount,
        activeCount,
        locations,
        updated: orderedLists[0]?.updated || orderedLists[0]?.created || "",
      };
    })
    .sort((a, b) => Date.parse(b.updated) - Date.parse(a.updated));
}

export default function SearchPage() {
  const { authFetch } = useAuth();
  const [lists, setLists] = React.useState<LeadList[]>([]);
  const [loadingLists, setLoadingLists] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [createDialogMode, setCreateDialogMode] = React.useState<
    "new" | "segment"
  >("new");
  const [listName, setListName] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [cityOptions, setCityOptions] = React.useState<ComboboxOption[]>([]);
  const [loadingCities, setLoadingCities] = React.useState(false);
  const [citiesLoaded, setCitiesLoaded] = React.useState(false);
  const hasActiveLists = React.useMemo(
    () =>
      lists.some((list) => list.status === "pending" || list.status === "running"),
    [lists],
  );
  const totalLists = lists.length;
  const completedLists = lists.filter(
    (list) => list.status === "completed" || list.status === "partial",
  ).length;
  const totalContacts = lists.reduce(
    (total, list) => total + list.total_found,
    0,
  );
  const groupedLists = React.useMemo(() => groupLeadLists(lists), [lists]);

  const loadLists = React.useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoadingLists(true);
    }
    try {
      const response = await authFetch("/api/lead-lists");
      const payload = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error("Não foi possível carregar suas listas.");
      }

      setLists(Array.isArray(payload) ? payload.map(normalizeList) : []);
    } catch (error) {
      if (!options?.silent) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao carregar listas.",
        );
      }
    } finally {
      if (!options?.silent) {
        setLoadingLists(false);
      }
    }
  }, [authFetch]);

  React.useEffect(() => {
    void loadLists();
  }, [loadLists]);

  React.useEffect(() => {
    if (!hasActiveLists) return;

    const interval = window.setInterval(() => {
      void loadLists({ silent: true });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [hasActiveLists, loadLists]);

  const loadCities = React.useCallback(async () => {
    if (citiesLoaded || loadingCities) return;

    setLoadingCities(true);
    try {
      const response = await fetch(
        "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome",
      );
      const payload = (await response.json()) as IbgeMunicipality[];

      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Não foi possível carregar as cidades do IBGE.");
      }

      setCityOptions(
        payload
          .map((city) => {
            const uf = city.microrregiao?.mesorregiao?.UF?.sigla;
            return uf
              ? {
                  value: `${city.nome}, ${uf}`,
                  label: `${city.nome}, ${uf}`,
                }
              : null;
          })
          .filter((city): city is ComboboxOption => Boolean(city)),
      );
      setCitiesLoaded(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar cidades do IBGE.",
      );
    } finally {
      setLoadingCities(false);
    }
  }, [citiesLoaded, loadingCities]);

  async function handleCreateList(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setCreating(true);

    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "");
    const currentSearchTerm = String(formData.get("searchTerm") ?? "").trim();
    const currentLocation = String(formData.get("location") ?? "").trim();
    const maxResults = Number(formData.get("maxResults") ?? 30);

    if (!currentSearchTerm) {
      toast.error("Informe uma palavra-chave para criar a lista.");
      setCreating(false);
      return;
    }

    try {
      const response = await authFetch("/api/lead-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          searchTerm: currentSearchTerm,
          location: currentLocation,
          maxResults,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message ?? "Não foi possível criar a lista.");
      }

      const list = normalizeList(payload);
      setLists((currentLists) => [
        list,
        ...currentLists.filter((currentList) => currentList.id !== list.id),
      ]);
      toast.success("Lista criada. A busca foi iniciada.");
      setCreateDialogOpen(false);
      setListName("");
      setSearchTerm("");
      setLocation("");
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar lista.",
      );
    } finally {
      setCreating(false);
    }
  }

  function resetCreateForm() {
    setCreateDialogMode("new");
    setListName("");
    setSearchTerm("");
    setLocation("");
  }

  function openSegmentSearch(group: LeadListGroup) {
    setCreateDialogMode("segment");
    setListName(group.title);
    setSearchTerm(group.searchTerm);
    setLocation("");
    setCreateDialogOpen(true);
  }

  return (
    <>
      <DashboardHeader title="Buscar" />
      <div className="flex flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">
        <div className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-sm">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-linear-to-l from-primary/10 via-primary/5 to-transparent" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-3xl flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-semibold tracking-tight text-balance">
                  Buscar contatos
                </h1>
                <p className="max-w-2xl text-base text-muted-foreground">
                  Crie listas por segmento e região, acompanhe o progresso da
                  coleta e abra os contatos encontrados diretamente no mapa.
                </p>
              </div>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="w-full gap-2 sm:w-auto"
                  onClick={resetCreateForm}
                >
                  <Plus className="size-4" />
                  Nova lista
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {createDialogMode === "segment"
                      ? `Novo local para ${listName}`
                      : "Nova lista"}
                  </DialogTitle>
                  <DialogDescription>
                    {createDialogMode === "segment"
                      ? "A palavra-chave já está preenchida. Escolha outra localidade para ampliar este segmento."
                      : "Defina o termo e a localização para iniciar uma busca em segundo plano."}
                  </DialogDescription>
                </DialogHeader>
                <form id="create-list-form" onSubmit={handleCreateList}>
                  <FieldGroup className="gap-4">
                    <Field>
                      <FieldLabel htmlFor="name">Nome da lista</FieldLabel>
                      <Input
                        id="name"
                        name="name"
                        value={listName}
                        onChange={(event) => setListName(event.target.value)}
                        placeholder="Restaurantes em São Paulo"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="searchTerm">
                        Palavra-chave
                      </FieldLabel>
                      <SuggestionCombobox
                        id="searchTerm"
                        name="searchTerm"
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                        options={KEYWORD_SUGGESTIONS.map((keyword) => ({
                          value: keyword,
                          label: keyword,
                        }))}
                        placeholder="restaurantes japoneses"
                        searchPlaceholder="Buscar ou escrever palavra-chave..."
                        emptyLabel="Digite para usar uma palavra-chave própria."
                        customLabel="Usar palavra-chave"
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                      <Field>
                        <FieldLabel htmlFor="location">Localização</FieldLabel>
                        <SuggestionCombobox
                          id="location"
                          name="location"
                          value={location}
                          onValueChange={setLocation}
                          options={cityOptions}
                          placeholder="São Paulo, SP"
                          searchPlaceholder="Buscar cidade..."
                          emptyLabel={
                            loadingCities
                              ? "Carregando cidades..."
                              : "Digite para usar uma localização própria."
                          }
                          customLabel="Usar localização"
                          loading={loadingCities}
                          onOpen={loadCities}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="maxResults">Quantidade</FieldLabel>
                        <Input
                          id="maxResults"
                          name="maxResults"
                          type="number"
                          min={1}
                          max={500}
                          step={1}
                          defaultValue={30}
                          required
                        />
                      </Field>
                    </div>
                  </FieldGroup>
                </form>
                <DialogFooter>
                  <Button
                    type="submit"
                    form="create-list-form"
                    disabled={creating}
                  >
                    {creating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Criar lista
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Total de listas"
            value={totalLists}
            icon={ListChecks}
            loading={loadingLists}
            tone="blue"
          />
          <MetricCard
            title="Listas concluídas"
            value={completedLists}
            icon={CheckCircle2}
            loading={loadingLists}
            tone="green"
          />
          <MetricCard
            title="Contatos encontrados"
            value={totalContacts}
            icon={UsersRound}
            loading={loadingLists}
            tone="violet"
          />
        </div>

        <section className="flex w-full flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                Segmentos em acompanhamento
              </h2>
              <p className="text-sm text-muted-foreground">
                Agrupe buscas do mesmo tema e acompanhe as cidades pesquisadas.
              </p>
            </div>
            {!loadingLists && lists.length ? (
              <span className="text-sm text-muted-foreground">
                {groupedLists.length}{" "}
                {groupedLists.length === 1 ? "segmento" : "segmentos"} em{" "}
                {lists.length} {lists.length === 1 ? "busca" : "buscas"}
              </span>
            ) : null}
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-2">
            {loadingLists ? (
              <>
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </>
            ) : groupedLists.length ? (
              groupedLists.map((group) => (
                <LeadListGroupCard
                  key={group.key}
                  group={group}
                  onAddLocation={() => openSegmentSearch(group)}
                />
              ))
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card/40 text-center">
                <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Search className="size-5" />
                </span>
                <div>
                  <p className="font-medium">Nenhuma lista criada</p>
                  <p className="text-sm text-muted-foreground">
                    Crie sua primeira busca para começar a coletar contatos.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  loading,
  tone,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
  loading: boolean;
  tone: "blue" | "green" | "violet";
}) {
  const toneClasses = {
    blue: {
      icon: "bg-primary/10 text-primary",
      glow: "from-primary/18",
    },
    green: {
      icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      glow: "from-emerald-500/18",
    },
    violet: {
      icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      glow: "from-violet-500/18",
    },
  }[tone];

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-24 bg-linear-to-b to-transparent",
          toneClasses.glow,
        )}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-4xl font-semibold tracking-tight">
              {value.toLocaleString("pt-BR")}
            </p>
          )}
        </div>
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl",
            toneClasses.icon,
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

function LeadListGroupCard({
  group,
  onAddLocation,
}: {
  group: LeadListGroup;
  onAddLocation: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const progress = group.totalRequested
    ? Math.min(Math.round((group.totalFound / group.totalRequested) * 100), 100)
    : 0;
  const statusText = group.activeCount
    ? `${group.activeCount} em andamento`
    : `${group.completedCount} finalizadas`;
  const hasHiddenLocations = group.lists.length > 3;
  const visibleLists = group.lists.slice(0, 3);

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className="overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:border-primary/25 hover:shadow-md"
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
              <Smartphone className="size-6" strokeWidth={2.1} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="truncate text-xl font-semibold tracking-tight">
                  {group.title}
                </p>
                <Badge
                  variant={group.activeCount ? "default" : "secondary"}
                  className="rounded-full px-2.5 py-0.5 text-xs"
                >
                  {statusText}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {group.locations.length
                  ? `${group.locations.length} ${
                      group.locations.length === 1
                        ? "localidade"
                        : "localidades"
                    } pesquisadas`
                  : "Sem localidade definida"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center 2xl:justify-end">
            <div className="rounded-xl px-1 text-left sm:min-w-32 sm:text-center">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Contatos
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {group.totalFound.toLocaleString("pt-BR")}{" "}
                <span className="text-xl font-normal text-muted-foreground">
                  / {group.totalRequested.toLocaleString("pt-BR")}
                </span>
              </p>
              <p className="text-sm font-semibold text-primary">
                {progress}% coletado
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl"
              onClick={onAddLocation}
            >
              <Plus className="size-4" />
              Adicionar local
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">
              Progresso geral da campanha
            </p>
            <p className="text-xs font-semibold">{progress}%</p>
          </div>
          <Progress value={progress} className="h-1.5 bg-muted" />
        </div>
      </div>

      <div className="border-t bg-muted/15 p-5">
        <div className="grid gap-3">
          {visibleLists.map((list) => (
            <LeadListMiniCard key={list.id} list={list} />
          ))}
        </div>

        {hasHiddenLocations ? (
          <CollapsibleContent>
            <div className="mt-3 grid gap-3">
              {group.lists.slice(3).map((list) => (
                <LeadListMiniCard key={list.id} list={list} />
              ))}
            </div>
          </CollapsibleContent>
        ) : null}

        {hasHiddenLocations ? (
          <div className="mt-4 flex justify-center">
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-2">
                {expanded
                  ? "Mostrar menos"
                  : `Mostrar mais ${group.lists.length - 3}`}
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        ) : null}
      </div>
    </Collapsible>
  );
}

function LeadListMiniCard({ list }: { list: LeadList }) {
  const progress = list.max_results
    ? Math.min(Math.round((list.total_found / list.max_results) * 100), 100)
    : 0;
  const isCompleted = list.status === "completed";
  const isPartial = list.status === "partial";

  return (
    <Link
      href={`/dashboard/listas/${list.id}`}
      className="group/location flex min-w-0 flex-col gap-4 rounded-xl border bg-background p-4 shadow-xs transition hover:border-primary/35 hover:bg-card hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              isCompleted
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-primary/10 text-primary",
            )}
          >
            <MapPin className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight">
              {list.location || list.name || "Sem localidade"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {list.total_found.toLocaleString("pt-BR")} /{" "}
              {list.max_results.toLocaleString("pt-BR")} contatos
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Badge
            variant={isCompleted || isPartial ? "secondary" : "default"}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs",
              isCompleted &&
                "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
              isPartial &&
                "border-amber-500/25 bg-amber-500/10 text-amber-700",
            )}
          >
            {isCompleted ? (
              <CheckCircle2 className="size-3" />
            ) : isPartial ? (
              <Clock3 className="size-3" />
            ) : null}
            {statusLabel(list.status)}
          </Badge>
          <span className="flex size-8 items-center justify-center rounded-full border bg-card text-muted-foreground transition group-hover/location:border-primary group-hover/location:text-primary">
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Progresso</p>
          <p
            className={cn(
              "text-xs font-semibold",
              isCompleted ? "text-emerald-700" : "text-primary",
            )}
          >
            {progress}%
          </p>
        </div>
        <Progress
          value={progress}
          className={cn(
            "h-1.5 bg-muted",
            isCompleted && "[&_[data-slot=progress-indicator]]:bg-emerald-500",
          )}
        />
      </div>
    </Link>
  );
}

function SuggestionCombobox({
  id,
  name,
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  customLabel,
  loading = false,
  onOpen,
}: {
  id: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  customLabel: string;
  loading?: boolean;
  onOpen?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const normalizedQuery = normalizeSearchValue(query.trim());
  const normalizedValue = normalizeSearchValue(value);

  const filteredOptions = React.useMemo(() => {
    if (!normalizedQuery) return options.slice(0, 12);

    return options
      .filter((option) =>
        normalizeSearchValue(option.label).includes(normalizedQuery),
      )
      .slice(0, 30);
  }, [normalizedQuery, options]);

  const hasExactOption = options.some(
    (option) => normalizeSearchValue(option.value) === normalizedQuery,
  );
  const customValue = query.trim();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setQuery(value);
      onOpen?.();
    }
  }

  function selectValue(nextValue: string) {
    onValueChange(nextValue);
    setQuery(nextValue);
    setOpen(false);
  }

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-11 w-full justify-between rounded-xl px-4 text-left text-base font-normal shadow-xs md:text-sm",
              !value && "text-muted-foreground",
            )}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={searchPlaceholder}
            />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {loading ? (
                  <CommandItem disabled>
                    <Loader2 className="size-4 animate-spin" />
                    Carregando...
                  </CommandItem>
                ) : null}
                {customValue && !hasExactOption ? (
                  <CommandItem
                    value={customValue}
                    onSelect={() => selectValue(customValue)}
                  >
                    <Plus className="size-4" />
                    <span className="truncate">
                      {customLabel}: {customValue}
                    </span>
                  </CommandItem>
                ) : null}
                {filteredOptions.map((option) => {
                  const selected =
                    normalizeSearchValue(option.value) === normalizedValue;

                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => selectValue(option.value)}
                    >
                      <Check
                        className={cn(
                          "size-4",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}

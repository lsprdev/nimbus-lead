"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  ListChecks,
  Loader2,
  Plus,
  Search,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function SearchPage() {
  const { authFetch } = useAuth();
  const [lists, setLists] = React.useState<LeadList[]>([]);
  const [loadingLists, setLoadingLists] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [cityOptions, setCityOptions] = React.useState<ComboboxOption[]>([]);
  const [loadingCities, setLoadingCities] = React.useState(false);
  const [citiesLoaded, setCitiesLoaded] = React.useState(false);
  const totalLists = lists.length;
  const completedLists = lists.filter(
    (list) => list.status === "completed",
  ).length;
  const totalContacts = lists.reduce(
    (total, list) => total + list.total_found,
    0,
  );
  const activeLists = Math.max(totalLists - completedLists, 0);

  const loadLists = React.useCallback(async () => {
    setLoadingLists(true);
    try {
      const response = await authFetch("/api/lead-lists");
      const payload = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error("Não foi possível carregar suas listas.");
      }

      setLists(Array.isArray(payload) ? payload.map(normalizeList) : []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao carregar listas.",
      );
    } finally {
      setLoadingLists(false);
    }
  }, [authFetch]);

  React.useEffect(() => {
    void loadLists();
  }, [loadLists]);

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

  return (
    <>
      <DashboardHeader title="Buscar" />
      <div className="flex flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              Buscar contatos
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              Crie uma lista com uma palavra-chave e acompanhe os contatos
              encontrados no mapa.
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Nova lista
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova lista</DialogTitle>
                <DialogDescription>
                  Defina o termo e a localização para iniciar uma busca em
                  segundo plano.
                </DialogDescription>
              </DialogHeader>
              <form id="create-list-form" onSubmit={handleCreateList}>
                <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel htmlFor="name">Nome da lista</FieldLabel>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Restaurantes em São Paulo"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="searchTerm">Palavra-chave</FieldLabel>
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

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Total de listas"
            value={totalLists}
            description={`${activeLists} em andamento`}
            icon={ListChecks}
            loading={loadingLists}
            tone="blue"
          />
          <MetricCard
            title="Listas concluídas"
            value={completedLists}
            description="Buscas finalizadas"
            icon={CheckCircle2}
            loading={loadingLists}
            tone="green"
          />
          <MetricCard
            title="Contatos encontrados"
            value={totalContacts}
            description="Leads disponíveis"
            icon={UsersRound}
            loading={loadingLists}
            tone="violet"
          />
        </div>

        <section className="flex w-full flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                Listas recentes
              </h2>
              <p className="text-sm text-muted-foreground">
                Continue acompanhando buscas em andamento ou revise listas
                finalizadas.
              </p>
            </div>
            {!loadingLists && lists.length ? (
              <span className="text-sm text-muted-foreground">
                {lists.length}{" "}
                {lists.length === 1 ? "lista criada" : "listas criadas"}
              </span>
            ) : null}
          </div>

          <div className="grid gap-3">
            {loadingLists ? (
              <>
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </>
            ) : lists.length ? (
              lists.map((list) => <LeadListCard key={list.id} list={list} />)
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
  description,
  icon: Icon,
  loading,
  tone,
}: {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  loading: boolean;
  tone: "blue" | "green" | "violet";
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div
        className={cn(
          "h-1",
          tone === "blue" && "bg-blue-500",
          tone === "green" && "bg-emerald-500",
          tone === "violet" && "bg-violet-500",
        )}
      />
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1 p-5">
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight">
              {value.toLocaleString("pt-BR")}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span
          className={cn(
            "mr-5 flex size-11 shrink-0 items-center justify-center rounded-xl",
            tone === "blue" &&
              "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            tone === "green" &&
              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            tone === "violet" &&
              "bg-violet-500/10 text-violet-600 dark:text-violet-400",
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

function LeadListCard({ list }: { list: LeadList }) {
  const reachedSavedLimit = list.total_found <= list.max_results;

  return (
    <Link
      href={`/dashboard/listas/${list.id}`}
      className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-xs transition hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-11 mt-1 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Search
              className="size-5 -translate-x-0.5 -translate-y-0.5"
              strokeWidth={2.25}
            />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-lg font-semibold">{list.name}</p>
            <p className="text-sm text-muted-foreground">
              {list.search_term}
              {list.location ? ` em ${list.location}` : null}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 md:pl-4">
          <Badge variant="secondary">{statusLabel(list.status)}</Badge>
          <div className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {list.total_found.toLocaleString("pt-BR")}
            </span>
            {reachedSavedLimit ? (
              <> de {list.max_results.toLocaleString("pt-BR")}</>
            ) : (
              <> contatos</>
            )}
          </div>
          <ArrowRight className="size-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
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

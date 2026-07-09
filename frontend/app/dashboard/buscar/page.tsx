"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Coffee,
  Dumbbell,
  FileText,
  HeartPulse,
  ListChecks,
  Loader2,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  ShoppingBag,
  Smartphone,
  Store,
  Trash2,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  normalizeContact,
  normalizeList,
  type Contact,
  type LeadList,
} from "@/lib/leads";
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

const DEFAULT_SEGMENT_ICON = "smartphone";
const DEFAULT_SEGMENT_COLOR = "blue";

const SEGMENT_ICON_OPTIONS = [
  { value: "smartphone", label: "Geral", icon: Smartphone },
  { value: "store", label: "Loja", icon: Store },
  { value: "coffee", label: "Alimentação", icon: Coffee },
  { value: "heart", label: "Saúde", icon: HeartPulse },
  { value: "bag", label: "Varejo", icon: ShoppingBag },
  { value: "business", label: "Serviços", icon: BriefcaseBusiness },
  { value: "fitness", label: "Fitness", icon: Dumbbell },
] as const;

const SEGMENT_COLOR_OPTIONS = [
  {
    value: "blue",
    label: "Azul",
    swatch: "bg-blue-500",
    icon: "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-400",
  },
  {
    value: "emerald",
    label: "Verde",
    swatch: "bg-emerald-500",
    icon: "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    value: "amber",
    label: "Âmbar",
    swatch: "bg-amber-500",
    icon: "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400",
  },
  {
    value: "rose",
    label: "Rosa",
    swatch: "bg-rose-500",
    icon: "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-400",
  },
  {
    value: "violet",
    label: "Violeta",
    swatch: "bg-violet-500",
    icon: "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-400",
  },
  {
    value: "slate",
    label: "Cinza",
    swatch: "bg-slate-500",
    icon: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/25 dark:bg-slate-500/10 dark:text-slate-400",
  },
] as const;

type SegmentIconValue = (typeof SEGMENT_ICON_OPTIONS)[number]["value"];
type SegmentColorValue = (typeof SEGMENT_COLOR_OPTIONS)[number]["value"];
type SegmentVisual = {
  icon: SegmentIconValue;
  color: SegmentColorValue;
};

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
  segmentIcon: SegmentIconValue;
  segmentColor: SegmentColorValue;
  pinned: boolean;
  updated: string;
};

function getSegmentIconOption(value?: string) {
  return (
    SEGMENT_ICON_OPTIONS.find((option) => option.value === value) ??
    SEGMENT_ICON_OPTIONS[0]
  );
}

function getSegmentColorOption(value?: string) {
  return (
    SEGMENT_COLOR_OPTIONS.find((option) => option.value === value) ??
    SEGMENT_COLOR_OPTIONS[0]
  );
}

function segmentKeyFromList(list: LeadList) {
  return normalizeSearchValue(list.search_term || list.name || "sem-segmento");
}

function applySegmentVisualOverride(
  list: LeadList,
  overrides: Record<string, SegmentVisual>,
) {
  const override = overrides[segmentKeyFromList(list)];
  if (!override) return list;

  return {
    ...list,
    segment_icon: override.icon,
    segment_color: override.color,
  };
}

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
    const key = segmentKeyFromList(list);
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
      const visualList =
        orderedLists.find((list) => list.segment_icon || list.segment_color) ??
        orderedLists[0];
      const pinned = orderedLists.some((list) => list.segment_pinned);

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
        segmentIcon: getSegmentIconOption(visualList?.segment_icon).value,
        segmentColor: getSegmentColorOption(visualList?.segment_color).value,
        pinned,
        updated: orderedLists[0]?.updated || orderedLists[0]?.created || "",
      };
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return Date.parse(b.updated) - Date.parse(a.updated);
    });
}

function buildSegmentHref(group: LeadListGroup) {
  const params = new URLSearchParams({
    title: group.title,
    lists: group.lists.map((list) => list.id).join(","),
  });

  return `/dashboard/segmentos/${encodeURIComponent(group.key)}?${params.toString()}`;
}

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "contatos"
  );
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type SegmentPdfContact = {
  name: string;
  phone: string;
  city: string;
  segment: string;
};

function buildSegmentContactsPdf(group: LeadListGroup, contacts: SegmentPdfContact[]) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 32;
  const tableTop = 500;
  const headerHeight = 28;
  const rowHeight = 48;
  const columns = [
    { label: "Nome", width: 185 },
    { label: "Número", width: 105 },
    { label: "Cidade", width: 120 },
    { label: "Segmento", width: 105 },
    { label: "Observação", width: 263 },
  ];
  const rowsPerPage = Math.max(
    1,
    Math.floor((tableTop - margin - headerHeight) / rowHeight),
  );
  const pages: string[] = [];

  for (let start = 0; start < contacts.length; start += rowsPerPage) {
    const pageRows = contacts.slice(start, start + rowsPerPage);
    const commands: string[] = [
      "0 0 0 rg",
      `BT /F1 18 Tf ${margin} 552 Td ${encodePdfText(group.title)} Tj ET`,
      `BT /F1 10 Tf ${margin} 532 Td ${encodePdfText(`${contacts.length} contatos exportados`)} Tj ET`,
      "0.82 0.86 0.9 RG",
      "0.7 w",
    ];

    let x = margin;
    columns.forEach((column) => {
      commands.push(`${x} ${tableTop - headerHeight} ${column.width} ${headerHeight} re S`);
      commands.push(
        `BT /F1 9 Tf ${x + 7} ${tableTop - 18} Td ${encodePdfText(column.label)} Tj ET`,
      );
      x += column.width;
    });

    pageRows.forEach((contact, rowIndex) => {
      const y = tableTop - headerHeight - rowIndex * rowHeight;
      const values = [
        contact.name,
        contact.phone,
        contact.city,
        contact.segment,
        "",
      ];
      let cellX = margin;

      columns.forEach((column, columnIndex) => {
        commands.push(`${cellX} ${y - rowHeight} ${column.width} ${rowHeight} re S`);
        wrapPdfCell(values[columnIndex], Math.floor(column.width / 5.5), 2).forEach(
          (line, lineIndex) => {
            commands.push(
              `BT /F1 8 Tf ${cellX + 7} ${y - 17 - lineIndex * 11} Td ${encodePdfText(line)} Tj ET`,
            );
          },
        );
        cellX += column.width;
      });
    });

    const pageNumber = pages.length + 1;
    commands.push(
      `BT /F1 8 Tf ${pageWidth - margin - 48} ${margin - 12} Td ${encodePdfText(`Página ${pageNumber}`)} Tj ET`,
    );
    pages.push(commands.join("\n"));
  }

  return new Blob([createPdfDocument(pages, pageWidth, pageHeight)], {
    type: "application/pdf",
  });
}

function wrapPdfCell(value: string, maxLength: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxLength && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  });
  if (currentLine) lines.push(currentLine);

  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length) {
    visibleLines[visibleLines.length - 1] = `${visibleLines[visibleLines.length - 1].slice(0, Math.max(0, maxLength - 3))}...`;
  }

  return visibleLines;
}

function createPdfDocument(streams: string[], pageWidth: number, pageHeight: number) {
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  const pageObjectIds = streams.map((_, index) => 4 + index * 2);
  objects.push(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${streams.length} >>`,
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");

  streams.forEach((stream, index) => {
    const pageObjectId = 4 + index * 2;
    const contentObjectId = pageObjectId + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function encodePdfText(value: string) {
  const hex = Array.from(value.normalize("NFC"))
    .map((char) => {
      const code = char.charCodeAt(0);
      return (code <= 255 ? code : 63).toString(16).padStart(2, "0");
    })
    .join("");

  return `<${hex}>`;
}

export default function SearchPage() {
  const { authFetch } = useAuth();
  const [lists, setLists] = React.useState<LeadList[]>([]);
  const [loadingLists, setLoadingLists] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [createDialogMode, setCreateDialogMode] = React.useState<
    "new" | "segment" | "edit"
  >("new");
  const [editingSegment, setEditingSegment] =
    React.useState<LeadListGroup | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [segmentIcon, setSegmentIcon] = React.useState<SegmentIconValue>(
    DEFAULT_SEGMENT_ICON,
  );
  const [segmentColor, setSegmentColor] = React.useState<SegmentColorValue>(
    DEFAULT_SEGMENT_COLOR,
  );
  const [segmentPinned, setSegmentPinned] = React.useState(false);
  const [segmentVisualOverrides, setSegmentVisualOverrides] = React.useState<
    Record<string, SegmentVisual>
  >({});
  const [pinningSegmentKey, setPinningSegmentKey] = React.useState<string | null>(
    null,
  );
  const [deletingSegmentKey, setDeletingSegmentKey] = React.useState<string | null>(
    null,
  );
  const [exportingSegmentKey, setExportingSegmentKey] = React.useState<string | null>(
    null,
  );
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

      setLists(
        Array.isArray(payload)
          ? payload
              .map(normalizeList)
              .map((list) =>
                applySegmentVisualOverride(list, segmentVisualOverrides),
              )
          : [],
      );
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
  }, [authFetch, segmentVisualOverrides]);

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
    const currentSearchTerm = String(formData.get("searchTerm") ?? "").trim();
    const currentLocation = String(formData.get("location") ?? "").trim();
    const maxResults = Number(formData.get("maxResults") ?? 30);

    if (!currentSearchTerm) {
      toast.error("Informe um segmento para iniciar a busca.");
      setCreating(false);
      return;
    }

    if (createDialogMode === "edit") {
      if (!editingSegment) {
        toast.error("Não foi possível encontrar o segmento para editar.");
        setCreating(false);
        return;
      }

      const visual: SegmentVisual = {
        icon: segmentIcon,
        color: segmentColor,
      };
      const nextTitle = formatSegmentTitle(currentSearchTerm);
      const nextKey = normalizeSearchValue(currentSearchTerm);

      try {
        const responses = await Promise.all(
          editingSegment.lists.map((list) =>
            authFetch(`/api/collections/lead_lists/records/${list.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                search_term: currentSearchTerm,
                name: list.location
                  ? `${nextTitle} em ${list.location}`
                  : nextTitle,
                segment_icon: visual.icon,
                segment_color: visual.color,
              }),
            }),
          ),
        );
        const failedResponse = responses.find((response) => !response.ok);
        if (failedResponse) {
          const payload = await failedResponse.json().catch(() => null);
          throw new Error(
            payload?.message ?? "Não foi possível editar o segmento.",
          );
        }

        const editedIds = new Set(editingSegment.lists.map((list) => list.id));
        setLists((currentLists) =>
          currentLists.map((list) =>
            editedIds.has(list.id)
              ? {
                  ...list,
                  name: list.location
                    ? `${nextTitle} em ${list.location}`
                    : nextTitle,
                  search_term: currentSearchTerm,
                  segment_icon: visual.icon,
                  segment_color: visual.color,
                }
              : list,
          ),
        );
        setSegmentVisualOverrides((currentOverrides) => {
          const nextOverrides = { ...currentOverrides };
          delete nextOverrides[editingSegment.key];
          nextOverrides[nextKey] = visual;
          return nextOverrides;
        });
        toast.success("Segmento atualizado.");
        setCreateDialogOpen(false);
        setEditingSegment(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao editar segmento.",
        );
      } finally {
        setCreating(false);
      }
      return;
    }

    if (!currentLocation) {
      toast.error("Informe uma localização para iniciar a busca.");
      setCreating(false);
      return;
    }

    const name = currentLocation
      ? `${formatSegmentTitle(currentSearchTerm)} em ${currentLocation}`
      : formatSegmentTitle(currentSearchTerm);

    try {
      const response = await authFetch("/api/lead-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          searchTerm: currentSearchTerm,
          location: currentLocation,
          maxResults,
          segmentIcon,
          segmentColor,
          segmentPinned,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message ?? "Não foi possível criar o segmento.");
      }

      const visual: SegmentVisual = {
        icon: segmentIcon,
        color: segmentColor,
      };
      const segmentKey = normalizeSearchValue(currentSearchTerm);
      const list = normalizeList({
        ...(payload ?? {}),
        segment_icon: payload?.segment_icon ?? visual.icon,
        segment_color: payload?.segment_color ?? visual.color,
        segment_pinned: payload?.segment_pinned ?? segmentPinned,
      });
      setSegmentVisualOverrides((currentOverrides) => ({
        ...currentOverrides,
        [segmentKey]: visual,
      }));
      setLists((currentLists) => [
        list,
        ...currentLists
          .filter((currentList) => currentList.id !== list.id)
          .map((currentList) =>
            segmentKeyFromList(currentList) === segmentKey
              ? {
                  ...currentList,
                  segment_icon: visual.icon,
                  segment_color: visual.color,
                  segment_pinned: segmentPinned,
                }
              : currentList,
          ),
      ]);
      toast.success(
        createDialogMode === "segment"
          ? "Local adicionado. A busca foi iniciada."
          : "Segmento criado. A busca foi iniciada.",
      );
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

  function resetCreateForm() {
    setCreateDialogMode("new");
    setEditingSegment(null);
    setSearchTerm("");
    setLocation("");
    setSegmentIcon(DEFAULT_SEGMENT_ICON);
    setSegmentColor(DEFAULT_SEGMENT_COLOR);
    setSegmentPinned(false);
  }

  function openSegmentSearch(group: LeadListGroup) {
    setCreateDialogMode("segment");
    setEditingSegment(null);
    setSearchTerm(group.searchTerm);
    setLocation("");
    setSegmentIcon(group.segmentIcon);
    setSegmentColor(group.segmentColor);
    setSegmentPinned(group.pinned);
    setCreateDialogOpen(true);
  }

  function openEditSegment(group: LeadListGroup) {
    setCreateDialogMode("edit");
    setEditingSegment(group);
    setSearchTerm(group.searchTerm);
    setLocation("");
    setSegmentIcon(group.segmentIcon);
    setSegmentColor(group.segmentColor);
    setSegmentPinned(group.pinned);
    setCreateDialogOpen(true);
  }

  async function handleToggleSegmentPin(group: LeadListGroup) {
    const nextPinned = !group.pinned;
    setPinningSegmentKey(group.key);
    try {
      const response = await authFetch("/api/lead-segments/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listIds: group.lists.map((list) => list.id),
          pinned: nextPinned,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.message ?? "Não foi possível atualizar o segmento.",
        );
      }

      setLists((currentLists) =>
        currentLists.map((list) =>
          segmentKeyFromList(list) === group.key
            ? { ...list, segment_pinned: nextPinned }
            : list,
        ),
      );
      toast.success(nextPinned ? "Segmento fixado." : "Segmento desfixado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar segmento.",
      );
    } finally {
      setPinningSegmentKey(null);
    }
  }

  async function handleDeleteSegment(group: LeadListGroup) {
    setDeletingSegmentKey(group.key);
    try {
      const responses = await Promise.all(
        group.lists.map((list) =>
          authFetch(`/api/lead-lists/${list.id}`, { method: "DELETE" }),
        ),
      );
      const failedResponse = responses.find((response) => !response.ok);
      if (failedResponse) {
        const payload = await failedResponse.json().catch(() => null);
        throw new Error(payload?.message ?? "Não foi possível excluir o segmento.");
      }

      const deletedIds = new Set(group.lists.map((list) => list.id));
      setLists((currentLists) =>
        currentLists.filter((list) => !deletedIds.has(list.id)),
      );
      setSegmentVisualOverrides((currentOverrides) => {
        const nextOverrides = { ...currentOverrides };
        delete nextOverrides[group.key];
        return nextOverrides;
      });
      toast.success("Segmento excluído.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir segmento.",
      );
    } finally {
      setDeletingSegmentKey(null);
    }
  }

  async function handleExportSegmentPdf(group: LeadListGroup) {
    setExportingSegmentKey(group.key);
    try {
      const contactsByList = await Promise.all(
        group.lists.map(async (list) => {
          const response = await authFetch(`/api/lead-lists/${list.id}/contacts`);
          const payload = await response.json().catch(() => []);

          if (!response.ok) {
            throw new Error(
              payload?.message ?? "Não foi possível carregar os contatos.",
            );
          }

          return {
            list,
            contacts: Array.isArray(payload) ? payload.map(normalizeContact) : [],
          };
        }),
      );
      const contacts = contactsByList.flatMap(({ list, contacts: listContacts }) =>
        listContacts.map((contact: Contact) => ({
          name: contact.name,
          phone: contact.phone || "",
          city: list.location,
          segment: group.title,
        })),
      );

      if (!contacts.length) {
        toast.error("Não há contatos para exportar.");
        return;
      }

      downloadBlob(
        buildSegmentContactsPdf(group, contacts),
        `${slugify(group.title)}-contatos.pdf`,
        "application/pdf",
      );
      toast.success("PDF exportado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao exportar PDF.",
      );
    } finally {
      setExportingSegmentKey(null);
    }
  }

  return (
    <>
      <DashboardHeader title="Buscar" />
      <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
        <div className="relative overflow-hidden rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-linear-to-l from-primary/10 via-primary/5 to-transparent" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-3xl flex-col gap-2">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                  Buscar contatos
                </h1>
                <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
                  Crie listas por segmento e região, acompanhe o progresso da
                  coleta e abra os contatos encontrados diretamente no mapa.
                </p>
              </div>
            </div>

            <Dialog
              open={createDialogOpen}
              onOpenChange={(open) => {
                setCreateDialogOpen(open);
                if (!open) {
                  setEditingSegment(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="default"
                  className="w-full gap-2 sm:w-auto"
                  onClick={resetCreateForm}
                >
                  <Plus className="size-4" />
                  Novo segmento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>
                    {createDialogMode === "edit"
                      ? `Editar ${editingSegment?.title ?? "segmento"}`
                      : createDialogMode === "segment"
                        ? `Novo local para ${formatSegmentTitle(searchTerm)}`
                        : "Novo segmento"}
                  </DialogTitle>
                  <DialogDescription>
                    {createDialogMode === "edit"
                      ? "Atualize o nome, o ícone e a cor usados para este segmento."
                      : createDialogMode === "segment"
                        ? "O segmento já está preenchido. Escolha outra localidade para ampliar este mapa."
                        : "Defina o segmento e a localização para iniciar uma busca em segundo plano."}
                  </DialogDescription>
                </DialogHeader>
                <form id="create-list-form" onSubmit={handleCreateList}>
                  <FieldGroup className="gap-4">
                    <Field>
                      <FieldLabel htmlFor="searchTerm">Segmento</FieldLabel>
                      <SuggestionCombobox
                        id="searchTerm"
                        name="searchTerm"
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                        options={KEYWORD_SUGGESTIONS.map((keyword) => ({
                          value: keyword,
                          label: keyword,
                        }))}
                        placeholder="Restaurantes japoneses"
                        searchPlaceholder="Buscar ou escrever segmento..."
                        emptyLabel="Digite para usar um segmento próprio."
                        customLabel="Usar segmento"
                      />
                    </Field>
                    {createDialogMode !== "segment" ? (
                      <div className="grid gap-4 sm:grid-cols-[minmax(0,420px)_1fr]">
                        <Field>
                          <FieldLabel>Ícone</FieldLabel>
                          <div className="flex flex-wrap gap-2">
                            {SEGMENT_ICON_OPTIONS.map((option) => {
                              const Icon = option.icon;
                              const isSelected = segmentIcon === option.value;

                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  aria-label={option.label}
                                  aria-pressed={isSelected}
                                  title={option.label}
                                  className={cn(
                                    "flex size-10 items-center justify-center rounded-xl border bg-background text-muted-foreground shadow-xs transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isSelected &&
                                      "border-primary bg-primary/10 text-primary ring-2 ring-primary/20",
                                  )}
                                  onClick={() => setSegmentIcon(option.value)}
                                >
                                  <Icon className="size-4" />
                                </button>
                              );
                            })}
                          </div>
                        </Field>
                        <Field>
                          <FieldLabel>Cor</FieldLabel>
                          <div className="flex flex-wrap gap-2">
                            {SEGMENT_COLOR_OPTIONS.map((option) => {
                              const isSelected = segmentColor === option.value;

                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  aria-label={option.label}
                                  aria-pressed={isSelected}
                                  title={option.label}
                                  className={cn(
                                    "flex size-10 items-center justify-center rounded-xl border bg-background shadow-xs transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isSelected &&
                                      "border-primary ring-2 ring-primary/20",
                                  )}
                                  onClick={() => setSegmentColor(option.value)}
                                >
                                  <span
                                    className={cn(
                                      "size-5 rounded-full",
                                      option.swatch,
                                    )}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </Field>
                      </div>
                    ) : null}
                    {createDialogMode !== "edit" ? (
                      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                        <Field>
                          <FieldLabel htmlFor="location">Localização</FieldLabel>
                          <SuggestionCombobox
                            id="location"
                            name="location"
                            value={location}
                            onValueChange={setLocation}
                            options={cityOptions}
                            placeholder="Selecione uma cidade"
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
                    ) : null}
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
                    ) : createDialogMode === "edit" ? (
                      <Pencil className="size-4" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    {createDialogMode === "edit"
                      ? "Salvar alterações"
                      : createDialogMode === "segment"
                        ? "Adicionar local"
                        : "Criar segmento"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
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
                  deleting={deletingSegmentKey === group.key}
                  exporting={exportingSegmentKey === group.key}
                  pinning={pinningSegmentKey === group.key}
                  onAddLocation={() => openSegmentSearch(group)}
                  onEditSegment={() => openEditSegment(group)}
                  onExportPdf={() => handleExportSegmentPdf(group)}
                  onDeleteSegment={() => handleDeleteSegment(group)}
                  onTogglePin={() => handleToggleSegmentPin(group)}
                />
              ))
            ) : (
              <div className="col-span-full mx-auto flex min-h-80 w-full max-w-5xl flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-card/40 px-6 text-center">
                <span className="flex size-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <Search className="size-7" />
                </span>
                <div>
                  <p className="text-xl font-semibold tracking-tight">
                    Nenhuma lista criada
                  </p>
                  <p className="mt-2 text-base text-muted-foreground">
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
    <div className="relative overflow-hidden rounded-3xl border bg-card p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-4">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-16 bg-linear-to-b to-transparent",
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
  deleting,
  exporting,
  pinning,
  onAddLocation,
  onEditSegment,
  onExportPdf,
  onDeleteSegment,
  onTogglePin,
}: {
  group: LeadListGroup;
  deleting: boolean;
  exporting: boolean;
  pinning: boolean;
  onAddLocation: () => void;
  onEditSegment: () => void;
  onExportPdf: () => void;
  onDeleteSegment: () => void;
  onTogglePin: () => void;
}) {
  const router = useRouter();
  const SegmentIcon = getSegmentIconOption(group.segmentIcon).icon;
  const segmentColor = getSegmentColorOption(group.segmentColor);
  const PinIcon = group.pinned ? PinOff : Pin;
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const locationText = group.locations.length
    ? `${group.locations.length} ${
        group.locations.length === 1 ? "localidade" : "localidades"
      }`
      : "Sem localidade";
  const segmentHref = buildSegmentHref(group);

  return (
    <div
      role="link"
      tabIndex={0}
      className={cn(
        "cursor-pointer overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:border-primary/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        group.pinned && "border-primary/35 bg-primary/[0.03] shadow-md",
      )}
      onClick={() => router.push(segmentHref)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(segmentHref);
        }
      }}
      aria-label={`Ver mapa de ${group.title}`}
    >
      <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-xs",
              segmentColor.icon,
            )}
          >
            <SegmentIcon className="size-5" strokeWidth={2.1} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex min-w-0 items-start gap-2">
              <p className="break-words text-lg font-semibold leading-tight tracking-tight">
                {group.title}
              </p>
              {group.pinned ? (
                <span
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                  title="Fixado"
                  aria-label="Segmento fixado"
                >
                  <Pin className="size-3" />
                </span>
              ) : null}
            </div>
            <Badge
              variant="secondary"
              className="w-fit rounded-full px-2.5 py-0.5 text-xs"
            >
              {locationText}
            </Badge>
          </div>
        </div>

        <div className="rounded-xl px-1 text-left md:min-w-24 md:text-center">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Contatos
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {group.totalFound.toLocaleString("pt-BR")}
          </p>
        </div>

        <div
          className="flex justify-end md:w-12"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-xl"
                disabled={deleting || exporting || pinning}
                aria-label={`Abrir ações de ${group.title}`}
              >
                {deleting || exporting || pinning ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MoreVertical className="size-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={onAddLocation}>
                  <Plus className="size-4" />
                  Adicionar local
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onEditSegment}>
                  <Pencil className="size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={deleting || exporting || pinning}
                  onSelect={onExportPdf}
                >
                  <FileText className="size-4" />
                  Exportar em PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={pinning || deleting || exporting}
                  onSelect={onTogglePin}
                >
                  <PinIcon className="size-4" />
                  {group.pinned ? "Soltar" : "Fixar"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={deleting || exporting || pinning}
                  onSelect={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir este segmento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação remove todas as cidades e contatos encontrados em {group.title}. Buscas em andamento serão interrompidas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={(event) => {
                    event.preventDefault();
                    onDeleteSegment();
                  }}
                >
                  {deleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Excluir segmento
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
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

'use client'

import * as React from 'react'
import { Loader2, MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { RadixBookmarkIcon } from '@/components/icons/radix-bookmark-icon'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth'
import {
  DEFAULT_COLLECTION_COLOR,
  normalizeContactCollection,
  type ContactCollection,
} from '@/lib/collections'
import { cn } from '@/lib/utils'

const COLLECTION_COLOR_OPTIONS = [
  { value: '#2563eb', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Âmbar' },
  { value: '#f43f5e', label: 'Rosa' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#64748b', label: 'Cinza' },
] as const

export default function CollectionsPage() {
  const { authFetch } = useAuth()
  const [collections, setCollections] = React.useState<ContactCollection[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingCollection, setEditingCollection] =
    React.useState<ContactCollection | null>(null)
  const [collectionToDelete, setCollectionToDelete] =
    React.useState<ContactCollection | null>(null)
  const [name, setName] = React.useState('')
  const [color, setColor] = React.useState(DEFAULT_COLLECTION_COLOR)
  const isEditing = Boolean(editingCollection)

  const loadCollections = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await authFetch('/api/contact-collections')
      const payload = await response.json().catch(() => [])
      if (!response.ok) {
        throw new Error(payload?.message ?? 'Não foi possível carregar coleções.')
      }

      setCollections(
        Array.isArray(payload)
          ? payload.map(normalizeContactCollection)
          : [],
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao carregar coleções.',
      )
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  React.useEffect(() => {
    void loadCollections()
  }, [loadCollections])

  function resetForm() {
    setEditingCollection(null)
    setName('')
    setColor(DEFAULT_COLLECTION_COLOR)
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  function openEditDialog(collection: ContactCollection) {
    setEditingCollection(collection)
    setName(collection.name)
    setColor(collection.color)
    setDialogOpen(true)
  }

  async function handleSaveCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextName = name.trim()
    if (!nextName) {
      toast.error('Informe o nome da coleção.')
      return
    }

    setSaving(true)
    try {
      const response = await authFetch(
        isEditing
          ? `/api/contact-collections/${editingCollection?.id}`
          : '/api/contact-collections',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nextName, color }),
        },
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          payload?.message ??
            (isEditing
              ? 'Não foi possível atualizar a coleção.'
              : 'Não foi possível criar a coleção.'),
        )
      }

      const nextCollection = normalizeContactCollection(payload ?? {})
      setCollections((current) =>
        isEditing
          ? current.map((collection) =>
              collection.id === nextCollection.id ? nextCollection : collection,
            )
          : [nextCollection, ...current],
      )
      setDialogOpen(false)
      resetForm()
      toast.success(isEditing ? 'Coleção atualizada.' : 'Coleção criada.')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isEditing
            ? 'Erro ao atualizar coleção.'
            : 'Erro ao criar coleção.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCollection() {
    if (!collectionToDelete) return

    setDeleting(true)
    try {
      const response = await authFetch(
        `/api/contact-collections/${collectionToDelete.id}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? 'Não foi possível excluir a coleção.')
      }

      setCollections((current) =>
        current.filter((collection) => collection.id !== collectionToDelete.id),
      )
      setCollectionToDelete(null)
      toast.success('Coleção excluída.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao excluir coleção.',
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <DashboardHeader title="Coleções" />
      <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Coleções</h1>
            <p className="text-sm text-muted-foreground">
              Organize contatos salvos para consultar depois.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 sm:w-auto">
                <Plus className="size-4" />
                Nova coleção
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? 'Editar coleção' : 'Nova coleção'}
                </DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? 'Atualize o nome e a cor desta coleção.'
                    : 'Crie um grupo para salvar contatos encontrados nas buscas.'}
                </DialogDescription>
              </DialogHeader>
              <form id="save-collection-form" onSubmit={handleSaveCollection}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="collection-name">
                      Nome da coleção
                    </FieldLabel>
                    <Input
                      id="collection-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Clientes para ligar"
                      maxLength={180}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Cor</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {COLLECTION_COLOR_OPTIONS.map((option) => {
                        const isSelected = color === option.value

                        return (
                          <button
                            key={option.value}
                            type="button"
                            aria-label={option.label}
                            aria-pressed={isSelected}
                            title={option.label}
                            className={cn(
                              'flex size-10 items-center justify-center rounded-xl border bg-background shadow-xs transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              isSelected &&
                                'border-primary ring-2 ring-primary/20',
                            )}
                            onClick={() => setColor(option.value)}
                          >
                            <span
                              className="size-5 rounded-full"
                              style={{ backgroundColor: option.value }}
                            />
                          </button>
                        )
                      })}
                    </div>
                  </Field>
                </FieldGroup>
              </form>
              <DialogFooter>
                <Button
                  type="submit"
                  form="save-collection-form"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : isEditing ? (
                    <Pencil className="size-4" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {isEditing ? 'Salvar alterações' : 'Criar coleção'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <>
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </>
          ) : collections.length ? (
            collections.map((collection) => (
              <div
                key={collection.id}
                className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span
                    className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: `${collection.color}1A`,
                      color: collection.color,
                    }}
                  >
                    <RadixBookmarkIcon className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">
                      {collection.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {collection.contact_count.toLocaleString('pt-BR')}{' '}
                      {collection.contact_count === 1 ? 'contato' : 'contatos'}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-10 shrink-0 rounded-full"
                      aria-label={`Abrir ações da coleção ${collection.name}`}
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onSelect={() => openEditDialog(collection)}>
                      <Pencil className="size-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setCollectionToDelete(collection)}
                    >
                      <Trash2 className="size-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          ) : (
            <div className="col-span-full mx-auto flex min-h-80 w-full max-w-5xl flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-card/40 px-6 text-center">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <Search className="size-7" />
              </span>
              <div>
                <p className="text-xl font-semibold tracking-tight">
                  Nenhuma coleção criada
                </p>
                <p className="mt-2 text-base text-muted-foreground">
                  Crie uma coleção para salvar contatos importantes.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <AlertDialog
        open={Boolean(collectionToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setCollectionToDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta coleção?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a coleção{' '}
              {collectionToDelete?.name ? `"${collectionToDelete.name}"` : ''} e
              os vínculos dos contatos salvos nela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteCollection()
              }}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Excluir coleção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

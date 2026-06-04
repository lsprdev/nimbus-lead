'use client'

import * as React from 'react'
import Link from 'next/link'
import { ExternalLink, Search } from 'lucide-react'
import { toast } from 'sonner'

import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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

export default function ContactsPage() {
  const { authFetch } = useAuth()
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [listsById, setListsById] = React.useState<Record<string, LeadList>>({})
  const [query, setQuery] = React.useState('')
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
        setListsById(Object.fromEntries(lists.map((list) => [list.id, list])))

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

  const filteredContacts = contacts.filter((contact) => {
    const haystack = [
      contact.name,
      contact.category,
      contact.address,
      contact.phone,
      listsById[contact.list]?.name,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(query.toLowerCase())
  })

  return (
    <>
      <DashboardHeader title="Contatos" />
      <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Contatos</h1>
          <p className="text-sm text-muted-foreground">
            Todos os contatos encontrados nas suas listas.
          </p>
        </div>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Base de contatos</CardTitle>
              <CardDescription>{filteredContacts.length} contatos disponíveis</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filtrar contatos..."
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredContacts.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Lista</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead className="text-right">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{contact.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {contact.category || contact.address || 'Sem categoria'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {listsById[contact.list] ? (
                          <Link
                            href={`/dashboard/listas/${contact.list}`}
                            className="hover:underline"
                          >
                            {listsById[contact.list].name}
                          </Link>
                        ) : (
                          'Lista'
                        )}
                      </TableCell>
                      <TableCell>{contact.phone || '-'}</TableCell>
                      <TableCell>
                        {contact.rating ? <Badge variant="outline">{contact.rating}</Badge> : '-'}
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
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
                <Search className="size-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Nenhum contato encontrado</p>
                  <p className="text-xs text-muted-foreground">
                    Os contatos aparecem aqui depois que uma lista começa a receber resultados.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export type ContactCollection = {
  id: string
  name: string
  color: string
  contact_count: number
  created: string
  updated: string
}

export const DEFAULT_COLLECTION_COLOR = '#2563eb'

export function normalizeContactCollection(record: Partial<ContactCollection>): ContactCollection {
  return {
    id: String(record.id ?? ''),
    name: String(record.name ?? ''),
    color: String(record.color ?? DEFAULT_COLLECTION_COLOR),
    contact_count: Number(record.contact_count ?? 0),
    created: String(record.created ?? ''),
    updated: String(record.updated ?? ''),
  }
}

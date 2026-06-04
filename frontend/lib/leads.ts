export type LeadListStatus = 'pending' | 'running' | 'completed' | 'failed'

export type LeadList = {
  id: string
  name: string
  search_term: string
  location: string
  status: LeadListStatus
  total_found: number
  error?: string
  created: string
  updated: string
}

export type Contact = {
  id: string
  list: string
  name: string
  rating?: string
  reviews_count?: string
  category?: string
  address?: string
  phone?: string
  website?: string
  hours?: string
  instagram?: string
  facebook?: string
  linkedin?: string
  latitude?: number
  longitude?: number
  place_url?: string
  created: string
}

export function normalizeList(record: Partial<LeadList>): LeadList {
  return {
    id: String(record.id ?? ''),
    name: String(record.name ?? ''),
    search_term: String(record.search_term ?? ''),
    location: String(record.location ?? ''),
    status: (record.status ?? 'pending') as LeadListStatus,
    total_found: Number(record.total_found ?? 0),
    error: record.error,
    created: String(record.created ?? ''),
    updated: String(record.updated ?? ''),
  }
}

export function normalizeContact(record: Partial<Contact>): Contact {
  return {
    id: String(record.id ?? ''),
    list: String(record.list ?? ''),
    name: String(record.name ?? ''),
    rating: record.rating,
    reviews_count: record.reviews_count,
    category: record.category,
    address: record.address,
    phone: record.phone,
    website: record.website,
    hours: record.hours,
    instagram: record.instagram,
    facebook: record.facebook,
    linkedin: record.linkedin,
    latitude: Number(record.latitude ?? 0) || undefined,
    longitude: Number(record.longitude ?? 0) || undefined,
    place_url: record.place_url,
    created: String(record.created ?? ''),
  }
}

export function hasCoordinates(contact: Contact) {
  return typeof contact.latitude === 'number' && typeof contact.longitude === 'number'
}

export function statusLabel(status: LeadListStatus) {
  const labels: Record<LeadListStatus, string> = {
    pending: 'Pendente',
    running: 'Buscando',
    completed: 'Concluída',
    failed: 'Falhou',
  }

  return labels[status]
}
